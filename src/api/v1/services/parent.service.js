const parentRepository = require('../repositories/parent.repository');
const { AppError } = require('../../../middleware/error.middleware');

class ParentService {
  normalizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return undefined;
  }

  serializeParent(parent) {
    if (!parent) {
      return null;
    }

    const person = parent.person || {};
    const user = person.user || {};
    const normalizedGender =
      person.gender && person.gender !== 'prefer_not_to_say' ? person.gender : 'other';

    return {
      id: parent.id,
      personId: parent.person_id,
      relationshipType: parent.relationship_type || null,
      occupation: parent.occupation || null,
      annualIncome: parent.annual_income ? Number(parent.annual_income) : null,
      officeAddress: parent.office_address || null,
      officePhone: parent.office_phone || null,
      employerName: parent.employer_name || null,
      panNumber: parent.pan_number || null,
      firstName: person.first_name || '',
      lastName: person.last_name || '',
      middleName: person.middle_name || null,
      gender: normalizedGender,
      dateOfBirth: person.date_of_birth || null,
      bloodGroup: person.blood_group || null,
      phone: person.phone || parent.office_phone || null,
      email: user.email || person.email || null,
      addressLine1: person.address_line1 || person.address || null,
      addressLine2: person.address_line2 || null,
      city: person.city || null,
      state: person.state || null,
      postalCode: person.postal_code || person.pincode || null,
      country: person.country || null,
      photo: person.photo_url || null,
      aadharUrl: person.aadhar_url || null,
      panUrl: person.pan_url || null,
      fatherName: person.father_name || null,
      fatherPhone: person.father_phone || null,
      fatherEmail: person.father_email || null,
      motherName: person.mother_name || null,
      motherPhone: person.mother_phone || null,
      motherEmail: person.mother_email || null,
      studentNames: (() => {
        const names = parent.getDataValue ? parent.getDataValue('student_names') : parent.student_names;
        return Array.isArray(names) ? names : [];
      })()
    };
  }

  async getParents(filters, context = {}) {
    const result = await parentRepository.findAll({
      ...filters,
      schoolId: context.schoolId || null
    });
    const { parents, ...rest } = result;

    return {
      ...rest,
      parents: (parents || []).map((parent) => this.serializeParent(parent)).filter(Boolean)
    };
  }

  async getParentById(id, context = {}) {
    const parent = await parentRepository.findById(id, context.schoolId || null);
    return this.serializeParent(parent);
  }

  async createParent(data) {
    const { parent, person, user } = data;

    if (!person.first_name || !person.last_name || !person.date_of_birth || !person.gender) {
      throw new AppError('Person details are incomplete', 400);
    }

    if (!parent || !parent.relationship_type) {
      throw new AppError('Relationship type is required', 400);
    }

    const createdParent = await parentRepository.create(parent, person, user);
    return this.serializeParent(createdParent);
  }

  async linkStudentToParent(parentId, studentId, data, context = {}) {
    const relationshipType = data?.relationship_type ?? data?.relationshipType;

    if (!relationshipType) {
      throw new AppError('Relationship type is required', 400);
    }

    const linkedParent = await parentRepository.linkStudent(
      parentId,
      studentId,
      {
        relationship_type: relationshipType,
        is_primary_contact: this.normalizeBoolean(data?.is_primary_contact ?? data?.isPrimaryContact),
        is_emergency_contact: this.normalizeBoolean(data?.is_emergency_contact ?? data?.isEmergencyContact)
      },
      context
    );

    return this.serializeParent(linkedParent);
  }

  async updateParent(id, data, context = {}) {
    const { parent, person } = data;
    const updatedParent = await parentRepository.update(id, parent, person, context.schoolId || null);
    return this.serializeParent(updatedParent);
  }

  async deleteParent(id, context = {}) {
    return await parentRepository.delete(id, context.schoolId || null);
  }

  async syncStudentLinks(options = {}) {
    return await parentRepository.syncLegacyStudentLinks(options);
  }
}

module.exports = new ParentService();
