# Tenant Policy Matrix (Execution Tracker)

Purpose: enforce token-derived tenant boundaries for every protected API endpoint.

Scope baseline:
- Auth context source: JWT + server-side user load
- Authoritative tenant context: `req.authContext.schoolId` (and `req.authContext.branchId` when enabled)
- Non-authoritative client hint: `x-school-id`

Status legend:
- `not-started`
- `in-progress`
- `done`
- `blocked`

## Execution Rules

1. Every protected route must pass both checks:
   - capability check (`requirePermission` or role policy)
   - tenant boundary check (resource constrained to token tenant)
2. For object routes (`/:id`), object fetch must include tenant predicate in the same query.
3. `super_admin` behavior must be explicit per route (`global-read`, `tenant-selected-write`, or `deny`).
4. Tenant decision must never use `x-school-id` as the source of truth.

## Policy Columns

- Domain: route module domain
- Method: HTTP method
- Path: mounted API path
- Source File: route file and owner location
- Auth: auth middleware coverage
- Capability Gate: permission/role requirement
- Tenant Scope: `required` | `optional` | `global-only`
- Super Admin Mode: `global-read` | `tenant-selected-write` | `deny`
- Object Scope Check: `yes` if `/:id` or object-level access
- Service Scope Enforced: service/repository receives tenant context
- Negative Test: cross-tenant denied test exists
- Audit Event: deny/privileged event emitted
- Priority: `P0` critical | `P1` high | `P2` medium
- Owner: team/person
- Status: execution state
- Notes: implementation details

## P0 Routes (Seeded)

| Domain | Method | Path | Source File | Auth | Capability Gate | Tenant Scope | Super Admin Mode | Object Scope Check | Service Scope Enforced | Negative Test | Audit Event | Priority | Owner | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| auth | GET | /api/v1/auth/me | src/api/v1/routes/auth.routes.js | yes | authenticated user | required | global-read | no | yes | yes | yes | P0 | Identity Team | in-progress | req.authContext added with token metadata and tenant mismatch auditing; tenant mismatch deny test covers /api/v1/auth/me |
| students | GET | /api/v1/students | src/api/v1/routes/student.routes.js | yes | permission/role | required | tenant-selected-write | no | yes | yes | yes | P0 | Student Domain | in-progress | enforceTenant wired; auth middleware mismatch denial covered for route family |
| students | GET | /api/v1/students/:id | src/api/v1/routes/student.routes.js | yes | permission/role | required | tenant-selected-write | yes | yes | yes | yes | P0 | Student Domain | in-progress | enforceTenant wired; cross-tenant mismatch deny covered at auth layer |
| students | POST | /api/v1/students | src/api/v1/routes/student.routes.js | yes | permission/role | required | tenant-selected-write | no | yes | yes | yes | P0 | Student Domain | in-progress | enforceTenant wired and context util hardened |
| students | PUT | /api/v1/students/:id | src/api/v1/routes/student.routes.js | yes | permission/role | required | tenant-selected-write | yes | yes | yes | yes | P0 | Student Domain | in-progress | object path protected by tenant mismatch deny guard |
| students | DELETE | /api/v1/students/:id | src/api/v1/routes/student.routes.js | yes | permission/role | required | tenant-selected-write | yes | yes | yes | yes | P0 | Student Domain | in-progress | object path protected by tenant mismatch deny guard |
| teachers | GET | /api/v1/teachers | src/api/v1/routes/teacher.routes.js | yes | permission/role | required | tenant-selected-write | no | yes | yes | yes | P0 | Student Domain | in-progress | enforceTenant wired across teacher endpoints and mismatch deny tested |
| parents | GET | /api/v1/parents | src/api/v1/routes/parent.routes.js | yes | permission/role | required | tenant-selected-write | no | yes | yes | yes | P0 | Student Domain | in-progress | enforceTenant wired and parents:read gate added; mismatch deny tested |
| fees | GET | /api/v1/fees | src/api/v1/routes/fee.routes.js | yes | permission/role | required | tenant-selected-write | no | yes | yes | yes | P0 | Finance Domain | in-progress | enforceTenant wired on fee endpoints and mismatch deny covered |
| fees | POST | /api/v1/fees/payments | src/api/v1/routes/fee.routes.js | yes | permission/role | required | tenant-selected-write | yes | yes | yes | yes | P0 | Finance Domain | in-progress | enforceTenant wired; mismatch deny covered for payment route family |
| expenses | GET | /api/v1/expenses | src/api/v1/routes/expense.routes.js | yes | expenses:read | required | tenant-selected-write | no | yes | yes | yes | P0 | Finance Domain | in-progress | enforceTenant wired; legacy /add-expense route now uses enforceTenant + expenses:write; delete now scope-aware |
| reports | GET | /api/v1/reports/* | src/api/v1/routes/report.routes.js | yes | permission/role | required | global-read | yes | yes | yes | yes | P0 | Reporting Domain | in-progress | enforceTenant wired; explicit super_admin report-only and global-scope tests added |
| schools | GET | /api/v1/schools | src/api/v1/routes/school.routes.js | yes | schools:read | required | global-read | no | yes | yes | no | P0 | Admin Domain | in-progress | service/repository scope filters added for get/update/delete by school scope |
| schools | GET | /api/v1/schools/:id | src/api/v1/routes/school.routes.js | yes | schools:read | required | global-read | yes | yes | yes | no | P0 | Admin Domain | in-progress | controller and service now both enforce scoped school access |
| schools | POST | /api/v1/schools/:id/branches | src/api/v1/routes/school.routes.js | yes | schools:write | required | tenant-selected-write | yes | yes | yes | yes | P0 | Admin Domain | in-progress | enforceTenant wired in routes and controller access assertion present |

## P1 Route Modules (Fill Per Endpoint)

Populate one row per route definition from each file.

| Module | Route File | Mounted Prefix | Priority | Owner | Status |
|---|---|---|---|---|---|
| classes | src/api/v1/routes/class.routes.js | /api/v1/classes | P1 | Academic Domain | in-progress |
| sections | src/api/v1/routes/section.routes.js | /api/v1/sections | P1 | Academic Domain | in-progress |
| subjects | src/api/v1/routes/subject.routes.js | /api/v1/subjects | P1 | Academic Domain | in-progress |
| academic-years | src/api/v1/routes/academic-year.routes.js | /api/v1/academic-years | P1 | Academic Domain | in-progress |
| attendance | src/api/v1/routes/attendance.routes.js | /api/v1/* | P1 | Academic Domain | in-progress |
| marks | src/api/v1/routes/mark.routes.js | /api/v1/* | P1 | Academic Domain | in-progress |
| exams | src/api/v1/routes/exam.routes.js | /api/v1/exams | P1 | Academic Domain | in-progress |
| exam-schedule | src/api/v1/routes/exam-schedule.routes.js | /api/v1/* | P1 | Academic Domain | in-progress |
| dashboard | src/api/v1/routes/dashboard.routes.js | /api/v1/dashboard | P1 | Reporting Domain | in-progress |
| users | src/api/v1/routes/user.routes.js | /api/v1/* | P1 | Admin Domain | in-progress |
| roles | src/api/v1/routes/role.routes.js | /api/v1/roles | P1 | Admin Domain | in-progress |
| permissions | src/api/v1/routes/permission.routes.js | /api/v1/permissions | P1 | Admin Domain | in-progress |
| communication | src/api/v1/routes/communication.routes.js | /api/v1/* | P1 | Engagement Domain | in-progress |
| uploads | src/api/v1/routes/upload.routes.js | /api/v1/uploads | P1 | Platform Team | in-progress |
| library transactions | src/api/v1/routes/library-transaction.routes.js | /api/v1/library/transactions | P1 | Library Domain | in-progress |
| library settings | src/api/v1/routes/library-settings.routes.js | /api/v1/library/settings | P1 | Library Domain | in-progress |
| employee | src/api/v1/routes/employee.routes.js | /api/v1/employees | P1 | HR Domain | in-progress |
| inventory | src/api/v1/routes/inventory.routes.js | /api/v1/inventory | P1 | Ops Domain | in-progress |

## P2 Route Modules (Fill Per Endpoint)

| Module | Route File | Mounted Prefix | Priority | Owner | Status |
|---|---|---|---|---|---|
| hostel | src/api/v1/routes/hostel.routes.js | /api/v1/* | P2 | Ops Domain | in-progress |
| transport | src/api/v1/routes/transport.routes.js | /api/v1/transport | P2 | Ops Domain | in-progress |
| timetable | src/api/v1/routes/timetable.routes.js | /api/v1/* | P2 | Academic Domain | in-progress |
| class timetable | src/api/v1/routes/class-timetable.routes.js | /api/v1/class-timetable | P2 | Academic Domain | in-progress |
| student exit | src/api/v1/routes/student-exit.routes.js | /api/v1/student-exits | P2 | Student Domain | in-progress |
| leave | src/api/v1/routes/leave.routes.js | /api/v1/leaves | P2 | HR Domain | in-progress |
| subscription | src/api/v1/routes/subscription.routes.js | /api/v1/subscription | P2 | Platform Team | in-progress |
| portal-parent | src/api/v1/routes/parent-portal.routes.js | /api/v1/parent | P2 | Portal Team | in-progress |
| portal-student | src/api/v1/routes/student-portal.routes.js | /api/v1/student | P2 | Portal Team | in-progress |
| portal-teacher | src/api/v1/routes/teacher-portal.routes.js | /api/v1/teacher | P2 | Portal Team | in-progress |

## Endpoint Fill Template (Copy/Paste)

| Domain | Method | Path | Source File | Auth | Capability Gate | Tenant Scope | Super Admin Mode | Object Scope Check | Service Scope Enforced | Negative Test | Audit Event | Priority | Owner | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| <domain> | <GET/POST/PUT/PATCH/DELETE> | <mounted path> | <route file> | <yes/no> | <permission/role> | <required/optional/global-only> | <global-read/tenant-selected-write/deny> | <yes/no> | <yes/no> | <yes/no> | <yes/no> | <P0/P1/P2> | <team> | <not-started/in-progress/done/blocked> | <notes> |

## Suggested First 10 Tasks

1. Add `req.authContext` contract in auth middleware and freeze it.
2. Add tenant mismatch audit event helper used by controllers/services.
3. Enforce object-scope lookup in student by-id service methods.
4. Enforce list-scope filtering in student list/search endpoints.
5. Enforce parent list/get scoping with linked-student tenant checks.
6. Enforce fee payment target tenant validation.
7. Enforce expense list and delete tenant constraints (including legacy endpoint).
8. Enforce school controller checks with `req.schoolId` before id-based operations.
9. Add integration tests for cross-tenant deny on P0 endpoints.
10. Add CI gate that fails when P0 rows have `Service Scope Enforced = no` or `Negative Test = no`.

## Phase Notes

- Phase 1 updates completed in code:
   - Production-only mandatory JWT issuer/audience validation in auth verify/sign flow (`JWT_ISSUER`, `JWT_AUDIENCE`).
   - Access-token branch strategy added via `bid` claim and tenant alias `tid` while preserving existing `schoolId` compatibility claim.
   - Auth decision metrics pipeline added through structured `AUTH_METRIC` events (success, token errors, tenant mismatch, config errors).
