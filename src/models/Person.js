/**
 * Person Model
 * Base information for all people (students, teachers, parents, staff)
 */

module.exports = (sequelize, DataTypes) => {
  const Person = sequelize.define('Person', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      unique: true,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    middle_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
      allowNull: false
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    blood_group: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true
    },
    religion: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    id_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: true,
      comment: 'Aadhar/ID card number'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    alternate_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'India'
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    aadhar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Stored location for teacher/staff Aadhar document'
    },
    pan_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Stored location for teacher/staff PAN document'
    },
    father_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    father_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    father_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    mother_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    mother_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    mother_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    guardian_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nationality: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Indian'
    },
    caste: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('general', 'obc', 'sc', 'st', 'ews'),
      allowNull: true
    }
  }, {
    tableName: 'persons',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['first_name'] },
      { fields: ['last_name'] },
      { fields: ['id_number'] },
      { fields: ['phone'] },
      { fields: ['email'] }
    ]
  });

  // Virtual field for full name
  Person.prototype.getFullName = function() {
    return `${this.first_name} ${this.middle_name ? this.middle_name + ' ' : ''}${this.last_name}`;
  };

  return Person;
};
