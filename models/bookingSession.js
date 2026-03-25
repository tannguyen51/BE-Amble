const mongoose = require('mongoose');

const bookingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    context: {
      purpose: {
        type: String,
        enum: ['date', 'family', 'business', 'celebration', 'casual'],
      },
      date: String,
      time: String,
      partySize: Number,
      location: String,
      budget: String,
      style: String,
      tableType: {
        type: String,
        enum: ['vip', 'view', 'regular'],
      },
    },
    currentStep: {
      type: String,
      enum: ['purpose', 'date', 'time', 'partySize', 'location', 'budget', 'tableType', 'complete'],
      default: 'purpose',
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  },
  { timestamps: true }
);

// Auto-delete expired sessions
bookingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BookingSession', bookingSessionSchema);
