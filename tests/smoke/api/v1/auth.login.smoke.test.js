/**
 * Admin Login Smoke Test
 * Verifies the seeded admin user can authenticate via POST /api/v1/auth/login
 *
 * Run with: RUN_SMOKE_TESTS=true npm run test:integration
 * Optionally override:
 *   SMOKE_BASE_URL (default http://localhost:3001)
 *   SMOKE_ADMIN_EMAIL (default admin@sms.local)
 *   SMOKE_ADMIN_PASSWORD (default admin123)
 */

const request = require('supertest');

const shouldRunSmoke = process.env.RUN_SMOKE_TESTS === 'true';
const describeFn = shouldRunSmoke ? describe : describe.skip;

describeFn('Smoke | POST /api/v1/auth/login (seeded admin)', () => {
  const baseURL =
    process.env.SMOKE_BASE_URL ||
    process.env.API_BASE_URL ||
    'http://localhost:3001';

  const adminEmail = process.env.SMOKE_ADMIN_EMAIL || 'admin@sms.local';
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123';

  it('authenticates the seeded admin user and returns tokens', async () => {
    let response;
    try {
      response = await request(baseURL)
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .timeout({ response: 10000, deadline: 15000 });
    } catch (error) {
      throw new Error(
        `Unable to reach ${baseURL}/api/v1/auth/login. ` +
          'Ensure the API server is running before executing smoke tests. ' +
          `Original error: ${error.message}`
      );
    }

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data).toHaveProperty('user');

    const { user } = response.body.data;
    expect(user.email).toBe(adminEmail);
    expect(user.roleId).toBeGreaterThan(0);
  });
});
