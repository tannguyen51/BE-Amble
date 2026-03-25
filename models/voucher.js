const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      index: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "amount"],
      default: "amount",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    minBill: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

voucherSchema.index({ restaurantId: 1, code: 1 }, { unique: true });
voucherSchema.index({ restaurantId: 1, isActive: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
