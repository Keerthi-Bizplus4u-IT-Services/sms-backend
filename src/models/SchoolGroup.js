/**
 * SchoolGroup Model
 * Defines a logical group of schools for boundary enforcement.
 */
module.exports = (sequelize, DataTypes) => {
  const SchoolGroup = sequelize.define(
    'SchoolGroup',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true }
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'school_groups',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['is_active'] }
      ]
    }
  );

  return SchoolGroup;
};
