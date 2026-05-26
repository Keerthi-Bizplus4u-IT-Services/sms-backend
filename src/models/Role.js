
/**
 * Roles Model
 * Maps to 'roles' table - defines user roles for RBAC
 */
module.exports = (sequelize, DataTypes) => {
  const tinyIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.TINYINT.UNSIGNED;

  const Role = sequelize.define('Role', {
    id: {
      type: tinyIntType,
      primaryKey: true,
      autoIncrement: false
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'System roles cannot be deleted'
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['name'] }
    ]
  });
  return Role;
};
