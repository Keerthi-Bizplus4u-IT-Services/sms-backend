const feeRepository = require('../repositories/fee.repository');
const { schoolRepository, schoolSettingsRepository } = require('../repositories/school.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { generateFeeReceiptPdf } = require('../../../utils/pdf/fee-receipt-generator');
const { sendSmtpMail } = require('../../../utils/email/smtp-mailer');

const dueTermLabelMap = {
  annual: 'Annual',
  term_1: 'Term 1',
  term_2: 'Term 2',
  term_3: 'Term 3',
  semester_1: 'Semester 1',
  semester_2: 'Semester 2'
};

const feeTypeLabelByCode = {
  1: 'Tuition (Annual)',
  2: 'Tuition (Term 1)',
  3: 'Tuition (Term 2)',
  4: 'Sports / Exam',
  5: 'Transport'
};

const buildFeeTypeLabel = (payment = {}) => {
  if (payment.fee_type) {
    const baseType = String(payment.fee_type)
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const dueTermLabel = dueTermLabelMap[payment.due_term] || null;
    return dueTermLabel ? `${baseType} (${dueTermLabel})` : baseType;
  }

  const feeCode = Number(payment.feetype);
  return feeTypeLabelByCode[feeCode] || `Fee Type ${feeCode || '-'}`;
};

const sanitizeFileFragment = (value) =>
  String(value || 'receipt')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);

class FeeService {
  async getFees(query = {}, scope = {}) {
    const { page, pageSize, roll, feeType, classId, studentId } = query;
    return await feeRepository.getFees({
      page,
      pageSize,
      roll,
      feeType,
      classId,
      studentId
    }, scope);
  }

  async recordPayment(payload = {}, scope = {}) {
    const roll = String(payload.roll || '').trim();
    const feeType = Number(payload.feeType);
    const amount = Number(payload.amount);
    const schoolId = Number(scope.schoolId || 0);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError('School context is required', 400);
    }

    if (!roll) {
      throw new AppError('Student roll number is required', 400);
    }

    if (Number.isNaN(feeType) || feeType <= 0) {
      throw new AppError('Valid fee type is required', 400);
    }

    if (Number.isNaN(amount) || amount <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    try {
      const record = await feeRepository.createPayment({
        roll,
        feeType,
        amount
      }, scope);

      if (!record) {
        throw new AppError('Unable to record fee payment', 500);
      }

      return record;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message || 'Unable to record fee payment', 400);
    }
  }

  async getPaymentReceipt(paymentId, scope = {}) {
    const { pdfBuffer, fileName } = await this.buildReceiptBundle(paymentId, scope);
    return { pdfBuffer, fileName };
  }

  async emailPaymentReceipt(paymentId, payload = {}, scope = {}) {
    const { receiptPayload, pdfBuffer, fileName } = await this.buildReceiptBundle(paymentId, scope);

    const schoolId = scope.schoolId || receiptPayload.schoolId;
    if (!schoolId) {
      throw new AppError('School context is required to send receipt emails', 400);
    }

    const settings = await schoolSettingsRepository.findBySchoolId(schoolId);
    if (!settings?.smtp_host) {
      throw new AppError('School SMTP settings are not configured', 400);
    }

    const recipientInput = payload.to !== undefined ? payload.to : receiptPayload.studentEmail;
    const smtpSettings = {
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      user: settings.smtp_user || null,
      password: settings.smtp_password || null,
      secure: Boolean(settings.smtp_secure),
      fromEmail: settings.smtp_from_email || settings.smtp_user || null,
      fromName: settings.smtp_from_name || receiptPayload.school?.name || 'School ERP'
    };

    const subject = `Fee Receipt ${receiptPayload.receiptNumber}`;
    const textBody = [
      `Dear Parent/Guardian,`,
      '',
      `Please find attached fee receipt ${receiptPayload.receiptNumber}.`,
      `Student: ${receiptPayload.studentName}`,
      `Amount: INR ${Number(receiptPayload.amountPaid || 0).toFixed(2)}`,
      '',
      'Regards,',
      receiptPayload.school?.name || 'School'
    ].join('\n');

    const mailResult = await sendSmtpMail({
      smtpSettings,
      to: recipientInput,
      subject,
      text: textBody,
      html: `<p>Dear Parent/Guardian,</p>
             <p>Please find attached fee receipt <strong>${receiptPayload.receiptNumber}</strong>.</p>
             <p><strong>Student:</strong> ${receiptPayload.studentName}<br/>
             <strong>Amount:</strong> INR ${Number(receiptPayload.amountPaid || 0).toFixed(2)}</p>
             <p>Regards,<br/>${receiptPayload.school?.name || 'School'}</p>`,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    if (mailResult.skipped || !mailResult.sentTo?.length) {
      throw new AppError('Valid recipient email is required to send receipt', 400);
    }

    return {
      paymentId: receiptPayload.paymentId,
      receiptNumber: receiptPayload.receiptNumber,
      sentTo: mailResult.sentTo,
      messageId: mailResult.messageId || null
    };
  }

  async buildReceiptBundle(paymentId, scope = {}) {
    const numericPaymentId = Number(paymentId);
    if (!Number.isInteger(numericPaymentId) || numericPaymentId <= 0) {
      throw new AppError('Valid payment id is required', 400);
    }

    const payment = await feeRepository.getPaymentReceiptData(numericPaymentId, scope);
    if (!payment) {
      throw new AppError('Payment receipt not found', 404);
    }

    const schoolId = Number(scope.schoolId || payment.school_id || 0) || null;
    let school = {
      name: payment.school_name || 'School',
      code: payment.school_code || null
    };

    if (!payment.school_name && schoolId) {
      const schoolRecord = await schoolRepository.findById(schoolId);
      if (schoolRecord) {
        school = {
          name: schoolRecord.name,
          code: schoolRecord.code
        };
      }
    }

    const studentName = `${payment.first_name || ''} ${payment.last_name || ''}`.trim() || 'Student';
    const receiptNumber = payment.receipt_number || `RCT-${numericPaymentId}`;

    const receiptPayload = {
      paymentId: numericPaymentId,
      schoolId,
      receiptNumber,
      paymentDate: payment.payment_date || payment.created_at || null,
      amountPaid: Number(payment.amount || payment.amountpaid || 0),
      paymentMethod: payment.payment_method || 'online',
      transactionReference: payment.transaction_reference || null,
      studentName,
      studentEmail: payment.student_email || null,
      rollNumber: payment.roll_number || payment.roll,
      className: payment.class_name || payment.cname || null,
      sectionName: payment.section_name || payment.secname || null,
      feeTypeLabel: buildFeeTypeLabel(payment),
      school
    };

    const pdfBuffer = await generateFeeReceiptPdf(receiptPayload);
    const fileName = `Fee_Receipt_${sanitizeFileFragment(receiptNumber)}.pdf`;

    return {
      receiptPayload,
      pdfBuffer,
      fileName
    };
  }

  async getFeeStructure(scope = {}) {
    const data = await feeRepository.getAllFeeDetails(scope);
    return { userData: data };
  }

  async updateFeeStructure(data, scope = {}) {
    const { sclass, tfee, fterm, sterm, thterm, trans, spofee } = data;
    const schoolId = Number(scope.schoolId || 0);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError('School context is required', 400);
    }
    
    if (sclass === undefined || sclass === '-1') {
      throw new AppError('Valid class identifier is required', 400);
    }

    // Basic structure for legacy table
    const normalizedData = {
      sclass: String(sclass),
      tfee: Number(tfee) || 0,
      fterm: Number(fterm) || 0,
      sterm: Number(sterm) || 0,
      thterm: Number(thterm) || 0,
      trans: Number(trans) || 0,
      spofee: Number(spofee) || 0
    };

    return await feeRepository.updateFeeDetails(normalizedData, scope);
  }

  async deleteFeeStructure(classId, scope = {}) {
    const schoolId = Number(scope.schoolId || 0);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError('School context is required', 400);
    }

    if (!classId) {
      throw new AppError('Class identifier is required', 400);
    }
    return await feeRepository.deleteFeeDetails(classId, scope);
  }
}

module.exports = new FeeService();
