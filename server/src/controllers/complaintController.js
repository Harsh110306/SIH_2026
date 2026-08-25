const ComplaintModel = require('../models/complaintModel');
const SLAService = require('../services/slaService');
const notificationService = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/complaints
 * Create a new visitor complaint with AI auto-classification & SLA setup
 */
async function createComplaint(req, res, next) {
  const { museumId, galleryId, artifactId, subject, description, attachmentUrl } = req.body;
  const userId = req.user.id;

  if (!museumId || !subject || !description) {
    return next(new AppError('Museum ID, Subject, and Description are required to file a complaint.', 400, 'INVALID_COMPLAINT_INPUT'));
  }

  try {
    const result = await ComplaintModel.createComplaint({
      userId,
      museumId: parseInt(museumId),
      galleryId,
      artifactId,
      subject,
      description,
      attachmentUrl
    });

    // Notify user & staff
    notificationService.sendNotification({
      recipient: req.user.email,
      channel: 'EMAIL',
      subject: `Complaint Registered: ${result.complaint.complaint_number}`,
      message: `Your complaint #${result.complaint.complaint_number} has been logged and auto-classified as [${result.complaint.category}] priority [${result.complaint.priority}]. Target SLA Resolution: ${result.complaint.sla_deadline}.`
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully and auto-classified by AI.',
      complaint: result.complaint,
      potentialDuplicates: result.potentialDuplicates
    });
  } catch (err) {
    return next(new AppError(err.message, 400, 'COMPLAINT_CREATION_FAILED'));
  }
}

/**
 * GET /api/complaints/:id
 */
async function getComplaintDetails(req, res, next) {
  const { id } = req.params;
  const complaint = ComplaintModel.getComplaintById(id);

  if (!complaint) {
    return next(new AppError(`Complaint ID ${id} not found.`, 404, 'COMPLAINT_NOT_FOUND'));
  }

  const isStaff = ['STAFF', 'ADMIN'].includes(req.user.role);
  if (complaint.user_id !== req.user.id && !isStaff) {
    return next(new AppError('Forbidden. You do not own this complaint record.', 403, 'FORBIDDEN_COMPLAINT_ACCESS'));
  }

  // Filter out internal notes for normal visitors
  if (!isStaff && complaint.updates) {
    complaint.updates = complaint.updates.filter(u => u.is_internal === 0);
  }

  res.status(200).json({
    success: true,
    complaint
  });
}

/**
 * GET /api/complaints/my-complaints
 */
async function getUserComplaints(req, res) {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = ComplaintModel.getUserComplaints(userId, limit, page);
  res.status(200).json({
    success: true,
    ...result
  });
}

/**
 * GET /api/complaints (Staff & Admin Dashboard)
 */
async function getAllComplaints(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { status, priority, category, department, museumId, slaStatus } = req.query;

  const result = ComplaintModel.getAllComplaints({
    page, limit, status, priority, category, department, museumId, slaStatus
  });

  res.status(200).json({
    success: true,
    ...result
  });
}

/**
 * PATCH /api/complaints/:id/status
 */
async function updateStatus(req, res, next) {
  const { id } = req.params;
  const { status, message } = req.body;

  if (!status) {
    return next(new AppError('New status is required.', 400, 'MISSING_STATUS'));
  }

  const complaint = ComplaintModel.getComplaintById(id);
  if (!complaint) {
    return next(new AppError(`Complaint ID ${id} not found.`, 404, 'COMPLAINT_NOT_FOUND'));
  }

  const isStaff = ['STAFF', 'ADMIN'].includes(req.user.role);
  if (!isStaff && complaint.user_id !== req.user.id) {
    return next(new AppError('Forbidden. You cannot update status of this complaint.', 403, 'FORBIDDEN'));
  }

  const updated = ComplaintModel.updateComplaintStatus(id, {
    newStatus: status,
    userId: req.user.id,
    message
  });

  res.status(200).json({
    success: true,
    message: `Complaint status updated to ${status}.`,
    complaint: updated
  });
}

/**
 * PATCH /api/complaints/:id/classification (Admin Override)
 */
async function overrideClassification(req, res, next) {
  const { id } = req.params;
  const { category, priority, department, staffId, reason } = req.body;

  const updated = ComplaintModel.overrideClassification(id, {
    category, priority, department, staffId, userId: req.user.id, reason
  });

  if (!updated) {
    return next(new AppError(`Complaint ID ${id} not found.`, 404, 'COMPLAINT_NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    message: 'Complaint classification manually updated by Admin.',
    complaint: updated
  });
}

/**
 * POST /api/complaints/:id/comments
 */
async function addComment(req, res, next) {
  const { id } = req.params;
  const { message, isInternal = 0 } = req.body;

  if (!message || message.trim().length === 0) {
    return next(new AppError('Comment message cannot be empty.', 400, 'EMPTY_COMMENT'));
  }

  const isStaff = ['STAFF', 'ADMIN'].includes(req.user.role);
  const updated = ComplaintModel.addComment(id, {
    userId: req.user.id,
    message,
    isInternal: isStaff ? isInternal : 0
  });

  res.status(200).json({
    success: true,
    message: 'Update comment added.',
    complaint: updated
  });
}

/**
 * POST /api/complaints/:id/feedback
 */
async function submitFeedback(req, res, next) {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be an integer between 1 and 5.', 400, 'INVALID_RATING'));
  }

  const updated = ComplaintModel.submitFeedback(id, {
    userId: req.user.id,
    rating: parseInt(rating),
    comment
  });

  res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully.',
    complaint: updated
  });
}

/**
 * POST /api/admin/sla-check (Admin SLA Background Processor Trigger)
 */
async function triggerSLACheck(req, res) {
  const slaResult = SLAService.checkAndProcessSLAEscalations();
  res.status(200).json({
    success: true,
    message: 'SLA Background Escalation Check Completed.',
    slaResult
  });
}

module.exports = {
  createComplaint,
  getComplaintDetails,
  getUserComplaints,
  getAllComplaints,
  updateStatus,
  overrideClassification,
  addComment,
  submitFeedback,
  triggerSLACheck
};
