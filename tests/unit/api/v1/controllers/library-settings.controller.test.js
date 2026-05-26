jest.mock('../../../../../src/api/v1/services/library-settings.service', () => ({
  getSettings: jest.fn(),
  upsertSettings: jest.fn(),
  getFineRules: jest.fn(),
  createFineRule: jest.fn(),
  updateFineRule: jest.fn(),
  deleteFineRule: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn()
}));

const libSettingsCtrl = require('../../../../../src/api/v1/controllers/library-settings.controller');
const libSettingsSvc = require('../../../../../src/api/v1/services/library-settings.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('LibrarySettingsController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('getSettings', () => {
    it('should retrieve settings', async () => {
      libSettingsSvc.getSettings.mockResolvedValue({ max_books: 5 });
      await libSettingsCtrl.getSettings(req, res, next);
      expect(libSettingsSvc.getSettings).toHaveBeenCalledWith({ schoolId: 1 });
    });
  });
  describe('upsertSettings', () => {
    it('should update settings', async () => {
      req.body = { max_books: 10 };
      libSettingsSvc.upsertSettings.mockResolvedValue({ max_books: 10 });
      await libSettingsCtrl.upsertSettings(req, res, next);
      expect(libSettingsSvc.upsertSettings).toHaveBeenCalledWith(req.body, { schoolId: 1 });
    });
  });
  describe('createFineRule', () => {
    it('should create fine rule', async () => {
      req.body = { per_day_fine: 5 };
      libSettingsSvc.createFineRule.mockResolvedValue({ id: 1 });
      await libSettingsCtrl.createFineRule(req, res, next);
      expect(libSettingsSvc.createFineRule).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, expect.any(String), 201);
    });
  });
  describe('deleteFineRule', () => {
    it('should delete fine rule with parseInt ID', async () => {
      req.params = { id: '1' };
      libSettingsSvc.deleteFineRule.mockResolvedValue(true);
      await libSettingsCtrl.deleteFineRule(req, res, next);
      expect(libSettingsSvc.deleteFineRule).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
});
