const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    bookingDetails: {
      date: { type: String, required: true },
      time: { type: String, required: true },
      partySize: { type: Number, required: true },
      purpose: { type: String, default: "casual" },
      specialRequests: { type: String, default: "" },
    },
    pricing: {
      depositAmount: { type: Number, required: true },
      voucherDiscount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      appliedVoucher: {
        code: String,
        discountValue: Number,
      },
    },
    status: {
      type: String,
      enum: ["draft", "pending", "confirmed", "paid", "completed", "cancelled"],
      default: "draft",
    },
    payment: {
      transactionId: String,
      method: {
        type: String,
        enum: ["momo", "bank", "credit", "apple"],
      },
      paidAt: Date,
    },
    conversationSessionId: String,
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true },
);

// Generate booking number
bookingSchema.pre("save", async function (next) {
  if (!this.bookingNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.bookingNumber = `BK-${dateStr}-${random}`;
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
