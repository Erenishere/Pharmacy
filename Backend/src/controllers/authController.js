const authService = require('../services/authService');
const { sendPasswordResetEmail, sendPasswordResetOTP } = require('../services/emailService');
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

      // Validate required fields
      if (!identifier || !password) {
        return Response.error(res, 'Username/email and password are required', 400, 'VALIDATION_ERROR');
      }

      // Authenticate user
      const result = await authService.authenticate(identifier, password, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      });

      return Response.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }, 'Login successful');
    } catch (error) {
      console.error('[AuthController] Login error:', error.message);

      if (error.message === 'Invalid credentials') {
        return Response.error(res, 'Invalid username/email or password', 401, 'INVALID_CREDENTIALS');
      }

      if (error.message === 'User account is inactive') {
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
      const result = await authService.refreshAccessToken(refreshToken, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      });

      return Response.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
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
      await authService.logoutSession(req.authToken, req.body?.refreshToken, {
        reason: 'logout',
      });

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
   * Forgot password
   * Generates an OTP and sends it via email
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
        return Response.success(res, null, 'If that email is registered, a verification code has been sent.');
      }

      // Only active accounts can reset password
      if (!user.isActive) {
        return Response.error(res, 'Your account is inactive. Please contact administrator.', 401, 'ACCOUNT_INACTIVE');
      }

      // Generate OTP and save
      const otp = user.generatePasswordResetOTP();
      await user.save({ validateBeforeSave: false });

      // Send OTP email
      try {
        await sendPasswordResetOTP(user.email, otp);
      } catch (emailError) {
        // Rollback OTP if email fails
        user.clearPasswordResetOTP();
        await user.save({ validateBeforeSave: false });
        console.error('[AuthController] Failed to send verification code:', emailError.message);
        return Response.error(res, 'Failed to send verification code. Please try again later.', 500, 'EMAIL_ERROR');
      }

      return Response.success(res, null, 'Verification code has been sent to your email.');
    } catch (error) {
      console.error('[AuthController] forgotPassword error:', error.message);
      throw error;
    }
  }

  /**
   * Verify OTP
   * Checks if the OTP is correct and generates a password reset token
   * @route POST /api/auth/verify-otp
   */
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return Response.error(res, 'Email and verification code are required', 400, 'VALIDATION_ERROR');
      }

      // Find user with valid OTP
      const user = await User.findByPasswordResetOTP(email, otp);

      if (!user) {
        return Response.error(
          res,
          'Invalid or expired verification code. Please request a new one.',
          400,
          'INVALID_OTP'
        );
      }

      // Set OTP as verified and generate a reset token for the final step
      user.isOTPVerified = true;
      user.clearPasswordResetOTP();
      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      return Response.success(res, { token: resetToken }, 'Code verified successfully. You can now change your password.');
    } catch (error) {
      console.error('[AuthController] verifyOTP error:', error.message);
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

      return Response.success(res, null, 'Password has been reset successfully. You can now log in.');
    } catch (error) {
      console.error('[AuthController] resetPassword error:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthController();
