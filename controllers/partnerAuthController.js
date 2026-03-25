const jwt = require("jsonwebtoken");
const Partner = require("../models/partner");
const Restaurant = require("../models/restaurant");
const ServicePackage = require("../models/servicePackage");

const DEFAULT_SERVICE_PACKAGES = [
  {
    key: "basic",
    label: "Basic",
    badge: "",
    priceMonthly: 299000,
    currency: "VND",
    order: 1,
    tone: "#F9FAFB",
    border: "#E5E7EB",
    accent: "#6B7280",
    iconBg: "#F3F4F6",
    features: [
      { text: "Hiển thị trên danh sách nhà hàng", included: true, order: 1 },
      { text: "Quản lý tối đa 10 bàn", included: true, order: 2 },
      { text: "Nhận đặt bàn cơ bản", included: true, order: 3 },
      { text: "Hồ sơ nhà hàng", included: true, order: 4 },
      { text: "Ưu tiên hiển thị trang chủ", included: false, order: 5 },
      { text: "Voucher & khuyến mãi", included: false, order: 6 },
      { text: "Phân tích chi tiết", included: false, order: 7 },
    ],
  },
  {
    key: "pro",
    label: "Pro",
    badge: "Phổ biến",
    priceMonthly: 799000,
    currency: "VND",
    order: 2,
    tone: "#EFF6FF",
    border: "#93C5FD",
    accent: "#3B82F6",
    iconBg: "#DBEAFE",
    features: [
      { text: "Tất cả Basic", included: true, order: 1 },
      { text: "Quản lý không giới hạn bàn", included: true, order: 2 },
      {
        text: "Ưu tiên hiển thị trang chủ (mức trung)",
        included: true,
        order: 3,
      },
      { text: "AI gợi ý cho khách hàng", included: true, order: 4 },
      { text: "Tạo Voucher & khuyến mãi", included: true, order: 5 },
      { text: "Thống kê cơ bản", included: true, order: 6 },
      { text: "Hỗ trợ ưu tiên", included: true, order: 7 },
      { text: "Top đề xuất trang chủ", included: false, order: 8 },
    ],
  },
  {
    key: "premium",
    label: "Premium",
    badge: "Cao cấp",
    priceMonthly: 1499000,
    currency: "VND",
    order: 3,
    tone: "#FAF5FF",
    border: "#C4B5FD",
    accent: "#9333EA",
    iconBg: "#F3E8FF",
    features: [
      { text: "Tất cả Pro", included: true, order: 1 },
      { text: "Top đề xuất trang chủ Amble", included: true, order: 2 },
      { text: "Badge Premium hiển thị nổi bật", included: true, order: 3 },
      { text: "AI ưu tiên gợi ý cho khách", included: true, order: 4 },
      { text: "Phân tích chi tiết & báo cáo", included: true, order: 5 },
      { text: "Hỗ trợ 24/7 ưu tiên cao nhất", included: true, order: 6 },
      { text: "Tùy chỉnh trang nhà hàng", included: true, order: 7 },
      { text: "Chiến dịch marketing đặc biệt", included: true, order: 8 },
    ],
  },
];

const syncDefaultServicePackages = async () => {
  await Promise.all(
    DEFAULT_SERVICE_PACKAGES.map((item) =>
      ServicePackage.findOneAndUpdate(
        { key: item.key },
        { $set: item },
        { upsert: true },
      ),
    ),
  );
};

const formatPriceVND = (value = 0) => {
  try {
    return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
  } catch {
    return `${value}đ`;
  }
};

const signToken = (id, type = "partner") => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

exports.getPackages = async (req, res) => {
  try {
    await syncDefaultServicePackages();

    const packages = await ServicePackage.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      packages: packages.map((item) => ({
        key: item.key,
        label: item.label,
        badge: item.badge || "",
        price: formatPriceVND(item.priceMonthly),
        priceMonthly: item.priceMonthly,
        currency: item.currency || "VND",
        tone: item.tone,
        border: item.border,
        accent: item.accent,
        iconBg: item.iconBg,
        features: (item.features || [])
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((feature) => ({
            text: feature.text,
            included: !!feature.included,
          })),
      })),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ. Vui lòng thử lại." });
  }
};

// Register partner
exports.register = async (req, res) => {
  try {
    const {
      ownerName,
      email,
      password,
      phone,
      restaurantName,
      restaurantAddress,
      restaurantCity,
      cuisine,
      subscriptionPackage,
    } = req.body;

    if (!ownerName || !email || !password || !phone || !restaurantName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc.",
      });
    }

    await syncDefaultServicePackages();

    const selectedPackage = (subscriptionPackage || "basic").toLowerCase();
    const packageExists = await ServicePackage.exists({
      key: selectedPackage,
      isActive: true,
    });

    if (!packageExists) {
      return res.status(400).json({
        success: false,
        message: "Gói dịch vụ không hợp lệ.",
      });
    }

    const existing = await Partner.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email đã được đăng ký. Vui lòng đăng nhập.",
      });
    }

    const partner = await Partner.create({
      ownerName,
      email,
      password,
      phone,
      restaurantName,
      restaurantAddress: restaurantAddress || "",
      restaurantCity: restaurantCity || "",
      cuisine: cuisine || "",
      subscriptionPackage: selectedPackage,
      subscriptionStatus: "pending",
      role: "owner",
    });

    // Create a linked Restaurant document
    const restaurant = await Restaurant.create({
      partnerId: partner._id,
      name: restaurantName,
      cuisine: cuisine || "",
      address: restaurantAddress || "",
      city: restaurantCity || "",
      subscriptionPackage: partner.subscriptionPackage,
    });

    partner.restaurantId = restaurant._id;
    await partner.save();

    const token = signToken(partner._id);

    return res.status(201).json({
      success: true,
      message: "Đăng ký đối tác thành công! Tài khoản đang chờ xét duyệt.",
      token,
      partner,
      restaurant,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ. Vui lòng thử lại." });
  }
};

// Login partner
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu.",
      });
    }

    const partner = await Partner.findOne({ email }).select("+password");
    if (!partner || !(await partner.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    if (!partner.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa.",
      });
    }

    const token = signToken(partner._id);
    partner.password = undefined;

    // Populate restaurant info
    const restaurant = await Restaurant.findOne({ partnerId: partner._id });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      partner,
      restaurant,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ. Vui lòng thử lại." });
  }
};
exports.logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};
// Get current partner
exports.getMe = async (req, res) => {
  try {
    const partner = await Partner.findById(req.partner._id);
    const restaurant = await Restaurant.findOne({ partnerId: partner._id });
    return res.status(200).json({ success: true, partner, restaurant });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
};
