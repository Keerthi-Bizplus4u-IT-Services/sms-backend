jest.mock('../../../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn()
  }
}));

jest.mock('sequelize', () => ({
  QueryTypes: {
    SELECT: 'SELECT'
  }
}));

const transportRepository = require('../../../../../src/api/v1/repositories/transport.repository');
const { sequelize } = require('../../../../../src/config/database');

describe('TransportRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should normalize pagination with defaults and clamps', () => {
    expect(transportRepository.normalizePagination(undefined, undefined)).toEqual({
      limit: 10,
      offset: 0,
      currentPage: 0
    });

    expect(transportRepository.normalizePagination(-4, 1000)).toEqual({
      limit: 100,
      offset: 0,
      currentPage: 0
    });
  });

  it('should build empty search clause when search is not provided', () => {
    expect(transportRepository.buildSearchClause('')).toEqual({ clause: '', values: [] });
  });

  it('should fetch paginated route list with aliases', async () => {
    const rows = [{ id: 1, routeName: 'North Route' }];
    sequelize.query
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([{ total: '14' }]);

    const result = await transportRepository.findAll({ search: 'north', page: 1, pageSize: 5 });

    expect(sequelize.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('bid AS id'),
      expect.objectContaining({
        type: 'SELECT',
        replacements: ['%north%', '%north%', '%north%', '%north%', '%north%', 5, 5]
      })
    );
    expect(result).toEqual({
      items: rows,
      total: 14,
      page: 1,
      pageSize: 5
    });
  });

  it('should create route and return inserted record', async () => {
    jest.spyOn(transportRepository, 'findById').mockResolvedValueOnce({ id: 9, routeName: 'Route 9' });
    sequelize.query.mockResolvedValueOnce([null, { insertId: 9 }]);

    const result = await transportRepository.create({
      routeName: 'Route 9',
      vehicleNumber: 'TN01AB1234',
      driverName: 'Driver',
      licenseNumber: 'LIC123',
      phoneNumber: '9999999999'
    });

    expect(result).toEqual({ id: 9, routeName: 'Route 9' });
  });

  it('should return null from update when no rows are affected', async () => {
    sequelize.query.mockResolvedValueOnce([null, { affectedRows: 0 }]);

    const result = await transportRepository.update(5, {
      routeName: 'Updated',
      vehicleNumber: 'TN01AA0001',
      driverName: 'New Driver',
      licenseNumber: 'NEW123',
      phoneNumber: '8888888888'
    });

    expect(result).toBeNull();
  });

  it('should return delete status based on affected rows', async () => {
    sequelize.query.mockResolvedValueOnce([null, { affectedRows: 1 }]);
    await expect(transportRepository.delete(5)).resolves.toBe(true);

    sequelize.query.mockResolvedValueOnce([null, { affectedRows: 0 }]);
    await expect(transportRepository.delete(5)).resolves.toBe(false);
  });
});
