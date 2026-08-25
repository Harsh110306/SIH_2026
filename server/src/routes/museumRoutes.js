const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/museumController');

// Public Read Endpoints
router.get('/museums', getAllMuseums);
router.get('/museums/:id', getMuseumById);
router.get('/museums/:id/galleries', getMuseumGalleries);
router.get('/museums/:id/exhibitions', getMuseumExhibitions);
router.get('/museums/:id/artifacts', getMuseumArtifacts);
router.get('/museums/:id/animals', getMuseumAnimals);

router.get('/exhibitions/:id', getExhibitionById);
router.get('/artifacts/:id', getArtifactById);
router.get('/animals/:id', getAnimalById);

router.get('/search', globalSearch);

// Admin Restricted CRUD Operations
router.post('/museums', requireAuth, requireRole('ADMIN'), createMuseum);
router.put('/museums/:id', requireAuth, requireRole('ADMIN'), updateMuseum);
router.patch('/museums/:id/status', requireAuth, requireRole('ADMIN'), softDeleteMuseum);

router.post('/galleries', requireAuth, requireRole('ADMIN'), createGallery);
router.post('/exhibitions', requireAuth, requireRole('ADMIN'), createExhibition);
router.post('/artifacts', requireAuth, requireRole('ADMIN'), createArtifact);
router.post('/animals', requireAuth, requireRole('ADMIN'), createAnimal);

module.exports = router;
