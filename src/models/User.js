
const bcrypt = require('bcrypt');

/**
 * User Model
 * Central authentication table for all users
 */
module.exports = (sequelize, DataTypes) => {
  const tinyIntType = sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.TINYINT.UNSIGNED;

  const User = sequelize.define('User', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'bcrypt hash'
    },
    role_id: {
      type: tinyIntType,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    school_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: true,
      references: {
        model: 'schools',
        key: 'id'
      },
      comment: 'Nullable for super_admin who can access all schools'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_login_attempts: {
      type: tinyIntType,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['role_id'] },
      { fields: ['school_id'] },
      { fields: ['is_active'] },
      { fields: ['last_login_at'] }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash') && !user.password_hash.startsWith('$2b$')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      }
    }
  });

  // Instance method to validate password
  User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  // Instance method to increment failed login attempts
  User.prototype.incrementLoginAttempts = async function () {
    this.failed_login_attempts += 1;
    if (this.failed_login_attempts >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || 5)) {
      const lockTime = parseInt(process.env.LOCK_TIME || 900000); // 15 minutes
      this.locked_until = new Date(Date.now() + lockTime);
    }
    await this.save();
  };

  // Instance method to reset login attempts
  User.prototype.resetLoginAttempts = async function () {
    this.failed_login_attempts = 0;
    this.locked_until = null;
    this.last_login_at = new Date();
    await this.save();
  };

  // Instance method to check if account is locked
  User.prototype.isLocked = function () {
    return this.locked_until && this.locked_until > new Date();
  };

  return User;
};
