const { Section, Teacher, Person } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

const classTeacherInclude = {
  model: Teacher,
  as: 'classTeacher',
  required: false,
  attributes: ['id', 'employee_id', 'person_id'],
  include: [
    {
      model: Person,
      as: 'person',
      attributes: ['first_name', 'last_name', 'middle_name']
    }
  ]
};

class SectionRepository {
  async findById(id) {
    return Section.findByPk(id, {
      include: [classTeacherInclude]
    });
  }

  async findAllByClass(classId) {
    return Section.findAll({
      where: { class_id: classId },
      include: [classTeacherInclude],
      order: [['name', 'ASC']]
    });
  }

  async findByClassAndName(classId, name) {
    return Section.findOne({
      where: {
        class_id: classId,
        name
      }
    });
  }

  async create(data) {
    return Section.create(data);
  }

  async update(id, data) {
    const section = await Section.findByPk(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    return section.update(data);
  }

  async delete(id) {
    const section = await Section.findByPk(id);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await section.destroy();
    return true;
  }
}

module.exports = new SectionRepository();