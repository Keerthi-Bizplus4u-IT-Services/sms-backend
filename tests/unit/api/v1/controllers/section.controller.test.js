/**
 * Unit Tests for Section Controller
 */

jest.mock('../../../../../src/api/v1/services/section.service', () => ({
  getSectionsByClass: jest.fn(),
  createSection: jest.fn(),
  updateSection: jest.fn(),
  deleteSection: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const sectionController = require('../../../../../src/api/v1/controllers/section.controller');
const sectionService = require('../../../../../src/api/v1/services/section.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('SectionController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    parsePositiveInt.mockImplementation((v) => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) || n <= 0 ? null : n;
    });
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getSectionsByClass', () => {
    it('should retrieve sections by classId', async () => {
      req.query = { classId: '3' };
      sectionService.getSectionsByClass.mockResolvedValue([{ id: 1, name: 'A' }]);

      await sectionController.getSectionsByClass(req, res, next);

      expect(sectionService.getSectionsByClass).toHaveBeenCalledWith(3, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, [{ id: 1, name: 'A' }], 'Sections retrieved successfully');
    });

    it('should throw error when classId is missing', async () => {
      req.query = {};

      await sectionController.getSectionsByClass(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'classId is required' }));
    });
  });

  describe('createSection', () => {
    it('should create a section', async () => {
      req.body = { name: 'B', class_id: 3 };
      sectionService.createSection.mockResolvedValue({ id: 2, name: 'B' });

      await sectionController.createSection(req, res, next);

      expect(sectionService.createSection).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 2, name: 'B' }, 'Section created successfully', 201);
    });
  });

  describe('updateSection', () => {
    it('should update a section', async () => {
      req.params = { id: '2' };
      req.body = { name: 'Updated' };
      sectionService.updateSection.mockResolvedValue({ id: 2 });

      await sectionController.updateSection(req, res, next);

      expect(sectionService.updateSection).toHaveBeenCalledWith(2, req.body, { schoolId: 1 });
    });

    it('should throw error for invalid section ID', async () => {
      req.params = { id: 'abc' };
      req.body = { name: 'Test' };

      await sectionController.updateSection(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid section ID' }));
    });
  });

  describe('deleteSection', () => {
    it('should delete a section', async () => {
      req.params = { id: '2' };
      sectionService.deleteSection.mockResolvedValue(undefined);

      await sectionController.deleteSection(req, res, next);

      expect(sectionService.deleteSection).toHaveBeenCalledWith(2, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, null, 'Section deleted successfully');
    });
  });
});
