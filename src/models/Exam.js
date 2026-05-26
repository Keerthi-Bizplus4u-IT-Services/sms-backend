/**
 * Exam Model
 */
module.exports = (sequelize, DataTypes) => {
    const Exam = sequelize.define('Exam', {
        id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            primaryKey: true,
            autoIncrement: true
        },
        academic_year_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED),
            allowNull: false,
            references: {
                model: 'academic_years',
                key: 'id'
            }
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        exam_type: {
            type: DataTypes.ENUM('unit_test', 'mid_term', 'final', 'practical', 'project', 'other'),
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        result_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        }
    }, {
        tableName: 'exams',
        timestamps: true,
        underscored: true,
        paranoid: false
    });


    return Exam;
};
