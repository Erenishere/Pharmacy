const userService = require('../../src/services/userService');
const userRepository = require('../../src/repositories/userRepository');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const DimensionBranch = require('../../src/models/DimensionBranch');

/**
 * User Service Tests
 * Master Data Management - Requirements 10.1-10.14
 */
describe('UserService', () => {
  let testDimension;
  let testAccount;

  beforeAll(async () => {
    // Create test dimension
    testDimension = await DimensionBranch.create({
      name: 'Test Dimension',
      code: 'TD001',
      isActive: true,
    });

    // Create test employee account
    testAccount = await Customer.create({
      code: 'EMP001',
      name: 'Test Employee',
      accountType: 'employee',
      contactInfo: {
        email: 'employee@test.com',
        phone1: '1234567890',
      },
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup
    await DimensionBranch.deleteMany({});
    await Customer.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    // Clean up users after each test
    await User.deleteMany({});
  });

  describe('createUser', () => {
    it('should create user with valid data (Requirement 10.1-10.6)', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'manager',
        accountId: testAccount._id,
        dimensionId: testDimension._id,
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('manager');
      expect(user.accountId.toString()).toBe(testAccount._id.toString());
      expect(user.dimensionId.toString()).toBe(testDimension._id.toString());
      expect(user.password).not.toBe('password123'); // Should be hashed
    });

    it('should create user with permissions (Requirement 10.7)', async () => {
      const userData = {
        username: 'permuser',
        email: 'perm@example.com',
        password: 'password123',
        role: 'salesman',
        permissions: {
          modules: ['sales', 'inventory'],
          features: ['sales.create', 'sales.view'],
          dataAccess: {
            dimensionBased: true,
            allowedDimensions: [testDimension._id],
          },
        },
      };

      const user = await userService.createUser(userData);

      expect(user.permissions.modules).toContain('sales');
      expect(user.permissions.features).toContain('sales.create');
      expect(user.permissions.dataAccess.dimensionBased).toBe(true);
      expect(user.permissions.dataAccess.allowedDimensions).toHaveLength(1);
    });

    it('should throw error if username already exists', async () => {
      await userService.createUser({
        username: 'duplicate',
        email: 'first@example.com',
        password: 'password123',
        role: 'admin',
      });

      await expect(
        userService.createUser({
          username: 'duplicate',
          email: 'second@example.com',
          password: 'password123',
          role: 'admin',
        })
      ).rejects.toThrow('Username already exists');
    });

    it('should throw error if email already exists', async () => {
      await userService.createUser({
        username: 