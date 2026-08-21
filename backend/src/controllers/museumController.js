const Museum = require('../models/Museum');

// @desc    Get all museums
// @route   GET /api/museums
// @access  Public
const getAllMuseums = async (req, res) => {
  try {
    // Fetch all museums from MongoDB
    const museums = await Museum.find();

    // Return success response with list of museums
    return res.status(200).json({
      success: true,
      museums: museums
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching museums',
      error: error.message
    });
  }
};

// @desc    Get single museum by ID
// @route   GET /api/museums/:id
// @access  Public
const getMuseumById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the museum by its MongoDB _id
    const museum = await Museum.findById(id);

    // If museum is not found in database
    if (!museum) {
      return res.status(404).json({
        success: false,
        message: 'Museum not found'
      });
    }

    // Return success response with single museum details
    return res.status(200).json({
      success: true,
      museum: museum
    });
  } catch (error) {
    // Handle invalid ObjectId format or server errors
    return res.status(404).json({
      success: false,
      message: 'Museum not found'
    });
  }
};

module.exports = {
  getAllMuseums,
  getMuseumById
};
