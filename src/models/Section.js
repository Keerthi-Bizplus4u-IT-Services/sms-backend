/**
 * Section Model
 * Represents sections within classes (e.g., A, B, C)
 */
module.exports = (sequelize, DataTypes) => {
  const Section = sequelize.define('Section', {
    id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      primaryKey: true,
      autoIncrement: true
    },
    class_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'e.g., A, B, C'
    },
    max_students: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.SMALLINT : DataTypes.SMALLINT.UNSIGNED),
      defaultValue: 40,
      field: 'capacity',
      comment: 'Maximum capacity'
    },
    room_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    class_teacher_id: {
      type: (sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED),
      allowNull: true,
      references: {
        model: 'teachers',
        key: 'id'
      }
    }
  }, {
    tableName: 'sections',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['class_id'] },
      { fields: ['class_teacher_id'] },
      { fields: ['name'] },
      { unique: true, fields: ['class_id', 'name'] }
    ]
  });
  return Section;
};
