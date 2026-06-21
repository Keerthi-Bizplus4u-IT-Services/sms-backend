/**
 * RefreshToken Model
 * Server-side storage for refresh tokens (enables revocation, session tracking)
 */
module.exports = (sequelize, DataTypes) => {
  const bigIntType = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;

  const RefreshToken = sequelize.define('RefreshToken', {
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
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'SHA-256 hash of the refresh token'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Set when token is revoked (logout or rotation)'
    },
    device_info: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'User-Agent or device identifier'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address at token creation (supports IPv6)'
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_hash'] },
      { fields: ['expires_at'] },
      { fields: ['revoked_at'] }
    ]
  });

  /**
   * Check if token is still valid (not expired, not revoked)
   */
  RefreshToken.prototype.isValid = function () {
    return !this.revoked_at && this.expires_at > new Date();
  };

  /**
   * Revoke this token
   */
  RefreshToken.prototype.revoke = async function () {
    this.revoked_at = new Date();
    await this.save();
  };

  return RefreshToken;
};
