const jwt = require("jsonwebtoken");
const Partner = require("../models/partner");

const protectPartner = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không có quyền truy cập. Vui lòng đăng nhập.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "partner") {
      return res.status(403).json({
        success: false,
        message: "Token không hợp lệ cho tài khoản đối tác.",
      });
    }

    const partner = await Partner.findById(decoded.id);
    if (!partner) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản không tồn tại." });
    }

    if (!partner.isActive) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản đã bị vô hiệu hóa." });
    }

    req.partner = partner;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

module.exports = { protectPartner };
