/**
 * AssignmentSubmission Model
 * Stores per-student assignment status and grading metadata.
 */
module.exports = (sequelize, DataTypes) => {
  const bigintType = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;

  const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
    id: {
      type: bigintType,
      primaryKey: true,
      autoIncrement: true
    },
    assignment_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'assignments',
        key: 'id'
      }
    },
    student_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    submission_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    submission_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    submission_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    submission_file_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_late: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    marks_obtained: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    grade: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'submitted', 'graded', 'resubmit_required', 'missing'),
      allowNull: false,
      defaultValue: 'pending'
    },
    graded_by: {
      type: bigintType,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    graded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    tableName: 'assignment_submissions',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['assignment_id'] },
      { fields: ['student_id'] },
      { fields: ['status'] },
      { fields: ['assignment_id', 'student_id'] }
    ]
  });

  return AssignmentSubmission;
};