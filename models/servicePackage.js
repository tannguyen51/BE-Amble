const mongoose = require("mongoose");

const servicePackageFeatureSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    included: {
      type: Boolean,
      required: true,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const servicePackageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["basic", "pro", "premium"],
      lowercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    badge: {
      type: String,
      default: "",
      trim: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    tone: {
      type: String,
      default: "#F9FAFB",
      trim: true,
    },
    border: {
      type: String,
      default: "#E5E7EB",
      trim: true,
    },
    accent: {
      type: String,
      default: "#6B7280",
      trim: true,
    },
    iconBg: {
      type: String,
      default: "#F3F4F6",
      trim: true,
    },
    features: {
      type: [servicePackageFeatureSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ServicePackage", servicePackageSchema);
