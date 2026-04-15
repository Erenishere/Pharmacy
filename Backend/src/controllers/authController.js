const authService = require('../services/authService');
const { sendPasswordResetEmail } = require('../services/emailService');
const User = require('../models/User');
const Response = require('../utils/response');

/**
 * Authentication Controller
 * Handles login, logout, token refresh, and other auth-related operations
 */
class AuthController {
  /**
   * User login
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      console.log('[AuthController] Login attempt for:', identifier);

      // Validate required fields
      if (!identifier || !password) {
        console.log('[AuthController] Missing credentials');
        return Response.error(res, 'Username/email and password are required', 400, 'VALIDATION_ERROR');
      }

      // Authenticate user
      console.log('[AuthController] Authenticating user...');
      const result = await authService.authenticate(identifier, password);

      console.log('[AuthController] Login successful for:', identifier);
      return Response.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }, 'Login successful');
    } catch (error) {
      console.error('[AuthController] Login error:', error.message);

      if (error.message === 'Invalid credentials') {
        console.log('[AuthController] Invalid credentials for:', req.body.identifier);
        return Response.error(res, 'Invalid username/email or password', 401, 'INVALID_CREDENTIALS');
      }

      if (error.message === 'User account is inactive') {
        console.log('[AuthController] User account inactive:', req.body.identifier);
        return Response.error(res, 'Your account has been deactivated. Please contact administrator.', 401, 'ACCOUNT_INACTIVE');
      }

      throw error;
    }
  }

  /**
   * Token refresh
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return Response.error(res, 'Refresh token is required', 400, 'VALIDATION_ERROR');
      }

      // Refresh access token
      const result = await authService.refreshAccessToken(refreshToken);

      return Response.success(res, {
        user: result.user,
        accessToken: result.accessToken,
      }, 'Token refreshed successfully');
    } catch (error) {
      if (error.message === 'Refresh token has expired') {
        return Response.error(res, 'Refresh token has expired. Please login again.', 401, 'TOKEN_EXPIRED');
      }

      if (error.message === 'Invalid refresh token') {
        return Response.error(res, 'Invalid refresh token', 401, 'INVALID_TOKEN');
      }

      if (error.message === 'User not found') {
        return Response.error(res, 'User associated with this token no longer exists', 401, 'USER_NOT_FOUND');
      }

      if (error.message === 'User account is inactive') {
        return Response.error(res, 'Your account has been deactivated', 401, 'ACCOUNT_INACTIVE');
      }

      throw error;
    }
  }

  /**
   * User logout
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async logout(req, res) {
    try {
      return Response.success(res, null, 'Logout successful');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user profile
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const { user } = req;
      return Response.success(res, {
        user: user.toJSON(),
      }, 'Profile retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify token endpoint
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async verifyToken(req, res) {
    try {
      const { user } = req;
      return Response.success(res, {
        valid: true,
        user: user.toJSON(),
      }, 'Token is valid');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Forgot password – admin only
   * Generates a reset token and sends it via email
   * @route POST /api/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return Response.error(res, 'Email is required', 400, 'VALIDATION_ERROR');
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase().trim() });

      // If no user found, return a generic success to prevent email enumeration
      if (!user) {
        return Response.success(res, null, 'If that email is registered, a reset link has been sent.');
      }

      // Only admin accounts can reset their password via email
      if (user.role !== 'admin') {
        return Response.error(
          res,
          'Only admin accounts can reset passwords via email.',
          403,
          'FORBIDDEN'
        );
      }

      // Generate reset token and save
      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // Send reset email
      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        // Rollback token if email fails
        user.clearPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        console.error('[AuthController] Failed to send reset email:', emailError.message);
        return Response.error(res, 'Failed to send reset email. Please try again later.', 500, 'EMAIL_ERROR');
      }

      console.log(`[AuthController] Password reset email sent to ${user.email}`);
      return Response.success(res, null, 'Password reset link has been sent to your email.');
    } catch (error) {
      console.error('[AuthController] forgotPassword error:', error.message);
      throw error;
    }
  }

  /**
   * Reset password using the token from the email link
   * @route POST /api/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return Response.error(res, 'Token and new password are required', 400, 'VALIDATION_ERROR');
      }

      if (password.length < 6) {
        return Response.error(res, 'Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
      }

      // Find user with this valid, non-expired token
      const user = await User.findByPasswordResetToken(token);

      if (!user) {
        return Response.error(
          res,
          'Invalid or expired reset token. Please request a new password reset.',
          400,
          'INVALID_TOKEN'
        );
      }

      // Update password and clear token fields
      user.password = password;
      user.clearPasswordResetToken();
      await user.save();

      console.log(`[AuthController] Password reset successful for ${user.email}`);
      return Response.success(res, null, 'Password has been reset successfully. You can now log in.');
    } catch (error) {
      console.error('[AuthController] resetPassword error:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthController();
