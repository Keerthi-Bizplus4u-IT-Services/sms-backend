/**
 * ExamSchedule Model
 */
module.exports = (sequelize, DataTypes) => {
    const ExamSchedule = sequelize.define('ExamSchedule', {
        id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            primaryKey: true,
            autoIncrement: true
        },
        exam_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            allowNull: false,
            references: {
                model: 'exams',
                key: 'id'
            }
        },
        class_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            allowNull: false,
            references: {
                model: 'classes',
                key: 'id'
            }
        },
        subject_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
            allowNull: false,
            references: {
                model: 'subjects',
                key: 'id'
            }
        },
        exam_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        max_marks: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: false
        },
        passing_marks: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: false
        },
        room_number: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    }, {
        tableName: 'exam_schedules',
        timestamps: true,
        underscored: true,
        paranoid: false
    });


    return ExamSchedule;
};
