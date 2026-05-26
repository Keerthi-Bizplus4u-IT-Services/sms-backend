/**
 * Certificate PDF Generator
 * Generates Transfer Certificate and Study & Conduct Certificate PDFs
 * using pdfkit for the Indian schooling system format.
 */

const PDFDocument = require('pdfkit');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

/**
 * Convert a number to words (for date of birth representation)
 */
function numberToWords(num) {
  if (num === 0) return 'Zero';
  if (num < 20) return ONES[num];
  if (num < 100) {
    return TENS[Math.floor(num / 10)] + (num % 10 ? ' ' + ONES[num % 10] : '');
  }
  if (num < 1000) {
    return ONES[Math.floor(num / 100)] + ' Hundred' +
      (num % 100 ? ' and ' + numberToWords(num % 100) : '');
  }
  if (num < 100000) {
    return numberToWords(Math.floor(num / 1000)) + ' Thousand' +
      (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  }
  return String(num);
}

/**
 * Format date as "DD-MM-YYYY"
 */
function formatDate(dateStr) {
  if (!dateStr) return '_______________';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format date in words: "Fifteenth day of March, Two Thousand Twenty Six"
 */
function formatDateInWords(dateStr) {
  if (!dateStr) return '_______________';
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${numberToWords(day)} day of ${month}, ${numberToWords(year)}`;
}

/**
 * Get gender-aware pronoun
 */
function getPronoun(gender) {
  if (gender === 'male') return { subject: 'He', possessive: 'His', relation: 'son' };
  if (gender === 'female') return { subject: 'She', possessive: 'Her', relation: 'daughter' };
  return { subject: 'They', possessive: 'Their', relation: 'child' };
}

/**
 * Format conduct value for display
 */
function formatConduct(conduct) {
  if (!conduct) return 'Good';
  return conduct.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Draw school header on the PDF document
 */
function drawSchoolHeader(doc, school, startY) {
  let y = startY;

  // School name
  doc.fontSize(16).font('Helvetica-Bold')
    .text(school.name || 'School Name', { align: 'center' });
  y += 22;

  // Affiliation info
  if (school.affiliation || school.affiliation_number) {
    const affLine = [
      school.affiliation ? `Affiliated to ${school.affiliation}` : null,
      school.affiliation_number ? `Affiliation No: ${school.affiliation_number}` : null
    ].filter(Boolean).join(' | ');

    doc.fontSize(9).font('Helvetica')
      .text(affLine, { align: 'center' });
    y += 14;
  }

  // Registration number
  if (school.registration_number) {
    doc.fontSize(9).font('Helvetica')
      .text(`Registration No: ${school.registration_number}`, { align: 'center' });
    y += 14;
  }

  // Address
  const addressParts = [
    school.address_line1, school.address_line2,
    school.city, school.state, school.postal_code
  ].filter(Boolean);
  if (addressParts.length > 0) {
    doc.fontSize(9).font('Helvetica')
      .text(addressParts.join(', '), { align: 'center' });
    y += 14;
  }

  // Contact
  const contactParts = [
    school.phone ? `Ph: ${school.phone}` : null,
    school.email ? `Email: ${school.email}` : null,
    school.website ? `Web: ${school.website}` : null
  ].filter(Boolean);
  if (contactParts.length > 0) {
    doc.fontSize(8).font('Helvetica')
      .text(contactParts.join(' | '), { align: 'center' });
    y += 12;
  }

  // Divider line
  y += 5;
  doc.moveTo(50, y).lineTo(545, y).lineWidth(1.5).stroke();
  y += 10;

  return y;
}

/**
 * Draw a labeled field row for the TC
 */
function drawTcRow(doc, num, label, value, y) {
  const leftMargin = 55;
  const valueX = 280;
  const lineHeight = 18;

  doc.fontSize(10).font('Helvetica-Bold')
    .text(`${num}.`, leftMargin, y, { width: 20 });
  doc.fontSize(10).font('Helvetica')
    .text(label, leftMargin + 20, y, { width: valueX - leftMargin - 25 });
  doc.fontSize(10).font('Helvetica')
    .text(`: ${value || '_______________'}`, valueX, y, { width: 260 });

  return y + lineHeight;
}

/**
 * Generate Transfer Certificate PDF
 * @param {Object} data - { student, person, school, exit, certificate }
 * @returns {Promise<Buffer>}
 */
function generateTransferCertificate(data) {
  return new Promise((resolve, reject) => {
    const { student, person, school, exit, certificate } = data;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    let y = drawSchoolHeader(doc, school, 40);

    // Title
    y += 5;
    doc.fontSize(14).font('Helvetica-Bold')
      .text('TRANSFER CERTIFICATE', { align: 'center' });
    y += 25;

    // TC Number and Date
    doc.fontSize(10).font('Helvetica')
      .text(`TC No: ${certificate.certificate_number}`, 55, y)
      .text(`Date: ${formatDate(certificate.issued_date)}`, 400, y);
    y += 25;

    // Student full name
    const fullName = person.getFullName
      ? person.getFullName()
      : `${person.first_name} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name}`;

    const pronoun = getPronoun(person.gender);

    // TC Rows — Indian standard format
    y = drawTcRow(doc, 1, 'Admission Number', student.admission_number, y);
    y = drawTcRow(doc, 2, 'Name of the Pupil (in full)', fullName, y);
    y = drawTcRow(doc, 3, "Father's / Guardian's Name", person.father_name || person.guardian_name || '_______________', y);
    y = drawTcRow(doc, 4, "Mother's Name", person.mother_name || '_______________', y);
    y = drawTcRow(doc, 5, 'Nationality', person.nationality || 'Indian', y);
    y = drawTcRow(doc, 6, 'Caste / Category',
      [person.caste, person.category ? person.category.toUpperCase() : null].filter(Boolean).join(' / ') || '_______________', y);
    y = drawTcRow(doc, 7, 'Date of Birth (in figures)', formatDate(person.date_of_birth), y);
    y = drawTcRow(doc, 8, 'Date of Birth (in words)', formatDateInWords(person.date_of_birth), y);

    // Classes and academic details
    const admClass = student.admissionClassName || exit.class_at_exit;
    y = drawTcRow(doc, 9, 'Date of Admission', formatDate(student.admission_date), y);
    y = drawTcRow(doc, 10, 'Class in which admitted', admClass || '_______________', y);
    y = drawTcRow(doc, 11, 'Class in which studying at\n    the time of leaving', exit.class_at_exit, y);
    y += 4; // extra spacing for multi-line label
    y = drawTcRow(doc, 12, 'Academic Year', exit.academic_year_at_exit || '_______________', y);
    y = drawTcRow(doc, 13, 'Whether qualified for\n    promotion to higher class', exit.qualified_for_promotion ? 'Yes' : 'No', y);
    y += 4;
    y = drawTcRow(doc, 14, 'Whether the pupil has paid\n    all fees due to the school', exit.fees_paid ? 'Yes' : 'No', y);
    y += 4;
    y = drawTcRow(doc, 15, 'Character and Conduct', formatConduct(exit.conduct), y);
    y = drawTcRow(doc, 16, 'Date of leaving the school', formatDate(exit.exit_date), y);
    y = drawTcRow(doc, 17, 'Reason for leaving', exit.reason || 'At own request', y);
    y = drawTcRow(doc, 18, 'Any other remarks', exit.remarks || 'Nil', y);

    // Signature area
    y += 40;
    doc.fontSize(10).font('Helvetica')
      .text('Date: _______________', 55, y)
      .text('Place: _______________', 55, y + 18);

    doc.fontSize(10).font('Helvetica-Bold')
      .text('Principal / Head of Institution', 350, y + 9, { align: 'right', width: 190 });

    y += 50;
    doc.fontSize(8).font('Helvetica')
      .text('(Seal of the Institution)', 380, y, { align: 'right', width: 160 });

    // Footer note
    y += 30;
    doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(7).font('Helvetica')
      .text('Note: Erasure / alteration, if any, in this certificate, should be duly attested by the issuing authority, ' +
        'failing which the certificate is liable to be treated as invalid.', 55, y, { width: 490 });

    doc.end();
  });
}

/**
 * Generate Study & Conduct Certificate PDF (combined)
 * @param {Object} data - { student, person, school, exit, certificate }
 * @returns {Promise<Buffer>}
 */
function generateStudyConductCertificate(data) {
  return new Promise((resolve, reject) => {
    const { student, person, school, exit, certificate } = data;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    let y = drawSchoolHeader(doc, school, 50);

    // Title
    y += 10;
    doc.fontSize(16).font('Helvetica-Bold')
      .text('STUDY & CONDUCT CERTIFICATE', { align: 'center' });
    y += 30;

    // Certificate number and date
    doc.fontSize(10).font('Helvetica')
      .text(`Certificate No: ${certificate.certificate_number}`, 55, y)
      .text(`Date: ${formatDate(certificate.issued_date)}`, 400, y);
    y += 30;

    // Student full name
    const fullName = person.getFullName
      ? person.getFullName()
      : `${person.first_name} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name}`;

    const pronoun = getPronoun(person.gender);
    const conductText = formatConduct(exit.conduct);

    // Body text
    const body = `This is to certify that ${fullName}, ${pronoun.relation} of ${person.father_name || person.guardian_name || '_______________'}, ` +
      `bearing Admission No. ${student.admission_number}, was a bonafide student of this school ` +
      `from ${formatDate(student.admission_date)} to ${formatDate(exit.exit_date)}, ` +
      `studying in Class ${exit.class_at_exit} during the Academic Year ${exit.academic_year_at_exit}.`;

    doc.fontSize(12).font('Helvetica')
      .text(body, 55, y, { width: 490, lineGap: 6, align: 'justify' });
    y = doc.y + 20;

    const conductBody = `${pronoun.possessive} conduct and character during ${pronoun.possessive.toLowerCase()} stay in this school ` +
      `was found to be ${conductText}.`;

    doc.fontSize(12).font('Helvetica')
      .text(conductBody, 55, y, { width: 490, lineGap: 6, align: 'justify' });
    y = doc.y + 15;

    // Additional info
    const additionalText = `We wish ${pronoun.subject.toLowerCase() === 'they' ? 'them' : (pronoun.subject === 'He' ? 'him' : 'her')} ` +
      'all the best in future endeavours.';

    doc.fontSize(12).font('Helvetica')
      .text(additionalText, 55, y, { width: 490, lineGap: 6, align: 'justify' });
    y = doc.y + 50;

    // Signature area
    doc.fontSize(10).font('Helvetica')
      .text('Date: _______________', 55, y)
      .text('Place: _______________', 55, y + 18);

    doc.fontSize(10).font('Helvetica-Bold')
      .text('Principal / Head of Institution', 350, y + 9, { align: 'right', width: 190 });

    y += 50;
    doc.fontSize(8).font('Helvetica')
      .text('(Seal of the Institution)', 380, y, { align: 'right', width: 160 });

    doc.end();
  });
}

module.exports = {
  generateTransferCertificate,
  generateStudyConductCertificate
};
