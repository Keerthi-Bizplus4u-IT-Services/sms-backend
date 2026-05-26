/**
 * SchoolGroupMember Model
 * Junction table linking schools to groups.
 */
module.exports = (sequelize, DataTypes) => {
  const SchoolGroupMember = sequelize.define(
    'SchoolGroupMember',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'school_groups', key: 'id' }
      },
      school_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'schools', key: 'id' }
      }
    },
    {
      tableName: 'school_group_members',
      timestamps: true,
      paranoid: false,
      indexes: [
        { unique: true, fields: ['group_id', 'school_id'] },
        { fields: ['group_id'] },
        { fields: ['school_id'] }
      ]
    }
  );

  return SchoolGroupMember;
};
