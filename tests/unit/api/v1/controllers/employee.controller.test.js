/**
 * Unit Tests for Employee Controller (no context utils)
 */

jest.mock('../../../../../src/api/v1/services/employee.service', () => ({
  getEmployees: jest.fn(),
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/services/photo-storage.service', () => ({
  uploadPhoto: jest.fn()
}));

const employeeController = require('../../../../../src/api/v1/controllers/employee.controller');
const employeeService = require('../../../../../src/api/v1/services/employee.service');
const photoStorageService = require('../../../../../src/api/v1/services/photo-storage.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('EmployeeController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getEmployees', () => {
    it('should retrieve employees with query filters', async () => {
      req.query = { page: '1', limit: '20', search: 'john' };
      employeeService.getEmployees.mockResolvedValue({ employees: [], total: 0 });

      await employeeController.getEmployees(req, res, next);

      expect(employeeService.getEmployees).toHaveBeenCalledWith(req.query);
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Employees retrieved successfully', 200);
    });
  });

  describe('deleteEmployee', () => {
    it('should delete employee by eid', async () => {
      req.params = { eid: '5' };
      employeeService.deleteEmployee.mockResolvedValue(true);

      await employeeController.deleteEmployee(req, res, next);

      expect(employeeService.deleteEmployee).toHaveBeenCalledWith('5');
    });

    it('should propagate errors on deletion failure', async () => {
      req.params = { eid: '999' };
      employeeService.deleteEmployee.mockRejectedValue(new Error('Employee not found'));

      await employeeController.deleteEmployee(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createEmployee', () => {
    it('should create employee with optional photo upload', async () => {
      req.body = { fname: 'John', lname: 'Doe' };
      req.file = { originalname: 'photo.jpg', buffer: Buffer.from('test') };
      photoStorageService.uploadPhoto.mockResolvedValue('https://cdn.example.com/photo.jpg');
      employeeService.createEmployee.mockResolvedValue({ eid: 10, fname: 'John', lname: 'Doe' });

      await employeeController.createEmployee(req, res, next);

      expect(employeeService.createEmployee).toHaveBeenCalledWith(
        req.body,
        { photoUrl: 'https://cdn.example.com/photo.jpg' }
      );
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ eid: 10 }),
        'Employee created successfully',
        201
      );
    });
  });

  describe('updateEmployee', () => {
    it('should update employee by eid', async () => {
      req.params = { eid: '5' };
      req.body = { fname: 'Updated' };
      employeeService.updateEmployee.mockResolvedValue({ eid: 5, fname: 'Updated' });

      await employeeController.updateEmployee(req, res, next);

      expect(employeeService.updateEmployee).toHaveBeenCalledWith('5', req.body, { photoUrl: undefined });
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ eid: 5 }),
        'Employee updated successfully',
        200
      );
    });
  });
});
