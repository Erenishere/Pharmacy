const investorService = require('../../src/services/investorService');

describe('InvestorService - Simple Tests', () => {
  describe('Service Methods Exist', () => {
    it('should have createInvestor method', () => {
      expect(typeof investorService.createInvestor).toBe('function');
    });

    it('should have getAllInvestors method', () => {
      expect(typeof investorService.getAllInvestors).toBe('function');
    });

    it('should have getInvestorById method', () => {
      expect(typeof investorService.getInvestorById).toBe('function');
    });

    it('should have updateInvestor method', () => {
      expect(typeof investorService.updateInvestor).toBe('function');
    });

    it('should have deleteInvestor method', () => {
      expect(typeof investorService.deleteInvestor).toBe('function');
    });

    it('should have getInvestorStatement method', () => {
      expect(typeof investorService.getInvestorStatement).toBe('function');
    });
  });
});
