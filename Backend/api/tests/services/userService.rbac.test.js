const userService = require('../../src/services/userService');
const User = require('../../src/models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * User Service RBAC and Dimension-Based Access Tests
 * Master Data Management - Requirements 10.7-10.9, 10.12
 */
describe('UserService - RBAC and Dimension-Based Access', () => {
  let mongoServer;
  let testDimension1, testDimension2;
  let testUser;

  beforeAll(async () => {
    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test dimension IDs (mock dimensions)
    testDimension1 = new mongoose.Types.ObjectId();
    testDimension2 = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});

    // Create a test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'manager',
      dimensionId: testDimension1,
      permissions: {
        modules: ['sales', 'inventory'],
        features: ['sales.create', 'sales.view', 'inventory.view'],
        dataAccess: {
          dimensionBased: true,
          allowedDimensions: [testDimension1],
        },
      },
    });
  });

  describe('updateUserPermissions', () => {
    it('should update user permissions successfully (Requirement 10.7)', async () => {
      const newPermissions = {
        modules: ['sales', 'purchase', 'inventory'],
        features: ['sales.create', 'sales.view', 'purchase.create'],
        dataAccess: {
          dimensionBased: true,
          allowedDimensions: [], // Empty to avoid DimensionBranch validation
        },
      };

      const updatedUser = await userService.updateUserPermissions(testUser._id.toString(), newPermissions);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.permissions.modules).toEqual(['sales', 'purchase', 'inventory']);
      expect(updatedUser.permissions.features).toEqual(['sales.create', 'sales.view', 'purchase.create']);
      expect(updatedUser.permissions.dataAccess.dimensionBased).toBe(true);
    });

    it('should throw error when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const newPermissions = {
        modules: ['sales'],
        features: ['sales.view'],
        dataAccess: {
          dimensionBased: false,
          allowedDimensions: [],
        },
      };

      await expect(
        userService.updateUserPermissions(fakeId.toString(), newPermissions)
      ).rejects.toThrow('User not found');
    });

    it('should validate permissions structure', async () => {
      const invalidPermissions = {
        modules: 'not-an-array', // Should be array
        features: ['sales.view'],
      };

      await expect(
        userService.updateUserPermissions(testUser._id.toString(), invalidPermissions)
      ).rejects.toThrow();
    });

    it('should allow empty permissions', async () => {
      const emptyPermissions = {
        modules: [],
        features: [],
        dataAccess: {
          dimensionBased: false,
          allowedDimensions: [],
        },
      };

      const updatedUser = await userService.updateUserPermissions(testUser._id.toString(), emptyPermissions);

      expect(updatedUser.permissions.modules).toEqual([]);
      expect(updatedUser.permissions.features).toEqual([]);
    });

    it('should update only provided permission fields', async () => {
      const partialPermissions = {
        modules: ['purchase'],
      };

      const updatedUser = await userService.updateUserPermissions(testUser._id.toString(), partialPermissions);

      expect(updatedUser.permissions.modules).toEqual(['purchase']);
      // Features should remain unchanged
      expect(updatedUser.permissions.features).toEqual(['sales.create', 'sales.view', 'inventory.view']);
    });
  });

  describe('checkUserPermissions', () => {
    it('should check module access correctly (Requirement 10.7)', async () => {
      const result = await userService.checkUserPermissions(testUser._id.toString(), 'sales');

      expect(result).toBeDefined();
      expect(result.hasModuleAccess).toBe(true);
      expect(result.role).toBe('manager');
    });

    it('should deny access to module not in permissions', async () => {
      const result = await userService.checkUserPermissions(testUser._id.toString(), 'purchase');

      expect(result).toBeDefined();
      expect(result.hasModuleAccess).toBe(false);
      expect(result.role).toBe('manager');
    });

    it('should check feature access correctly (Requirement 10.7)', async () => {
      const result = await userService.checkUserPermissions(testUser._id.toString(), null, 'sales.create');

      expect(result).toBeDefined();
      expect(result.hasFeatureAccess).toBe(true);
    });

    it('should deny access to feature not in permissions', async () => {
      const result = await userService.checkUserPermissions(testUser._id.toString(), null, 'sales.delete');

      expect(result).toBeDefined();
      expect(result.hasFeatureAccess).toBe(false);
    });

    it('should check both module and feature access', async () => {
      const result = await userService.checkUserPermissions(testUser._id.toString(), 'sales', 'sales.create');

      expect(result).toBeDefined();
      expect(result.hasModuleAccess).toBe(true);
      expect(result.hasFeatureAccess).toBe(true);
    });

    it('should grant all access to admin users (Requirement 10.7)', async () => {
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

      const result = await userService.checkUserPermissions(adminUser._id.toString(), 'any_module', 'any_feature');

      expect(result.hasModuleAccess).toBe(true);
      expect(result.hasFeatureAccess).toBe(true);
      expect(result.isAdmin).toBe(true);
    });

    it('should throw error when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        userService.checkUserPermissions(fakeId.toString(), 'sales')
      ).rejects.toThrow('User not found');
    });

    it('should return permission information', async () => {
      const result = await userService.checkUserPermissions(testUser._id.toString());

      expect(result).toBeDefined();
      expect(result.permissions).toBeDefined();
      expect(result.permissions.modules).toContain('sales');
      expect(result.permissions.features).toContain('sales.create');
    });
  });

  describe('getDimensionBasedData', () => {
    it('should return dimension filter for dimension-based user (Requirement 10.8-10.9)', async () => {
      const result = await userService.getDimensionBasedData(testUser._id.toString());

      expect(result).toBeDefined();
      expect(result.dimensionBased).toBe(true);
      expect(result.filter).toBeDefined();
      expect(result.filter.dimensionId).toBeDefined();
      expect(result.filter.dimensionId.$in).toHaveLength(1);
      expect(result.filter.dimensionId.$in[0].toString()).toBe(testDimension1.toString());
      expect(result.allowedDimensions).toHaveLength(1);
    });

    it('should return empty filter for admin users (Requirement 10.8)', async () => {
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

      const result = await userService.getDimensionBasedData(adminUser._id.toString());

      expect(result.dimensionBased).toBe(false);
      expect(result.filter).toEqual({});
      expect(result.allowedDimensions).toEqual([]);
    });

    it('should return empty filter when dimensionBased is false', async () => {
      const openUser = await User.create({
        username: 'openuser',
        email: 'open@example.com',
        password: 'password123',
        role: 'manager',
        permissions: {
          modules: ['sales'],
          features: ['sales.view'],
          dataAccess: {
            dimensionBased: false,
            allowedDimensions: [],
          },
        },
      });

      const result = await userService.getDimensionBasedData(openUser._id.toString());

      expect(result.dimensionBased).toBe(false);
      expect(result.filter).toEqual({});
    });

    it('should handle multiple allowed dimensions', async () => {
      const multiDimUser = await User.create({
        username: 'multidim',
        email: 'multidim@example.com',
        password: 'password123',
        role: 'manager',
        permissions: {
          modules: ['sales'],
          features: ['sales.view'],
          dataAccess: {
            dimensionBased: true,
            allowedDimensions: [testDimension1, testDimension2],
          },
        },
      });

      const result = await userService.getDimensionBasedData(multiDimUser._id.toString());

      expect(result.dimensionBased).toBe(true);
      expect(result.allowedDimensions).toHaveLength(2);
      expect(result.filter.dimensionId.$in).toHaveLength(2);
    });

    it('should throw error when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        userService.getDimensionBasedData(fakeId.toString())
      ).rejects.toThrow('User not found');
    });
  });

  describe('forgotPassword', () => {
    it('should generate password reset token (Requirement 10.12)', async () => {
      const result = await userService.forgotPassword('test@example.com');

      expect(result).toBeDefined();
      expect(result.resetToken).toBeDefined();
      expect(typeof result.resetToken).toBe('string');
      expect(result.resetToken.length).toBeGreaterThan(0);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify token was saved to user
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeInstanceOf(Date);
      expect(updatedUser.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw error when email not found', async () => {
      await expect(
        userService.forgotPassword('nonexistent@example.com')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when user is inactive', async () => {
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      await expect(
        userService.forgotPassword('test@example.com')
      ).rejects.toThrow('User account is inactive');
    });

    it('should generate unique tokens for multiple requests', async () => {
      const result1 = await userService.forgotPassword('test@example.com');
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result2 = await userService.forgotPassword('test@example.com');

      expect(result1.resetToken).not.toBe(result2.resetToken);
    });
  });

  describe('resetPasswordWithToken', () => {
    let resetToken;

    beforeEach(async () => {
      // Generate a reset token
      const result = await userService.forgotPassword('test@example.com');
      resetToken = result.resetToken;
    });

    it('should reset password with valid token (Requirement 10.12)', async () => {
      const newPassword = 'newpassword123';
      const result = await userService.resetPasswordWithToken(resetToken, newPassword);

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id);
      const isMatch = await updatedUser.comparePassword(newPassword);
      expect(isMatch).toBe(true);

      // Verify token was cleared
      expect(updatedUser.passwordResetToken).toBeNull();
      expect(updatedUser.passwordResetExpires).toBeNull();
    });

    it('should throw error with invalid token', async () => {
      await expect(
        userService.resetPasswordWithToken('invalid-token', 'newpassword123')
      ).rejects.toThrow('Invalid or expired password reset token');
    });

    it('should throw error with expired token', async () => {
      // Manually expire the token
      await User.findByIdAndUpdate(testUser._id, {
        passwordResetExpires: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      await expect(
        userService.resetPasswordWithToken(resetToken, 'newpassword123')
      ).rejects.toThrow('Invalid or expired password reset token');
    });

    it('should throw error with short password', async () => {
      await expect(
        userService.resetPasswordWithToken(resetToken, '12345')
      ).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should not allow reusing the same token twice', async () => {
      const newPassword = 'newpassword123';
      
      // First reset should succeed
      await userService.resetPasswordWithToken(resetToken, newPassword);

      // Second reset with same token should fail
      await expect(
        userService.resetPasswordWithToken(resetToken, 'anotherpassword123')
      ).rejects.toThrow('Invalid or expired password reset token');
    });
  });

  describe('Integration: Permission and Dimension Checks', () => {
    let ItemModel;

    beforeEach(async () => {
      // Create a unique model for each test to avoid conflicts
      const modelName = `Item_${Date.now()}`;
      ItemModel = mongoose.model(modelName, new mongoose.Schema({
        name: String,
        dimensionId: { type: mongoose.Schema.Types.ObjectId },
      }));
    });

    it('should enforce dimension-based access in queries (Requirement 10.8-10.9)', async () => {
      // Create items in different dimensions
      await ItemModel.create([
        { name: 'Item 1', dimensionId: testDimension1 },
        { name: 'Item 2', dimensionId: testDimension2 },
      ]);

      // Get dimension filter for user
      const dimensionData = await userService.getDimensionBasedData(testUser._id.toString());

      // Apply filter to query
      const items = await ItemModel.find(dimensionData.filter);

      // User should only see items from their dimension
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Item 1');
      expect(items[0].dimensionId.toString()).toBe(testDimension1.toString());
    });

    it('should allow admin to access all dimensions', async () => {
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

      await ItemModel.create([
        { name: 'Item 1', dimensionId: testDimension1 },
        { name: 'Item 2', dimensionId: testDimension2 },
      ]);

      const dimensionData = await userService.getDimensionBasedData(adminUser._id.toString());
      const items = await ItemModel.find(dimensionData.filter);

      // Admin should see all items
      expect(items).toHaveLength(2);
    });

    it('should combine permission and dimension checks', async () => {
      // Check if user has sales module access
      const permissionCheck = await userService.checkUserPermissions(testUser._id.toString(), 'sales');
      expect(permissionCheck.hasModuleAccess).toBe(true);

      // Get dimension filter
      const dimensionData = await userService.getDimensionBasedData(testUser._id.toString());
      expect(dimensionData.dimensionBased).toBe(true);

      // User should have both permission and dimension restrictions
      expect(permissionCheck.hasModuleAccess && dimensionData.dimensionBased).toBe(true);
    });
  });
});
