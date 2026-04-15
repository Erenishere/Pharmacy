const targetTrackingService = require('../services/targetTrackingService');

/**
 * Target Tracking Controller
 * Handles HTTP requests for target tracking and achievement monitoring
 */
class TargetTrackingController {
  /**
   * Get employee target achievement
   * GET /api/v1/targets/achievement/:employeeId
   */
  async getEmployeeTargets(req, res) {
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

      // Get target achievement dashboard for specific employee
      const result = await targetTrackingService.getTargetAchievementDashboard(
        month,
        parseInt(year),
        employeeId,
      );

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: 'Target data not found',
          message: result.message || 'No target data found for employee',
        });
      }

      // Extract employee data (should be single employee)
      const employeeData = result.data.employees.length > 0
        ? result.data.employees[0]
        : null;

      if (!employeeData) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
          message: 'No active salary package found for employee',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Employee target achievement retrieved successfully',
        data: {
          employeeId: employeeData.employeeId,
          employeeName: employeeData.employeeName,
          month,
          year: parseInt(year),
          salesTarget: employeeData.salesTarget,
          recoveryTarget: employeeData.recoveryTarget,
          partyVisitTarget: employeeData.partyVisitTarget,
          mobileOrders: employeeData.mobileOrders,
          mobileCashRecovery: employeeData.mobileCashRecovery,
          brandIncentives: employeeData.brandIncentives,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve employee targets',
        message: error.message,
      });
    }
  }

  /**
   * Get target achievement dashboard for all employees
   * GET /api/v1/targets/dashboard
   */
  async getTargetDashboard(req, res) {
    try {
      const {
        month, year, page = 1, limit = 50,
      } = req.query;

      // Validate required query parameters
      if (!month || !year) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'month and year query parameters are required',
        });
      }

      // Get target achievement dashboard for all employees
      const result = await targetTrackingService.getTargetAchievementDashboard(
        month,
        parseInt(year),
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to retrieve dashboard',
          message: result.message || 'Unable to retrieve target dashboard',
        });
      }

      // Apply pagination to employees array
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedEmployees = result.data.employees.slice(startIndex, endIndex);
      const totalRecords = result.data.employees.length;

      res.status(200).json({
        success: true,
        message: 'Target achievement dashboard retrieved successfully',
        data: {
          month,
          year: parseInt(year),
          employees: paginatedEmployees,
          summary: result.data.summary,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          recordsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve target dashboard',
        message: error.message,
      });
    }
  }
}

module.exports = new TargetTrackingController();
