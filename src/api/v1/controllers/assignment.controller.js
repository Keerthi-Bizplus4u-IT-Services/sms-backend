const assignmentService = require('../services/assignment.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, resolveSchoolIdFromRequest } = require('../utils/context');

class AssignmentController {
  resolveScope = (req) => ({
    schoolId: resolveSchoolIdFromRequest(req),
    userId: req.user?.id,
    roleName: req.user?.roleName || req.user?.role || null
  });

  listAssignments = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await assignmentService.listAssignments({
      schoolId: ensureSchoolContext(req),
      userId: scope.userId,
      roleName: scope.roleName,
      page: req.query.page,
      limit: req.query.limit,
      class_id: req.query.class_id,
      section_id: req.query.section_id
    });

    return success(res, result, 'Assignments retrieved successfully', 200);
  });

  getAssignmentById = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await assignmentService.getAssignmentById({
      id: req.params.id,
      schoolId: ensureSchoolContext(req),
      userId: scope.userId,
      roleName: scope.roleName
    });

    return success(res, result, 'Assignment retrieved successfully', 200);
  });

  createAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.createAssignment({
      schoolId: ensureSchoolContext(req),
      userId: req.user?.id,
      class_id: req.body.class_id,
      section_id: req.body.section_id,
      subject_id: req.body.subject_id,
      title: req.body.title,
      description: req.body.description,
      assignment_type: req.body.assignment_type,
      max_marks: req.body.max_marks,
      weightage_percentage: req.body.weightage_percentage,
      assigned_date: req.body.assigned_date,
      due_date: req.body.due_date,
      allow_late_submission: req.body.allow_late_submission,
      late_submission_penalty_percent: req.body.late_submission_penalty_percent,
      attachment_url: req.body.attachment_url,
      instructions: req.body.instructions
    });

    return success(res, result, 'Assignment created successfully', 201);
  });

  updateAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.updateAssignment({
      id: req.params.id,
      schoolId: ensureSchoolContext(req),
      userId: req.user?.id,
      class_id: req.body.class_id,
      section_id: req.body.section_id,
      subject_id: req.body.subject_id,
      title: req.body.title,
      description: req.body.description,
      assignment_type: req.body.assignment_type,
      max_marks: req.body.max_marks,
      weightage_percentage: req.body.weightage_percentage,
      assigned_date: req.body.assigned_date,
      due_date: req.body.due_date,
      allow_late_submission: req.body.allow_late_submission,
      late_submission_penalty_percent: req.body.late_submission_penalty_percent,
      attachment_url: req.body.attachment_url,
      instructions: req.body.instructions
    });

    return success(res, result, 'Assignment updated successfully', 200);
  });

  deleteAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.deleteAssignment({
      id: req.params.id,
      schoolId: ensureSchoolContext(req),
      userId: req.user?.id
    });

    return success(res, result, 'Assignment deleted successfully', 200);
  });
}

module.exports = new AssignmentController();