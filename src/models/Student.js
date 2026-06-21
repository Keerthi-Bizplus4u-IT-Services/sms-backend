/**
 * Student Model
 * Extends Person with student-specific information
 */

module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define('Student', {
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
    school_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
      allowNull: false,
      references: {
        model: 'schools',
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
    admission_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    apar_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Student APAR identifier'
    },
    roll_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    class_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    section_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      references: {
        model: 'sections',
        key: 'id'
      }
    },
    admission_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'graduated', 'transferred', 'expelled'),
      allowNull: false,
      defaultValue: 'active',
      field: 'current_status'
    },
    previous_school: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'students',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['person_id'] },
      { fields: ['admission_number'] },
      { fields: ['apar_id'] },
      { fields: ['roll_number'] },
      { fields: ['class_id'] },
      { fields: ['section_id'] },
      { fields: ['school_id'] },
      { fields: ['branch_id'] },
      { fields: ['current_status'] },
      { fields: ['admission_date'] }
    ]
  });
  return Student;
};
