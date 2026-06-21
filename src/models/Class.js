/**
 * Class Model
 * Represents classes/grades in the school
 */
module.exports = (sequelize, DataTypes) => {
  const tinyIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.TINYINT.UNSIGNED;

  const Class = sequelize.define('Class', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    academic_year_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED),
      allowNull: false,
      references: {
        model: 'academic_years',
        key: 'id'
      }
    },
    branch_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
      allowNull: false,
      references: {
        model: 'school_branches',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'e.g., Grade 1, Class 10'
    },
    numeric_grade: {
      type: tinyIntType,
      allowNull: true,
      comment: '1-12 for grades',
      validate: {
        min: 1,
        max: 12
      }
    },
    display_order: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED),
      allowNull: true
    }
    // ...existing code...
  }, {
    tableName: 'classes',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['academic_year_id'] },
      { fields: ['branch_id'] },
      { fields: ['name'] },
      { fields: ['numeric_grade'] },
      { unique: true, fields: ['branch_id', 'academic_year_id', 'name'] }
    ]
  });
  return Class;
};
