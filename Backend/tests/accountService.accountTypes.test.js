const accountService = require('../src/services/accountService');

describe('AccountService account type validation', () => {
  it('accepts workbook account manager and sub-account types', () => {
    expect(() => accountService.validateAccountType('account_manager')).not.toThrow();
    expect(() => accountService.validateAccountType('sub_account')).not.toThrow();
  });

  it('does not reject display customer type labels when customerTypeId is the durable selector', () => {
    expect(() => accountService.validateBusinessData({
      businessDetails: {
        customerType: 'Retail Pharmacy',
        balanceType: 'debit',
      },
    })).not.toThrow();
  });
});
