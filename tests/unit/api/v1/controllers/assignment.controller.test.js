jest.mock('../../../../../src/api/v1/services/assignment.service', () => ({
  listAssignments: jest.fn(),
  getAssignmentById: jest.fn(),
  createAssignment: jest.fn(),
  updateAssignment: jest.fn(),
  deleteAssignment: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const assignmentController = require('../../../../../src/api/v1/controllers/assignment.controller');
const assignmentService = require('../../../../../src/api/v1/services/assignment.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse } = require('../../../../helpers/testUtils');

describe('AssignmentController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    success.mockReturnValue(res);
  });

  it('lists assignments for the authenticated user scope', async () => {
    const payload = { assignments: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    req.query = { page: '1', limit: '10' };
    req.user = { id: 17, roleName: 'student', schoolId: 5 };
    assignmentService.listAssignments.mockResolvedValue(payload);

    await assignmentController.listAssignments(req, res);

    expect(assignmentService.listAssignments).toHaveBeenCalledWith({
      schoolId: 5,
      userId: 17,
      roleName: 'student',
      page: '1',
      limit: '10',
      class_id: undefined,
      section_id: undefined
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Assignments retrieved successfully', 200);
  });

  it('gets a single assignment using authenticated scope', async () => {
    const payload = { id: 81, title: 'English Reading' };
    req.params = { id: '81' };
    req.user = { id: 25, roleName: 'parent', schoolId: 5 };
    assignmentService.getAssignmentById.mockResolvedValue(payload);

    await assignmentController.getAssignmentById(req, res);

    expect(assignmentService.getAssignmentById).toHaveBeenCalledWith({
      id: '81',
      schoolId: 5,
      userId: 25,
      roleName: 'parent'
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Assignment retrieved successfully', 200);
  });

  it('creates an assignment for the authenticated teacher', async () => {
    const payload = { id: 201, title: 'Daily Maths' };
    req.user = { id: 11, roleName: 'teacher', schoolId: 8 };
    req.body = {
      class_id: 4,
      section_id: 2,
      subject_id: 9,
      title: 'Daily Maths',
      description: 'Practice fractions',
      due_date: '2026-04-05',
      instructions: 'Write all answers in the notebook'
    };
    assignmentService.createAssignment.mockResolvedValue(payload);

    await assignmentController.createAssignment(req, res);

    expect(assignmentService.createAssignment).toHaveBeenCalledWith({
      schoolId: 8,
      userId: 11,
      class_id: 4,
      section_id: 2,
      subject_id: 9,
      title: 'Daily Maths',
      description: 'Practice fractions',
      assignment_type: undefined,
      max_marks: undefined,
      weightage_percentage: undefined,
      assigned_date: undefined,
      due_date: '2026-04-05',
      allow_late_submission: undefined,
      late_submission_penalty_percent: undefined,
      attachment_url: undefined,
      instructions: 'Write all answers in the notebook'
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Assignment created successfully', 201);
  });

  it('updates an assignment for the authenticated teacher', async () => {
    const payload = { id: 201, title: 'Updated Daily Maths' };
    req.params = { id: '201' };
    req.user = { id: 11, roleName: 'teacher', schoolId: 8 };
    req.body = {
      title: 'Updated Daily Maths',
      due_date: '2026-04-06',
    };
    assignmentService.updateAssignment.mockResolvedValue(payload);

    await assignmentController.updateAssignment(req, res);

    expect(assignmentService.updateAssignment).toHaveBeenCalledWith({
      id: '201',
      schoolId: 8,
      userId: 11,
      title: 'Updated Daily Maths',
      due_date: '2026-04-06',
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Assignment updated successfully', 200);
  });

  it('deletes an assignment for the authenticated teacher', async () => {
    const payload = { id: 201, deleted: true };
    req.params = { id: '201' };
    req.user = { id: 11, roleName: 'teacher', schoolId: 8 };
    assignmentService.deleteAssignment.mockResolvedValue(payload);

    await assignmentController.deleteAssignment(req, res);

    expect(assignmentService.deleteAssignment).toHaveBeenCalledWith({
      id: '201',
      schoolId: 8,
      userId: 11,
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Assignment deleted successfully', 200);
  });
});