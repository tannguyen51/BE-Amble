const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['vip', 'view', 'regular', 'standard'],
      default: 'regular',
    },
    capacity: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    pricing: {
      baseDeposit: { type: Number, required: true, default: 100000 },
    },
    images: [{ type: String }],
    features: [{ type: String }],
    description: { type: String, default: '' },

    // isActive = bàn tồn tại và không bị ẩn bởi partner
    isActive: { type: Boolean, default: true },

    // isAvailable = bàn đang trống (không có booking confirmed/paid)
    // Được cập nhật tự động khi tạo/hủy booking
    isAvailable: { type: Boolean, default: true },

    // Booking hiện tại đang giữ bàn (nếu có)
    currentBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);