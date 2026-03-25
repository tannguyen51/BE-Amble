const Booking = require("../models/booking");
const Table = require("../models/table");
const Restaurant = require("../models/restaurant");
const Voucher = require("../models/voucher");

// ── GET /api/booking/vouchers ────────────────────────────
exports.getBookingVouchers = async (req, res) => {
  try {
    const now = new Date();
    const { restaurantId } = req.query;

    const filter = {
      isActive: true,
      startAt: { $lte: now },
      endAt: { $gt: now },
    };

    if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    const vouchers = await Voucher.find(filter)
      .sort({ discountValue: -1, createdAt: -1 })
      .lean();

    const items = vouchers
      .filter((voucher) => {
        if (!voucher.usageLimit || voucher.usageLimit <= 0) return true;
        return (voucher.usedCount || 0) < voucher.usageLimit;
      })
      .map((voucher) => ({
        code: voucher.code,
        title: voucher.title,
        description: voucher.description || "",
        discount: voucher.discountValue,
        minBill: voucher.minBill || 0,
        maxDiscount: voucher.maxDiscount || 0,
        isPercent: voucher.discountType === "percent",
        startAt: voucher.startAt,
        endAt: voucher.endAt,
      }));

    return res.json({ success: true, vouchers: items });
  } catch (err) {
    console.error("[getBookingVouchers]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/tables/:restaurantId ─────────────────
exports.getTablesByRestaurant = async (req, res) => {
  try {
    const tables = await Table.find({
      restaurantId: req.params.restaurantId,
      isActive: true,
    }).lean();
    return res.json({ success: true, tables });
  } catch (err) {
    console.error("[getTablesByRestaurant]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── POST /api/booking/create ──────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const {
      userId,
      restaurantId,
      tableId,
      date,
      time,
      partySize,
      purpose,
      specialRequests,
      paymentMethod,
      voucherCode,
    } = req.body;

    if (!userId || !restaurantId || !tableId || !date || !time || !partySize) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res
        .status(404)
        .json({ success: false, message: "Nhà hàng không tồn tại" });

    const table = await Table.findById(tableId);
    if (!table)
      return res
        .status(404)
        .json({ success: false, message: "Bàn không tồn tại" });

    if (!table.isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Bàn này đã được đặt" });
    }

    if (partySize < table.capacity.min || partySize > table.capacity.max) {
      return res.status(400).json({
        success: false,
        message: `Bàn phù hợp cho ${table.capacity.min}–${table.capacity.max} người`,
      });
    }

    const depositAmount = table.pricing.baseDeposit;
    let discount = 0;
    let appliedVoucherData = undefined;

    if (voucherCode) {
      const now = new Date();
      const normalizedCode = String(voucherCode).trim().toUpperCase();

      const voucher = await Voucher.findOne({
        restaurantId,
        code: normalizedCode,
        isActive: true,
        startAt: { $lte: now },
        endAt: { $gt: now },
      });

      if (!voucher) {
        return res.status(400).json({
          success: false,
          message: "Voucher không hợp lệ hoặc đã hết hạn",
        });
      }

      if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
        return res.status(400).json({
          success: false,
          message: "Voucher đã hết lượt sử dụng",
        });
      }

      if (depositAmount < (voucher.minBill || 0)) {
        return res.status(400).json({
          success: false,
          message: "Hóa đơn chưa đủ điều kiện áp dụng voucher",
        });
      }

      discount =
        voucher.discountType === "percent"
          ? (depositAmount * voucher.discountValue) / 100
          : voucher.discountValue;

      if (voucher.discountType === "percent" && voucher.maxDiscount > 0) {
        discount = Math.min(discount, voucher.maxDiscount);
      }

      discount = Math.min(depositAmount, Math.round(discount));
      appliedVoucherData = {
        code: voucher.code,
        discountValue: discount,
      };
    }

    const totalAmount = Math.max(0, depositAmount - discount);

    // ── Generate bookingNumber tại đây để tránh lỗi validation ──
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${dateStr}-${random}`;

    const booking = await Booking.create({
      bookingNumber,
      userId,
      restaurantId,
      tableId,
      bookingDetails: {
        date,
        time,
        partySize,
        purpose: purpose || "casual",
        specialRequests: specialRequests || "",
      },
      pricing: {
        depositAmount,
        voucherDiscount: discount,
        totalAmount,
        appliedVoucher: appliedVoucherData,
      },
      payment: paymentMethod ? { method: paymentMethod } : undefined,
      status: "pending",
    });

    // Cập nhật trạng thái bàn → đã đặt
    await Table.findByIdAndUpdate(tableId, {
      isAvailable: false,
      currentBookingId: booking._id,
    });

    if (appliedVoucherData) {
      await Voucher.findOneAndUpdate(
        {
          restaurantId,
          code: appliedVoucherData.code,
        },
        { $inc: { usedCount: 1 } },
      );
    }

    return res.json({
      success: true,
      booking,
      message: "Yeu cau dat ban da duoc gui cho nha hang",
    });
  } catch (err) {
    console.error("[createBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── PUT /api/booking/:bookingId/confirm ───────────────────
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    await booking.save();

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("[confirmBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── POST /api/booking/:bookingId/payment ──────────────────
exports.processPayment = async (req, res) => {
  try {
    const { method } = req.body;
    const VALID = ["momo", "zalopay", "bank", "credit"];
    if (!method || !VALID.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ",
      });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });
    if (booking.status === "paid")
      return res
        .status(400)
        .json({ success: false, message: "Booking đã được thanh toán" });

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    booking.status = "paid";
    booking.payment = { transactionId, method, paidAt: new Date() };
    await booking.save();

    return res.json({ success: true, booking, transactionId });
  } catch (err) {
    console.error("[processPayment]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/user/:userId ─────────────────────────
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate("restaurantId", "name images city address")
      .populate("tableId", "name type images")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("[getUserBookings]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── GET /api/booking/:bookingId ───────────────────────────
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("restaurantId")
      .populate("tableId")
      .populate("userId", "fullName email phone")
      .lean();

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("[getBookingById]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── DELETE /api/booking/:bookingId/cancel ─────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking không tồn tại" });

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy booking ở trạng thái: ${booking.status}`,
      });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Người dùng hủy";
    await booking.save();

    // Giải phóng bàn → trống lại
    await Table.findByIdAndUpdate(booking.tableId, {
      isAvailable: true,
      currentBookingId: null,
    });

    return res.json({
      success: true,
      booking,
      message: "Hủy booking thành công",
    });
  } catch (err) {
    console.error("[cancelBooking]", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
