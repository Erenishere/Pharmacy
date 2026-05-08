const SalaryPackage = require('../models/SalaryPackage');
const SalaryCalculation = require('../models/SalaryCalculation');
const Invoice = require('../models/Invoice');
const CashReceipt = require('../models/CashReceipt');
const monthlyPerformanceService = require('./monthlyPerformanceService');

class SalaryCalculationService {
  /**
   * Main calculation orchestrator
   * @param {String} packageId - Salary package ID
   * @param {String} month - Month name (e.g., 'January')
   * @param {Number} year - Year (e.g., 2025)
   * @param {String} userId - User performing calculation
   * @returns {Promise<Object>} Calculation result
   */
  async calculateSalary(packageId, month, year, userId) {
    try {
      // Fetch salary package
      const salaryPackage = await SalaryPackage.findById(packageId)
        .populate('employeeId', 'name employeeBiodata.basicPay');

      if (!salaryPackage) {
        throw new Error('Salary package not found');
      }

      if (salaryPackage.status !== 'Active') {
        throw new Error('Salary package is not active');
      }

      // Check if calculation already exists
      const existingCalculation = await SalaryCalculation.findOne({
        packageId,
        month,
        year,
      });

      if (existingCalculation) {
        throw new Error(`Salary calculation already exists for ${month} ${year}`);
      }

      // Calculate fixed components
      const fixedComponents = this.calculateFixedComponents(salaryPackage);
      const performance = await monthlyPerformanceService.getEmployeeMonthlyPerformance(
        salaryPackage.employeeId,
        month,
        year,
      );

      // Calculate sales incentive
      const salesIncentive = await this.calculateSalesIncentive(
        salaryPackage,
        month,
        year,
        performance,
      );

      // Calculate recovery incentive
      const recoveryIncentive = await this.calculateRecoveryIncentive(
        salaryPackage,
        month,
        year,
        performance,
      );

      // Calculate party visit incentive
      const partyVisitIncentive = await this.calculatePartyVisitIncentive(
        salaryPackage,
        month,
        year,
        performance,
      );

      // Calculate mobile order incentive
      const mobileOrderIncentive = await this.calculateMobileOrderIncentive(
        salaryPackage,
        month,
        year,
        performance,
      );

      // Calculate mobile cash recovery incentive
      const mobileCashRecoveryIncentive = await this.calculateMobileCashRecoveryIncentive(
        salaryPackage,
        month,
        year,
        performance,
      );

      // Calculate brand incentives
      const brandIncentives = await this.calculateBrandIncentives(
        salaryPackage,
        month,
        year,
      );

      // Calculate bonuses
      const bonuses = this.calculateBonuses(salaryPackage, month);

      // Calculate gross salary
      const grossSalary = fixedComponents.basicPay
        + fixedComponents.dailyAllowance
        + fixedComponents.petrolAllowance
        + fixedComponents.mobilePackage
        + salesIncentive.amount
        + recoveryIncentive.amount
        + partyVisitIncentive.amount
        + mobileOrderIncentive.amount
        + mobileCashRecoveryIncentive.amount
        + brandIncentives.reduce((sum, bi) => sum + bi.amount, 0)
        + bonuses.reduce((sum, b) => sum + b.amount, 0);

      // Apply deductions (default to 0 for now)
      const deductions = {
        tax: 0,
        advance: 0,
        loan: 0,
        other: 0,
      };

      const netSalary = this.applyDeductions(grossSalary, deductions);

      // Create salary calculation record
      const salaryCalculation = new SalaryCalculation({
        packageId: salaryPackage._id,
        employeeId: salaryPackage.employeeId._id,
        employeeName: salaryPackage.employeeName,
        month,
        year,
        basicPay: fixedComponents.basicPay,
        dailyAllowance: fixedComponents.dailyAllowance,
        petrolAllowance: fixedComponents.petrolAllowance,
        mobilePackage: fixedComponents.mobilePackage,
        salesIncentive,
        recoveryIncentive,
        partyVisitIncentive,
        mobileOrderIncentive,
        mobileCashRecoveryIncentive,
        brandIncentives,
        bonuses,
        grossSalary,
        deductions,
        netSalary,
        calculatedBy: userId,
      });

      await salaryCalculation.save();

      return {
        success: true,
        data: salaryCalculation,
        message: 'Salary calculated successfully',
      };
    } catch (error) {
      throw new Error(`Failed to calculate salary: ${error.message}`);
    }
  }

  /**
   * Calculate fixed components (basic pay, allowances, packages)
   * @param {Object} salaryPackage - Salary package
   * @returns {Object} Fixed components
   */
  calculateFixedComponents(salaryPackage) {
    const basicPay = salaryPackage.basicPay.amount || 0;

    // Calculate daily allowance
    let dailyAllowance = 0;
    if (salaryPackage.dailyAllowance.type === 'Fix Amount') {
      dailyAllowance = salaryPackage.dailyAllowance.value;
    } else if (salaryPackage.dailyAllowance.type === '%') {
      dailyAllowance = (basicPay * salaryPackage.dailyAllowance.value) / 100;
    } else if (salaryPackage.dailyAllowance.type === 'Amount') {
      dailyAllowance = salaryPackage.dailyAllowance.value;
    }

    // Calculate petrol allowance
    let petrolAllowance = 0;
    if (salaryPackage.petrolAllowance.type === 'Fix Amount') {
      petrolAllowance = salaryPackage.petrolAllowance.value;
    } else if (salaryPackage.petrolAllowance.type === '%') {
      petrolAllowance = (basicPay * salaryPackage.petrolAllowance.value) / 100;
    } else if (salaryPackage.petrolAllowance.type === 'Amount') {
      petrolAllowance = salaryPackage.petrolAllowance.value;
    }

    // Calculate mobile package
    let mobilePackage = 0;
    if (salaryPackage.mobilePackage.type === 'Fix Amount') {
      mobilePackage = salaryPackage.mobilePackage.value;
    } else if (salaryPackage.mobilePackage.type === '%') {
      mobilePackage = (basicPay * salaryPackage.mobilePackage.value) / 100;
    } else if (salaryPackage.mobilePackage.type === 'Amount') {
      mobilePackage = salaryPackage.mobilePackage.value;
    }

    return {
      basicPay,
      dailyAllowance,
      petrolAllowance,
      mobilePackage,
    };
  }

  /**
   * Calculate sales incentive
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Sales incentive details
   */
  async calculateSalesIncentive(salaryPackage, month, year, performance = null) {
    try {
      const target = salaryPackage.salesTarget.targetAmount || 0;

      if (target === 0) {
        return {
          target: 0, achieved: 0, percentage: 0, amount: 0,
        };
      }

      const monthlyPerformance = performance
        || await monthlyPerformanceService.getEmployeeMonthlyPerformance(
          salaryPackage.employeeId,
          month,
          year,
        );
      const achieved = monthlyPerformance.salesAmount;

      const percentage = target > 0 ? (achieved / target) * 100 : 0;

      // Calculate incentive based on type
      let amount = 0;
      const { incentiveType } = salaryPackage.salesTarget;
      const incentiveValue = salaryPackage.salesTarget.incentiveValue || 0;

      if (achieved >= target) {
        if (incentiveType === 'Fix Amount') {
          amount = incentiveValue;
        } else if (incentiveType === 'Amount') {
          amount = incentiveValue;
        } else if (incentiveType === '%') {
          // Calculate percentage of sales above target
          const excessSales = achieved - target;
          amount = (excessSales * incentiveValue) / 100;
        }
      }

      return {
        target,
        achieved,
        percentage: Math.round(percentage * 100) / 100,
        amount: Math.round(amount * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to calculate sales incentive: ${error.message}`);
    }
  }

  /**
   * Calculate recovery incentive
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Recovery incentive details
   */
  async calculateRecoveryIncentive(salaryPackage, month, year, performance = null) {
    try {
      const target = salaryPackage.recoveryTarget.targetAmount || 0;

      if (target === 0) {
        return {
          target: 0, achieved: 0, percentage: 0, amount: 0,
        };
      }

      const monthlyPerformance = performance
        || await monthlyPerformanceService.getEmployeeMonthlyPerformance(
          salaryPackage.employeeId,
          month,
          year,
        );
      const achieved = monthlyPerformance.recoveryAmount;

      const percentage = target > 0 ? (achieved / target) * 100 : 0;

      // Calculate incentive based on type
      let amount = 0;
      const { incentiveType } = salaryPackage.recoveryTarget;
      const incentiveValue = salaryPackage.recoveryTarget.incentiveValue || 0;

      if (achieved >= target) {
        if (incentiveType === 'Fix Amount') {
          amount = incentiveValue;
        } else if (incentiveType === 'Amount') {
          amount = incentiveValue;
        } else if (incentiveType === '%') {
          // Calculate percentage of recovery above target
          const excessRecovery = achieved - target;
          amount = (excessRecovery * incentiveValue) / 100;
        }
      }

      return {
        target,
        achieved,
        percentage: Math.round(percentage * 100) / 100,
        amount: Math.round(amount * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to calculate recovery incentive: ${error.message}`);
    }
  }

  /**
   * Calculate party visit incentive
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Party visit incentive details
   */
  async calculatePartyVisitIncentive(salaryPackage, month, year, performance = null) {
    try {
      const target = salaryPackage.partyVisitTarget.numberOfOrders || 0;

      if (target === 0) {
        return { target: 0, achieved: 0, amount: 0 };
      }

      const monthlyPerformance = performance
        || await monthlyPerformanceService.getEmployeeMonthlyPerformance(
          salaryPackage.employeeId,
          month,
          year,
        );
      const achieved = monthlyPerformance.visitedParties;

      // Calculate incentive based on type
      let amount = 0;
      const incentiveType = salaryPackage.partyVisitTarget.type;
      const incentiveValue = salaryPackage.partyVisitTarget.value || 0;

      if (achieved >= target) {
        if (incentiveType === 'Fix Amount') {
          amount = incentiveValue;
        } else if (incentiveType === 'Amount') {
          amount = incentiveValue;
        } else if (incentiveType === '%') {
          // Calculate as percentage of basic pay
          const basicPay = salaryPackage.basicPay.amount || 0;
          amount = (basicPay * incentiveValue) / 100;
        }
      }

      return {
        target,
        achieved,
        amount: Math.round(amount * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to calculate party visit incentive: ${error.message}`);
    }
  }

  /**
   * Calculate mobile order incentive
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Mobile order incentive details
   */
  async calculateMobileOrderIncentive(salaryPackage, month, year, performance = null) {
    try {
      const incentiveValue = salaryPackage.mobileOrderIncentive.value || 0;

      if (incentiveValue === 0) {
        return { ordersCreated: 0, amount: 0 };
      }

      const monthlyPerformance = performance
        || await monthlyPerformanceService.getEmployeeMonthlyPerformance(
          salaryPackage.employeeId,
          month,
          year,
        );
      const mobileOrders = monthlyPerformance.mobileOrders;

      // Calculate incentive based on type
      let amount = 0;
      const incentiveType = salaryPackage.mobileOrderIncentive.type;

      if (mobileOrders > 0) {
        if (incentiveType === 'Fix Amount') {
          amount = incentiveValue;
        } else if (incentiveType === 'Amount') {
          amount = incentiveValue * mobileOrders;
        } else if (incentiveType === '%') {
          // Calculate as percentage of basic pay
          const basicPay = salaryPackage.basicPay.amount || 0;
          amount = (basicPay * incentiveValue) / 100;
        }
      }

      return {
        ordersCreated: mobileOrders,
        amount: Math.round(amount * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to calculate mobile order incentive: ${error.message}`);
    }
  }

  /**
   * Calculate mobile cash recovery incentive
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Object>} Mobile cash recovery incentive details
   */
  async calculateMobileCashRecoveryIncentive(salaryPackage, month, year, performance = null) {
    try {
      const incentiveValue = salaryPackage.mobileCashRecoveryIncentive.value || 0;

      if (incentiveValue === 0) {
        return { amountRecovered: 0, amount: 0 };
      }

      const monthlyPerformance = performance
        || await monthlyPerformanceService.getEmployeeMonthlyPerformance(
          salaryPackage.employeeId,
          month,
          year,
        );
      const amountRecovered = monthlyPerformance.mobileCashRecoveryAmount;

      // Calculate incentive based on type
      let amount = 0;
      const incentiveType = salaryPackage.mobileCashRecoveryIncentive.type;

      if (amountRecovered > 0) {
        if (incentiveType === 'Fix Amount') {
          amount = incentiveValue;
        } else if (incentiveType === 'Amount') {
          amount = incentiveValue;
        } else if (incentiveType === '%') {
          // Calculate as percentage of recovered amount
          amount = (amountRecovered * incentiveValue) / 100;
        }
      }

      return {
        amountRecovered,
        amount: Math.round(amount * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to calculate mobile cash recovery incentive: ${error.message}`);
    }
  }

  /**
   * Calculate brand incentives
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @param {Number} year - Year
   * @returns {Promise<Array>} Brand incentives array
   */
  async calculateBrandIncentives(salaryPackage, month, year) {
    try {
      const brandIncentives = [];

      if (!salaryPackage.brandIncentives || salaryPackage.brandIncentives.length === 0) {
        return brandIncentives;
      }

      // Get month date range
      const { startDate, endDate } = this._getMonthDateRange(month, year);

      // Process each brand incentive
      for (const brandIncentive of salaryPackage.brandIncentives) {
        // Check if current month falls within brand incentive duration
        const incentiveStart = new Date(brandIncentive.duration.fromDate);
        const incentiveEnd = new Date(brandIncentive.duration.toDate);

        if (startDate > incentiveEnd || endDate < incentiveStart) {
          // Current month is outside brand incentive duration
          continue;
        }

        // Query Invoice line items for specific item sales
        const salesInvoices = await Invoice.find({
          salesmanId: salaryPackage.employeeId,
          type: 'sales',
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: startDate, $lte: endDate },
          'items.itemId': brandIncentive.itemId,
        });

        // Calculate total quantity sold for this item
        let totalQuantity = 0;
        salesInvoices.forEach((invoice) => {
          invoice.items.forEach((item) => {
            if (item.itemId.toString() === brandIncentive.itemId.toString()) {
              totalQuantity += item.quantity || 0;
            }
          });
        });

        // Calculate incentive if target achieved
        let amount = 0;
        const target = brandIncentive.quantityTarget || 0;

        if (totalQuantity >= target) {
          const incentiveType = brandIncentive.type;
          const incentiveValue = brandIncentive.value || 0;

          if (incentiveType === 'Fix Amount') {
            amount = incentiveValue;
          } else if (incentiveType === 'Amount') {
            amount = incentiveValue;
          } else if (incentiveType === '%') {
            // Calculate as percentage of basic pay
            const basicPay = salaryPackage.basicPay.amount || 0;
            amount = (basicPay * incentiveValue) / 100;
          }
        }

        brandIncentives.push({
          itemName: brandIncentive.itemName,
          target,
          achieved: totalQuantity,
          amount: Math.round(amount * 100) / 100,
        });
      }

      return brandIncentives;
    } catch (error) {
      throw new Error(`Failed to calculate brand incentives: ${error.message}`);
    }
  }

  /**
   * Calculate bonuses
   * @param {Object} salaryPackage - Salary package
   * @param {String} month - Month name
   * @returns {Array} Bonuses array
   */
  calculateBonuses(salaryPackage, month) {
    const bonuses = [];
    const basicPay = salaryPackage.basicPay.amount || 0;

    // Check Eid Fitr Bonus
    if (salaryPackage.eidFitrBonus.month === month && salaryPackage.eidFitrBonus.value > 0) {
      let amount = 0;
      const bonusType = salaryPackage.eidFitrBonus.type;
      const bonusValue = salaryPackage.eidFitrBonus.value;

      if (bonusType === 'Fix Amount') {
        amount = bonusValue;
      } else if (bonusType === 'Amount') {
        amount = bonusValue;
      } else if (bonusType === '%') {
        amount = (basicPay * bonusValue) / 100;
      }

      bonuses.push({
        type: 'Eid Fitr',
        detail: 'Eid ul Fitr Bonus',
        amount: Math.round(amount * 100) / 100,
      });
    }

    // Check Eid Adha Bonus
    if (salaryPackage.eidAdhaBonus.month === month && salaryPackage.eidAdhaBonus.value > 0) {
      let amount = 0;
      const bonusType = salaryPackage.eidAdhaBonus.type;
      const bonusValue = salaryPackage.eidAdhaBonus.value;

      if (bonusType === 'Fix Amount') {
        amount = bonusValue;
      } else if (bonusType === 'Amount') {
        amount = bonusValue;
      } else if (bonusType === '%') {
        amount = (basicPay * bonusValue) / 100;
      }

      bonuses.push({
        type: 'Eid Adha',
        detail: 'Eid Ul Adha Bonus',
        amount: Math.round(amount * 100) / 100,
      });
    }

    // Check Other Bonus
    if (salaryPackage.otherBonus.month === month && salaryPackage.otherBonus.value > 0) {
      let amount = 0;
      const bonusType = salaryPackage.otherBonus.type;
      const bonusValue = salaryPackage.otherBonus.value;

      if (bonusType === 'Fix Amount') {
        amount = bonusValue;
      } else if (bonusType === 'Amount') {
        amount = bonusValue;
      } else if (bonusType === '%') {
        amount = (basicPay * bonusValue) / 100;
      }

      bonuses.push({
        type: 'Other',
        detail: salaryPackage.otherBonus.detail || 'Other Bonus',
        amount: Math.round(amount * 100) / 100,
      });
    }

    return bonuses;
  }

  /**
   * Apply deductions and calculate net salary
   * @param {Number} grossSalary - Gross salary amount
   * @param {Object} deductions - Deductions object
   * @returns {Number} Net salary
   */
  applyDeductions(grossSalary, deductions) {
    const totalDeductions = (deductions.tax || 0)
      + (deductions.advance || 0)
      + (deductions.loan || 0)
      + (deductions.other || 0);

    return Math.round((grossSalary - totalDeductions) * 100) / 100;
  }

  /**
   * Generate salary sheet for printing
   * @param {String} calculationId - Calculation ID
   * @returns {Promise<Object>} Formatted salary sheet
   */
  async generateSalarySheet(calculationId) {
    try {
      const calculation = await SalaryCalculation.findById(calculationId)
        .populate('employeeId', 'name employeeBiodata.basicPay')
        .populate('packageId');

      if (!calculation) {
        throw new Error('Salary calculation not found');
      }

      // Format salary sheet
      const salarySheet = {
        calculationId: calculation.calculationId,
        employeeName: calculation.employeeName,
        month: calculation.month,
        year: calculation.year,

        // Fixed Components
        fixedComponents: {
          basicPay: calculation.basicPay,
          dailyAllowance: calculation.dailyAllowance,
          petrolAllowance: calculation.petrolAllowance,
          mobilePackage: calculation.mobilePackage,
          total:
            calculation.basicPay
            + calculation.dailyAllowance
            + calculation.petrolAllowance
            + calculation.mobilePackage,
        },

        // Incentives
        incentives: {
          sales: {
            target: calculation.salesIncentive.target,
            achieved: calculation.salesIncentive.achieved,
            percentage: calculation.salesIncentive.percentage,
            amount: calculation.salesIncentive.amount,
          },
          recovery: {
            target: calculation.recoveryIncentive.target,
            achieved: calculation.recoveryIncentive.achieved,
            percentage: calculation.recoveryIncentive.percentage,
            amount: calculation.recoveryIncentive.amount,
          },
          partyVisit: {
            target: calculation.partyVisitIncentive.target,
            achieved: calculation.partyVisitIncentive.achieved,
            amount: calculation.partyVisitIncentive.amount,
          },
          mobileOrder: {
            ordersCreated: calculation.mobileOrderIncentive.ordersCreated,
            amount: calculation.mobileOrderIncentive.amount,
          },
          mobileCashRecovery: {
            amountRecovered: calculation.mobileCashRecoveryIncentive.amountRecovered,
            amount: calculation.mobileCashRecoveryIncentive.amount,
          },
          total:
            calculation.salesIncentive.amount
            + calculation.recoveryIncentive.amount
            + calculation.partyVisitIncentive.amount
            + calculation.mobileOrderIncentive.amount
            + calculation.mobileCashRecoveryIncentive.amount,
        },

        // Brand Incentives
        brandIncentives: calculation.brandIncentives.map((bi) => ({
          itemName: bi.itemName,
          target: bi.target,
          achieved: bi.achieved,
          amount: bi.amount,
        })),
        brandIncentivesTotal: calculation.brandIncentives.reduce(
          (sum, bi) => sum + bi.amount,
          0,
        ),

        // Bonuses
        bonuses: calculation.bonuses.map((b) => ({
          type: b.type,
          detail: b.detail,
          amount: b.amount,
        })),
        bonusesTotal: calculation.bonuses.reduce((sum, b) => sum + b.amount, 0),

        // Totals
        grossSalary: calculation.grossSalary,
        deductions: {
          tax: calculation.deductions.tax,
          advance: calculation.deductions.advance,
          loan: calculation.deductions.loan,
          other: calculation.deductions.other,
          total:
            calculation.deductions.tax
            + calculation.deductions.advance
            + calculation.deductions.loan
            + calculation.deductions.other,
        },
        netSalary: calculation.netSalary,

        // Metadata
        calculatedAt: calculation.calculatedAt,
        calculatedBy: calculation.calculatedBy,
      };

      return {
        success: true,
        data: salarySheet,
      };
    } catch (error) {
      throw new Error(`Failed to generate salary sheet: ${error.message}`);
    }
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
}

module.exports = new SalaryCalculationService();
