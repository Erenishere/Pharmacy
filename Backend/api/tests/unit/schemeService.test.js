const schemeService = require('../../src/services/schemeService');

describe('Scheme Service - Sales Management', () => {
  describe('calculateSchemeUnits', () => {
    it('should calculate scheme units for 12+1 formula', () => {
      const result = schemeService.calculateSchemeUnits(24, '12+1');

      expect(result.purchasedQuantity).toBe(24);
      expect(result.buyQuantity).toBe(12);
      expect(result.bonusQuantity).toBe(1);
      expect(result.completeSets).toBe(2);
      expect(result.schemeQuantity).toBe(2);
      expect(result.totalQuantity).toBe(26);
    });

    it('should calculate scheme units for 10+2 formula', () => {
      const result = schemeService.calculateSchemeUnits(30, '10+2');

      expect(result.purchasedQuantity).toBe(30);
      expect(result.buyQuantity).toBe(10);
      expect(result.bonusQuantity).toBe(2);
      expect(result.completeSets).toBe(3);
      expect(result.schemeQuantity).toBe(6);
      expect(result.totalQuantity).toBe(36);
    });

    it('should handle incomplete sets', () => {
      const result = schemeService.calculateSchemeUnits(25, '12+1');

      expect(result.completeSets).toBe(2);
      expect(result.schemeQuantity).toBe(2);
      expect(result.totalQuantity).toBe(27);
    });

    it('should handle quantity less than buy quantity', () => {
      const result = schemeService.calculateSchemeUnits(5, '12+1');

      expect(result.completeSets).toBe(0);
      expect(result.schemeQuantity).toBe(0);
      expect(result.totalQuantity).toBe(5);
    });

    it('should handle invalid scheme formula', () => {
      const result = schemeService.calculateSchemeUnits(10, 'invalid');

      expect(result.schemeQuantity).toBe(0);
      expect(result.error).toBe('Invalid scheme format');
    });

    it('should handle null scheme formula', () => {
      const result = schemeService.calculateSchemeUnits(10, null);

      expect(result.purchasedQuantity).toBe(10);
      expect(result.schemeQuantity).toBe(0);
      expect(result.totalQuantity).toBe(10);
    });
  });

  describe('applySchemeToItem', () => {
    it('should apply scheme1 to item', async () => {
      const item = {
        itemId: 'item123',
        quantity: 24,
        unitPrice: 100
      };

      const scheme = {
        _id: 'scheme123',
        name: 'Test Scheme',
        type: 'scheme1',
        schemeFormat: '12+1',
        discountPercent: 0
      };

      const result = await schemeService.applySchemeToItem(item, scheme);

      expect(result.schemeId).toBe('scheme123');
      expect(result.schemeName).toBe('Test Scheme');
      expect(result.schemeType).toBe('scheme1');
      expect(result.scheme1Qty).toBe(2);
      expect(result.scheme2Qty).toBe(0);
      expect(result.totalQuantityWithScheme).toBe(26);
    });

    it('should apply scheme2 with discount to item', async () => {
      const item = {
        itemId: 'item123',
        quantity: 24,
        unitPrice: 100
      };

      const scheme = {
        _id: 'scheme456',
        name: 'Claim Scheme',
        type: 'scheme2',
        schemeFormat: '12+1',
        discountPercent: 10,
        claimAccountId: 'claim123'
      };

      const result = await schemeService.applySchemeToItem(item, scheme);

      expect(result.schemeType).toBe('scheme2');
      expect(result.scheme1Qty).toBe(0);
      expect(result.scheme2Qty).toBe(2);
      expect(result.discountPercent).toBe(10);
      expect(result.discountAmount).toBe(240); // 24 * 100 * 0.1
      expect(result.claimAccountId).toBe('claim123');
    });

    it('should handle scheme without discount', async () => {
      const item = {
        itemId: 'item123',
        quantity: 12,
        unitPrice: 50
      };

      const scheme = {
        _id: 'scheme789',
        name: 'No Discount Scheme',
        type: 'scheme1',
        schemeFormat: '12+1',
        discountPercent: 0
      };

      const result = await schemeService.applySchemeToItem(item, scheme);

      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
    });
  });

  describe('calculateSchemeBonus', () => {
    // This test requires mocking the database, so we'll skip it for now
    // In a real scenario, you would mock Scheme.findById
    it.skip('should calculate bonus for valid scheme', async () => {
      // Mock implementation would go here
    });
  });

  describe('postToClaimAccount', () => {
    // This test requires mocking the database
    it.skip('should post discount to claim account', async () => {
      // Mock implementation would go here
    });

    it('should throw error for invalid inputs', async () => {
      await expect(
        schemeService.postToClaimAccount(null, 100)
      ).rejects.toThrow('Valid claim account ID and amount are required');

      await expect(
        schemeService.postToClaimAccount('claim123', 0)
      ).rejects.toThrow('Valid claim account ID and amount are required');

      await expect(
        schemeService.postToClaimAccount('claim123', -100)
      ).rejects.toThrow('Valid claim account ID and amount are required');
    });
  });
});
