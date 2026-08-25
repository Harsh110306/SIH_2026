const { getDbInstance } = require('../config/db');

class MuseumModel {
  // ==========================================
  // MUSEUM & ZOO OPERATIONS
  // ==========================================

  static getAllMuseums({ search = '', type = null, city = null, status = 'ACTIVE', page = 1, limit = 20 }) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;

    let baseQuery = 'FROM museums WHERE 1=1';
    const params = [];

    if (status) {
      baseQuery += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      baseQuery += ' AND type = ?';
      params.push(type);
    }

    if (city) {
      baseQuery += ' AND LOWER(city) = LOWER(?)';
      params.push(city);
    }

    if (search) {
      baseQuery += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(city) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params);
    const total = countRow ? countRow.count : 0;

    const items = db.prepare(`
      SELECT * ${baseQuery}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static getMuseumById(id) {
    const db = getDbInstance();
    const museum = db.prepare('SELECT * FROM museums WHERE id = ?').get(id);
    if (!museum) return null;

    // Attach related galleries, exhibitions, zoo sections & animals
    museum.galleries = db.prepare("SELECT * FROM galleries WHERE museum_id = ? AND status = 'ACTIVE' ORDER BY display_order ASC").all(id);
    museum.exhibitions = db.prepare("SELECT * FROM exhibitions WHERE museum_id = ? AND status != 'CANCELLED' ORDER BY start_date DESC").all(id);
    museum.sections = db.prepare("SELECT * FROM zoo_sections WHERE zoo_id = ? AND status = 'ACTIVE' ORDER BY display_order ASC").all(id);

    return museum;
  }

  static createMuseum(data) {
    const db = getDbInstance();
    const stmt = db.prepare(`
      INSERT INTO museums (
        name, type, description, short_description, address, city, state, country,
        latitude, longitude, contact_email, contact_phone, website, opening_time, closing_time,
        closed_days, entry_fee_adult, entry_fee_child, entry_fee_foreigner, facilities, accessibility_info, status, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.name,
      data.type || 'MUSEUM',
      data.description,
      data.short_description || null,
      data.address,
      data.city,
      data.state || 'Gujarat',
      data.country || 'India',
      data.latitude || null,
      data.longitude || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.website || null,
      data.opening_time || '09:00',
      data.closing_time || '18:00',
      data.closed_days || 'Monday',
      data.entry_fee_adult || 50.0,
      data.entry_fee_child || 20.0,
      data.entry_fee_foreigner || 200.0,
      data.facilities || null,
      data.accessibility_info || null,
      data.status || 'ACTIVE',
      data.image_url || null
    );

    return this.getMuseumById(info.lastInsertRowid);
  }

  static updateMuseum(id, data) {
    const db = getDbInstance();
    const existing = this.getMuseumById(id);
    if (!existing) return null;

    db.prepare(`
      UPDATE museums SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        opening_time = COALESCE(?, opening_time),
        closing_time = COALESCE(?, closing_time),
        closed_days = COALESCE(?, closed_days),
        entry_fee_adult = COALESCE(?, entry_fee_adult),
        entry_fee_child = COALESCE(?, entry_fee_child),
        entry_fee_foreigner = COALESCE(?, entry_fee_foreigner),
        facilities = COALESCE(?, facilities),
        accessibility_info = COALESCE(?, accessibility_info),
        status = COALESCE(?, status),
        image_url = COALESCE(?, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.name, data.type, data.description, data.short_description, data.address,
      data.city, data.state, data.opening_time, data.closing_time, data.closed_days,
      data.entry_fee_adult, data.entry_fee_child, data.entry_fee_foreigner, data.facilities,
      data.accessibility_info, data.status, data.image_url, id
    );

    return this.getMuseumById(id);
  }

  static softDeleteMuseum(id) {
    const db = getDbInstance();
    db.prepare("UPDATE museums SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    return true;
  }

  // ==========================================
  // GALLERY OPERATIONS
  // ==========================================

  static getGalleriesByMuseum(museumId) {
    const db = getDbInstance();
    return db.prepare("SELECT * FROM galleries WHERE museum_id = ? AND status = 'ACTIVE' ORDER BY display_order ASC").all(museumId);
  }

  static createGallery(data) {
    const db = getDbInstance();
    const stmt = db.prepare(`
      INSERT INTO galleries (museum_id, name, description, floor, display_order, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(data.museum_id, data.name, data.description || null, data.floor || null, data.display_order || 0, data.status || 'ACTIVE', data.image_url || null);
    return db.prepare('SELECT * FROM galleries WHERE id = ?').get(info.lastInsertRowid);
  }

  // ==========================================
  // EXHIBITION OPERATIONS
  // ==========================================

  static getExhibitions({ museumId = null, status = null, page = 1, limit = 20 }) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;
    let query = 'FROM exhibitions WHERE 1=1';
    const params = [];

    if (museumId) {
      query += ' AND museum_id = ?';
      params.push(museumId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params);
    const total = countRow ? countRow.count : 0;
    const items = db.prepare(`SELECT * ${query} ORDER BY start_date DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    return { items, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  static getExhibitionById(id) {
    const db = getDbInstance();
    return db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id);
  }

  static createExhibition(data) {
    const db = getDbInstance();
    const stmt = db.prepare(`
      INSERT INTO exhibitions (museum_id, title, description, start_date, end_date, location_gallery, is_featured, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.museum_id, data.title, data.description, data.start_date, data.end_date,
      data.location_gallery || null, data.is_featured || 0, data.status || 'ONGOING', data.image_url || null
    );
    return this.getExhibitionById(info.lastInsertRowid);
  }

  // ==========================================
  // ARTIFACT / EXHIBIT OPERATIONS
  // ==========================================

  static getArtifacts({ museumId = null, galleryId = null, exhibitionId = null, search = '', page = 1, limit = 20 }) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;
    let query = "FROM artifacts WHERE status = 'ACTIVE' AND is_public = 1";
    const params = [];

    if (museumId) {
      query += ' AND museum_id = ?';
      params.push(museumId);
    }
    if (galleryId) {
      query += ' AND gallery_id = ?';
      params.push(galleryId);
    }
    if (exhibitionId) {
      query += ' AND exhibition_id = ?';
      params.push(exhibitionId);
    }
    if (search) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(time_period) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params);
    const total = countRow ? countRow.count : 0;
    const items = db.prepare(`SELECT * ${query} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    return { items, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  static getArtifactById(id) {
    const db = getDbInstance();
    const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
    if (!artifact) return null;

    if (artifact.museum_id) {
      artifact.museum = db.prepare('SELECT name, city FROM museums WHERE id = ?').get(artifact.museum_id);
    }
    if (artifact.gallery_id) {
      artifact.gallery = db.prepare('SELECT name, floor FROM galleries WHERE id = ?').get(artifact.gallery_id);
    }
    return artifact;
  }

  static createArtifact(data) {
    const db = getDbInstance();
    const stmt = db.prepare(`
      INSERT INTO artifacts (
        museum_id, gallery_id, exhibition_id, name, description, historical_info, origin, time_period,
        category, material, dimensions, creator, discovery_info, is_public, status, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.museum_id, data.gallery_id || null, data.exhibition_id || null, data.name,
      data.description, data.historical_info || null, data.origin || null, data.time_period || null,
      data.category || null, data.material || null, data.dimensions || null, data.creator || null,
      data.discovery_info || null, data.is_public ?? 1, data.status || 'ACTIVE', data.image_url || null
    );

    return this.getArtifactById(info.lastInsertRowid);
  }

  // ==========================================
  // ZOO & ANIMAL OPERATIONS
  // ==========================================

  static getAnimals({ zooId = null, sectionId = null, search = '', page = 1, limit = 20 }) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;
    let query = "FROM animals WHERE status = 'ACTIVE' AND is_public = 1";
    const params = [];

    if (zooId) {
      query += ' AND zoo_id = ?';
      params.push(zooId);
    }
    if (sectionId) {
      query += ' AND section_id = ?';
      params.push(sectionId);
    }
    if (search) {
      query += ' AND (LOWER(common_name) LIKE ? OR LOWER(scientific_name) LIKE ? OR LOWER(species) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count ${query}`).get(...params);
    const total = countRow ? countRow.count : 0;
    const items = db.prepare(`SELECT * ${query} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    return { items, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  static getAnimalById(id) {
    const db = getDbInstance();
    const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(id);
    if (!animal) return null;

    if (animal.zoo_id) {
      animal.zoo = db.prepare('SELECT name, city FROM museums WHERE id = ?').get(animal.zoo_id);
    }
    if (animal.section_id) {
      animal.section = db.prepare('SELECT name FROM zoo_sections WHERE id = ?').get(animal.section_id);
    }
    return animal;
  }

  static createAnimal(data) {
    const db = getDbInstance();
    const stmt = db.prepare(`
      INSERT INTO animals (
        zoo_id, section_id, common_name, scientific_name, description, species, family,
        conservation_status, native_region, habitat, diet, interesting_facts, is_public, status, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.zoo_id, data.section_id || null, data.common_name, data.scientific_name || null,
      data.description, data.species || null, data.family || null, data.conservation_status || null,
      data.native_region || null, data.habitat || null, data.diet || null, data.interesting_facts || null,
      data.is_public ?? 1, data.status || 'ACTIVE', data.image_url || null
    );

    return this.getAnimalById(info.lastInsertRowid);
  }

  // ==========================================
  // GLOBAL SEARCH Across Platform
  // ==========================================

  static globalSearch(keyword) {
    const db = getDbInstance();
    const term = `%${keyword.toLowerCase()}%`;

    const museums = db.prepare("SELECT id, name, type, city, image_url FROM museums WHERE status = 'ACTIVE' AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ?) LIMIT 5").all(term, term);
    const exhibitions = db.prepare('SELECT id, museum_id, title, status, image_url FROM exhibitions WHERE LOWER(title) LIKE ? LIMIT 5').all(term);
    const artifacts = db.prepare("SELECT id, museum_id, name, time_period, image_url FROM artifacts WHERE status = 'ACTIVE' AND (LOWER(name) LIKE ? OR LOWER(time_period) LIKE ?) LIMIT 5").all(term, term);
    const animals = db.prepare("SELECT id, zoo_id, common_name, scientific_name, image_url FROM animals WHERE status = 'ACTIVE' AND (LOWER(common_name) LIKE ? OR LOWER(scientific_name) LIKE ?) LIMIT 5").all(term, term);

    return { museums, exhibitions, artifacts, animals };
  }
}

module.exports = MuseumModel;
