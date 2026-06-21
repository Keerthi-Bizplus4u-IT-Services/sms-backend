const employeeService = require('../services/employee.service');
const photoStorageService = require('../services/photo-storage.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

const pickUploadedFile = (req, fieldName) => {
  if (req.files && Array.isArray(req.files[fieldName]) && req.files[fieldName][0]) {
    return req.files[fieldName][0];
  }

  if (fieldName === 'photo' && req.file) {
    return req.file;
  }

  return null;
};

class EmployeeController {
  getEmployees = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || null;
    const result = await employeeService.getEmployees(req.query, schoolId);
    return success(res, result, 'Employees retrieved successfully', 200);
  });

  getEmployeeById = asyncHandler(async (req, res) => {
    const result = await employeeService.getEmployeeById(req.params.eid);
    return success(res, result, 'Employee retrieved successfully', 200);
  });

  createEmployee = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || null;
    let photoUrl = req.body.photo_url || null;
    let aadharUrl = req.body.aadhar_url || null;
    let panUrl = req.body.pan_url || null;

    const photoFile = pickUploadedFile(req, 'photo');
    const aadharFile = pickUploadedFile(req, 'aadhar');
    const panFile = pickUploadedFile(req, 'pan');

    if (!photoUrl && photoFile) {
      photoUrl = await photoStorageService.uploadPhoto(photoFile, {
        schoolId,
        entityType: 'employee'
      });
    }

    if (!aadharUrl && aadharFile) {
      aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'employee',
        documentType: 'aadhar'
      });
    }

    if (!panUrl && panFile) {
      panUrl = await photoStorageService.uploadDocument(panFile, {
        schoolId,
        entityType: 'employee',
        documentType: 'pan'
      });
    }

    const result = await employeeService.createEmployee(req.body, {
      photoUrl,
      aadharUrl,
      panUrl
    });
    return success(res, result, 'Employee created successfully', 201);
  });

  updateEmployee = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || null;
    let photoUrl;
    let aadharUrl;
    let panUrl;

    const photoFile = pickUploadedFile(req, 'photo');
    const aadharFile = pickUploadedFile(req, 'aadhar');
    const panFile = pickUploadedFile(req, 'pan');

    if (photoFile) {
      photoUrl = await photoStorageService.uploadPhoto(photoFile, {
        schoolId,
        entityType: 'employee'
      });
    }

    if (aadharFile) {
      aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'employee',
        documentType: 'aadhar'
      });
    }

    if (panFile) {
      panUrl = await photoStorageService.uploadDocument(panFile, {
        schoolId,
        entityType: 'employee',
        documentType: 'pan'
      });
    }

    const result = await employeeService.updateEmployee(req.params.eid, req.body, {
      photoUrl,
      aadharUrl,
      panUrl
    });
    return success(res, result, 'Employee updated successfully', 200);
  });

  deleteEmployee = asyncHandler(async (req, res) => {
    await employeeService.deleteEmployee(req.params.eid);
    return success(res, null, 'Employee deleted successfully', 200);
  });
}

module.exports = new EmployeeController();
