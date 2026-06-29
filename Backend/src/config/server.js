const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const apiRoutes = require('../routes');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const {
  responseTimeMiddleware,
  requestTrackingMiddleware,
} = require('../middleware/performanceMonitoring');

class ServerConfig {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Performance monitoring middleware (should be first)
    this.app.use(responseTimeMiddleware);
    this.app.use(requestTrackingMiddleware);

    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }));

    // CORS configuration
    const configuredOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const loopbackConfiguredOrigins = configuredOrigins.flatMap((origin) => {
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost') {
          url.hostname = '127.0.0.1';
          return [origin, url.toString().replace(/\/$/, '')];
        }
        if (url.hostname === '127.0.0.1') {
          url.hostname = 'localhost';
          return [origin, url.toString().replace(/\/$/, '')];
        }
      } catch {
        return [origin];
      }
      return [origin];
    });
    const defaultDevOrigins = [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:4201',
      'http://127.0.0.1:4201',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...new Set([...loopbackConfiguredOrigins, ...defaultDevOrigins])];

    const corsOptions = {
      origin(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
          return callback(null, false);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
      optionsSuccessStatus: 200,
    };
    this.corsOptions = corsOptions;
    this.app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10000,
      handler: (req, res) => {
        const Response = require('../utils/response');
        return Response.error(
          res,
          'Too many requests from this IP, please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED',
        );
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  }

  setupRoutes() {
    // Handle preflight requests
    this.app.options('*', cors(this.corsOptions));

    // Root endpoint
    this.app.get('/', (req, res) => {
      const Response = require('../utils/response');
      return Response.success(res, {
        name: 'Pharam API Server',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          api: '/api',
          docs: '/api/docs',
        },
      }, 'Pharam API Server');
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const Response = require('../utils/response');
      return Response.success(res, {
        status: 'OK',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      }, 'Health status retrieved');
    });

    // Swagger API Documentation
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Indus Traders API Documentation',
    }));

    // API routes
    this.app.use('/api', apiRoutes);

    // 404 handler - must be after all routes
    this.app.use('*', notFoundHandler);
  }

  setupErrorHandling() {
    // Global error handler - must be last middleware
    this.app.use(errorHandler);
  }

  getApp() {
    return this.app;
  }
}

module.exports = ServerConfig;
