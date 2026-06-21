# API V1 Documentation

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication

All endpoints (except login and refresh) require JWT authentication.

### Headers
```
Authorization: Bearer <access_token>
```

## Available Endpoints

### 1. Authentication (`/auth`)

#### Login
- **POST** `/api/v1/auth/login`
- **Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "admin",
      "roleId": 1,
      "name": "John Doe",
      "photo": null
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Refresh Token
- **POST** `/api/v1/auth/refresh`
- **Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### Get Current User
- **GET** `/api/v1/auth/me`
- **Auth:** Required

#### Logout
- **POST** `/api/v1/auth/logout`
- **Auth:** Required

---

### 2. Students (`/students`)

#### Get All Students
- **GET** `/api/v1/students?page=1&limit=10&classId=1&sectionId=1&status=active&search=john`
- **Auth:** Required (admin, teacher, accounts)
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10, max: 100)
  - `classId`: Filter by class ID
  - `sectionId`: Filter by section ID
  - `status`: Filter by status (active, inactive, transferred, graduated, suspended)
  - `search`: Search by name or phone

#### Get Student by ID
- **GET** `/api/v1/students/:id`
- **Auth:** Required (admin, teacher, student, parent, accounts)

#### Get Student by Admission Number
- **GET** `/api/v1/students/admission/:admissionNumber`
- **Auth:** Required (admin, teacher, accounts)

#### Create Student
- **POST** `/api/v1/students`
- **Auth:** Required (admin only)
- **Body:**
```json
{
  "person": {
    "first_name": "John",
    "last_name": "Doe",
    "middle_name": "Michael",
    "gender": "male",
    "date_of_birth": "2010-05-15",
    "blood_group": "O+",
    "phone": "9876543210",
    "address_line1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India"
  },
  "student": {
    "admission_number": "STD001",
    "roll_number": "1",
    "class_id": 1,
    "section_id": 1,
    "admission_date": "2024-04-01",
    "status": "active"
  },
  "user": {
    "email": "john.doe@example.com",
    "password_hash": "SecurePassword123",
    "role_id": 2
  }
}
```

#### Update Student
- **PUT** `/api/v1/students/:id`
- **Auth:** Required (admin only)

#### Delete Student
- **DELETE** `/api/v1/students/:id`
- **Auth:** Required (admin only)

#### Get Students by Class
- **GET** `/api/v1/students/class/:classId`
- **Auth:** Required (admin, teacher)

#### Get Students by Section
- **GET** `/api/v1/students/class/:classId/section/:sectionId`
- **Auth:** Required (admin, teacher)

---

### 3. Teachers (`/teachers`)

#### Get All Teachers
- **GET** `/api/v1/teachers?page=1&limit=10&status=active&search=jane`
- **Auth:** Required (admin, teacher)

#### Get Teacher by ID
- **GET** `/api/v1/teachers/:id`
- **Auth:** Required (admin, teacher)

#### Create Teacher
- **POST** `/api/v1/teachers`
- **Auth:** Required (admin only)
- **Body:**
```json
{
  "person": {
    "first_name": "Jane",
    "last_name": "Smith",
    "gender": "female",
    "date_of_birth": "1985-08-20",
    "phone": "9876543211"
  },
  "teacher": {
    "employee_id": "EMP001",
    "join_date": "2020-06-01",
    "designation": "Senior Teacher",
    "qualification": "M.Ed",
    "experience_years": 5.5,
    "status": "active",
    "salary": 50000
  }
}
```

#### Update Teacher
- **PUT** `/api/v1/teachers/:id`
- **Auth:** Required (admin only)

#### Delete Teacher
- **DELETE** `/api/v1/teachers/:id`
- **Auth:** Required (admin only)

---

### 4. Parents (`/parents`)

#### Get All Parents
- **GET** `/api/v1/parents?page=1&limit=10&search=robert`
- **Auth:** Required (admin, teacher)

#### Get Parent by ID
- **GET** `/api/v1/parents/:id`
- **Auth:** Required (admin, teacher, parent)

#### Create Parent
- **POST** `/api/v1/parents`
- **Auth:** Required (admin only)
- **Body:**
```json
{
  "person": {
    "first_name": "Robert",
    "last_name": "Doe",
    "gender": "male",
    "date_of_birth": "1980-03-10",
    "phone": "9876543212"
  },
  "parent": {
    "relationship_type": "father",
    "occupation": "Engineer",
    "annual_income": 1200000
  }
}
```

#### Update Parent
- **PUT** `/api/v1/parents/:id`
- **Auth:** Required (admin only)

#### Delete Parent
- **DELETE** `/api/v1/parents/:id`
- **Auth:** Required (admin only)

---

### 5. Classes (`/classes`)

#### Get All Classes
- **GET** `/api/v1/classes?academicYearId=1`
- **Auth:** Required (admin, teacher)

#### Get Class by ID
- **GET** `/api/v1/classes/:id`
- **Auth:** Required (admin, teacher)

#### Create Class
- **POST** `/api/v1/classes`
- **Auth:** Required (admin only)

#### Update Class
- **PUT** `/api/v1/classes/:id`
- **Auth:** Required (admin only)

#### Delete Class
- **DELETE** `/api/v1/classes/:id`
- **Auth:** Required (admin only)

---

### 6. Subjects (`/subjects`)

#### Get All Subjects
- **GET** `/api/v1/subjects?type=core`
- **Auth:** Required (admin, teacher)

#### Get Subject by ID
- **GET** `/api/v1/subjects/:id`
- **Auth:** Required (admin, teacher)

#### Create Subject
- **POST** `/api/v1/subjects`
- **Auth:** Required (admin only)

#### Update Subject
- **PUT** `/api/v1/subjects/:id`
- **Auth:** Required (admin only)

#### Delete Subject
- **DELETE** `/api/v1/subjects/:id`
- **Auth:** Required (admin only)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "errors": null
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "data": null,
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "value": ""
    }
  ]
}
```

## HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Role-Based Access

### Roles
- `admin` - Full access
- `student` - Limited access to own data
- `parent` - Access to children's data
- `teacher` - Access to class/student data
- `accounts` - Financial data access
- `library` - Library management
- `exam` - Examination management
- `transport` - Transport management
- `hostel` - Hostel management
- `management` - Executive access

## Rate Limiting

API requests are limited to 1000 requests per minute per IP address.

## Migration from Legacy API

Legacy endpoints (non-versioned) will continue to work but are deprecated. Plan to migrate to v1 endpoints.

**Deprecation Timeline:** 6 months from release date
