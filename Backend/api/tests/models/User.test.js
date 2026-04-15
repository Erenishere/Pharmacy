const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');

describe('User Model', () => {
  let mongoServer;

  beforeAll(async () => {
    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    // Master Data Management - Requirement 10.1: Test accountId reference
    it('should create user with accountId reference', async () => {
      const accountId = new mongoose.Types.ObjectId();
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'salesman',
        accountId: accountId
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.accountId.toString()).toBe(accountId.toString());
    });

    // Master Data Management - Requirement 10.2: Test dimensionId reference
    it('should create user with dimensionId reference', async () => {
      const dimensionId = new mongoose.Types.ObjectId();
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'salesman',
        dimensionId: dimensionId
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.dimensionId.toString()).toBe(dimensionId.toString());
    });

    // Master Data Management - Requirement 10.7: Test permissions object
    it('should create user with permissions', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'manager',
        permissions: {
          modules: ['sales', 'inventory'],
          features: ['create_invoice', 'view_reports'],
          dataAccess: {
            dimensionBased: true,
            allowedDimensions: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
          }
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.permissions.modules).toEqual(['sales', 'inventory']);
      expect(savedUser.permissions.features).toEqual(['create_invoice', 'view_reports']);
      expect(savedUser.permissions.dataAccess.dimensionBased).toBe(true);
      expect(savedUser.permissions.dataAccess.allowedDimensions).toHaveLength(2);
    });

    it('should require username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Username is required');
    });

    it('should require email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Email is required');
    });

    it('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Please enter a valid email');
    });

    // Master Data Management - Requirement 10.6: Test updated role enum
    it('should validate role enum', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid_role'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should accept all valid roles', async () => {
      const validRoles = ['admin', 'manager', 'salesman', 'accountant', 'store_keeper', 'store_incharge', 'deliveryman', 'driver', 'it_support', 'data_entry', 'custom'];
      
      for (const role of validRoles) {
        const user = new User({
          username: `user_${role}`,
          email: `${role}@example.com`,
          password: 'password123',
          role: role
        });
        const savedUser = await user.save();
        expect(savedUser.role).toBe(role);
      }
    });

    it('should enforce unique username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123',
        role: 'admin'
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        email: 'test2@example.com'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        username: 'testuser2'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe('password123');
      expect(user.password.length).toBeGreaterThan(20);
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await user.save();
      const originalHash = user.password;

      user.username = 'updateduser';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('Instance Methods', () => {
    let user;
    let dimensionId1, dimensionId2;

    beforeEach(async () => {
      dimensionId1 = new mongoose.Types.ObjectId();
      dimensionId2 = new mongoose.Types.ObjectId();
      
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'manager',
        permissions: {
          modules: ['sales', 'inventory'],
          features: ['create_invoice', 'view_reports'],
          dataAccess: {
            dimensionBased: true,
            allowedDimensions: [dimensionId1]
          }
        }
      });
      await user.save();
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should update last login', async () => {
      expect(user.lastLogin).toBeNull();

      await user.updateLastLogin();
      expect(user.lastLogin).toBeInstanceOf(Date);
    });

    // Master Data Management - Requirement 10.7: Test module access
    it('should check module access correctly', () => {
      expect(user.hasModuleAccess('sales')).toBe(true);
      expect(user.hasModuleAccess('inventory')).toBe(true);
      expect(user.hasModuleAccess('purchase')).toBe(false);
    });

    it('should grant all module access to admin', async () => {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });
      await adminUser.save();

      expect(adminUser.hasModuleAccess('sales')).toBe(true);
      expect(adminUser.hasModuleAccess('purchase')).toBe(true);
      expect(adminUser.hasModuleAccess('any_module')).toBe(true);
    });

    // Master Data Management - Requirement 10.7: Test feature access
    it('should check feature access correctly', () => {
      expect(user.hasFeatureAccess('create_invoice')).toBe(true);
      expect(user.hasFeatureAccess('view_reports')).toBe(true);
      expect(user.hasFeatureAccess('delete_invoice')).toBe(false);
    });

    it('should grant all feature access to admin', async () => {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });
      await adminUser.save();

      expect(adminUser.hasFeatureAccess('create_invoice')).toBe(true);
      expect(adminUser.hasFeatureAccess('delete_invoice')).toBe(true);
      expect(adminUser.hasFeatureAccess('any_feature')).toBe(true);
    });

    // Master Data Management - Requirement 10.8: Test dimension-based access
    it('should check dimension access correctly', () => {
      expect(user.hasDimensionAccess(dimensionId1)).toBe(true);
      expect(user.hasDimensionAccess(dimensionId2)).toBe(false);
    });

    it('should grant all dimension access to admin', async () => {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });
      await adminUser.save();

      expect(adminUser.hasDimensionAccess(dimensionId1)).toBe(true);
      expect(adminUser.hasDimensionAccess(dimensionId2)).toBe(true);
    });

    it('should grant all dimension access when dimensionBased is false', async () => {
      const openUser = new User({
        username: 'openuser',
        email: 'open@example.com',
        password: 'password123',
        role: 'manager',
        permissions: {
          modules: ['sales'],
          features: ['create_invoice'],
          dataAccess: {
            dimensionBased: false,
            allowedDimensions: []
          }
        }
      });
      await openUser.save();

      expect(openUser.hasDimensionAccess(dimensionId1)).toBe(true);
      expect(openUser.hasDimensionAccess(dimensionId2)).toBe(true);
    });

    // Master Data Management - Requirement 10.8: Test dimension filter
    it('should return correct dimension filter', () => {
      const filter = user.getDimensionFilter();
      expect(filter).toHaveProperty('dimensionId');
      expect(filter.dimensionId.$in).toHaveLength(1);
      expect(filter.dimensionId.$in[0].toString()).toBe(dimensionId1.toString());
    });

    it('should return empty filter for admin', async () => {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });
      await adminUser.save();

      const filter = adminUser.getDimensionFilter();
      expect(filter).toEqual({});
    });

    it('should return empty filter when dimensionBased is false', async () => {
      const openUser = new User({
        username: 'openuser',
        email: 'open@example.com',
        password: 'password123',
        role: 'manager',
        permissions: {
          modules: ['sales'],
          features: ['create_invoice'],
          dataAccess: {
            dimensionBased: false,
            allowedDimensions: []
          }
        }
      });
      await openUser.save();

      const filter = openUser.getDimensionFilter();
      expect(filter).toEqual({});
    });

    // Master Data Management - Requirement 10.12: Test password reset token
    it('should generate password reset token', () => {
      const token = user.generatePasswordResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpires).toBeInstanceOf(Date);
      expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should clear password reset token', () => {
      user.generatePasswordResetToken();
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpires).toBeDefined();

      user.clearPasswordResetToken();
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetExpires).toBeNull();
    });
  });

  describe('Static Methods', () => {
    let accountId1, accountId2, dimensionId1, dimensionId2;

    beforeEach(async () => {
      accountId1 = new mongoose.Types.ObjectId();
      accountId2 = new mongoose.Types.ObjectId();
      dimensionId1 = new mongoose.Types.ObjectId();
      dimensionId2 = new mongoose.Types.ObjectId();

      await User.create([
        {
          username: 'admin1',
          email: 'admin1@example.com',
          password: 'password123',
          role: 'admin',
          isActive: true,
          accountId: accountId1,
          dimensionId: dimensionId1
        },
        {
          username: 'admin2',
          email: 'admin2@example.com',
          password: 'password123',
          role: 'admin',
          isActive: false,
          accountId: accountId2,
          dimensionId: dimensionId2
        },
        {
          username: 'salesman1',
          email: 'salesman1@example.com',
          password: 'password123',
          role: 'salesman',
          isActive: true,
          dimensionId: dimensionId1
        }
      ]);
    });

    it('should find active users by role', async () => {
      const activeAdmins = await User.findActiveByRole('admin');
      expect(activeAdmins).toHaveLength(1);
      expect(activeAdmins[0].username).toBe('admin1');

      const activeSalesmen = await User.findActiveByRole('salesman');
      expect(activeSalesmen).toHaveLength(1);
      expect(activeSalesmen[0].username).toBe('salesman1');
    });

    // Master Data Management - Test findByAccount
    it('should find user by account', async () => {
      const user = await User.findByAccount(accountId1);
      expect(user).toBeDefined();
      expect(user.username).toBe('admin1');
      expect(user.accountId.toString()).toBe(accountId1.toString());
    });

    it('should not find inactive user by account', async () => {
      const user = await User.findByAccount(accountId2);
      expect(user).toBeNull();
    });

    // Master Data Management - Test findByDimension
    it('should find users by dimension', async () => {
      const users = await User.findByDimension(dimensionId1);
      expect(users).toHaveLength(2);
      expect(users.map(u => u.username).sort()).toEqual(['admin1', 'salesman1']);
    });

    it('should not find inactive users by dimension', async () => {
      const users = await User.findByDimension(dimensionId2);
      expect(users).toHaveLength(0);
    });

    // Master Data Management - Requirement 10.12: Test findByPasswordResetToken
    it('should find user by valid password reset token', async () => {
      const user = await User.findOne({ username: 'admin1' });
      const token = user.generatePasswordResetToken();
      await user.save();

      const foundUser = await User.findByPasswordResetToken(token);
      expect(foundUser).toBeDefined();
      expect(foundUser.username).toBe('admin1');
    });

    it('should not find user with expired token', async () => {
      const user = await User.findOne({ username: 'admin1' });
      const token = user.generatePasswordResetToken();
      user.passwordResetExpires = new Date(Date.now() - 1000); // Expired 1 second ago
      await user.save();

      const foundUser = await User.findByPasswordResetToken(token);
      expect(foundUser).toBeNull();
    });

    it('should not find user with invalid token', async () => {
      const user = await User.findOne({ username: 'admin1' });
      user.generatePasswordResetToken();
      await user.save();

      const foundUser = await User.findByPasswordResetToken('invalid-token');
      expect(foundUser).toBeNull();
    });

    it('should not find inactive user by password reset token', async () => {
      const user = await User.findOne({ username: 'admin2' });
      const token = user.generatePasswordResetToken();
      await user.save();

      const foundUser = await User.findByPasswordResetToken(token);
      expect(foundUser).toBeNull();
    });
  });

  describe('JSON Transform', () => {
    it('should exclude password from JSON output', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });
      await user.save();

      const userJson = user.toJSON();
      expect(userJson.password).toBeUndefined();
      expect(userJson.username).toBe('testuser');
    });
  });
});