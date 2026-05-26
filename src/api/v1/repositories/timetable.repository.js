const { sequelize } = require('../../../config/database');
const { QueryTypes } = require('sequelize');
const { AppError } = require('../../../middleware/error.middleware');

class TimetableRepository {
        dayNumberExpression() {
                return `
                    CASE ct.day_of_week
                        WHEN 'sunday' THEN 0
                        WHEN 'monday' THEN 1
                        WHEN 'tuesday' THEN 2
                        WHEN 'wednesday' THEN 3
                        WHEN 'thursday' THEN 4
                        WHEN 'friday' THEN 5
                        WHEN 'saturday' THEN 6
                    END
                `;
    }

        baseSelectQuery() {
                return `
                    SELECT
                        ${this.dayNumberExpression()} AS day,
                        ct.day_of_week AS day_name,
                        cls.numeric_grade AS cn,
                        cls.name AS class_name,
                        sec.name AS sname,
                        sub.name AS subname,
                        TRIM(CONCAT(COALESCE(teacher_person.first_name, ''), ' ', COALESCE(teacher_person.last_name, ''))) AS fname,
                        period.start_time AS stime,
                        period.end_time AS etime,
                        period.period_name,
                        period.period_number,
                        ct.room_number
                    FROM class_timetable ct
                    INNER JOIN classes cls ON ct.class_id = cls.id AND cls.deleted_at IS NULL
                    INNER JOIN sections sec ON ct.section_id = sec.id AND sec.deleted_at IS NULL
                    INNER JOIN school_branches branch ON cls.branch_id = branch.id AND branch.deleted_at IS NULL
                    INNER JOIN subjects sub ON ct.subject_id = sub.id AND sub.deleted_at IS NULL
                    INNER JOIN teachers tch ON ct.teacher_id = tch.id AND tch.deleted_at IS NULL
                    INNER JOIN persons teacher_person ON tch.person_id = teacher_person.id AND teacher_person.deleted_at IS NULL
                    INNER JOIN timetable_periods period ON ct.period_id = period.id
                    WHERE ct.is_active = true
                        AND (ct.effective_from IS NULL OR ct.effective_from <= CURRENT_DATE)
                        AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
                `;
        }

        async findAll(filters = {}) {
                const { schoolId, roleName, userId } = filters;
                const whereConditions = [];
                const replacements = {};

                if (schoolId) {
                        whereConditions.push('branch.school_id = :schoolId');
                        replacements.schoolId = schoolId;
                }

                if (roleName === 'teacher') {
                        whereConditions.push('teacher_person.user_id = :userId');
                        replacements.userId = userId;
                }

                const whereClause = whereConditions.length ? ` AND ${whereConditions.join(' AND ')}` : '';
                const query = `
                    ${this.baseSelectQuery()}
                    ${whereClause}
                    ORDER BY ${this.dayNumberExpression()} ASC, period.start_time ASC, cls.name ASC, sec.name ASC
                `;

                return sequelize.query(query, {
                        replacements,
                        type: QueryTypes.SELECT
                });
        }

        async search(searchParams = {}) {
                const { id, name, className, schoolId, roleName, userId } = searchParams;
                const whereConditions = [];
                const replacements = {};

                if (schoolId) {
                        whereConditions.push('branch.school_id = :schoolId');
                        replacements.schoolId = schoolId;
                }

                if (roleName === 'teacher') {
                        whereConditions.push('teacher_person.user_id = :userId');
                        replacements.userId = userId;
                }

        if (id) {
                        whereConditions.push('(CAST(tch.id AS VARCHAR(50)) = :teacherId OR LOWER(tch.employee_id) = :teacherIdLower)');
                        replacements.teacherId = String(id).trim();
                        replacements.teacherIdLower = String(id).trim().toLowerCase();
        }
        if (name) {
                        whereConditions.push(`LOWER(CONCAT(COALESCE(teacher_person.first_name, ''), ' ', COALESCE(teacher_person.last_name, ''))) LIKE :teacherName`);
                        replacements.teacherName = `%${String(name).trim().toLowerCase()}%`;
        }
        if (className) {
                        whereConditions.push('LOWER(cls.name) LIKE :className');
                        replacements.className = `%${String(className).trim().toLowerCase()}%`;
        }

        const query = `
                    ${this.baseSelectQuery()}
                    ${whereConditions.length ? ` AND ${whereConditions.join(' AND ')}` : ''}
                    ORDER BY ${this.dayNumberExpression()} ASC, period.start_time ASC, cls.name ASC, sec.name ASC
                `;

                return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
        }

        async findStudentScheduleByUserId(userId, schoolId = null) {
                const studentQuery = `
                    SELECT
                        st.id,
                        st.class_id,
                        st.section_id,
                        TRIM(CONCAT(COALESCE(student_person.first_name, ''), ' ', COALESCE(student_person.last_name, ''))) AS student_name
                    FROM students st
                    INNER JOIN persons student_person ON st.person_id = student_person.id AND student_person.deleted_at IS NULL
                    INNER JOIN classes cls ON st.class_id = cls.id AND cls.deleted_at IS NULL
                    INNER JOIN school_branches branch ON cls.branch_id = branch.id AND branch.deleted_at IS NULL
                    WHERE student_person.user_id = :userId
                        AND st.deleted_at IS NULL
                        AND st.current_status = 'active'
                        ${schoolId ? 'AND branch.school_id = :schoolId' : ''}
                    LIMIT 1
                `;

                const [student] = await sequelize.query(studentQuery, {
                        replacements: schoolId ? { userId, schoolId } : { userId },
                        type: QueryTypes.SELECT
                });

                if (!student) {
                        throw new AppError('Student profile not found', 404);
                }

                const timetableQuery = `
                    ${this.baseSelectQuery()}
                        AND ct.class_id = :classId
                        AND ct.section_id = :sectionId
                        ${schoolId ? 'AND branch.school_id = :schoolId' : ''}
                    ORDER BY ${this.dayNumberExpression()} ASC, period.start_time ASC
                `;

                const rows = await sequelize.query(timetableQuery, {
                        replacements: schoolId
                                ? { classId: student.class_id, sectionId: student.section_id, schoolId }
                                : { classId: student.class_id, sectionId: student.section_id },
                        type: QueryTypes.SELECT
                });

                return rows.map((row) => ({
                        ...row,
                        studentName: student.student_name
                }));
    }
}

module.exports = new TimetableRepository();
