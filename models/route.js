const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      required: true,
    },
    distance: {
      type: Number, // in km
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'hard'],
      default: 'easy',
    },
    image: {
      type: String,
      default: '',
    },
    tags: [String],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Route', routeSchema);