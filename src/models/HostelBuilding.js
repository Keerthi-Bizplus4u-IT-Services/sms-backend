/**
 * HostelBuilding Model
 */
module.exports = (sequelize, DataTypes) => {
    const HostelBuilding = sequelize.define('HostelBuilding', {
        id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            primaryKey: true,
            autoIncrement: true
        },
        school_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            allowNull: false,
            defaultValue: 1,
            references: {
                model: 'schools',
                key: 'id'
            }
        },
        building_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        building_type: {
            type: DataTypes.ENUM('male', 'female', 'co_ed', 'other'),
            defaultValue: 'co_ed'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'hostel_buildings',
        timestamps: true,
        underscored: true,
        paranoid: false
    });

    return HostelBuilding;
};
