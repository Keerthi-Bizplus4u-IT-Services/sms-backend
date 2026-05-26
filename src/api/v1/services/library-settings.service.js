const librarySettingsRepository = require('../repositories/library-settings.repository');

class LibrarySettingsService {
  async getSettings(scope = {}) {
    return librarySettingsRepository.findAllSettings(scope);
  }

  async upsertSettings(data, scope = {}) {
    return librarySettingsRepository.upsertSettings(data, scope);
  }

  async getFineRules(scope = {}) {
    return librarySettingsRepository.getAllFineRules(scope);
  }

  async createFineRule(data, scope = {}) {
    return librarySettingsRepository.createFineRule(data, scope);
  }

  async updateFineRule(id, data, scope = {}) {
    return librarySettingsRepository.updateFineRule(id, data, scope);
  }

  async deleteFineRule(id, scope = {}) {
    return librarySettingsRepository.deleteFineRule(id, scope);
  }
}

module.exports = new LibrarySettingsService();
