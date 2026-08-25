const express = require('express');
const router = express.Router();
const { getSystemHealth, testErrorHandling } = require('../controllers/healthController');

router.get('/health', getSystemHealth);
router.get('/health/error-test', testErrorHandling);

module.exports = router;
