const { getDbInstance } = require('../config/db');

class KnowledgeService {
  /**
   * Retrieves verified data from the database matching keywords or intent in the query
   */
  static getVerifiedKnowledgeContext(userQuery) {
    const db = getDbInstance();
    const query = userQuery.toLowerCase().trim();
    
    // Stop words to isolate specific entity names
    const stopWords = new Set([
      'what', 'where', 'when', 'which', 'who', 'how', 'are', 'the', 'is', 'of', 'in', 'at',
      'for', 'and', 'or', 'a', 'an', 'to', 'does', 'do', 'can', 'i', 'tell', 'me', 'about',
      'opening', 'closing', 'hours', 'time', 'timings', 'open', 'close', 'closed', 'days',
      'located', 'location', 'ticket', 'tickets', 'price', 'prices', 'fee', 'fees',
      'facilities', 'offer', 'running', 'current', 'available', 'explore', 'visit',
      'museum', 'museums', 'zoo', 'zoos', 'exhibition', 'exhibitions', 'artifact', 'artifacts',
      'animal', 'animals', 'details', 'info', 'information', 'kya', 'kab', 'kahan', 'gujarat', 'state',
      'મ્યુઝિયમ', 'ક્યારે', 'ખુલ્લું', 'રહે', 'છે', 'બતાવો', 'ક્યાં', 'આવેલું',
      'संग्रहालय', 'कब', 'खुला', 'रहता', 'है', 'बताएं', 'कहां', 'स्थित'
    ]);

    const rawTokens = query.split(/\s+/).map(w => w.replace(/[^\w\u0900-\u097F\u0A80-\u0AFF]/g, '')).filter(w => w.length > 1);
    const entityTokens = rawTokens.filter(w => !stopWords.has(w) && w.length > 2);

    let museums = [];
    let exhibitions = [];
    let artifacts = [];
    let animals = [];

    // Determine if query is a Generic Discovery Query vs Specific Entity Query
    const isGenericDiscovery = (
      query.includes('available museum') || query.includes('list all museum') ||
      query.includes('which museum') || query.includes('explore museum') ||
      query.includes('show museum') || query.includes('available zoo') ||
      query.includes('all museum') || query.includes('list museum') ||
      query.includes('explore in gujarat') || query.includes('museums in gujarat') ||
      query.includes('museums can i explore') || query.includes('museums to visit') ||
      (entityTokens.length === 0 && (query.includes('museum') || query.includes('zoo')))
    );

    let specificEntityRequested = !isGenericDiscovery;
    let specificEntityFound = false;

    if (isGenericDiscovery) {
      museums = db.prepare("SELECT * FROM museums WHERE status = 'ACTIVE' LIMIT 5").all();
      specificEntityFound = museums.length > 0;
    } else {
      // 1. SPECIFIC ENTITY SEARCH ON MUSEUMS & ZOOS
      const allMuseums = db.prepare("SELECT * FROM museums WHERE status = 'ACTIVE'").all();
      
      for (const m of allMuseums) {
        const mNameLower = m.name.toLowerCase();
        const mCityLower = m.city.toLowerCase();
        
        let match = false;
        // Direct string contains check
        if (query.includes('baroda') || query.includes('બડોદા') || query.includes('बड़ौदा')) {
          if (mNameLower.includes('baroda')) match = true;
        } else if (query.includes('sayaji') || query.includes('સયાજી')) {
          if (mNameLower.includes('sayaji')) match = true;
        } else if (query.includes('calico') || query.includes('કેલિકો')) {
          if (mNameLower.includes('calico')) match = true;
        } else if (query.includes('science city')) {
          if (mNameLower.includes('science')) match = true;
        } else if (mNameLower.includes(query) || query.includes(mNameLower)) {
          match = true;
        } else {
          // Token level matching
          for (const token of entityTokens) {
            if (mNameLower.includes(token) || mCityLower.includes(token)) {
              match = true;
              break;
            }
          }
        }

        if (match) {
          museums.push(m);
          specificEntityFound = true;
        }
      }

      // 2. SPECIFIC SEARCH ON EXHIBITIONS
      if (entityTokens.length > 0) {
        for (const token of entityTokens) {
          const matches = db.prepare(`
            SELECT e.title, e.description, e.start_date, e.end_date, e.status, m.name as museum_name 
            FROM exhibitions e 
            JOIN museums m ON e.museum_id = m.id 
            WHERE LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ?
            LIMIT 3
          `).all(`%${token}%`, `%${token}%`);
          if (matches.length > 0) {
            exhibitions.push(...matches);
            specificEntityFound = true;
          }
        }
      }

      // 3. SPECIFIC SEARCH ON ARTIFACTS
      if (entityTokens.length > 0 || query.includes('mummy') || query.includes('bronze') || query.includes('statue') || query.includes('saree') || query.includes('mummy')) {
        const searchTerms = entityTokens.length > 0 ? entityTokens : ['mummy', 'bronze', 'statue', 'saree'];
        for (const token of searchTerms) {
          const matches = db.prepare(`
            SELECT a.name, a.description, a.historical_info, a.origin, a.time_period, a.material, m.name as museum_name 
            FROM artifacts a 
            JOIN museums m ON a.museum_id = m.id 
            WHERE a.status = 'ACTIVE' AND (LOWER(a.name) LIKE ? OR LOWER(a.description) LIKE ? OR LOWER(a.historical_info) LIKE ?)
            LIMIT 3
          `).all(`%${token}%`, `%${token}%`, `%${token}%`);
          if (matches.length > 0) {
            artifacts.push(...matches);
            specificEntityFound = true;
          }
        }
      }

      // 4. SPECIFIC SEARCH ON ZOO ANIMALS
      if (entityTokens.length > 0 || query.includes('lion') || query.includes('tiger') || query.includes('peacock') || query.includes('animal') || query.includes('zoo')) {
        const animalTerms = entityTokens.length > 0 ? entityTokens : ['lion', 'peacock', 'tiger', 'bird'];
        for (const token of animalTerms) {
          const matches = db.prepare(`
            SELECT an.common_name, an.scientific_name, an.description, an.conservation_status, an.habitat, an.diet, an.interesting_facts, m.name as zoo_name 
            FROM animals an 
            JOIN museums m ON an.zoo_id = m.id 
            WHERE an.status = 'ACTIVE' AND (LOWER(an.common_name) LIKE ? OR LOWER(an.scientific_name) LIKE ? OR LOWER(an.species) LIKE ?)
            LIMIT 3
          `).all(`%${token}%`, `%${token}%`, `%${token}%`);
          if (matches.length > 0) {
            animals.push(...matches);
            specificEntityFound = true;
          }
        }
      }
    }

    // Deduplicate records
    const uniqueMuseums = Array.from(new Set(museums.map(m => m.name))).map(name => museums.find(m => m.name === name));
    const uniqueExhibitions = Array.from(new Set(exhibitions.map(e => e.title))).map(title => exhibitions.find(e => e.title === title));
    const uniqueArtifacts = Array.from(new Set(artifacts.map(a => a.name))).map(name => artifacts.find(a => a.name === name));
    const uniqueAnimals = Array.from(new Set(animals.map(a => a.common_name))).map(name => animals.find(a => a.common_name === name));

    // Construct formatted text context block for AI prompt
    let contextText = '=== VERIFIED GOVERNMENT MUSEUM & ZOO DATABASE CONTEXT ===\n';

    if (uniqueMuseums.length > 0) {
      contextText += '\n[MUSEUMS & ZOOS]:\n' + uniqueMuseums.map(m => 
        `- ${m.name} (${m.type} in ${m.city}, ${m.address}): Timings ${m.opening_time} to ${m.closing_time}, Closed on ${m.closed_days}. Adult Fee ₹${m.entry_fee_adult}, Child ₹${m.entry_fee_child}. Facilities: ${m.facilities}`
      ).join('\n');
    }

    if (uniqueExhibitions.length > 0) {
      contextText += '\n\n[FEATURED EXHIBITIONS]:\n' + uniqueExhibitions.map(e => 
        `- "${e.title}" at ${e.museum_name} (${e.status}): ${e.description} (Dates: ${e.start_date} to ${e.end_date})`
      ).join('\n');
    }

    if (uniqueArtifacts.length > 0) {
      contextText += '\n\n[VERIFIED ARTIFACTS]:\n' + uniqueArtifacts.map(a => 
        `- "${a.name}" at ${a.museum_name}: Era: ${a.time_period}, Origin: ${a.origin}, Material: ${a.material}. Details: ${a.description}. Historical Context: ${a.historical_info}`
      ).join('\n');
    }

    if (uniqueAnimals.length > 0) {
      contextText += '\n\n[VERIFIED ZOO ANIMALS]:\n' + uniqueAnimals.map(a => 
        `- ${a.common_name} (${a.scientific_name}) at ${a.zoo_name}: Status: ${a.conservation_status}. Habitat: ${a.habitat}, Diet: ${a.diet}. Details: ${a.description}. Interesting Fact: ${a.interesting_facts}`
      ).join('\n');
    }

    if (!specificEntityFound && isGenericDiscovery) {
      const defaultMuseums = db.prepare("SELECT * FROM museums WHERE status = 'ACTIVE' LIMIT 3").all();
      contextText += '\n[AVAILABLE PLATFORM MUSEUMS]:\n' + defaultMuseums.map(m => 
        `- ${m.name} in ${m.city} (${m.opening_time} to ${m.closing_time}, Closed ${m.closed_days}, Adult ₹${m.entry_fee_adult})`
      ).join('\n');
    }

    return {
      contextText,
      specificEntityRequested,
      specificEntityFound,
      matchedMuseumObjects: uniqueMuseums,
      sources: {
        museums: uniqueMuseums.map(m => m.name),
        exhibitions: uniqueExhibitions.map(e => e.title),
        artifacts: uniqueArtifacts.map(a => a.name),
        animals: uniqueAnimals.map(a => a.common_name)
      }
    };
  }

  /**
   * Identifies user query intent category
   */
  static detectIntent(userQuery) {
    const q = userQuery.toLowerCase();

    // Actionable Platform Navigation Intents
    if (q.includes('how do i book') || q.includes('how to book') || q.includes('book a ticket') || q.includes('book ticket') || q.includes('buy ticket') || (q.includes('ટિકિટ') && q.includes('બુક')) || (q.includes('ટિકિટ') && q.includes('ખરીદ')) || (q.includes('टिकट') && q.includes('बुक')) || (q.includes('टिकट') && q.includes('खरीद'))) {
      return 'NAVIGATION_BOOKING';
    }
    if (q.includes('how can i find') || q.includes('find a museum') || q.includes('where are the museums') || (q.includes('મ્યુઝિયમ') && q.includes('શોધો')) || (q.includes('संग्रहालय') && q.includes('खोज'))) {
      return 'NAVIGATION_EXPLORE';
    }
    if (q.includes('which museum should i visit') || q.includes('which museum should') || q.includes('suggest museum') || (q.includes('કયું') && q.includes('મ્યુઝિયમ')) || (q.includes('कौन सा') && q.includes('संग्रहालय'))) {
      return 'NAVIGATION_RECOMMEND';
    }
    if (q.includes('where is my ticket') || q.includes('see my ticket') || q.includes('check my booking') || q.includes('my bookings') || (q.includes('મારી') && q.includes('ટિકિટ')) || (q.includes('मेरी') && q.includes('टिकट'))) {
      return 'NAVIGATION_MY_BOOKINGS';
    }
    if (q.includes('how do i report') || q.includes('report a problem') || q.includes('submit complaint') || q.includes('report issue') || (q.includes('સમસ્યા') && q.includes('રિપોર્ટ')) || (q.includes('शिकायत') && q.includes('दर्ज'))) {
      return 'NAVIGATION_COMPLAINT';
    }
    if (q.includes('how do staff validate') || q.includes('staff scanner') || q.includes('validate ticket')) {
      return 'NAVIGATION_STAFF_SCANNER';
    }

    if (q.includes('book') || q.includes('ticket') || q.includes('buy') || q.includes('price')) {
      return 'TICKET_REQUEST';
    }
    if (q.includes('complaint') || q.includes('broken') || q.includes('damage') || q.includes('issue') || q.includes('dirty')) {
      return 'COMPLAINT_REQUEST';
    }
    if (q.includes('recommend') || q.includes('which museum should') || q.includes('best for')) {
      return 'RECOMMENDATION_REQUEST';
    }
    if (q.includes('exhibition') || q.includes('event')) {
      return 'EXHIBITION_QUERY';
    }
    if (q.includes('artifact') || q.includes('statue') || q.includes('mummy') || q.includes('saree')) {
      return 'ARTIFACT_QUERY';
    }
    if (q.includes('lion') || q.includes('animal') || q.includes('zoo') || q.includes('peacock')) {
      return 'ANIMAL_QUERY';
    }
    return 'INFORMATION';
  }

  /**
   * Detects language (en, hi, gu)
   */
  static detectLanguage(text) {
    // Gujarati unicode range \u0A80-\u0AFF
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
    // Devanagari (Hindi) unicode range \u0900-\u097F
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    return 'en';
  }
}

module.exports = KnowledgeService;
