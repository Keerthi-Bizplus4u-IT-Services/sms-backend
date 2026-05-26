/**
 * ClassTimetable Model
 * Represents the class-wise day and period schedule
 */
module.exports = (sequelize, DataTypes) => {
  const smallIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED;

  const ClassTimetable = sequelize.define('ClassTimetable', {
    id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED,
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
    class_id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    section_id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'sections',
        key: 'id'
      }
    },
    day_of_week: {
      type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      allowNull: false
    },
    period_id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'timetable_periods',
        key: 'id'
      }
    },
    subject_id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    teacher_id: {
      type: sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    room_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    is_practical: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'class_timetable',
    timestamps: true,
    paranoid: false,
    indexes: [
      { name: 'idx_class_timetable_academic_year', fields: ['academic_year_id'] },
      { name: 'idx_class_timetable_class_section', fields: ['class_id', 'section_id'] },
      { name: 'idx_class_timetable_teacher_day_period', fields: ['teacher_id', 'day_of_week', 'period_id'] },
      { name: 'idx_class_timetable_active', fields: ['is_active'] },
      {
        name: 'uq_class_timetable_active_slot',
        unique: true,
        fields: ['class_id', 'section_id', 'day_of_week', 'period_id', 'is_active']
      }
    ]
  });

  return ClassTimetable;
};