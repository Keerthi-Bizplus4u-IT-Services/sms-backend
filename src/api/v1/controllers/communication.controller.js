const communicationService = require('../services/communication.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

const derivePostedBy = (user = {}) => {
  const firstName = user?.person?.first_name ? String(user.person.first_name).trim() : '';
  const lastName = user?.person?.last_name ? String(user.person.last_name).trim() : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }

  if (user?.email && typeof user.email === 'string') {
    const localPart = user.email.split('@')[0]?.trim();
    if (localPart) {
      return localPart;
    }
  }

  return user?.id ? `User #${user.id}` : 'Administrator';
};

class CommunicationController {
  resolveScope = (req) => ({
    schoolId: resolveSchoolIdFromRequest(req),
    roleName: req?.user?.roleName || req?.user?.role || null
  });

  getNotices = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.listNotices({
      page: req.query.page,
      limit: req.query.limit,
      schoolId: scope.schoolId,
      roleName: scope.roleName
    });

    return success(res, result, 'Notices retrieved successfully', 200);
  });

  getNoticeById = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.getNoticeById({
      nid: req.params.nid,
      schoolId: scope.schoolId
    });

    return success(res, result, 'Notice retrieved successfully', 200);
  });

  getEvents = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.listEvents({
      page: req.query.page,
      limit: req.query.limit,
      schoolId: scope.schoolId,
      roleName: scope.roleName
    });

    return success(res, result, 'Events retrieved successfully', 200);
  });

  getMyEventRegistrations = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.listEventRegistrations({
      page: req.query.page,
      limit: req.query.limit,
      schoolId: scope.schoolId,
      userId: req.user?.id,
      roleName: scope.roleName
    });

    return success(res, result, 'Event registrations retrieved successfully', 200);
  });

  attendEvent = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.attendEvent({
      eventId: req.body.event,
      schoolId: scope.schoolId,
      userId: req.user?.id,
      roleName: scope.roleName
    });

    return success(res, result, result.alreadyRegistered ? 'Event already registered' : 'Event registration successful', 200);
  });

  createNotice = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.createNotice({
      title: req.body.title,
      details: req.body.details,
      date: req.body.date,
      targetAudience: req.body.target_audience,
      postedBy: derivePostedBy(req.user),
      userId: req.user?.id,
      schoolId: scope.schoolId
    });

    return success(res, result, 'Notice created successfully', 201);
  });

  updateNotice = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.updateNotice({
      nid: req.params.nid,
      title: req.body.title,
      details: req.body.details,
      date: req.body.date,
      targetAudience: req.body.target_audience,
      userId: req.user?.id,
      schoolId: scope.schoolId
    });

    return success(res, result, 'Notice updated successfully', 200);
  });

  deleteNotice = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.deleteNotice({
      nid: req.params.nid,
      schoolId: scope.schoolId
    });

    return success(res, result, 'Notice deleted successfully', 200);
  });

  getUnreadNoticeCount = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.getUnreadNoticeCount({
      userId: req.user?.id,
      schoolId: scope.schoolId,
      roleName: scope.roleName
    });

    return success(res, result, 'Unread notice count retrieved', 200);
  });

  getUnreadNotices = asyncHandler(async (req, res) => {
    const scope = this.resolveScope(req);
    const result = await communicationService.getUnreadNotices({
      userId: req.user?.id,
      schoolId: scope.schoolId,
      roleName: scope.roleName,
      limit: req.query.limit
    });

    return success(res, result, 'Unread notices retrieved', 200);
  });

  markNoticeRead = asyncHandler(async (req, res) => {
    const result = await communicationService.markNoticeRead({
      noticeId: req.params.nid,
      userId: req.user?.id
    });

    return success(res, result, 'Notice marked as read', 200);
  });
}

module.exports = new CommunicationController();
