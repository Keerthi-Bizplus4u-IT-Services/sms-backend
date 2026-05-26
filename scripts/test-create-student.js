const http = require('http');

// First login to get token
function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'admin@springfield.sms.local', password: 'Password@123' });
    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/api/v1/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function createStudent(token) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now();
    const person = JSON.stringify({
      first_name: 'Test',
      last_name: 'Student',
      gender: 'male',
      date_of_birth: '2015-05-10',
      phone: '9876543210'
    });
    const student = JSON.stringify({
      apar_id: 'APAR-DBG-' + Date.now(),
      class_id: 3,
      branch_id: 1,
      admission_date: '2026-04-11',
      status: 'active'
    });

    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="person"\r\n\r\n${person}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="student"\r\n\r\n${student}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="aadhar"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\nfake-pdf-data`,
      `--${boundary}--`
    ];
    const body = parts.join('\r\n');

    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/api/v1/students',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`,
        'x-school-id': '1'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log('Status:', res.statusCode);
        console.log('Response:', JSON.stringify(parsed, null, 2));
        resolve(parsed);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const loginResp = await login();
  const token = loginResp.data.accessToken;
  console.log('Logged in successfully');
  await createStudent(token);
})();
