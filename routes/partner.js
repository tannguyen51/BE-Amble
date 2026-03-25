const express = require("express");
const router = express.Router();
const { protectPartner } = require("../middleware/partnerAuth");
const {
  getOverview,
  getOrders,
  getTables,
  getNotifications,
  createTable,
  updateTable,
  deleteTable,
  getRestaurantProfile,
  updateRestaurantProfile,
  updateSubscriptionPackage,
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  updateVoucherStatus,
} = require("../controllers/partnerDashboardController");

router.get("/dashboard/overview", protectPartner, getOverview);
router.get("/orders", protectPartner, getOrders);
router.get("/tables", protectPartner, getTables);
router.post("/tables", protectPartner, createTable);
router.put("/tables/:tableId", protectPartner, updateTable);
router.delete("/tables/:tableId", protectPartner, deleteTable);
router.get("/notifications", protectPartner, getNotifications);
router.get("/vouchers", protectPartner, getVouchers);
router.post("/vouchers", protectPartner, createVoucher);
router.put("/vouchers/:voucherId", protectPartner, updateVoucher);
router.delete("/vouchers/:voucherId", protectPartner, deleteVoucher);
router.patch(
  "/vouchers/:voucherId/status",
  protectPartner,
  updateVoucherStatus,
);
router.get("/restaurant-profile", protectPartner, getRestaurantProfile);
router.put("/restaurant-profile", protectPartner, updateRestaurantProfile);
router.put("/subscription-package", protectPartner, updateSubscriptionPackage);

module.exports = router;
