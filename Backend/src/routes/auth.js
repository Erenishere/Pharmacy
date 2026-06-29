const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Login rate limiter - 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test'
    ? 1000
    : (parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10),
  message: { success: false, message: 'Too many login attempts, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT tokens
 * @access  Public
 * @body    { identifier: string, password: string }
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required')
      .isLength({ min: 3 })
      .withMessage('Identifier must be at least 3 characters long'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    validate,
  ],
  authController.login,
);

// Prevent GET requests to login
router.get('/login', (req, res) => {
  res.status(405).json({
    success: false,
    error: 'Method Not Allowed',
    message: 'Use POST method to login',
    debug: 'Expected POST /api/auth/login',
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken: string }
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
      .isString()
      .withMessage('Refresh token must be a string'),
    validate,
  ],
  authController.refreshToken,
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  [
    body('refreshToken')
      .optional()
      .isString()
      .withMessage('Refresh token must be a string'),
    validate,
  ],
  authController.logout,
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if current token is valid
 * @access  Private
 */
router.get('/verify', authenticate, authController.verifyToken);

// Rate limiter for password reset – 5 attempts per hour
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset OTP via email
 * @access  Public
 * @body    { email: string }
 */
router.post(
  '/forgot-password',
  resetLimiter,
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    validate,
  ],
  authController.forgotPassword,
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify the OTP sent to email
 * @access  Public
 * @body    { email: string, otp: string }
 */
router.post(
  '/verify-otp',
  resetLimiter,
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address'),
    body('otp')
      .trim()
      .notEmpty().withMessage('Verification code is required')
      .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
    validate,
  ],
  authController.verifyOTP,
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using the token from the email link
 * @access  Public
 * @body    { token: string, password: string }
 */
router.post(
  '/reset-password',
  resetLimiter,
  [
    body('token')
      .trim()
      .notEmpty().withMessage('Reset token is required'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
  ],
  authController.resetPassword,
);

module.exports = router;
