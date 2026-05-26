/**
 * Unit Tests for Exam Controller
 */

jest.mock('../../../../../src/api/v1/services/exam.service', () => ({
  getExams: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const examController = require('../../../../../src/api/v1/controllers/exam.controller');
const examService = require('../../../../../src/api/v1/services/exam.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ExamController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getExams', () => {
    it('should retrieve exams filtered by academic year', async () => {
      req.query = { academicYearId: '2' };
      const exams = [{ id: 1, name: 'Mid Term' }];
      examService.getExams.mockResolvedValue(exams);

      await examController.getExams(req, res, next);

      expect(ensureSchoolContext).toHaveBeenCalledWith(req);
      expect(examService.getExams).toHaveBeenCalledWith(
        { academicYearId: '2' }, { schoolId: 1 }
      );
      expect(success).toHaveBeenCalledWith(res, exams, 'Exams retrieved successfully', 200);
    });

    it('should propagate errors', async () => {
      req.query = {};
      examService.getExams.mockRejectedValue(new Error('DB error'));

      await examController.getExams(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
