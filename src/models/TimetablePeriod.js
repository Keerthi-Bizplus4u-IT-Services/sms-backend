/**
 * TimetablePeriod Model
 * Represents the reusable timetable slots for an academic year
 */
module.exports = (sequelize, DataTypes) => {
  const smallIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED;
  const tinyIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.TINYINT.UNSIGNED;

  const TimetablePeriod = sequelize.define('TimetablePeriod', {
    id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    academic_year_id: {
      type: smallIntType,
      allowNull: false,
      references: {
        model: 'academic_years',
        key: 'id'
      }
    },
    period_number: {
      type: tinyIntType,
      allowNull: false
    },
    period_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    duration_minutes: {
      type: tinyIntType,
      allowNull: true
    },
    is_break: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    break_type: {
      type: DataTypes.ENUM('short_break', 'lunch_break', 'assembly'),
      allowNull: true
    },
    display_order: {
      type: tinyIntType,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'timetable_periods',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['academic_year_id'] },
      { fields: ['is_active'] },
      { unique: true, fields: ['academic_year_id', 'period_number'] }
    ]
  });

  return TimetablePeriod;
};