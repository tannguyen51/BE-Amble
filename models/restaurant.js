const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    cuisine: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    description: { type: String, default: "" },
    introduction: { type: String, default: "" },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "22:00" },
    openDays: {
      type: [String],
      default: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
    priceMin: { type: Number, default: 0 },
    priceMax: { type: Number, default: 0 },
    priceRange: { type: String, default: "$" },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    hasParking: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    subscriptionPackage: {
      type: String,
      enum: ["basic", "pro", "premium"],
      default: "basic",
    },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    website: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
