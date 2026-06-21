/**
 * Teacher Model
 * Extends Person with teacher-specific information
 */

module.exports = (sequelize, DataTypes) => {
  const Teacher = sequelize.define('Teacher', {
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
      allowNull: true,
      references: {
        model: 'school_branches',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    join_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    experience_years: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      comment: 'Years of teaching experience'
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    employment_status: {
      type: DataTypes.ENUM('active', 'on_leave', 'resigned', 'terminated'),
      allowNull: true,
      defaultValue: 'active'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'on_leave', 'resigned'),
      defaultValue: 'active'
    },
    resignation_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    tableName: 'teachers',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['person_id'] },
      { fields: ['employee_id'] },
      { fields: ['school_id'] },
      { fields: ['branch_id'] },
      { fields: ['status'] },
      { fields: ['join_date'] }
    ]
  });
  return Teacher;
};
