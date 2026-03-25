const Booking = require("../models/booking");
const Table = require("../models/table");
const Restaurant = require("../models/restaurant");
const Partner = require("../models/partner");
const ServicePackage = require("../models/servicePackage");
const Voucher = require("../models/voucher");

const VALID_TABLE_TYPES = ["vip", "view", "regular", "standard"];
const VALID_OPEN_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const normalizeImageList = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((url) => String(url || "").trim())
    .filter((url) => url.length > 0);
};

const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
};

// PUT /api/partner/subscription-package
exports.updateSubscriptionPackage = async (req, res) => {
  try {
    const partnerId = req.partner?._id;
    const restaurantId = req.partner?.restaurantId;
    const nextPackage = String(
      req.body?.subscriptionPackage || "",
    ).toLowerCase();

    if (!nextPackage) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn gói dịch vụ.",
      });
    }

    const packageExists = await ServicePackage.exists({
      key: nextPackage,
      isActive: true,
    });

    if (!packageExists) {
      return res.status(400).json({
        success: false,
        message: "Gói dịch vụ không hợp lệ.",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đối tác." });
    }

    if (partner.subscriptionPackage === nextPackage) {
      const restaurant = restaurantId
        ? await Restaurant.findById(restaurantId)
        : null;

      return res.status(200).json({
        success: true,
        message: "Gói hiện tại đã được áp dụng.",
        partner,
        restaurant,
      });
    }

    partner.subscriptionPackage = nextPackage;
    if (partner.subscriptionStatus !== "active") {
      partner.subscriptionStatus = "active";
    }
    await partner.save();

    let restaurant = null;
    if (restaurantId) {
      restaurant = await Restaurant.findByIdAndUpdate(
        restaurantId,
        { subscriptionPackage: nextPackage },
        { new: true },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật gói dịch vụ thành công.",
      partner,
      restaurant,
    });
  } catch (err) {
    console.error("[updateSubscriptionPackage]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/dashboard/overview
exports.getOverview = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const [
      totalTables,
      availableTables,
      bookedTables,
      pendingOrders,
      todayBookings,
      pendingBookings,
    ] = await Promise.all([
      Table.countDocuments({ restaurantId, isActive: true }),
      Table.countDocuments({ restaurantId, isActive: true, isAvailable: true }),
      Table.countDocuments({
        restaurantId,
        isActive: true,
        isAvailable: false,
      }),
      Booking.countDocuments({ restaurantId, status: "pending" }),
      Booking.countDocuments({
        restaurantId,
        "bookingDetails.date": today,
        status: { $in: ["pending", "confirmed", "paid", "completed"] },
      }),
      Booking.find({ restaurantId, status: "pending" })
        .populate("userId", "fullName phone")
        .populate("tableId", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const pendingBookingItems = pendingBookings.map((booking) => ({
      id: booking._id,
      userName: booking.userId?.fullName || "Khach hang",
      userPhone: booking.userId?.phone || "",
      tableNumber: booking.tableId?.name || "Ban",
      date: booking.bookingDetails?.date || "",
      time: booking.bookingDetails?.time || "",
      guests: booking.bookingDetails?.partySize || 0,
      depositAmount: booking.pricing?.depositAmount || 0,
      status: booking.status,
    }));

    return res.json({
      success: true,
      overview: {
        totalTables,
        availableTables,
        bookedTables,
        pendingOrders,
        todayBookings,
      },
      pendingBookings: pendingBookingItems,
    });
  } catch (err) {
    console.error("[getOverview]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/vouchers
exports.getVouchers = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const vouchers = await Voucher.find({ restaurantId })
      .sort({ createdAt: -1 })
      .lean();

    const now = Date.now();
    const items = vouchers.map((voucher) => {
      const isExpired = new Date(voucher.endAt).getTime() < now;
      const hasUsageLimit = Number(voucher.usageLimit) > 0;
      const remainingUses = hasUsageLimit
        ? Math.max(
            0,
            Number(voucher.usageLimit) - Number(voucher.usedCount || 0),
          )
        : null;

      return {
        id: voucher._id,
        code: voucher.code,
        title: voucher.title,
        description: voucher.description || "",
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minBill: voucher.minBill || 0,
        maxDiscount: voucher.maxDiscount || 0,
        usageLimit: voucher.usageLimit || 0,
        usedCount: voucher.usedCount || 0,
        remainingUses,
        startAt: voucher.startAt,
        endAt: voucher.endAt,
        isActive: !!voucher.isActive,
        isExpired,
      };
    });

    return res.json({ success: true, vouchers: items });
  } catch (err) {
    console.error("[getVouchers]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// POST /api/partner/vouchers
exports.createVoucher = async (req, res) => {
  try {
    const partnerId = req.partner._id;
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const {
      code,
      title,
      description,
      discountType = "amount",
      discountValue,
      minBill = 0,
      maxDiscount = 0,
      usageLimit = 0,
      startAt,
      endAt,
      expiresInDays = 30,
    } = req.body || {};

    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase();
    const normalizedTitle = String(title || "").trim();
    const normalizedDescription = String(description || "").trim();
    const normalizedType = String(discountType || "").toLowerCase();

    const discountNum = toPositiveNumber(discountValue);
    const minBillNum = toPositiveNumber(minBill);
    const maxDiscountNum = toPositiveNumber(maxDiscount);
    const usageLimitNum = toPositiveNumber(usageLimit);
    const expiresInDaysNum = toPositiveNumber(expiresInDays);

    if (!normalizedCode) {
      return res
        .status(400)
        .json({ success: false, message: "Mã voucher là bắt buộc." });
    }

    if (!/^[A-Z0-9_-]{4,20}$/.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Mã voucher chỉ gồm chữ in hoa, số, _ hoặc -, dài 4-20 ký tự.",
      });
    }

    if (!normalizedTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Tên voucher là bắt buộc." });
    }

    if (!["percent", "amount"].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Loại giảm giá không hợp lệ.",
      });
    }

    if (!Number.isFinite(discountNum) || discountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Giá trị giảm giá phải lớn hơn 0.",
      });
    }

    if (normalizedType === "percent" && discountNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Voucher theo % không được vượt quá 100.",
      });
    }

    if (!Number.isFinite(minBillNum) || minBillNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Giá trị hóa đơn tối thiểu không hợp lệ.",
      });
    }

    if (!Number.isFinite(maxDiscountNum) || maxDiscountNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Giảm tối đa không hợp lệ.",
      });
    }

    if (!Number.isFinite(usageLimitNum) || usageLimitNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượt sử dụng không hợp lệ.",
      });
    }

    const startDate = startAt ? new Date(startAt) : new Date();
    let endDate = endAt ? new Date(endAt) : null;

    if (!endDate || Number.isNaN(endDate.getTime())) {
      const safeExpires =
        Number.isFinite(expiresInDaysNum) && expiresInDaysNum > 0
          ? Math.floor(expiresInDaysNum)
          : 30;
      endDate = new Date(
        startDate.getTime() + safeExpires * 24 * 60 * 60 * 1000,
      );
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu/kết thúc không hợp lệ.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu.",
      });
    }

    const existing = await Voucher.findOne({
      restaurantId,
      code: normalizedCode,
    })
      .select("_id")
      .lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Mã voucher đã tồn tại trong nhà hàng của bạn.",
      });
    }

    const voucher = await Voucher.create({
      partnerId,
      restaurantId,
      code: normalizedCode,
      title: normalizedTitle,
      description: normalizedDescription,
      discountType: normalizedType,
      discountValue: discountNum,
      minBill: minBillNum,
      maxDiscount: normalizedType === "percent" ? maxDiscountNum : 0,
      usageLimit: Math.floor(usageLimitNum),
      usedCount: 0,
      startAt: startDate,
      endAt: endDate,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo voucher thành công.",
      voucher,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mã voucher đã tồn tại.",
      });
    }
    console.error("[createVoucher]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// PUT /api/partner/vouchers/:voucherId
exports.updateVoucher = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { voucherId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const voucher = await Voucher.findOne({
      _id: voucherId,
      restaurantId,
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher.",
      });
    }

    const {
      code,
      title,
      description,
      discountType = "amount",
      discountValue,
      minBill = 0,
      maxDiscount = 0,
      usageLimit = 0,
      startAt,
      endAt,
    } = req.body || {};

    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase();
    const normalizedTitle = String(title || "").trim();
    const normalizedDescription = String(description || "").trim();
    const normalizedType = String(discountType || "").toLowerCase();

    const discountNum = toPositiveNumber(discountValue);
    const minBillNum = toPositiveNumber(minBill);
    const maxDiscountNum = toPositiveNumber(maxDiscount);
    const usageLimitNum = toPositiveNumber(usageLimit);

    if (!normalizedCode) {
      return res
        .status(400)
        .json({ success: false, message: "Mã voucher là bắt buộc." });
    }

    if (!/^[A-Z0-9_-]{4,20}$/.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Mã voucher chỉ gồm chữ in hoa, số, _ hoặc -, dài 4-20 ký tự.",
      });
    }

    if (!normalizedTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Tên voucher là bắt buộc." });
    }

    if (!["percent", "amount"].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Loại giảm giá không hợp lệ.",
      });
    }

    if (!Number.isFinite(discountNum) || discountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Giá trị giảm giá phải lớn hơn 0.",
      });
    }

    if (normalizedType === "percent" && discountNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Voucher theo % không được vượt quá 100.",
      });
    }

    if (!Number.isFinite(minBillNum) || minBillNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Giá trị hóa đơn tối thiểu không hợp lệ.",
      });
    }

    if (!Number.isFinite(maxDiscountNum) || maxDiscountNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Giảm tối đa không hợp lệ.",
      });
    }

    if (!Number.isFinite(usageLimitNum) || usageLimitNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượt sử dụng không hợp lệ.",
      });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu/kết thúc không hợp lệ.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu.",
      });
    }

    const existing = await Voucher.findOne({
      restaurantId,
      code: normalizedCode,
      _id: { $ne: voucherId },
    })
      .select("_id")
      .lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Mã voucher đã tồn tại trong nhà hàng của bạn.",
      });
    }

    voucher.code = normalizedCode;
    voucher.title = normalizedTitle;
    voucher.description = normalizedDescription;
    voucher.discountType = normalizedType;
    voucher.discountValue = discountNum;
    voucher.minBill = minBillNum;
    voucher.maxDiscount = normalizedType === "percent" ? maxDiscountNum : 0;
    voucher.usageLimit = Math.floor(usageLimitNum);
    voucher.startAt = startDate;
    voucher.endAt = endDate;

    if (voucher.usedCount > voucher.usageLimit && voucher.usageLimit > 0) {
      voucher.usageLimit = voucher.usedCount;
    }

    await voucher.save();

    return res.json({
      success: true,
      message: "Cập nhật voucher thành công.",
      voucher,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mã voucher đã tồn tại.",
      });
    }
    console.error("[updateVoucher]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// DELETE /api/partner/vouchers/:voucherId
exports.deleteVoucher = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { voucherId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const deleted = await Voucher.findOneAndDelete({
      _id: voucherId,
      restaurantId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher.",
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa voucher.",
    });
  } catch (err) {
    console.error("[deleteVoucher]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// PATCH /api/partner/vouchers/:voucherId/status
exports.updateVoucherStatus = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { voucherId } = req.params;
    const nextActive = !!req.body?.isActive;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const voucher = await Voucher.findOne({
      _id: voucherId,
      restaurantId,
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher.",
      });
    }

    voucher.isActive = nextActive;
    await voucher.save();

    return res.json({
      success: true,
      message: nextActive ? "Đã bật voucher." : "Đã tắt voucher.",
      voucher,
    });
  } catch (err) {
    console.error("[updateVoucherStatus]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/orders
exports.getOrders = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { status } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const filter = { restaurantId };
    if (status && status !== "all") {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("userId", "fullName phone")
      .populate("tableId", "name type")
      .sort({ createdAt: -1 })
      .lean();

    const allBookings = await Booking.find({ restaurantId })
      .select("status")
      .lean();

    const orders = bookings.map((booking) => ({
      id: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      userName: booking.userId?.fullName || "Khach hang",
      userPhone: booking.userId?.phone || "",
      tableNumber: booking.tableId?.name || "Ban",
      tableType: booking.tableId?.type || "regular",
      date: booking.bookingDetails?.date || "",
      time: booking.bookingDetails?.time || "",
      guests: booking.bookingDetails?.partySize || 0,
      depositAmount: booking.pricing?.depositAmount || 0,
      totalAmount: booking.pricing?.totalAmount || 0,
      bookedAt: booking.createdAt,
    }));

    const counts = {
      all: allBookings.length,
      pending: allBookings.filter((b) => b.status === "pending").length,
      confirmed: allBookings.filter((b) => b.status === "confirmed").length,
      cancelled: allBookings.filter((b) => b.status === "cancelled").length,
    };

    return res.json({ success: true, orders, counts });
  } catch (err) {
    console.error("[getOrders]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/tables
exports.getTables = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const tables = await Table.find({ restaurantId, isActive: true })
      .populate({
        path: "currentBookingId",
        populate: {
          path: "userId",
          select: "fullName phone",
        },
      })
      .sort({ name: 1 })
      .lean();

    const tableItems = tables.map((table) => {
      const currentBooking = table.currentBookingId;
      return {
        id: table._id,
        name: table.name,
        type: table.type,
        capacity: table.capacity,
        pricing: table.pricing,
        images: table.images || [],
        features: table.features || [],
        description: table.description || "",
        isAvailable: table.isAvailable,
        status: table.isAvailable ? "available" : "booked",
        currentBooking: currentBooking
          ? {
              id: currentBooking._id,
              status: currentBooking.status,
              date: currentBooking.bookingDetails?.date || "",
              time: currentBooking.bookingDetails?.time || "",
              guests: currentBooking.bookingDetails?.partySize || 0,
              customerName: currentBooking.userId?.fullName || "Khach hang",
              customerPhone: currentBooking.userId?.phone || "",
            }
          : null,
      };
    });

    return res.json({ success: true, tables: tableItems });
  } catch (err) {
    console.error("[getTables]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/notifications
exports.getNotifications = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const [pendingCount, recentBookings] = await Promise.all([
      Booking.countDocuments({ restaurantId, status: "pending" }),
      Booking.find({ restaurantId })
        .populate("userId", "fullName phone")
        .populate("tableId", "name")
        .sort({ updatedAt: -1 })
        .limit(15)
        .lean(),
    ]);

    const notifications = recentBookings.map((booking) => {
      const customerName = booking.userId?.fullName || "Khach hang";
      const tableName = booking.tableId?.name || "Ban";
      const date = booking.bookingDetails?.date || "";
      const time = booking.bookingDetails?.time || "";

      if (booking.status === "pending") {
        return {
          id: booking._id,
          icon: "notifications-outline",
          title: "Có đơn đặt bàn mới",
          subtitle: `${customerName} vừa đặt ${tableName} (${date} ${time}).`,
          createdAt: booking.updatedAt,
          status: booking.status,
        };
      }

      if (booking.status === "confirmed") {
        return {
          id: booking._id,
          icon: "checkmark-circle-outline",
          title: "Đơn đã được xác nhận",
          subtitle: `Booking của ${customerName} tại ${tableName} đã được xác nhận.`,
          createdAt: booking.updatedAt,
          status: booking.status,
        };
      }

      if (booking.status === "cancelled") {
        return {
          id: booking._id,
          icon: "close-circle-outline",
          title: "Booking đã bị hủy",
          subtitle: `${customerName} đã hủy booking tại ${tableName}.`,
          createdAt: booking.updatedAt,
          status: booking.status,
        };
      }

      return {
        id: booking._id,
        icon: "information-circle-outline",
        title: "Booking cập nhật trạng thái",
        subtitle: `${customerName} • ${tableName} • ${booking.status}`,
        createdAt: booking.updatedAt,
        status: booking.status,
      };
    });

    return res.json({ success: true, pendingCount, notifications });
  } catch (err) {
    console.error("[getNotifications]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// POST /api/partner/tables
exports.createTable = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Partner chưa liên kết với nhà hàng.",
      });
    }

    const {
      name,
      type = "regular",
      capacity,
      pricing,
      description = "",
      features = [],
      images = [],
    } = req.body;

    const minCap = Number(capacity?.min);
    const maxCap = Number(capacity?.max);
    const baseDeposit = Number(pricing?.baseDeposit);

    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Tên bàn là bắt buộc." });
    }

    if (!VALID_TABLE_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Loại bàn không hợp lệ." });
    }

    if (!Number.isFinite(minCap) || !Number.isFinite(maxCap) || minCap < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Sức chứa không hợp lệ." });
    }

    if (maxCap < minCap) {
      return res.status(400).json({
        success: false,
        message: "Sức chứa tối đa phải lớn hơn hoặc bằng tối thiểu.",
      });
    }

    if (!Number.isFinite(baseDeposit) || baseDeposit < 0) {
      return res.status(400).json({
        success: false,
        message: "Tiền cọc không hợp lệ.",
      });
    }

    const newTable = await Table.create({
      restaurantId,
      name: String(name).trim(),
      type,
      capacity: { min: minCap, max: maxCap },
      pricing: { baseDeposit },
      description: String(description || "").trim(),
      features: Array.isArray(features)
        ? features.map((f) => String(f).trim()).filter(Boolean)
        : [],
      images: normalizeImageList(images),
      isActive: true,
      isAvailable: true,
    });

    return res.status(201).json({ success: true, table: newTable });
  } catch (err) {
    console.error("[createTable]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// PUT /api/partner/tables/:tableId
exports.updateTable = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { tableId } = req.params;

    const table = await Table.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bàn." });
    }

    const {
      name,
      type,
      capacity,
      pricing,
      description,
      features,
      images,
      isAvailable,
    } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Tên bàn là bắt buộc." });
      }
      table.name = String(name).trim();
    }

    if (type !== undefined) {
      if (!VALID_TABLE_TYPES.includes(type)) {
        return res
          .status(400)
          .json({ success: false, message: "Loại bàn không hợp lệ." });
      }
      table.type = type;
    }

    if (capacity !== undefined) {
      const minCap = Number(capacity?.min);
      const maxCap = Number(capacity?.max);
      if (!Number.isFinite(minCap) || !Number.isFinite(maxCap) || minCap < 1) {
        return res
          .status(400)
          .json({ success: false, message: "Sức chứa không hợp lệ." });
      }
      if (maxCap < minCap) {
        return res.status(400).json({
          success: false,
          message: "Sức chứa tối đa phải lớn hơn hoặc bằng tối thiểu.",
        });
      }
      table.capacity = { min: minCap, max: maxCap };
    }

    if (pricing !== undefined) {
      const baseDeposit = Number(pricing?.baseDeposit);
      if (!Number.isFinite(baseDeposit) || baseDeposit < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Tiền cọc không hợp lệ." });
      }
      table.pricing = { baseDeposit };
    }

    if (description !== undefined) {
      table.description = String(description || "").trim();
    }

    if (features !== undefined) {
      table.features = Array.isArray(features)
        ? features.map((f) => String(f).trim()).filter(Boolean)
        : [];
    }

    if (images !== undefined) {
      table.images = normalizeImageList(images);
    }

    if (isAvailable !== undefined) {
      table.isAvailable = !!isAvailable;
      if (!table.isAvailable) {
        table.currentBookingId = table.currentBookingId || null;
      }
      if (table.isAvailable) {
        table.currentBookingId = null;
      }
    }

    await table.save();
    return res.json({ success: true, table });
  } catch (err) {
    console.error("[updateTable]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// DELETE /api/partner/tables/:tableId
exports.deleteTable = async (req, res) => {
  try {
    const restaurantId = req.partner.restaurantId;
    const { tableId } = req.params;

    const table = await Table.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bàn." });
    }

    if (table.currentBookingId) {
      const booking = await Booking.findById(table.currentBookingId)
        .select("status")
        .lean();
      if (
        booking &&
        ["pending", "confirmed", "paid"].includes(booking.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa bàn đang có booking hoạt động.",
        });
      }
    }

    table.isActive = false;
    table.isAvailable = false;
    table.currentBookingId = null;
    await table.save();

    return res.json({ success: true, message: "Đã xóa bàn." });
  } catch (err) {
    console.error("[deleteTable]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// GET /api/partner/restaurant-profile
exports.getRestaurantProfile = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({
      partnerId: req.partner._id,
    }).lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ nhà hàng.",
      });
    }

    return res.json({
      success: true,
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        coverImage: restaurant.images?.[0] || "",
        address: restaurant.address || "",
        city: restaurant.city || "",
        phone: restaurant.phone || "",
        description: restaurant.description || "",
        introduction: restaurant.introduction || "",
        cuisine: restaurant.cuisine || "",
        hasParking: !!restaurant.hasParking,
        openTime: restaurant.openTime || "08:00",
        closeTime: restaurant.closeTime || "22:00",
        openDays: Array.isArray(restaurant.openDays) ? restaurant.openDays : [],
        facebook: restaurant.facebook || "",
        instagram: restaurant.instagram || "",
        tiktok: restaurant.tiktok || "",
        website: restaurant.website || "",
      },
    });
  } catch (err) {
    console.error("[getRestaurantProfile]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};

// PUT /api/partner/restaurant-profile
exports.updateRestaurantProfile = async (req, res) => {
  try {
    const {
      coverImage,
      name,
      address,
      city,
      phone,
      description,
      introduction,
      cuisine,
      hasParking,
      openTime,
      closeTime,
      openDays,
      facebook,
      instagram,
      tiktok,
      website,
    } = req.body;

    if (openDays !== undefined) {
      if (!Array.isArray(openDays)) {
        return res.status(400).json({
          success: false,
          message: "openDays phải là một mảng.",
        });
      }

      const invalid = openDays.find((d) => !VALID_OPEN_DAYS.includes(d));
      if (invalid) {
        return res.status(400).json({
          success: false,
          message: `Ngày mở cửa không hợp lệ: ${invalid}`,
        });
      }
    }

    if (hasParking !== undefined && typeof hasParking !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "hasParking phải là kiểu boolean.",
      });
    }

    const currentRestaurant = await Restaurant.findOne({
      partnerId: req.partner._id,
    }).lean();

    if (!currentRestaurant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ nhà hàng.",
      });
    }

    let nextImages = currentRestaurant.images || [];
    if (coverImage !== undefined) {
      const normalizedCover = String(coverImage || "").trim();
      if (!normalizedCover) {
        nextImages = [];
      } else {
        const rest = (currentRestaurant.images || []).filter(
          (img) => img !== normalizedCover,
        );
        nextImages = [normalizedCover, ...rest];
      }
    }

    const updateData = {
      ...(name !== undefined ? { name: String(name || "").trim() } : {}),
      ...(address !== undefined
        ? {
            address: String(address || "").trim(),
            location: String(address || "").trim(),
          }
        : {}),
      ...(city !== undefined ? { city: String(city || "").trim() } : {}),
      ...(phone !== undefined ? { phone: String(phone || "").trim() } : {}),
      ...(description !== undefined
        ? { description: String(description || "").trim() }
        : {}),
      ...(introduction !== undefined
        ? { introduction: String(introduction || "").trim() }
        : {}),
      ...(cuisine !== undefined
        ? { cuisine: String(cuisine || "").trim() }
        : {}),
      ...(hasParking !== undefined ? { hasParking } : {}),
      ...(openTime !== undefined
        ? { openTime: String(openTime || "").trim() }
        : {}),
      ...(closeTime !== undefined
        ? { closeTime: String(closeTime || "").trim() }
        : {}),
      ...(openDays !== undefined ? { openDays } : {}),
      ...(coverImage !== undefined ? { images: nextImages } : {}),
      ...(facebook !== undefined
        ? { facebook: String(facebook || "").trim() }
        : {}),
      ...(instagram !== undefined
        ? { instagram: String(instagram || "").trim() }
        : {}),
      ...(tiktok !== undefined ? { tiktok: String(tiktok || "").trim() } : {}),
      ...(website !== undefined
        ? { website: String(website || "").trim() }
        : {}),
    };

    const restaurant = await Restaurant.findOneAndUpdate(
      { partnerId: req.partner._id },
      { $set: updateData },
      { new: true },
    ).lean();

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ nhà hàng thành công.",
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        coverImage: restaurant.images?.[0] || "",
        address: restaurant.address || "",
        city: restaurant.city || "",
        phone: restaurant.phone || "",
        description: restaurant.description || "",
        introduction: restaurant.introduction || "",
        cuisine: restaurant.cuisine || "",
        hasParking: !!restaurant.hasParking,
        openTime: restaurant.openTime || "08:00",
        closeTime: restaurant.closeTime || "22:00",
        openDays: Array.isArray(restaurant.openDays) ? restaurant.openDays : [],
        facebook: restaurant.facebook || "",
        instagram: restaurant.instagram || "",
        tiktok: restaurant.tiktok || "",
        website: restaurant.website || "",
      },
    });
  } catch (err) {
    console.error("[updateRestaurantProfile]", err);
    return res.status(500).json({ success: false, message: "Loi server" });
  }
};
