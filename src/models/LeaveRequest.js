/**
 * LeaveRequest Model
 * Tracks individual leave applications
 */
module.exports = (sequelize, DataTypes) => {
  const LeaveRequest = sequelize.define(
    'LeaveRequest',
    {
      id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        primaryKey: true,
        autoIncrement: true,
      },
      school_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        references: {
          model: 'schools',
          key: 'id',
        },
      },
      user_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      policy_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: false,
        references: {
          model: 'leave_policies',
          key: 'id',
        },
      },
      leave_type: {
        type: DataTypes.ENUM('casual', 'sick', 'special'),
        allowNull: false,
        defaultValue: 'casual',
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      total_days: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'pending',
      },
      approver_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      decided_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      comments: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: 'leave_requests',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['school_id'] },
        { fields: ['user_id'] },
        { fields: ['policy_id'] },
        { fields: ['status'] },
        { fields: ['leave_type'] },
        { fields: ['start_date'] },
        { fields: ['end_date'] },
      ],
    }
  );

  return LeaveRequest;
};
