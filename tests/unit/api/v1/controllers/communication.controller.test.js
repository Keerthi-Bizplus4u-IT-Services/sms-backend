/**
 * Unit tests for CommunicationController
 */

jest.mock('../../../../../src/api/v1/services/communication.service', () => ({
  listNotices: jest.fn(),
  listEvents: jest.fn(),
  getNoticeById: jest.fn(),
  createNotice: jest.fn(),
  updateNotice: jest.fn(),
  deleteNotice: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const communicationController = require('../../../../../src/api/v1/controllers/communication.controller');
const communicationService = require('../../../../../src/api/v1/services/communication.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse } = require('../../../../helpers/testUtils');

describe('CommunicationController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    success.mockReturnValue(res);
  });

  it('should list notices with pagination parameters', async () => {
    const payload = {
      notices: [],
      total: 0,
      page: 2,
      limit: 15,
      totalPages: 0
    };
    req.query = { page: '2', limit: '15' };
    req.user = { roleName: 'transport', schoolId: 12 };
    communicationService.listNotices.mockResolvedValue(payload);

    await communicationController.getNotices(req, res);

    expect(communicationService.listNotices).toHaveBeenCalledWith({
      page: '2',
      limit: '15',
      schoolId: 12,
      roleName: 'transport'
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Notices retrieved successfully', 200);
  });

  it('should list events with pagination parameters', async () => {
    const payload = {
      events: [],
      total: 10,
      page: 1,
      limit: 10,
      totalPages: 1
    };
    req.query = { page: '1', limit: '25' };
    req.user = { roleName: 'teacher', schoolId: 5 };
    communicationService.listEvents.mockResolvedValue(payload);

    await communicationController.getEvents(req, res);

    expect(communicationService.listEvents).toHaveBeenCalledWith({
      page: '1',
      limit: '25',
      schoolId: 5,
      roleName: 'teacher'
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Events retrieved successfully', 200);
  });

  it('should create notice with postedBy derived from authenticated user', async () => {
    const payload = { title: 'Exam Notice', details: 'Details', date: '2026-03-23', posted: 'Jane Doe' };
    req.body = { title: 'Exam Notice', details: 'Details', date: '2026-03-23' };
    req.user = {
      id: 17,
      email: 'jane.doe@example.com',
      person: { first_name: 'Jane', last_name: 'Doe' }
    };
    req.schoolId = 9;
    communicationService.createNotice.mockResolvedValue(payload);

    await communicationController.createNotice(req, res);

    expect(communicationService.createNotice).toHaveBeenCalledWith({
      title: 'Exam Notice',
      details: 'Details',
      date: '2026-03-23',
      postedBy: 'Jane Doe',
      userId: 17,
      schoolId: 9
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Notice created successfully', 201);
  });

  it('should retrieve notice by nid', async () => {
    req.params = { nid: '7' };
    req.schoolId = 4;
    const payload = {
      nid: 7,
      title: 'Exam Notice',
      details: 'Final exam starts Monday',
      date: '2026-03-23',
      posted: 'Jane Doe'
    };
    communicationService.getNoticeById.mockResolvedValue(payload);

    await communicationController.getNoticeById(req, res);

    expect(communicationService.getNoticeById).toHaveBeenCalledWith({ nid: '7', schoolId: 4 });
    expect(success).toHaveBeenCalledWith(res, payload, 'Notice retrieved successfully', 200);
  });

  it('should update notice by nid', async () => {
    req.params = { nid: '22' };
    req.body = { title: 'Updated Notice', details: 'Updated details', date: '2026-03-30' };
    req.user = { id: 99 };
    req.schoolId = 4;
    const payload = {
      nid: 22,
      title: 'Updated Notice',
      details: 'Updated details',
      date: '2026-03-30',
      posted: 'Admin'
    };
    communicationService.updateNotice.mockResolvedValue(payload);

    await communicationController.updateNotice(req, res);

    expect(communicationService.updateNotice).toHaveBeenCalledWith({
      nid: '22',
      title: 'Updated Notice',
      details: 'Updated details',
      date: '2026-03-30',
      userId: 99,
      schoolId: 4
    });
    expect(success).toHaveBeenCalledWith(res, payload, 'Notice updated successfully', 200);
  });

  it('should delete notice by nid', async () => {
    req.params = { nid: '22' };
    req.schoolId = 4;
    communicationService.deleteNotice.mockResolvedValue({ nid: 22 });

    await communicationController.deleteNotice(req, res);

    expect(communicationService.deleteNotice).toHaveBeenCalledWith({ nid: '22', schoolId: 4 });
    expect(success).toHaveBeenCalledWith(res, { nid: 22 }, 'Notice deleted successfully', 200);
  });
});
