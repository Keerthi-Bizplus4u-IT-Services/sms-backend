const multer = require('multer');

const FIVE_MB = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);
const DOCUMENT_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'application/pdf'
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo'));
    return;
  }

  cb(null, true);
};

const teacherFileFilter = (req, file, cb) => {
  const allowedMimeByField = {
    photo: IMAGE_MIME_TYPES,
    aadhar: DOCUMENT_MIME_TYPES,
    pan: DOCUMENT_MIME_TYPES
  };

  const allowedTypes = allowedMimeByField[file.fieldname];
  if (!allowedTypes || !allowedTypes.has(file.mimetype)) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    return;
  }

  cb(null, true);
};

const createFieldAwareFilter = (allowedMimeByField) => (req, file, cb) => {
  const allowedTypes = allowedMimeByField[file.fieldname];
  if (!allowedTypes || !allowedTypes.has(file.mimetype)) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    return;
  }

  cb(null, true);
};

const studentFileFilter = createFieldAwareFilter({
  photo: IMAGE_MIME_TYPES,
  aadhar: DOCUMENT_MIME_TYPES
});

const parentFileFilter = createFieldAwareFilter({
  photo: IMAGE_MIME_TYPES,
  aadhar: DOCUMENT_MIME_TYPES,
  pan: DOCUMENT_MIME_TYPES
});

const employeeFileFilter = createFieldAwareFilter({
  photo: IMAGE_MIME_TYPES,
  aadhar: DOCUMENT_MIME_TYPES,
  pan: DOCUMENT_MIME_TYPES
});

const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FIVE_MB
  }
});

const uploadTeacherFiles = multer({
  storage,
  fileFilter: teacherFileFilter,
  limits: {
    fileSize: FIVE_MB
  }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 }
]);

const uploadStudentFiles = multer({
  storage,
  fileFilter: studentFileFilter,
  limits: {
    fileSize: FIVE_MB
  }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhar', maxCount: 1 }
]);

const uploadParentFiles = multer({
  storage,
  fileFilter: parentFileFilter,
  limits: {
    fileSize: FIVE_MB
  }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 }
]);

const uploadEmployeeFiles = multer({
  storage,
  fileFilter: employeeFileFilter,
  limits: {
    fileSize: FIVE_MB
  }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 }
]);

const uploadSingleAadhar = multer({
  storage,
  fileFilter: createFieldAwareFilter({
    aadhar: DOCUMENT_MIME_TYPES
  }),
  limits: {
    fileSize: FIVE_MB
  }
}).fields([
  { name: 'aadhar', maxCount: 1 }
]);

const uploadGenericDocument = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
  limits: {
    fileSize: FIVE_MB
  }
}).any();

module.exports = {
  uploadSinglePhoto: uploadPhoto.single('photo'),
  uploadSingleAadhar,
  uploadGenericDocument,
  uploadTeacherFiles,
  uploadStudentFiles,
  uploadParentFiles,
  uploadEmployeeFiles
};
