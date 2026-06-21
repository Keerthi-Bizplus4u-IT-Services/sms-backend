/**
 * StudentExit Model
 * Tracks formal student exit/withdrawal/transfer/graduation
 */

module.exports = (sequelize, DataTypes) => {
  const StudentExit = sequelize.define('StudentExit', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      unique: true,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    school_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    exit_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    exit_type: {
      type: DataTypes.ENUM('transferred', 'graduated', 'withdrawn'),
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    class_at_exit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Snapshot of class name at time of exit'
    },
    academic_year_at_exit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Snapshot of academic year at time of exit'
    },
    qualified_for_promotion: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    fees_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether all dues are cleared'
    },
    conduct: {
      type: DataTypes.ENUM('excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'),
      defaultValue: 'good'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    issued_by: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'student_exits',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['student_id'], unique: true },
      { fields: ['school_id'] },
      { fields: ['exit_date'] },
      { fields: ['exit_type'] }
    ]
  });

  return StudentExit;
};
