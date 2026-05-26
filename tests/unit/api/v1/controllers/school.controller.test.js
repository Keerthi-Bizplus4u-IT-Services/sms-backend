/**
 * Unit Tests for School Controller
 * Note: This controller uses object pattern with try/catch instead of class + asyncHandler
 */

jest.mock('../../../../../src/api/v1/services/school.service');
jest.mock('../../../../../src/utils/response');

const schoolController = require('../../../../../src/api/v1/controllers/school.controller');
const { schoolService, schoolBranchService } = require('../../../../../src/api/v1/services/school.service');
const { success, created } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('SchoolController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    created.mockReturnValue(res);
  });

  describe('listSchools', () => {
    it('should retrieve all schools', async () => {
      req.query = {};
      const schools = [{ id: 1, name: 'School A' }];
      schoolService.listSchools.mockResolvedValue(schools);

      await schoolController.listSchools(req, res, next);

      expect(schoolService.listSchools).toHaveBeenCalledWith({ includeInactive: false });
      expect(success).toHaveBeenCalledWith(res, schools, 'Schools retrieved successfully');
    });

    it('should include inactive schools when requested', async () => {
      req.query = { includeInactive: 'true' };
      schoolService.listSchools.mockResolvedValue([]);

      await schoolController.listSchools(req, res, next);

      expect(schoolService.listSchools).toHaveBeenCalledWith({ includeInactive: true });
    });

    it('should call next on error', async () => {
      req.query = {};
      const err = new Error('DB error');
      schoolService.listSchools.mockRejectedValue(err);

      await schoolController.listSchools(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getSchool', () => {
    it('should retrieve a school by ID', async () => {
      req.params = { id: '1' };
      schoolService.getSchoolById.mockResolvedValue({ id: 1, name: 'School A' });

      await schoolController.getSchool(req, res, next);

      expect(schoolService.getSchoolById).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'School retrieved successfully');
    });

    it('should call next on not-found', async () => {
      req.params = { id: '999' };
      schoolService.getSchoolById.mockRejectedValue(new Error('Not found'));

      await schoolController.getSchool(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createSchool', () => {
    it('should create a school', async () => {
      req.body = { name: 'New School', code: 'NS001' };
      schoolService.createSchool.mockResolvedValue({ id: 2, name: 'New School' });

      await schoolController.createSchool(req, res, next);

      expect(schoolService.createSchool).toHaveBeenCalledWith(req.body);
      expect(created).toHaveBeenCalledWith(res, expect.any(Object), 'School created successfully');
    });

    it('should propagate duplicate error', async () => {
      req.body = { name: 'Existing', code: 'EX001' };
      schoolService.createSchool.mockRejectedValue(new Error('School code already exists'));

      await schoolController.createSchool(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createSchoolOnboarding', () => {
    it('should complete school onboarding', async () => {
      req.body = { name: 'School', code: 'SCH', admin_email: 'admin@school.com' };
      schoolService.createSchoolOnboarding.mockResolvedValue({ school: { id: 1 }, admin: { id: 1 } });

      await schoolController.createSchoolOnboarding(req, res, next);

      expect(schoolService.createSchoolOnboarding).toHaveBeenCalledWith(req.body);
      expect(created).toHaveBeenCalledWith(res, expect.any(Object), 'School onboarding completed successfully');
    });
  });

  describe('updateSchool', () => {
    it('should update a school', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated School' };
      schoolService.updateSchool.mockResolvedValue({ id: 1, name: 'Updated School' });

      await schoolController.updateSchool(req, res, next);

      expect(schoolService.updateSchool).toHaveBeenCalledWith('1', req.body);
    });
  });

  describe('deleteSchool', () => {
    it('should delete a school', async () => {
      req.params = { id: '1' };
      schoolService.deleteSchool.mockResolvedValue();

      await schoolController.deleteSchool(req, res, next);

      expect(schoolService.deleteSchool).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(res, null, 'School deleted successfully');
    });
  });

  describe('listBranches', () => {
    it('should list branches for a school', async () => {
      req.params = { id: '1' };
      const branches = [{ id: 1, name: 'Main Branch' }];
      schoolBranchService.listBranches.mockResolvedValue(branches);

      await schoolController.listBranches(req, res, next);

      expect(schoolBranchService.listBranches).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(res, branches, 'Branches retrieved successfully');
    });
  });

  describe('createBranch', () => {
    it('should create a branch', async () => {
      req.params = { id: '1' };
      req.body = { name: 'New Branch', address: '123 Street' };
      schoolBranchService.createBranch.mockResolvedValue({ id: 2, name: 'New Branch' });

      await schoolController.createBranch(req, res, next);

      expect(schoolBranchService.createBranch).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Branch', school_id: '1' })
      );
      expect(created).toHaveBeenCalledWith(res, expect.any(Object), 'Branch created successfully');
    });
  });

  describe('getSchoolSettings', () => {
    it('should retrieve school settings', async () => {
      req.params = { id: '1' };
      const settings = { smtp_host: 'smtp.example.com' };
      schoolService.getSchoolSettings.mockResolvedValue(settings);

      await schoolController.getSchoolSettings(req, res, next);

      expect(schoolService.getSchoolSettings).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(res, settings, 'School settings retrieved successfully');
    });
  });

  describe('updateSchoolSettings', () => {
    it('should update school settings', async () => {
      req.params = { id: '1' };
      req.body = { smtp_host: 'new-smtp.example.com' };
      schoolService.updateSchoolSettings.mockResolvedValue({ smtp_host: 'new-smtp.example.com' });

      await schoolController.updateSchoolSettings(req, res, next);

      expect(schoolService.updateSchoolSettings).toHaveBeenCalledWith('1', req.body);
    });
  });

  describe('cloneSchoolSettings', () => {
    it('should clone settings from source school', async () => {
      req.params = { id: '2' };
      req.body = { source_school_id: 1, clone_scopes: ['classes', 'sections'] };
      schoolService.cloneSchoolSettings.mockResolvedValue({ cloned: true });

      await schoolController.cloneSchoolSettings(req, res, next);

      expect(schoolService.cloneSchoolSettings).toHaveBeenCalledWith('2', 1, ['classes', 'sections']);
    });
  });

  describe('importDummyData', () => {
    it('should import dummy data for the selected school', async () => {
      req.params = { id: '1' };
      schoolService.importDummyData.mockResolvedValue({
        school_id: 1,
        imported: { classes: 10, subjects: 10 }
      });

      await schoolController.importDummyData(req, res, next);

      expect(schoolService.importDummyData).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ school_id: 1 }),
        'Dummy data imported successfully'
      );
    });

    it('should call next when import dummy data fails', async () => {
      req.params = { id: '1' };
      const err = new Error('Import failed');
      schoolService.importDummyData.mockRejectedValue(err);

      await schoolController.importDummyData(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('deleteDummyData', () => {
    it('should delete imported dummy data for the selected school', async () => {
      req.params = { id: '1' };
      schoolService.deleteDummyData.mockResolvedValue({
        school_id: 1,
        deleted: { classes: 10, subjects: 10 }
      });

      await schoolController.deleteDummyData(req, res, next);

      expect(schoolService.deleteDummyData).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ school_id: 1 }),
        'Dummy data deleted successfully'
      );
    });

    it('should call next when delete dummy data fails', async () => {
      req.params = { id: '1' };
      const err = new Error('Delete failed');
      schoolService.deleteDummyData.mockRejectedValue(err);

      await schoolController.deleteDummyData(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
