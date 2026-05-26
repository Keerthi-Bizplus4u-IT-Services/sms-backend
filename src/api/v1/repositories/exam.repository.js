const { AcademicYear, Exam } = require('../../../models');

class ExamRepository {
  async findAll({ schoolId, academicYearId = null } = {}) {
    const academicYearWhere = { school_id: schoolId };

    if (academicYearId) {
      academicYearWhere.id = academicYearId;
    }

    const exams = await Exam.findAll({
      attributes: ['id', 'name', 'exam_type', 'start_date', 'end_date', 'result_date', 'academic_year_id'],
      include: [
        {
          model: AcademicYear,
          as: 'academicYear',
          attributes: ['id', 'name', 'is_current'],
          required: true,
          where: academicYearWhere
        }
      ],
      order: [
        [{ model: AcademicYear, as: 'academicYear' }, 'is_current', 'DESC'],
        ['start_date', 'ASC'],
        ['name', 'ASC']
      ]
    });

    return exams.map((exam) => ({
      id: exam.id,
      eid: exam.name,
      ename: exam.name,
      examName: exam.name,
      examType: exam.exam_type,
      academicYearId: exam.academic_year_id,
      academicYearName: exam.academicYear?.name || null,
      startDate: exam.start_date,
      endDate: exam.end_date,
      resultDate: exam.result_date
    }));
  }
}

module.exports = new ExamRepository();