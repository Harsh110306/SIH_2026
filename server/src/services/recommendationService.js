const { getDbInstance } = require('../config/db');

class RecommendationService {
  /**
   * Generates data-driven ranked recommendations for museums, zoos & exhibitions
   */
  static getRecommendations({
    interests = [],
    city = null,
    availableTime = null,
    visitorType = null,
    facilities = [],
    limit = 5
  }) {
    const db = getDbInstance();

    // 1. Candidate Retrieval: Fetch active museums & zoos
    const candidates = db.prepare("SELECT * FROM museums WHERE status = 'ACTIVE'").all();
    if (candidates.length === 0) {
      return [];
    }

    // Normalize interests
    const cleanInterests = Array.isArray(interests)
      ? interests.map(i => i.toLowerCase().trim())
      : typeof interests === 'string'
      ? interests.toLowerCase().split(',').map(i => i.trim())
      : [];

    const cleanFacilities = Array.isArray(facilities)
      ? facilities.map(f => f.toLowerCase().trim())
      : [];

    // 2. Score Each Candidate
    const scoredCandidates = candidates.map(m => {
      let score = 50; // Base score
      const reasons = [];

      // Fetch related galleries, exhibitions, artifacts, animals for deeper interest scoring
      const galleries = db.prepare("SELECT name, description FROM galleries WHERE museum_id = ? AND status = 'ACTIVE'").all(m.id);
      const exhibitions = db.prepare("SELECT title, description FROM exhibitions WHERE museum_id = ? AND status != 'CANCELLED'").all(m.id);
      const artifacts = db.prepare("SELECT name, category, time_period, description FROM artifacts WHERE museum_id = ? AND status = 'ACTIVE'").all(m.id);
      const animals = db.prepare("SELECT common_name, species, description FROM animals WHERE zoo_id = ? AND status = 'ACTIVE'").all(m.id);

      const fullText = (
        `${m.name} ${m.type} ${m.description} ${m.short_description || ''} ` +
        galleries.map(g => `${g.name} ${g.description}`).join(' ') + ' ' +
        exhibitions.map(e => `${e.title} ${e.description}`).join(' ') + ' ' +
        artifacts.map(a => `${a.name} ${a.category} ${a.time_period}`).join(' ') + ' ' +
        animals.map(an => `${an.common_name} ${an.species}`).join(' ')
      ).toLowerCase();

      // --- A. Interest Match (Max 35 pts) ---
      if (cleanInterests.length > 0) {
        let interestMatches = 0;
        const matchedInterestNames = [];

        cleanInterests.forEach(interest => {
          if (interest === 'history' && (fullText.includes('history') || fullText.includes('historical') || fullText.includes('century') || m.type === 'MUSEUM')) {
            interestMatches++;
            matchedInterestNames.push('History');
          } else if (interest === 'archaeology' && (fullText.includes('archaeology') || fullText.includes('akota') || fullText.includes('mummy') || fullText.includes('bronze') || fullText.includes('ancient'))) {
            interestMatches++;
            matchedInterestNames.push('Archaeology & Antiquities');
          } else if (interest === 'art' && (fullText.includes('art') || fullText.includes('picture') || fullText.includes('painting') || fullText.includes('miniature') || fullText.includes('sculpture'))) {
            interestMatches++;
            matchedInterestNames.push('Art & Paintings');
          } else if (interest === 'wildlife' && (m.type === 'ZOO' || fullText.includes('lion') || fullText.includes('animal') || fullText.includes('sanctuary') || fullText.includes('aviary'))) {
            interestMatches++;
            matchedInterestNames.push('Wildlife & Sanctuary');
          } else if (interest === 'textiles' && (fullText.includes('textile') || fullText.includes('saree') || fullText.includes('patola') || fullText.includes('fabric') || fullText.includes('weave'))) {
            interestMatches++;
            matchedInterestNames.push('Royal Textiles & Weaving');
          } else if (fullText.includes(interest)) {
            interestMatches++;
            matchedInterestNames.push(interest);
          }
        });

        if (interestMatches > 0) {
          score += Math.min(interestMatches * 15, 35);
          reasons.push(`Strong match for your interest in ${matchedInterestNames.join(', ')}.`);
        }
      }

      // --- B. City / Location Match (Max 20 pts) ---
      if (city && city.trim().length > 0) {
        if (m.city.toLowerCase().includes(city.toLowerCase().trim())) {
          score += 20;
          reasons.push(`Located directly in ${m.city}.`);
        } else {
          score -= 10;
        }
      }

      // --- C. Visitor Type Suitability (Max 15 pts) ---
      if (visitorType) {
        const vType = visitorType.toLowerCase();
        if (vType === 'family' || vType === 'children') {
          if (m.type === 'ZOO' || fullText.includes('natural history') || fullText.includes('park')) {
            score += 15;
            reasons.push('Highly suitable for families and children with spacious outdoor areas and animal exhibits.');
          }
        } else if (vType === 'student' || vType === 'tourist') {
          if (m.type === 'MUSEUM' || m.type === 'HERITAGE_SITE') {
            score += 10;
            reasons.push('Ideal for students and heritage tourists exploring historical architecture and original artifacts.');
          }
        }
      }

      // --- D. Time Budget Suitability (Max 15 pts) ---
      if (availableTime) {
        const timeStr = availableTime.toLowerCase();
        if (timeStr.includes('1 hour') || timeStr.includes('short')) {
          if (galleries.length <= 4) {
            score += 10;
            reasons.push('Suitable for a focused 1-2 hour visit.');
          }
        } else if (timeStr.includes('full day') || timeStr.includes('half day')) {
          if (m.type === 'ZOO' || galleries.length > 3) {
            score += 15;
            reasons.push('Excellent destination for a half-day or full-day exploration.');
          }
        }
      }

      // --- E. Facility Match (Max 15 pts) ---
      if (cleanFacilities.length > 0 && m.facilities) {
        const mFac = m.facilities.toLowerCase();
        let matchedFacCount = 0;
        cleanFacilities.forEach(f => {
          if (mFac.includes(f)) matchedFacCount++;
        });

        if (matchedFacCount > 0) {
          score += Math.min(matchedFacCount * 5, 15);
          reasons.push(`Equipped with requested visitor facilities.`);
        }
      }

      // Format final explanation string
      const explanation = reasons.length > 0
        ? reasons.join(' ')
        : `Verified government ${m.type === 'ZOO' ? 'zoo and wildlife sanctuary' : 'museum'} offering rich cultural exhibits in ${m.city}.`;

      return {
        museumId: m.id,
        name: m.name,
        type: m.type,
        city: m.city,
        address: m.address,
        opening_time: m.opening_time,
        closing_time: m.closing_time,
        closed_days: m.closed_days,
        entry_fee_adult: m.entry_fee_adult,
        entry_fee_child: m.entry_fee_child,
        facilities: m.facilities,
        image_url: m.image_url,
        matchScore: Math.min(Math.round(score), 99),
        reason: explanation
      };
    });

    // 3. Rank & Sort Candidates Descending by Match Score
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

    return scoredCandidates.slice(0, limit);
  }
}

module.exports = RecommendationService;
