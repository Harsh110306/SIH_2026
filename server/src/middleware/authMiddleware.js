const jwt = require('jsonwebtoken');
const config = require('../config/env');
const UserModel = require('../models/userModel');
const { AppError } = require('./errorHandler');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing or malformed token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Authoritative role lookup: If user exists in DB, read role directly from SQLite
    let effectiveRole = decoded.role;
    let effectiveEmail = decoded.email;
    let effectiveName = decoded.name;

    if (decoded.id) {
      const dbUser = UserModel.findById(decoded.id);
      if (dbUser) {
        effectiveRole = dbUser.role;
        effectiveEmail = dbUser.email;
        effectiveName = dbUser.name;
      }
    }

    req.user = {
      id: decoded.id,
      email: effectiveEmail,
      name: effectiveName,
      role: effectiveRole
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token or cryptographic signature.', 401, 'INVALID_TOKEN'));
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required prior to role verification.', 401, 'UNAUTHORIZED'));
    }

    const userRole = (req.user.role || '').toUpperCase();
    const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(userRole);

    if (!hasRole) {
      return next(new AppError(`Access denied. Role '${userRole}' is not authorized for this resource.`, 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
