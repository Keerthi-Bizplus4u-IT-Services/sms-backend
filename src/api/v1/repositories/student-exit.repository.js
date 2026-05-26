const {
  StudentExit, StudentCertificate, Student, Person, School,
  Class, Section, AcademicYear, User, SchoolBranch
} = require('../../../models');
const { Op } = require('sequelize');

/**
 * Student Exit Repository
 * Data access layer for student exits and certificates
 */
class StudentExitRepository {
  /**
   * Create a student exit record
   */
  async createExit(data, transaction = null) {
    return StudentExit.create(data, { transaction });
  }

  /**
   * Find exit by student ID
   */
  async findExitByStudentId(studentId, schoolId) {
    return StudentExit.findOne({
      where: { student_id: studentId, school_id: schoolId },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            { model: Person, as: 'person' },
            { model: Class, as: 'class', include: [{ model: AcademicYear, as: 'academicYear' }] },
            { model: Section, as: 'section' },
            { model: SchoolBranch, as: 'branch' }
          ]
        },
        { model: User, as: 'issuedBy', attributes: ['id', 'email'] },
        { model: StudentCertificate, as: 'certificates' }
      ]
    });
  }

  /**
   * Find exit by ID
   */
  async findExitById(id, schoolId) {
    const where = { id };
    if (schoolId) where.school_id = schoolId;

    return StudentExit.findOne({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            { model: Person, as: 'person' },
            { model: Class, as: 'class', include: [{ model: AcademicYear, as: 'academicYear' }] },
            { model: Section, as: 'section' },
            { model: School, as: 'school' },
            { model: SchoolBranch, as: 'branch' }
          ]
        },
        { model: User, as: 'issuedBy', attributes: ['id', 'email'] },
        { model: StudentCertificate, as: 'certificates' }
      ]
    });
  }

  /**
   * Find student with full details for certificate generation
   */
  async findStudentForCertificate(studentId, schoolId) {
    return Student.findOne({
      where: { id: studentId, school_id: schoolId },
      include: [
        { model: Person, as: 'person' },
        {
          model: Class,
          as: 'class',
          include: [{ model: AcademicYear, as: 'academicYear' }]
        },
        { model: Section, as: 'section' },
        { model: School, as: 'school' },
        { model: SchoolBranch, as: 'branch' }
      ]
    });
  }

  /**
   * Create a certificate record
   */
  async createCertificate(data, transaction = null) {
    return StudentCertificate.create(data, { transaction });
  }

  /**
   * Find certificates by exit ID
   */
  async findCertificatesByExitId(exitId) {
    return StudentCertificate.findAll({
      where: { exit_id: exitId },
      include: [
        { model: User, as: 'issuedBy', attributes: ['id', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Find certificate by exit and type
   */
  async findCertificateByExitAndType(exitId, certificateType, schoolId) {
    const where = {
      exit_id: exitId,
      certificate_type: certificateType
    };

    if (schoolId) {
      where.school_id = schoolId;
    }

    return StudentCertificate.findOne({ where });
  }

  /**
   * Find certificate by ID
   */
  async findCertificateById(id, schoolId) {
    const where = { id };
    if (schoolId) where.school_id = schoolId;

    return StudentCertificate.findOne({
      where,
      include: [
        {
          model: StudentExit,
          as: 'exit',
          include: [
            {
              model: Student,
              as: 'student',
              include: [
                { model: Person, as: 'person' },
                { model: Class, as: 'class', include: [{ model: AcademicYear, as: 'academicYear' }] },
                { model: Section, as: 'section' },
                { model: School, as: 'school' },
                { model: SchoolBranch, as: 'branch' }
              ]
            }
          ]
        },
        { model: User, as: 'issuedBy', attributes: ['id', 'email'] }
      ]
    });
  }

  /**
   * Generate next certificate number for a school/type/year
   * Format: TC/2026/0001 or SC/2026/0001
   */
  async getNextCertificateNumber(schoolId, certificateType, year) {
    const prefix = certificateType === 'transfer_certificate' ? 'TC' : 'SC';
    const pattern = `${prefix}/${year}/%`;

    const lastCert = await StudentCertificate.findOne({
      where: {
        school_id: schoolId,
        certificate_number: { [Op.like]: pattern }
      },
      order: [['certificate_number', 'DESC']]
    });

    let nextSeq = 1;
    if (lastCert) {
      const parts = lastCert.certificate_number.split('/');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}/${year}/${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * List all exits with pagination and filters
   */
  async findAllExits(filters = {}) {
    const {
      page = 1,
      limit = 10,
      schoolId,
      exitType,
      search
    } = filters;

    const offset = (page - 1) * limit;
    const where = {};
    const personWhere = {};

    if (schoolId) where.school_id = schoolId;
    if (exitType) where.exit_type = exitType;

    if (search) {
      personWhere[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const hasPersonFilter = Object.keys(personWhere).length > 0 ||
      Object.getOwnPropertySymbols(personWhere).length > 0;

    const { rows, count } = await StudentExit.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: Person,
              as: 'person',
              where: hasPersonFilter ? personWhere : undefined,
              attributes: ['id', 'first_name', 'last_name', 'middle_name']
            }
          ]
        },
        { model: StudentCertificate, as: 'certificates', attributes: ['id', 'certificate_type', 'certificate_number'] },
        { model: User, as: 'issuedBy', attributes: ['id', 'email'] }
      ],
      order: [['exit_date', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
      distinct: true
    });

    return {
      exits: rows,
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Update student status
   */
  async updateStudentStatus(studentId, status, transaction = null) {
    return Student.update(
      { status },
      { where: { id: studentId }, transaction }
    );
  }
}

module.exports = { studentExitRepository: new StudentExitRepository() };
