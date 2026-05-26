/**
 * Unit Tests for Academic Year Controller
 */

jest.mock('../../../../../src/api/v1/services/academic-year.service', () => ({
  getAcademicYears: jest.fn(),
  getCurrentAcademicYear: jest.fn(),
  createAcademicYear: jest.fn(),
  updateAcademicYear: jest.fn(),
  setCurrentAcademicYear: jest.fn(),
  createMigrationDraft: jest.fn(),
  finalizeMigration: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const academicYearController = require('../../../../../src/api/v1/controllers/academic-year.controller');
const academicYearService = require('../../../../../src/api/v1/services/academic-year.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('AcademicYearController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getAcademicYears', () => {
    it('should retrieve academic years with pagination', async () => {
      req.query = { page: '1', limit: '10' };
      const payload = { years: [{ id: 1, name: '2025-2026' }] };
      academicYearService.getAcademicYears.mockResolvedValue(payload);

      await academicYearController.getAcademicYears(req, res, next);

      expect(academicYearService.getAcademicYears).toHaveBeenCalledWith(
        { page: '1', limit: '10' },
        { schoolId: 1 }
      );
      expect(success).toHaveBeenCalledWith(res, payload, 'Academic years retrieved successfully', 200);
    });

    it('should filter by isCurrent flag', async () => {
      req.query = { isCurrent: 'true' };
      academicYearService.getAcademicYears.mockResolvedValue({ years: [] });

      await academicYearController.getAcademicYears(req, res, next);

      expect(academicYearService.getAcademicYears).toHaveBeenCalledWith(
        expect.objectContaining({ isCurrent: true }),
        { schoolId: 1 }
      );
    });
  });

  describe('createAcademicYear', () => {
    it('should create academic year with valid date range', async () => {
      req.body = { name: '2026-2027', start_date: '2026-04-01', end_date: '2027-03-31' };
      academicYearService.createAcademicYear.mockResolvedValue({ id: 2, name: '2026-2027' });

      await academicYearController.createAcademicYear(req, res, next);

      expect(academicYearService.createAcademicYear).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Academic year created successfully', 201);
    });

    it('should reject duplicate academic year names', async () => {
      req.body = { name: '2025-2026' };
      academicYearService.createAcademicYear.mockRejectedValue(new Error('Academic year already exists'));

      await academicYearController.createAcademicYear(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateAcademicYear', () => {
    it('should update academic year', async () => {
      req.params = { id: '1' };
      req.body = { name: '2025-2026 Updated' };
      academicYearService.updateAcademicYear.mockResolvedValue({ id: 1 });

      await academicYearController.updateAcademicYear(req, res, next);

      expect(academicYearService.updateAcademicYear).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('setCurrentAcademicYear', () => {
    it('should set current academic year', async () => {
      req.params = { id: '2' };
      academicYearService.setCurrentAcademicYear.mockResolvedValue({ id: 2, is_current: true });

      await academicYearController.setCurrentAcademicYear(req, res, next);

      expect(academicYearService.setCurrentAcademicYear).toHaveBeenCalledWith('2', { schoolId: 1 });
    });
  });

  describe('finalizeMigration', () => {
    it('should finalize migration with userId', async () => {
      req.body = { targetYearId: 2 };
      academicYearService.finalizeMigration.mockResolvedValue({ migrated: true });

      await academicYearController.finalizeMigration(req, res, next);

      expect(academicYearService.finalizeMigration).toHaveBeenCalledWith(req.body, {
        schoolId: 1, userId: 1
      });
    });
  });
});
