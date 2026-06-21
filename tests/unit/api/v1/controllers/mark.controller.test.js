/**
 * Unit Tests for Mark Controller (uses req.user.schoolId directly)
 */

jest.mock('../../../../../src/api/v1/services/mark.service', () => ({
  getMarks: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const markController = require('../../../../../src/api/v1/controllers/mark.controller');
const markService = require('../../../../../src/api/v1/services/mark.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('MarkController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    req.user = { id: 1, roleName: 'teacher', schoolId: 1 };
  });

  describe('getMarks', () => {
    it('should retrieve marks with school context from user', async () => {
      req.body = { classId: 3, sectionId: 1, examId: 2 };
      const result = [{ studentId: 1, marks: 85 }];
      markService.getMarks.mockResolvedValue(result);

      await markController.getMarks(req, res, next);

      expect(markService.getMarks).toHaveBeenCalledWith(req.body, {
        schoolId: 1, userId: 1, roleName: 'teacher'
      });
      expect(success).toHaveBeenCalledWith(res, { userData: result }, 'Marks retrieved successfully', 200);
    });

    it('should default schoolId to 1 when user has no schoolId', async () => {
      req.user = { id: 2, roleName: 'admin' };
      req.body = {};
      markService.getMarks.mockResolvedValue([]);

      await markController.getMarks(req, res, next);

      expect(markService.getMarks).toHaveBeenCalledWith({}, expect.objectContaining({ schoolId: 1 }));
    });

    it('should propagate errors', async () => {
      req.body = {};
      markService.getMarks.mockRejectedValue(new Error('DB error'));

      await markController.getMarks(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
