/**
 * Permission Model
 * Defines granular permissions for RBAC (e.g. 'students:read', 'fees:write')
 */
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z-]+:[a-z]+$/i
      },
      comment: 'Permission identifier e.g. students:read'
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Resource name e.g. students, fees, classes'
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['read', 'write', 'delete', 'approve', 'export']]
      },
      comment: 'Action type: read, write, delete, approve, export'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    paranoid: false,
    indexes: [
      { unique: true, fields: ['name'] },
      { fields: ['resource'] },
      { fields: ['action'] }
    ]
  });

  return Permission;
};
