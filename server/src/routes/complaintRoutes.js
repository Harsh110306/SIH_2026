const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaintDetails,
  getUserComplaints,
  getAllComplaints,
  updateStatus,
  overrideClassification,
  addComment,
  submitFeedback,
  triggerSLACheck
} = require('../controllers/complaintController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Authenticated Visitor Endpoints
router.post('/complaints', requireAuth, createComplaint);
router.get('/complaints/my-complaints', requireAuth, getUserComplaints);
router.get('/complaints/:id', requireAuth, getComplaintDetails);
router.post('/complaints/:id/comments', requireAuth, addComment);
router.patch('/complaints/:id/status', requireAuth, updateStatus);
router.post('/complaints/:id/feedback', requireAuth, submitFeedback);

// Staff & Admin Management Endpoints
router.get('/complaints', requireAuth, requireRole('STAFF', 'ADMIN'), getAllComplaints);
router.patch('/complaints/:id/classification', requireAuth, requireRole('ADMIN'), overrideClassification);
router.post('/admin/sla-check', requireAuth, requireRole('ADMIN'), triggerSLACheck);

module.exports = router;
