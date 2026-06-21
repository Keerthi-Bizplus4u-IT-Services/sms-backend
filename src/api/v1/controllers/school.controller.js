const { schoolService, schoolBranchService } = require('../services/school.service');
const { success, created } = require('../../../utils/response');

const schoolController = {
  async listSchools(req, res, next) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const schools = await schoolService.listSchools({ includeInactive });
      return success(res, schools, 'Schools retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getSchool(req, res, next) {
    try {
      const school = await schoolService.getSchoolById(req.params.id);
      return success(res, school, 'School retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async createSchool(req, res, next) {
    try {
      const school = await schoolService.createSchool(req.body);
      return created(res, school, 'School created successfully');
    } catch (err) {
      next(err);
    }
  },

  async createSchoolOnboarding(req, res, next) {
    try {
      const result = await schoolService.createSchoolOnboarding(req.body);
      return created(res, result, 'School onboarding completed successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateSchool(req, res, next) {
    try {
      const school = await schoolService.updateSchool(req.params.id, req.body);
      return success(res, school, 'School updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteSchool(req, res, next) {
    try {
      await schoolService.deleteSchool(req.params.id);
      return success(res, null, 'School deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async listBranches(req, res, next) {
    try {
      const branches = await schoolBranchService.listBranches(req.params.id);
      return success(res, branches, 'Branches retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async createBranch(req, res, next) {
    try {
      const branch = await schoolBranchService.createBranch({
        ...req.body,
        school_id: req.params.id
      });
      return created(res, branch, 'Branch created successfully');
    } catch (err) {
      next(err);
    }
  },

  async getOnboardingChecklist(req, res, next) {
    try {
      const checklist = await schoolService.getOnboardingChecklist(req.params.id);
      return success(res, checklist, 'School onboarding checklist retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async cloneSchoolSettings(req, res, next) {
    try {
      const result = await schoolService.cloneSchoolSettings(
        req.params.id,
        req.body.source_school_id,
        req.body.clone_scopes
      );
      return success(res, result, 'School settings cloned successfully');
    } catch (err) {
      next(err);
    }
  },

  async getSchoolSettings(req, res, next) {
    try {
      const result = await schoolService.getSchoolSettings(req.params.id);
      return success(res, result, 'School settings retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateSchoolSettings(req, res, next) {
    try {
      const result = await schoolService.updateSchoolSettings(req.params.id, req.body);
      return success(res, result, 'School settings updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async importDummyData(req, res, next) {
    try {
      const result = await schoolService.importDummyData(req.params.id);
      return success(res, result, 'Dummy data imported successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteDummyData(req, res, next) {
    try {
      const result = await schoolService.deleteDummyData(req.params.id);
      return success(res, result, 'Dummy data deleted successfully');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = schoolController;
