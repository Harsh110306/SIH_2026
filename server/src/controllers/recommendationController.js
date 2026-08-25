const RecommendationService = require('../services/recommendationService');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/recommendations/museums
 * Calculates ranked data-driven recommendations with natural explanation reasons
 */
async function getMuseumRecommendations(req, res) {
  const { interests = [], city = null, availableTime = null, visitorType = null, facilities = [], limit = 5 } = req.body;

  const recommendations = RecommendationService.getRecommendations({
    interests,
    city,
    availableTime,
    visitorType,
    facilities,
    limit: parseInt(limit) || 5
  });

  res.status(200).json({
    success: true,
    totalMatches: recommendations.length,
    recommendations
  });
}

module.exports = {
  getMuseumRecommendations
};
