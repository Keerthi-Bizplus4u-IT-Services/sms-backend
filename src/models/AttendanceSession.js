/**
 * AttendanceSession Model
 * Represents a single attendance-taking session for a class/section on a date.
 */
module.exports = (sequelize, DataTypes) => {
  const bigint = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;
  const int = sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED;

  const AttendanceSession = sequelize.define('AttendanceSession', {
    id: {
      type: bigint,
      primaryKey: true,
      autoIncrement: true
    },
    class_id: {
      type: bigint,
      allowNull: false,
      references: { model: 'classes', key: 'id' }
    },
    section_id: {
      type: bigint,
      allowNull: false,
      references: { model: 'sections', key: 'id' }
    },
    session_hour_id: {
      type: bigint,
      allowNull: true,
      references: { model: 'session_hours', key: 'id' }
    },
    session_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    school_id: {
      type: int,
      allowNull: false,
      references: { model: 'schools', key: 'id' }
    },
    created_by: {
      type: bigint,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'attendance_sessions',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  return AttendanceSession;
};
