const teacherRepository = require('../repositories/teacher.repository');
const { AppError } = require('../../../middleware/error.middleware');

const parseIntOrNull = (value) => {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Teacher Service
 */

class TeacherService {
  serializeTeacher(teacher) {
    if (!teacher) {
      return null;
    }

    const person = teacher.person || {};
    const branch = teacher.branch || {};
    const normalizedGender =
      person.gender && person.gender !== 'prefer_not_to_say' ? person.gender : 'other';

    return {
      id: teacher.id,
      personId: teacher.person_id,
      employeeId: teacher.employee_id,
      joinDate: teacher.join_date || teacher.joining_date || null,
      designation: teacher.designation || null,
      qualification: teacher.qualification || null,
      experienceYears: teacher.experience_years ? Number(teacher.experience_years) : null,
      status: teacher.status || 'inactive',
      salary: teacher.salary ? Number(teacher.salary) : null,
      branchId: teacher.branch_id || null,
      firstName: person.first_name || '',
      lastName: person.last_name || '',
      middleName: person.middle_name || null,
      gender: normalizedGender,
      dateOfBirth: person.date_of_birth || null,
      bloodGroup: person.blood_group || null,
      phone: person.phone || null,
      email: person.email || person.user?.email || null,
      addressLine1: person.address_line1 || null,
      addressLine2: person.address_line2 || null,
      city: person.city || null,
      state: person.state || null,
      postalCode: person.postal_code || null,
      country: person.country || null,
      photo: person.photo_url || null,
      aadharUrl: person.aadhar_url || null,
      panUrl: person.pan_url || null,
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            code: branch.code || null
          }
        : null
    };
  }

  resolveSchoolId(payload, context = {}) {
    if (context?.schoolId) {
      return context.schoolId;
    }

    const candidate =
      payload?.teacher?.school_id ??
      payload?.teacher?.schoolId ??
      payload?.school_id ??
      payload?.schoolId;

    const parsedCandidate = parseIntOrNull(candidate);
    if (parsedCandidate) {
      return parsedCandidate;
    }

    const envDefault = process.env.DEFAULT_SCHOOL_ID
      ? parseInt(process.env.DEFAULT_SCHOOL_ID, 10)
      : null;

    if (envDefault) {
      return envDefault;
    }

    throw new AppError('School context is required', 400);
  }

  normalizeBranchId(value) {
    const parsed = parseIntOrNull(value);
    return parsed || null;
  }

  async getTeachers(filters = {}, context = {}) {
    const schoolId = context.isSuperAdmin
      ? (filters.schoolId || null)
      : this.resolveSchoolId(filters, context);

    const result = await teacherRepository.findAll({
      ...filters,
      schoolId
    });

    const { teachers, ...rest } = result;

    return {
      ...rest,
      limit: parseInt(filters.limit, 10) || filters.limit || 10,
      teachers: (teachers || []).map((teacher) => this.serializeTeacher(teacher)).filter(Boolean)
    };
  }

  async getTeacherById(id, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    const teacher = await teacherRepository.findById(id, { schoolId });
    return this.serializeTeacher(teacher);
  }

  async getTeacherByEmployeeId(employeeId, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    const teacher = await teacherRepository.findByEmployeeId(employeeId, { schoolId });
    
    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }
    
    return teacher;
  }

  async createTeacher(data, context = {}) {
    const { teacher, person, user } = data;
    const schoolId = this.resolveSchoolId(data, context);
    const branchId = this.normalizeBranchId(teacher?.branch_id);

    const existing = await teacherRepository.findByEmployeeId(teacher.employee_id, {
      schoolId
    });
    
    if (existing) {
      throw new AppError('Employee ID already exists', 409);
    }

    if (!person.first_name || !person.last_name || !person.date_of_birth || !person.gender) {
      throw new AppError('Person details are incomplete', 400);
    }

    if (!teacher.join_date) {
      throw new AppError('Teacher details are incomplete', 400);
    }

    const normalizedTeacher = {
      ...teacher,
      school_id: schoolId,
      branch_id: branchId ?? teacher.branch_id ?? null
    };

    const normalizedUser = user
      ? {
          ...user,
          school_id: schoolId
        }
      : null;

    const createdTeacher = await teacherRepository.create(normalizedTeacher, person, normalizedUser);
    return this.serializeTeacher(createdTeacher);
  }

  async updateTeacher(id, data, context = {}) {
    const { teacher, person } = data;
    const schoolId = this.resolveSchoolId(data, context);

    if (teacher?.employee_id) {
      const existing = await teacherRepository.findByEmployeeId(teacher.employee_id, {
        schoolId
      });
      
      if (existing && String(existing.id) !== String(id)) {
        throw new AppError('Employee ID already exists', 409);
      }
    }

    if (teacher?.branch_id) {
      teacher.branch_id = this.normalizeBranchId(teacher.branch_id);
    }

    const updatedTeacher = await teacherRepository.update(id, teacher, person, { schoolId });
    return this.serializeTeacher(updatedTeacher);
  }

  async deleteTeacher(id, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    return await teacherRepository.delete(id, { schoolId });
  }
}

module.exports = new TeacherService();
