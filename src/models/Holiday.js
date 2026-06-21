/**
 * Holiday Model
 */
module.exports = (sequelize, DataTypes) => {
    const Holiday = sequelize.define('Holiday', {
        id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            primaryKey: true,
            autoIncrement: true
        },
        school_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            allowNull: false,
            references: {
                model: 'schools',
                key: 'id'
            }
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        }
    }, {
        tableName: 'holidays',
        timestamps: true,
        paranoid: true,
        underscored: true
    });

    return Holiday;
};
