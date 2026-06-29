jest.mock('../../../../../src/api/v1/repositories/transport-route.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn()
}));

jest.mock('../../../../../src/api/v1/repositories/transport-stop.repository', () => ({
  findByRouteId: jest.fn()
}));

const transportService = require('../../../../../src/api/v1/services/transport.service');
const transportRepository = require('../../../../../src/api/v1/repositories/transport-route.repository');
const transportStopRepository = require('../../../../../src/api/v1/repositories/transport-stop.repository');

describe('TransportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should proxy listRoutes to repository', async () => {
    const payload = { items: [], total: 0, page: 0, pageSize: 10 };
    transportRepository.findAll.mockResolvedValue(payload);

    const result = await transportService.listRoutes({ page: 1, pageSize: 20, search: 'bus' });

    expect(transportRepository.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: 'bus', schoolId: undefined });
    expect(result).toEqual(payload);
  });

  it('should throw 404 when route is not found by id', async () => {
    transportRepository.findById.mockResolvedValue(null);

    await expect(transportService.getRouteById(999)).rejects.toMatchObject({
      message: 'Transport route not found',
      statusCode: 404
    });
  });

  it('should create route when repository returns a record', async () => {
    const route = { id: 10, routeName: 'North Route' };
    transportRepository.create.mockResolvedValue(route);

    const result = await transportService.createRoute({ routeName: 'North Route' });

    expect(transportRepository.create).toHaveBeenCalledWith({ routeName: 'North Route' }, undefined);
    expect(result).toEqual(route);
  });

  it('should throw 404 when update target is missing', async () => {
    transportRepository.update.mockResolvedValue(null);

    await expect(transportService.updateRoute(10, { routeName: 'Updated' })).rejects.toMatchObject({
      message: 'Transport route not found',
      statusCode: 404
    });
  });

  it('should throw 404 when delete target is missing', async () => {
    transportRepository.softDelete.mockResolvedValue(false);

    await expect(transportService.deleteRoute(10)).rejects.toMatchObject({
      message: 'Transport route not found',
      statusCode: 404
    });
  });

  it('should return route with stops when found by id', async () => {
    const route = { id: 5, routeCode: 'R1' };
    const stops = [{ id: 1, stopName: 'Main Gate' }];
    transportRepository.findById.mockResolvedValue(route);
    transportStopRepository.findByRouteId.mockResolvedValue(stops);

    const result = await transportService.getRouteById(5, 99);

    expect(transportRepository.findById).toHaveBeenCalledWith(5, 99);
    expect(transportStopRepository.findByRouteId).toHaveBeenCalledWith(5, 99);
    expect(result).toEqual({ ...route, stops });
  });
});
