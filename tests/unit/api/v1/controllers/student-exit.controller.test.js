jest.mock('../../../../../src/api/v1/services/student-exit.service', () => ({
  studentExitService: {
    initiateExit: jest.fn(),
    listExits: jest.fn(),
    getExitById: jest.fn(),
    getExitByStudentId: jest.fn(),
    generateCertificate: jest.fn(),
    getCertificatesByExit: jest.fn(),
    redownloadCertificate: jest.fn()
  }
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const { studentExitController } = require('../../../../../src/api/v1/controllers/student-exit.controller');
const { studentExitService } = require('../../../../../src/api/v1/services/student-exit.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('StudentExitController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('initiateExit', () => {
    it('should initiate student exit', async () => {
      req.body = { student_id: 5, reason: 'Transfer' };
      studentExitService.initiateExit.mockResolvedValue({ id: 1 });
      await studentExitController.initiateExit(req, res, next);
      expect(studentExitService.initiateExit).toHaveBeenCalledWith(req.body, { schoolId: 1, userId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Student exit initiated successfully', 201);
    });
  });
  describe('listExits', () => {
    it('should list exits', async () => {
      req.query = { page: '1', limit: '10' };
      studentExitService.listExits.mockResolvedValue({ exits: [] });
      await studentExitController.listExits(req, res, next);
      expect(studentExitService.listExits).toHaveBeenCalledWith(expect.objectContaining({ page: '1', limit: '10' }), { schoolId: 1 });
    });
  });
  describe('getExit', () => {
    it('should get exit by parseInt ID', async () => {
      req.params = { id: '1' };
      studentExitService.getExitById.mockResolvedValue({ id: 1 });
      await studentExitController.getExit(req, res, next);
      expect(studentExitService.getExitById).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
  describe('getExitByStudent', () => {
    it('should get exit by student parseInt ID', async () => {
      req.params = { studentId: '5' };
      studentExitService.getExitByStudentId.mockResolvedValue({ id: 1 });
      await studentExitController.getExitByStudent(req, res, next);
      expect(studentExitService.getExitByStudentId).toHaveBeenCalledWith(5, { schoolId: 1 });
    });
  });
  describe('generateCertificate', () => {
    it('should generate PDF certificate', async () => {
      req.params = { id: '1' };
      req.body = { certificate_type: 'TC' };
      const pdfBuffer = Buffer.from('pdf');
      studentExitService.generateCertificate.mockResolvedValue({ pdfBuffer, fileName: 'cert.pdf' });
      res.set = jest.fn();
      await studentExitController.generateCertificate(req, res, next);
      expect(studentExitService.generateCertificate).toHaveBeenCalledWith(1, 'TC', { schoolId: 1, userId: 1 });
      expect(res.send).toHaveBeenCalledWith(pdfBuffer);
    });
  });
  describe('getCertificates', () => {
    it('should get certificates by exit ID', async () => {
      req.params = { id: '1' };
      studentExitService.getCertificatesByExit.mockResolvedValue([]);
      await studentExitController.getCertificates(req, res, next);
      expect(studentExitService.getCertificatesByExit).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
});
