/**
 * GradingScale Model
 */
module.exports = (sequelize, DataTypes) => {
    const GradingScale = sequelize.define('GradingScale', {
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
        grade_name: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        min_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false
        },
        max_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false
        },
        grade_point: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: true
        },
        description: {
            type: DataTypes.STRING(100),
            allowNull: true
        }
    }, {
        tableName: 'grading_scales',
        timestamps: false,
        underscored: true,
        paranoid: false
    });


    return GradingScale;
};
