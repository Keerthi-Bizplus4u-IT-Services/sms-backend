const { studentExitRepository } = require('../repositories/student-exit.repository');
const { generateTransferCertificate, generateStudyConductCertificate } = require('../../../utils/pdf/certificate-generator');
const { AppError } = require('../../../middleware/error.middleware');
const { Student, School } = require('../../../models');

const getSequelizeInstance = () => {
  if (Student.sequelize && typeof Student.sequelize.transaction === 'function') {
    return Student.sequelize;
  }
  return {
    transaction: async (callback) => {
      const t = { commit: async () => {}, rollback: async () => {} };
      return typeof callback === 'function' ? callback(t) : t;
    }
  };
};

/**
 * Student Exit Service
 * Business logic for student exit workflow and certificate generation
 */
class StudentExitService {
  /**
   * Initiate a student exit — validates business rules, creates exit record,
   * updates student status in a single transaction
   */
  async initiateExit(data, context = {}) {
    const schoolId = context.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    const studentId = parseInt(data.student_id, 10);

    // Fetch student with class/academic year info
    const student = await studentExitRepository.findStudentForCertificate(studentId, schoolId);
    if (!student) throw new AppError('Student not found in this school', 404);

    // Only active students can be exited
    if (student.status !== 'active') {
      throw new AppError(`Student is already ${student.status}. Only active students can be exited.`, 400);
    }

    // Check for existing exit
    const existingExit = await studentExitRepository.findExitByStudentId(studentId, schoolId);
    if (existingExit) {
      throw new AppError('An exit record already exists for this student', 409);
    }

    // Snapshot class and academic year names
    const classAtExit = student.class?.name || 'Unknown';
    const academicYearAtExit = student.class?.academicYear?.name || 'Unknown';

    // Map exit type to student status
    const statusMap = {
      transferred: 'transferred',
      graduated: 'graduated',
      withdrawn: 'inactive'
    };
    const newStatus = statusMap[data.exit_type];

    const sequelize = getSequelizeInstance();

    const exitRecord = await sequelize.transaction(async (transaction) => {
      // Create exit record
      const exit = await studentExitRepository.createExit({
        student_id: studentId,
        school_id: schoolId,
        exit_date: data.exit_date,
        exit_type: data.exit_type,
        reason: data.reason || null,
        class_at_exit: classAtExit,
        academic_year_at_exit: academicYearAtExit,
        qualified_for_promotion: data.qualified_for_promotion !== undefined ? data.qualified_for_promotion : true,
        fees_paid: data.fees_paid !== undefined ? data.fees_paid : true,
        conduct: data.conduct || 'good',
        remarks: data.remarks || null,
        issued_by: context.userId || null
      }, transaction);

      // Update student status
      await studentExitRepository.updateStudentStatus(studentId, newStatus, transaction);

      return exit;
    });

    // Return full exit with relations
    return studentExitRepository.findExitById(exitRecord.id, schoolId);
  }

  /**
   * Get exit details by ID
   */
  async getExitById(id, context = {}) {
    const exit = await studentExitRepository.findExitById(id, context.schoolId);
    if (!exit) throw new AppError('Exit record not found', 404);
    return exit;
  }

  /**
   * Get exit details by student ID
   */
  async getExitByStudentId(studentId, context = {}) {
    const schoolId = context.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    const exit = await studentExitRepository.findExitByStudentId(studentId, schoolId);
    if (!exit) throw new AppError('No exit record found for this student', 404);
    return exit;
  }

  /**
   * List all exits with pagination
   */
  async listExits(filters = {}, context = {}) {
    const schoolId = context.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    return studentExitRepository.findAllExits({
      ...filters,
      schoolId
    });
  }

  /**
   * Generate certificate PDF and create DB record
   * @returns {{ pdfBuffer: Buffer, certificate: Object, fileName: string }}
   */
  async generateCertificate(exitId, certificateType, context = {}) {
    const schoolId = context.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    // Get exit with full student data
    const exit = await studentExitRepository.findExitById(exitId, schoolId);
    if (!exit) throw new AppError('Exit record not found', 404);

    // Get school details for header (may have extra fields from DB)
    const school = await School.findByPk(schoolId, { raw: true });
    if (!school) throw new AppError('School not found', 404);

    // Prevent duplicate certificate issuance per exit/type
    const existingCertificate = await studentExitRepository.findCertificateByExitAndType(
      exitId,
      certificateType,
      schoolId
    );
    if (existingCertificate) {
      const label = certificateType === 'transfer_certificate'
        ? 'Transfer Certificate'
        : 'Study & Conduct Certificate';
      throw new AppError(
        `${label} already generated for this student exit. Please re-download the existing certificate.`,
        409
      );
    }

    const student = exit.student;
    const person = student.person;

    // Generate certificate number
    const year = new Date().getFullYear();
    const certNumber = await studentExitRepository.getNextCertificateNumber(schoolId, certificateType, year);

    const issuedDate = new Date().toISOString().split('T')[0];

    const sequelize = getSequelizeInstance();
    const certRecord = await sequelize.transaction(async (transaction) => {
      return studentExitRepository.createCertificate({
        student_id: student.id,
        school_id: schoolId,
        exit_id: exitId,
        certificate_type: certificateType,
        certificate_number: certNumber,
        issued_date: issuedDate,
        issued_by: context.userId || null
      }, transaction);
    });

    // Build data for PDF generation
    const pdfData = {
      student: {
        admission_number: student.admission_number,
        roll_number: student.roll_number,
        admission_date: student.admission_date,
        admissionClassName: student.class?.name
      },
      person: {
        first_name: person.first_name,
        last_name: person.last_name,
        middle_name: person.middle_name,
        gender: person.gender,
        date_of_birth: person.date_of_birth,
        father_name: person.father_name,
        mother_name: person.mother_name,
        guardian_name: person.guardian_name,
        nationality: person.nationality,
        caste: person.caste,
        category: person.category,
        getFullName: () => `${person.first_name} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name}`
      },
      school,
      exit: {
        exit_date: exit.exit_date,
        exit_type: exit.exit_type,
        reason: exit.reason,
        class_at_exit: exit.class_at_exit,
        academic_year_at_exit: exit.academic_year_at_exit,
        qualified_for_promotion: exit.qualified_for_promotion,
        fees_paid: exit.fees_paid,
        conduct: exit.conduct,
        remarks: exit.remarks
      },
      certificate: {
        certificate_number: certNumber,
        issued_date: issuedDate
      }
    };

    // Generate PDF
    let pdfBuffer;
    if (certificateType === 'transfer_certificate') {
      pdfBuffer = await generateTransferCertificate(pdfData);
    } else {
      pdfBuffer = await generateStudyConductCertificate(pdfData);
    }

    const studentName = person.first_name.replace(/\s+/g, '_');
    const typeLabel = certificateType === 'transfer_certificate' ? 'TC' : 'Study_Conduct_Certificate';
    const fileName = `${typeLabel}_${studentName}_${certNumber.replace(/\//g, '-')}.pdf`;

    return { pdfBuffer, certificate: certRecord, fileName };
  }

  /**
   * Re-download an existing certificate (regenerate PDF, no new DB record)
   */
  async redownloadCertificate(certificateId, context = {}) {
    const schoolId = context.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    const cert = await studentExitRepository.findCertificateById(certificateId, schoolId);
    if (!cert) throw new AppError('Certificate not found', 404);

    const exit = cert.exit;
    const student = exit.student;
    const person = student.person;
    const school = await School.findByPk(schoolId, { raw: true });
    if (!school) throw new AppError('School not found', 404);

    const pdfData = {
      student: {
        admission_number: student.admission_number,
        roll_number: student.roll_number,
        admission_date: student.admission_date,
        admissionClassName: student.class?.name
      },
      person: {
        first_name: person.first_name,
        last_name: person.last_name,
        middle_name: person.middle_name,
        gender: person.gender,
        date_of_birth: person.date_of_birth,
        father_name: person.father_name,
        mother_name: person.mother_name,
        guardian_name: person.guardian_name,
        nationality: person.nationality,
        caste: person.caste,
        category: person.category,
        getFullName: () => `${person.first_name} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name}`
      },
      school,
      exit: {
        exit_date: exit.exit_date,
        exit_type: exit.exit_type,
        reason: exit.reason,
        class_at_exit: exit.class_at_exit,
        academic_year_at_exit: exit.academic_year_at_exit,
        qualified_for_promotion: exit.qualified_for_promotion,
        fees_paid: exit.fees_paid,
        conduct: exit.conduct,
        remarks: exit.remarks
      },
      certificate: {
        certificate_number: cert.certificate_number,
        issued_date: cert.issued_date
      }
    };

    let pdfBuffer;
    if (cert.certificate_type === 'transfer_certificate') {
      pdfBuffer = await generateTransferCertificate(pdfData);
    } else {
      pdfBuffer = await generateStudyConductCertificate(pdfData);
    }

    const studentName = person.first_name.replace(/\s+/g, '_');
    const typeLabel = cert.certificate_type === 'transfer_certificate' ? 'TC' : 'Study_Conduct_Certificate';
    const fileName = `${typeLabel}_${studentName}_${cert.certificate_number.replace(/\//g, '-')}.pdf`;

    return { pdfBuffer, certificate: cert, fileName };
  }

  /**
   * Get certificates for an exit
   */
  async getCertificatesByExit(exitId, context = {}) {
    const exit = await studentExitRepository.findExitById(exitId, context.schoolId);
    if (!exit) throw new AppError('Exit record not found', 404);

    return studentExitRepository.findCertificatesByExitId(exitId);
  }
}

module.exports = { studentExitService: new StudentExitService() };
