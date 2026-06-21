/**
 * StudentCertificate Model
 * Tracks issued certificates (TC, Study & Conduct) with serial numbers
 */

module.exports = (sequelize, DataTypes) => {
  const StudentCertificate = sequelize.define('StudentCertificate', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      references: {
        model: 'students',
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
    exit_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      references: {
        model: 'student_exits',
        key: 'id'
      }
    },
    certificate_type: {
      type: DataTypes.ENUM('transfer_certificate', 'study_conduct_certificate'),
      allowNull: false
    },
    certificate_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Auto-generated serial e.g. TC/2026/0001'
    },
    issued_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    issued_by: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'student_certificates',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['student_id'] },
      { fields: ['school_id'] },
      { fields: ['exit_id'] },
      { fields: ['certificate_type'] },
      { fields: ['certificate_number'], unique: true },
      { fields: ['issued_date'] },
      {
        fields: ['student_id', 'certificate_type', 'exit_id'],
        unique: true,
        name: 'uq_student_cert_type_exit'
      }
    ]
  });

  return StudentCertificate;
};
