const express = require("express");
const router = express.Router();
const bookingConversationController = require("../controllers/bookingConversationController");
const bookingController = require("../controllers/bookingController");

// Conversation flow
router.post("/conversation", bookingConversationController.processMessage);
router.get("/session/:sessionId", bookingConversationController.getSession);

// Tables
router.get("/tables/:restaurantId", bookingController.getTablesByRestaurant);
router.get("/vouchers", bookingController.getBookingVouchers);

// Booking CRUD
router.post("/create", bookingController.createBooking);
router.put("/:bookingId/confirm", bookingController.confirmBooking);
router.post("/:bookingId/payment", bookingController.processPayment);
router.delete("/:bookingId/cancel", bookingController.cancelBooking); // ← mới
router.get("/user/:userId", bookingController.getUserBookings);
router.get("/:bookingId", bookingController.getBookingById);

module.exports = router;
