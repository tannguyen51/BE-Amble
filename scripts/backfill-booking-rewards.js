require("dotenv").config();
const mongoose = require("mongoose");
const Booking = require("../models/booking");
const User = require("../models/user");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/amble_db";

const REWARD_POINT_DIVISOR = 1000;

function calculateRewardPoints(amount) {
  const safeAmount = Number(amount || 0);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return 0;
  return Math.floor(safeAmount / REWARD_POINT_DIVISOR);
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  const eligibleBookings = await Booking.find({
    status: { $in: ["pending", "confirmed", "paid", "completed"] },
    $or: [{ rewardProcessedAt: { $exists: false } }, { rewardProcessedAt: null }],
  }).select("_id userId bookingNumber pricing.totalAmount rewardProcessedAt");

  let processed = 0;
  let skipped = 0;

  for (const booking of eligibleBookings) {
    const points = calculateRewardPoints(booking?.pricing?.totalAmount);

    const marked = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        $or: [{ rewardProcessedAt: { $exists: false } }, { rewardProcessedAt: null }],
      },
      {
        $set: {
          rewardProcessedAt: new Date(),
          rewardPointsAwarded: points,
        },
      },
      { new: true },
    );

    if (!marked) {
      skipped += 1;
      continue;
    }

    if (points > 0) {
      await User.findByIdAndUpdate(booking.userId, {
        $inc: { rewardPoints: points },
        $push: {
          rewardHistory: {
            title: `Tich diem tu booking ${booking.bookingNumber}`,
            points,
            type: "earn",
            createdAt: new Date(),
          },
        },
      });
    }

    processed += 1;
  }

  console.log(`Processed bookings: ${processed}`);
  console.log(`Skipped bookings: ${skipped}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Backfill booking rewards failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
