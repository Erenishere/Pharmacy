const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Company = require('../../src/models/Company');

describe('Company Model Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Only create a new connection if not already connected
    if (mongoose.connection.readyState === 0) {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    // Only disconnect if we created the connection
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Company.deleteMany({});
  });

  describe('Company Creation', () => {
    it('should create a company with required fields only', async () => {
      const companyData = {
        name: 'Test Pharmaceutical Company',
        code: 'TPC001'
      };

      const company = await Company.create(companyData);

      expect(company._id).toBeDefined();
      expect(company.name).toBe(companyData.name);
      expect(company.code).toBe(companyData.code);
      expect(company.isActive).toBe(true);
      expect(company.createdAt).toBeDefined();
      expect(company.updatedAt).toBeDefined();
    });

    it('should create a company with all fields including new fields', async () => {
      const userId = new mongoose.Types.ObjectId();
      const companyData = {
        name: 'GSK Pharmaceuticals',
        code: 'GSK001',
        address: '123 Pharma Street, Karachi',
        phone: '+92-21-1234567',
        email: 'contact@gsk.com',
        gstin: '27AABCU9603R1ZX',
        groupType: 'A',
        contactPerson: 'John Doe',
        createdBy: userId,
        isActive: true
      };

      const company = await Company.create(companyData);

      expect(company._id).toBeDefined();
      expect(company.name).toBe(companyData.name);
      expect(company.code).toBe(companyData.code);
      expect(company.address).toBe(companyData.address);
      expect(company.phone).toBe(companyData.phone);
      expect(company.email).toBe(companyData.email);
      expect(company.gstin).toBe(companyData.gstin);
      expect(company.groupType).toBe('A');
      expect(company.contactPerson).toBe(companyData.contactPerson);
      expect(company.createdBy.toString()).toBe(userId.toString());
      expect(company.isActive).toBe(true);
    });

    it('should fail to create company without required name', async () => {
      const companyData = {
        code: 'TEST001'
      };

      await expect(Company.create(companyData)).rejects.toThrow();
    });

    it('should fail to create company without required code', async () => {
      const companyData = {
        name: 'Test Company'
      };

      await expect(Company.create(companyData)).rejects.toThrow();
    });

    it('should enforce unique company name', async () => {
      const companyData = {
        name: 'Unique Company',
        code: 'UC001'
      };

      await Company.create(companyData);

      const duplicateData = {
        name: 'Unique Company',
        code: 'UC002'
      };

      await expect(Company.create(duplicateData)).rejects.toThrow();
    });

    it('should enforce unique company code', async () => {
      const companyData = {
        name: 'Company One',
        code: 'UNIQUE001'
      };

      await Company.create(companyData);

      const duplicateData = {
        name: 'Company Two',
        code: 'UNIQUE001'
      };

      await expect(Company.create(duplicateData)).rejects.toThrow();
    });
  });

  describe('Group Type Validation', () => {
    it('should accept valid group type A', async () => {
      const company = await Company.create({
        name: 'Group A Company',
        code: 'GAC001',
        groupType: 'A'
      });

      expect(company.groupType).toBe('A');
    });

    it('should accept valid group type B', async () => {
      const company = await Company.create({
        name: 'Group B Company',
        code: 'GBC001',
        groupType: 'B'
      });

      expect(company.groupType).toBe('B');
    });

    it('should accept valid group type C', async () => {
      const company = await Company.create({
        name: 'Group C Company',
        code: 'GCC001',
        groupType: 'C'
      });

      expect(company.groupType).toBe('C');
    });

    it('should reject invalid group type', async () => {
      const companyData = {
        name: 'Invalid Group Company',
        code: 'IGC001',
        groupType: 'D'
      };

      await expect(Company.create(companyData)).rejects.toThrow(/Group type must be A, B, or C/);
    });

    it('should allow company without group type', async () => {
      const company = await Company.create({
        name: 'No Group Company',
        code: 'NGC001'
      });

      expect(company.groupType).toBeUndefined();
    });

    it('should convert group type to uppercase', async () => {
      const company = await Company.create({
        name: 'Lowercase Group Company',
        code: 'LGC001',
        groupType: 'a'
      });

      expect(company.groupType).toBe('A');
    });
  });

  describe('Contact Person Field', () => {
    it('should store contact person name', async () => {
      const company = await Company.create({
        name: 'Contact Test Company',
        code: 'CTC001',
        contactPerson: 'Jane Smith'
      });

      expect(company.contactPerson).toBe('Jane Smith');
    });

    it('should trim contact person name', async () => {
      const company = await Company.create({
        name: 'Trim Test Company',
        code: 'TTC001',
        contactPerson: '  John Doe  '
      });

      expect(company.contactPerson).toBe('John Doe');
    });

    it('should enforce max length for contact person', async () => {
      const longName = 'A'.repeat(101);
      const companyData = {
        name: 'Long Contact Company',
        code: 'LCC001',
        contactPerson: longName
      };

      await expect(Company.create(companyData)).rejects.toThrow(/cannot exceed 100 characters/);
    });
  });

  describe('CreatedBy Field', () => {
    it('should store createdBy user reference', async () => {
      const userId = new mongoose.Types.ObjectId();
      const company = await Company.create({
        name: 'Created By Test Company',
        code: 'CBTC001',
        createdBy: userId
      });

      expect(company.createdBy).toBeDefined();
      expect(company.createdBy.toString()).toBe(userId.toString());
    });

    it('should allow company without createdBy', async () => {
      const company = await Company.create({
        name: 'No Creator Company',
        code: 'NCC001'
      });

      expect(company.createdBy).toBeUndefined();
    });
  });

  describe('Field Validations', () => {
    it('should enforce max length for company name', async () => {
      const longName = 'A'.repeat(101);
      const companyData = {
        name: longName,
        code: 'LONG001'
      };

      await expect(Company.create(companyData)).rejects.toThrow(/cannot exceed 100 characters/);
    });

    it('should enforce max length for code', async () => {
      const longCode = 'A'.repeat(21);
      const companyData = {
        name: 'Long Code Company',
        code: longCode
      };

      await expect(Company.create(companyData)).rejects.toThrow(/cannot exceed 20 characters/);
    });

    it('should convert code to uppercase', async () => {
      const company = await Company.create({
        name: 'Lowercase Code Company',
        code: 'lcc001'
      });

      expect(company.code).toBe('LCC001');
    });

    it('should convert email to lowercase', async () => {
      const company = await Company.create({
        name: 'Email Test Company',
        code: 'ETC001',
        email: 'TEST@COMPANY.COM'
      });

      expect(company.email).toBe('test@company.com');
    });

    it('should trim all string fields', async () => {
      const company = await Company.create({
        name: '  Trim Company  ',
        code: '  TC001  ',
        address: '  123 Street  ',
        phone: '  1234567890  ',
        email: '  test@company.com  ',
        contactPerson: '  John Doe  '
      });

      expect(company.name).toBe('Trim Company');
      expect(company.code).toBe('TC001');
      expect(company.address).toBe('123 Street');
      expect(company.phone).toBe('1234567890');
      expect(company.email).toBe('test@company.com');
      expect(company.contactPerson).toBe('John Doe');
    });
  });

  describe('Indexes', () => {
    it('should have index on name field', async () => {
      const indexes = Company.schema.indexes();
      const nameIndex = indexes.find(idx => idx[0].name === 1);
      expect(nameIndex).toBeDefined();
      expect(nameIndex[1].unique).toBe(true);
    });

    it('should have index on code field', async () => {
      const indexes = Company.schema.indexes();
      const codeIndex = indexes.find(idx => idx[0].code === 1);
      expect(codeIndex).toBeDefined();
      expect(codeIndex[1].unique).toBe(true);
    });

    it('should have index on isActive field', async () => {
      const indexes = Company.schema.indexes();
      const isActiveIndex = indexes.find(idx => idx[0].isActive === 1);
      expect(isActiveIndex).toBeDefined();
    });

    it('should have index on groupType field', async () => {
      const indexes = Company.schema.indexes();
      const groupTypeIndex = indexes.find(idx => idx[0].groupType === 1);
      expect(groupTypeIndex).toBeDefined();
    });
  });

  describe('Company Updates', () => {
    it('should update company fields', async () => {
      const company = await Company.create({
        name: 'Original Company',
        code: 'OC001',
        groupType: 'A'
      });

      company.groupType = 'B';
      company.contactPerson = 'New Contact';
      await company.save();

      const updated = await Company.findById(company._id);
      expect(updated.groupType).toBe('B');
      expect(updated.contactPerson).toBe('New Contact');
    });

    it('should update updatedAt timestamp on save', async () => {
      const company = await Company.create({
        name: 'Timestamp Test Company',
        code: 'TTC001'
      });

      const originalUpdatedAt = company.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      company.address = 'New Address';
      await company.save();

      expect(company.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should toggle isActive status', async () => {
      const company = await Company.create({
        name: 'Active Toggle Company',
        code: 'ATC001',
        isActive: true
      });

      company.isActive = false;
      await company.save();

      const updated = await Company.findById(company._id);
      expect(updated.isActive).toBe(false);
    });
  });

  describe('Company Queries', () => {
    beforeEach(async () => {
      // Create test companies
      await Company.create([
        { name: 'Company A1', code: 'CA1', groupType: 'A', isActive: true },
        { name: 'Company A2', code: 'CA2', groupType: 'A', isActive: true },
        { name: 'Company B1', code: 'CB1', groupType: 'B', isActive: true },
        { name: 'Company C1', code: 'CC1', groupType: 'C', isActive: false },
        { name: 'Company No Group', code: 'CNG', isActive: true }
      ]);
    });

    it('should find companies by group type', async () => {
      const groupACompanies = await Company.find({ groupType: 'A' });
      expect(groupACompanies).toHaveLength(2);
      groupACompanies.forEach(company => {
        expect(company.groupType).toBe('A');
      });
    });

    it('should find active companies', async () => {
      const activeCompanies = await Company.find({ isActive: true });
      expect(activeCompanies).toHaveLength(4);
    });

    it('should find companies by group type and active status', async () => {
      const activeGroupA = await Company.find({ groupType: 'A', isActive: true });
      expect(activeGroupA).toHaveLength(2);
    });

    it('should find companies without group type', async () => {
      const noGroupCompanies = await Company.find({ groupType: { $exists: false } });
      expect(noGroupCompanies).toHaveLength(1);
      expect(noGroupCompanies[0].name).toBe('Company No Group');
    });
  });
});
