# School Management System (SMS) Project Documentation

Generated: 2025-11-15

## 1. Overview
The SMS project is a Node.js + Express based monolithic web application providing administrative and operational functionality for a school: admissions, classes, sections, timetable, subjects, attendance, fees and payments, events, notices, hostel and transport management, messaging, leaves, and user authentication. Views are rendered using EJS templates. Data persistence is via a MySQL/MariaDB database. Sessions with role-based redirection drive user experience but formal authorization middleware is not consistently enforced across routes.

## 2. Technology Stack
- Runtime: Node.js (Express server)
- View Engine: EJS
- Database: MySQL / MariaDB (legacy schema names show `alphatimes` while runtime config uses database `sms`)
- ORM/DB Access: Raw SQL queries via `mysql` (not pooled safely everywhere) and session store via `express-mysql-session`.
- Security Libraries: `helmet`, `express-rate-limit` (applied only to `/api/` prefix), `express-session` (cookie-based), `bcrypt` (present but not used in provided auth code), `cryptr` (imported, rarely used)
- File Uploads: `multer`
- Email / Notifications: `nodemailer`, `elasticemail` (present in dependencies)
- Utilities: `moment`, printing libraries, PayTM checksum lib (`paytmchecksum`), etc.

## 3. High-Level Architecture
```
Browser <--HTTP--> Express (app.js)
                       |-- Middleware: helmet, cors, body-parser, cookie-parser, session
                       |-- Rate limiter on /api/*
                       |-- Router (routes.js) -> Controllers (/controllers/*.js)
                                                 |-- Raw SQL queries -> MySQL (config.js connection)
                                                 |-- Renders EJS views or sends JSON
                       |-- Static assets: /public, /image, /photos
                       |-- Session store: MySQLStore
```
Key Layers:
- Entry Point: `app.js` configures server, middleware, session, static routes, health check.
- Routing: `routes.js` contains both UI (view-rendering) and action (data) endpoints, mixing REST and form submissions.
- Controllers: Each domain (students, teachers, timetable, fees, etc.) has an isolated controller performing queries and rendering views or sending simple responses.
- Database: Queries built inline; no abstraction layer. Some inconsistent parameterization (risks of SQL injection where concatenation used).

## 4. Module Responsibilities (Selected)
- `authenticate-controller.js`: Performs plaintext credential matching against `user` table; sets session vars; redirects based on role (1..10). Inserts login record into `ulogins`. Does NOT hash passwords nor sanitize queries consistently.
- `register-controller.js`: Inserts new user record with plaintext password; lacks validation and duplicate email handling beyond generic catch.
- `fee.js`: CRUD operations and reporting for fee structures and transactions; uses joins to aggregate payments and structures.
- `timetable.js`: Insert timetable entries, session hours, holidays; complex logic for role-based timetable views.
- `dashboard.js`: Aggregated counts, role-specific data views (student/teacher/parent/admin). Reliant on hardcoded sample roll/uid values in current code.
- `common.js`: Generic delete operation switching by `requestId`; constructs dynamic delete SQL; minimal integrity enforcement.
- Many other controllers follow similar pattern: gather request parameters, build SQL, render EJS or send data.

## 5. Routing & API Surface
See `API.md` for full route catalogue. Categories include:
- Auth: `/api/register`, `/api/authenticate`, plus alternate `/controllers/*` duplicates.
- Domain Data: Students, Teachers, Parents, Fees, Timetable, Subjects, Notice, Events, Hostel, Transport, Leaves.
- Search endpoints: Patterns like `/controllers/*search` performing domain-specific queries.
- UI endpoints: Numerous `GET` routes simply render an EJS template (forms, listing pages, dashboards).
- Utility: `/deletedata` multi-purpose deletion, `/health` DB connectivity check.

## 6. Database Schema (Excerpt / Inference)
Tables observed in `db.sql` (partial read):
- Attendance: `attendence`, `addattendence` (stores per-period attendance entries referencing `aid`, `roll`, status integer)
- Users & Roles: `user`, `admin`, `student`, `teacher`, `parent`, linking via `uid` or `roll` with inconsistent foreign key constraints.
- Academic Entities: `class`, `section`, `subjects`, `timetable`, `sessionhours`, `exam`, `examgrade`
- Finance: `feedetails`, `feetransactions`
- Events / Notices: `postevent`, `notice`, `calendar`
- Infrastructure: `hostel`, `transport`
- Relationships: `parent_student` mapping parents to student rolls.
Data Issues:
- Mixed naming conventions (camelCase vs snake vs lower case).
- Wide usage of `varchar` for dates instead of DATE types.
- Duplicated or inconsistent columns (e.g., `teacher.idno` vs `teacher.uid`).
- Lack of explicit foreign key constraints detracts from referential integrity.

## 7. Authentication & Session Flow
1. User submits credentials to `/api/authenticate` (or duplicate path).
2. Controller queries `user` with plaintext `emailid` + `password`.
3. On success: sets `req.session.uid`, `req.session.role`, writes login log, performs secondary query to fetch name & photo based on role mapping, then redirects to role-specific dashboard.
4. Subsequent requests rely on `req.session.role` and `req.session.uid` but `checkSignIn` middleware is not mounted globally; many routes are accessible without session checks.
Security Gaps:
- Plaintext passwords throughout (no hashing).
- Multiple queries with string concatenation (SQL injection risk).
- Role branching logic duplicates queries with suspicious placeholder `uid = '?'` usages (likely nonfunctional parameterization, retrieving unintended results).

## 8. Data Flow Example (Fee Addition)
```
Client POST /controllers/feeadding -> fee.feeadding
  Parses body -> constructs fee structure object
  INSERT feedetails
  Redirect /fee-adding?returnstatus={1|2}
  Subsequent UI GET /fee-details uses join to render fee report
```
Timetable and Dashboard controllers use multi-query patterns aggregating results into arrays passed to EJS templates.

## 9. Static & Asset Management
- Static paths served from `/public`, plus direct `/image`, `/photos` exposure.
- File upload destinations: `photos/` directory (teacher, student, parent, employee photos; book uploads).
- No sanitization of filenames; risk of overwriting or path traversal if not validated by multer configuration (currently default safe but lacking custom filters).

## 10. Error Handling
- Global 404 handler renders `404` (template not listed in provided tree; might be `errorpage.ejs`).
- Global 500 handler sends generic message.
- Controllers usually log errors and redirect with query param `returnstatus`; inconsistent pattern for conveying error semantics.

## 11. Performance Considerations
Issues:
- N+1 multi-query sequences (dashboard, timetable for parents) executed sequentially; could benefit from batching or optimized joins.
- Lack of connection pooling in controllers (they rely on single connection from `config.js` with reconnect logic; concurrency risk).
- Usage of `SELECT *` across endpoints increases payload size and coupling.
- Synchronous heavy loops building objects; parent timetable loops fetch each roll individually.
Opportunities:
- Introduce Pool via `mysql2` promise API.
- Cache static reference data (classes, subjects) in memory.
- Consolidate dashboard queries using conditional aggregation.

## 12. Security Assessment
Critical Findings:
- Hardcoded DB credentials in `config.js` (password visible). Must move to environment variables using `dotenv`.
- Plaintext password storage and comparison; switch to `bcrypt.hash` + `bcrypt.compare`.
- SQL injection surfaces: string concatenations in `common.js` delete queries and timetable role-based queries.
- Missing CSRF protection for form posts.
- Session misconfiguration: `sameSite: true` (lax by default), no `secure: true` flag (proxy trust partially configured).
- Rate limiting only on `/api/` register/authenticate; brute force possible through alternate `/controllers/authenticate-controller` route.
- Dependency risk: `elasticemail@0.2.0` pulled `request@2.88.2` -> `tough-cookie@2.5.0` (GHSA-72xf-g2v4-qvf3). Replaced ElasticEmail client with Nodemailer SMTP and removed the `elasticemail` package to eliminate this chain.
Mitigations:
- Normalize auth endpoints; remove duplicates.
- Enforce `checkSignIn` globally except whitelist (login/register/forgot password/health/static).
- Apply parameterized queries consistently.
- Add input validation (`express-validator`) for body/query params.
- Enforce Content Security Policy via `helmet` advanced configuration.

## 13. Code Quality & Maintainability
Observations:
- Duplicate logic for roles 1,5,6,7,8,9,10 in auth controller; refactor into map.
- Mixed naming, inconsistent file naming (`all classes.js` with space).
- Absence of unit/integration tests (scripts show no test setup).
- Business logic intertwined with rendering; separation into service layer recommended.
Refactor Suggestions:
1. Introduce `services/` layer for domain operations.
2. Use environment variable config loader (`config/` module) for secrets.
3. Standardize route naming (use `/api/v1/...`).
4. Implement centralized error handler returning structured JSON for API endpoints.
5. Adopt linting & formatting (ESLint + Prettier) for consistency.

## 14. Deployment & Environment
Current assumptions:
- Start command: `npm run start` -> `nodemon app.js` (development). For production use `node app.js` or PM2.
- Environment variables absent for DB; add `.env` with `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `SESSION_SECRET`.
- Health check: `GET /health` ensures DB reachable.
Example `.env` (proposed):
```
PORT=3001
DB_HOST=lms.c11qajqwxlix.us-west-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASS=CHANGEME
DB_NAME=sms
SESSION_SECRET=REPLACE_WITH_STRONG_SECRET
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=300
# SMTP for Email (Nodemailer)
SMTP_HOST=smtp.elasticemail.com
SMTP_PORT=2525
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
NOTIFY_TEST_TO=recipient@example.com
```

## 26. Test Accounts (Roles)
For development and QA, seed users for each role are provided in `seeds/seed_roles.sql`. These use plaintext passwords to match current authentication logic.

- Role 1 (Admin):
  - Email: `admin@sms.local`
  - Password: `admin123`
- Role 2 (Student):
  - Email: `student@sms.local`
  - Password: `student123`
- Role 3 (Parent):
  - Email: `parent@sms.local`
  - Password: `parent123`
- Role 4 (Teacher):
  - Email: `teacher@sms.local`
  - Password: `teacher123`
- Role 5 (Library):
  - Email: `library@sms.local`
  - Password: `library123`
- Role 6 (Subjects):
  - Email: `subjects@sms.local`
  - Password: `subjects123`
- Role 7 (Accounts):
  - Email: `accounts@sms.local`
  - Password: `accounts123`
- Role 8 (Exam):
  - Email: `exam@sms.local`
  - Password: `exam123`
- Role 9 (Transport):
  - Email: `transport@sms.local`
  - Password: `transport123`
- Role 10 (Management):
  - Email: `management@sms.local`
  - Password: `management123`

Seeding Instructions (MySQL):
```
mysql -h <host> -u <user> -p <db_name> < seeds/seed_roles.sql
```

Important:

## Database Schema v2 (2025-11-15)

- Goal: prepare the schema for 10k+ concurrent users with safe, incremental changes that preserve backward compatibility while enabling normalized, indexed access paths and typed columns.

### What Changed (Summary)
- Added `roles` table; `user.role_id` now references it (existing `user.role` retained for compatibility).
- Added audit and concurrency columns to key tables: `created_at`, `updated_at`, optional `deleted_at`, `row_version` (on `student`).
- Introduced typed counterparts for weakly typed fields (e.g., `student.dob_date`, `student.admitted_at`, `attendence.date_on`, `examschedule.exam_date`, `expense.amount_decimal`, `feetransactions.amountpaid_decimal`).
- Added high-value indexes for common queries and joins (e.g., `student(roll)`, `student(class_id,section_id)`, `examschedule(eid,subid,cid)`, `timetable(tid,cid,subid,secid,day,shid)`, `ulogins(uid,logintime)`, session expiry).
- Began referential integrity where safe: FKs from `section.class_id`, `subjects.class_id`, and `student.class_id/section_id` to their parents with ON DELETE SET NULL.
- Standardized text encoding on core tables to `utf8mb4`.

See `migrations/2025-11-15_schema_v2.sql` for the complete DDL.

### Backward Compatibility
- No existing columns were dropped or renamed in this migration. Application code continues to work against legacy columns.
- New typed columns are additive; you can adopt them module-by-module and backfill data safely.

### Migration Steps
1) Apply the migration:
  - Ensure MySQL user has `ALTER`/`CREATE` privileges.
  - Run the SQL using your preferred client against the `sms` database.
2) Backfill data (recommended):
  - Map legacy string IDs to numeric IDs where possible (e.g., `student.cid` → `student.class_id`).
  - Convert date strings into DATE/DATETIME (e.g., `student.dob` → `student.dob_date`).
  - Convert amounts into `DECIMAL` fields.
3) Update application code:
  - Prefer new typed columns: `class_id`, `section_id`, `dob_date`, `admitted_at`, decimal amounts, etc.
  - Start writing `user.password_hash` (keep legacy `password` during transition).
  - Use `roles` via `user.role_id` going forward.
4) Enforce more FKs after cleanup:
  - Tables with legacy placeholders (e.g., `-1`, `0`) or string IDs should be cleaned before adding FKs (e.g., `timetable`, `fees`).
5) Decommission legacy columns (optional):
  - Once the app fully uses typed columns, schedule a follow-up migration to drop/rename legacy fields.

### Indexing Highlights
- `student`: `idx_student_roll`, `idx_student_phone`, `idx_student_class_section`.
- `user`: `idx_user_role_id`, `idx_user_is_active` (plus existing unique `emailid`).
- `examschedule`: `idx_examschedule_keys (eid, subid, cid)`.
- `timetable`: `idx_timetable_dims (tid, cid, subid, secid, day, shid)`.
- `sessions`: `idx_sessions_expires` to expedite cleanup and session checks.

### Data Quality Notes
- Many legacy date fields are in mixed formats (e.g., `DD/MM/YYYY`, `YYYY-MM-DD`). Prefer populating new DATE/DATETIME columns; keep raw text fields temporarily for auditing until cleanup completes.
- Some tables store sentinel values (`-1`, `0`) where NULLs should be used. Plan to replace these with NULL and enforce domain constraints.

### Performance Guidance
- Keep hot-path queries bounded to indexed columns (e.g., search students by `class_id`, `section_id`, and `roll`).
- For high write volumes, batch updates and avoid table scans on text columns.
- Consider read replicas and connection pooling once traffic grows; schema changes above reduce lock contention and improve planner selectivity.

### Security Improvements
- Move to hashed passwords: write to `user.password_hash` with a strong algorithm (e.g., bcrypt/argon2). Retain `user.password` only during transition; plan removal.
- Add role-based checks via `roles` instead of free-form text roles.

- These accounts are for non-production use only.
- After migrating to password hashing, update these seeds accordingly.

## 15. Recommended Roadmap
Phase 1 (Security Baseline):
- Migrate credentials to env vars
- Implement password hashing and update existing users via migration script
- Wrap all SQL with parameterized queries, remove concatenations
- Add global auth middleware and route whitelist

Phase 2 (Structure & DX):
- Introduce service layer and DTOs
- Add ESLint/Prettier, basic Jest test harness for controllers/services
- Normalize routes to REST patterns (e.g., `/students/:id`, `/teachers/:id`)

Phase 3 (Performance & UX):
- Replace sequential multi-queries with aggregated queries
- Add caching for frequent lookups (e.g., subjects, class lists)
- Paginate large listings (students, fees, notices)

Phase 4 (Observability):
- Structured logging (pino/winston)
- Metrics (Prometheus exporter) and tracing (OpenTelemetry)

## 16. Quick Setup Steps
```
# Install dependencies
npm install

# Create .env (see template) and remove hardcoded secrets
copy NUL .env  # Windows placeholder then edit

# Run (development)
npm run start

# Production (example)
node app.js
```

## 17. Known Gaps / Risks
- No input sanitation for uploaded filenames (potential overwrite)
- Deprecated `http` package dependency (placeholder, Express already includes server creation)
- Missing access control lists beyond coarse role redirection
- Hardcoded sample roll/uid in controllers indicates incomplete session integration.

## 18. Glossary
- UID: Internal numeric user identifier across role tables.
- Roll: Student roll number, used as external identifier.
- Session Hours: Individual time slots for class timetable.
- Fee Structure: Entry in `feedetails` defining term fees and transport/sports components.

## 19. Next Step Suggestions
1. Generate OpenAPI spec from `API.md` for machine-readable interface.
2. Implement password hashing migration script.
3. Add test coverage for auth & fee modules.
4. Introduce RBAC middleware (role-based route access control matrix).
5. Migrate date strings to proper DATE columns.

---
This document summarizes current state; further detail requires full inspection of all controller logic and complete DB schema. Request follow-up if deeper schema audit or API contract formalization is desired.

## 20. Controllers Catalogue
Below is a comprehensive list of controller modules (`/controllers`). Each entry lists primary exported functions (inferred from route bindings in `routes.js`) and purpose based on filename conventions and previously inspected samples.

| Controller File | Route-bound Functions (from `routes.js`) | Purpose / Domain |
|-----------------|-------------------------------------------|------------------|
| `academic-year.js` | (Imported indirectly by `timetable.js`) | Provides current academic year constant/helper. |
| `account-settings.js` | `renderAccountSettings`, `admin` | Render and update account settings. |
| `add-book.js` | `library`, `updatebook` | Create/update library book records (file upload `ubook`). |
| `add-class.js` | `class` | Add new class metadata. |
| `add-expense.js` | `expense` | Record expense entries. |
| `add-parents.js` | `parent`, `updateParents` | Add/update parent records (file upload `pphoto`). |
| `add-teacher.js` | `teacher`, `editTeacher`, `get_last_teacher_id` | Add/edit teachers (file upload `tphoto`), fetch latest teacher identifier. |
| `admit-form.js` | `admission`, `editStudent` | Student admission & editing (file upload `sphoto`). |
| `all classes.js` | `getlasssection`, `deleteSection` | List classes/sections; delete a section. |
| `all-book.js` | `library` | List all books (library overview). |
| `all-expense.js` | `expense` | List expenses. |
| `all-parents.js` | `parents` | List parents. |
| `all-students.js` | `getStudents`, `students`, `getRollNumber` | Student list retrieval & roll number lookup. |
| `all-teachers.js` | `teachers` | List teachers. |
| `allbooksearch.js` | `bsearch` | Book search operations. |
| `allclassessearch.js` | `search` | Class search operations. |
| `allfeesearch.js` | `search` | Fee search operations. |
| `attendence.js` | `attendence`, `attend`, `getattendence` | Attendance class context, record posting, retrieval. |
| `authenticate-controller.js` | `authenticate`, `forgotPwd` | Login & password reset (plaintext, needs hardening). |
| `busSearch.js` | `search` | Transport bus search. |
| `busTimeSearch.js` | `search` | Bus timings search. |
| `checksum.js` | (Not referenced in `routes.js`) | Likely payment checksum utility (e.g., PayTM). |
| `class-section.js` | `section`, `sclass` | Retrieve sections/classes for dynamic UI selections. |
| `class.js` | (Possibly provides class metadata fetched via other controllers) | Class helper functions (imported as `getclass`). |
| `common.js` | `deletedata` | Generic delete operations based on `requestId`. |
| `configu.js` | (Unused) | Possibly legacy configuration. |
| `contactus.js` | `contactus` | Render/submit contact form. |
| `crypt.js` | (Unused in current route map) | Encryption helper (Cryptr wrapper). |
| `dashboard.js` | `admin`, `student`, `parents`, `teacher`, `dashboardurl`, `getattndpercentage`, `gendercount` | Role-specific dashboard aggregation & simple stats. |
| `employees.js` | `allEmployees`, `addEmployee`, `employeeDetails` | Employee CRUD/listing (file upload `ephoto`). |
| `events.js` | `getevent1`, `getevent`, `postevent`, `attendevent`, `updateEvent` | Event posting, attendance, updates. |
| `exam.js` | `exams`, `addexam`, `examschedule`, `addgrade`, `examgrades`, `getexamgradedetails`, `addmarks`, `postmarks`, `getmarks`, `updateExamGrade` | Exam & grade management. |
| `fee.js` | `feedetails`, `feeadding`, `paymentdetails`, `allfeesdetails`, `updateFeeStructure` | Fee structure CRUD & transactions. |
| `feedback.js` | (Not directly mapped except view) | Likely handles feedback submissions. |
| `forgot-pwd.js` | (Not mapped; superseded by authenticate controller) | Legacy password reset logic. |
| `get-class.js` | (Possibly used for auxiliary class info) | Class retrieval (not directly routed). |
| `get-staff.js` | `allstaff`, `alldata` | Staff listing & aggregated data. |
| `hostel.js` | `roomdetails`, `adminHostel`, `studentHostel`, `addroom`, `updateHostel` | Hostel room management & role-based operations. |
| `hostelSearch.js` | `search` | Hostel search. |
| `leave.js` | `applyleave`, `addleaves`, `totalleavesinfo`, `availedleavesinfo`, `getleavesapprovaldata`, `sendleavesapprovaldata` | Leave application & reporting. |
| `mail.js` | `unsubscribe`, `resubscribe` | Email subscription management. |
| `message.js` | `addmsg`, `users` | Messaging and user list retrieval. |
| `notice.js` | `list`, `addnotice`, `updateNotice`, `editNotice` | Notice board management. |
| `noticesearch.js` | `search` | Notice search. |
| `Notification.js` | `emailnotification` | Email notification trigger. |
| `parent-details.js` | `details`, `editParent`, `searchParent` | Parent detail & search. |
| `parentsearch.js` | `search` | Parent search (duplicate domain). |
| `profile.js` | `myProfile`, `logout` | Profile view & logout. |
| `register-controller.js` | `register` | User registration (plaintext passwords). |
| `school-settings.js` | `get_school_settings`, `set_school_settings` | School feature toggles (transport/stock/hostel). |
| `searchbyclass.js` | (Not mapped currently) | Intended class-based search. |
| `searchbyname.js` | `search` | Generic name search. |
| `section.js` | `addsection` | Section creation. |
| `student-details.js` | `details`, `editStudent`, `searchStudent` | Student detail & search. |
| `student-promotion.js` | `promotion` | Promote student to next class. |
| `subjects.js` | `getSubjects`, `addsubject`, `updateSubject`, `getSubjectforClass` | Subject CRUD & retrieval by class. |
| `subjectSearch.js` | `search` | Subject search. |
| `teacher-details.js` | `details`, `editTeacher`, `searchTeacher` | Teacher detail & search. |
| `teachersearch.js` | `search` | Teacher search (duplicate domain). |
| `timetable.js` | `schedule`, `addsession`, `getSessions`, `getSessionfortt`, `addtimetable`, `holidays`, `addholiday`, `updateHolidays` | Timetable & holiday/session management. |
| `transport.js` | `getbusdetails`, `getbustimings`, `addtimings`, `addbus`, `updatetranstimings`, `updateTransport` | Transport & bus timing operations. |

Notes:
- Files marked "not mapped" may be legacy or used indirectly.
- Duplicate search controllers (e.g., `teachersearch.js` vs `teacher-details.js`) could be consolidated.
- Mixed naming (spaces in `all classes.js`) should be normalized.

## 21. Views (EJS Templates) Catalogue
List of all `.ejs` templates in `/views` and their primary usage context (inferred from route names or typical semantics).

| View | Purpose / Render Trigger |
|------|--------------------------|
| `login.ejs` | Login form (`/login`, root `/`). |
| `register.ejs` | User registration (`/register`). |
| `regsuccess.ejs` | Registration success (rendered after successful register). |
| `forgot-pwd.ejs` | Forgot password form (`/forgotpwd`). |
| `forgot-main.ejs` | Alternate password recovery flow. |
| `changepassword.ejs` / `Changepassword.ejs` | Change password page (case duplication). |
| `admit-form.ejs` | Student admission form (`/admit-form`). |
| `student-promotion.ejs` | Promote student UI (`/student-promotion`). |
| `add-teacher.ejs` | Add teacher form. |
| `add-marks.ejs` | Add marks form. |
| `teacher-payment.ejs` | Teacher payment interface. |
| `add-parents.ejs` | Add parents form. |
| `add-book.ejs` | Add book form. |
| `add-expense.ejs` | Add expense form. |
| `fee-adding.ejs` | Add fee structure form. |
| `payment-details.ejs` | Payment details submission page. |
| `add-class.ejs` | Add class UI. |
| `add-new class.ejs` | New class creation (duplicate naming). |
| `add-new section.ejs` | New section creation. |
| `class-routine.ejs` | Class routine overview. |
| `student-attendence.ejs` | Student attendance view. |
| `add-newattendence.ejs` | Add attendance entries. |
| `messaging.ejs` | Messaging interface. |
| `notification-alert.ejs` | Notifications UI. |
| `button.ejs`, `grid.ejs`, `modal.ejs`, `progress-bar.ejs`, `ui-tab.ejs`, `ui-widget.ejs` | UI component demos / admin toolkit. |
| `map.ejs` | Map view (possibly transport visualization). |
| `account-settings.ejs` | Account settings display. |
| `account-settings-profile.ejs` | Profile settings. |
| `leave.ejs` | Leave application & list. |
| `class.ejs` | Class data view. |
| `view-marks.ejs` | View marks interface. |
| `hostel-registration.ejs` | Hostel registration form. |
| `unsubscribe.ejs` | Email unsubscribe flow. |
| `maintenance.ejs` | Maintenance notice page. |
| `contactus.ejs` | Contact form page. |
| `feedback.ejs` | Feedback entry UI. |
| `edit-student.ejs` | Edit student form. |
| `school-settings.ejs` | School settings toggles. |
| `all-employees.ejs` | Employee listing. |
| `add-new-employee.ejs` | Add employee form. |
| `employee-details.ejs` | Employee detail view. |
| `index.ejs` | Admin dashboard. |
| `index3.ejs` | Student dashboard. |
| `index4.ejs` | Parent dashboard. |
| `index5.ejs` | Teacher dashboard. |
| `teacher-details.ejs` | Teacher detail view. |
| `parents-details.ejs` | Parent detail view. |
| `student-details.ejs` | Student detail view. |
| `notice-board.ejs` | Notice list. |
| `post-event.ejs` | Post event form. |
| `attend-event.ejs` | Attend event view. |
| `all-student.ejs` | All students list. |
| `all-teacher.ejs` | All teachers list. |
| `all-parents.ejs` | All parents list. |
| `all-book.ejs` | All books list. |
| `all-expense.ejs` | All expenses list. |
| `all-fees.ejs` | All fees summary. |
| `all-subject.ejs` | All subjects list. |
| `class-section.ejs` | Class & section combined view. |
| `exam-schedule.ejs` | Exam schedule display. |
| `exam-grade.ejs` | Exam grades list. |
| `edit-exam-grade.ejs` | Edit exam grade form. |
| `edit-teacher.ejs` | Edit teacher form. |
| `edit-parent.ejs` | Edit parent form. |
| `edit-notice.ejs` | Edit notice form. |
| `fee-details.ejs` | Fee details listing. |
| `feeback-list.ejs` | Feedback listing (typo: should be feedback-list). |
| `holidays.ejs` | Holidays listing & add form. |
| `timetable.ejs` | Timetable display. |
| `session-hours.ejs` | Session hours management. |
| `add-timings.ejs` | Add bus timings form. |
| `transport.ejs` | Transport details view. |
| `teacher-payment.ejs` | Teacher payment overview (duplicate mention). |
| `restriction-page.ejs` | Access denied / restriction. |
| `toast.ejs` | Toast notifications example. |
| `default-header.ejs` / `default-menu.ejs` | Layout partials. |
| `confirmdialog.ejs` | Confirmation dialog partial/page. |
| `errorpage.ejs` | Generic error (catch-all route). |
| `notification-alert.ejs` | Notification center (duplicate listing). |
| `payment-details.ejs` | Payment details form (duplicate listing). |

Notes:
- Several duplicates in naming or repeated roles should be consolidated for maintainability.
- Converting UI demo templates (buttons, grid, etc.) into a component library could reduce clutter.

## 22. Cross-Reference: Controllers to Views
Many controllers render specific views:
- `dashboard.js` -> `index.ejs`, `index3.ejs`, `index4.ejs`, `index5.ejs`.
- `timetable.js` -> `timetable.ejs`, `session-hours.ejs`, `holidays.ejs`.
- `fee.js` -> `fee-details.ejs`, `all-fees.ejs`, `fee-adding.ejs`.
- `exam.js` -> `exam-schedule.ejs`, `exam-grade.ejs`, `edit-exam-grade.ejs`.
- `notice.js` -> `notice-board.ejs`, `edit-notice.ejs`.
- `events.js` -> `post-event.ejs`, `attend-event.ejs`.
- `hostel.js` -> `hostel.ejs`, `hostel-registration.ejs`.
- `transport.js` -> `transport.ejs`, `add-timings.ejs`.
- `student-details.js` -> `student-details.ejs`, `edit-student.ejs`.
- `teacher-details.js` -> `teacher-details.ejs`, `edit-teacher.ejs`.
- `parent-details.js` -> `parents-details.ejs`, `edit-parent.ejs`.
- `add-teacher.js` / `add-parents.js` / `add-class.js` / `add-book.js` / `add-expense.js` -> corresponding add forms.
- `account-settings.js` -> `account-settings.ejs`, `account-settings-profile.ejs`.

## 23. Suggested Consolidations
- Merge separate search controllers into a single `searchController` with domain parameter.
- Normalize "add-*" controllers using RESTful routes with verbs and IDs.
- Standardize view naming (`add-new class.ejs` -> `add-new-class.ejs`).
- Combine duplicate rendering logic for dashboards under a single template with role-based conditional sections.

## 24. Next Documentation Enhancements (Optional)
1. Auto-generate controller-function matrix by static analysis rather than manual inference.
2. Produce OpenAPI spec with tags grouping related endpoints (Students, Exams, Transport, Fees).
3. Annotate each view with required data contract (expected keys in `userData` and `data`).
4. Introduce architectural decision records (ADR) for future refactors.

## 25. Client-Side Script: `public/js/main2.js`
This file remains the bridge between the legacy EJS views and the API layer, but it now boots through a lightweight runtime that scopes logic to the pages that need it. The goal is to keep shared helpers in one place while ensuring expensive AJAX calls fire only when the relevant DOM exists.

### Architecture Overview
- **`SMSRuntime`** is a tiny module registry that tracks feature initializers. Each registration specifies either a `selectors` array (any matching element triggers init) or a custom `shouldInit` predicate.
- **`registerDefaultModules()`** (near the end of the file) groups related calls—notifications, class dropdowns, transport routes, etc.—and registers them once. `$(document).ready` now simply invokes `SMSRuntime.init()`, which walks the registry and initializes the modules whose selectors are present on the current page.
- Modules mark themselves as initialized, so repeated invocations (for example, in modal re-renders) do not duplicate work.

### Module Inventory (Default Registrations)
- `notificationWidget`: hydrates header counters and the notification list via `getnotices()`.
- `classSelectors` / `classSelectorNumericValues`: populates `#sclass`, `#studentclass`, and promotion-specific selects using the academic-year aware `getclasses` / `getclassesData`.
- `promotionFromClassSelector` / `promotionToClassSelector`: ensure promotion drop-downs remain in sync with the active academic year.
- `examSelector`, `teacherSelector`, `transportRoutes`: hydrate exam, teacher, and bus-route controls only where the selects exist.
- `studentRollSelector`, `childSelector`, `messageRecipients`: feed roll/child/recipient selects on-demand.
- `teacherIdAutofill`: fetches the next teacher ID only on screens that expose the `#teacher_id` field.

### Context-Aware Events
- Button and select listeners (`#getfeedetails`, `#amountsubmit`, `#submit_school_setting`, roll-number auto-fill, etc.) now guard themselves with existence checks before binding.
- Session-hour reset logic now safely falls back to default option state using jQuery collection semantics instead of calling `.prop` on raw DOM nodes.
- School settings and roll-number fetches include payload parsing guards to avoid runtime errors when APIs return plain text.

### Legacy Helpers Still in Use
Most inline helpers (`getSection`, `getSubjects`, `leavesinfotable`, `printDiv`, `retrieveData`, etc.) stay globally accessible because dozens of EJS templates call them directly via inline attributes. They still:
- Build select options with sentinel "Please Select" entries (`ones` array maps numeric class codes to friendly names).
- Manage DataTables-backed workflows for leaves, hostel, events, and transport modules.
- Handle deletion through `deleterequestID` + `ajaxRequests`.
- Offer ad-hoc utilities like fee detail rendering (`updatestudentdetails`), session-hour lookups, and route form hydration.

### Remaining Risks / Follow-Ups
- API calls still mix `GET`/`POST` semantics inconsistently; destructive operations (`deleteData`, payments) rely on query-string GETs.
- HTML insertion continues to rely on string concatenation without sanitization; server must ensure data safety.
- Legacy globals (`deleterequestID`, leave counters) persist; a future refactor should encapsulate them per feature.
- Hardcoded base URLs (`http://localhost:3001/...`) remain for school settings and roll numbers; centralizing the base path is still recommended.
- Inline `onclick` handlers mean templates and script stay tightly coupled; migrating to modules or React pages will simplify future rewrites.
- No shared fetch wrapper yet; success/error notifications remain console-only.

### Suggested Refactor Steps
1. Introduce ES6 modules or a bundler (Vite/Webpack) and split functionality into domain modules (fees.js, leaves.js, class.js).
2. Replace jQuery AJAX with `fetch` + centralized helper (with JSON parsing, error handling, loading spinner toggling).
3. Implement a small templating or sanitization utility for dynamic HTML (e.g., DOMPurify for external content).
4. Convert deletion logic to RESTful endpoints using appropriate verbs and confirm dialogs with accessible ARIA patterns.
5. Abstract DataTables initialization patterns; parameterize column definitions and source URLs.
6. Encapsulate form row-to-input mapping using dataset attributes instead of nth-child selectors (reduces coupling to column order).
7. Replace magic numbers (feetype 1-5) with constants map and server-driven enumeration.

### Key Global Variables
- `ones`: textual mapping of class indices.
- `year`: computed academic year for class queries.
- Leave quota/availed variables: `cleaves`, `sleaves`, `spleaves` plus their `_1` quota counterparts; consider object structure instead.
- `deleterequestID`: ephemeral ID for deletion requests.

This section documents front-end behaviors to complement back-end route and controller descriptions.

