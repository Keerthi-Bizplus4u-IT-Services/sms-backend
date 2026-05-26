jest.mock('../../../../../src/api/v1/services/transport.service', () => ({
  listRoutes: jest.fn(),
  getRouteById: jest.fn(),
  createRoute: jest.fn(),
  updateRoute: jest.fn(),
  deleteRoute: jest.fn()
}));

jest.mock('../../../../../src/utils/response');

const transportController = require('../../../../../src/api/v1/controllers/transport.controller');
const transportService = require('../../../../../src/api/v1/services/transport.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse } = require('../../../../helpers/testUtils');

describe('TransportController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    success.mockReturnValue(res);
    req.user = { id: 1, schoolId: 1 };
  });

  it('should list routes with query filters', async () => {
    req.query = { page: '0', pageSize: '10', search: 'north' };
    const payload = { items: [], total: 0, page: 0, pageSize: 10 };
    transportService.listRoutes.mockResolvedValue(payload);

    await transportController.getRoutes(req, res);

    expect(transportService.listRoutes).toHaveBeenCalledWith({ page: '0', pageSize: '10', search: 'north' }, 1);
    expect(success).toHaveBeenCalledWith(res, payload, 'Transport routes retrieved successfully');
  });

  it('should fetch route by id', async () => {
    req.params = { id: '15' };
    const route = { id: 15, routeName: 'Route 15' };
    transportService.getRouteById.mockResolvedValue(route);

    await transportController.getRoute(req, res);

    expect(transportService.getRouteById).toHaveBeenCalledWith('15', 1);
    expect(success).toHaveBeenCalledWith(res, route, 'Transport route retrieved successfully');
  });

  it('should create route', async () => {
    req.body = { routeName: 'East Route' };
    const route = { id: 3, routeName: 'East Route' };
    transportService.createRoute.mockResolvedValue(route);

    await transportController.createRoute(req, res);

    expect(transportService.createRoute).toHaveBeenCalledWith({ routeName: 'East Route' }, 1);
    expect(success).toHaveBeenCalledWith(res, route, 'Transport route created successfully', 201);
  });

  it('should update route', async () => {
    req.params = { id: '3' };
    req.body = { routeName: 'East Route Updated' };
    const route = { id: 3, routeName: 'East Route Updated' };
    transportService.updateRoute.mockResolvedValue(route);

    await transportController.updateRoute(req, res);

    expect(transportService.updateRoute).toHaveBeenCalledWith('3', { routeName: 'East Route Updated' }, 1);
    expect(success).toHaveBeenCalledWith(res, route, 'Transport route updated successfully');
  });

  it('should delete route', async () => {
    req.params = { id: '3' };
    transportService.deleteRoute.mockResolvedValue(true);

    await transportController.deleteRoute(req, res);

    expect(transportService.deleteRoute).toHaveBeenCalledWith('3', 1);
    expect(success).toHaveBeenCalledWith(res, { deleted: true }, 'Transport route deleted successfully');
  });
});
