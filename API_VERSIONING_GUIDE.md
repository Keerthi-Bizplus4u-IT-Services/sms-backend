# API Versioning & Backend Architecture Guide

## Table of Contents
1. [API Versioning Strategy](#api-versioning-strategy)
2. [Industry-Grade Backend Architecture](#industry-grade-backend-architecture)
3. [Database Schema Alignment](#database-schema-alignment)
4. [Implementation Checklist](#implementation-checklist)

---

## API Versioning Strategy

### Versioning Standards

#### 1. URL-Based Versioning (Recommended)
```
/api/v1/students
/api/v1/teachers
/api/v2/students  // New version with breaking changes
```

**Rules:**
- ✅ Always prefix APIs with `/api/v{number}`
- ✅ Increment major version for breaking changes
- ✅ Maintain at least 2 versions simultaneously during transition
- ✅ Document deprecation timeline (minimum 6 months notice)

#### 2. Version Lifecycle
```
v1 → Active (Current Production)
v2 → Active (New Features)
v3 → Beta (Testing)
v1 → Deprecated (6 months notice) → Sunset
```

### When to Create a New Version

#### Major Version (v1 → v2)
- **Breaking Changes:**
  - URL structure changes
  - Required field additions
  - Response format modifications
  - Authentication method changes
  - Data type changes

#### Minor Updates (Same Version)
- **Non-Breaking Changes:**
  - Adding optional fields
  - New endpoints
  - Bug fixes
  - Performance improvements
  - Additional query parameters (optional)

### API Documentation Requirements

Each API endpoint must include:
```javascript
/**
 * @api {get} /api/v1/students/:id Get Student Details
 * @apiVersion 1.0.0
 * @apiName GetStudent
 * @apiGroup Students
 * 
 * @apiParam {Number} id Student's unique ID
 * @apiParam {String} [school_id] Optional school filter
 * 
 * @apiSuccess {Object} student Student information
 * @apiSuccess {Number} student.id Student ID
 * @apiSuccess {String} student.name Student name
 * @apiSuccess {String} student.email Student email
 * 
 * @apiError StudentNotFound Student with ID not found
 * @apiError InvalidSchoolId School ID is invalid
 * 
 * @apiExample {curl} Example usage:
 *     curl -i http://localhost:3000/api/v1/students/123
 */
```

---

## Industry-Grade Backend Architecture

### Recommended Folder Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── routes/
│   │   │   │   ├── index.js           // v1 route aggregator
│   │   │   │   ├── students.routes.js
│   │   │   │   ├── teachers.routes.js
│   │   │   │   ├── fees.routes.js
│   │   │   │   └── ...
│   │   │   ├── controllers/
│   │   │   │   ├── students.controller.js
│   │   │   │   ├── teachers.controller.js
│   │   │   │   └── ...
│   │   │   ├── validators/
│   │   │   │   ├── students.validator.js
│   │   │   │   └── ...
│   │   │   └── middlewares/
│   │   │       ├── auth.middleware.js
│   │   │       └── role.middleware.js
│   │   └── v2/
│   │       └── ... (same structure)
│   ├── models/
│   │   ├── student.model.js
│   │   ├── teacher.model.js
│   │   └── ...
│   ├── services/
│   │   ├── student.service.js       // Business logic
│   │   ├── teacher.service.js
│   │   ├── fee.service.js
│   │   └── notification.service.js
│   ├── repositories/
│   │   ├── student.repository.js    // Database operations
│   │   ├── teacher.repository.js
│   │   └── ...
│   ├── utils/
│   │   ├── logger.js
│   │   ├── response.js
│   │   ├── error-handler.js
│   │   └── constants.js
│   ├── config/
│   │   ├── database.js
│   │   ├── app.config.js
│   │   └── env.config.js
│   ├── middlewares/
│   │   ├── error.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── rate-limit.middleware.js
│   │   └── cors.middleware.js
│   └── app.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── migrations/
├── seeds/
├── logs/
├── .env
├── .env.example
└── server.js
```

### Layer Architecture (Industry Standard)

```
┌─────────────────────────────────────┐
│         Routes Layer                │  → API endpoint definitions
│         (v1/routes/*.js)            │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Controllers Layer              │  → Request/Response handling
│      (v1/controllers/*.js)          │  → Input validation
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Services Layer                │  → Business logic
│       (services/*.js)               │  → Complex operations
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│     Repositories Layer              │  → Database queries
│     (repositories/*.js)             │  → Data access only
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         Database                    │  → MySQL/PostgreSQL
└─────────────────────────────────────┘
```

### Code Examples

#### 1. Route Definition (v1/routes/students.routes.js)
```javascript
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/students.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validateStudent } = require('../validators/students.validator');

// Public routes
router.get('/students', studentController.getAllStudents);
router.get('/students/:id', studentController.getStudentById);

// Protected routes
router.post('/students', 
    authenticate, 
    authorize(['admin', 'staff']), 
    validateStudent, 
    studentController.createStudent
);

router.put('/students/:id', 
    authenticate, 
    authorize(['admin', 'staff']), 
    validateStudent, 
    studentController.updateStudent
);

router.delete('/students/:id', 
    authenticate, 
    authorize(['admin']), 
    studentController.deleteStudent
);

module.exports = router;
```

#### 2. Controller (v1/controllers/students.controller.js)
```javascript
const studentService = require('../../services/student.service');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

class StudentController {
    async getAllStudents(req, res, next) {
        try {
            const { page = 1, limit = 10, school_id, class_id } = req.query;
            
            const filters = {
                school_id,
                class_id,
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const result = await studentService.getStudents(filters);
            
            return successResponse(res, result, 'Students retrieved successfully');
        } catch (error) {
            logger.error('Error in getAllStudents:', error);
            next(error);
        }
    }

    async getStudentById(req, res, next) {
        try {
            const { id } = req.params;
            const student = await studentService.getStudentById(id);
            
            if (!student) {
                return errorResponse(res, 'Student not found', 404);
            }
            
            return successResponse(res, student, 'Student retrieved successfully');
        } catch (error) {
            logger.error('Error in getStudentById:', error);
            next(error);
        }
    }

    async createStudent(req, res, next) {
        try {
            const studentData = req.body;
            const createdBy = req.user.id; // From auth middleware
            
            const student = await studentService.createStudent({
                ...studentData,
                created_by: createdBy
            });
            
            return successResponse(res, student, 'Student created successfully', 201);
        } catch (error) {
            logger.error('Error in createStudent:', error);
            next(error);
        }
    }

    async updateStudent(req, res, next) {
        try {
            const { id } = req.params;
            const studentData = req.body;
            const updatedBy = req.user.id;
            
            const student = await studentService.updateStudent(id, {
                ...studentData,
                updated_by: updatedBy
            });
            
            return successResponse(res, student, 'Student updated successfully');
        } catch (error) {
            logger.error('Error in updateStudent:', error);
            next(error);
        }
    }

    async deleteStudent(req, res, next) {
        try {
            const { id } = req.params;
            await studentService.deleteStudent(id);
            
            return successResponse(res, null, 'Student deleted successfully');
        } catch (error) {
            logger.error('Error in deleteStudent:', error);
            next(error);
        }
    }
}

module.exports = new StudentController();
```

#### 3. Service Layer (services/student.service.js)
```javascript
const studentRepository = require('../repositories/student.repository');
const feeRepository = require('../repositories/fee.repository');
const { BusinessLogicError } = require('../utils/errors');

class StudentService {
    async getStudents(filters) {
        const { page, limit, ...otherFilters } = filters;
        const offset = (page - 1) * limit;

        const students = await studentRepository.findAll({
            ...otherFilters,
            limit,
            offset
        });

        const total = await studentRepository.count(otherFilters);

        return {
            data: students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getStudentById(id) {
        const student = await studentRepository.findById(id);
        
        if (!student) {
            return null;
        }

        // Enrich with additional data
        const fees = await feeRepository.findByStudentId(id);
        
        return {
            ...student,
            fees
        };
    }

    async createStudent(studentData) {
        // Business logic validation
        const existingStudent = await studentRepository.findByEmail(studentData.email);
        if (existingStudent) {
            throw new BusinessLogicError('Student with this email already exists');
        }

        // Additional business logic
        const admissionNumber = await this.generateAdmissionNumber(studentData.school_id);
        
        const student = await studentRepository.create({
            ...studentData,
            admission_number: admissionNumber,
            status: 'active'
        });

        // Trigger side effects (async operations)
        this.sendWelcomeEmail(student).catch(err => 
            console.error('Failed to send welcome email:', err)
        );

        return student;
    }

    async updateStudent(id, studentData) {
        const existingStudent = await studentRepository.findById(id);
        if (!existingStudent) {
            throw new BusinessLogicError('Student not found');
        }

        // Check email uniqueness if email is being updated
        if (studentData.email && studentData.email !== existingStudent.email) {
            const emailExists = await studentRepository.findByEmail(studentData.email);
            if (emailExists) {
                throw new BusinessLogicError('Email already in use');
            }
        }

        return await studentRepository.update(id, studentData);
    }

    async deleteStudent(id) {
        const student = await studentRepository.findById(id);
        if (!student) {
            throw new BusinessLogicError('Student not found');
        }

        // Soft delete
        return await studentRepository.update(id, { 
            status: 'deleted',
            deleted_at: new Date()
        });
    }

    async generateAdmissionNumber(schoolId) {
        const year = new Date().getFullYear();
        const lastStudent = await studentRepository.findLastBySchool(schoolId);
        const sequence = lastStudent ? parseInt(lastStudent.admission_number.slice(-4)) + 1 : 1;
        
        return `${schoolId}${year}${sequence.toString().padStart(4, '0')}`;
    }

    async sendWelcomeEmail(student) {
        // Email sending logic
        console.log(`Sending welcome email to ${student.email}`);
    }
}

module.exports = new StudentService();
```

#### 4. Repository Layer (repositories/student.repository.js)
```javascript
const db = require('../config/database');

class StudentRepository {
    async findAll(filters = {}) {
        const { school_id, class_id, status = 'active', limit = 10, offset = 0 } = filters;
        
        let query = `
            SELECT s.*, c.class_name, c.section 
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.status = ?
        `;
        const params = [status];

        if (school_id) {
            query += ' AND s.school_id = ?';
            params.push(school_id);
        }

        if (class_id) {
            query += ' AND s.class_id = ?';
            params.push(class_id);
        }

        query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.query(query, params);
        return rows;
    }

    async findById(id) {
        const query = `
            SELECT s.*, c.class_name, c.section 
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.id = ? AND s.status != 'deleted'
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0] || null;
    }

    async findByEmail(email) {
        const query = 'SELECT * FROM students WHERE email = ? AND status != "deleted"';
        const [rows] = await db.query(query, [email]);
        return rows[0] || null;
    }

    async count(filters = {}) {
        const { school_id, class_id, status = 'active' } = filters;
        
        let query = 'SELECT COUNT(*) as total FROM students WHERE status = ?';
        const params = [status];

        if (school_id) {
            query += ' AND school_id = ?';
            params.push(school_id);
        }

        if (class_id) {
            query += ' AND class_id = ?';
            params.push(class_id);
        }

        const [rows] = await db.query(query, params);
        return rows[0].total;
    }

    async create(studentData) {
        const query = `
            INSERT INTO students 
            (admission_number, name, email, phone, class_id, school_id, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const params = [
            studentData.admission_number,
            studentData.name,
            studentData.email,
            studentData.phone,
            studentData.class_id,
            studentData.school_id,
            studentData.status,
            studentData.created_by
        ];

        const [result] = await db.query(query, params);
        return this.findById(result.insertId);
    }

    async update(id, studentData) {
        const fields = [];
        const params = [];

        Object.keys(studentData).forEach(key => {
            fields.push(`${key} = ?`);
            params.push(studentData[key]);
        });

        fields.push('updated_at = NOW()');
        params.push(id);

        const query = `UPDATE students SET ${fields.join(', ')} WHERE id = ?`;
        await db.query(query, params);
        
        return this.findById(id);
    }

    async findLastBySchool(schoolId) {
        const query = `
            SELECT admission_number 
            FROM students 
            WHERE school_id = ? 
            ORDER BY id DESC 
            LIMIT 1
        `;
        const [rows] = await db.query(query, [schoolId]);
        return rows[0] || null;
    }
}

module.exports = new StudentRepository();
```

#### 5. Validation Middleware (v1/validators/students.validator.js)
```javascript
const Joi = require('joi');
const { validationError } = require('../../utils/response');

const studentSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    date_of_birth: Joi.date().max('now').required(),
    gender: Joi.string().valid('Male', 'Female', 'Other').required(),
    address: Joi.string().max(500),
    class_id: Joi.number().integer().positive().required(),
    school_id: Joi.number().integer().positive().required(),
    parent_id: Joi.number().integer().positive(),
    blood_group: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'),
    admission_date: Joi.date().default(Date.now)
});

const validateStudent = (req, res, next) => {
    const { error } = studentSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        return validationError(res, errors);
    }
    
    next();
};

module.exports = { validateStudent };
```

#### 6. Response Utility (utils/response.js)
```javascript
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

const errorResponse = (res, message, statusCode = 400, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    });
};

const validationError = (res, errors) => {
    return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    successResponse,
    errorResponse,
    validationError
};
```

#### 7. Error Handler Middleware (middlewares/error.middleware.js)
```javascript
const logger = require('../utils/logger');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class BusinessLogicError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
    }
}

const errorHandler = (err, req, res, next) => {
    let { statusCode = 500, message } = err;

    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    }

    // JWT error
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    // JWT expired
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Database errors
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'Duplicate entry found';
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = {
    errorHandler,
    AppError,
    BusinessLogicError,
    NotFoundError,
    UnauthorizedError
};
```

#### 8. Main App Setup (app.js)
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// Import versioned routes
const v1Routes = require('./api/v1/routes');
const v2Routes = require('./api/v2/routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
```

#### 9. Version Route Aggregator (api/v1/routes/index.js)
```javascript
const express = require('express');
const router = express.Router();

// Import all v1 routes
const studentRoutes = require('./students.routes');
const teacherRoutes = require('./teachers.routes');
const feeRoutes = require('./fees.routes');
const classRoutes = require('./classes.routes');
const parentRoutes = require('./parents.routes');
const attendanceRoutes = require('./attendance.routes');

// Mount routes
router.use('/', studentRoutes);
router.use('/', teacherRoutes);
router.use('/', feeRoutes);
router.use('/', classRoutes);
router.use('/', parentRoutes);
router.use('/', attendanceRoutes);

// Version info endpoint
router.get('/', (req, res) => {
    res.json({
        version: 'v1',
        status: 'active',
        endpoints: [
            '/students',
            '/teachers',
            '/fees',
            '/classes',
            '/parents',
            '/attendance'
        ]
    });
});

module.exports = router;
```

---

## Database Schema Alignment

### Schema Sync Process

#### 1. Always Reference Latest Schema
```javascript
// Before creating any API, check current schema
// Location: backend/migrations/latest_schema.sql
```

#### 2. Schema Change Workflow
```
Database Change → Migration File → Update Models → Update Repositories → Update Services → Update API Docs
```

#### 3. Migration Naming Convention
```
YYYY-MM-DD_HH-MM_description.sql
2025-11-15_14-30_add_student_blood_group.sql
```

#### 4. Model-Schema Mapping
```javascript
// models/student.model.js
// MUST match database schema exactly

class Student {
    constructor(data) {
        this.id = data.id;
        this.admission_number = data.admission_number;
        this.name = data.name;
        this.email = data.email;
        // ... all fields from students table
    }

    // Add static method to get table schema
    static get schema() {
        return {
            tableName: 'students',
            fields: [
                'id', 'admission_number', 'name', 'email', 
                'phone', 'class_id', 'school_id', 'created_at'
            ]
        };
    }
}
```

---

## Implementation Checklist

### For Every New API Endpoint

- [ ] **Version**: Place in correct version folder (`api/v1/` or `api/v2/`)
- [ ] **Route**: Define route with proper HTTP method
- [ ] **Validator**: Create validation schema using Joi
- [ ] **Controller**: Handle request/response
- [ ] **Service**: Implement business logic
- [ ] **Repository**: Database queries only
- [ ] **Tests**: Write unit + integration tests
- [ ] **Documentation**: Add API documentation comments
- [ ] **Error Handling**: Use proper error classes
- [ ] **Logging**: Add appropriate logs
- [ ] **Schema Check**: Verify database schema alignment
- [ ] **Security**: Add authentication/authorization
- [ ] **Rate Limiting**: Configure if needed

### Code Quality Standards

#### Required for All Code
```javascript
// ✅ Good
async createStudent(studentData) {
    try {
        // Validate
        if (!studentData.email) {
            throw new BusinessLogicError('Email is required');
        }

        // Check duplicates
        const exists = await studentRepository.findByEmail(studentData.email);
        if (exists) {
            throw new BusinessLogicError('Email already exists');
        }

        // Execute
        const student = await studentRepository.create(studentData);
        
        // Log
        logger.info(`Student created: ${student.id}`);
        
        return student;
    } catch (error) {
        logger.error('Error creating student:', error);
        throw error;
    }
}

// ❌ Bad
async createStudent(studentData) {
    const student = await db.query('INSERT INTO students...', studentData);
    return student;
}
```

### Security Checklist

- [ ] SQL injection prevention (use parameterized queries)
- [ ] Input validation on all endpoints
- [ ] Authentication on protected routes
- [ ] Role-based authorization
- [ ] Rate limiting on public APIs
- [ ] CORS configuration
- [ ] Helmet.js security headers
- [ ] Environment variables for secrets
- [ ] Logging (no sensitive data in logs)
- [ ] HTTPS only in production

### Performance Best Practices

- [ ] Database indexing on frequently queried fields
- [ ] Pagination for list endpoints
- [ ] Caching for static/rarely-changing data
- [ ] Database connection pooling
- [ ] Async operations where possible
- [ ] Query optimization (avoid N+1 queries)
- [ ] Compression middleware
- [ ] CDN for static assets

---

## Migration Steps

### Phase 1: Setup New Structure (Week 1)
1. Create new folder structure
2. Set up utilities (logger, response, errors)
3. Configure middleware
4. Set up v1 routes structure

### Phase 2: Move Existing APIs to v1 (Week 2-3)
1. Start with simplest endpoints (GET operations)
2. Create repositories for each entity
3. Create services for business logic
4. Move controllers to new structure
5. Add validation

### Phase 3: Testing & Documentation (Week 4)
1. Write tests for all endpoints
2. Document all APIs
3. Performance testing
4. Security audit

### Phase 4: v2 Development (Week 5+)
1. Identify improvements from v1
2. Implement new features in v2
3. Maintain v1 for backward compatibility

---

## Quick Reference Commands

```bash
# Start development
npm run dev

# Run tests
npm test

# Generate API documentation
npm run docs

# Run migrations
npm run migrate

# Seed database
npm run seed

# Check code quality
npm run lint

# Format code
npm run format
```

---

## Support & Questions

For questions or issues, contact the development team or refer to:
- Project README.md
- API Documentation: `/api/v1/docs`
- Database Schema: `backend/migrations/`

---

**Last Updated**: November 15, 2025
**Version**: 1.0.0
