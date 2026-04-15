const investorService = require('../services/investorService');

/**
 * Investor Controller
 * Handles HTTP requests for investor management
 */
class InvestorController {
  /**
   * Create investor account
   */
  async createInvestor(req, res) {
    try {
      const investor = await investorService.createInvestor(req.body);

      res.status(201).json({
        success: true,
        message: 'Investor account created successfully',
        data: investor,
      });
    } catch (error) {
      console.error('Error creating investor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create investor account',
        error: error.message,
      });
    }
  }

  /**
   * Get all investors
   */
  async getAllInvestors(req, res) {
    try {
      const investors = await investorService.getAllInvestors();

      res.status(200).json({
        success: true,
        data: investors,
      });
    } catch (error) {
      console.error('Error fetching investors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch investors',
        error: error.message,
      });
    }
  }

  /**
   * Get investor by ID
   */
  async getInvestorById(req, res) {
    try {
      const investor = await investorService.getInvestorById(req.params.id);

      res.status(200).json({
        success: true,
        data: investor,
      });
    } catch (error) {
      console.error('Error fetching investor:', error);
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update investor account
   */
  async updateInvestor(req, res) {
    try {
      const investor = await investorService.updateInvestor(req.params.id, req.body);

      res.status(200).json({
        success: true,
        message: 'Investor account updated successfully',
        data: investor,
      });
    } catch (error) {
      console.error('Error updating investor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update investor account',
        error: error.message,
      });
    }
  }

  /**
   * Delete investor account
   */
  async deleteInvestor(req, res) {
    try {
      const result = await investorService.deleteInvestor(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Error deleting investor:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get investor statement
   */
  async getInvestorStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const statement = await investorService.getInvestorStatement(
        req.params.id,
        new Date(startDate),
        new Date(endDate),
      );

      res.status(200).json({
        success: true,
        data: statement,
      });
    } catch (error) {
      console.error('Error fetching investor statement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch investor statement',
        error: error.message,
      });
    }
  }
}

module.exports = new InvestorController();
