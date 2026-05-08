/**
 * Security Middleware
 * Comprehensive security hardening including:
 * - NoSQL injection prevention (mongo-sanitize)
 * - XSS protection (xss-clean)
 * - HTTP Parameter Pollution prevention (hpp)
 * - Enhanced input validation
 */

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');
const { normalizeRole } = require('../utils/roleUtils');

/**
 * MongoDB injection sanitization
 * Removes $ and . operators from user input to prevent NoSQL injection
 */
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security] Sanitized potentially malicious key: ${key} from IP: ${req.ip}`);
    
    // Track sanitization events for security monitoring
    if (!req.securityEvents) {
      req.securityEvents = [];
    }
    req.securityEvents.push({
      type: 'mongo_sanitize',
      key,
      timestamp: new Date(),
    });
  },
});

/**
 * XSS Protection middleware
 * Sanitizes user input to prevent cross-site scripting attacks
 */
const xssProtectionMiddleware = xss();

/**
 * HTTP Parameter Pollution prevention
 * Prevents attackers from exploiting vulnerabilities caused by
 * multiple parameters with the same name
 */
const hppMiddleware = hpp({
  whitelist: [
    // Fields that are legitimately arrays
    'sort',
    'fields',
    'populate',
    'status',
    'types',
    'categories',
    'ids',
    'itemIds',
    'customerIds',
  ],
});

/**
 * Strict input validation middleware
 * Validates common input patterns and rejects suspicious data
 */
const strictInputValidation = [
  // Validate that IDs are valid MongoDB ObjectIds
  body('*.id').optional().isMongoId().withMessage('Invalid ID format'),
  body('*.userId').optional().isMongoId().withMessage('Invalid user ID format'),
  body('*.customerId').optional().isMongoId().withMessage('Invalid customer ID format'),
  body('*.itemId').optional().isMongoId().withMessage('Invalid item ID format'),
  
  // Check for suspicious patterns in string fields
  body().custom((value, { req }) => {
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
      /\.\.\//g, // Path traversal
      /%00/g, // Null byte
    ];
    
    function checkValue(val, path = '') {
      if (typeof val === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(val)) {
            throw new Error(`Suspicious pattern detected in field: ${path}`);
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        for (const [key, nestedVal] of Object.entries(val)) {
          checkValue(nestedVal, `${path}.${key}`);
        }
      }
    }
    
    try {
      checkValue(value);
    } catch (error) {
      console.warn(`[Security] Input validation failed from ${req.ip}:`, error.message);
      throw error;
    }
    
    return true;
  }),
  
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Input validation failed',
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Security headers middleware
 * Adds comprehensive security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection for legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  next();
};

/**
 * Request size limiter
 * Prevents large payload attacks
 */
const requestSizeLimiter = {
  json: (maxSize = '10mb') => {
    return require('express').json({ 
      limit: maxSize,
      verify: (req, res, buf) => {
        // Store raw body for signature verification if needed
        req.rawBody = buf;
      },
    });
  },
  
  urlencoded: (maxSize = '10mb') => {
    return require('express').urlencoded({ 
      extended: true, 
      limit: maxSize,
    });
  },
};

/**
 * Rate limiting by user role
 * Different limits for different user types
 */
const roleBasedRateLimit = (options = {}) => {
  const { defaultLimit = 100, windowMs = 15 * 60 * 1000 } = options;
  
  // Store request counts in memory (use Redis in production)
  const requests = new Map();
  
  return (req, res, next) => {
    const user = req.user;
    const key = user ? `user:${user._id}` : `ip:${req.ip}`;
    
    // Determine limit based on role
    let limit = defaultLimit;
    if (user) {
      switch (normalizeRole(user.role)) {
        case 'admin':
          limit = 1000;
          break;
        default:
          limit = defaultLimit;
      }
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get user's request history
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key).filter(time => time > windowStart);
    
    if (userRequests.length >= limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000),
      });
    }
    
    userRequests.push(now);
    requests.set(key, userRequests);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - userRequests.length));
    res.setHeader('X-RateLimit-Reset', new Date(windowStart + windowMs).toISOString());
    
    next();
  };
};

/**
 * Suspicious request detection
 * Logs and optionally blocks suspicious request patterns
 */
const suspiciousRequestDetection = (options = {}) => {
  const { blockThreshold = 5, blockDuration = 15 * 60 * 1000 } = options;
  const suspiciousIps = new Map();
  const blockedIps = new Map();
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    // Check if IP is blocked
    if (blockedIps.has(ip)) {
      const unblockTime = blockedIps.get(ip);
      if (now < unblockTime) {
        return res.status(403).json({
          success: false,
          message: 'Access temporarily blocked due to suspicious activity',
          unblockAt: new Date(unblockTime).toISOString(),
        });
      } else {
        blockedIps.delete(ip);
      }
    }
    
    // Detect suspicious patterns
    const suspiciousIndicators = [];
    
    // Check for common attack patterns in URL
    const attackPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /union\s+select/i,
      /sleep\s*\(/i,
      /benchmark\s*\(/i,
    ];
    
    const urlAndBody = `${req.url} ${JSON.stringify(req.body)}`;
    
    for (const pattern of attackPatterns) {
      if (pattern.test(urlAndBody)) {
        suspiciousIndicators.push(pattern.toString());
      }
    }
    
    // Check for abnormal request characteristics
    if (req.headers['content-length'] > 1024 * 1024) { // > 1MB
      suspiciousIndicators.push('large_payload');
    }
    
    if (Object.keys(req.query).length > 50) {
      suspiciousIndicators.push('excessive_parameters');
    }
    
    // Log suspicious activity
    if (suspiciousIndicators.length > 0) {
      console.warn(`[Security] Suspicious request from ${ip}:`, {
        indicators: suspiciousIndicators,
        url: req.url,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });
      
      // Track suspicious activity count
      if (!suspiciousIps.has(ip)) {
        suspiciousIps.set(ip, []);
      }
      
      const ipHistory = suspiciousIps.get(ip).filter(time => time > now - 3600000); // Last hour
      ipHistory.push(now);
      suspiciousIps.set(ip, ipHistory);
      
      // Block if threshold exceeded
      if (ipHistory.length >= blockThreshold) {
        blockedIps.set(ip, now + blockDuration);
        console.error(`[Security] Blocked IP ${ip} for ${blockDuration}ms due to repeated suspicious activity`);
        
        return res.status(403).json({
          success: false,
          message: 'Access blocked due to suspicious activity',
        });
      }
    }
    
    next();
  };
};

/**
 * CORS security middleware
 * Enhanced CORS with security considerations
 */
const corsSecurity = (options = {}) => {
  const cors = require('cors');
  
  const defaultOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL,
        'http://localhost:4200', // Angular dev server
      ].filter(Boolean);
      
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn(`[Security] Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Correlation-ID',
      'X-API-Version',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Correlation-ID',
      'X-API-Version',
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
  };
  
  return cors({ ...defaultOptions, ...options });
};

/**
 * Security audit middleware
 * Logs security-relevant events for analysis
 */
const securityAudit = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log security-relevant events
    if (
      res.statusCode >= 400 ||
      req.securityEvents?.length > 0 ||
      req.headers['x-security-audit']
    ) {
      console.info('[Security Audit]', {
        timestamp: new Date(),
        ip: req.ip,
        userId: req.user?._id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        securityEvents: req.securityEvents || [],
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      });
    }
  });
  
  next();
};

/**
 * Combined security middleware
 * Applies all security middleware in correct order
 */
const applySecurityMiddleware = (app, options = {}) => {
  const {
    enableMongoSanitize = true,
    enableXss = true,
    enableHpp = true,
    enableHelmet = true,
    enableRateLimit = true,
    enableCors = true,
  } = options;
  
  // Security headers (should be early)
  app.use(securityHeaders);
  
  // CORS
  if (enableCors) {
    app.use(corsSecurity());
  }
  
  // Request size limits
  app.use(requestSizeLimiter.json());
  app.use(requestSizeLimiter.urlencoded());
  
  // HPP (before body parsing)
  if (enableHpp) {
    app.use(hppMiddleware);
  }
  
  // MongoDB injection prevention (after body parsing)
  if (enableMongoSanitize) {
    app.use(mongoSanitizeMiddleware);
  }
  
  // XSS protection
  if (enableXss) {
    app.use(xssProtectionMiddleware);
  }
  
  // Suspicious request detection
  app.use(suspiciousRequestDetection());
  
  // Security audit logging
  app.use(securityAudit);
  
  // Role-based rate limiting (applied selectively in routes)
  // This is exported for use in specific routes
  
  return {
    mongoSanitize: mongoSanitizeMiddleware,
    xss: xssProtectionMiddleware,
    hpp: hppMiddleware,
    securityHeaders,
    roleBasedRateLimit: roleBasedRateLimit(),
    strictInputValidation,
    corsSecurity: corsSecurity(),
    securityAudit,
  };
};

module.exports = {
  mongoSanitize: mongoSanitizeMiddleware,
  xss: xssProtectionMiddleware,
  hpp: hppMiddleware,
  securityHeaders,
  strictInputValidation,
  requestSizeLimiter,
  roleBasedRateLimit,
  suspiciousRequestDetection,
  corsSecurity,
  securityAudit,
  applySecurityMiddleware,
};
