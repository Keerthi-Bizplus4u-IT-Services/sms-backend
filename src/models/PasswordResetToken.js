/**
 * PasswordResetToken Model
 * Stores OTP hashes for password reset flow (replaces in-memory store)
 */
module.exports = (sequelize, DataTypes) => {
  const bigIntType = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;

  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
      type: bigIntType,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: bigIntType,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'SHA-256 hash of the OTP'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Set when OTP is successfully used'
    }
  }, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['otp_hash'] },
      { fields: ['expires_at'] }
    ]
  });

  /**
   * Check if this OTP is still valid (not expired, not used)
   */
  PasswordResetToken.prototype.isValid = function () {
    return !this.used_at && this.expires_at > new Date();
  };

  /**
   * Mark OTP as used
   */
  PasswordResetToken.prototype.markUsed = async function () {
    this.used_at = new Date();
    await this.save();
  };

  return PasswordResetToken;
};
