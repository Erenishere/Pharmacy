const SalarySheet = require('../models/SalarySheet');
const { handlePagination } = require('../utils/paginationHelper');

class SalarySheetService {
  /**
   * Create a new salary sheet
   * @param {Object} data - Salary sheet data
   * @param {String} userId - User creating the sheet
   * @returns {Promise<Object>} Created salary sheet
   */
  async createSalarySheet(data, userId) {
    // Check if salary sheet already exists for this employee and period
    const existing = await SalarySheet.findByEmployeeAndPeriod(
      data.employeeId,
      data.month,
      data.year
    );

    if (existing) {
      throw new Error('Salary sheet already exists for this employee and period');
    }

    const salarySheet = new SalarySheet({
      ...data,
      createdBy: userId,
    });

    return await salarySheet.save();
  }

  /**
   * Get all salary sheets with pagination
   * @param {Object} query - Query parameters
   * @returns {Promise<Object>} Salary sheets with pagination info
   */
  async getAllSalarySheets(query = {}) {
    const { page = 1, limit = 20, dimensionId, employeeId, month, year, status, isActive = true } = query;

    const filter = { isActive };

    if (dimensionId) filter.dimensionId = dimensionId;
    if (employeeId) filter.employeeId = employeeId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const populateOptions = [
      { path: 'employeeId', select: 'name code contactInfo.phone' },
      { path: 'dimensionId', select: 'name dimensionName' },
      { path: 'createdBy', select: 'username' },
      { path: 'targets.basicSalesTarget.itemId', select: 'name' },
      { path: 'specialItemSales.itemId', select: 'name' },
    ];

    return await handlePagination(SalarySheet, filter, page, limit, populateOptions);
  }

  /**
   * Get salary sheet by ID
   * @param {String} id - Salary sheet ID
   * @returns {Promise<Object>} Salary sheet
   */
  async getSalarySheetById(id) {
    const salarySheet = await SalarySheet.findById(id)
      .populate('employeeId', 'name code contactInfo.phone employeeBiodata.basicPay')
      .populate('dimensionId', 'name dimensionName')
      .populate('createdBy', 'username')
      .populate('specialItemSales.itemId', 'name');

    if (!salarySheet) {
      throw new Error('Salary sheet not found');
    }

    return salarySheet;
  }

  /**
   * Update salary sheet
   * @param {String} id - Salary sheet ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated salary sheet
   */
  async updateSalarySheet(id, data) {
    const salarySheet = await SalarySheet.findById(id);

    if (!salarySheet) {
      throw new Error('Salary sheet not found');
    }

    // Check if employee and period changed and if it conflicts with existing
    if ((data.employeeId && data.employeeId !== String(salarySheet.employeeId)) ||
        (data.month && data.month !== salarySheet.month) ||
        (data.year && data.year !== salarySheet.year)) {

      const existing = await SalarySheet.findByEmployeeAndPeriod(
        data.employeeId || salarySheet.employeeId,
        data.month || salarySheet.month,
        data.year || salarySheet.year
      );

      if (existing && String(existing._id) !== id) {
        throw new Error('Salary sheet already exists for this employee and period');
      }
    }

    // Update fields
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        salarySheet[key] = data[key];
      }
    });

    return await salarySheet.save();
  }

  /**
   * Delete (soft delete) salary sheet
   * @param {String} id - Salary sheet ID
   * @returns {Promise<Object>} Deleted salary sheet
   */
  async deleteSalarySheet(id) {
    const salarySheet = await SalarySheet.findById(id);

    if (!salarySheet) {
      throw new Error('Salary sheet not found');
    }

    salarySheet.isActive = false;
    return await salarySheet.save();
  }

  /**
   * Get salary sheets by dimension
   * @param {String} dimensionId - Dimension ID
   * @returns {Promise<Array>} Salary sheets
   */
  async getByDimension(dimensionId) {
    return await SalarySheet.findByDimension(dimensionId);
  }

  /**
   * Get salary sheets by period
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Promise<Array>} Salary sheets
   */
  async getByPeriod(month, year) {
    return await SalarySheet.findByPeriod(month, year);
  }

  /**
   * Update salary sheet status
   * @param {String} id - Salary sheet ID
   * @param {String} status - New status
   * @returns {Promise<Object>} Updated salary sheet
   */
  async updateStatus(id, status) {
    const validStatuses = ['draft', 'active', 'paid', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const salarySheet = await SalarySheet.findById(id);

    if (!salarySheet) {
      throw new Error('Salary sheet not found');
    }

    salarySheet.status = status;
    return await salarySheet.save();
  }

  /**
   * Get employee salary history
   * @param {String} employeeId - Employee ID
   * @param {Number} limit - Number of records
   * @returns {Promise<Array>} Salary history
   */
  async getEmployeeSalaryHistory(employeeId, limit = 12) {
    return await SalarySheet.find({ employeeId, isActive: true })
      .sort({ year: -1, month: -1 })
      .limit(limit)
      .populate('employeeId', 'name code');
  }

  /**
   * Get auto-populated basic pay for employee
   * @param {String} employeeId - Employee ID
   * @returns {Promise<Number>} Basic pay
   */
  async getEmployeeBasicPay(employeeId) {
    const Customer = require('../models/Customer');
    const employee = await Customer.findById(employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee.employeeBiodata?.basicPay || 0;
  }
}

module.exports = new SalarySheetService();
