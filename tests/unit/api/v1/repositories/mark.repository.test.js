jest.mock('../../../../../src/models', () => ({
  StudentMark: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  },
  ExamSchedule: {
    findOne: jest.fn()
  },
  Exam: {},
  Subject: {},
  Student: {},
  Person: {},
  GradingScale: {
    findAll: jest.fn()
  },
  AcademicYear: {}
}));

jest.mock('../../../../../src/middleware/error.middleware', () => {
  class AppError extends Error {
    constructor(message, statusCode = 500) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { AppError };
});

const { Op } = require('sequelize');
const { StudentMark, GradingScale, ExamSchedule } = require('../../../../../src/models');
const { AppError } = require('../../../../../src/middleware/error.middleware');
const markRepository = require('../../../../../src/api/v1/repositories/mark.repository');

describe('MarkRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should ignore marks with missing exam relations instead of throwing', async () => {
    StudentMark.findAll.mockResolvedValue([
      {
        id: 1,
        marks_obtained: 72,
        student: { person: { first_name: 'Asha', last_name: 'Rao' } },
        schedule: {
          max_marks: 100,
          passing_marks: 35,
          exam: { name: 'Mid Term', academic_year_id: 12 },
          subject: { name: 'Mathematics' }
        }
      },
      {
        id: 2,
        marks_obtained: 81,
        student: { person: { first_name: 'Asha', last_name: 'Rao' } },
        schedule: null
      }
    ]);
    GradingScale.findAll.mockResolvedValue([
      { min_percentage: 70, max_percentage: 79.99, grade_name: 'A' }
    ]);

    const result = await markRepository.findMarks({ exam: 'Mid Term' });

    expect(result).toEqual([
      {
        id: 1,
        fname: 'Asha Rao',
        eid: 'Mid Term',
        sname: 'Mathematics',
        marks: 72,
        gname: 'Passed',
        gpoint: 'A'
      }
    ]);
    expect(GradingScale.findAll).toHaveBeenCalledWith({
      where: { academic_year_id: 12 }
    });
  });

  it('should map term1 aliases without merging unit tests into the same filter', async () => {
    StudentMark.findAll.mockResolvedValue([]);

    await markRepository.findMarks({ exam: 'term1' });

    const query = StudentMark.findAll.mock.calls[0][0];
    const examInclude = query.include[1].include[0];
    const aliasNameFilter = examInclude.where[Op.or][1].name[Op.in];

    expect(examInclude.required).toBe(true);
    expect(examInclude.where[Op.or]).toEqual(expect.arrayContaining([
      { exam_type: 'mid_term' },
      expect.objectContaining({ name: expect.any(Object) })
    ]));
    expect(aliasNameFilter).not.toContain('Unit Test 1');
  });

  it('should resolve exam schedule by exam/class/subject and upsert marks', async () => {
    const existingMark = {
      entered_by: 91,
      update: jest.fn().mockResolvedValue(true)
    };

    ExamSchedule.findOne.mockResolvedValue({ id: 55 });
    StudentMark.findOne
      .mockResolvedValueOnce(existingMark)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    StudentMark.create.mockResolvedValue(true);

    const result = await markRepository.upsertMarks({
      schoolId: 7,
      enteredBy: 99,
      examName: 'Term 1',
      classId: 10,
      subjectName: 'Mathematics',
      marks: {
        101: 88,
        102: 71,
        invalid: 40,
        103: 'AB'
      }
    });

    expect(ExamSchedule.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        class_id: 10
      }),
      include: expect.arrayContaining([
        expect.objectContaining({
          as: 'exam',
          where: expect.objectContaining({ name: 'Term 1' })
        }),
        expect.objectContaining({
          as: 'subject',
          where: expect.objectContaining({ name: 'Mathematics' })
        })
      ])
    }));

    expect(existingMark.update).toHaveBeenCalledWith(expect.objectContaining({
      marks_obtained: 88,
      entered_by: 99
    }));
    expect(StudentMark.create).toHaveBeenCalledWith(expect.objectContaining({
      exam_schedule_id: 55,
      student_id: 102,
      marks_obtained: 71,
      entered_by: 99
    }));
    expect(result).toEqual({ upsertedCount: 2 });
  });

  it('should throw when classId is missing during bulk upsert resolution', async () => {
    await expect(markRepository.upsertMarks({
      schoolId: 7,
      examName: 'Term 1',
      subjectName: 'Mathematics',
      marks: { 101: 88 }
    })).rejects.toMatchObject({
      message: 'Class is required',
      statusCode: 400
    });

    expect(ExamSchedule.findOne).not.toHaveBeenCalled();
  });

  it('should throw when exam/class/subject combination has no schedule', async () => {
    ExamSchedule.findOne.mockResolvedValue(null);

    await expect(markRepository.upsertMarks({
      schoolId: 7,
      classId: 10,
      examName: 'Term 2',
      subjectName: 'Biology',
      marks: { 101: 66 }
    })).rejects.toMatchObject({
      message: 'Exam schedule not found for selected class/exam/subject',
      statusCode: 404
    });
  });
});