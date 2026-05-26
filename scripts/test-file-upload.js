/**
 * E2E File Upload Test — Student Creation
 * Hits the running backend (localhost:3001) with real multipart/form-data
 * to verify file uploads work end-to-end.
 *
 * Usage: node scripts/test-file-upload.js
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3001';
const CREDS = { email: 'admin@springfield.sms.local', password: 'Password@123' };
const SCHOOL_ID = '1';

// ── Utility: HTTP request ────────────────────────────────────────
function request(method, urlPath, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Utility: build multipart body ────────────────────────────────
function buildMultipart(fields, files) {
  const boundary = '----FormBoundary' + crypto.randomBytes(8).toString('hex');
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      (typeof value === 'string' ? value : JSON.stringify(value))
    );
  }

  for (const { name, filename, contentType, content } of files) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
    );
  }

  // We need binary-safe construction for file parts
  const textParts = parts.join('\r\n') + '\r\n';
  const buffers = [Buffer.from(textParts)];

  for (const { content } of files) {
    buffers.push(Buffer.isBuffer(content) ? content : Buffer.from(content));
    buffers.push(Buffer.from('\r\n'));
  }

  buffers.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    boundary,
    body: Buffer.concat(buffers)
  };
}

// ── Utility: create a minimal valid JPEG (1x1 pixel) ────────────
function createMinimalJpeg() {
  // Minimal valid JPEG: SOI + APP0 + DQT + SOF0 + DHT + SOS + image data + EOI
  // Using a well-known hex-encoded 1x1 white JPEG
  return Buffer.from(
    'ffd8ffe000104a46494600010100000100010000' +
    'ffdb004300080606070605080707070909080a0c' +
    '140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c' +
    '20242e2720222c231c1c2837292c30313434341f' +
    '27393d38323c2e333432ffc0000b080001000101' +
    '011100ffc4001f000001050101010101010000000' +
    '0000000000102030405060708090a0bffc4004010' +
    '00020103030204030505040400000001770001023' +
    '3110412510621132241073281144291a1b1c10952' +
    '33623442d1e1f025156272a2b283ffda00080101' +
    '00003f00fbdc8640000001ffd9',
    'hex'
  );
}

// ── Utility: create a minimal PDF ────────────────────────────────
function createMinimalPdf() {
  return Buffer.from(
    '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n' +
    '0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );
}

// ── Tests ────────────────────────────────────────────────────────
let token = null;
let passed = 0;
let failed = 0;
const results = [];

function report(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  results.push({ name, status, detail });
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function login() {
  const resp = await request('POST', '/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDS)
  });
  if (resp.status !== 200 || !resp.body?.data?.accessToken) {
    throw new Error(`Login failed: ${resp.status} — ${JSON.stringify(resp.body)}`);
  }
  return resp.body.data.accessToken;
}

async function testCreateWithPhotoAndAadhar() {
  const uniqueId = 'APAR-E2E-' + Date.now();
  const { boundary, body } = buildMultipart(
    {
      person: JSON.stringify({
        first_name: 'FileTest',
        last_name: 'PhotoAadhar',
        gender: 'male',
        date_of_birth: '2014-03-15',
        phone: '9000000001'
      }),
      student: JSON.stringify({
        apar_id: uniqueId,
        class_id: 3,
        branch_id: 1,
        admission_date: '2026-04-11',
        status: 'active'
      })
    },
    [
      { name: 'photo', filename: 'student.jpg', contentType: 'image/jpeg', content: createMinimalJpeg() },
      { name: 'aadhar', filename: 'aadhar.pdf', contentType: 'application/pdf', content: createMinimalPdf() }
    ]
  );

  const resp = await request('POST', '/api/v1/students', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'x-school-id': SCHOOL_ID
    },
    body
  });

  report(
    'Create student with photo + aadhar',
    resp.status === 201 && resp.body?.success === true,
    `status=${resp.status} message=${resp.body?.message}`
  );

  return resp.body?.data;
}

async function testCreateWithAadharOnly() {
  const uniqueId = 'APAR-E2E-A-' + Date.now();
  const { boundary, body } = buildMultipart(
    {
      person: JSON.stringify({
        first_name: 'FileTest',
        last_name: 'AadharOnly',
        gender: 'female',
        date_of_birth: '2015-07-20',
        phone: '9000000002'
      }),
      student: JSON.stringify({
        apar_id: uniqueId,
        class_id: 3,
        branch_id: 1,
        admission_date: '2026-04-11',
        status: 'active'
      })
    },
    [
      { name: 'aadhar', filename: 'id-doc.pdf', contentType: 'application/pdf', content: createMinimalPdf() }
    ]
  );

  const resp = await request('POST', '/api/v1/students', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'x-school-id': SCHOOL_ID
    },
    body
  });

  report(
    'Create student with aadhar only (no photo)',
    resp.status === 201 && resp.body?.success === true,
    `status=${resp.status} message=${resp.body?.message}`
  );
}

async function testCreateWithoutAadharFails() {
  const uniqueId = 'APAR-E2E-NO-' + Date.now();
  const { boundary, body } = buildMultipart(
    {
      person: JSON.stringify({
        first_name: 'FileTest',
        last_name: 'NoAadhar',
        gender: 'male',
        date_of_birth: '2013-01-10',
        phone: '9000000003'
      }),
      student: JSON.stringify({
        apar_id: uniqueId,
        class_id: 3,
        branch_id: 1,
        admission_date: '2026-04-11',
        status: 'active'
      })
    },
    [
      // Only photo, no aadhar
      { name: 'photo', filename: 'pic.jpg', contentType: 'image/jpeg', content: createMinimalJpeg() }
    ]
  );

  const resp = await request('POST', '/api/v1/students', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'x-school-id': SCHOOL_ID
    },
    body
  });

  const hasAadharError = resp.body?.errors?.some(e =>
    e.message?.includes('Aadhar') || e.message?.includes('aadhar')
  );

  report(
    'Reject student creation without aadhar file',
    resp.status === 400 && hasAadharError,
    `status=${resp.status} errors=${JSON.stringify(resp.body?.errors?.map(e => e.message))}`
  );
}

async function testRejectInvalidMimeType() {
  const uniqueId = 'APAR-E2E-MIME-' + Date.now();
  const { boundary, body } = buildMultipart(
    {
      person: JSON.stringify({
        first_name: 'FileTest',
        last_name: 'BadMime',
        gender: 'male',
        date_of_birth: '2014-06-01',
        phone: '9000000004'
      }),
      student: JSON.stringify({
        apar_id: uniqueId,
        class_id: 3,
        branch_id: 1,
        admission_date: '2026-04-11',
        status: 'active'
      })
    },
    [
      // Invalid mime type for photo
      { name: 'photo', filename: 'malicious.html', contentType: 'text/html', content: Buffer.from('<html>bad</html>') },
      { name: 'aadhar', filename: 'doc.pdf', contentType: 'application/pdf', content: createMinimalPdf() }
    ]
  );

  const resp = await request('POST', '/api/v1/students', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'x-school-id': SCHOOL_ID
    },
    body
  });

  // Multer should reject the file — expect 4xx or 5xx with error
  report(
    'Reject invalid MIME type (text/html) for photo',
    resp.status >= 400,
    `status=${resp.status} message=${resp.body?.message}`
  );
}

async function testUnauthenticatedUploadFails() {
  const { boundary, body } = buildMultipart(
    {
      person: JSON.stringify({ first_name: 'No', last_name: 'Auth', gender: 'male', date_of_birth: '2014-01-01' }),
      student: JSON.stringify({ apar_id: 'NOAUTH', class_id: 3, branch_id: 1, admission_date: '2026-04-11' })
    },
    [
      { name: 'aadhar', filename: 'doc.pdf', contentType: 'application/pdf', content: createMinimalPdf() }
    ]
  );

  const resp = await request('POST', '/api/v1/students', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'x-school-id': SCHOOL_ID
      // No Authorization header
    },
    body
  });

  report(
    'Reject upload without authentication',
    resp.status === 401,
    `status=${resp.status} message=${resp.body?.message}`
  );
}

async function testAutoAssignedFieldsAfterUpload() {
  const uniqueId = 'APAR-E2E-AUTO-' + Date.now();
  const { boundary, body } = buildMultipart(
    {
      person: JSON.stringify({
        first_name: 'AutoAssign',
        last_name: 'Test',
        gender: 'female',
        date_of_birth: '2015-11-25',
        phone: '9000000005'
      }),
      student: JSON.stringify({
        apar_id: uniqueId,
        class_id: 3,
        branch_id: 1,
        admission_date: '2026-04-11',
        status: 'active'
        // No admission_number, section_id, or roll_number
      })
    },
    [
      { name: 'aadhar', filename: 'aadhar.pdf', contentType: 'application/pdf', content: createMinimalPdf() }
    ]
  );

  const resp = await request('POST', '/api/v1/students', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'x-school-id': SCHOOL_ID
    },
    body
  });

  if (resp.status !== 201 || !resp.body?.data?.id) {
    report(
      'Auto-assigned fields (admission_number, section, roll) after file upload',
      false,
      `Creation failed: status=${resp.status} message=${resp.body?.message}`
    );
    return;
  }

  const studentId = resp.body.data.id;
  const detailResp = await request('GET', `/api/v1/students/${studentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-school-id': SCHOOL_ID
    }
  });

  const student = detailResp.body?.data;
  const hasAdmission = student?.admissionNumber || student?.admission_number;
  const hasSection = student?.sectionName || student?.section_name || student?.sectionId || student?.section_id;
  const hasRoll = student?.rollNumber || student?.roll_number;

  report(
    'Auto-assigned fields (admission_number, section, roll) after file upload',
    !!(hasAdmission && hasSection && hasRoll),
    `admissionNumber=${hasAdmission} section=${hasSection} roll=${hasRoll}`
  );
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
  console.log('\n=== Student File Upload E2E Tests ===\n');

  try {
    token = await login();
    console.log('  Logged in as admin\n');
  } catch (err) {
    console.error('FATAL: Cannot log in —', err.message);
    process.exit(1);
  }

  await testCreateWithPhotoAndAadhar();
  await testCreateWithAadharOnly();
  await testCreateWithoutAadharFails();
  await testRejectInvalidMimeType();
  await testUnauthenticatedUploadFails();
  await testAutoAssignedFieldsAfterUpload();

  console.log(`\n  Results: ${passed} passed, ${failed} failed out of ${passed + failed}\n`);

  if (failed > 0) {
    console.log('  Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`    ✗ ${r.name}: ${r.detail}`));
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
})();
