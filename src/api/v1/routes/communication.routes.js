const express = require('express');
const router = express.Router();

const communicationController = require('../controllers/communication.controller');
const {
	listCommunicationsValidator,
	createNoticeValidator,
	updateNoticeValidator,
	noticeIdValidator,
	attendEventValidator
} = require('../validators/communication.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, authorize } = require('../../../middleware/rbac.middleware');

router.get('/notices', authenticate, requirePermission('communications:read'), listCommunicationsValidator, validate, communicationController.getNotices);
router.get('/notices/unread-count', authenticate, requirePermission('communications:read'), communicationController.getUnreadNoticeCount);
router.get('/notices/unread', authenticate, requirePermission('communications:read'), communicationController.getUnreadNotices);
router.get('/notices/:nid', authenticate, requirePermission('communications:read'), noticeIdValidator, validate, communicationController.getNoticeById);
router.post('/notices', authenticate, requirePermission('communications:write'), createNoticeValidator, validate, communicationController.createNotice);
router.put('/notices/:nid', authenticate, requirePermission('communications:write'), noticeIdValidator, updateNoticeValidator, validate, communicationController.updateNotice);
router.delete('/notices/:nid', authenticate, requirePermission('communications:delete'), noticeIdValidator, validate, communicationController.deleteNotice);
router.post('/notices/:nid/read', authenticate, requirePermission('communications:read'), noticeIdValidator, validate, communicationController.markNoticeRead);
router.get('/events', authenticate, requirePermission('communications:read'), listCommunicationsValidator, validate, communicationController.getEvents);
router.get('/events/registrations', authenticate, authorize(['student', 'parent']), listCommunicationsValidator, validate, communicationController.getMyEventRegistrations);
router.post('/events/attend', authenticate, authorize(['student', 'parent']), attendEventValidator, validate, communicationController.attendEvent);
router.post('/attendevent', authenticate, authorize(['student', 'parent']), attendEventValidator, validate, communicationController.attendEvent);

module.exports = router;
