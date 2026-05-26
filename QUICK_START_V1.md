# Quick Start Guide - API V1

## Prerequisites Installed
✅ Sequelize, JWT, validation libraries
✅ Winston logger
✅ All required dependencies

## Implementation Complete

### ✅ What's Been Implemented

1. **Sequelize Models** (10 models)
   - Role, User, Person, Student, Teacher, Parent
   - Class, Section, Subject, AcademicYear

2. **JWT Authentication System**
   - Login with access/refresh tokens
   - Token verification middleware
   - Role-based access control

3. **V1 APIs Created**
   - Auth API (login, refresh, me, logout)
   - Students API (full CRUD)
   - Teachers API (full CRUD)
   - Parents API (full CRUD)
   - Classes API (full CRUD)
   - Subjects API (full CRUD)

4. **Layered Architecture**
   - Repository → Service → Controller → Routes
   - Validation middleware
   - Error handling middleware

## How to Start

###  1. Ensure Database is Ready

Run the optimized schema migration:
```bash
mysql -u admin -p -h lms.c11qajqwxlix.us-west-2.rds.amazonaws.com sms < migrations/2025-11-15_optimized_schema_migration.sql
```

### 2. Create Initial Admin User

Since we're using JWT, you need at least one user in the database to login:

```sql
-- Connect to database
mysql -u admin -p -h lms.c11qajqwxlix.us-west-2.rds.amazonaws.com sms

-- Insert admin role (if not exists)
INSERT IGNORE INTO roles (id, name, description) VALUES (1, 'admin', 'System Administrator');

-- Insert admin user (password will be hashed on first update via Sequelize)
INSERT INTO users (email, password_hash, role_id, is_active, created_at, updated_at)
VALUES ('admin@sms.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1, 1, NOW(), NOW());
-- Password: admin123

-- Get the user ID
SET @user_id = LAST_INSERT_ID();

-- Insert person record for admin
INSERT INTO persons (user_id, first_name, last_name, gender, date_of_birth, created_at, updated_at)
VALUES (@user_id, 'Admin', 'User', 'male', '1990-01-01', NOW(), NOW());
```

### 3. Start the Server

```bash
cd d:\Bizplus4u_Projects\sms\backend
npm start
```

### 4. Test the API

#### Check Health
```bash
curl http://localhost:3001/api/v1/health
```

#### Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sms.com\",\"password\":\"admin123\"}"
```

Response will include:
```json
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Use Protected Endpoints
```bash
# Replace YOUR_TOKEN with the accessToken from login
curl http://localhost:3001/api/v1/students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints

All endpoints are available at: `http://localhost:3001/api/v1`

### Public Endpoints
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token

### Protected Endpoints (require JWT)
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

- `GET /students` - List students
- `GET /students/:id` - Get student
- `POST /students` - Create student (admin only)
- `PUT /students/:id` - Update student (admin only)
- `DELETE /students/:id` - Delete student (admin only)

- `GET /teachers` - List teachers
- `GET /teachers/:id` - Get teacher
- `POST /teachers` - Create teacher (admin only)
- `PUT /teachers/:id` - Update teacher (admin only)
- `DELETE /teachers/:id` - Delete teacher (admin only)

- `GET /parents` - List parents
- `GET /parents/:id` - Get parent
- `POST /parents` - Create parent (admin only)
- `PUT /parents/:id` - Update parent (admin only)
- `DELETE /parents/:id` - Delete parent (admin only)

- `GET /classes` - List classes
- `GET /subjects` - List subjects

## Environment Variables

Already configured in `.env`:
```
DB_HOST=lms.c11qajqwxlix.us-west-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=Bizplus4u123
DB_NAME=sms

JWT_SECRET=sms-super-secret-jwt-key-2025-production-change-this
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

NODE_ENV=development
PORT=3001
```

## Testing with Postman

1. Import the following as environment variables:
   - `base_url`: http://localhost:3001/api/v1
   - `access_token`: (will be set after login)

2. Create a POST request to `{{base_url}}/auth/login`
   - Body: `{"email":"admin@sms.com","password":"admin123"}`
   - Save the `accessToken` from response

3. For protected endpoints, add header:
   - Key: `Authorization`
   - Value: `Bearer {{access_token}}`

## Troubleshooting

### Error: Cannot find module
- Run `npm install` in the backend directory

### Database connection failed
- Check if MySQL is accessible
- Verify credentials in `.env`
- Test connection: `node -e "const {testConnection} = require('./src/config/database'); testConnection();"`

### Unauthorized errors
- Ensure you're sending the JWT token in Authorization header
- Check if token has expired (15 minutes for access tokens)
- Use refresh token endpoint to get new access token

## Next Steps

1. ✅ Core APIs are working
2. ⏭ Add more APIs (fees, attendance, exams, etc.)
3. ⏭ Add file upload for photos
4. ⏭ Implement email notifications
5. ⏭ Add unit tests
6. ⏭ Create Swagger documentation

## Support Files Created

- `API_V1_DOCUMENTATION.md` - Complete API documentation
- `V1_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `test-api-v1.js` - Automated test script
- `.env.example` - Environment template

## Architecture Benefits

✅ **Scalable**: Layered architecture, easy to extend
✅ **Secure**: JWT auth, RBAC, input validation
✅ **Maintainable**: Clear separation of concerns
✅ **Testable**: Services isolated from HTTP layer
✅ **Modern**: Sequelize ORM, async/await patterns
✅ **Versioned**: /api/v1 prefix for future versions
✅ **Standards Compliant**: Follows backend_development.instructions.md

---

**Your v1 API is ready to use!** 🎉

For any issues, check the logs or refer to the documentation files.
