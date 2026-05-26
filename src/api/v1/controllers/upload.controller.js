const https = require('https');
const photoStorageService = require('../services/photo-storage.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class UploadController {
  /**
   * GET /api/v1/uploads/proxy
   * Proxy a file from Bunny CDN storage (authenticated via server-side API key).
   * Query params:
   *   - path: the object path inside the storage zone (e.g. photos/student-1-xxx.jpg)
   */
  proxyFile = asyncHandler(async (req, res) => {
    const jwt = require('jsonwebtoken');
    const objectPath = req.query.path;
    const token = req.query.token;

    if (!objectPath || typeof objectPath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameter: path',
        data: null,
        errors: null
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
        data: null,
        errors: null
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        data: null,
        errors: null
      });
    }

    const schoolId = decoded.schoolId || null;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School context not found in token',
        data: null,
        errors: null
      });
    }

    // Validate the path to prevent directory traversal
    const sanitized = objectPath.replace(/^\/+/, '').replace(/\.\./g, '');
    if (!sanitized || sanitized.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid path',
        data: null,
        errors: null
      });
    }

    const bunny = await photoStorageService.getBunnySettings(schoolId);
    if (!bunny) {
      return res.status(404).json({
        success: false,
        message: 'CDN not configured for this school',
        data: null,
        errors: null
      });
    }

    const options = {
      method: 'GET',
      hostname: bunny.hostname,
      path: `/${encodeURIComponent(bunny.storageZone)}/${sanitized}`,
      headers: {
        AccessKey: bunny.apiKey
      },
      timeout: 15000
    };

    const proxyReq = https.request(options, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode === 404 ? 404 : 502).json({
          success: false,
          message: 'File not found or storage error',
          data: null,
          errors: null
        });
      }

      const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }

      proxyRes.pipe(res);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          message: 'CDN request timed out',
          data: null,
          errors: null
        });
      }
    });

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: 'Failed to fetch file from CDN',
          data: null,
          errors: null
        });
      }
    });

    proxyReq.end();
  });

  /**
   * POST /api/v1/uploads/document
   * Upload a single document to Bunny CDN.
   * Query params:
   *   - entityType: student | teacher | parent | employee (default: person)
   *   - documentType: aadhar | pan | photo | document (default: document)
   *   - fieldName: the multipart field name to look for (default: file)
   */
  uploadDocument = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const entityType = req.query.entityType || 'person';
    const documentType = req.query.documentType || 'document';
    const fieldName = req.query.fieldName || 'file';

    const file =
      (Array.isArray(req.files) ? req.files[0] : req.files?.[fieldName]?.[0]) ||
      req.file ||
      null;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
        data: null,
        errors: [{ field: fieldName, message: `File is required (field: ${fieldName})` }]
      });
    }

    const isPhoto = documentType === 'photo';
    const url = isPhoto
      ? await photoStorageService.uploadPhoto(file, { schoolId, entityType })
      : await photoStorageService.uploadDocument(file, { schoolId, entityType, documentType });

    return success(res, { url, documentType, entityType }, 'Document uploaded successfully', 200);
  });
}

module.exports = new UploadController();
