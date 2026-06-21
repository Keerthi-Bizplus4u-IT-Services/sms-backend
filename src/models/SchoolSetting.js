/**
 * SchoolSetting Model
 * Stores school-level feature toggles and related settings.
 */
module.exports = (sequelize, DataTypes) => {
  const SchoolSetting = sequelize.define(
    'SchoolSetting',
    {
      id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        primaryKey: true,
        autoIncrement: true
      },
      school_id: {
        type: (sequelize.getDialect() === 'postgres' ? DataTypes.INTEGER : DataTypes.INTEGER.UNSIGNED),
        allowNull: false,
        unique: true,
        references: {
          model: 'schools',
          key: 'id'
        }
      },
      transport_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      stock_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      hostel_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      bunny_cdn_api_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      bunny_cdn_storage_zone: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      bunny_cdn_pull_zone: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      bunny_cdn_storage_zone_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      smtp_host: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      smtp_port: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      smtp_user: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      smtp_password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      smtp_from_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      smtp_from_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      smtp_secure: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'school_settings',
      timestamps: true,
      paranoid: false,
      indexes: [
        { unique: true, fields: ['school_id'] },
        { fields: ['transport_enabled'] },
        { fields: ['stock_enabled'] },
        { fields: ['hostel_enabled'] }
      ]
    }
  );

  return SchoolSetting;
};