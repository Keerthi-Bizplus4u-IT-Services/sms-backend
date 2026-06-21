const { QueryTypes, Op } = require('sequelize');
const { Parent, Person, User, Student } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const { sequelize } = require('../../../config/database');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;
const normalizeValue = (value) => String(value || '').trim();
const compactObject = (value = {}) => Object.fromEntries(
  Object.entries(value).filter(([, entry]) => entry !== undefined)
);
const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const buildFullName = (person = {}) => [person.first_name, person.middle_name, person.last_name]
  .filter(Boolean)
  .join(' ')
  .trim();

class ParentRepository {
  async resolveStudentParentsRelation() {
    const tableName = await resolveTableName(['student_parents']);
    if (!tableName) {
      return null;
    }

    const columns = await getTableColumns(tableName);
    const parentCol = columns.has('parent_id') ? 'parent_id' : columns.has('pid') ? 'pid' : null;
    const studentCol = columns.has('student_id') ? 'student_id' : columns.has('sid') ? 'sid' : null;

    if (!parentCol || !studentCol) {
      return null;
    }

    return {
      tableName,
      columns,
      parentCol,
      studentCol
    };
  }

  getTextMatchOperator() {
    const dialect = Parent.sequelize?.getDialect?.();
    return dialect === 'postgres' ? Op.iLike : Op.like;
  }

  buildTokenizedNameSearchCondition(tokens = [], fields = ['first_name', 'last_name']) {
    const textMatchOp = this.getTextMatchOperator();
    const validTokens = (tokens || []).map((token) => String(token).trim()).filter(Boolean);
    if (!validTokens.length) {
      return null;
    }

    return {
      [Op.and]: validTokens.map((token) => ({
        [Op.or]: fields.map((field) => ({ [field]: { [textMatchOp]: `%${token}%` } }))
      }))
    };
  }

  async findExistingParent(parentData = {}, personData = {}, userData = null, transaction) {
    const normalizedPanNumber = normalizeValue(parentData.pan_number);
    if (normalizedPanNumber) {
      const existingByPan = await Parent.findOne({
        where: { pan_number: normalizedPanNumber },
        include: [{
          model: Person,
          as: 'person',
          include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active'], required: false }]
        }],
        transaction
      });

      if (existingByPan) {
        return existingByPan;
      }
    }

    const normalizedIdNumber = normalizeValue(personData.id_number);
    if (normalizedIdNumber) {
      const existingByIdNumber = await Parent.findOne({
        include: [{
          model: Person,
          as: 'person',
          required: true,
          where: { id_number: normalizedIdNumber },
          include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active'], required: false }]
        }],
        transaction
      });

      if (existingByIdNumber) {
        return existingByIdNumber;
      }
    }

    const normalizedFirstName = normalizeValue(personData.first_name);
    const normalizedLastName = normalizeValue(personData.last_name);
    const normalizedPhone = normalizeValue(personData.phone);
    const normalizedDateOfBirth = normalizeValue(personData.date_of_birth);

    if (normalizedFirstName && normalizedLastName && normalizedDateOfBirth && normalizedPhone) {
      const existingByIdentity = await Parent.findOne({
        include: [{
          model: Person,
          as: 'person',
          required: true,
          where: {
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            date_of_birth: normalizedDateOfBirth,
            phone: normalizedPhone
          },
          include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active'], required: false }]
        }],
        transaction
      });

      if (existingByIdentity) {
        return existingByIdentity;
      }
    }

    const normalizedEmail = normalizeValue(userData?.email);
    if (normalizedEmail) {
      const existingByEmail = await Parent.findOne({
        include: [{
          model: Person,
          as: 'person',
          required: true,
          include: [{
            model: User,
            as: 'user',
            required: true,
            attributes: ['id', 'email', 'is_active'],
            where: { email: normalizedEmail }
          }]
        }],
        transaction
      });

      if (existingByEmail) {
        return existingByEmail;
      }
    }

    return null;
  }

  async mergeExistingParent(existingParent, parentData = {}, personData = {}, transaction) {
    if (!existingParent) {
      return null;
    }

    const normalizedParentData = compactObject({
      ...parentData,
      pan_number: parentData.pan_number !== undefined ? normalizeValue(parentData.pan_number) || null : undefined
    });
    const normalizedPersonData = compactObject({
      ...personData,
      id_number: personData.id_number !== undefined ? normalizeValue(personData.id_number) || null : undefined,
      phone: personData.phone !== undefined ? normalizeValue(personData.phone) || null : undefined
    });

    if (Object.keys(normalizedParentData).length) {
      await existingParent.update(normalizedParentData, { transaction });
    }

    if (existingParent.person && Object.keys(normalizedPersonData).length) {
      await existingParent.person.update(normalizedPersonData, { transaction });
    }

    return existingParent;
  }

  async getParentIdsByStudentSearch(search) {
    const query = String(search || '').trim();
    if (!query) {
      return [];
    }

    const textMatchOp = this.getTextMatchOperator();
    const searchTokens = query.split(/\s+/).filter(Boolean);
    const tokenizedStudentNameFilter = this.buildTokenizedNameSearchCondition(searchTokens, ['first_name', 'last_name']);

    const students = await Student.findAll({
      include: [{
        model: Person,
        as: 'person',
        where: tokenizedStudentNameFilter || {
          [Op.or]: [
            { first_name: { [textMatchOp]: `%${query}%` } },
            { last_name: { [textMatchOp]: `%${query}%` } }
          ]
        },
        attributes: []
      }],
      attributes: ['id']
    });

    const studentIds = students.map((student) => Number(student.id)).filter(Boolean);
    if (!studentIds.length) {
      return [];
    }

    const relation = await this.resolveStudentParentsRelation();
    if (!relation) {
      return [];
    }

    try {
      const rows = await sequelize.query(
        `SELECT DISTINCT ${wrapIdentifier(relation.parentCol)} AS parent_id FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier(relation.studentCol)} IN (:studentIds)`,
        {
          replacements: { studentIds },
          type: QueryTypes.SELECT
        }
      );

      return rows.map((row) => Number(row.parent_id)).filter(Boolean);
    } catch (error) {
      console.warn('parent.repository: failed to search parents by student name', error.message);
      return [];
    }
  }

  async getStudentNamesByParentIds(parentIds = []) {
    if (!parentIds.length) {
      return new Map();
    }

    const relation = await this.resolveStudentParentsRelation();
    if (!relation) {
      return new Map();
    }

    let links = [];

    try {
      links = await sequelize.query(
        `SELECT ${wrapIdentifier(relation.parentCol)} AS parent_id, ${wrapIdentifier(relation.studentCol)} AS student_id FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier(relation.parentCol)} IN (:parentIds)`,
        {
          replacements: { parentIds },
          type: QueryTypes.SELECT
        }
      );
    } catch (error) {
      console.warn('parent.repository: failed to load student parent links', error.message);
      return new Map();
    }

    const studentIds = [...new Set(links.map((link) => Number(link.student_id)).filter(Boolean))];
    if (!studentIds.length) {
      return new Map();
    }

    const students = await Student.findAll({
      where: { id: studentIds },
      include: [{
        model: Person,
        as: 'person',
        attributes: ['first_name', 'middle_name', 'last_name']
      }],
      attributes: ['id']
    });

    const studentNameMap = new Map(
      students.map((student) => {
        const person = student.person || {};
        const fullName = [person.first_name, person.middle_name, person.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();

        return [Number(student.id), fullName || `Student ${student.id}`];
      })
    );

    const parentStudentNamesMap = new Map();

    links.forEach((link) => {
      const parentId = Number(link.parent_id);
      const studentName = studentNameMap.get(Number(link.student_id));

      if (!studentName) {
        return;
      }

      if (!parentStudentNamesMap.has(parentId)) {
        parentStudentNamesMap.set(parentId, []);
      }

      const names = parentStudentNamesMap.get(parentId);
      if (!names.includes(studentName)) {
        names.push(studentName);
      }
    });

    return parentStudentNamesMap;
  }

  async getFallbackStudentNamesByParents(parents = []) {
    if (!Array.isArray(parents) || !parents.length) {
      return new Map();
    }

    const parentNameLookup = new Map();

    parents.forEach((parent) => {
      const person = parent?.person || {};
      const variants = new Set();

      const firstName = normalizeName(person.first_name);
      const lastName = normalizeName(person.last_name);
      const fullName = normalizeName(buildFullName(person));
      const firstLast = normalizeName([person.first_name, person.last_name].filter(Boolean).join(' '));

      if (fullName) variants.add(fullName);
      if (firstLast) variants.add(firstLast);
      if (firstName) variants.add(firstName);
      if (lastName) variants.add(lastName);

      if (variants.size > 0) {
        parentNameLookup.set(Number(parent.id), variants);
      }
    });

    if (!parentNameLookup.size) {
      return new Map();
    }

    const students = await Student.findAll({
      include: [{
        model: Person,
        as: 'person',
        attributes: ['first_name', 'middle_name', 'last_name', 'father_name', 'mother_name', 'guardian_name']
      }],
      attributes: ['id']
    });

    const fallbackMap = new Map();

    students.forEach((student) => {
      const person = student.person || {};
      const studentName = buildFullName(person) || `Student ${student.id}`;
      const guardianNames = new Set([
        normalizeName(person.father_name),
        normalizeName(person.mother_name),
        normalizeName(person.guardian_name)
      ].filter(Boolean));

      if (!guardianNames.size) {
        return;
      }

      parentNameLookup.forEach((variants, parentId) => {
        const matched = [...variants].some((variant) => guardianNames.has(variant));
        if (!matched) {
          return;
        }

        if (!fallbackMap.has(parentId)) {
          fallbackMap.set(parentId, []);
        }

        const names = fallbackMap.get(parentId);
        if (!names.includes(studentName)) {
          names.push(studentName);
        }
      });
    });

    return fallbackMap;
  }

  async syncLegacyStudentLinks({ schoolId = null, dryRun = false } = {}) {
    const relation = await this.resolveStudentParentsRelation();
    if (!relation) {
      throw new AppError('Student-parent links are unavailable', 500);
    }

    const parents = await Parent.findAll({
      include: [{ model: Person, as: 'person', attributes: ['first_name', 'middle_name', 'last_name'] }],
      attributes: ['id']
    });

    const studentWhere = schoolId ? { school_id: schoolId } : {};
    const students = await Student.findAll({
      where: studentWhere,
      include: [{
        model: Person,
        as: 'person',
        attributes: ['first_name', 'middle_name', 'last_name', 'father_name', 'mother_name', 'guardian_name']
      }],
      attributes: ['id']
    });

    const parentNameVariants = new Map();
    parents.forEach((parent) => {
      const person = parent.person || {};
      const firstName = normalizeName(person.first_name);
      const middleName = normalizeName(person.middle_name);
      const lastName = normalizeName(person.last_name);
      const variants = new Set();

      const fullName = normalizeName([firstName, middleName, lastName].filter(Boolean).join(' '));
      const firstLastName = normalizeName([firstName, lastName].filter(Boolean).join(' '));

      if (fullName) variants.add(fullName);
      if (firstLastName) variants.add(firstLastName);
      if (firstName) variants.add(firstName);

      if (variants.size > 0) {
        parentNameVariants.set(Number(parent.id), variants);
      }
    });

    const parentIds = [...parentNameVariants.keys()];
    const studentIds = students.map((student) => Number(student.id)).filter(Boolean);

    if (!parentIds.length || !studentIds.length) {
      return {
        scannedParents: parentIds.length,
        scannedStudents: studentIds.length,
        matchedPairs: 0,
        insertedLinks: 0,
        dryRun: Boolean(dryRun)
      };
    }

    let existingLinks = [];
    try {
      existingLinks = await sequelize.query(
        `SELECT ${wrapIdentifier(relation.studentCol)} AS student_id, ${wrapIdentifier(relation.parentCol)} AS parent_id FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier(relation.studentCol)} IN (:studentIds) AND ${wrapIdentifier(relation.parentCol)} IN (:parentIds)`,
        {
          replacements: { studentIds, parentIds },
          type: QueryTypes.SELECT
        }
      );
    } catch (error) {
      console.warn('parent.repository: failed to load existing links for sync', error.message);
    }

    const existingLinkKeys = new Set(
      (existingLinks || []).map((link) => `${Number(link.student_id)}:${Number(link.parent_id)}`)
    );

    const pendingLinks = [];
    const pendingLinkKeys = new Set();
    let matchedPairs = 0;

    students.forEach((student) => {
      const person = student.person || {};
      const relationCandidates = [
        { type: 'father', value: normalizeName(person.father_name) },
        { type: 'mother', value: normalizeName(person.mother_name) },
        { type: 'guardian', value: normalizeName(person.guardian_name) }
      ].filter((entry) => Boolean(entry.value));

      if (!relationCandidates.length) {
        return;
      }

      parentNameVariants.forEach((variants, parentId) => {
        const variantList = [...variants].filter((entry) => entry.length >= 3);
        const matchedCandidate = relationCandidates.find((candidate) => {
          if (variants.has(candidate.value)) {
            return true;
          }

          return variantList.some((variant) => candidate.value.includes(variant));
        });

        if (!matchedCandidate) {
          return;
        }

        matchedPairs += 1;
        const linkKey = `${Number(student.id)}:${parentId}`;
        if (existingLinkKeys.has(linkKey) || pendingLinkKeys.has(linkKey)) {
          return;
        }

        pendingLinkKeys.add(linkKey);
        pendingLinks.push({
          studentId: Number(student.id),
          parentId,
          relationshipType: matchedCandidate.type
        });
      });
    });

    if (!dryRun) {
      const supportsCreatedAt = relation.columns.has('created_at');
      for (const link of pendingLinks) {
        const insertColumns = [relation.studentCol, relation.parentCol, 'relationship_type', 'is_primary_contact', 'is_emergency_contact'];
        const insertValues = [':studentId', ':parentId', ':relationshipType', 'FALSE', 'FALSE'];

        if (supportsCreatedAt) {
          insertColumns.push('created_at');
          insertValues.push('CURRENT_TIMESTAMP');
        }

        await sequelize.query(
          `INSERT INTO ${wrapIdentifier(relation.tableName)} (${insertColumns.map((column) => wrapIdentifier(column)).join(', ')}) VALUES (${insertValues.join(', ')})`,
          {
            replacements: {
              studentId: link.studentId,
              parentId: link.parentId,
              relationshipType: link.relationshipType
            }
          }
        );
      }
    }

    return {
      scannedParents: parentIds.length,
      scannedStudents: studentIds.length,
      matchedPairs,
      insertedLinks: pendingLinks.length,
      dryRun: Boolean(dryRun)
    };
  }

  async findAll(filters = {}) {
    const { page = 1, limit = 10, search, studentId } = filters;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (parsedPage - 1) * parsedLimit;
    const whereClause = {};

    const normalizedStudentId = Number.parseInt(String(studentId || ''), 10);
    if (!Number.isNaN(normalizedStudentId) && normalizedStudentId > 0) {
      const relation = await this.resolveStudentParentsRelation();
      if (!relation) {
        return {
          parents: [],
          total: 0,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: 0
        };
      }

      const linkedParentRows = await sequelize.query(
        `SELECT DISTINCT ${wrapIdentifier(relation.parentCol)} AS parent_id FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier(relation.studentCol)} = :studentId`,
        {
          replacements: { studentId: normalizedStudentId },
          type: QueryTypes.SELECT
        }
      );

      const linkedParentIds = linkedParentRows.map((row) => Number(row.parent_id)).filter(Boolean);
      if (!linkedParentIds.length) {
        return {
          parents: [],
          total: 0,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: 0
        };
      }

      whereClause.id = { [Op.in]: linkedParentIds };
    }

    if (search) {
      const textMatchOp = this.getTextMatchOperator();
      const normalizedSearch = String(search).trim();
      const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);
      const matchedParentIds = await this.getParentIdsByStudentSearch(normalizedSearch);
      const tokenizedPersonCondition = searchTokens.length ? {
        [Op.and]: searchTokens.map((token) => ({
          [Op.or]: [
            { '$person.first_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.last_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.phone$': { [textMatchOp]: `%${token}%` } }
          ]
        }))
      } : null;

      whereClause[Op.or] = [
        ...(tokenizedPersonCondition ? [tokenizedPersonCondition] : []),
        { '$person.first_name$': { [textMatchOp]: `%${normalizedSearch}%` } },
        { '$person.last_name$': { [textMatchOp]: `%${normalizedSearch}%` } },
        { '$person.phone$': { [textMatchOp]: `%${normalizedSearch}%` } },
        ...(matchedParentIds.length ? [{ id: { [Op.in]: matchedParentIds } }] : [])
      ];
    }

    const { rows: parents, count: total } = await Parent.findAndCountAll({
      where: whereClause,
      include: [{
        model: Person,
        as: 'person',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'is_active']
        }],
        attributes: { exclude: ['created_at', 'updated_at', 'deleted_at'] }
      }],
      limit: parsedLimit,
      offset,
      distinct: true,
      order: [['created_at', 'DESC']]
    });

    const parentStudentNamesMap = await this.getStudentNamesByParentIds(parents.map((parent) => Number(parent.id)));
    const parentFallbackNamesMap = await this.getFallbackStudentNamesByParents(parents);
    parents.forEach((parent) => {
      const parentId = Number(parent.id);
      const directNames = parentStudentNamesMap.get(parentId) || [];
      const fallbackNames = parentFallbackNamesMap.get(parentId) || [];
      const mergedNames = [...new Set([...directNames, ...fallbackNames])];
      parent.setDataValue('student_names', mergedNames);
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / parsedLimit);

    return {
      parents,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages
    };
  }

  async findById(id) {
    const parent = await Parent.findByPk(id, {
      include: [{
        model: Person,
        as: 'person',
        include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active'] }]
      }]
    });

    if (!parent) throw new AppError('Parent not found', 404);

    const parentStudentNamesMap = await this.getStudentNamesByParentIds([Number(parent.id)]);
    const parentFallbackNamesMap = await this.getFallbackStudentNamesByParents([parent]);
    const parentId = Number(parent.id);
    const directNames = parentStudentNamesMap.get(parentId) || [];
    const fallbackNames = parentFallbackNamesMap.get(parentId) || [];
    parent.setDataValue('student_names', [...new Set([...directNames, ...fallbackNames])]);

    return parent;
  }

  async linkStudent(parentId, studentId, linkData = {}, options = {}) {
    const relation = await this.resolveStudentParentsRelation();
    if (!relation) {
      throw new AppError('Student-parent links are unavailable', 500);
    }

    const transaction = await sequelize.transaction();

    try {
      const parent = await Parent.findByPk(parentId, { transaction });
      if (!parent) {
        throw new AppError('Parent not found', 404);
      }

      const studentWhere = { id: studentId };
      if (options.schoolId) {
        studentWhere.school_id = options.schoolId;
      }

      const student = await Student.findOne({ where: studentWhere, transaction, attributes: ['id'] });
      if (!student) {
        throw new AppError('Student not found', 404);
      }

      const supportsLinkId = relation.columns.has('id');
      const existingLinks = await sequelize.query(
        `SELECT ${supportsLinkId ? `${wrapIdentifier('id')} AS link_id,` : ''} ${wrapIdentifier('relationship_type')} AS relationship_type, ${wrapIdentifier('is_primary_contact')} AS is_primary_contact, ${wrapIdentifier('is_emergency_contact')} AS is_emergency_contact FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier(relation.studentCol)} = :studentId AND ${wrapIdentifier(relation.parentCol)} = :parentId${supportsLinkId ? ` ORDER BY ${wrapIdentifier('id')} DESC` : ''}`,
        {
          replacements: { studentId, parentId },
          type: QueryTypes.SELECT,
          transaction
        }
      );

      if (existingLinks.length) {
        const existingLink = existingLinks[0];
        const supportsCurrentLinkId = supportsLinkId && existingLink.link_id !== undefined && existingLink.link_id !== null;

        if (supportsCurrentLinkId && existingLinks.length > 1) {
          const duplicateIds = existingLinks
            .slice(1)
            .map((row) => Number(row.link_id))
            .filter((id) => Number.isInteger(id) && id > 0);

          if (duplicateIds.length) {
            await sequelize.query(
              `DELETE FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier('id')} IN (:duplicateIds)`,
              {
                replacements: { duplicateIds },
                transaction
              }
            );
          }
        }

        const updateWhereClause = supportsCurrentLinkId
          ? `${wrapIdentifier('id')} = :linkId`
          : `${wrapIdentifier(relation.studentCol)} = :studentId AND ${wrapIdentifier(relation.parentCol)} = :parentId`;

        await sequelize.query(
          `UPDATE ${wrapIdentifier(relation.tableName)} SET ${wrapIdentifier('relationship_type')} = :relationshipType, ${wrapIdentifier('is_primary_contact')} = :isPrimaryContact, ${wrapIdentifier('is_emergency_contact')} = :isEmergencyContact WHERE ${updateWhereClause}`,
          {
            replacements: {
              linkId: existingLink.link_id,
              studentId,
              parentId,
              relationshipType: linkData.relationship_type || existingLink.relationship_type,
              isPrimaryContact: typeof linkData.is_primary_contact === 'boolean'
                ? linkData.is_primary_contact
                : Boolean(existingLink.is_primary_contact),
              isEmergencyContact: typeof linkData.is_emergency_contact === 'boolean'
                ? linkData.is_emergency_contact
                : Boolean(existingLink.is_emergency_contact)
            },
            transaction
          }
        );
      } else {
        const supportsCreatedAt = relation.columns.has('created_at');
        const insertColumns = [relation.studentCol, relation.parentCol, 'relationship_type', 'is_primary_contact', 'is_emergency_contact'];
        const insertValues = [':studentId', ':parentId', ':relationshipType', ':isPrimaryContact', ':isEmergencyContact'];

        if (supportsCreatedAt) {
          insertColumns.push('created_at');
          insertValues.push('CURRENT_TIMESTAMP');
        }

        await sequelize.query(
          `INSERT INTO ${wrapIdentifier(relation.tableName)} (${insertColumns.map((column) => wrapIdentifier(column)).join(', ')}) VALUES (${insertValues.join(', ')})`,
          {
            replacements: {
              studentId,
              parentId,
              relationshipType: linkData.relationship_type,
              isPrimaryContact: typeof linkData.is_primary_contact === 'boolean' ? linkData.is_primary_contact : false,
              isEmergencyContact: typeof linkData.is_emergency_contact === 'boolean' ? linkData.is_emergency_contact : false
            },
            transaction
          }
        );
      }

      await transaction.commit();
      return await this.findById(parentId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async create(parentData, personData, userData = null) {
    const { sequelize } = require('../../../config/database');
    const transaction = await sequelize.transaction();

    try {
      const normalizedParentData = {
        ...parentData,
        pan_number: parentData?.pan_number ? normalizeValue(parentData.pan_number) : parentData?.pan_number
      };
      const normalizedPersonData = {
        ...personData,
        first_name: normalizeValue(personData?.first_name),
        last_name: normalizeValue(personData?.last_name),
        phone: personData?.phone ? normalizeValue(personData.phone) : personData?.phone,
        id_number: personData?.id_number ? normalizeValue(personData.id_number) : personData?.id_number
      };

      const existingParent = await this.findExistingParent(
        normalizedParentData,
        normalizedPersonData,
        userData,
        transaction
      );

      if (existingParent) {
        await this.mergeExistingParent(existingParent, normalizedParentData, normalizedPersonData, transaction);
        await transaction.commit();
        return await this.findById(existingParent.id);
      }

      let user = null;
      if (userData) user = await User.create(userData, { transaction });

      const person = await Person.create({ ...normalizedPersonData, user_id: user?.id }, { transaction });
      const parent = await Parent.create({ ...normalizedParentData, person_id: person.id }, { transaction });

      await transaction.commit();
      return await this.findById(parent.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id, parentData, personData) {
    const { sequelize } = require('../../../config/database');
    const transaction = await sequelize.transaction();

    try {
      const parent = await Parent.findByPk(id, {
        include: [{ model: Person, as: 'person' }],
        transaction
      });

      if (!parent) throw new AppError('Parent not found', 404);

      await parent.update(parentData, { transaction });
      if (personData && parent.person) {
        await parent.person.update(personData, { transaction });
      }

      await transaction.commit();
      return await this.findById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async delete(id) {
    const parent = await Parent.findByPk(id);
    if (!parent) throw new AppError('Parent not found', 404);
    await parent.destroy();
    return { message: 'Parent deleted successfully' };
  }
}

module.exports = new ParentRepository();
