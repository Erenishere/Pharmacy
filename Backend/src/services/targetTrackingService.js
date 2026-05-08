const SalaryPackage = require('../models/SalaryPackage');
const Invoice = require('../models/Invoice');
const CashReceipt = require('../models/CashReceipt');
const monthlyPerformanceService = require('./monthlyPerformanceService');

class TargetTrackingService {
  /**
   * Track sales target achievement for an employee
   * @param {String} employeeId - Employee ID
   * @param {String} month - Month name (e.g., 'January')
   * @param {Number} year - Year (e.g., 2025)
   * @returns {Promise<Object>} Sales target tracking data
   */
  async trackSalesTarget(employeeId, month, year) {
    try {
      // Get active salary package for employee
      const salaryPackage = await this._getActiveSalaryPackage(employeeId, month, year);

      if (!salaryPackage) {
        return {
          success: false,
          message: 'No active salary package found for employee',
          data: {
            target: 0,
            achieved: 0,
            percentage: 0,
            status: 'no_package',
          },
        };
      }

      const target = salaryPackage.salesTarget.targetAmount || 0;

      if (target === 0) {
        return {
          success: true,
          data: {
            target: 0,
            achieved: 0,
            percentage: 0,
            status: 'no_target',
          },
        };
      }

      const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
        employeeId,
        month,
        year,
      );

      return {
        success: true,
        data: this._formatTargetData(target, performance.salesAmount),
      };
    } catch (error) {
      throw new Error(`Failed to track sales target: ${error.message}`);
    }
  }

  /**
   * Track recovery target achievement for an employee
   * @param {String} employeeId - Employee ID
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Recovery target tracking data
   */
  async trackRecoveryTarget(employeeId, month, year) {
    try {
      // Get active salary package for employee
      const salaryPackage = await this._getActiveSalaryPackage(employeeId, month, year);

      if (!salaryPackage) {
        return {
          success: false,
          message: 'No active salary package found for employee',
          data: {
            target: 0,
            achieved: 0,
            percentage: 0,
            status: 'no_package',
          },
        };
      }

      const target = salaryPackage.recoveryTarget.targetAmount || 0;

      if (target === 0) {
        return {
          success: true,
          data: {
            target: 0,
            achieved: 0,
            percentage: 0,
            status: 'no_target',
          },
        };
      }

      const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
        employeeId,
        month,
        year,
      );

      return {
        success: true,
        data: this._formatTargetData(target, performance.recoveryAmount),
      };
    } catch (error) {
      throw new Error(`Failed to track recovery target: ${error.message}`);
    }
  }

  /**
   * Track party visit target achievement for an employee
   * @param {String} employeeId - Employee ID
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Party visit target tracking data
   */
  async trackPartyVisitTarget(employeeId, month, year) {
    try {
      // Get active salary package for employee
      const salaryPackage = await this._getActiveSalaryPackage(employeeId, month, year);

      if (!salaryPackage) {
        return {
          success: false,
          message: 'No active salary package found for employee',
          data: {
            target: 0,
            achieved: 0,
            percentage: 0,
            status: 'no_package',
          },
        };
      }

      const target = salaryPackage.partyVisitTarget.numberOfOrders || 0;

      if (target === 0) {
        return {
          success: true,
          data: {
            target: 0,
            achieved: 0,
            percentage: 0,
            status: 'no_target',
          },
        };
      }

      const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
        employeeId,
        month,
        year,
      );

      return {
        success: true,
        data: this._formatTargetData(target, performance.visitedParties),
      };
    } catch (error) {
      throw new Error(`Failed to track party visit target: ${error.message}`);
    }
  }

  /**
   * Track mobile orders created by an employee
   * @param {String} employeeId - Employee ID
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Mobile order tracking data
   */
  async trackMobileOrders(employeeId, month, year) {
    try {
      // Get active salary package for employee
      const salaryPackage = await this._getActiveSalaryPackage(employeeId, month, year);

      if (!salaryPackage) {
        return {
          success: false,
          message: 'No active salary package found for employee',
          data: {
            ordersCreated: 0,
            incentiveConfigured: false,
          },
        };
      }

      const incentiveValue = salaryPackage.mobileOrderIncentive.value || 0;
      const incentiveConfigured = incentiveValue > 0;

      const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
        employeeId,
        month,
        year,
      );

      return {
        success: true,
        data: {
          ordersCreated: performance.mobileOrders,
          incentiveConfigured,
          incentiveType: salaryPackage.mobileOrderIncentive.type,
          incentiveValue,
        },
      };
    } catch (error) {
      throw new Error(`Failed to track mobile orders: ${error.message}`);
    }
  }

  /**
   * Track mobile cash recovery by an employee
   * @param {String} employeeId - Employee ID
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Mobile cash recovery tracking data
   */
  async trackMobileCashRecovery(employeeId, month, year) {
    try {
      // Get active salary package for employee
      const salaryPackage = await this._getActiveSalaryPackage(employeeId, month, year);

      if (!salaryPackage) {
        return {
          success: false,
          message: 'No active salary package found for employee',
          data: {
            amountRecovered: 0,
            incentiveConfigured: false,
          },
        };
      }

      const incentiveValue = salaryPackage.mobileCashRecoveryIncentive.value || 0;
      const incentiveConfigured = incentiveValue > 0;

      const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
        employeeId,
        month,
        year,
      );

      return {
        success: true,
        data: {
          amountRecovered: performance.mobileCashRecoveryAmount,
          incentiveConfigured,
          incentiveType: salaryPackage.mobileCashRecoveryIncentive.type,
          incentiveValue,
        },
      };
    } catch (error) {
      throw new Error(`Failed to track mobile cash recovery: ${error.message}`);
    }
  }

  /**
   * Track brand item sales for an employee
   * @param {String} employeeId - Employee ID
   * @param {String} itemId - Item ID
   * @param {Object} duration - Duration object with fromDate and toDate
   * @returns {Promise<Object>} Brand item sales tracking data
   */
  async trackBrandItemSales(employeeId, itemId, duration) {
    try {
      const { fromDate, toDate } = duration;

      // Query Invoice line items for specific item sales
      const salesInvoices = await Invoice.find({
        salesmanId: employeeId,
        type: 'sales',
        status: { $ne: 'cancelled' },
        invoiceDate: { $gte: fromDate, $lte: toDate },
        'items.itemId': itemId,
      });

      // Calculate total quantity sold for this item
      let totalQuantity = 0;
      salesInvoices.forEach((invoice) => {
        invoice.items.forEach((item) => {
          if (item.itemId.toString() === itemId.toString()) {
            totalQuantity += item.quantity || 0;
          }
        });
      });

      return {
        success: true,
        data: {
          itemId,
          quantitySold: totalQuantity,
          invoiceCount: salesInvoices.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to track brand item sales: ${error.message}`);
    }
  }

  /**
   * Get target achievement dashboard for all employees or specific employee
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @param {String} employeeId - Optional employee ID filter
   * @returns {Promise<Object>} Dashboard data with all targets
   */
  async getTargetAchievementDashboard(month, year, employeeId = null) {
    try {
      // Get month date range
      const { startDate, endDate } = this._getMonthDateRange(month, year);

      // Build query for salary packages
      const query = {
        status: 'Active',
        'duration.fromDate': { $lte: endDate },
        'duration.toDate': { $gte: startDate },
      };

      if (employeeId) {
        query.employeeId = employeeId;
      }

      // Fetch active salary packages
      const salaryPackages = await SalaryPackage.find(query)
        .populate('employeeId', 'accountName')
        .sort({ employeeName: 1 });

      if (salaryPackages.length === 0) {
        return {
          success: true,
          data: {
            month,
            year,
            employees: [],
            summary: {
              totalEmployees: 0,
              salesTargetAchievers: 0,
              recoveryTargetAchievers: 0,
              partyVisitTargetAchievers: 0,
            },
          },
        };
      }

      // Aggregate target achievement for each employee
      const employeeData = [];
      let salesTargetAchievers = 0;
      let recoveryTargetAchievers = 0;
      let partyVisitTargetAchievers = 0;

      for (const pkg of salaryPackages) {
        const empId = pkg.employeeId._id.toString();

        const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
          empId,
          month,
          year,
        );
        const salesTarget = {
          success: true,
          data: this._formatTargetData(pkg.salesTarget?.targetAmount || 0, performance.salesAmount),
        };
        const recoveryTarget = {
          success: true,
          data: this._formatTargetData(pkg.recoveryTarget?.targetAmount || 0, performance.recoveryAmount),
        };
        const partyVisitTarget = {
          success: true,
          data: this._formatTargetData(pkg.partyVisitTarget?.numberOfOrders || 0, performance.visitedParties),
        };
        const mobileOrders = {
          success: true,
          data: {
            ordersCreated: performance.mobileOrders,
            incentiveConfigured: (pkg.mobileOrderIncentive?.value || 0) > 0,
            incentiveType: pkg.mobileOrderIncentive?.type,
            incentiveValue: pkg.mobileOrderIncentive?.value || 0,
          },
        };
        const mobileCashRecovery = {
          success: true,
          data: {
            amountRecovered: performance.mobileCashRecoveryAmount,
            incentiveConfigured: (pkg.mobileCashRecoveryIncentive?.value || 0) > 0,
            incentiveType: pkg.mobileCashRecoveryIncentive?.type,
            incentiveValue: pkg.mobileCashRecoveryIncentive?.value || 0,
          },
        };

        // Track brand incentives
        const brandIncentives = [];
        if (pkg.brandIncentives && pkg.brandIncentives.length > 0) {
          for (const brandIncentive of pkg.brandIncentives) {
            // Check if current month falls within brand incentive duration
            const incentiveStart = new Date(brandIncentive.duration.fromDate);
            const incentiveEnd = new Date(brandIncentive.duration.toDate);

            if (startDate <= incentiveEnd && endDate >= incentiveStart) {
              const brandSales = await this.trackBrandItemSales(
                empId,
                brandIncentive.itemId,
                brandIncentive.duration,
              );

              brandIncentives.push({
                itemName: brandIncentive.itemName,
                target: brandIncentive.quantityTarget,
                achieved: brandSales.data.quantitySold,
                percentage: brandIncentive.quantityTarget > 0
                  ? Math.round((brandSales.data.quantitySold / brandIncentive.quantityTarget) * 100 * 100) / 100
                  : 0,
                status: brandSales.data.quantitySold >= brandIncentive.quantityTarget
                  ? 'achieved'
                  : 'pending',
              });
            }
          }
        }

        // Count achievers
        if (salesTarget.data.status === 'achieved') salesTargetAchievers++;
        if (recoveryTarget.data.status === 'achieved') recoveryTargetAchievers++;
        if (partyVisitTarget.data.status === 'achieved') partyVisitTargetAchievers++;

        employeeData.push({
          employeeId: empId,
          employeeName: pkg.employeeName,
          packageId: pkg.packageId,
          salesTarget: salesTarget.data,
          recoveryTarget: recoveryTarget.data,
          partyVisitTarget: partyVisitTarget.data,
          mobileOrders: mobileOrders.data,
          mobileCashRecovery: mobileCashRecovery.data,
          brandIncentives,
        });
      }

      return {
        success: true,
        data: {
          month,
          year,
          employees: employeeData,
          summary: {
            totalEmployees: salaryPackages.length,
            salesTargetAchievers,
            recoveryTargetAchievers,
            partyVisitTargetAchievers,
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to get target achievement dashboard: ${error.message}`);
    }
  }

  /**
   * Helper method to get active salary package for employee
   * @param {String} employeeId - Employee ID
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Salary package or null
   * @private
   */
  async _getActiveSalaryPackage(employeeId, month, year) {
    const { startDate, endDate } = this._getMonthDateRange(month, year);

    const salaryPackage = await SalaryPackage.findOne({
      employeeId,
      status: 'Active',
      'duration.fromDate': { $lte: endDate },
      'duration.toDate': { $gte: startDate },
    });

    return salaryPackage;
  }

  /**
   * Helper method to get month date range
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Object} Start and end dates
   * @private
   */
  _getMonthDateRange(month, year) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthIndex = monthNames.indexOf(month);

    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${month}`);
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  _formatTargetData(target, achieved) {
    const safeTarget = Math.round(Number(target || 0) * 100) / 100;
    const safeAchieved = Math.round(Number(achieved || 0) * 100) / 100;
    const percentage = safeTarget > 0 ? (safeAchieved / safeTarget) * 100 : 0;

    if (safeTarget === 0) {
      return {
        target: 0,
        achieved: safeAchieved,
        percentage: 0,
        status: 'no_target',
        remaining: 0,
      };
    }

    return {
      target: safeTarget,
      achieved: safeAchieved,
      percentage: Math.round(percentage * 100) / 100,
      status: safeAchieved >= safeTarget ? 'achieved' : 'pending',
      remaining: Math.max(0, Math.round((safeTarget - safeAchieved) * 100) / 100),
    };
  }
}

module.exports = new TargetTrackingService();
