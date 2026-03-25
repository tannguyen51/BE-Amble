const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  toggleFavoriteRoute,
  getFavoriteRestaurants,
  toggleFavoriteRestaurant,
  getRewards,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

router.use(protect); // All user routes require auth

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);
router.post("/favorite/:routeId", toggleFavoriteRoute);
router.get("/favorite-restaurants", getFavoriteRestaurants);
router.post("/favorite-restaurant/:restaurantId", toggleFavoriteRestaurant);
router.get("/rewards", getRewards);

module.exports = router;
