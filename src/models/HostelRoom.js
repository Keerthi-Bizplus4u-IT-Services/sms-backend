/**
 * HostelRoom Model
 */
module.exports = (sequelize, DataTypes) => {
    const HostelRoom = sequelize.define('HostelRoom', {
        id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            primaryKey: true,
            autoIncrement: true
        },
        building_id: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            allowNull: false,
            references: {
                model: 'hostel_buildings',
                key: 'id'
            }
        },
        room_number: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        capacity: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            allowNull: false,
            defaultValue: 1
        },
        occupied_beds: {
            type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
            defaultValue: 0
        },
        monthly_rent: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00
        },
        status: {
            type: DataTypes.ENUM('available', 'full', 'maintenance'),
            defaultValue: 'available'
        }
    }, {
        tableName: 'hostel_rooms',
        timestamps: true,
        underscored: true,
        paranoid: false
    });

    return HostelRoom;
};
