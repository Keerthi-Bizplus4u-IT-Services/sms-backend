jest.mock('../../../../../src/api/v1/repositories/transport.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}));

const transportService = require('../../../../../src/api/v1/services/transport.service');
const transportRepository = require('../../../../../src/api/v1/repositories/transport.repository');

describe('TransportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should proxy listRoutes to repository', async () => {
    const payload = { items: [], total: 0, page: 0, pageSize: 10 };
    transportRepository.findAll.mockResolvedValue(payload);

    const result = await transportService.listRoutes({ page: 1, pageSize: 20, search: 'bus' });

    expect(transportRepository.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: 'bus' });
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

    expect(transportRepository.create).toHaveBeenCalledWith({ routeName: 'North Route' });
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
    transportRepository.delete.mockResolvedValue(false);

    await expect(transportService.deleteRoute(10)).rejects.toMatchObject({
      message: 'Transport route not found',
      statusCode: 404
    });
  });
});
