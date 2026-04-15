const salarySheetService = require('../services/salarySheetService');

class SalarySheetController {
  /**
   * Create a new salary sheet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async create(req, res) {
    try {
      const salarySheet = await salarySheetService.createSalarySheet(
        req.body,
        req.user._id
      );
      res.status(201).json({
        success: true,
        data: salarySheet,
        message: 'Salary sheet created successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all salary sheets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAll(req, res) {
    try {
      const result = await salarySheetService.getAllSalarySheets(req.query);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get salary sheet by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getById(req, res) {
    try {
      const salarySheet = await salarySheetService.getSalarySheetById(req.params.id);
      res.status(200).json({
        success: true,
        data: salarySheet,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update salary sheet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async update(req, res) {
    try {
      const salarySheet = await salarySheetService.updateSalarySheet(
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data: salarySheet,
        message: 'Salary sheet updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete salary sheet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async delete(req, res) {
    try {
      await salarySheetService.deleteSalarySheet(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Salary sheet deleted successfully',
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get salary sheets by dimension
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getByDimension(req, res) {
    try {
      const salarySheets = await salarySheetService.getByDimension(req.params.dimensionId);
      res.status(200).json({
        success: true,
        data: salarySheets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get salary sheets by period
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getByPeriod(req, res) {
    try {
      const { month, year } = req.params;
      const salarySheets = await salarySheetService.getByPeriod(
        parseInt(month),
        parseInt(year)
      );
      res.status(200).json({
        success: true,
        data: salarySheets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update salary sheet status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const salarySheet = await salarySheetService.updateStatus(req.params.id, status);
      res.status(200).json({
        success: true,
        data: salarySheet,
        message: `Status updated to ${status}`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get employee salary history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmployeeHistory(req, res) {
    try {
      const { limit } = req.query;
      const history = await salarySheetService.getEmployeeSalaryHistory(
        req.params.employeeId,
        limit ? parseInt(limit) : 12
      );
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get employee basic pay (auto-populate)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmployeeBasicPay(req, res) {
    try {
      const basicPay = await salarySheetService.getEmployeeBasicPay(req.params.employeeId);
      res.status(200).json({
        success: true,
        data: { basicPay },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new SalarySheetController();
