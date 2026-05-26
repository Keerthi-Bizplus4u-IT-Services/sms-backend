const examService = require('../services/exam.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class ExamController {
  getExams = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const exams = await examService.getExams(
      { academicYearId: req.query.academicYearId },
      { schoolId }
    );

    return success(res, exams, 'Exams retrieved successfully', 200);
  });
}

module.exports = new ExamController();