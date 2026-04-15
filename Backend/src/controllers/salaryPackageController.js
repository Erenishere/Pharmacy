const salaryPackageService = require('../services/salaryPackageService');

/**
 * Salary Package Controller
 * Handles HTTP requests for salary package operations
 */
class SalaryPackageController {
  /**
   * Create salary package
   * POST /api/v1/salary-packages
   */
  async createPackage(req, res) {
    try {
      const packageData = req.body;
      const userId = req.user.id;

      const result = await salaryPackageService.createPackage(packageData, userId);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          packageId: result.packageId,
          package: result.data,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create salary package',
        message: error.message,
      });
    }
  }

  /**
   * Get all salary packages with filters
   * GET /api/v1/salary-packages
   */
  async getAllPackages(req, res) {
    try {
      const filters = {
        status: req.query.status,
        year: req.query.year,
        employeeId: req.query.employeeId,
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await salaryPackageService.getAllPackages(filters);

      res.status(200).json({
        success: true,
        message: 'Salary packages retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve salary packages',
        message: error.message,
      });
    }
  }

  /**
   * Get salary package by ID
   * GET /api/v1/salary-packages/:id
   */
  async getPackageById(req, res) {
    try {
      const { id } = req.params;

      const result = await salaryPackageService.getPackageById(id);

      res.status(200).json({
        success: true,
        message: 'Salary package retrieved successfully',
        data: result.data,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Salary package not found',
        message: error.message,
      });
    }
  }

  /**
   * Get salary packages by employee ID
   * GET /api/v1/salary-packages/employee/:employeeId
   */
  async getPackagesByEmployee(req, res) {
    try {
      const { employeeId } = req.params;

      const result = await salaryPackageService.getPackagesByEmployee(employeeId);

      res.status(200).json({
        success: true,
        message: 'Employee salary packages retrieved successfully',
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve employee salary packages',
        message: error.message,
      });
    }
  }

  /**
   * Update salary package
   * PUT /api/v1/salary-packages/:id
   */
  async updatePackage(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const result = await salaryPackageService.updatePackage(id, updates, userId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update salary package',
        message: error.message,
      });
    }
  }

  /**
   * Delete salary package
   * DELETE /api/v1/salary-packages/:id
   */
  async deletePackage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await salaryPackageService.deletePackage(id, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete salary package',
        message: error.message,
      });
    }
  }

  /**
   * Add brand incentive to salary package
   * POST /api/v1/salary-packages/:id/brand-incentives
   */
  async addBrandIncentive(req, res) {
    try {
      const { id } = req.params;
      const incentiveData = req.body;

      const result = await salaryPackageService.addBrandIncentive(id, incentiveData);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to add brand incentive',
        message: error.message,
      });
    }
  }

  /**
   * Remove brand incentive from salary package
   * DELETE /api/v1/salary-packages/:id/brand-incentives/:incentiveId
   */
  async removeBrandIncentive(req, res) {
    try {
      const { id, incentiveId } = req.params;

      const result = await salaryPackageService.removeBrandIncentive(id, incentiveId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to remove brand incentive',
        message: error.message,
      });
    }
  }
}

module.exports = new SalaryPackageController();
