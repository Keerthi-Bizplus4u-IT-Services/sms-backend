/**
 * Quick test for the new standalone aadhar upload endpoint
 * Usage: node scripts/test-upload-document.js
 */
const http = require('http');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

function request(method, urlPath, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
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

(async () => {
  console.log('\n=== Upload Document Endpoint Tests ===\n');

  // Login
  const loginResp = await request('POST', '/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@springfield.sms.local', password: 'Password@123' })
  });
  const token = loginResp.body?.data?.accessToken;
  if (!token) { console.error('Login failed'); process.exit(1); }
  console.log('  Logged in\n');

  // Test 1: Upload a valid PDF
  {
    const boundary = '----B' + crypto.randomBytes(8).toString('hex');
    const pdf = Buffer.from(
      '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF'
    );
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="aadhar"; filename="aadhar.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
      ),
      pdf,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const resp = await request('POST', '/api/v1/students/upload-document', {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`,
        'x-school-id': '1'
      },
      body
    });

    const ok = resp.status === 200 && resp.body?.success && resp.body?.data?.url;
    console.log(`  ${ok ? '✓' : '✗'} Upload valid PDF → status=${resp.status} url=${resp.body?.data?.url || 'none'}`);
  }

  // Test 2: No file
  {
    const boundary = '----B' + crypto.randomBytes(8).toString('hex');
    const body = Buffer.from(`--${boundary}--\r\n`);

    const resp = await request('POST', '/api/v1/students/upload-document', {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`,
        'x-school-id': '1'
      },
      body
    });

    const ok = resp.status === 400;
    console.log(`  ${ok ? '✓' : '✗'} No file provided → status=${resp.status} message=${resp.body?.message}`);
  }

  // Test 3: Unauthenticated
  {
    const boundary = '----B' + crypto.randomBytes(8).toString('hex');
    const body = Buffer.from(`--${boundary}--\r\n`);

    const resp = await request('POST', '/api/v1/students/upload-document', {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'x-school-id': '1'
      },
      body
    });

    const ok = resp.status === 401;
    console.log(`  ${ok ? '✓' : '✗'} Unauthenticated → status=${resp.status}`);
  }

  // Test 4: Create student with pre-uploaded aadhar_url (no file)
  {
    const boundary = '----B' + crypto.randomBytes(8).toString('hex');
    const person = JSON.stringify({
      first_name: 'PreUpload',
      last_name: 'Test',
      gender: 'male',
      date_of_birth: '2014-05-01',
      phone: '9000000099',
      aadhar_url: 'https://cdn.example.com/documents/pre-uploaded-aadhar.pdf'
    });
    const student = JSON.stringify({
      apar_id: 'APAR-PRE-' + Date.now(),
      class_id: 3,
      branch_id: 1,
      admission_date: '2026-04-11',
      status: 'active'
    });

    const bodyStr = [
      `--${boundary}\r\nContent-Disposition: form-data; name="person"\r\n\r\n${person}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="student"\r\n\r\n${student}`,
      `--${boundary}--`
    ].join('\r\n');

    const resp = await request('POST', '/api/v1/students', {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`,
        'x-school-id': '1'
      },
      body: bodyStr
    });

    const ok = resp.status === 201 && resp.body?.success;
    console.log(`  ${ok ? '✓' : '✗'} Create student with pre-uploaded aadhar_url → status=${resp.status} aadharUrl=${resp.body?.data?.aadharUrl || 'none'}`);
  }

  console.log('\n  Done!\n');
})();
