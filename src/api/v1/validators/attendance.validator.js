const { body } = require('express-validator');

const getAttendanceValidator = [
  body('sclass').optional(),
  body('section').optional(),
  body('studentId').optional().isInt({ min: 1 }).withMessage('Student id must be a positive integer'),
  body('childId').optional().isInt({ min: 1 }).withMessage('Child id must be a positive integer'),
  body('attendenncemonth').notEmpty().withMessage('Month is required')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12')
];

const saveAttendanceValidator = [
  body('sclass').optional().notEmpty().withMessage('Class is required'),
  body('classId').optional().notEmpty().withMessage('Class is required'),
  body('section').optional().notEmpty().withMessage('Section is required'),
  body('sectionId').optional().notEmpty().withMessage('Section is required'),
  body('attendenncemonth').optional()
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('adate').optional().isISO8601().withMessage('Date must be a valid ISO date'),
  body('sessionhours').optional().notEmpty().withMessage('Session is required'),
  body('students').optional().isArray({ min: 1 }).withMessage('Students array is required'),
  body().custom((value) => {
    const hasClass = Boolean(value?.classId || value?.sclass);
    const hasSection = Boolean(value?.sectionId || value?.section);
    const hasMonthOrDate = Boolean(value?.attendenncemonth || value?.adate);
    const hasStudents = Array.isArray(value?.students) && value.students.length > 0;
    const hasAttendanceMap = value?.attendance && typeof value.attendance === 'object' && Object.keys(value.attendance).length > 0;

    if (!hasClass) {
      throw new Error('Class is required');
    }

    if (!hasSection) {
      throw new Error('Section is required');
    }

    if (!hasMonthOrDate) {
      throw new Error('Month or date is required');
    }

    if (!hasStudents && !hasAttendanceMap) {
      throw new Error('Students array is required');
    }

    return true;
  })
];

module.exports = {
  getAttendanceValidator,
  saveAttendanceValidator
};
