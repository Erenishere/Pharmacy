const taxService = require('../../src/services/taxService');

describe('Tax Service - Sales Management', () => {
  describe('calculateGST', () => {
    it('should calculate 18% GST correctly', () => {
      const result = taxService.calculateSalesInvoiceTaxes({
        amount: 1000,
        gstRate: 18,
        advanceTaxRate: 0,
        isNonFiler: false
      });

      expect(result.gstAmount).toBe(180);
      expect(result.grossAmount).toBe(1180);
    });

    it('should calculate 4% GST correctly', () => {
      const result = taxService.calculateSalesInvoiceTaxes({
        amount: 1000,
        gstRate: 4,
        advanceTaxRate: 0,
        isNonFiler: false
      });

      expect(result.gstAmount).toBe(40);
      expect(result.grossAmount).toBe(1040);
    });
  });

  describe('calculateAdvanceTax', () => {
    it('should calculate 0.5% advance tax for filers', () => {
      const result = taxService.calculateAdvanceTax(1000, true);

      expect(result.rate).toBe(0.5);
      expect(result.taxAmount).toBe(5);
      expect(result.isFiler).toBe(true);
      expect(result.description).toContain('0.5%');
    });

    it('should calculate 2.5% advance tax for non-filers', () => {
      const result = taxService.calculateAdvanceTax(1000, false);

      expect(result.rate).toBe(2.5);
      expect(result.taxAmount).toBe(25);
      expect(result.isFiler).toBe(false);
      expect(result.description).toContain('2.5%');
    });
  });

  describe('calculateNonFilerGST', () => {
    it('should calculate 0.1% non-filer GST', () => {
      const result = taxService.calculateNonFilerGST(1000, true);

      expect(result.rate).toBe(0.1);
      expect(result.taxAmount).toBe(1);
      expect(result.isNonFiler).toBe(true);
      expect(result.description).toContain('0.1%');
    });

    it('should return zero for filers', () => {
      const result = taxService.calculateNonFilerGST(1000, false);

      expect(result.rate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.isNonFiler).toBe(false);
    });
  });

  describe('calculateSalesInvoiceTaxes', () => {
    it('should calculate all taxes for filer customer', () => {
      const result = taxService.calculateSalesInvoiceTaxes({
        amount: 1000,
        gstRate: 18,
        advanceTaxRate: 0.5,
        isNonFiler: false
      });

      expect(result.baseAmount).toBe(1000);
      expect(result.gstAmount).toBe(180);
      expect(result.advanceTaxAmount).toBe(5);
      expect(result.nonFilerGSTAmount).toBe(0);
      expect(result.totalTaxAmount).toBe(185);
      expect(result.grossAmount).toBe(1185);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should calculate all taxes for non-filer customer', () => {
      const result = taxService.calculateSalesInvoiceTaxes({
        amount: 1000,
        gstRate: 18,
        advanceTaxRate: 2.5,
        isNonFiler: true
      });

      expect(result.baseAmount).toBe(1000);
      expect(result.gstAmount).toBe(180);
      expect(result.advanceTaxAmount).toBe(25);
      expect(result.nonFilerGSTAmount).toBe(1);
      expect(result.totalTaxAmount).toBe(206);
      expect(result.grossAmount).toBe(1206);
      expect(result.breakdown).toHaveLength(3);
    });

    it('should handle zero advance tax rate', () => {
      const result = taxService.calculateSalesInvoiceTaxes({
        amount: 1000,
        gstRate: 18,
        advanceTaxRate: 0,
        isNonFiler: false
      });

      expect(result.advanceTaxAmount).toBe(0);
      expect(result.totalTaxAmount).toBe(180);
      expect(result.breakdown).toHaveLength(1);
    });

    it('should throw error for invalid amount', () => {
      expect(() => {
        taxService.calculateSalesInvoiceTaxes({
          amount: -100,
          gstRate: 18
        });
      }).toThrow('Invalid amount');
    });
  });

  describe('calculateBoxUnitGST', () => {
    it('should calculate box and unit GST separately', () => {
      const result = taxService.calculateBoxUnitGST({
        boxQty: 10,
        unitQty: 5,
        boxTP: 100,
        unitTP: 10,
        gstRate: 18
      });

      expect(result.boxAmount).toBe(1000);
      expect(result.boxGSTAmount).toBe(180);
      expect(result.unitAmount).toBe(50);
      expect(result.unitGSTAmount).toBe(9);
      expect(result.totalAmount).toBe(1050);
      expect(result.totalGSTAmount).toBe(189);
      expect(result.grossAmount).toBe(1239);
    });

    it('should handle zero box quantity', () => {
      const result = taxService.calculateBoxUnitGST({
        boxQty: 0,
        unitQty: 10,
        boxTP: 100,
        unitTP: 10,
        gstRate: 18
      });

      expect(result.boxAmount).toBe(0);
      expect(result.boxGSTAmount).toBe(0);
      expect(result.unitAmount).toBe(100);
      expect(result.unitGSTAmount).toBe(18);
    });

    it('should handle zero unit quantity', () => {
      const result = taxService.calculateBoxUnitGST({
        boxQty: 5,
        unitQty: 0,
        boxTP: 100,
        unitTP: 10,
        gstRate: 18
      });

      expect(result.boxAmount).toBe(500);
      expect(result.boxGSTAmount).toBe(90);
      expect(result.unitAmount).toBe(0);
      expect(result.unitGSTAmount).toBe(0);
    });
  });

  describe('validateGSTRate', () => {
    it('should validate correct GST rates', () => {
      expect(taxService.validateGSTRate(0)).toBe(true);
      expect(taxService.validateGSTRate(4)).toBe(true);
      expect(taxService.validateGSTRate(18)).toBe(true);
    });

    it('should reject invalid GST rates', () => {
      expect(taxService.validateGSTRate(5)).toBe(false);
      expect(taxService.validateGSTRate(10)).toBe(false);
      expect(taxService.validateGSTRate(20)).toBe(false);
    });
  });

  describe('calculateDualGST', () => {
    it('should calculate dual GST rates correctly', () => {
      const items = [
        { amountAfterDiscount: 1000, gstRate: 18 },
        { amountAfterDiscount: 500, gstRate: 4 },
        { amountAfterDiscount: 2000, gstRate: 18 }
      ];

      const result = taxService.calculateDualGST(items);

      expect(result.gst18Total).toBe(540); // (1000 + 2000) * 0.18
      expect(result.gst4Total).toBe(20); // 500 * 0.04
      expect(result.totalGST).toBe(560);
      expect(result.itemBreakdown).toHaveLength(3);
    });

    it('should handle items with only 18% GST', () => {
      const items = [
        { amountAfterDiscount: 1000, gstRate: 18 },
        { amountAfterDiscount: 500, gstRate: 18 }
      ];

      const result = taxService.calculateDualGST(items);

      expect(result.gst18Total).toBe(270);
      expect(result.gst4Total).toBe(0);
      expect(result.totalGST).toBe(270);
    });
  });
});
