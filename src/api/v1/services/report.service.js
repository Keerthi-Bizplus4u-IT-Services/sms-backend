const reportRepository = require('../repositories/report.repository');

class ReportService {
  async dataIntegrityPreview(scope = {}) {
    return await reportRepository.dataIntegrityPreview(scope);
  }

  async feeReport(scope = {}) {
    return await reportRepository.feeReport(scope);
  }

  async expenseReport(scope = {}) {
    return await reportRepository.expenseReport(scope);
  }

  async studentReport(scope = {}) {
    return await reportRepository.studentReport(scope);
  }

  async financialSummary(scope = {}) {
    return await reportRepository.financialSummary(scope);
  }
}

module.exports = new ReportService();
