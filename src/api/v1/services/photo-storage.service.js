const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { SchoolSetting } = require('../../../models');
const { warn } = require('../../../utils/logger');

const FRONTEND_PHOTOS_DIR = path.join(__dirname, '../../../../../frontend/photos');

const MIME_TO_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf'
};

const toSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

const normalizePublicUrl = (pullZone, objectPath) => {
  if (!pullZone) {
    return null;
  }

  const normalizedPath = objectPath.replace(/^\/+/, '');

  if (pullZone.startsWith('http://') || pullZone.startsWith('https://')) {
    return `${pullZone.replace(/\/+$/, '')}/${normalizedPath}`;
  }

  return `https://${pullZone.replace(/\/+$/, '')}/${normalizedPath}`;
};

const uploadToBunnyStorage = ({
  apiKey,
  hostname,
  storageZone,
  objectPath,
  buffer,
  contentType
}) => {
  const normalizedPath = objectPath.replace(/^\/+/, '');
  const options = {
    method: 'PUT',
    hostname,
    path: `/${encodeURIComponent(storageZone)}/${normalizedPath}`,
    headers: {
      AccessKey: apiKey,
      'Content-Type': contentType,
      'Content-Length': buffer.length
    },
    timeout: 15000
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve();
          return;
        }

        reject(
          new Error(
            `Bunny upload failed (${response.statusCode || 'unknown'}): ${body || 'no response body'}`
          )
        );
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Bunny upload timed out'));
    });

    request.on('error', (error) => reject(error));
    request.write(buffer);
    request.end();
  });
};

class PhotoStorageService {
  async getBunnySettings(schoolId) {
    if (!schoolId) {
      return null;
    }

    const settings = await SchoolSetting.findOne({
      where: { school_id: schoolId },
      attributes: [
        'bunny_cdn_api_key',
        'bunny_cdn_storage_zone',
        'bunny_cdn_pull_zone',
        'bunny_cdn_storage_zone_name'
      ]
    });

    if (!settings) {
      return null;
    }

    const apiKey = settings.bunny_cdn_api_key || null;
    const hostname = settings.bunny_cdn_storage_zone || null;
    const storageZone = settings.bunny_cdn_storage_zone_name || null;
    const pullZone = settings.bunny_cdn_pull_zone || null;

    if (!apiKey || !hostname || !storageZone) {
      return null;
    }

    return {
      apiKey,
      hostname,
      storageZone,
      pullZone
    };
  }

  buildFileName(file, entityType, schoolId, suffix = '') {
    const extension = MIME_TO_EXTENSION[file.mimetype] || path.extname(file.originalname || '') || '.jpg';
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const timestamp = Date.now();
    const entity = toSlug(entityType || 'person');
    const normalizedSuffix = suffix ? `-${toSlug(suffix)}` : '';

    return `${entity}${normalizedSuffix}-${schoolId || 'global'}-${timestamp}-${randomSuffix}${extension}`;
  }

  async saveLocally(fileName, buffer) {
    await fs.promises.mkdir(FRONTEND_PHOTOS_DIR, { recursive: true });
    const fullPath = path.join(FRONTEND_PHOTOS_DIR, fileName);
    await fs.promises.writeFile(fullPath, buffer);
    return fileName;
  }

  async uploadFile(file, context = {}) {
    if (!file || !file.buffer) {
      return null;
    }

    const schoolId = context.schoolId || null;
    const entityType = context.entityType || 'person';
    const folder = context.folder || 'photos';
    const fileName = this.buildFileName(file, entityType, schoolId, context.fileTag);
    const objectPath = `${folder}/${fileName}`;

    const bunny = await this.getBunnySettings(schoolId);

    if (bunny) {
      try {
        await uploadToBunnyStorage({
          apiKey: bunny.apiKey,
          hostname: bunny.hostname,
          storageZone: bunny.storageZone,
          objectPath,
          buffer: file.buffer,
          contentType: file.mimetype
        });

        const publicUrl = normalizePublicUrl(bunny.pullZone, objectPath);
        if (publicUrl) {
          return publicUrl;
        }

        // Derive default pull zone from storage zone name when pullZone is not configured
        if (bunny.storageZone) {
          return `https://${bunny.storageZone}.b-cdn.net/${objectPath.replace(/^\/+/, '')}`;
        }

        return `https://${bunny.hostname.replace(/\/+$/, '')}/${encodeURIComponent(bunny.storageZone)}/${objectPath.replace(/^\/+/, '')}`;
      } catch (error) {
        warn('Bunny upload failed. Falling back to local photo storage.', {
          schoolId,
          entityType,
          reason: error.message
        });
      }
    }

    return this.saveLocally(fileName, file.buffer);
  }

  async uploadPhoto(file, context = {}) {
    return this.uploadFile(file, {
      ...context,
      folder: 'photos'
    });
  }

  async uploadDocument(file, context = {}) {
    return this.uploadFile(file, {
      ...context,
      folder: 'documents',
      fileTag: context.documentType || 'document'
    });
  }
}

module.exports = new PhotoStorageService();
