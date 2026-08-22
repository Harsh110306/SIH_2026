const express = require('express');
const router = express.Router();
const { getAllMuseums, getMuseumById } = require('../controllers/museumController');

// GET /api/museums - Fetch all museums
router.get('/', getAllMuseums);

// GET /api/museums/:id - Fetch single museum by _id
router.get('/:id', getMuseumById);

module.exports = router;
