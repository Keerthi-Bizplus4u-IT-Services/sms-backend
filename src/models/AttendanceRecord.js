/**
 * AttendanceRecord Model
 * Represents a single student's attendance status within a session.
 */
module.exports = (sequelize, DataTypes) => {
  const bigint = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;

  const AttendanceRecord = sequelize.define('AttendanceRecord', {
    id: {
      type: bigint,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: bigint,
      allowNull: false,
      references: { model: 'attendance_sessions', key: 'id' }
    },
    student_id: {
      type: bigint,
      allowNull: false,
      references: { model: 'students', key: 'id' }
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['P', 'A', 'L']]
      }
    },
    remarks: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'attendance_records',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  return AttendanceRecord;
};
