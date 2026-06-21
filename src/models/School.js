/**
 * School Model
 * Minimal representation of the schools table for associations
 */
module.exports = (sequelize, DataTypes) => {
  const School = sequelize.define(
    'School',
    {
      id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      short_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      school_type: {
        type: DataTypes.ENUM('primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university'),
        allowNull: false,
        defaultValue: 'k12'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      subscription_plan: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'free',
        validate: { isIn: [['free', 'basic', 'premium', 'enterprise']] }
      },
      subscription_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      max_students: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 25
      },
      max_staff: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      max_classes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      max_branches: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      trial_started_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      trial_ends_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      is_trial: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'schools',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['code'] },
        { fields: ['name'] },
        { fields: ['is_active'] },
        { fields: ['is_trial'] },
        { fields: ['subscription_plan'] }
      ]
    }
  );

  return School;
};
