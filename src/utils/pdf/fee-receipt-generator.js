const PDFDocument = require('pdfkit');

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value);
};

const drawHeader = (doc, school = {}) => {
  doc.fontSize(18).font('Helvetica-Bold').text(school.name || 'School', { align: 'center' });

  if (school.code) {
    doc
      .moveDown(0.25)
      .fontSize(10)
      .font('Helvetica')
      .text(`Code: ${school.code}`, { align: 'center' });
  }

  doc
    .moveDown(0.75)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Fee Payment Receipt', { align: 'center' });

  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
  doc.moveDown(0.8);
};

const drawRow = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(label, { continued: true, width: 180 });
  doc.font('Helvetica').text(String(value ?? '-'));
  doc.moveDown(0.3);
};

const generateFeeReceiptPdf = (receipt = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, receipt.school);

    drawRow(doc, 'Receipt Number: ', receipt.receiptNumber || '-');
    drawRow(doc, 'Transaction ID: ', receipt.paymentId || '-');
    drawRow(doc, 'Payment Date: ', formatDate(receipt.paymentDate));
    drawRow(doc, 'Student Name: ', receipt.studentName || '-');
    drawRow(doc, 'Roll Number: ', receipt.rollNumber || '-');
    drawRow(doc, 'Class / Section: ', `${receipt.className || '-'} / ${receipt.sectionName || '-'}`);
    drawRow(doc, 'Fee Component: ', receipt.feeTypeLabel || '-');
    drawRow(doc, 'Amount Paid: ', formatCurrency(receipt.amountPaid));
    drawRow(doc, 'Payment Method: ', receipt.paymentMethod || '-');
    drawRow(doc, 'Reference: ', receipt.transactionReference || '-');

    doc.moveDown(1);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('This is a computer-generated receipt and does not require a physical signature.', {
        align: 'center'
      });

    doc.end();
  });

module.exports = {
  generateFeeReceiptPdf
};
