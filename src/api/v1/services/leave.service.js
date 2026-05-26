const leavePolicyRepository = require('../repositories/leave-policy.repository');
const leaveRequestRepository = require('../repositories/leave-request.repository');
const leavePeriodAssignmentRepository = require('../repositories/leave-period-assignment.repository');
const { AppError } = require('../../../middleware/error.middleware');

const LEAVE_TYPES = ['casual', 'sick', 'special'];
const LEAVE_DURATION_TYPES = ['full_day', 'half_day_first', 'half_day_second', 'custom_periods'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

class LeaveService {
  requireSchoolId(context = {}) {
    if (context.schoolId) {
      return context.schoolId;
    }
    throw new AppError('School context is required', 400);
  }

  requireUserId(context = {}) {
    if (context.userId) {
      return context.userId;
    }
    throw new AppError('User context is required', 400);
  }

  parseYear(value, { required = false } = {}) {
    if (typeof value === 'undefined' || value === null || value === '') {
      if (required) {
        throw new AppError('Year is required', 400);
      }
      return null;
    }

    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 2000 || parsed > 9999) {
      throw new AppError('Year must be a valid number between 2000 and 9999', 400);
    }
    return parsed;
  }

  parseAllowance(value, label, { required = true } = {}) {
    if (typeof value === 'undefined' || value === null || value === '') {
      if (required) {
        throw new AppError(`${label} is required`, 400);
      }
      return null;
    }

    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new AppError(`${label} must be zero or a positive number`, 400);
    }
    return parsed;
  }

  normalizePolicyPayload(payload = {}, options = {}) {
    const allowPartial = Boolean(options.allowPartial);
    const normalized = {};

    if (allowPartial) {
      if (Object.prototype.hasOwnProperty.call(payload, 'year')) {
        normalized.year = this.parseYear(payload.year, { required: true });
      }
    } else {
      normalized.year = this.parseYear(payload.year, { required: true });
    }

    const allowanceFields = [
      { key: 'casual_leaves', value: payload.casualLeaves ?? payload.casual_leaves, label: 'Casual leaves' },
      { key: 'sick_leaves', value: payload.sickLeaves ?? payload.sick_leaves, label: 'Sick leaves' },
      { key: 'special_leaves', value: payload.specialLeaves ?? payload.special_leaves, label: 'Special leaves' },
    ];

    allowanceFields.forEach(({ key, value, label }) => {
      if (allowPartial) {
        if (typeof value !== 'undefined') {
          normalized[key] = this.parseAllowance(value, label, { required: true });
        }
      } else {
        normalized[key] = this.parseAllowance(value, label, { required: true });
      }
    });

    if (Object.prototype.hasOwnProperty.call(payload, 'isActive')) {
      normalized.is_active = Boolean(payload.isActive);
    }

    return normalized;
  }

  calculateDurationDays(startDateValue, endDateValue) {
    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError('Start date and end date must be valid dates', 400);
    }

    if (endDate < startDate) {
      throw new AppError('End date must be after start date', 400);
    }

    const msInDay = 24 * 60 * 60 * 1000;
    const duration = (endDate - startDate) / msInDay + 1;
    return Number(duration.toFixed(2));
  }

  normalizeLeaveType(value) {
    if (!value && value !== 0) {
      return 'casual';
    }
    const normalized = String(value).toLowerCase().trim();
    if (!LEAVE_TYPES.includes(normalized)) {
      throw new AppError(`Unsupported leave type. Allowed types: ${LEAVE_TYPES.join(', ')}`, 400);
    }
    return normalized;
  }

  normalizeDateOnly(value, label) {
    const text = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new AppError(`${label} must be a valid date in YYYY-MM-DD format`, 400);
    }
    return text;
  }

  enumerateDates(startDateText, endDateText) {
    const [startY, startM, startD] = startDateText.split('-').map((v) => parseInt(v, 10));
    const [endY, endM, endD] = endDateText.split('-').map((v) => parseInt(v, 10));
    const start = new Date(Date.UTC(startY, startM - 1, startD));
    const end = new Date(Date.UTC(endY, endM - 1, endD));
    const dates = [];

    for (let current = new Date(start.getTime()); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      dates.push(current.toISOString().slice(0, 10));
    }

    return dates;
  }

  getDayName(dateText) {
    const [year, month, day] = dateText.split('-').map((v) => parseInt(v, 10));
    const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return DAY_NAMES[index];
  }

  normalizeDurationType(value) {
    if (typeof value === 'undefined' || value === null || value === '') {
      return 'full_day';
    }

    const normalized = String(value).trim().toLowerCase();
    if (!LEAVE_DURATION_TYPES.includes(normalized)) {
      throw new AppError(
        `Unsupported leave duration type. Allowed types: ${LEAVE_DURATION_TYPES.join(', ')}`,
        400
      );
    }

    return normalized;
  }

  parsePeriodIds(periodIds) {
    if (typeof periodIds === 'undefined' || periodIds === null) {
      return [];
    }

    if (!Array.isArray(periodIds)) {
      throw new AppError('periodIds must be an array of positive integers', 400);
    }

    const normalized = periodIds.map((value) => {
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        throw new AppError('Each period id must be a positive integer', 400);
      }
      return parsed;
    });

    return [...new Set(normalized)];
  }

  pickSlotsByDuration(daySlots, durationType, customPeriodIds = []) {
    const sorted = [...daySlots].sort(
      (a, b) => (a.periodNumber || 0) - (b.periodNumber || 0) || (a.periodId || 0) - (b.periodId || 0)
    );

    if (durationType === 'full_day') {
      return sorted;
    }

    if (durationType === 'custom_periods') {
      return sorted.filter((slot) => customPeriodIds.includes(slot.periodId));
    }

    if (sorted.length === 0) {
      return [];
    }

    const halfLength = Math.ceil(sorted.length / 2);
    if (durationType === 'half_day_first') {
      return sorted.slice(0, halfLength);
    }

    return sorted.slice(halfLength);
  }

  buildSlotKey(slotDate, timetableId) {
    return `${slotDate}::${timetableId}`;
  }

  isWithinEffectiveRange(dateText, effectiveFrom, effectiveTo) {
    if (effectiveFrom && dateText < String(effectiveFrom)) {
      return false;
    }
    if (effectiveTo && dateText > String(effectiveTo)) {
      return false;
    }
    return true;
  }

  buildMissingSlotText(slot) {
    return `${slot.date} period-${slot.periodNumber || slot.periodId}`;
  }

  async resolveTeacherCoverage(payload, context = {}, options = {}) {
    const requireMappings = options.requireMappings !== false;
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);

    const teacher = await leaveRequestRepository.findTeacherByUserId(userId, schoolId);
    if (!teacher) {
      return {
        teacher: null,
        affectedSlots: [],
        normalizedMappings: [],
        durationType: 'full_day',
      };
    }

    const durationType = this.normalizeDurationType(payload.leaveDurationType);
    const customPeriodIds = this.parsePeriodIds(payload.periodIds);
    const startDate = this.normalizeDateOnly(payload.startDate || payload.start_date, 'Start date');
    const endDate = this.normalizeDateOnly(payload.endDate || payload.end_date, 'End date');

    if (durationType !== 'full_day' && startDate !== endDate) {
      throw new AppError('Half-day/custom period leave can only be applied for a single day', 400);
    }

    if (durationType === 'custom_periods' && customPeriodIds.length === 0) {
      throw new AppError('periodIds are required when leaveDurationType is custom_periods', 400);
    }

    const leaveDates = this.enumerateDates(startDate, endDate);
    const dayNames = [...new Set(leaveDates.map((dateText) => this.getDayName(dateText)))];
    const timetableRows = await leaveRequestRepository.findTeacherTimetableByDays({
      teacherId: teacher.id,
      schoolId,
      dayNames,
    });

    const slotsByDay = timetableRows.reduce((acc, row) => {
      const dayName = row.day_of_week;
      if (!acc[dayName]) {
        acc[dayName] = [];
      }

      if (row.period?.is_break) {
        return acc;
      }

      acc[dayName].push({
        timetableId: row.id,
        periodId: row.period_id,
        periodNumber: row.period?.period_number,
        periodName: row.period?.period_name,
        startTime: row.period?.start_time,
        endTime: row.period?.end_time,
        classId: row.class_id,
        sectionId: row.section_id,
        subjectId: row.subject_id,
        subjectName: row.subject?.name || null,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      });

      return acc;
    }, {});

    const affectedSlots = [];
    leaveDates.forEach((dateText) => {
      const dayName = this.getDayName(dateText);
      const daySlots = (slotsByDay[dayName] || []).filter((slot) =>
        this.isWithinEffectiveRange(dateText, slot.effectiveFrom, slot.effectiveTo)
      );
      const selected = this.pickSlotsByDuration(daySlots, durationType, customPeriodIds);

      selected.forEach((slot) => {
        affectedSlots.push({
          ...slot,
          date: dateText,
          dayOfWeek: dayName,
          originalTeacherId: teacher.id,
        });
      });
    });

    if (affectedSlots.length === 0) {
      return {
        teacher,
        affectedSlots,
        normalizedMappings: [],
        durationType,
      };
    }

    const periodMappings = payload.periodMappings;
    if (!Array.isArray(periodMappings) || periodMappings.length === 0) {
      if (!requireMappings) {
        return {
          teacher,
          affectedSlots,
          normalizedMappings: [],
          durationType,
        };
      }

      throw new AppError('Period mappings are required for all affected periods in teacher leave requests', 400);
    }

    const affectedByKey = new Map();
    affectedSlots.forEach((slot) => {
      affectedByKey.set(this.buildSlotKey(slot.date, slot.timetableId), slot);
    });

    const normalizedMappings = [];
    const mappedKeys = new Set();

    periodMappings.forEach((mapping, index) => {
      const mappedDate = this.normalizeDateOnly(mapping.date, `periodMappings[${index}].date`);
      const timetableId = parseInt(mapping.timetableId, 10);
      if (Number.isNaN(timetableId) || timetableId < 1) {
        throw new AppError(`periodMappings[${index}].timetableId must be a positive integer`, 400);
      }

      const key = this.buildSlotKey(mappedDate, timetableId);
      const slot = affectedByKey.get(key);
      if (!slot) {
        throw new AppError(
          `periodMappings[${index}] does not match an affected slot (${mappedDate}, timetable ${timetableId})`,
          400
        );
      }

      if (mappedKeys.has(key)) {
        throw new AppError(`Duplicate mapping provided for slot ${mappedDate} timetable ${timetableId}`, 400);
      }

      const substituteTeacherId =
        typeof mapping.substituteTeacherId === 'undefined' || mapping.substituteTeacherId === null
          ? null
          : parseInt(mapping.substituteTeacherId, 10);
      const substituteSubjectId =
        typeof mapping.substituteSubjectId === 'undefined' || mapping.substituteSubjectId === null
          ? null
          : parseInt(mapping.substituteSubjectId, 10);

      if (!substituteTeacherId && !substituteSubjectId) {
        throw new AppError(
          `periodMappings[${index}] must include substituteTeacherId or substituteSubjectId`,
          400
        );
      }

      if (substituteTeacherId && substituteTeacherId === teacher.id) {
        throw new AppError(`periodMappings[${index}] substituteTeacherId must be different from leave teacher`, 400);
      }

      mappedKeys.add(key);
      normalizedMappings.push({
        slot,
        substituteTeacherId,
        substituteSubjectId,
        assignmentType: substituteTeacherId ? 'teacher_substitution' : 'subject_reallocation',
        notes: typeof mapping.notes === 'string' ? mapping.notes.trim().slice(0, 255) : null,
      });
    });

    const missingSlots = affectedSlots.filter((slot) => !mappedKeys.has(this.buildSlotKey(slot.date, slot.timetableId)));
    if (missingSlots.length > 0 && requireMappings) {
      const preview = missingSlots.slice(0, 5).map((slot) => this.buildMissingSlotText(slot)).join(', ');
      throw new AppError(
        `Mappings are missing for ${missingSlots.length} affected period(s): ${preview}`,
        400
      );
    }

    return {
      teacher,
      affectedSlots,
      normalizedMappings,
      durationType,
    };
  }

  buildUsageMap(rows = []) {
    const usage = {
      casual: 0,
      sick: 0,
      special: 0,
    };

    rows.forEach((row) => {
      const type = row.leave_type || row.get?.('leave_type');
      if (!type || !Object.prototype.hasOwnProperty.call(usage, type)) {
        return;
      }
      const total = row.get ? row.get('total') : row.total;
      usage[type] = Number.parseFloat(total) || 0;
    });

    return usage;
  }

  getAllowanceMap(policy) {
    return {
      casual: policy.casual_leaves ?? 0,
      sick: policy.sick_leaves ?? 0,
      special: policy.special_leaves ?? 0,
    };
  }

  async getPolicies(filters = {}, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const parsedFilters = {
      schoolId,
      includeInactive: Boolean(filters.includeInactive),
    };

    if (typeof filters.year !== 'undefined') {
      parsedFilters.year = this.parseYear(filters.year, { required: true });
    }

    return leavePolicyRepository.findAll(parsedFilters);
  }

  async createPolicy(payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const normalized = this.normalizePolicyPayload(payload);

    const existing = await leavePolicyRepository.findByYear(normalized.year, { schoolId });

    if (existing) {
      throw new AppError(`Leave policy for ${normalized.year} already exists`, 409);
    }

    return leavePolicyRepository.create({
      school_id: schoolId,
      ...normalized,
    });
  }

  async updatePolicy(id, payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const normalized = this.normalizePolicyPayload(payload, { allowPartial: true });

    if (normalized.year) {
      const duplicate = await leavePolicyRepository.findByYear(normalized.year, { schoolId });
      if (duplicate && duplicate.id !== Number(id)) {
        throw new AppError(`Another leave policy already exists for ${normalized.year}`, 409);
      }
    }

    return leavePolicyRepository.update(id, normalized, { schoolId });
  }

  formatLeaveRequest(row, assignments = []) {
    const data = row?.toJSON ? row.toJSON() : row;
    const requesterPerson = data?.requester?.person;
    const approverPerson = data?.approver?.person;

    return {
      ...data,
      requesterName: requesterPerson
        ? `${requesterPerson.first_name || ''} ${requesterPerson.last_name || ''}`.trim()
        : null,
      approverName: approverPerson
        ? `${approverPerson.first_name || ''} ${approverPerson.last_name || ''}`.trim()
        : null,
      assignments,
    };
  }

  formatAssignment(row) {
    const data = row?.toJSON ? row.toJSON() : row;
    const originalPerson = data?.originalTeacher?.person;
    const substitutePerson = data?.substituteTeacher?.person;

    return {
      ...data,
      originalTeacherName: originalPerson
        ? `${originalPerson.first_name || ''} ${originalPerson.last_name || ''}`.trim()
        : null,
      substituteTeacherName: substitutePerson
        ? `${substitutePerson.first_name || ''} ${substitutePerson.last_name || ''}`.trim()
        : null,
      substituteSubjectName: data?.substituteSubject?.name || null,
    };
  }

  normalizeDecisionStatus(value) {
    const status = String(value || '').trim().toLowerCase();
    if (!LEAVE_REQUEST_STATUSES.includes(status)) {
      throw new AppError(`Unsupported status. Allowed statuses: ${LEAVE_REQUEST_STATUSES.join(', ')}`, 400);
    }
    return status;
  }

  normalizeApprovalAssignments(assignments = [], leaveRequest, schoolId) {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return [];
    }

    return assignments.map((row, index) => {
      const timetableId = parseInt(row.timetableId ?? row.timetable_id, 10);
      const periodId = parseInt(row.periodId ?? row.period_id, 10);
      const classId = parseInt(row.classId ?? row.class_id, 10);
      const sectionId = parseInt(row.sectionId ?? row.section_id, 10);
      const originalTeacherId = parseInt(row.originalTeacherId ?? row.original_teacher_id, 10);

      if (!timetableId || !periodId || !classId || !sectionId || !originalTeacherId) {
        throw new AppError(`assignments[${index}] is missing required timetable/class/section/period/teacher fields`, 400);
      }

      const assignmentDate = this.normalizeDateOnly(
        row.assignmentDate ?? row.assignment_date,
        `assignments[${index}].assignmentDate`
      );

      const substituteTeacherId = row.substituteTeacherId || row.substitute_teacher_id
        ? parseInt(row.substituteTeacherId ?? row.substitute_teacher_id, 10)
        : null;
      const substituteSubjectId = row.substituteSubjectId || row.substitute_subject_id
        ? parseInt(row.substituteSubjectId ?? row.substitute_subject_id, 10)
        : null;

      if (!substituteTeacherId && !substituteSubjectId) {
        throw new AppError(`assignments[${index}] must include substituteTeacherId or substituteSubjectId`, 400);
      }

      if (substituteTeacherId && substituteTeacherId === originalTeacherId) {
        throw new AppError(`assignments[${index}] substituteTeacherId must be different from originalTeacherId`, 400);
      }

      return {
        leave_request_id: leaveRequest.id,
        school_id: schoolId,
        timetable_id: timetableId,
        assignment_date: assignmentDate,
        class_id: classId,
        section_id: sectionId,
        period_id: periodId,
        original_teacher_id: originalTeacherId,
        substitute_teacher_id: substituteTeacherId,
        substitute_subject_id: substituteSubjectId,
        assignment_type: substituteTeacherId ? 'teacher_substitution' : 'subject_reallocation',
        notes: typeof row.notes === 'string' ? row.notes.trim().slice(0, 255) : null,
        status: row.status || 'planned',
      };
    });
  }

  async getCoveragePreview(payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);
    const coverage = await this.resolveTeacherCoverage(payload, { schoolId, userId }, { requireMappings: false });

    return {
      leaveDurationType: coverage.durationType,
      affectedPeriodsCount: coverage.affectedSlots.length,
      affectedPeriods: coverage.affectedSlots,
    };
  }

  async getApprovalQueue(filters = {}, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const requests = await leaveRequestRepository.findForApproval({
      schoolId,
      status: filters.status || 'pending',
      page: filters.page,
      limit: filters.limit,
    });

    const mappedRows = await Promise.all(
      (requests.leaves || []).map(async (leaveRequest) => {
        const assignmentRows = await leavePeriodAssignmentRepository.findByLeaveRequestId(leaveRequest.id, schoolId);
        return this.formatLeaveRequest(
          leaveRequest,
          assignmentRows.map((row) => this.formatAssignment(row))
        );
      })
    );

    return {
      ...requests,
      leaves: mappedRows,
    };
  }

  async getApprovalRequestById(id, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const leaveRequest = await leaveRequestRepository.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    const assignmentRows = await leavePeriodAssignmentRepository.findByLeaveRequestId(leaveRequest.id, schoolId);
    return this.formatLeaveRequest(
      leaveRequest,
      assignmentRows.map((row) => this.formatAssignment(row))
    );
  }

  async updateApprovalAssignments(id, payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const leaveRequest = await leaveRequestRepository.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    const normalizedAssignments = this.normalizeApprovalAssignments(payload.assignments, leaveRequest, schoolId);
    await leavePeriodAssignmentRepository.replaceByLeaveRequestId(leaveRequest.id, schoolId, normalizedAssignments);

    return this.getApprovalRequestById(leaveRequest.id, { schoolId });
  }

  async decideApprovalRequest(id, payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);
    const leaveRequest = await leaveRequestRepository.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    const nextStatus = this.normalizeDecisionStatus(payload.status);
    if (!['approved', 'rejected', 'cancelled'].includes(nextStatus)) {
      throw new AppError('Status transition is limited to approved, rejected, or cancelled', 400);
    }

    if (nextStatus === 'approved') {
      const assignmentRows = await leavePeriodAssignmentRepository.findByLeaveRequestId(leaveRequest.id, schoolId);
      if (assignmentRows.length === 0) {
        const coverage = await this.resolveTeacherCoverage(
          {
            startDate: leaveRequest.start_date,
            endDate: leaveRequest.end_date,
            leaveDurationType: 'full_day',
          },
          { schoolId, userId: leaveRequest.user_id },
          { requireMappings: false }
        );

        if (coverage.affectedSlots.length > 0) {
          throw new AppError('Cannot approve leave until affected periods are mapped', 400);
        }
      }
    }

    const comments = typeof payload.comments === 'string' ? payload.comments.trim().slice(0, 255) : null;
    await leaveRequestRepository.updateDecision(leaveRequest.id, schoolId, {
      status: nextStatus,
      approver_id: userId,
      decided_at: new Date(),
      comments,
    });

    return this.getApprovalRequestById(leaveRequest.id, { schoolId });
  }

  formatLeaveRequest(row, assignments = []) {
    const data = row?.toJSON ? row.toJSON() : row;
    const requesterPerson = data?.requester?.person;
    const approverPerson = data?.approver?.person;

    return {
      ...data,
      requesterName: requesterPerson
        ? `${requesterPerson.first_name || ''} ${requesterPerson.last_name || ''}`.trim()
        : null,
      approverName: approverPerson
        ? `${approverPerson.first_name || ''} ${approverPerson.last_name || ''}`.trim()
        : null,
      assignments,
    };
  }

  formatAssignment(row) {
    const data = row?.toJSON ? row.toJSON() : row;
    const originalPerson = data?.originalTeacher?.person;
    const substitutePerson = data?.substituteTeacher?.person;

    return {
      ...data,
      originalTeacherName: originalPerson
        ? `${originalPerson.first_name || ''} ${originalPerson.last_name || ''}`.trim()
        : null,
      substituteTeacherName: substitutePerson
        ? `${substitutePerson.first_name || ''} ${substitutePerson.last_name || ''}`.trim()
        : null,
      substituteSubjectName: data?.substituteSubject?.name || null,
    };
  }

  normalizeDecisionStatus(value) {
    const status = String(value || '').trim().toLowerCase();
    if (!LEAVE_REQUEST_STATUSES.includes(status)) {
      throw new AppError(`Unsupported status. Allowed statuses: ${LEAVE_REQUEST_STATUSES.join(', ')}`, 400);
    }
    return status;
  }

  normalizeApprovalAssignments(assignments = [], leaveRequest, schoolId) {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return [];
    }

    return assignments.map((row, index) => {
      const timetableId = parseInt(row.timetableId ?? row.timetable_id, 10);
      const periodId = parseInt(row.periodId ?? row.period_id, 10);
      const classId = parseInt(row.classId ?? row.class_id, 10);
      const sectionId = parseInt(row.sectionId ?? row.section_id, 10);
      const originalTeacherId = parseInt(row.originalTeacherId ?? row.original_teacher_id, 10);

      if (!timetableId || !periodId || !classId || !sectionId || !originalTeacherId) {
        throw new AppError(`assignments[${index}] is missing required timetable/class/section/period/teacher fields`, 400);
      }

      const assignmentDate = this.normalizeDateOnly(
        row.assignmentDate ?? row.assignment_date,
        `assignments[${index}].assignmentDate`
      );

      const substituteTeacherId = row.substituteTeacherId || row.substitute_teacher_id
        ? parseInt(row.substituteTeacherId ?? row.substitute_teacher_id, 10)
        : null;
      const substituteSubjectId = row.substituteSubjectId || row.substitute_subject_id
        ? parseInt(row.substituteSubjectId ?? row.substitute_subject_id, 10)
        : null;

      if (!substituteTeacherId && !substituteSubjectId) {
        throw new AppError(`assignments[${index}] must include substituteTeacherId or substituteSubjectId`, 400);
      }

      if (substituteTeacherId && substituteTeacherId === originalTeacherId) {
        throw new AppError(`assignments[${index}] substituteTeacherId must be different from originalTeacherId`, 400);
      }

      return {
        leave_request_id: leaveRequest.id,
        school_id: schoolId,
        timetable_id: timetableId,
        assignment_date: assignmentDate,
        class_id: classId,
        section_id: sectionId,
        period_id: periodId,
        original_teacher_id: originalTeacherId,
        substitute_teacher_id: substituteTeacherId,
        substitute_subject_id: substituteSubjectId,
        assignment_type: substituteTeacherId ? 'teacher_substitution' : 'subject_reallocation',
        notes: typeof row.notes === 'string' ? row.notes.trim().slice(0, 255) : null,
        status: row.status || 'planned',
      };
    });
  }

  async getCoveragePreview(payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);
    const coverage = await this.resolveTeacherCoverage(payload, { schoolId, userId }, { requireMappings: false });

    return {
      leaveDurationType: coverage.durationType,
      affectedPeriodsCount: coverage.affectedSlots.length,
      affectedPeriods: coverage.affectedSlots,
    };
  }

  async getApprovalQueue(filters = {}, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const requests = await leaveRequestRepository.findForApproval({
      schoolId,
      status: filters.status || 'pending',
      page: filters.page,
      limit: filters.limit,
    });

    const mappedRows = await Promise.all(
      (requests.leaves || []).map(async (leaveRequest) => {
        const assignmentRows = await leavePeriodAssignmentRepository.findByLeaveRequestId(leaveRequest.id, schoolId);
        return this.formatLeaveRequest(
          leaveRequest,
          assignmentRows.map((row) => this.formatAssignment(row))
        );
      })
    );

    return {
      ...requests,
      leaves: mappedRows,
    };
  }

  async getApprovalRequestById(id, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const leaveRequest = await leaveRequestRepository.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    const assignmentRows = await leavePeriodAssignmentRepository.findByLeaveRequestId(leaveRequest.id, schoolId);
    return this.formatLeaveRequest(
      leaveRequest,
      assignmentRows.map((row) => this.formatAssignment(row))
    );
  }

  async updateApprovalAssignments(id, payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const leaveRequest = await leaveRequestRepository.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    const normalizedAssignments = this.normalizeApprovalAssignments(payload.assignments, leaveRequest, schoolId);
    await leavePeriodAssignmentRepository.replaceByLeaveRequestId(leaveRequest.id, schoolId, normalizedAssignments);

    return this.getApprovalRequestById(leaveRequest.id, { schoolId });
  }

  async decideApprovalRequest(id, payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);
    const leaveRequest = await leaveRequestRepository.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    const nextStatus = this.normalizeDecisionStatus(payload.status);
    if (!['approved', 'rejected', 'cancelled'].includes(nextStatus)) {
      throw new AppError('Status transition is limited to approved, rejected, or cancelled', 400);
    }

    if (nextStatus === 'approved') {
      const assignmentRows = await leavePeriodAssignmentRepository.findByLeaveRequestId(leaveRequest.id, schoolId);
      if (assignmentRows.length === 0) {
        const coverage = await this.resolveTeacherCoverage(
          {
            startDate: leaveRequest.start_date,
            endDate: leaveRequest.end_date,
            leaveDurationType: 'full_day',
          },
          { schoolId, userId: leaveRequest.user_id },
          { requireMappings: false }
        );

        if (coverage.affectedSlots.length > 0) {
          throw new AppError('Cannot approve leave until affected periods are mapped', 400);
        }
      }
    }

    const comments = typeof payload.comments === 'string' ? payload.comments.trim().slice(0, 255) : null;
    await leaveRequestRepository.updateDecision(leaveRequest.id, schoolId, {
      status: nextStatus,
      approver_id: userId,
      decided_at: new Date(),
      comments,
    });

    return this.getApprovalRequestById(leaveRequest.id, { schoolId });
  }

  async applyLeave(payload, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);

    const reason = (payload.reason || '').trim();
    if (!reason) {
      throw new AppError('Reason is required', 400);
    }

    const leaveType = this.normalizeLeaveType(payload.leaveType || payload.leave_type);
    const durationDays = this.calculateDurationDays(payload.startDate || payload.start_date, payload.endDate || payload.end_date);
    const fallbackYear = new Date(payload.startDate || payload.start_date).getFullYear();
    const year = this.parseYear(payload.year ?? fallbackYear, { required: true });

    const policy = await leavePolicyRepository.findByYear(year, { schoolId });
    if (!policy) {
      throw new AppError(`Leave policy for ${year} is not configured`, 404);
    }

    const usageRows = await leaveRequestRepository.sumApprovedByType({
      userId,
      schoolId,
      year: policy.year,
    });
    const usage = this.buildUsageMap(usageRows);
    const allowance = this.getAllowanceMap(policy);

    if ((usage[leaveType] || 0) + durationDays > allowance[leaveType]) {
      throw new AppError(`Insufficient ${leaveType} leave balance`, 400);
    }

    const coverage = await this.resolveTeacherCoverage(payload, { schoolId, userId });

    const leaveRequest = await leaveRequestRepository.create({
      school_id: schoolId,
      user_id: userId,
      policy_id: policy.id,
      leave_type: leaveType,
      start_date: payload.startDate || payload.start_date,
      end_date: payload.endDate || payload.end_date,
      total_days: durationDays,
      reason,
      status: 'pending',
    });

    if (coverage.normalizedMappings.length > 0) {
      const assignmentRows = coverage.normalizedMappings.map((mapping) => ({
        leave_request_id: leaveRequest.id,
        school_id: schoolId,
        timetable_id: mapping.slot.timetableId,
        assignment_date: mapping.slot.date,
        class_id: mapping.slot.classId,
        section_id: mapping.slot.sectionId,
        period_id: mapping.slot.periodId,
        original_teacher_id: mapping.slot.originalTeacherId,
        substitute_teacher_id: mapping.substituteTeacherId,
        substitute_subject_id: mapping.substituteSubjectId,
        assignment_type: mapping.assignmentType,
        notes: mapping.notes,
        status: 'planned',
      }));

      await leavePeriodAssignmentRepository.bulkCreate(assignmentRows);
    }

    const leaveData = leaveRequest.toJSON ? leaveRequest.toJSON() : leaveRequest;
    return {
      ...leaveData,
      coverage: {
        leaveDurationType: coverage.durationType,
        affectedPeriodsCount: coverage.affectedSlots.length,
        mappedPeriodsCount: coverage.normalizedMappings.length,
        affectedPeriods: coverage.affectedSlots,
      },
    };
  }

  async getMyLeaves(filters = {}, context = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);

    return leaveRequestRepository.findByUser(userId, {
      ...filters,
      schoolId,
    });
  }

  async getLeaveBalance(context = {}, options = {}) {
    const schoolId = this.requireSchoolId(context);
    const userId = this.requireUserId(context);

    let year = null;
    if (typeof options.year !== 'undefined') {
      year = this.parseYear(options.year, { required: true });
    }

    let policy = null;
    if (year) {
      policy = await leavePolicyRepository.findByYear(year, { schoolId });
    } else {
      const currentYear = new Date().getFullYear();
      policy = await leavePolicyRepository.findByYear(currentYear, { schoolId });
    }

    if (!policy) {
      const policies = await leavePolicyRepository.findAll({ schoolId, includeInactive: false });
      policy = policies.length ? policies[0] : null;
    }

    if (!policy) {
      throw new AppError('No leave policy configured for this school', 404);
    }

    const usageRows = await leaveRequestRepository.sumApprovedByType({
      userId,
      schoolId,
      year: policy.year,
    });
    const usage = this.buildUsageMap(usageRows);
    const allowances = this.getAllowanceMap(policy);
    const remaining = {
      casual: Math.max(allowances.casual - usage.casual, 0),
      sick: Math.max(allowances.sick - usage.sick, 0),
      special: Math.max(allowances.special - usage.special, 0),
    };

    return {
      policyId: policy.id,
      year: policy.year,
      allowances,
      used: usage,
      remaining,
    };
  }
}

module.exports = new LeaveService();
