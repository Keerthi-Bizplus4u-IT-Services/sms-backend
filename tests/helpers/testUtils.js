/**
 * Test Utilities
 * Common testing utilities and helpers
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token for testing
 */
const generateAccessToken = (payload = {}) => {
  const defaultPayload = {
    userId: payload.userId || 1,
    role: payload.role || 'admin',
    email: payload.email || 'test@example.com',
    personId: payload.personId || 1
  };

  return jwt.sign(
    defaultPayload,
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate JWT refresh token for testing
 */
const generateRefreshToken = (payload = {}) => {
  const defaultPayload = {
    userId: payload.userId || 1,
    role: payload.role || 'admin',
    email: payload.email || 'test@example.com'
  };

  return jwt.sign(
    defaultPayload,
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Generate expired JWT token for testing
 */
const generateExpiredToken = (payload = {}) => {
  const defaultPayload = {
    userId: payload.userId || 1,
    role: payload.role || 'admin',
    email: payload.email || 'test@example.com'
  };

  return jwt.sign(
    defaultPayload,
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '-1h' } // Already expired
  );
};

/**
 * Create mock Express request object
 */
const mockRequest = (data = {}) => {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    headers: data.headers || {},
    user: data.user || null,
    file: data.file || null,
    files: data.files || null,
    ...data
  };
};

/**
 * Create mock Express response object
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create mock Express next function
 */
const mockNext = () => jest.fn();

/**
 * Assert response format
 */
const assertResponseFormat = (response, expectedSuccess = true) => {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('message');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('errors');
  expect(response.success).toBe(expectedSuccess);
};

/**
 * Assert success response
 */
const assertSuccessResponse = (response, statusCode = 200) => {
  assertResponseFormat(response, true);
  expect(response.success).toBe(true);
  expect(response.data).toBeDefined();
  expect(response.errors).toBeNull();
};

/**
 * Assert error response
 */
const assertErrorResponse = (response, expectedMessage = null) => {
  assertResponseFormat(response, false);
  expect(response.success).toBe(false);
  expect(response.data).toBeNull();
  if (expectedMessage) {
    expect(response.message).toContain(expectedMessage);
  }
};

/**
 * Assert validation error response
 */
const assertValidationError = (response, fieldName = null) => {
  assertErrorResponse(response);
  expect(response.errors).toBeDefined();
  expect(Array.isArray(response.errors)).toBe(true);
  expect(response.errors.length).toBeGreaterThan(0);
  
  if (fieldName) {
    const fieldError = response.errors.find(err => err.field === fieldName);
    expect(fieldError).toBeDefined();
  }
};

/**
 * Assert pagination response
 */
const assertPaginationResponse = (response) => {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('total');
  expect(response).toHaveProperty('page');
  expect(response).toHaveProperty('totalPages');
  expect(Array.isArray(response.data)).toBe(true);
  expect(typeof response.total).toBe('number');
  expect(typeof response.page).toBe('number');
  expect(typeof response.totalPages).toBe('number');
};

/**
 * Wait for async operations
 */
const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create mock Sequelize model
 */
const mockSequelizeModel = (methods = {}) => {
  const defaultMethods = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
    count: jest.fn(),
    ...methods
  };

  return defaultMethods;
};

/**
 * Create mock Sequelize transaction
 */
const mockTransaction = () => {
  const transaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    LOCK: { UPDATE: 'UPDATE' }
  };
  return transaction;
};

/**
 * Clean up test data (for integration tests)
 */
const cleanupTestData = async (models, data) => {
  const cleanupOrder = ['Student', 'Teacher', 'Parent', 'User', 'Person', 'Subject', 'Class'];
  
  for (const modelName of cleanupOrder) {
    if (models[modelName] && data[modelName.toLowerCase()]) {
      await models[modelName].destroy({
        where: { id: data[modelName.toLowerCase()].id },
        force: true
      });
    }
  }
};

/**
 * Strip undefined values from object
 */
const stripUndefined = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

/**
 * Compare objects ignoring timestamps
 */
const compareIgnoringTimestamps = (obj1, obj2) => {
  const stripTimestamps = (obj) => {
    const { created_at, updated_at, deleted_at, createdAt, updatedAt, deletedAt, ...rest } = obj;
    return rest;
  };
  
  return expect(stripTimestamps(obj1)).toMatchObject(stripTimestamps(obj2));
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateExpiredToken,
  mockRequest,
  mockResponse,
  mockNext,
  assertResponseFormat,
  assertSuccessResponse,
  assertErrorResponse,
  assertValidationError,
  assertPaginationResponse,
  wait,
  mockSequelizeModel,
  mockTransaction,
  cleanupTestData,
  stripUndefined,
  compareIgnoringTimestamps
};
