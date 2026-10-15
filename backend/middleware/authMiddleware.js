const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'guru_it_marketpay_super_secret_key_2026';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Missing or Invalid Token)'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง'
    });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Ignore invalid optional token
    }
  }
  next();
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบเจ้าหน้าที่หลังบ้านก่อนทำรายการ (Admin Authentication Required)'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin && decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'ท่านไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน (Access Denied: Admin Only)'
      });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'เซสชันเจ้าหน้าที่หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง'
    });
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdminAuth,
  JWT_SECRET
};
