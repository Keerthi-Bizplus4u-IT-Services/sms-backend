/**
 * AcademicYear Model
 * Manages academic years for the school
 */
module.exports = (sequelize, DataTypes) => {
  const AcademicYear = sequelize.define('AcademicYear', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED),
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
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'e.g., 2024-2025'
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterStartDate(value) {
          if (value <= this.start_date) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
    // ...existing code...
  }, {
    tableName: 'academic_years',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['is_current'] },
      { fields: ['start_date', 'end_date'] }
    ]
  });
  return AcademicYear;
};
