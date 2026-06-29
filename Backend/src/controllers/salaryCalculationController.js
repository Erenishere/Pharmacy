const salaryCalculationService = require('../services/salaryCalculationService');
const SalaryCalculation = require('../models/SalaryCalculation');
const SalaryPackage = require('../models/SalaryPackage');

/**
 * Salary Calculation Controller
 * Handles HTTP requests for salary calculation operations
 */
class SalaryCalculationController {
  /**
   * Calculate salary for a specific month
   * POST /api/v1/salary/calculate
   */
  async calculateSalary(req, res) {
    try {
      let { packageId, employeeId, employee, month, year } = req.body;
      const userId = req.user.id;

      const empId = employeeId || employee;

      // Resolve active package if packageId not explicitly supplied but employee reference is
      if (!packageId && empId) {
        const activePackage = await SalaryPackage.findOne({ employeeId: empId, status: 'Active' });
        if (!activePackage) {
          return res.status(400).json({
            success: false,
            error: 'No active salary package found',
            message: 'An active salary package is required for this employee to calculate salary.',
          });
        }
        packageId = activePackage._id;
      }

      // Validate required fields
      if (!packageId || !month || !year) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'employeeId (or packageId), month, and year are required',
        });
      }

      const result = await salaryCalculationService.calculateSalary(
        packageId,
        month,
        year,
        userId,
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          calculation: result.data,
          grossSalary: result.data.grossSalary,
          netSalary: result.data.netSalary,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to calculate salary',
        message: error.message,
      });
    }
  }

  /**
   * Get salary sheet for an employee
   * GET /api/v1/salary/sheet/:employeeId
   */
  async getSalarySheet(req, res) {
    try {
      const { employeeId } = req.params;
      const { month, year } = req.query;

      // Validate required query parameters
      if (!month || !year) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'month and year query parameters are required',
        });
      }

      // Find the salary calculation for the employee, month, and year
      const calculation = await SalaryCalculation.findOne({
        employeeId,
        month,
        year: parseInt(year),
      })
        .populate('employeeId', 'name employeeBiodata.basicPay')
        .populate('packageId');

      if (!calculation) {
        return res.status(404).json({
          success: false,
          error: 'Salary calculation not found',
          message: `No salary calculation found for ${month} ${year}`,
        });
      }

      // Generate formatted salary sheet
      const salarySheet = await salaryCalculationService.generateSalarySheet(
        calculation._id,
      );

      res.status(200).json({
        success: true,
        message: 'Salary sheet retrieved successfully',
        data: salarySheet.data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve salary sheet',
        message: error.message,
      });
    }
  }

  /**
   * List all salary calculations with filters
   * GET /api/v1/salary/calculations
   */
  async getAllCalculations(req, res) {
    try {
      const {
        month, year, employeeId, page = 1, limit = 10,
      } = req.query;

      // Build query filters
      const filters = {};
      if (month) filters.month = month;
      if (year) filters.year = parseInt(year);
      if (employeeId) filters.employeeId = employeeId;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Query calculations with filters
      const calculations = await SalaryCalculation.find(filters)
        .populate('employeeId', 'name employeeBiodata.basicPay')
        .populate('packageId', 'duration status')
        .populate('calculatedBy', 'username')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const totalCount = await SalaryCalculation.countDocuments(filters);

      res.status(200).json({
        success: true,
        message: 'Salary calculations retrieved successfully',
        data: calculations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalRecords: totalCount,
          recordsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve salary calculations',
        message: error.message,
      });
    }
  }
}

module.exports = new SalaryCalculationController();
