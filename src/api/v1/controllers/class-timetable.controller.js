const classTimetableService = require('../services/class-timetable.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, parsePositiveInt } = require('../utils/context');

class ClassTimetableController {
  /**
   * GET /class-timetable
   * List timetable entries (optionally filter by class_id, section_id, day_of_week)
   */
  getEntries = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const params = {
      classId: parsePositiveInt(req.query.class_id),
      sectionId: parsePositiveInt(req.query.section_id)
    };

    const data = await classTimetableService.getByClassSection(params, { schoolId });
    return success(res, data, 'Timetable entries retrieved successfully');
  });

  /**
   * POST /class-timetable
   * Create a new timetable entry
   */
  createEntry = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await classTimetableService.createEntry(req.body, { schoolId });
    return success(res, data, 'Timetable entry created successfully', 201);
  });

  /**
   * PUT /class-timetable/:id
   * Update a timetable entry
   */
  updateEntry = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await classTimetableService.updateEntry(req.params.id, req.body, { schoolId });
    return success(res, data, 'Timetable entry updated successfully');
  });

  /**
   * DELETE /class-timetable/:id
   * Soft-delete a timetable entry
   */
  deleteEntry = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    await classTimetableService.deleteEntry(req.params.id, { schoolId });
    return success(res, null, 'Timetable entry deleted successfully');
  });

  /**
   * PATCH /class-timetable/:id/change-teacher
   * Change teacher for an existing entry
   */
  changeTeacher = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await classTimetableService.changeTeacher(
      req.params.id, req.body.teacher_id, { schoolId }
    );
    return success(res, data, 'Teacher changed successfully');
  });

  /**
   * GET /class-timetable/teacher-workload
   * Admin dashboard: teacher workload summary
   */
  getTeacherWorkload = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await classTimetableService.getTeacherWorkload({ schoolId });
    return success(res, data, 'Teacher workload retrieved successfully');
  });

  /**
   * GET /class-timetable/teacher-workload/:teacherId
   * Admin: detailed workload for a specific teacher
   */
  getTeacherWorkloadDetail = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const teacherId = parsePositiveInt(req.params.teacherId);
    const data = await classTimetableService.getTeacherWorkloadDetail(teacherId, { schoolId });
    return success(res, data, 'Teacher workload detail retrieved successfully');
  });

  /**
   * GET /class-timetable/periods
   * Get timetable periods (optionally filter by academic_year_id)
   */
  getPeriods = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const academicYearId = parsePositiveInt(req.query.academic_year_id);
    const data = await classTimetableService.getTimetablePeriods(academicYearId, { schoolId });
    return success(res, data, 'Timetable periods retrieved successfully');
  });
}

module.exports = new ClassTimetableController();
