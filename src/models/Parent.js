/**
 * Parent Model
 * Extends Person with parent-specific information
 */
module.exports = (sequelize, DataTypes) => {
  const Parent = sequelize.define('Parent', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    person_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      unique: true,
      references: {
        model: 'persons',
        key: 'id'
      }
    },
    occupation: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    annual_income: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    employer_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    pan_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'parents',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['person_id'] },
      { fields: ['pan_number'] }
    ]
  });
  return Parent;
};
