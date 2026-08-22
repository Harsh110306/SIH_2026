const mongoose = require('mongoose');

// Define the Exhibition Schema
const exhibitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exhibition title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    museumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Museum',
      required: [true, 'Museum reference is required']
    },
    image: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'ended'],
      default: 'active',
      trim: true
    }
  },
  {
    timestamps: true // Automatically manages createdAt and updatedAt timestamps
  }
);

// Create and export the Exhibition model
const Exhibition = mongoose.model('Exhibition', exhibitionSchema);

module.exports = Exhibition;
