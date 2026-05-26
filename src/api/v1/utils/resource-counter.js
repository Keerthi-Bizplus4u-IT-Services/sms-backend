const { Student, Teacher, Class, SchoolBranch, School } = require('../../../models');
const { Op } = require('sequelize');

/**
 * Resource Counter Utility
 * Counts active resources for a school and compares against plan limits.
 * Shared by trial-limits middleware and subscription status API.
 */

async function getSchoolWithLimits(schoolId) {
  const school = await School.findByPk(schoolId, {
    attributes: ['id', 'subscription_plan', 'max_students', 'max_staff', 'max_classes', 'max_branches', 'trial_started_at', 'trial_ends_at', 'is_trial']
  });
  if (!school) {
    return null;
  }
  return school;
}

async function countActiveStudents(schoolId) {
  return Student.count({
    where: {
      school_id: schoolId,
      status: { [Op.in]: ['active'] }
    }
  });
}

async function countActiveTeachers(schoolId) {
  return Teacher.count({
    where: {
      school_id: schoolId,
      status: { [Op.in]: ['active', 'on_leave'] }
    }
  });
}

async function countClasses(schoolId) {
  return Class.count({
    include: [{
      model: SchoolBranch,
      as: 'branch',
      where: { school_id: schoolId },
      attributes: []
    }]
  });
}

async function countBranches(schoolId) {
  return SchoolBranch.count({
    where: {
      school_id: schoolId,
      is_active: true
    }
  });
}

/**
 * Get full resource usage for a school
 * @param {number} schoolId
 * @returns {{ school: Object, usage: { students: { used, max }, teachers: { used, max }, classes: { used, max }, branches: { used, max } } }}
 */
async function getResourceUsage(schoolId) {
  const school = await getSchoolWithLimits(schoolId);
  if (!school) {
    return null;
  }

  const [studentCount, teacherCount, classCount, branchCount] = await Promise.all([
    countActiveStudents(schoolId),
    countActiveTeachers(schoolId),
    countClasses(schoolId),
    countBranches(schoolId)
  ]);

  return {
    school,
    usage: {
      students: { used: studentCount, max: school.max_students },
      teachers: { used: teacherCount, max: school.max_staff },
      classes: { used: classCount, max: school.max_classes },
      branches: { used: branchCount, max: school.max_branches }
    }
  };
}

module.exports = {
  getSchoolWithLimits,
  countActiveStudents,
  countActiveTeachers,
  countClasses,
  countBranches,
  getResourceUsage
};
