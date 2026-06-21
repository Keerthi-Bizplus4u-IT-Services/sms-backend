/**
 * Unit Tests for User Controller
 */

jest.mock('../../../../../src/api/v1/repositories/user.repository', () => ({
  findAllForMessaging: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const userController = require('../../../../../src/api/v1/controllers/user.controller');
const userRepository = require('../../../../../src/api/v1/repositories/user.repository');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('UserController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
  });

  describe('getUsers', () => {
    it('should retrieve all users for messaging', async () => {
      const users = [{ id: 1, email: 'a@b.com' }, { id: 2, email: 'c@d.com' }];
      userRepository.findAllForMessaging.mockResolvedValue(users);

      await userController.getUsers(req, res, next);

      expect(userRepository.findAllForMessaging).toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith(res, users, 'Users retrieved successfully', 200);
    });

    it('should propagate errors', async () => {
      userRepository.findAllForMessaging.mockRejectedValue(new Error('DB error'));

      await userController.getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
