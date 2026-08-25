const express = require('express');
const router = express.Router();
const { getMuseumRecommendations } = require('../controllers/recommendationController');

router.post('/recommendations/museums', getMuseumRecommendations);

module.exports = router;
