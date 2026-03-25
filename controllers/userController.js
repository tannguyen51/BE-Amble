const User = require("../models/user");

const TIERS = [
  { id: "bronze", label: "Bronze", min: 0, max: 9999, bonus: 0 },
  { id: "silver", label: "Silver", min: 10000, max: 24999, bonus: 5 },
  { id: "gold", label: "Gold", min: 25000, max: 49999, bonus: 10 },
  {
    id: "platinum",
    label: "Platinum",
    min: 50000,
    max: Number.MAX_SAFE_INTEGER,
    bonus: 15,
  },
];

function getCurrentTier(points) {
  return (
    TIERS.find((tier) => points >= tier.min && points <= tier.max) || TIERS[0]
  );
}

function getNextTier(points) {
  return TIERS.find((tier) => tier.min > points) || null;
}

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("favoriteRoutes")
      .populate("favoriteRestaurants");
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, bio, location, avatar } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, bio, location, avatar },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Toggle favorite route
exports.toggleFavoriteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const user = await User.findById(req.user._id);

    const isFav = user.favoriteRoutes.includes(routeId);
    if (isFav) {
      user.favoriteRoutes = user.favoriteRoutes.filter(
        (id) => id.toString() !== routeId,
      );
    } else {
      user.favoriteRoutes.push(routeId);
    }

    await user.save();
    await user.populate("favoriteRoutes");

    return res.status(200).json({
      success: true,
      message: isFav ? "Removed from favorites" : "Added to favorites",
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Get favorite restaurants
exports.getFavoriteRestaurants = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "favoriteRestaurants",
    );
    return res.status(200).json({
      success: true,
      favorites: user?.favoriteRestaurants || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Toggle favorite restaurant
exports.toggleFavoriteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const user = await User.findById(req.user._id);

    const isFav = user.favoriteRestaurants.some(
      (id) => id.toString() === restaurantId,
    );

    if (isFav) {
      user.favoriteRestaurants = user.favoriteRestaurants.filter(
        (id) => id.toString() !== restaurantId,
      );
    } else {
      user.favoriteRestaurants.push(restaurantId);
    }

    await user.save();
    await user.populate("favoriteRestaurants");

    return res.status(200).json({
      success: true,
      message: isFav ? "Removed from favorites" : "Added to favorites",
      favorites: user.favoriteRestaurants,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Get reward points summary
exports.getRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "rewardPoints rewardHistory",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const points = Math.max(0, Number(user.rewardPoints || 0));
    const currentTier = getCurrentTier(points);
    const nextTier = getNextTier(points);
    const needed = nextTier ? Math.max(0, nextTier.min - points) : 0;
    const progressMax = nextTier ? nextTier.min : currentTier.max;
    const progress =
      progressMax > 0 ? Math.min(100, (points / progressMax) * 100) : 0;

    return res.status(200).json({
      success: true,
      points,
      currentTier,
      nextTier,
      neededToNextTier: needed,
      progress,
      tiers: TIERS,
      history: (user.rewardHistory || []).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
