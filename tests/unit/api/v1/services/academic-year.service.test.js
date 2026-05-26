/**
 * Unit tests for AcademicYearService
 */

jest.mock('../../../../../src/api/v1/repositories/academic-year.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findCurrent: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  setCurrent: jest.fn()
}));

const academicYearService = require('../../../../../src/api/v1/services/academic-year.service');
const academicYearRepository = require('../../../../../src/api/v1/repositories/academic-year.repository');
describe('AcademicYearService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve academic years with pagination metadata', async () => {
    const filters = { isCurrent: true, page: 2, limit: 5 };
    const context = { schoolId: 99 };
    const mockYears = [{ id: 1, name: '2024-2025' }];
    const paginatedResult = {
      academicYears: mockYears,
      total: 12,
      page: 2,
      totalPages: 3
    };
    academicYearRepository.findAll.mockResolvedValue(paginatedResult);

    const result = await academicYearService.getAcademicYears(filters, context);

    expect(academicYearRepository.findAll).toHaveBeenCalledWith({
      ...filters,
      schoolId: context.schoolId
    });
    expect(result).toBe(paginatedResult);
  });

  it('should throw when current academic year is not configured', async () => {
    academicYearRepository.findCurrent.mockResolvedValue(null);

    await expect(academicYearService.getCurrentAcademicYear({ schoolId: 1 })).rejects.toThrow(
      'Current academic year is not configured'
    );
  });

  it('should create academic year after validating payload', async () => {
    const payload = {
      name: ' 2024-2025 ',
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      is_current: true
    };
    const created = { id: 3, ...payload, name: '2024-2025' };
    academicYearRepository.create.mockResolvedValue(created);

    const result = await academicYearService.createAcademicYear(payload, { schoolId: 42 });

    expect(academicYearRepository.create).toHaveBeenCalledWith({
      name: '2024-2025',
      start_date: payload.start_date,
      end_date: payload.end_date,
      is_current: true,
      school_id: 42
    });
    expect(result).toBe(created);
  });

  it('should reject academic year creation when dates are invalid', async () => {
    const payload = {
      name: '2024-2025',
      start_date: '2024-04-01',
      end_date: '2024-03-31'
    };

    await expect(academicYearService.createAcademicYear(payload)).rejects.toThrow(
      'End date must be after start date'
    );
  });

  it('should update academic year and set as current when requested', async () => {
    const existing = {
      id: 5,
      name: '2023-2024',
      start_date: '2023-04-01',
      end_date: '2024-03-31'
    };
    const updated = { ...existing, is_current: true };

    academicYearRepository.findById.mockResolvedValue(existing);
    academicYearRepository.update.mockResolvedValue(updated);
    academicYearRepository.setCurrent.mockResolvedValue(updated);

    const result = await academicYearService.updateAcademicYear(5, { is_current: true }, { schoolId: 5 });

    expect(academicYearRepository.findById).toHaveBeenCalledWith(5, { schoolId: 5 });
    expect(academicYearRepository.update).toHaveBeenCalledWith(5, { is_current: true }, { schoolId: 5 });
    expect(academicYearRepository.setCurrent).toHaveBeenCalledWith(5, { schoolId: 5 });
    expect(result).toBe(updated);
  });

  it('should delegate set current academic year to repository', async () => {
    const year = { id: 7, name: '2025-2026' };
    academicYearRepository.setCurrent.mockResolvedValue(year);

    const result = await academicYearService.setCurrentAcademicYear(7, { schoolId: 2 });

    expect(academicYearRepository.setCurrent).toHaveBeenCalledWith(7, { schoolId: 2 });
    expect(result).toBe(year);
  });
});
