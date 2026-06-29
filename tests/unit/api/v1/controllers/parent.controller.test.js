/**
 * Unit Tests for Parent Controller
 */

jest.mock('../../../../../src/api/v1/services/parent.service', () => ({
  getParents: jest.fn(),
  getParentById: jest.fn(),
  createParent: jest.fn(),
  linkStudentToParent: jest.fn(),
  updateParent: jest.fn(),
  deleteParent: jest.fn(),
  syncStudentLinks: jest.fn()
}));
jest.mock('../../../../../src/api/v1/services/photo-storage.service', () => ({
  uploadPhoto: jest.fn(),
  uploadDocument: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn(),
  resolveSchoolIdFromRequest: jest.fn()
}));

const parentController = require('../../../../../src/api/v1/controllers/parent.controller');
const parentService = require('../../../../../src/api/v1/services/parent.service');
const photoStorageService = require('../../../../../src/api/v1/services/photo-storage.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ParentController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getParents', () => {
    it('should retrieve parents with pagination', async () => {
      req.query = { page: '1', limit: '10', search: 'Smith' };
      const payload = { parents: [{ id: 1 }], total: 1 };
      parentService.getParents.mockResolvedValue(payload);

      await parentController.getParents(req, res, next);

      expect(parentService.getParents).toHaveBeenCalledWith({ page: '1', limit: '10', search: 'Smith', studentId: undefined }, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, payload, 'Parents retrieved successfully', 200);
    });
  });

  describe('getParentById', () => {
    it('should retrieve parent by ID', async () => {
      req.params = { id: '5' };
      parentService.getParentById.mockResolvedValue({ id: 5 });

      await parentController.getParentById(req, res, next);

      expect(parentService.getParentById).toHaveBeenCalledWith('5', { schoolId: 1 });
    });
  });

  describe('createParent', () => {
    it('should create parent with file uploads', async () => {
      req.files = { photo: [{ originalname: 'photo.jpg' }] };
      req.body = { person: { first_name: 'Jane' } };
      photoStorageService.uploadPhoto.mockResolvedValue('http://cdn/photo.jpg');
      parentService.createParent.mockResolvedValue({ id: 1 });

      await parentController.createParent(req, res, next);

      expect(ensureSchoolContext).toHaveBeenCalledWith(req);
      expect(photoStorageService.uploadPhoto).toHaveBeenCalled();
      expect(parentService.createParent).toHaveBeenCalledWith(expect.objectContaining({
        person: expect.objectContaining({ photo_url: 'http://cdn/photo.jpg' })
      }));
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Parent created successfully', 201);
    });
  });

  describe('linkStudent', () => {
    it('should link student to parent', async () => {
      req.params = { id: '1', studentId: '5' };
      req.body = { relationship: 'father' };
      parentService.linkStudentToParent.mockResolvedValue({ linked: true });

      await parentController.linkStudent(req, res, next);

      expect(parentService.linkStudentToParent).toHaveBeenCalledWith('1', '5', { relationship: 'father' }, { schoolId: 1 });
    });
  });

  describe('updateParent', () => {
    it('should update parent', async () => {
      req.params = { id: '1' };
      req.body = { person: { first_name: 'Updated' } };
      parentService.updateParent.mockResolvedValue({ id: 1 });

      await parentController.updateParent(req, res, next);

      expect(parentService.updateParent).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('deleteParent', () => {
    it('should delete parent', async () => {
      req.params = { id: '1' };
      parentService.deleteParent.mockResolvedValue(true);

      await parentController.deleteParent(req, res, next);

      expect(parentService.deleteParent).toHaveBeenCalledWith('1', { schoolId: 1 });
    });
  });

  describe('syncStudentLinks', () => {
    it('should sync with dryRun', async () => {
      req.body = { dryRun: true };
      parentService.syncStudentLinks.mockResolvedValue({ preview: [] });

      await parentController.syncStudentLinks(req, res, next);

      expect(parentService.syncStudentLinks).toHaveBeenCalledWith({ schoolId: 1, dryRun: true });
      expect(success).toHaveBeenCalledWith(res, { preview: [] }, 'Parent-student link sync preview generated', 200);
    });

    it('should sync without dryRun', async () => {
      req.body = { dryRun: false };
      parentService.syncStudentLinks.mockResolvedValue({ synced: 5 });

      await parentController.syncStudentLinks(req, res, next);

      expect(parentService.syncStudentLinks).toHaveBeenCalledWith({ schoolId: 1, dryRun: false });
      expect(success).toHaveBeenCalledWith(res, { synced: 5 }, 'Parent-student links synchronized successfully', 200);
    });
  });
});
