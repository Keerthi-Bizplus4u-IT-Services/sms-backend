/**
 * Assignment Model
 * Represents daily assignments posted by teachers for a class and section.
 */
module.exports = (sequelize, DataTypes) => {
  const bigintType = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;
  const integerType = sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED;
  const smallintType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED;

  const Assignment = sequelize.define('Assignment', {
    id: {
      type: bigintType,
      primaryKey: true,
      autoIncrement: true
    },
    academic_year_id: {
      type: smallintType,
      allowNull: false,
      references: {
        model: 'academic_years',
        key: 'id'
      }
    },
    class_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    section_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'sections',
        key: 'id'
      }
    },
    subject_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    teacher_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'teachers',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assignment_type: {
      type: DataTypes.ENUM('homework', 'project', 'practical', 'worksheet', 'online_quiz', 'presentation'),
      allowNull: false,
      defaultValue: 'homework'
    },
    max_marks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0
    },
    weightage_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    allow_late_submission: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    late_submission_penalty_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    attachment_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'assignments',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['academic_year_id'] },
      { fields: ['class_id', 'section_id'] },
      { fields: ['subject_id'] },
      { fields: ['teacher_id'] },
      { fields: ['due_date'] },
      { fields: ['is_active'] }
    ]
  });

  return Assignment;
};