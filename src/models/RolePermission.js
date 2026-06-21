/**
 * RolePermission Model (Junction Table)
 * Many-to-many relationship between Role and Permission
 */
module.exports = (sequelize, DataTypes) => {
  const tinyIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.TINYINT.UNSIGNED;

  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_id: {
      type: tinyIntType,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id'
      }
    }
  }, {
    tableName: 'role_permissions',
    timestamps: true,
    paranoid: false,
    indexes: [
      { unique: true, fields: ['role_id', 'permission_id'] },
      { fields: ['role_id'] },
      { fields: ['permission_id'] }
    ]
  });

  return RolePermission;
};
