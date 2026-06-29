const {
    StudentMark,
    ExamSchedule,
    Exam,
    Subject,
    Student,
    Person,
    GradingScale,
    AcademicYear
} = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const { Op } = require('sequelize');

const TERM_1_ALIASES = ['term1', 'term 1', 'first term'];
const TERM_2_ALIASES = ['term2', 'term 2', 'second term'];

function buildExamWhere(exam) {
    if (!exam || exam === '-1') {
        return null;
    }

    const normalizedExam = String(exam).trim().toLowerCase();

    if (!normalizedExam) {
        return null;
    }

    if (TERM_1_ALIASES.includes(normalizedExam)) {
        return {
            [Op.or]: [
                { exam_type: 'mid_term' },
                { name: { [Op.in]: ['Term 1', 'Term 1 Exam', 'First Term'] } }
            ]
        };
    }

    if (TERM_2_ALIASES.includes(normalizedExam)) {
        return {
            [Op.or]: [
                { exam_type: 'final' },
                { name: { [Op.in]: ['Term 2', 'Term 2 Exam', 'Second Term'] } }
            ]
        };
    }

    return { name: exam };
}

class MarkRepository {
    /**
     * Fetch marks for a child/student and exam
     * @param {Object} filters 
     * @returns {Promise<Array>}
     */
    async findMarks(filters) {
        const { child, exam, examId, school_id, studentId } = filters;
        const examWhere = buildExamWhere(exam);

        // Handling 'child' filter (mapping name to person)
        const studentInclude = {
            model: Student,
            as: 'student',
            required: true,
            where: {},
            include: [{
                model: Person,
                as: 'person',
                attributes: ['first_name', 'last_name'],
                required: true
            }]
        };

        const parsedStudentId = parseInt(studentId, 10);
        const hasStudentIdFilter = Number.isInteger(parsedStudentId) && parsedStudentId > 0;

        if (hasStudentIdFilter) {
            studentInclude.where.id = parsedStudentId;
        }

        if (!hasStudentIdFilter && child && child !== '-1') {
            // If child is a name (legacy/simple behavior)
            studentInclude.include[0].where = {
                [Op.or]: [
                    { first_name: { [Op.like]: `%${child}%` } },
                    { last_name: { [Op.like]: `%${child}%` } }
                ]
            };
        }

        const examFilter = {
            ...(examWhere || {}),
            ...(examId ? { id: parseInt(examId, 10) } : {})
        };

        const marks = await StudentMark.findAll({
            include: [
                studentInclude,
                {
                    model: ExamSchedule,
                    as: 'schedule',
                    required: true,
                    include: [
                        {
                            model: Exam,
                            as: 'exam',
                            required: true,
                            where: Reflect.ownKeys(examFilter).length ? examFilter : undefined
                        },
                        {
                            model: Subject,
                            as: 'subject',
                            attributes: ['name'],
                            required: true
                        }
                    ]
                }
            ]
        });

        const validMarks = marks.filter((mark) => (
            mark?.student?.person
            && mark?.schedule?.exam
            && mark?.schedule?.subject
        ));

        // Fetch grading scale for calculation
        let gradingScales = [];
        if (validMarks.length > 0) {
            gradingScales = await GradingScale.findAll({
                where: { academic_year_id: validMarks[0].schedule.exam.academic_year_id }
            });
        }

        // Transform to frontend format
        return validMarks.map(m => {
            const percentage = (m.marks_obtained / m.schedule.max_marks) * 100;
            const grade = gradingScales.find(g => percentage >= g.min_percentage && percentage <= g.max_percentage);

            return {
                id: m.id,
                fname: `${m.student.person.first_name} ${m.student.person.last_name}`,
                eid: m.schedule.exam.name, // Exam Code/Name
                sname: m.schedule.subject.name, // Subject Name
                marks: m.marks_obtained,
                gname: m.marks_obtained >= m.schedule.passing_marks ? 'Passed' : 'Failed',
                gpoint: grade ? grade.grade_name : 'N/A'
            };
        });
    }

    async resolveExamScheduleId({ schoolId, examId, examName, classId, subjectId, subjectName }) {
        const parsedClassId = parseInt(classId, 10);
        if (!Number.isInteger(parsedClassId) || parsedClassId <= 0) {
            throw new AppError('Class is required', 400);
        }

        const schedule = await ExamSchedule.findOne({
            where: {
                class_id: parsedClassId,
                ...(subjectId ? { subject_id: parseInt(subjectId, 10) } : {})
            },
            include: [
                {
                    model: Exam,
                    as: 'exam',
                    required: true,
                    where: {
                        ...(examId ? { id: parseInt(examId, 10) } : {}),
                        ...(examName ? { name: examName } : {})
                    },
                    include: [
                        {
                            model: AcademicYear,
                            as: 'academicYear',
                            required: !!schoolId,
                            where: schoolId ? { school_id: schoolId } : undefined,
                            attributes: ['id', 'school_id']
                        }
                    ]
                },
                {
                    model: Subject,
                    as: 'subject',
                    required: true,
                    where: {
                        ...(subjectName ? { name: subjectName } : {})
                    }
                }
            ],
            order: [['id', 'DESC']]
        });

        if (!schedule) {
            throw new AppError('Exam schedule not found for selected class/exam/subject', 404);
        }

        return schedule.id;
    }

    async upsertMarks({ schoolId, enteredBy, examId, examName, classId, sectionId, subjectId, subjectName, marks }) {
        const examScheduleId = await this.resolveExamScheduleId({
            schoolId,
            examId,
            examName,
            classId,
            subjectId,
            subjectName
        });

        const entries = Object.entries(marks || {});
        if (!entries.length) {
            throw new AppError('Marks payload is empty', 400);
        }

        let upserted = 0;

        for (const [studentIdRaw, markValueRaw] of entries) {
            const studentId = parseInt(studentIdRaw, 10);
            if (!Number.isInteger(studentId) || studentId <= 0) {
                continue;
            }

            const markValue = Number(markValueRaw);
            if (Number.isNaN(markValue)) {
                continue;
            }

            const where = {
                exam_schedule_id: examScheduleId,
                student_id: studentId
            };

            const existing = await StudentMark.findOne({ where });
            if (existing) {
                await existing.update({
                    marks_obtained: markValue,
                    is_absent: false,
                    entered_by: enteredBy || existing.entered_by
                });
            } else {
                await StudentMark.create({
                    exam_schedule_id: examScheduleId,
                    student_id: studentId,
                    marks_obtained: markValue,
                    is_absent: false,
                    entered_by: enteredBy || null
                });
            }

            upserted += 1;
        }

        return { upsertedCount: upserted };
    }

    async findGrades({ academicYearId }) {
        const grades = await GradingScale.findAll({
            where: { academic_year_id: academicYearId },
            order: [['min_percentage', 'DESC']]
        });

        return grades.map((grade) => ({
            gid: grade.id,
            gname: grade.grade_name,
            gpoint: Number(grade.grade_point || 0),
            pform: Number(grade.min_percentage),
            pto: Number(grade.max_percentage),
            comment: grade.description || ''
        }));
    }

    async findGradeByIdScoped(id, academicYearId) {
        const grade = await GradingScale.findOne({
            where: {
                id,
                academic_year_id: academicYearId
            }
        });

        if (!grade) {
            throw new AppError('Grade not found', 404);
        }
        return grade;
    }

    async createGrade({ academicYearId, gradeName, gradePoint, percentFrom, percentTo, description }) {
        const created = await GradingScale.create({
            academic_year_id: academicYearId,
            grade_name: gradeName,
            grade_point: gradePoint || null,
            min_percentage: percentFrom,
            max_percentage: percentTo,
            description: description || null
        });

        return {
            gid: created.id,
            gname: created.grade_name,
            gpoint: Number(created.grade_point || 0),
            pform: Number(created.min_percentage),
            pto: Number(created.max_percentage),
            comment: created.description || ''
        };
    }

    async updateGradeScoped(id, academicYearId, updates = {}) {
        const grade = await this.findGradeByIdScoped(id, academicYearId);

        const payload = {};
        if (typeof updates.gradeName !== 'undefined') payload.grade_name = updates.gradeName;
        if (typeof updates.gradePoint !== 'undefined') payload.grade_point = updates.gradePoint;
        if (typeof updates.percentFrom !== 'undefined') payload.min_percentage = updates.percentFrom;
        if (typeof updates.percentTo !== 'undefined') payload.max_percentage = updates.percentTo;
        if (typeof updates.description !== 'undefined') payload.description = updates.description || null;

        await grade.update(payload);

        return {
            gid: grade.id,
            gname: grade.grade_name,
            gpoint: Number(grade.grade_point || 0),
            pform: Number(grade.min_percentage),
            pto: Number(grade.max_percentage),
            comment: grade.description || ''
        };
    }

    async deleteGradeScoped(id, academicYearId) {
        const grade = await this.findGradeByIdScoped(id, academicYearId);
        await grade.destroy();
        return { id: grade.id };
    }
}

module.exports = new MarkRepository();
