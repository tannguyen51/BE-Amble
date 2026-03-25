require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Amble";

async function run() {
  await mongoose.connect(MONGODB_URI);

  const users = await User.find({ role: "customer" }).select(
    "_id fullName email rewardPoints rewardHistory",
  );
  if (!users.length) {
    console.log("No customer users found.");
    await mongoose.disconnect();
    return;
  }

  let updated = 0;

  for (const user of users) {
    user.rewardPoints = 6000;

    const hasSeedEntry = (user.rewardHistory || []).some(
      (h) => h.title === "Khởi tạo điểm thưởng" && h.points === 6000,
    );

    if (!hasSeedEntry) {
      user.rewardHistory = [
        {
          title: "Khởi tạo điểm thưởng",
          points: 6000,
          type: "earn",
          createdAt: new Date(),
        },
        ...(user.rewardHistory || []),
      ];
    }

    await user.save();
    updated += 1;
    console.log(`Updated ${user.email} -> 6000 points`);
  }

  console.log(`Done. Updated ${updated} users.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
