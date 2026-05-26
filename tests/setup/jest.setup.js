/**
 * Jest Global Setup
 * Sets up test environment, mocks, and global utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '10';
process.env.MAX_LOGIN_ATTEMPTS = '5';
process.env.LOCK_TIME = '15';

// Note: Mail and checksum controllers do not exist in the new v1 API structure
// If they are used anywhere, they should be mocked in the specific test file

// Mock database config (to prevent model initialization errors)
jest.mock('../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    define: jest.fn(),
    model: jest.fn(),
    models: {},
  },
  connection: jest.fn(),
}));

// Mock multer file upload middleware
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = {
        fieldname: 'photo',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 12345,
        destination: 'uploads/',
        filename: 'test-123.jpg',
        path: 'uploads/test-123.jpg'
      };
      next();
    },
    array: () => (req, res, next) => {
      req.files = [{
        fieldname: 'photos',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 12345,
        destination: 'uploads/',
        filename: 'test-123.jpg',
        path: 'uploads/test-123.jpg'
      }];
      next();
    }
  });
  multer.diskStorage = () => ({});
  return multer;
});

// Mock winston logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock response utilities
jest.mock('../../src/utils/response', () => ({
  success: jest.fn((res, data, message, statusCode = 200) => {
    res.status(statusCode);
    res.json({ success: true, message, data, errors: null });
    return res;
  }),
  error: jest.fn((res, message, statusCode = 400, errors = null) => {
    res.status(statusCode);
    res.json({ success: false, message, data: null, errors });
    return res;
  }),
  validationError: jest.fn((res, errors) => {
    res.status(400);
    res.json({ success: false, message: 'Validation failed', data: null, errors });
    return res;
  }),
  unauthorized: jest.fn((res, message = 'Unauthorized access') => {
    res.status(401);
    res.json({ success: false, message, data: null, errors: null });
    return res;
  }),
  forbidden: jest.fn((res, message = 'Access forbidden') => {
    res.status(403);
    res.json({ success: false, message, data: null, errors: null });
    return res;
  }),
  notFound: jest.fn((res, message = 'Resource not found') => {
    res.status(404);
    res.json({ success: false, message, data: null, errors: null });
    return res;
  }),
  conflict: jest.fn((res, message = 'Resource conflict') => {
    res.status(409);
    res.json({ success: false, message, data: null, errors: null });
    return res;
  }),
  serverError: jest.fn((res, message = 'Internal server error') => {
    res.status(500);
    res.json({ success: false, message, data: null, errors: null });
    return res;
  }),
  created: jest.fn((res, data, message = 'Resource created successfully') => {
    res.status(201);
    res.json({ success: true, message, data, errors: null });
    return res;
  }),
}));

// Mock Sequelize models
jest.mock('../../src/models', () => {
  // Helper to create a model mock with common Sequelize methods
  const createModelMock = (modelName) => {
    const mock = {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
      findAndCountAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      bulkCreate: jest.fn(),
      count: jest.fn(),
      max: jest.fn(),
      min: jest.fn(),
      sum: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      // Association methods
      belongsTo: jest.fn().mockReturnThis(),
      hasMany: jest.fn().mockReturnThis(),
      hasOne: jest.fn().mockReturnThis(),
      belongsToMany: jest.fn().mockReturnThis(),
      // Model metadata
      name: modelName,
      tableName: modelName.toLowerCase() + 's',
    };
    return mock;
  };

  // Mock Sequelize instance
  const sequelize = {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
    query: jest.fn(),
    transaction: jest.fn((callback) => {
      const t = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      };
      return callback ? callback(t) : Promise.resolve(t);
    }),
    define: jest.fn(),
    model: jest.fn(),
    models: {},
  };

  return {
    sequelize,
    Role: createModelMock('Role'),
    User: createModelMock('User'),
    Person: createModelMock('Person'),
    AcademicYear: createModelMock('AcademicYear'),
    Class: createModelMock('Class'),
    Section: createModelMock('Section'),
    Subject: createModelMock('Subject'),
    Student: createModelMock('Student'),
    Teacher: createModelMock('Teacher'),
    Parent: createModelMock('Parent'),
  };
});

// Mock Sequelize operators
jest.mock('sequelize', () => {
  const actualSequelize = jest.requireActual('sequelize');
  return {
    ...actualSequelize,
    Op: {
      and: Symbol('and'),
      or: Symbol('or'),
      eq: Symbol('eq'),
      ne: Symbol('ne'),
      gte: Symbol('gte'),
      gt: Symbol('gt'),
      lte: Symbol('lte'),
      lt: Symbol('lt'),
      not: Symbol('not'),
      in: Symbol('in'),
      notIn: Symbol('notIn'),
      is: Symbol('is'),
      like: Symbol('like'),
      notLike: Symbol('notLike'),
      iLike: Symbol('iLike'),
      notILike: Symbol('notILike'),
      regexp: Symbol('regexp'),
      notRegexp: Symbol('notRegexp'),
      iRegexp: Symbol('iRegexp'),
      notIRegexp: Symbol('notIRegexp'),
      between: Symbol('between'),
      notBetween: Symbol('notBetween'),
      overlap: Symbol('overlap'),
      contains: Symbol('contains'),
      contained: Symbol('contained'),
      adjacent: Symbol('adjacent'),
      strictLeft: Symbol('strictLeft'),
      strictRight: Symbol('strictRight'),
      noExtendRight: Symbol('noExtendRight'),
      noExtendLeft: Symbol('noExtendLeft'),
      any: Symbol('any'),
      all: Symbol('all'),
      values: Symbol('values'),
      col: Symbol('col'),
      placeholder: Symbol('placeholder'),
      join: Symbol('join'),
      match: Symbol('match'),
    },
  };
});

// Global test timeout
jest.setTimeout(10000);

// Console suppression for cleaner test output (optional)
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Keep errors visible
};

// Global beforeAll
beforeAll(async () => {
  // Any global setup
});

// Global afterAll
afterAll(async () => {
  // Any global cleanup
});
