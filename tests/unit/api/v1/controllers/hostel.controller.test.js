jest.mock('../../../../../src/api/v1/services/hostel.service', () => ({
  listRooms: jest.fn(),
  addRoom: jest.fn(),
  deleteRoom: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const hostelController = require('../../../../../src/api/v1/controllers/hostel.controller');
const hostelService = require('../../../../../src/api/v1/services/hostel.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('HostelController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('getHostelRooms', () => {
    it('should retrieve rooms', async () => {
      hostelService.listRooms.mockResolvedValue([{ id: 1 }]);
      await hostelController.getHostelRooms(req, res, next);
      expect(hostelService.listRooms).toHaveBeenCalledWith(1);
      expect(success).toHaveBeenCalledWith(res, expect.any(Array), 'Hostel rooms retrieved successfully', 200);
    });
  });
  describe('addRoom', () => {
    it('should add a room', async () => {
      req.body = { room_number: 'B202', capacity: 4 };
      hostelService.addRoom.mockResolvedValue(null);
      await hostelController.addRoom(req, res, next);
      expect(hostelService.addRoom).toHaveBeenCalledWith(req.body, 1);
      expect(success).toHaveBeenCalledWith(res, null, 'Room added successfully', 201);
    });
  });
  describe('deleteRoom', () => {
    it('should delete room by id', async () => {
      req.params = { id: '5' };
      hostelService.deleteRoom.mockResolvedValue(null);
      await hostelController.deleteRoom(req, res, next);
      expect(hostelService.deleteRoom).toHaveBeenCalledWith('5');
      expect(success).toHaveBeenCalledWith(res, null, 'Room deleted successfully', 200);
    });
  });
});
