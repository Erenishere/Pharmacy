/**
 * Authentication Module
 * Handles user authentication, authorization, and session management
 */

const authController = require('./auth.controller');
const authService = require('./auth.service');
const authRoutes = require('./auth.routes');

module.exports = {
  name: 'auth',
  version: '1.0.0',
  description: 'Authentication and authorization module',
  controller: authController,
  service: authService,
  routes: authRoutes,
  
  // Module metadata
  dependencies: [],
  models: ['User', 'AuditLog'],
  
  // Module configuration
  config: {
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
};
