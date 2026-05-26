/**
 * StudentAchievement Model
 * Tracks student achievements such as awards, certificates, competitions
 */
module.exports = (sequelize, DataTypes) => {
  const bigintType = sequelize.getDialect() === 'postgres' ? DataTypes.BIGINT : DataTypes.BIGINT.UNSIGNED;

  const StudentAchievement = sequelize.define('StudentAchievement', {
    id: {
      type: bigintType,
      primaryKey: true,
      autoIncrement: true
    },
    student_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    school_id: {
      type: bigintType,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    achievement_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'award'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    awarded_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    awarded_by: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'student_achievements',
    timestamps: true,
    paranoid: false,
    deletedAt: false,
    underscored: true,
    indexes: [
      { fields: ['student_id'] },
      { fields: ['school_id'] },
      { fields: ['achievement_type'] },
      { fields: ['awarded_date'] }
    ]
  });

  return StudentAchievement;
};
