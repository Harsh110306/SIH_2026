const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    errorCode: 'TOO_MANY_REQUESTS'
  }
});

const corsOptions = {
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

function setupSecurityMiddleware(app) {
  // Set secure HTTP headers
  app.use(helmet({
    contentSecurityPolicy: false // Disabled in dev for easy asset loading
  }));

  // Enable CORS
  app.use(cors(corsOptions));

  // Apply rate limiter to API routes
  app.use('/api/', limiter);
}

module.exports = setupSecurityMiddleware;
