const SalaryPackage = require('../models/SalaryPackage');
const Customer = require('../models/Customer');
const Item = require('../models/Item');

class SalaryPackageService {
  /**
   * Create a new salary package
   * @param {Object} packageData - Package data
   * @param {String} userId - User creating the package
   * @returns {Promise<Object>} Created package
   */
  async createPackage(packageData, userId) {
    try {
      // Validate employee exists
      const employee = await Customer.findById(packageData.employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.accountType !== 'employee') {
        throw new Error('Selected account is not an employee');
      }

      // Validate brand incentive items exist
      if (packageData.brandIncentives && packageData.brandIncentives.length > 0) {
        for (const incentive of packageData.brandIncentives) {
          const item = await Item.findById(incentive.itemId);
          if (!item) {
            throw new Error(`Item not found: ${incentive.itemId}`);
          }
          incentive.itemName = item.name;
        }
      }

      // Create package
      const salaryPackage = new SalaryPackage({
        ...packageData,
        createdBy: userId,
      });

      await salaryPackage.save();

      return {
        success: true,
        packageId: salaryPackage.packageId,
        data: salaryPackage,
        message: 'Salary package created successfully',
      };
    } catch (error) {
      throw new Error(`Failed to create salary package: ${error.message}`);
    }
  }

  /**
   * Update an existing salary package
   * @param {String} packageId - Package ID
   * @param {Object} updates - Updates to apply
   * @param {String} userId - User updating the package
   * @returns {Promise<Object>} Updated package
   */
  async updatePackage(packageId, updates, userId) {
    try {
      const salaryPackage = await SalaryPackage.findById(packageId);

      if (!salaryPackage) {
        throw new Error('Salary package not found');
      }

      // Validate brand incentive items if updated
      if (updates.brandIncentives && updates.brandIncentives.length > 0) {
        for (const incentive of updates.brandIncentives) {
          const item = await Item.findById(incentive.itemId);
          if (!item) {
            throw new Error(`Item not found: ${incentive.itemId}`);
          }
          incentive.itemName = item.name;
        }
      }

      // Apply updates
      Object.assign(salaryPackage, updates);
      salaryPackage.updatedBy = userId;

      await salaryPackage.save();

      return {
        success: true,
        data: salaryPackage,
        message: 'Salary package updated successfully',
      };
    } catch (error) {
      throw new Error(`Failed to update salary package: ${error.message}`);
    }
  }

  /**
   * Get salary package by ID
   * @param {String} packageId - Package ID
   * @returns {Promise<Object>} Package data
   */
  async getPackageById(packageId) {
    try {
      const salaryPackage = await SalaryPackage.findById(packageId)
        .populate('employeeId', 'name employeeBiodata.basicPay')
        .populate('brandIncentives.itemId', 'name')
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username');

      if (!salaryPackage) {
        throw new Error('Salary package not found');
      }

      return {
        success: true,
        data: salaryPackage,
      };
    } catch (error) {
      throw new Error(`Failed to get salary package: ${error.message}`);
    }
  }

  /**
   * Get all packages for an employee
   * @param {String} employeeId - Employee ID
   * @returns {Promise<Object>} Employee packages
   */
  async getPackagesByEmployee(employeeId) {
    try {
      const packages = await SalaryPackage.find({ employeeId })
        .sort({ 'duration.fromDate': -1 })
        .populate('employeeId', 'name employeeBiodata.basicPay')
        .populate('createdBy', 'username');

      return {
        success: true,
        data: packages,
        count: packages.length,
      };
    } catch (error) {
      throw new Error(`Failed to get employee packages: ${error.message}`);
    }
  }

  /**
   * Get all packages with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Filtered packages
   */
  async getAllPackages(filters = {}) {
    try {
      const query = {};

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.year) {
        query['duration.fromDate'] = {
          $gte: new Date(`${filters.year}-01-01`),
          $lte: new Date(`${filters.year}-12-31`),
        };
      }

      if (filters.employeeId) {
        query.employeeId = filters.employeeId;
      }

      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const skip = (page - 1) * limit;

      const packages = await SalaryPackage.find(query)
        .sort({ 'duration.fromDate': -1 })
        .skip(skip)
        .limit(limit)
        .populate('employeeId', 'name employeeBiodata.basicPay')
        .populate('createdBy', 'username');

      const total = await SalaryPackage.countDocuments(query);

      return {
        success: true,
        data: packages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get salary packages: ${error.message}`);
    }
  }

  /**
   * Delete a salary package (soft delete)
   * @param {String} packageId - Package ID
   * @param {String} userId - User deleting the package
   * @returns {Promise<Object>} Deletion result
   */
  async deletePackage(packageId, userId) {
    try {
      const salaryPackage = await SalaryPackage.findById(packageId);

      if (!salaryPackage) {
        throw new Error('Salary package not found');
      }

      // Soft delete by setting status to Inactive
      salaryPackage.status = 'Inactive';
      salaryPackage.updatedBy = userId;
      await salaryPackage.save();

      return {
        success: true,
        message: 'Salary package deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete salary package: ${error.message}`);
    }
  }

  /**
   * Add a brand incentive to a package
   * @param {String} packageId - Package ID
   * @param {Object} incentiveData - Incentive data
   * @returns {Promise<Object>} Updated package
   */
  async addBrandIncentive(packageId, incentiveData) {
    try {
      const salaryPackage = await SalaryPackage.findById(packageId);

      if (!salaryPackage) {
        throw new Error('Salary package not found');
      }

      // Validate item exists
      const item = await Item.findById(incentiveData.itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      incentiveData.itemName = item.name;

      // Add incentive
      salaryPackage.brandIncentives.push(incentiveData);
      await salaryPackage.save();

      return {
        success: true,
        data: salaryPackage,
        message: 'Brand incentive added successfully',
      };
    } catch (error) {
      throw new Error(`Failed to add brand incentive: ${error.message}`);
    }
  }

  /**
   * Remove a brand incentive from a package
   * @param {String} packageId - Package ID
   * @param {String} incentiveId - Incentive ID
   * @returns {Promise<Object>} Updated package
   */
  async removeBrandIncentive(packageId, incentiveId) {
    try {
      const salaryPackage = await SalaryPackage.findById(packageId);

      if (!salaryPackage) {
        throw new Error('Salary package not found');
      }

      // Remove incentive
      salaryPackage.brandIncentives = salaryPackage.brandIncentives.filter(
        (incentive) => incentive._id.toString() !== incentiveId,
      );

      await salaryPackage.save();

      return {
        success: true,
        data: salaryPackage,
        message: 'Brand incentive removed successfully',
      };
    } catch (error) {
      throw new Error(`Failed to remove brand incentive: ${error.message}`);
    }
  }
}

module.exports = new SalaryPackageService();
