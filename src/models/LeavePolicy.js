/**
 * LeavePolicy Model
 * Stores yearly leave allocations per school
 */
module.exports = (sequelize, DataTypes) => {
  const LeavePolicy = sequelize.define(
    'LeavePolicy',
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
      year: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        comment: 'Calendar / academic year the policy applies to',
      },
      casual_leaves: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        defaultValue: 0,
      },
      sick_leaves: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        defaultValue: 0,
      },
      special_leaves: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'leave_policies',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['school_id'] },
        { fields: ['year'] },
        {
          unique: true,
          fields: ['school_id', 'year'],
          name: 'uniq_leave_policy_year',
        },
      ],
    }
  );

  return LeavePolicy;
};
