/**
 * SessionHour Model
 * Represents school/session timings with flexible scopes
 */
module.exports = (sequelize, DataTypes) => {
  const SessionHour = sequelize.define('SessionHour', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
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
    class_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: true,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    section_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
      allowNull: true,
      references: {
        model: 'sections',
        key: 'id'
      }
    },
    scope: {
      type: DataTypes.ENUM('SCHOOL', 'CLASS', 'SECTION'),
      allowNull: false,
      defaultValue: 'SCHOOL'
    },
    period_label: {
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
    }
  }, {
    tableName: 'session_hours',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['scope'] },
      { fields: ['class_id', 'section_id'] }
    ]
  });

  return SessionHour;
};
