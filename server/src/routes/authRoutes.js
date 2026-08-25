const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  requestOTP,
  verifyOTP,
  googleAuth,
  getCurrentUser,
  logout,
  promoteRole
} = require('../controllers/authController');

// Public Authentication Endpoints
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/google', googleAuth);
router.post('/promote-role', promoteRole); // Helper for testing role escalation

// Protected Authenticated Endpoints
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);

// Protected RBAC Verification Test Endpoints
router.get('/test/visitor', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access Granted: VISITOR Authorized Endpoint',
    user: req.user
  });
});

router.get('/test/staff', requireAuth, requireRole('STAFF', 'ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access Granted: STAFF Operational Authorized Endpoint',
    user: req.user
  });
});

router.get('/test/admin', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access Granted: ADMIN Management Authorized Endpoint',
    user: req.user
  });
});

module.exports = router;
