/**
 * LeavePeriodAssignment Model
 * Stores period-wise replacement plan for a leave request
 */
module.exports = (sequelize, DataTypes) => {
  const LeavePeriodAssignment = sequelize.define(
    'LeavePeriodAssignment',
    {
      id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        primaryKey: true,
        autoIncrement: true,
      },
      leave_request_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'leave_requests',
          key: 'id',
        },
      },
      school_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        references: {
          model: 'schools',
          key: 'id',
        },
      },
      timetable_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'class_timetable',
          key: 'id',
        },
      },
      assignment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      class_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id',
        },
      },
      section_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'sections',
          key: 'id',
        },
      },
      period_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        references: {
          model: 'timetable_periods',
          key: 'id',
        },
      },
      original_teacher_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'teachers',
          key: 'id',
        },
      },
      substitute_teacher_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: true,
        references: {
          model: 'teachers',
          key: 'id',
        },
      },
      substitute_subject_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: true,
        references: {
          model: 'subjects',
          key: 'id',
        },
      },
      assignment_type: {
        type: DataTypes.ENUM('teacher_substitution', 'subject_reallocation'),
        allowNull: false,
        defaultValue: 'teacher_substitution',
      },
      notes: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('planned', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'planned',
      },
    },
    {
      tableName: 'leave_period_assignments',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['leave_request_id'] },
        { fields: ['school_id'] },
        { fields: ['assignment_date'] },
        { fields: ['original_teacher_id'] },
        { fields: ['substitute_teacher_id'] },
        { fields: ['status'] },
        { unique: true, fields: ['timetable_id', 'assignment_date', 'status'] },
      ],
    }
  );

  return LeavePeriodAssignment;
};
