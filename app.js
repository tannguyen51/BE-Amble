require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const routeRoutes = require("./routes/routes");
const partnerAuthRoutes = require("./routes/partnerAuth");
const partnerRoutes = require("./routes/partner");
const restaurantRoutes = require("./routes/restaurants");
const bookingRoutes = require("./routes/booking");
const aiRoutes = require("./routes/ai");
const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Connect MongoDB ─────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/amble_db")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ── Routes ──────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/partner/auth", partnerAuthRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/ai", aiRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "🚶 Amble API is running!" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;
