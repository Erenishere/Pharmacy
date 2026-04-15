# Master Data Management - Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Variables Review

#### Required Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/industraders
MONGODB_TEST_URI=mongodb://localhost:27017/industraders_test

# JWT Secrets
JWT_SECRET=<strong-secret-key>
JWT_REFRESH_SECRET=<strong-refresh-secret>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@industraders.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Session
SESSION_SECRET=<strong-session-secret>
SESSION_TIMEOUT=3600000
```

#### Production-Specific Variables
```bash
# Production Database (use connection string with credentials)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/industraders?retryWrites=true&w=majority

# Security
HELMET_ENABLED=true
HTTPS_ENABLED=true

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
NEW_RELIC_LICENSE_KEY=<your-newrelic-key>
```

### 2. Database Indexes Setup

#### Run Index Creation Script
```javascript
// Create indexes for performance
db.items.createIndex({ code: 1 }, { unique: true });
db.items.createIndex({ barcode: 1 }, { unique: true, sparse: true });
db.items.createIndex({ name: "text", description: "text" });
db.items.createIndex({ companyId: 1 });
db.items.createIndex({ categoryId: 1 });
db.items.createIndex({ sellingGroup: 1 });
db.items.createIndex({ "inventory.currentStock": 1 });
db.items.createIndex({ isActive: 1, isDeleted: 1 });

db.companies.createIndex({ name: 1 }, { unique: true });
db.companies.createIndex({ code: 1 }, { unique: true, sparse: true });
db.companies.createIndex({ groupType: 1 });

db.customers.createIndex({ code: 1 }, { unique: true });
db.customers.createIndex({ name: "text", "contactInfo.email": "text" });
db.customers.createIndex({ accountType: 1 });
db.customers.createIndex({ townId: 1 });
db.customers.createIndex({ salesmanId: 1 });

db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.warehouses.createIndex({ code: 1 }, { unique: true });
db.towns.createIndex({ name: 1 }, { unique: true });
db.areas.createIndex({ townId: 1 });
db.categories.createIndex({ name: 1 }, { unique: true });
db.subcategories.createIndex({ categoryId: 1 });
db.formulas.createIndex({ name: 1 }, { unique: true });
db.formulasizes.createIndex({ formulaId: 1 });
db.businesstypes.createIndex({ name: 1 }, { unique: true });
db.salesmen.createIndex({ code: 1 }, { unique: true });
db.transporters.createIndex({ code: 1 }, { unique: true });
db.claimaccounts.createIndex({ code: 1 }, { unique: true });
```

### 3. CORS Configuration

#### Update CORS Settings in app.js
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 4. Logging and Monitoring Setup

#### Configure Winston Logger
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

#### Setup Error Tracking (Sentry)
```javascript
const Sentry = require('@sentry/node');

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV
  });
}
```

### 5. Security Hardening

#### Enable Helmet
```javascript
const helmet = require('helmet');
app.use(helmet());
```

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

#### Input Sanitization
```javascript
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

app.use(mongoSanitize());
app.use(xss());
```

---

## Deployment Steps

### Step 1: Code Preparation
- [ ] Run all tests: `npm test`
- [ ] Fix any failing tests
- [ ] Run linter: `npm run lint`
- [ ] Fix linting errors
- [ ] Build production bundle (if applicable)
- [ ] Remove development dependencies

### Step 2: Database Preparation
- [ ] Backup existing database
- [ ] Create production database
- [ ] Run migrations (if any)
- [ ] Create indexes (see section 2)
- [ ] Seed initial data (if needed)
- [ ] Verify database connection

### Step 3: Environment Setup
- [ ] Create `.env.production` file
- [ ] Set all required environment variables
- [ ] Verify JWT secrets are strong
- [ ] Configure CORS origins
- [ ] Set up email service
- [ ] Configure file upload paths

### Step 4: Server Configuration
- [ ] Install Node.js (v14+ recommended)
- [ ] Install PM2: `npm install -g pm2`
- [ ] Configure PM2 ecosystem file
- [ ] Set up reverse proxy (Nginx/Apache)
- [ ] Configure SSL certificates
- [ ] Set up firewall rules

### Step 5: Application Deployment
- [ ] Clone repository or upload files
- [ ] Install dependencies: `npm install --production`
- [ ] Set NODE_ENV=production
- [ ] Start application: `pm2 start ecosystem.config.js`
- [ ] Verify application is running
- [ ] Check logs for errors

### Step 6: Post-Deployment Verification
- [ ] Test API endpoints
- [ ] Verify authentication works
- [ ] Test CRUD operations for all entities
- [ ] Check database connections
- [ ] Verify file uploads work
- [ ] Test email functionality
- [ ] Check error logging
- [ ] Verify rate limiting
- [ ] Test CORS configuration

### Step 7: Monitoring Setup
- [ ] Configure application monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts for errors
- [ ] Set up performance monitoring

### Step 8: Backup Configuration
- [ ] Set up automated database backups
- [ ] Configure backup retention policy
- [ ] Test backup restoration
- [ ] Document backup procedures

---

## PM2 Configuration

### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'industraders-api',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### PM2 Commands
```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop industraders-api

# Restart application
pm2 restart industraders-api

# View logs
pm2 logs industraders-api

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Nginx Configuration

### /etc/nginx/sites-available/industraders
```nginx
server {
    listen 80;
    server_name api.industraders.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.industraders.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload size limit
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

---

## Health Check Endpoint

### Add to routes
```javascript
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

---

## Rollback Plan

### If Deployment Fails:
1. Stop new application: `pm2 stop industraders-api`
2. Restore previous version from backup
3. Restore database from backup (if needed)
4. Start previous version: `pm2 start`
5. Verify application is working
6. Investigate and fix issues
7. Plan re-deployment

---

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error logs continuously
- [ ] Check application performance
- [ ] Verify all features working
- [ ] Monitor database performance
- [ ] Check API response times

### Short-term (Week 1)
- [ ] Review error logs daily
- [ ] Monitor user feedback
- [ ] Check system resources
- [ ] Verify backup completion
- [ ] Review security logs

### Long-term (Month 1)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Backup verification
- [ ] Documentation updates
- [ ] User training completion

---

## Support Contacts

- **DevOps Team**: devops@industraders.com
- **Database Admin**: dba@industraders.com
- **Security Team**: security@industraders.com
- **Emergency Hotline**: +92-XXX-XXXXXXX

---

**Last Updated**: February 2026  
**Version**: 1.0
