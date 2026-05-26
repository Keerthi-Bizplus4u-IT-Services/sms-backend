const http = require('http');

const tests = [
  { role: 1, email: 'admin@sms.local', password: 'admin123', expect: ['/index'] },
  { role: 2, email: 'student@sms.local', password: 'student123', expect: ['/index3'] },
  { role: 3, email: 'parent@sms.local', password: 'parent123', expect: ['/index4'] },
  { role: 4, email: 'teacher@sms.local', password: 'teacher123', expect: ['/index5'] },
  { role: 5, email: 'library@sms.local', password: 'library123', expect: ['/index'] },
  { role: 6, email: 'subjects@sms.local', password: 'subjects123', expect: ['/all-subject'] },
  { role: 7, email: 'accounts@sms.local', password: 'accounts123', expect: ['/all-book'] },
  { role: 8, email: 'exam@sms.local', password: 'exam123', expect: ['/exam-schedule'] },
  { role: 9, email: 'transport@sms.local', password: 'transport123', expect: ['/add-timings'] },
  { role: 10, email: 'management@sms.local', password: 'management123', expect: ['/index'] },
];

function postAuth({ email, password }) {
  return new Promise((resolve, reject) => {
    const data = `emailid=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/authenticate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        // We expect a 302 with a Location header
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({ status: res.statusCode, location: res.headers.location || '', body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const results = [];
  for (const t of tests) {
    try {
      const res = await postAuth(t);
      const ok = res.status === 302 && t.expect.includes(res.location);
      const row = { role: t.role, email: t.email, status: res.status, location: res.location, ok };
      results.push(row);
      console.log(`[role ${t.role}] status=${res.status} location=${res.location} ok=${ok}`);
    } catch (e) {
      const row = { role: t.role, email: t.email, error: e.message, ok: false };
      results.push(row);
      console.log(`[role ${t.role}] ERROR ${e.message}`);
    }
  }
  console.table(results);
})();
