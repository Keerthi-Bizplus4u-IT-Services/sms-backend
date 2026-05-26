/**
 * SchoolBranch Model
 * Represents physical campuses/branches of a school
 */
module.exports = (sequelize, DataTypes) => {
  const SchoolBranch = sequelize.define(
    'SchoolBranch',
    {
      id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
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
      code: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      branch_type: {
        type: DataTypes.ENUM('main', 'branch', 'campus', 'satellite', 'annexe'),
        allowNull: false,
        defaultValue: 'branch'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      tableName: 'school_branches',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['school_id'] },
        { fields: ['code'] },
        { fields: ['name'] },
        { fields: ['is_active'] }
      ]
    }
  );

  return SchoolBranch;
};
