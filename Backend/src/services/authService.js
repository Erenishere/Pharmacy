const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthService {
  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (userId, role)
   * @returns {String} JWT token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (userId)
   * @returns {String} JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });
  }

  /**
   * Verify JWT access token
   * @param {String} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify JWT refresh token
   * @param {String} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {String} password - Plain text password
   * @returns {String} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hashed password
   * @param {String} password - Plain text password
   * @param {String} hashedPassword - Hashed password
   * @returns {Boolean} True if passwords match
   */
  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Authenticate user with username/email and password
   * @param {String} identifier - Username or email
   * @param {String} password - Plain text password
   * @returns {Object} User object and tokens
   * @throws {Error} If authentication fails
   */
  async authenticate(identifier, password) {
    console.log('[AuthService] authenticate() called with identifier:', identifier);

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    console.log('[AuthService] User found:', user ? 'YES' : 'NO');

    if (!user) {
      console.log('[AuthService] No user found with identifier:', identifier);
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('[AuthService] User is inactive:', user.username);
      throw new Error('User account is inactive');
    }

    // Verify password
    console.log('[AuthService] Verifying password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('[AuthService] Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[AuthService] Invalid password for:', identifier);
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.updateLastLogin();

    // If user is a sales user, populate salesman data including warehouseId
    const userJSON = user.toJSON();
    if (['sales', 'salesman'].includes(user.role)) {
      const Salesman = require('../models/Salesman');
      const salesman = await Salesman.findOne({ userId: user._id });

      if (salesman) {
        userJSON.salesmanId = salesman._id;
        userJSON.salesmanCode = salesman.code;
        userJSON.warehouseId = salesman.warehouseId;
      }
    }

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user._id,
      role: user.role,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user._id,
    });

    console.log('[AuthService] Authentication successful for:', identifier);

    return {
      user: userJSON,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - JWT refresh token
   * @returns {Object} New access token and user info
   * @throws {Error} If refresh token is invalid
   */
  async refreshAccessToken(refreshToken) {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: user._id,
      role: user.role,
    });

    return {
      user: user.toJSON(),
      accessToken,
    };
  }

  /**
   * Validate token and get user
   * @param {String} token - JWT access token
   * @returns {Object} User object
   * @throws {Error} If token is invalid or user not found
   */
  async validateTokenAndGetUser(token) {
    const decoded = this.verifyAccessToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // If user is a sales user, populate salesman data including warehouseId
    if (['sales', 'salesman'].includes(user.role)) {
      const Salesman = require('../models/Salesman');
      const salesman = await Salesman.findOne({ userId: user._id });

      console.log('[AuthService] Sales user detected:', user.username);
      console.log('[AuthService] Salesman found:', salesman ? 'YES' : 'NO');

      if (salesman) {
        console.log('[AuthService] Salesman ID:', salesman._id);
        console.log('[AuthService] Salesman Code:', salesman.code);
        console.log('[AuthService] Warehouse ID:', salesman.warehouseId);

        // Attach salesman data to user object
        user.salesmanId = salesman._id;
        user.salesmanCode = salesman.code;
        user.warehouseId = salesman.warehouseId;

        console.log('[AuthService] User object after assignment:', {
          salesmanId: user.salesmanId,
          salesmanCode: user.salesmanCode,
          warehouseId: user.warehouseId,
        });
      }
    }

    return user;
  }
}

module.exports = new AuthService();
