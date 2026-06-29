const expenseRepository = require('../repositories/expense.repository');

class ExpenseService {
  async getExpenses(query = {}, scope = {}) {
    const { page, pageSize, ...filters } = query;
    return await expenseRepository.findAll({
      page,
      pageSize,
      filters
    }, scope);
  }

  async createExpense(data, scope = {}) {
    return await expenseRepository.create(data, scope);
  }

  async deleteExpense(eid, scope = {}) {
    return await expenseRepository.deleteById(eid, scope);
  }
}

module.exports = new ExpenseService();
