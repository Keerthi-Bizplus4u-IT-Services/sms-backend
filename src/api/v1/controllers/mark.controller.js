const markService = require('../services/mark.service');
const { success, error } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class MarkController {
    /**
     * Get student marks
     */
    getMarks = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const userId = req.user?.id;
        const roleName = req.user?.roleName || req.user?.role;

        // formData: { child, exam }
        const result = await markService.getMarks(req.body, {
            schoolId,
            userId,
            roleName
        });

        // Wrap in userData for frontend compatibility
        return success(res, { userData: result }, 'Marks retrieved successfully', 200);
    });

    listMarks = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const userId = req.user?.id;
        const roleName = req.user?.roleName || req.user?.role;

        const result = await markService.getMarks(req.query, {
            schoolId,
            userId,
            roleName
        });

        return success(res, result, 'Marks retrieved successfully', 200);
    });

    upsertMarks = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const userId = req.user?.id;

        const result = await markService.upsertMarks(req.body, {
            schoolId,
            userId
        });

        return success(res, result, 'Marks saved successfully', 201);
    });

    listGrades = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const result = await markService.listGrades(req.query, { schoolId });
        return success(res, { userData: result }, 'Grades retrieved successfully', 200);
    });

    getGradeById = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const grade = await markService.getGradeById(req.params.id, { schoolId });
        return success(res, grade, 'Grade retrieved successfully', 200);
    });

    createGrade = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const grade = await markService.createGrade(req.body, { schoolId });
        return success(res, grade, 'Grade created successfully', 201);
    });

    updateGrade = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const grade = await markService.updateGrade(req.params.id, req.body, { schoolId });
        return success(res, grade, 'Grade updated successfully', 200);
    });

    updateGradeLegacy = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const id = req.body.id;
        const grade = await markService.updateGrade(id, req.body, { schoolId });
        return success(res, grade, 'Grade updated successfully', 200);
    });

    deleteGrade = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        await markService.deleteGrade(req.params.id, { schoolId });
        return success(res, null, 'Grade deleted successfully', 200);
    });
}

module.exports = new MarkController();
