const express = require('express');
const router = express.Router();

// Import v1 routes
const authRoutes = require('./auth.routes');
const studentRoutes = require('./student.routes');
const teacherRoutes = require('./teacher.routes');
const parentRoutes = require('./parent.routes');
const classRoutes = require('./class.routes');
const subjectRoutes = require('./subject.routes');
const bookRoutes = require('./book.routes');
const employeeRoutes = require('./employee.routes');
const expenseRoutes = require('./expense.routes');
const expenseLegacyRoutes = require('./expense-legacy.routes');
const feeRoutes = require('./fee.routes');
const feeTermRoutes = require('./fee-term.routes');
const feeStructureRoutes = require('./fee-structure.routes');
const transportRoutes = require('./transport.routes');
const dashboardRoutes = require('./dashboard.routes');
const parentPortalRoutes = require('./parent-portal.routes');
const studentPortalRoutes = require('./student-portal.routes');
const teacherPortalRoutes = require('./teacher-portal.routes');
const communicationRoutes = require('./communication.routes');
const academicYearRoutes = require('./academic-year.routes');
const leaveRoutes = require('./leave.routes');
const sessionHourRoutes = require('./session-hour.routes');
const sectionRoutes = require('./section.routes');
const examRoutes = require('./exam.routes');
const examScheduleRoutes = require('./exam-schedule.routes');
const timetableRoutes = require('./timetable.routes');
const holidayRoutes = require('./holiday.routes');
const markRoutes = require('./mark.routes');
const hostelRoutes = require('./hostel.routes');
const userRoutes = require('./user.routes');
const schoolRoutes = require('./school.routes');
const reportRoutes = require('./report.routes');
const assignmentRoutes = require('./assignment.routes');
const permissionRoutes = require('./permission.routes');
const roleRoutes = require('./role.routes');
const inventoryRoutes = require('./inventory.routes');
const studentExitRoutes = require('./student-exit.routes');
const libraryTransactionRoutes = require('./library-transaction.routes');
const librarySettingsRoutes = require('./library-settings.routes');
const attendanceRoutes = require('./attendance.routes');
const classTimetableRoutes = require('./class-timetable.routes');
const achievementRoutes = require('./achievement.routes');
const uploadRoutes = require('./upload.routes');
const subscriptionRoutes = require('./subscription.routes');
const contactRoutes = require('./contact.routes');




/**
 * V1 API Routes Aggregator
 * All v1 routes are mounted here
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/books', bookRoutes);
router.use('/employees', employeeRoutes);
router.use('/expenses', expenseRoutes);
router.use('/', expenseLegacyRoutes);
router.use('/fees', feeRoutes);
router.use('/fee-terms', feeTermRoutes);
router.use('/transport', transportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/', assignmentRoutes);
router.use('/parent', parentPortalRoutes);
router.use('/student', studentPortalRoutes);
router.use('/teacher', teacherPortalRoutes);
router.use('/academic-years', academicYearRoutes);
router.use('/leaves', leaveRoutes);
router.use('/session-hours', sessionHourRoutes);
router.use('/sections', sectionRoutes);
router.use('/exams', examRoutes);
router.use('/', examScheduleRoutes);
router.use('/', holidayRoutes);
router.use('/', markRoutes);
router.use('/', hostelRoutes);
router.use('/', userRoutes);
router.use('/', timetableRoutes);
router.use('/class-timetable', classTimetableRoutes);

// Achievement routes
router.use('/achievements', achievementRoutes);

// Upload routes (generic document/photo upload)
router.use('/uploads', uploadRoutes);




router.use('/', feeStructureRoutes);
router.use('/', communicationRoutes);
router.use('/', attendanceRoutes);

// Inventory management routes
router.use('/inventory', inventoryRoutes);

// Library management routes
router.use('/library/transactions', libraryTransactionRoutes);
router.use('/library/settings', librarySettingsRoutes);

// Student exit & certificate routes
router.use('/student-exits', studentExitRoutes);

// Admin management routes
router.use('/schools', schoolRoutes);
router.use('/permissions', permissionRoutes);
router.use('/roles', roleRoutes);

// Subscription / trial status
router.use('/subscription', subscriptionRoutes);
router.use('/', contactRoutes);

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to SMS API v1',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        me: 'GET /api/v1/auth/me',
        logout: 'POST /api/v1/auth/logout',
        logoutAll: 'POST /api/v1/auth/logout-all',
        forgotPassword: 'POST /api/v1/auth/forgot-pwd',
        resetPassword: 'POST /api/v1/auth/reset-password',
        changePassword: 'POST /api/v1/auth/change-password'
      },
      students: {
        list: 'GET /api/v1/students',
        get: 'GET /api/v1/students/:id',
        create: 'POST /api/v1/students',
        update: 'PUT /api/v1/students/:id',
        delete: 'DELETE /api/v1/students/:id',
        byClass: 'GET /api/v1/students/class/:classId',
        bySection: 'GET /api/v1/students/class/:classId/section/:sectionId'
      },
      teachers: {
        list: 'GET /api/v1/teachers',
        get: 'GET /api/v1/teachers/:id',
        create: 'POST /api/v1/teachers',
        update: 'PUT /api/v1/teachers/:id',
        delete: 'DELETE /api/v1/teachers/:id'
      },
      parents: {
        list: 'GET /api/v1/parents',
        get: 'GET /api/v1/parents/:id',
        create: 'POST /api/v1/parents',
        update: 'PUT /api/v1/parents/:id',
        delete: 'DELETE /api/v1/parents/:id'
      },
      classes: {
        list: 'GET /api/v1/classes',
        get: 'GET /api/v1/classes/:id',
        create: 'POST /api/v1/classes',
        update: 'PUT /api/v1/classes/:id',
        delete: 'DELETE /api/v1/classes/:id'
      },
      subjects: {
        list: 'GET /api/v1/subjects',
        get: 'GET /api/v1/subjects/:id',
        create: 'POST /api/v1/subjects',
        update: 'PUT /api/v1/subjects/:id',
        delete: 'DELETE /api/v1/subjects/:id'
      },
      sections: {
        byClass: 'GET /api/v1/sections/:classId',
        create: 'POST /api/v1/sections',
        update: 'PUT /api/v1/sections/:id',
        delete: 'DELETE /api/v1/sections/:id'
      },
      academicYears: {
        list: 'GET /api/v1/academic-years',
        current: 'GET /api/v1/academic-years/current',
        create: 'POST /api/v1/academic-years',
        update: 'PUT /api/v1/academic-years/:id',
        setCurrent: 'PATCH /api/v1/academic-years/:id/set-current',
        migrationDraft: 'POST /api/v1/academic-years/migration/draft',
        migrationFinalize: 'POST /api/v1/academic-years/migration/finalize'
      },
      leaves: {
        apply: 'POST /api/v1/leaves/apply',
        myLeaves: 'GET /api/v1/leaves/my',
        balance: 'GET /api/v1/leaves/balance',
        policies: 'GET /api/v1/leaves/policies',
        createPolicy: 'POST /api/v1/leaves/policies',
        updatePolicy: 'PUT /api/v1/leaves/policies/:id'
      },
      books: {
        list: 'GET /api/v1/books',
        get: 'GET /api/v1/books/:id',
        create: 'POST /api/v1/books',
        update: 'PUT /api/v1/books/:id',
        delete: 'DELETE /api/v1/books/:id',
        copies: 'GET /api/v1/books/:id/copies',
        addCopy: 'POST /api/v1/books/:id/copies',
        updateCopy: 'PUT /api/v1/books/copies/:copyId',
        deleteCopy: 'DELETE /api/v1/books/copies/:copyId',
        barcode: 'GET /api/v1/books/barcode/:barcode'
      },
      library: {
        transactions: 'GET /api/v1/library/transactions',
        issue: 'POST /api/v1/library/transactions/issue',
        return: 'POST /api/v1/library/transactions/:id/return',
        renew: 'POST /api/v1/library/transactions/:id/renew',
        overdue: 'GET /api/v1/library/transactions/overdue',
        payFine: 'POST /api/v1/library/transactions/:id/pay-fine',
        finePreview: 'GET /api/v1/library/transactions/:id/fine-preview',
        borrowerHistory: 'GET /api/v1/library/transactions/borrower/:type/:id',
        settings: 'GET /api/v1/library/settings',
        updateSettings: 'PUT /api/v1/library/settings',
        fineRules: 'GET /api/v1/library/settings/fine-rules',
        createFineRule: 'POST /api/v1/library/settings/fine-rules',
        updateFineRule: 'PUT /api/v1/library/settings/fine-rules/:id',
        deleteFineRule: 'DELETE /api/v1/library/settings/fine-rules/:id'
      },
      employees: {
        list: 'GET /api/v1/employees',
        create: 'POST /api/v1/employees',
        update: 'PUT /api/v1/employees/:eid',
        delete: 'DELETE /api/v1/employees/:eid'
      },
      expenses: {
        addLegacy: 'POST /api/v1/add-expense',
        add: 'POST /api/v1/expenses',
        list: 'GET /api/v1/expenses',
        delete: 'DELETE /api/v1/expenses/:eid'
      },
      fees: {
        list: 'GET /api/v1/fees',
        recordPayment: 'POST /api/v1/fees/payments',
        downloadReceipt: 'GET /api/v1/fees/payments/:paymentId/receipt',
        emailReceipt: 'POST /api/v1/fees/payments/:paymentId/email-receipt'
      },
      feeStructures: {
        list: 'GET /api/v1/fee-structures',
        update: 'PUT /api/v1/fee-structures/:cn',
        delete: 'DELETE /api/v1/fee-structures/:cn'
      },
      transport: {
        list: 'GET /api/v1/transport',
        get: 'GET /api/v1/transport/:id',
        create: 'POST /api/v1/transport',
        update: 'PUT /api/v1/transport/:id',
        delete: 'DELETE /api/v1/transport/:id'
      },
      sessionHours: {
        list: 'GET /api/v1/session-hours',
        create: 'POST /api/v1/session-hours',
        update: 'PUT /api/v1/session-hours/:id',
        delete: 'DELETE /api/v1/session-hours/:id'
      },
      exams: {
        list: 'GET /api/v1/exams'
      },
      marks: {
        list: 'GET /api/v1/marks',
        bulkUpsert: 'POST /api/v1/marks/bulk',
        listGrades: 'GET /api/v1/grades',
        getGrade: 'GET /api/v1/grades/:id',
        createGrade: 'POST /api/v1/grades',
        updateGrade: 'PUT /api/v1/grades/:id',
        deleteGrade: 'DELETE /api/v1/grades/:id'
      },
      examSchedules: {
        list: 'GET /api/v1/exam-schedules',
        create: 'POST /api/v1/examschedule',
        delete: 'DELETE /api/v1/delete-exam-schedule/:id'
      },
      dashboard: {
        summary: 'GET /api/v1/dashboard/summary',
        genderCounts: 'GET /api/v1/dashboard/gender-counts'
      },
      portals: {
        parent: 'GET /api/v1/parent/dashboard',
        student: 'GET /api/v1/student/dashboard',
        teacher: 'GET /api/v1/teacher/dashboard'
      },
      communications: {
        notices: 'GET /api/v1/notices',
        noticeById: 'GET /api/v1/notices/:nid',
        createNotice: 'POST /api/v1/notices',
        updateNotice: 'PUT /api/v1/notices/:nid',
        deleteNotice: 'DELETE /api/v1/notices/:nid',
        events: 'GET /api/v1/events',
        eventRegistrations: 'GET /api/v1/events/registrations',
        attendEvent: 'POST /api/v1/events/attend'
      },
      schools: {
        list: 'GET /api/v1/schools',
        get: 'GET /api/v1/schools/:id',
        create: 'POST /api/v1/schools',
        onboarding: 'POST /api/v1/schools/onboarding',
        update: 'PUT /api/v1/schools/:id',
        delete: 'DELETE /api/v1/schools/:id',
        branches: 'GET /api/v1/schools/:id/branches',
        createBranch: 'POST /api/v1/schools/:id/branches',
        checklist: 'GET /api/v1/schools/:id/onboarding-checklist',
        cloneSettings: 'POST /api/v1/schools/:id/clone-settings',
        getSettings: 'GET /api/v1/schools/:id/settings',
        updateSettings: 'PUT /api/v1/schools/:id/settings'
      },
      permissions: {
        list: 'GET /api/v1/permissions',
        rolePermissions: 'GET /api/v1/permissions/roles/:roleId',
        assign: 'PUT /api/v1/permissions/roles/:roleId'
      },
      roles: {
        list: 'GET /api/v1/roles',
        get: 'GET /api/v1/roles/:id',
        create: 'POST /api/v1/roles',
        update: 'PUT /api/v1/roles/:id',
        delete: 'DELETE /api/v1/roles/:id'
      },
      health: 'GET /api/v1/health'
    },
    authentication: 'All endpoints except /auth/login and /auth/refresh require Bearer token'
  });
});

module.exports = router;
