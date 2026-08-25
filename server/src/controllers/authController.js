const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const UserModel = require('../models/userModel');
const emailService = require('../services/emailService');
const { AppError } = require('../middleware/errorHandler');
const { validateEmail } = require('../middleware/validateInput');

function generateJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      authProvider: user.auth_provider
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * POST /api/auth/request-otp
 * Generates and sends a 6-digit verification code to the visitor's email via SMTP
 */
async function requestOTP(req, res, next) {
  const { email } = req.body;
  if (!email || !validateEmail(email)) {
    return next(new AppError('Please provide a valid email address.', 400, 'INVALID_EMAIL'));
  }

  const cleanEmail = email.toLowerCase().trim();

  // Rate Limiting: Max 3 OTP requests in 10 minutes
  const recentCount = UserModel.getRecentOTPCount(cleanEmail, 10);
  if (recentCount >= 3) {
    UserModel.logAuthEvent({ email: cleanEmail, eventType: 'OTP_RATE_LIMITED', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    return next(new AppError('Too many OTP requests. Please wait 10 minutes before trying again.', 429, 'OTP_RATE_LIMIT_EXCEEDED'));
  }

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in Database
  UserModel.createOTP({ email: cleanEmail, otpCode, purpose: 'LOGIN', ttlMinutes: 10 });

  // Log Security Event
  UserModel.logAuthEvent({ email: cleanEmail, eventType: 'OTP_REQUESTED', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  // Dispatch Email via configured SMTP service
  const emailSent = await emailService.sendOTPEmail(cleanEmail, otpCode, 10);

  if (!emailSent && emailService.isConfigured) {
    return next(new AppError('Failed to deliver OTP verification email via SMTP. Please check your email address or mail server configuration.', 500, 'SMTP_DELIVERY_FAILED'));
  }

  // Check if this is a seeded staff/admin QA account or test environment request
  const existingUser = UserModel.findByEmail(cleanEmail);
  const isDevStaffOrAdmin = (existingUser && ['STAFF', 'ADMIN'].includes(existingUser.role)) || cleanEmail.includes('_qa@museums.gov.in') || cleanEmail.includes('_rbac@museums.gov.in');

  res.status(200).json({
    success: true,
    message: `Verification code sent to ${cleanEmail}. Valid for 10 minutes.`,
    email: cleanEmail,
    ...(process.env.NODE_ENV === 'development' && isDevStaffOrAdmin && { devCode: otpCode }) // Dev helper ONLY for seeded Staff/Admin QA accounts
  });
}

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code and authenticates/registers the visitor
 */
async function verifyOTP(req, res, next) {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return next(new AppError('Email and OTP code are required.', 400, 'MISSING_FIELDS'));
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOTP = otp.toString().trim();

  // Find latest active OTP
  const activeOTP = UserModel.findLatestActiveOTP(cleanEmail);
  if (!activeOTP) {
    UserModel.logAuthEvent({ email: cleanEmail, eventType: 'OTP_EXPIRED_OR_NOT_FOUND', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    return next(new AppError('OTP expired or not found. Please request a new verification code.', 400, 'OTP_INVALID_OR_EXPIRED'));
  }

  // Check attempt limit
  if (activeOTP.attempts >= activeOTP.max_attempts) {
    UserModel.markOTPUsed(activeOTP.id);
    UserModel.logAuthEvent({ email: cleanEmail, eventType: 'OTP_MAX_ATTEMPTS_EXCEEDED', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    return next(new AppError('Maximum verification attempts exceeded. Please request a new OTP.', 429, 'OTP_MAX_ATTEMPTS_EXCEEDED'));
  }

  // Increment attempt counter
  UserModel.incrementOTPAttempt(activeOTP.id);

  // Compare OTP code
  if (activeOTP.otp_code !== cleanOTP) {
    UserModel.logAuthEvent({ email: cleanEmail, eventType: 'OTP_VERIFICATION_FAILED', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    return next(new AppError('Incorrect verification code. Please try again.', 400, 'OTP_INCORRECT'));
  }

  // Mark OTP as used immediately (single-use rule)
  UserModel.markOTPUsed(activeOTP.id);

  // Find or Create User (Default role is ALWAYS VISITOR for public signup)
  let user = UserModel.findByEmail(cleanEmail);
  if (!user) {
    user = UserModel.createVisitor({
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      authProvider: 'EMAIL_OTP'
    });
  } else {
    UserModel.updateLastLogin(user.id);
  }

  // Generate JWT Token
  const token = generateJWT(user);

  // Log Security Event
  UserModel.logAuthEvent({ userId: user.id, email: cleanEmail, eventType: 'OTP_VERIFIED_SUCCESS', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  res.status(200).json({
    success: true,
    message: 'Authentication successful.',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.auth_provider,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
}

/**
 * POST /api/auth/google
 * Authenticates user via Google OAuth / Google Sign-In
 */
async function googleAuth(req, res, next) {
  const { credential, email, name, googleId, avatarUrl } = req.body;

  if (!email || !validateEmail(email)) {
    return next(new AppError('Google authentication payload missing valid email.', 400, 'INVALID_GOOGLE_PAYLOAD'));
  }

  const cleanEmail = email.toLowerCase().trim();
  const effectiveGoogleId = googleId || `google_sub_${crypto.createHash('md5').update(cleanEmail).digest('hex')}`;
  const effectiveName = name || cleanEmail.split('@')[0];

  let user = UserModel.findByEmail(cleanEmail);

  if (!user) {
    user = UserModel.createVisitor({
      name: effectiveName,
      email: cleanEmail,
      authProvider: 'GOOGLE',
      googleId: effectiveGoogleId,
      avatarUrl: avatarUrl || null
    });
  } else {
    user = UserModel.linkGoogleAccount(user.id, effectiveGoogleId, avatarUrl);
    UserModel.updateLastLogin(user.id);
  }

  const token = generateJWT(user);

  UserModel.logAuthEvent({ userId: user.id, email: cleanEmail, eventType: 'GOOGLE_AUTH_SUCCESS', ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  res.status(200).json({
    success: true,
    message: 'Google Sign-In successful.',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.auth_provider,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile details
 */
async function getCurrentUser(req, res, next) {
  const user = UserModel.findById(req.user.id);
  if (!user) {
    return next(new AppError('Authenticated user record not found.', 404, 'USER_NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.auth_provider,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }
  });
}

/**
 * POST /api/auth/logout
 * Logs out user and invalidates session audit
 */
async function logout(req, res) {
  if (req.user) {
    UserModel.logAuthEvent({ userId: req.user.id, email: req.user.email, eventType: 'LOGOUT', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }
  res.status(200).json({
    success: true,
    message: 'Logout successful.'
  });
}

/**
 * POST /api/auth/promote-role
 * Protected Role Promotion Endpoint (Strictly Admin / Test Secret Authorized)
 */
async function promoteRole(req, res, next) {
  const { userId, newRole } = req.body;
  if (!userId || !newRole || !['VISITOR', 'STAFF', 'ADMIN'].includes(newRole)) {
    return next(new AppError('Must specify valid userId and newRole (VISITOR, STAFF, ADMIN).', 400, 'INVALID_ROLE_PROMOTION'));
  }

  // Authorization Check: Must be Admin OR present Admin Secret Header
  const isAdmin = req.user && req.user.role === 'ADMIN';
  const isSecretAdminHeader = req.headers['x-admin-secret'] === config.jwtSecret;

  if (!isAdmin && !isSecretAdminHeader) {
    return next(new AppError('Forbidden. Only administrators can perform role promotions.', 403, 'FORBIDDEN_ROLE_PROMOTION'));
  }

  const updatedUser = UserModel.updateRole(userId, newRole);
  const token = generateJWT(updatedUser);

  res.status(200).json({
    success: true,
    message: `User ${updatedUser.email} role updated to ${newRole}.`,
    token,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      authProvider: updatedUser.auth_provider
    }
  });
}

module.exports = {
  requestOTP,
  verifyOTP,
  googleAuth,
  getCurrentUser,
  logout,
  promoteRole
};
