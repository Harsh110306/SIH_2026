const { getDbInstance } = require('../config/db');

function seedDatabase() {
  const db = getDbInstance();

  // Check if museums already exist
  const existingMuseums = db.prepare('SELECT COUNT(*) as count FROM museums').get();
  let museum1Id, museum2Id, museum3Id;

  if (existingMuseums.count === 0) {
    console.log('[Seed] Seeding sample Government Museums, Zoos, Exhibitions & Artifacts...');

    // 1. Insert Museum 1: Baroda Museum & Picture Gallery
    const info1 = db.prepare(`
      INSERT INTO museums (
        name, type, description, short_description, address, city, state, country,
        latitude, longitude, contact_email, contact_phone, website, opening_time, closing_time,
        closed_days, entry_fee_adult, entry_fee_child, entry_fee_foreigner, facilities, accessibility_info, status, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Baroda Museum & Picture Gallery',
      'MUSEUM',
      'Founded in 1894 by Maharaja Sayajirao Gaekwad III, the Baroda Museum and Picture Gallery is modeled on the Victoria & Albert Museum in London. It houses an extraordinary collection of European oil paintings, ancient Indian sculptures, Egyptian mummies, and Greco-Roman antiquities.',
      'World-famous 1894 government museum founded by Gaekwad III.',
      'Sayajibaug, University of Baroda, Dak Bunglaw, Sayajiganj',
      'Vadodara',
      'Gujarat',
      'India',
      22.3106, 73.1814,
      'barodamuseum@gujarat.gov.in', '+91 265 279 3801', 'https://barodamuseum.gujarat.gov.in',
      '10:30', '17:00', 'Monday',
      50.0, 20.0, 200.0,
      'Restrooms, Wheelchair Ramp, Guided Audio Tours, Parking, Cafeteria',
      'Ramp access at main entrance, elevator for upper picture gallery floors.',
      'ACTIVE',
      'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80'
    );
    museum1Id = info1.lastInsertRowid;

    // 2. Insert Museum 2: Sayaji Baug Zoo & Planetarium
    const info2 = db.prepare(`
      INSERT INTO museums (
        name, type, description, short_description, address, city, state, country,
        latitude, longitude, contact_email, contact_phone, website, opening_time, closing_time,
        closed_days, entry_fee_adult, entry_fee_child, entry_fee_foreigner, facilities, accessibility_info, status, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Sayaji Baug Zoo & Planetarium',
      'ZOO',
      'Sayaji Baug Zoo is one of the oldest zoos in Western India, featuring over 45 species of mammals, birds, and reptiles including Asiatic Lions, Bengal Tigers, and Aviary enclosures. Also houses the Sardar Patel Planetarium within its lush 113-acre parkland.',
      'Historic 113-acre zoo and botanical garden in Vadodara.',
      'Sayaji Baug, Vinoba Bhave Road',
      'Vadodara',
      'Gujarat',
      'India',
      22.3120, 73.1840,
      'sayajizoo@gujarat.gov.in', '+91 265 279 1234', 'https://vadodaramunicipal.gov.in',
       me = '09:00', '18:00', 'Thursday',
      30.0, 15.0, 100.0,
      'Restrooms, Parking, Drinking Water, Toy Train, Planetarium',
      'Wheelchair accessible pathways throughout zoo grounds.',
      'ACTIVE',
      'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80'
    );
    museum2Id = info2.lastInsertRowid;

    // 3. Insert Museum 3: Calico Museum of Textiles
    const info3 = db.prepare(`
      INSERT INTO museums (
        name, type, description, short_description, address, city, state, country,
        latitude, longitude, contact_email, contact_phone, website, opening_time, closing_time,
        closed_days, entry_fee_adult, entry_fee_child, entry_fee_foreigner, facilities, accessibility_info, status, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Calico Museum of Textiles',
      'HERITAGE_SITE',
      'The Calico Museum of Textiles is India premier textile museum, celebrated worldwide for its premier collection of Indian court textiles, Patola silks, Mughal kalamkaris, and historical weaving looms.',
      'Premier Indian textile museum housed in wooden havelis.',
      'The Retreat, Shahibaug',
      'Ahmedabad',
      'Gujarat',
      'India',
      23.0560, 72.5890,
      'info@calicomuseum.org', '+91 79 2286 8172', 'https://calicomuseum.org',
      '10:15', '12:30', 'Wednesday',
      100.0, 50.0, 300.0,
      'Guided Tours, Library, Restrooms, Security Lockers',
      'Ground floor accessible. Prior booking mandatory for guided heritage walks.',
      'ACTIVE',
      'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=800&q=80'
    );
    museum3Id = info3.lastInsertRowid;

    // Seed Galleries, Exhibitions, Artifacts, Zoo Sections & Animals...
    db.prepare(`INSERT INTO galleries (museum_id, name, description, floor, display_order) VALUES (?, ?, ?, ?, ?)`).run(museum1Id, 'Archaeological & Bronze Gallery', 'Houses 5th to 12th Century bronzes including the Akota bronzes.', 'Ground Floor', 1);
    db.prepare(`INSERT INTO galleries (museum_id, name, description, floor, display_order) VALUES (?, ?, ?, ?, ?)`).run(museum1Id, 'European Picture Gallery', 'Masterpieces by Raphael, Titian, and Turner.', 'First Floor', 2);
    
    db.prepare(`INSERT INTO exhibitions (museum_id, title, description, start_date, end_date, is_featured, status) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(museum1Id, 'Royal Treasures of Gaekwads', 'Rare royal jewelry and miniature armor.', '2026-01-01', '2026-12-31', 1, 'ONGOING');

    db.prepare(`INSERT INTO artifacts (museum_id, name, description, historical_info, origin, time_period, category, material) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(museum1Id, 'Akota Rishabhanatha Bronze Statue', 'Metropolitan Jain bronze sculpture.', 'Discovered in Akota hoard in 1951.', 'Akota, Vadodara', '5th Century CE', 'Sculpture', 'Bronze Alloy');
    db.prepare(`INSERT INTO artifacts (museum_id, name, description, historical_info, origin, time_period, category, material) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(museum1Id, 'Egyptian Mummy', 'Preserved mummy of a young girl from Ptolemaic period.', 'Acquired by Maharaja Sayajirao Gaekwad III in Cairo in 1895.', 'Egypt', 'Ptolemaic Era (c. 300 BCE)', 'Antiquity', 'Linen Wrapped Mummy');

    db.prepare(`INSERT INTO zoo_sections (zoo_id, name, description, display_order) VALUES (?, ?, ?, ?)`).run(museum2Id, 'Big Cat Sanctuary', 'Dedicated enclosure for lions and tigers.', 1);
    db.prepare(`INSERT INTO animals (zoo_id, section_id, common_name, scientific_name, description, conservation_status, habitat, diet, interesting_facts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(museum2Id, 1, 'Asiatic Lion', 'Panthera leo persica', 'Endangered lion species native only to Gir Forest and Gujarat.', 'Endangered (IUCN)', 'Gir Forest & Scrubland', 'Carnivore', 'Only remaining wild population of Asiatic Lions in the world.');

    console.log('[Seed] Sample Government Museums, Zoos, Exhibitions & Artifacts seeded successfully! ✅');
  } else {
    museum1Id = 1; museum2Id = 2; museum3Id = 3;
  }

  // Seed Ticket Types
  const existingTickets = db.prepare('SELECT COUNT(*) as count FROM ticket_types').get();
  if (existingTickets.count === 0) {
    console.log('[Seed] Seeding default Ticket Types for museums...');

    // Baroda Museum Ticket Types
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum1Id, 'Adult General Entry', 'Standard entry ticket for adults (Ages 12+)', 50.0);
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum1Id, 'Child Entry Ticket', 'Discounted ticket for children (Ages 5-12)', 20.0);
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum1Id, 'Foreign Tourist Ticket', 'Entry ticket for international visitors', 200.0);
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum1Id, 'Student Group Ticket', 'Valid school/college ID required', 15.0);

    // Sayaji Zoo Ticket Types
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum2Id, 'Zoo Adult Ticket', 'General entry to zoo grounds & animal enclosures', 30.0);
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum2Id, 'Zoo Child Ticket', 'Child entry for zoo grounds (Ages 3-12)', 15.0);
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum2Id, 'Planetarium Special Show', 'Entry to Sardar Patel Planetarium 3D Show', 40.0);

    // Calico Museum Ticket Types
    db.prepare('INSERT INTO ticket_types (museum_id, name, description, price) VALUES (?, ?, ?, ?)').run(museum3Id, 'Guided Heritage Walk Ticket', 'Includes full guided tour of Calico textile havelis', 100.0);

    console.log('[Seed] Ticket Types seeded successfully! ✅');
  }
}

module.exports = seedDatabase;
