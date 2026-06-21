const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto');
const { loadEnv } = require('./src/config/env');
const { info } = require('./src/utils/logger');

loadEnv();

const frontendDistPath = path.join(__dirname, '../frontend/dist');
const frontendImagePath = path.join(__dirname, '../frontend/image');
const frontendPhotosPath = path.join(__dirname, '../frontend/photos');

// Import v1 API routes and middleware
const v1Routes = require('./src/api/v1/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/error.middleware');
const { sequelize, testConnection } = require('./src/config/database');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — explicit origins in production
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? corsOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id']
}));

// Rate limiting — general API
const apiRateLimitWindowMs = Number.parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '', 10) || (1 * 60 * 1000);
const apiRateLimitMax = Number.parseInt(process.env.API_RATE_LIMIT_MAX || '', 10) || 100;

const apiLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Rate limiting — auth endpoints (stricter)
const authRateLimitWindowMs = Number.parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '', 10) || (15 * 60 * 1000);
const authRateLimitMax = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX || '', 10) || 20;

const authLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

app.set('trust proxy', 1);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files — serve React frontend build
app.use(express.static(frontendDistPath));
app.use('/image', express.static(frontendImagePath));
app.use('/photos', express.static(frontendPhotosPath));

// Request ID + logging for API routes
app.use('/api/', (req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  next();
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);
app.use('/api/v1/auth/refresh', authLimiter);
app.use('/api/v1/auth/forgot-pwd', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// Mount v1 API routes
app.use('/api/v1', v1Routes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ success: true, message: 'Database connection is healthy' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// SPA fallback — serve index.html for client-side routes
app.get('*splat', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/i)) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// 404 handler for API routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
let server = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Test database connection on startup
testConnection().then(connected => {
  if (connected) {
    console.log('Database connection successful');
  } else {
    console.error('Database connection failed');
  }
});

// Startup check: warn about schools with no current academic year or an expired one
if (process.env.NODE_ENV !== 'test') {
  const { QueryTypes } = require('sequelize');
  sequelize.query(
    `SELECT s.id AS school_id, s.name AS school_name,
            ay.name AS current_year, ay.end_date
     FROM schools s
     LEFT JOIN academic_years ay
       ON ay.school_id = s.id AND ay.is_current = true AND ay.deleted_at IS NULL
     WHERE s.deleted_at IS NULL
     ORDER BY s.id`,
    { type: QueryTypes.SELECT }
  ).then(rows => {
    const today = new Date();
    rows.forEach(row => {
      if (!row.current_year) {
        console.warn(`[AcademicYear] School "${row.school_name}" (id=${row.school_id}) has NO current academic year set.`);
      } else if (new Date(row.end_date) < today) {
        console.warn(`[AcademicYear] School "${row.school_name}" (id=${row.school_id}) current year "${row.current_year}" EXPIRED on ${row.end_date}. Update is_current to the new year.`);
      }
    });
  }).catch(() => {/* silently skip if table not yet available */});
}

module.exports = app;
module.exports.server = server;

