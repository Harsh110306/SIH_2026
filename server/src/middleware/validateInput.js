const { AppError } = require('./errorHandler');

function validateRequiredFields(fields = []) {
  return (req, res, next) => {
    const body = req.body || {};
    const missing = fields.filter(field => body[field] === undefined || body[field] === null || body[field] === '');
    
    if (missing.length > 0) {
      return next(new AppError(`Missing required parameters: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR'));
    }
    next();
  };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateRequiredFields,
  validateEmail
};
