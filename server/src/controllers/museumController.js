const MuseumModel = require('../models/museumModel');
const { AppError } = require('../middleware/errorHandler');

// --- PUBLIC READ ENDPOINTS ---

async function getAllMuseums(req, res) {
  const { search, type, city, status = 'ACTIVE', page = 1, limit = 20 } = req.query;
  const result = MuseumModel.getAllMuseums({ search, type, city, status, page: parseInt(page), limit: parseInt(limit) });
  res.status(200).json({ success: true, ...result });
}

async function getMuseumById(req, res, next) {
  const { id } = req.params;
  const museum = MuseumModel.getMuseumById(id);
  if (!museum) {
    return next(new AppError(`Museum or Zoo with ID ${id} not found.`, 404, 'MUSEUM_NOT_FOUND'));
  }
  res.status(200).json({ success: true, museum });
}

async function getMuseumGalleries(req, res) {
  const { id } = req.params;
  const galleries = MuseumModel.getGalleriesByMuseum(id);
  res.status(200).json({ success: true, galleries });
}

async function getMuseumExhibitions(req, res) {
  const { id } = req.params;
  const result = MuseumModel.getExhibitions({ museumId: id, page: req.query.page, limit: req.query.limit });
  res.status(200).json({ success: true, ...result });
}

async function getMuseumArtifacts(req, res) {
  const { id } = req.params;
  const { search, galleryId, exhibitionId, page = 1, limit = 20 } = req.query;
  const result = MuseumModel.getArtifacts({ museumId: id, galleryId, exhibitionId, search, page: parseInt(page), limit: parseInt(limit) });
  res.status(200).json({ success: true, ...result });
}

async function getMuseumAnimals(req, res) {
  const { id } = req.params;
  const { search, sectionId, page = 1, limit = 20 } = req.query;
  const result = MuseumModel.getAnimals({ zooId: id, sectionId, search, page: parseInt(page), limit: parseInt(limit) });
  res.status(200).json({ success: true, ...result });
}

async function getExhibitionById(req, res, next) {
  const { id } = req.params;
  const exhibition = MuseumModel.getExhibitionById(id);
  if (!exhibition) {
    return next(new AppError(`Exhibition with ID ${id} not found.`, 404, 'EXHIBITION_NOT_FOUND'));
  }
  res.status(200).json({ success: true, exhibition });
}

async function getArtifactById(req, res, next) {
  const { id } = req.params;
  const artifact = MuseumModel.getArtifactById(id);
  if (!artifact) {
    return next(new AppError(`Artifact with ID ${id} not found.`, 404, 'ARTIFACT_NOT_FOUND'));
  }
  res.status(200).json({ success: true, artifact });
}

async function getAnimalById(req, res, next) {
  const { id } = req.params;
  const animal = MuseumModel.getAnimalById(id);
  if (!animal) {
    return next(new AppError(`Animal record with ID ${id} not found.`, 404, 'ANIMAL_NOT_FOUND'));
  }
  res.status(200).json({ success: true, animal });
}

async function globalSearch(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(200).json({ success: true, results: { museums: [], exhibitions: [], artifacts: [], animals: [] } });
  }
  const results = MuseumModel.globalSearch(q.trim());
  res.status(200).json({ success: true, results });
}

// --- ADMIN MANAGEMENT CRUD ENDPOINTS ---

async function createMuseum(req, res, next) {
  const { name, description, address, city } = req.body;
  if (!name || !description || !address || !city) {
    return next(new AppError('Museum name, description, address, and city are required.', 400, 'MISSING_FIELDS'));
  }
  const museum = MuseumModel.createMuseum(req.body);
  res.status(201).json({ success: true, message: 'Museum created successfully.', museum });
}

async function updateMuseum(req, res, next) {
  const { id } = req.params;
  const museum = MuseumModel.updateMuseum(id, req.body);
  if (!museum) {
    return next(new AppError(`Museum with ID ${id} not found.`, 404, 'MUSEUM_NOT_FOUND'));
  }
  res.status(200).json({ success: true, message: 'Museum updated successfully.', museum });
}

async function softDeleteMuseum(req, res, next) {
  const { id } = req.params;
  MuseumModel.softDeleteMuseum(id);
  res.status(200).json({ success: true, message: `Museum ID ${id} status set to INACTIVE.` });
}

async function createGallery(req, res, next) {
  const { museum_id, name } = req.body;
  if (!museum_id || !name) {
    return next(new AppError('Museum ID and Gallery name are required.', 400, 'MISSING_FIELDS'));
  }
  const gallery = MuseumModel.createGallery(req.body);
  res.status(201).json({ success: true, message: 'Gallery created successfully.', gallery });
}

async function createExhibition(req, res, next) {
  const { museum_id, title, description, start_date, end_date } = req.body;
  if (!museum_id || !title || !description || !start_date || !end_date) {
    return next(new AppError('Museum ID, title, description, start_date, and end_date are required.', 400, 'MISSING_FIELDS'));
  }
  const exhibition = MuseumModel.createExhibition(req.body);
  res.status(201).json({ success: true, message: 'Exhibition created successfully.', exhibition });
}

async function createArtifact(req, res, next) {
  const { museum_id, name, description } = req.body;
  if (!museum_id || !name || !description) {
    return next(new AppError('Museum ID, artifact name, and description are required.', 400, 'MISSING_FIELDS'));
  }
  const artifact = MuseumModel.createArtifact(req.body);
  res.status(201).json({ success: true, message: 'Artifact created successfully.', artifact });
}

async function createAnimal(req, res, next) {
  const { zoo_id, common_name, description } = req.body;
  if (!zoo_id || !common_name || !description) {
    return next(new AppError('Zoo ID, common name, and description are required.', 400, 'MISSING_FIELDS'));
  }
  const animal = MuseumModel.createAnimal(req.body);
  res.status(201).json({ success: true, message: 'Animal record created successfully.', animal });
}

module.exports = {
  getAllMuseums,
  getMuseumById,
  getMuseumGalleries,
  getMuseumExhibitions,
  getMuseumArtifacts,
  getMuseumAnimals,
  getExhibitionById,
  getArtifactById,
  getAnimalById,
  globalSearch,
  createMuseum,
  updateMuseum,
  softDeleteMuseum,
  createGallery,
  createExhibition,
  createArtifact,
  createAnimal
};
