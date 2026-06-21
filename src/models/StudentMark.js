/**
 * StudentMark Model
 */
module.exports = (sequelize, DataTypes) => {
    const StudentMark = sequelize.define('StudentMark', {
        id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            primaryKey: true,
            autoIncrement: true
        },
        exam_schedule_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            allowNull: false,
            references: {
                model: 'exam_schedules',
                key: 'id'
            }
        },
        student_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            allowNull: false,
            references: {
                model: 'students',
                key: 'id'
            }
        },
        marks_obtained: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: true
        },
        is_absent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        remarks: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        entered_by: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        verified_by: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'student_marks',
        timestamps: true,
        underscored: true,
        paranoid: false
    });


    return StudentMark;
};
