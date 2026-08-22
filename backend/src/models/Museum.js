const mongoose = require('mongoose');

// Define the Museum Schema
const museumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Museum name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Museum location is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    openingTime: {
      type: String,
      required: [true, 'Opening time is required'],
      trim: true
    },
    closingTime: {
      type: String,
      required: [true, 'Closing time is required'],
      trim: true
    }
  },
  {
    timestamps: true // Automatically manages createdAt and updatedAt timestamps
  }
);

// Create and export the Museum model
const Museum = mongoose.model('Museum', museumSchema);

module.exports = Museum;
