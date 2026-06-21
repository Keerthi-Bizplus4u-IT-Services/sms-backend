/**
 * Subject Model
 * Represents subjects taught in the school
 */
module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define('Subject', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
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
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    credit_hours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    },
    is_mandatory: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    type: {
      type: DataTypes.ENUM('core', 'elective', 'optional', 'extra_curricular'),
      defaultValue: 'core'
    }
    // ...existing code...
  }, {
    tableName: 'subjects',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['name'] },
      { fields: ['code'] },
      { fields: ['type'] }
    ]
  });
  return Subject;
};
