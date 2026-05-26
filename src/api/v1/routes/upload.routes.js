const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { uploadGenericDocument } = require('../../../middleware/photo-upload.middleware');

/**
 * Upload Routes
 * @route /api/v1/uploads
 */

/**
 * @route   GET /api/v1/uploads/proxy
 * @desc    Proxy a file from Bunny CDN storage (server-side authenticated)
 * @access  Private
 * @query   path - object path in storage zone (e.g. photos/student-1-xxx.jpg)
 */
router.get(
  '/proxy',
  uploadController.proxyFile
);

/**
 * @route   POST /api/v1/uploads/document
 * @desc    Upload a single document (aadhar, pan, photo, etc.) to Bunny CDN
 * @access  Private
 * @body    multipart/form-data with field matching documentType query param
 */
router.post(
  '/document',
  authenticate,
  uploadGenericDocument,
  uploadController.uploadDocument
);

module.exports = router;
