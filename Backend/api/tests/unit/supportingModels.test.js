const mongoose = require('mongoose');
const Town = require('../../src/models/town');
const Area = require('../../src/models/area');
const Category = require('../../src/models/category');
const SubCategory = require('../../src/models/subcategory');
const Formula = require('../../src/models/formula');
const FormulaSize = require('../../src/models/formulasize');
const Business = require('../../src/models/business');
const Transporter = require('../../src/models/Transporter');
const ClaimAccount = require('../../src/models/ClaimAccount');
const Warehouse = require('../../src/models/Warehouse');

describe('Supporting Models - Task 1.5', () => {
  beforeEach(async () => {
    // Clear collections before each test
    await Town.deleteMany({});
    await Area.deleteMany({});
    await Category.deleteMany({});
    await SubCategory.deleteMany({});
    await Formula.deleteMany({});
    await FormulaSize.deleteMany({});
    await Business.deleteMany({});
    await Transporter.deleteMany({});
    await ClaimAccount.deleteMany({});
    await Warehouse.deleteMany({});
  });

  describe('Town Model', () => {
    test('should create a town successfully', async () => {
      const town = await Town.create({
        name: 'Sukkur',
        region: 'Sindh',
      });

      expect(town.name).toBe('Sukkur');
      expect(town.region).toBe('Sindh');
      expect(town.isActive).toBe(true);
    });

    test('should enforce unique town name', async () => {
      await Town.create({ name: 'Sukkur' });
      
      await expect(
        Town.create({ name: 'Sukkur' })
      ).rejects.toThrow();
    });

    test('should find active towns', async () => {
      await Town.create({ name: 'Sukkur', isActive: true });
      await Town.create({ name: 'Gambat', isActive: false });

      const activeTowns = await Town.findActive();
      expect(activeTowns).toHaveLength(1);
      expect(activeTowns[0].name).toBe('Sukkur');
    });
  });

  describe('Area Model', () => {
    test('should create an area with town reference', async () => {
      const town = await Town.create({ name: 'Sukkur' });
      const area = await Area.create({
        name: 'Civil Hospital Area',
        townId: town._id,
      });

      expect(area.name).toBe('Civil Hospital Area');
      expect(area.townId.toString()).toBe(town._id.toString());
      expect(area.isActive).toBe(true);
    });

    test('should enforce unique area name within town', async () => {
      const town = await Town.create({ name: 'Sukkur' });
      await Area.create({ name: 'Area 1', townId: town._id });

      await expect(
        Area.create({ name: 'Area 1', townId: town._id })
      ).rejects.toThrow();
    });

    test('should find areas by town', async () => {
      const town1 = await Town.create({ name: 'Sukkur' });
      const town2 = await Town.create({ name: 'Gambat' });

      await Area.create({ name: 'Area 1', townId: town1._id });
      await Area.create({ name: 'Area 2', townId: town1._id });
      await Area.create({ name: 'Area 3', townId: town2._id });

      const areas = await Area.findByTown(town1._id);
      expect(areas).toHaveLength(2);
    });
  });

  describe('Category Model', () => {
    test('should create a category successfully', async () => {
      const category = await Category.create({
        name: 'Pharmaceuticals',
        description: 'Pharmaceutical products',
      });

      expect(category.name).toBe('Pharmaceuticals');
      expect(category.isActive).toBe(true);
    });

    test('should support hierarchical categories', async () => {
      const parent = await Category.create({ name: 'Medical' });
      const child = await Category.create({
        name: 'Surgical',
        parentCategoryId: parent._id,
      });

      expect(child.parentCategoryId.toString()).toBe(parent._id.toString());
    });

    test('should find root categories', async () => {
      await Category.create({ name: 'Root 1' });
      const parent = await Category.create({ name: 'Root 2' });
      await Category.create({ name: 'Child', parentCategoryId: parent._id });

      const rootCategories = await Category.findRootCategories();
      expect(rootCategories).toHaveLength(2);
    });
  });

  describe('SubCategory Model', () => {
    test('should create a subcategory with category reference', async () => {
      const category = await Category.create({ name: 'Medicine' });
      const subCategory = await SubCategory.create({
        name: 'Antibiotics',
        categoryId: category._id,
      });

      expect(subCategory.name).toBe('Antibiotics');
      expect(subCategory.categoryId.toString()).toBe(category._id.toString());
    });

    test('should find subcategories by category', async () => {
      const category = await Category.create({ name: 'Medicine' });
      await SubCategory.create({ name: 'Sub 1', categoryId: category._id });
      await SubCategory.create({ name: 'Sub 2', categoryId: category._id });

      const subCategories = await SubCategory.findByCategory(category._id);
      expect(subCategories).toHaveLength(2);
    });
  });

  describe('Formula Model', () => {
    test('should create a formula successfully', async () => {
      const formula = await Formula.create({
        name: 'Paracetamol',
        composition: 'Acetaminophen',
      });

      expect(formula.name).toBe('Paracetamol');
      expect(formula.composition).toBe('Acetaminophen');
      expect(formula.isActive).toBe(true);
    });

    test('should enforce unique formula name', async () => {
      await Formula.create({ name: 'Paracetamol' });

      await expect(
        Formula.create({ name: 'Paracetamol' })
      ).rejects.toThrow();
    });

    test('should search formulas by name', async () => {
      await Formula.create({ name: 'Paracetamol' });
      await Formula.create({ name: 'Ibuprofen' });

      const results = await Formula.search('para');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Paracetamol');
    });
  });

  describe('FormulaSize Model', () => {
    test('should create a formula size with formula reference', async () => {
      const formula = await Formula.create({ name: 'Paracetamol' });
      const formulaSize = await FormulaSize.create({
        formulaId: formula._id,
        size: '500mg',
        strength: '500mg per tablet',
      });

      expect(formulaSize.size).toBe('500mg');
      expect(formulaSize.formulaId.toString()).toBe(formula._id.toString());
    });

    test('should enforce unique size within formula', async () => {
      const formula = await Formula.create({ name: 'Paracetamol' });
      await FormulaSize.create({ formulaId: formula._id, size: '500mg' });

      await expect(
        FormulaSize.create({ formulaId: formula._id, size: '500mg' })
      ).rejects.toThrow();
    });

    test('should find sizes by formula', async () => {
      const formula = await Formula.create({ name: 'Paracetamol' });
      await FormulaSize.create({ formulaId: formula._id, size: '500mg' });
      await FormulaSize.create({ formulaId: formula._id, size: '1000mg' });

      const sizes = await FormulaSize.findByFormula(formula._id);
      expect(sizes).toHaveLength(2);
    });
  });

  describe('Business Model', () => {
    test('should create a business type successfully', async () => {
      const business = await Business.create({
        name: 'Medicine',
        description: 'Pharmaceutical medicines',
      });

      expect(business.name).toBe('Medicine');
      expect(business.isActive).toBe(true);
    });

    test('should only allow predefined business types', async () => {
      await expect(
        Business.create({ name: 'Invalid Type' })
      ).rejects.toThrow();
    });

    test('should get predefined types', () => {
      const types = Business.getPredefinedTypes();
      expect(types).toContain('Medicine');
      expect(types).toContain('Surgical');
      expect(types).toContain('Medical Equipment');
    });
  });

  describe('Transporter Model', () => {
    test('should create a transporter successfully', async () => {
      const transporter = await Transporter.create({
        name: 'ABC Transport',
        contactPerson: 'John Doe',
        phone: '0300-1234567',
      });

      expect(transporter.name).toBe('ABC Transport');
      expect(transporter.contactPerson).toBe('John Doe');
      expect(transporter.isActive).toBe(true);
      expect(transporter.code).toMatch(/^TR\d{4}$/);
    });

    test('should auto-generate transporter code', async () => {
      const transporter1 = await Transporter.create({ name: 'Transport 1' });
      const transporter2 = await Transporter.create({ name: 'Transport 2' });

      expect(transporter1.code).toBe('TR0001');
      expect(transporter2.code).toBe('TR0002');
    });

    test('should find active transporters', async () => {
      await Transporter.create({ name: 'Active Transport', isActive: true });
      await Transporter.create({ name: 'Inactive Transport', isActive: false });

      const activeTransporters = await Transporter.findActive();
      expect(activeTransporters).toHaveLength(1);
      expect(activeTransporters[0].name).toBe('Active Transport');
    });
  });

  describe('ClaimAccount Model', () => {
    test('should create a claim account successfully', async () => {
      const claimAccount = await ClaimAccount.create({
        name: 'GSK Scheme Account',
        accountNumber: 'ACC-001',
        description: 'Account for GSK promotional schemes',
      });

      expect(claimAccount.name).toBe('GSK Scheme Account');
      expect(claimAccount.accountNumber).toBe('ACC-001');
      expect(claimAccount.isActive).toBe(true);
    });

    test('should find active claim accounts', async () => {
      await ClaimAccount.create({ name: 'Active Account', isActive: true });
      await ClaimAccount.create({ name: 'Inactive Account', isActive: false });

      const activeAccounts = await ClaimAccount.findActive();
      expect(activeAccounts).toHaveLength(1);
      expect(activeAccounts[0].name).toBe('Active Account');
    });
  });

  describe('Warehouse Model Enhancements', () => {
    test('should support inchargeUserId field', async () => {
      const userId = new mongoose.Types.ObjectId();
      const warehouse = await Warehouse.create({
        code: 'WH001',
        name: 'Main Warehouse',
        location: {
          address: '123 Main St',
          city: 'Sukkur',
          country: 'Pakistan',
        },
        inchargeUserId: userId,
      });

      expect(warehouse.inchargeUserId.toString()).toBe(userId.toString());
    });

    test('should support townId field', async () => {
      const town = await Town.create({ name: 'Sukkur' });
      const warehouse = await Warehouse.create({
        code: 'WH001',
        name: 'Main Warehouse',
        location: {
          address: '123 Main St',
          city: 'Sukkur',
          country: 'Pakistan',
        },
        townId: town._id,
      });

      expect(warehouse.townId.toString()).toBe(town._id.toString());
    });
  });
});
