# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage for the SMS (School Management System) API v1 endpoints using Jest, Supertest, Sinon, and SQLite for fast in-memory testing.

## Test Structure

```
backend/tests/
├── setup/
│   └── jest.setup.js          # Global test configuration and mocks
├── helpers/
│   ├── testDatabase.js        # SQLite test database utilities
│   ├── mockData.js            # Faker-based data generators
│   └── testUtils.js           # Common test utilities and assertions
├── unit/
│   ├── api/v1/
│   │   ├── services/          # Service layer tests (business logic)
│   │   ├── repositories/      # Repository layer tests (database operations)
│   │   └── controllers/       # Controller layer tests (HTTP handlers)
│   └── middleware/            # Middleware tests (auth, validation, errors)
└── integration/
    └── api/v1/                # End-to-end API tests
```

## Running Tests

### Run all tests with coverage
```bash
cd backend
npm test
```

### Run specific test suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Run specific test files
```bash
npx jest tests/unit/api/v1/services/auth.service.test.js
npx jest tests/unit/middleware/auth.middleware.test.js
```

## Test Coverage Goals

- **Statements:** 80%+
- **Branches:** 80%+
- **Functions:** 80%+
- **Lines:** 80%+

Coverage reports are generated in `backend/coverage/` directory.

## Writing Tests

### Service Tests
Service tests focus on business logic and should mock repository calls.

```javascript
const service = require('../../../../../src/api/v1/services/student.service');
const repository = require('../../../../../src/api/v1/repositories/student.repository');

jest.mock('../../../../../src/api/v1/repositories/student.repository');

describe('StudentService', () => {
  it('should create student with valid data', async () => {
    repository.create.mockResolvedValue(mockStudent);
    const result = await service.createStudent(validData);
    expect(result).toEqual(mockStudent);
  });
});
```

### Repository Tests
Repository tests focus on database operations and should mock Sequelize models.

```javascript
const repository = require('../../../../../src/api/v1/repositories/student.repository');
const { Student, Person } = require('../../../../../src/models');

jest.mock('../../../../../src/models');

describe('StudentRepository', () => {
  it('should find student by ID', async () => {
    Student.findByPk.mockResolvedValue(mockStudent);
    const result = await repository.findById(1);
    expect(result).toEqual(mockStudent);
  });
});
```

### Controller Tests
Controller tests focus on HTTP handling and should mock services.

```javascript
const controller = require('../../../../../src/api/v1/controllers/auth.controller');
const service = require('../../../../../src/api/v1/services/auth.service');
const { mockRequest, mockResponse } = require('../../../helpers/testUtils');

jest.mock('../../../../../src/api/v1/services/auth.service');

describe('AuthController', () => {
  it('should login user', async () => {
    const req = mockRequest({ body: { email, password } });
    const res = mockResponse();
    service.login.mockResolvedValue(mockResult);
    
    await controller.login(req, res);
    
    expect(service.login).toHaveBeenCalledWith(email, password);
  });
});
```

### Integration Tests
Integration tests use actual SQLite database and test complete flows.

```javascript
const request = require('supertest');
const app = require('../../../app');

describe('Auth Integration', () => {
  it('should complete login flow', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    
    expect(response.body.data).toHaveProperty('accessToken');
  });
});
```

## Test Helpers

### Mock Data Generators
```javascript
const { generateStudent, generateTeacher, generateCompleteUser } = require('../helpers/mockData');

const mockStudent = generateStudent({ admission_number: 'ADM001' });
const mockTeacher = generateTeacher();
const { person, user } = await generateCompleteUser();
```

### Test Utilities
```javascript
const { 
  generateAccessToken, 
  mockRequest, 
  mockResponse,
  assertSuccessResponse,
  assertErrorResponse 
} = require('../helpers/testUtils');

const token = generateAccessToken({ userId: 1, role: 'admin' });
const req = mockRequest({ user: { id: 1 } });
const res = mockResponse();
assertSuccessResponse(response.body);
```

### Test Database
```javascript
const { createTestDatabase, initializeModels, seedBasicData } = require('../helpers/testDatabase');

beforeAll(async () => {
  sequelize = createTestDatabase();
  models = await initializeModels(sequelize);
  await seedBasicData(models);
});
```

## Mocked External Services

The following services are mocked in `jest.setup.js`:

- **Email Service** (`controllers/mail.js`) - All email sending functions
- **File Uploads** (`multer`) - File upload middleware
- **Payment Gateway** (`controllers/checksum.js`) - Payment processing
- **Logger** (`utils/logger.js`) - Winston logger

## CI/CD Integration

Tests run automatically on every pull request via GitHub Actions:

- **Trigger:** Pull requests to `main` or `develop` branches
- **Duration Target:** < 3 minutes (with maxWorkers=4)
- **Coverage Reporting:** Posted as PR comment
- **Merge Blocking:** No (warnings only)

## Best Practices

1. **Arrange-Act-Assert Pattern:** Structure tests clearly
2. **Clear Test Names:** Describe what is being tested
3. **Mock External Dependencies:** Isolate units under test
4. **Test Edge Cases:** Include error scenarios and boundary conditions
5. **Clean Up:** Reset mocks and database between tests
6. **Avoid Test Interdependence:** Each test should be independent
7. **Use Descriptive Assertions:** Make failures easy to understand

## Common Test Patterns

### Testing Async Functions
```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling
```javascript
it('should throw error on invalid input', async () => {
  await expect(service.method(invalidData))
    .rejects
    .toThrow(new AppError('Error message', 400));
});
```

### Testing with Transactions
```javascript
it('should rollback on error', async () => {
  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
  Model.sequelize.transaction.mockImplementation(async (cb) => {
    await cb(mockTransaction);
  });
  
  // Test transaction behavior
});
```

## Troubleshooting

### Tests Running Slow
- Check if using SQLite (not MySQL) for tests
- Verify `maxWorkers=4` in jest.config.js
- Consider running specific test suites instead of all tests

### Coverage Not Generated
- Ensure jest.config.js `collectCoverage: true`
- Check `collectCoverageFrom` patterns
- Verify no syntax errors in test files

### Mock Not Working
- Ensure mock is defined before importing module
- Check mock path is correct
- Use `jest.clearAllMocks()` in `beforeEach`

### Database Errors
- Verify SQLite dialect in testDatabase.js
- Check model associations are defined
- Ensure database is reset between tests

## Next Steps

To add more tests:

1. Create test file following naming convention: `*.test.js` or `*.spec.js`
2. Place in appropriate directory (unit/integration)
3. Follow existing test patterns
4. Run tests locally before pushing
5. Check coverage report to identify gaps

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Sinon Documentation](https://sinonjs.org/releases/latest/)
- [Faker Documentation](https://fakerjs.dev/guide/)
