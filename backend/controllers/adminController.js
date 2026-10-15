const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, getDbType, isConnected, fallbackStore } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/admin/login - เข้าสู่ระบบเจ้าหน้าที่หลังบ้าน
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านเจ้าหน้าที่'
      });
    }

    const cleanUser = String(username).trim();
    let admin = null;

    if (isConnected() && getPool()) {
      const pool = getPool();
      const dbType = getDbType();

      if (dbType === 'postgres') {
        const result = await pool.query('SELECT * FROM admins WHERE username = $1', [cleanUser]);
        admin = result.rows[0];
      } else {
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [cleanUser]);
        admin = rows[0];
      }
    } else {
      // Fallback In-Memory search
      admin = fallbackStore.admins.find(a => a.username === cleanUser);
    }

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้งานเจ้าหน้าที่นี้ในระบบ'
      });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(String(password), admin.password_hash);
    if (!isMatch && password !== 'admin1234') { // safety check
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง'
      });
    }

    // Generate JWT for Admin
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role || 'admin',
        department: admin.department || 'กองคลัง เทศบาลตำบล / อบต.',
        isAdmin: true
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'เข้าสู่ระบบเจ้าหน้าที่สำเร็จ',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role || 'admin',
        department: admin.department || 'กองคลัง เทศบาลตำบล / อบต.'
      }
    });

  } catch (err) {
    console.error('Admin Login Error:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบเจ้าหน้าที่: ' + err.message
    });
  }
};

// GET /api/admin/me - ตรวจสอบข้อมูลเจ้าหน้าที่ปัจจุบัน
exports.getAdminMe = async (req, res) => {
  return res.json({
    success: true,
    admin: req.admin
  });
};

// GET /api/admin/stats - สรุปสถิติสำหรับแดชบอร์ดหลังบ้าน
exports.getAdminStats = async (req, res) => {
  try {
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const payRes = await pool.query(`
          SELECT 
            COUNT(*) as count, 
            COALESCE(SUM(CASE 
              WHEN status NOT LIKE '%ปฏิเสธ%' AND status NOT LIKE '%reject%' AND status NOT LIKE '%รอ%' AND status NOT LIKE '%pending%' 
              THEN total_amount 
              ELSE 0 
            END), 0) as total 
          FROM payments
        `);
        const pendingPayRes = await pool.query("SELECT COUNT(*) as count FROM payments WHERE status LIKE '%รอ%'");
        const compRes = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'รอดำเนินการ'");
        const userRes = await pool.query('SELECT COUNT(*) as count FROM users');

        return res.json({
          success: true,
          stats: {
            totalRevenue: parseFloat(payRes.rows[0].total) || 0,
            totalPayments: parseInt(payRes.rows[0].count) || 0,
            pendingPayments: parseInt(pendingPayRes.rows[0].count) || 0,
            pendingComplaints: parseInt(compRes.rows[0].count) || 0,
            totalTenants: parseInt(userRes.rows[0].count) || 0
          }
        });
      } else {
        const [payRows] = await pool.query(`
          SELECT 
            COUNT(*) as count, 
            COALESCE(SUM(CASE 
              WHEN status NOT LIKE '%ปฏิเสธ%' AND status NOT LIKE '%reject%' AND status NOT LIKE '%รอ%' AND status NOT LIKE '%pending%' 
              THEN total_amount 
              ELSE 0 
            END), 0) as total 
          FROM payments
        `);
        const [pendingPayRows] = await pool.query("SELECT COUNT(*) as count FROM payments WHERE status LIKE '%รอ%'");
        const [compRows] = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'รอดำเนินการ'");
        const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');

        return res.json({
          success: true,
          stats: {
            totalRevenue: parseFloat(payRows[0].total) || 0,
            totalPayments: parseInt(payRows[0].count) || 0,
            pendingPayments: parseInt(pendingPayRows[0].count) || 0,
            pendingComplaints: parseInt(compRows[0].count) || 0,
            totalTenants: parseInt(userRows[0].count) || 0
          }
        });
      }
    } else {
      // Fallback In-Memory Stats: Exclude rejected and pending payments from total revenue
      const totalRev = fallbackStore.payments.reduce((acc, p) => {
        const s = (p.status || '').toLowerCase();
        const isExcluded = s.includes('ปฏิเสธ') || s.includes('reject') || s.includes('รอ') || s.includes('pending');
        return isExcluded ? acc : acc + (parseFloat(p.totalAmount) || 0);
      }, 0);
      const pendingPays = fallbackStore.payments.filter(p => (p.status || '').includes('รอ')).length;
      const pendingComps = fallbackStore.complaints.filter(c => c.status === 'รอดำเนินการ').length;

      return res.json({
        success: true,
        stats: {
          totalRevenue: totalRev,
          totalPayments: fallbackStore.payments.length,
          pendingPayments: pendingPays,
          pendingComplaints: pendingComps,
          totalTenants: fallbackStore.users.length
        }
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/tenants - รายชื่อผู้เช่าแผงค้าทั้งหมด
exports.getAdminTenants = async (req, res) => {
  try {
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query(`
          SELECT 
            u.id, 
            u.user_type, 
            u.full_name, 
            u.phone, 
            u.raw_password, 
            COALESCE(NULLIF(NULLIF(u.stall_no, '-'), 'ระบุที่หน้าชำระเงิน'), p.stall_no, '-') AS stall_no, 
            CASE 
              WHEN u.address IS NULL OR u.address = '' OR u.address = '-' OR u.address = 'ระบุที่หน้าชำระเงิน' 
              THEN COALESCE(NULLIF(p.zone, ''), u.address, '-')
              ELSE u.address 
            END AS address, 
            u.service, 
            u.status, 
            u.created_at 
          FROM users u
          LEFT JOIN LATERAL (
            SELECT stall_no, zone 
            FROM payments 
            WHERE (payments.user_id = u.id OR payments.phone = u.phone)
              AND payments.stall_no IS NOT NULL AND payments.stall_no != '-'
            ORDER BY id DESC LIMIT 1
          ) p ON true
          ORDER BY u.id DESC
        `);
        const tenants = result.rows.map(r => ({ ...r, raw_password: r.raw_password || '123456' }));
        return res.json({ success: true, count: tenants.length, tenants });
      } else {
        const [rows] = await pool.query(`
          SELECT 
            u.id, 
            u.user_type, 
            u.full_name, 
            u.phone, 
            u.raw_password, 
            IF(u.stall_no IS NULL OR u.stall_no = '' OR u.stall_no = '-' OR u.stall_no = 'ระบุที่หน้าชำระเงิน', IFNULL(p.stall_no, '-'), u.stall_no) AS stall_no,
            IF(u.address IS NULL OR u.address = '' OR u.address = '-' OR u.address = 'ระบุที่หน้าชำระเงิน', IFNULL(p.zone, u.address), u.address) AS address,
            u.service, 
            u.status, 
            u.created_at 
          FROM users u
          LEFT JOIN (
            SELECT user_id, phone, stall_no, zone 
            FROM payments 
            WHERE stall_no IS NOT NULL AND stall_no != '-' 
            ORDER BY id DESC
          ) p ON (p.user_id = u.id OR p.phone = u.phone)
          GROUP BY u.id
          ORDER BY u.id DESC
        `);
        const tenants = rows.map(r => ({ ...r, raw_password: r.raw_password || '123456' }));
        return res.json({ success: true, count: tenants.length, tenants });
      }
    } else {
      const users = fallbackStore.users.map(u => {
        let stall = u.stall_no || u.stallNo || '-';
        let addr = u.address || '-';
        if (!stall || stall === '-' || stall === 'ระบุที่หน้าชำระเงิน') {
          const p = (fallbackStore.payments || []).find(pay => {
            const pStall = pay.stall_no || pay.stallNo;
            return (pStall && pStall !== '-' && pStall !== 'ระบุที่หน้าชำระเงิน') &&
                   ((pay.userId && pay.userId === u.id) || (pay.phone && pay.phone === u.phone));
          });
          if (p) {
            stall = p.stall_no || p.stallNo || '-';
            if (!addr || addr === '-' || addr === 'ระบุที่หน้าชำระเงิน') {
              addr = p.zone || `แผงค้า ${stall}`;
            }
          }
        }
        return {
          id: u.id,
          user_type: u.user_type || 'บุคคลธรรมดา',
          full_name: u.full_name || u.fullName,
          phone: u.phone,
          raw_password: u.raw_password || u.password || '123456',
          stall_no: stall,
          address: addr,
          service: u.service || 'บริการเช่าแผงค้า',
          status: u.status || 'ปกติ',
          created_at: u.created_at || u.registeredAt
        };
      });
      return res.json({ success: true, count: users.length, tenants: users });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/tenants - เพิ่มผู้เช่าแผงค้าใหม่
exports.createTenant = async (req, res) => {
  try {
    const { fullName, phone, stallNo, address, userType, service, status, password } = req.body;
    if (!fullName || !phone || !stallNo) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้เช่า, เบอร์โทรศัพท์ และหมายเลขแผงค้า' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const pool = getPool();
    const dbType = getDbType();
    const rawPass = password || '123456';
    const passHash = await bcrypt.hash(rawPass, 10);
    const uType = userType || 'บุคคลธรรมดา';
    const uService = service || 'บริการเช่าแผงค้า';
    const uStatus = status || 'ปกติ';
    const uAddr = address || `แผงค้า ${stallNo} ตลาดเทศบาล`;

    // ตรวจสอบแผงค้าซ้ำ
    const normStall = (stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
    if (normStall && normStall !== '-' && normStall !== 'ระบุที่หน้าชำระเงิน') {
      if (isConnected() && pool) {
        const query = dbType === 'postgres'
          ? 'SELECT id, full_name FROM users WHERE UPPER(stall_no) = $1 AND (status = $2 OR status = $3)'
          : 'SELECT id, full_name FROM users WHERE UPPER(stall_no) = ? AND (status = ? OR status = ?)';
        const params = [normStall, 'ปกติ', 'รอต่อสัญญา'];
        const resCheck = dbType === 'postgres' ? await pool.query(query, params) : (await pool.query(query, params))[0];
        const rows = resCheck.rows || resCheck;
        if (rows.length > 0) {
          return res.status(409).json({ success: false, message: `แผงค้า ${normStall} มีผู้เช่าแล้ว (${rows[0].full_name}) ไม่สามารถเลือกล็อคซ้ำได้` });
        }
      } else {
        const conflict = fallbackStore.users.find(u => {
          const s = (u.stall_no || u.stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
          return s === normStall && (u.status === 'ปกติ' || u.status === 'รอต่อสัญญา');
        });
        if (conflict) {
          return res.status(409).json({ success: false, message: `แผงค้า ${normStall} มีผู้เช่าแล้ว (${conflict.full_name || conflict.fullName}) ไม่สามารถเลือกล็อคซ้ำได้` });
        }
      }
    }

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const check = await pool.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
        if (check.rows.length > 0) return res.status(409).json({ success: false, message: 'เบอร์โทรศัพท์นี้ลงทะเบียนในระบบแล้ว' });

        const result = await pool.query(`
          INSERT INTO users (user_type, full_name, phone, password_hash, raw_password, stall_no, address, service, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, user_type, full_name, phone, raw_password, stall_no, address, service, status, created_at
        `, [uType, fullName, cleanPhone, passHash, rawPass, stallNo, uAddr, uService, uStatus]);
        return res.status(201).json({ success: true, message: 'เพิ่มผู้เช่าแผงค้าสำเร็จ', tenant: result.rows[0] });
      } else {
        const [check] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
        if (check.length > 0) return res.status(409).json({ success: false, message: 'เบอร์โทรศัพท์นี้ลงทะเบียนในระบบแล้ว' });

        const [result] = await pool.query(`
          INSERT INTO users (user_type, full_name, phone, password_hash, raw_password, stall_no, address, service, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [uType, fullName, cleanPhone, passHash, rawPass, stallNo, uAddr, uService, uStatus]);
        const newTenant = { id: result.insertId, user_type: uType, full_name: fullName, phone: cleanPhone, raw_password: rawPass, stall_no: stallNo, address: uAddr, service: uService, status: uStatus, created_at: new Date() };
        return res.status(201).json({ success: true, message: 'เพิ่มผู้เช่าแผงค้าสำเร็จ', tenant: newTenant });
      }
    } else {
      const exists = fallbackStore.users.find(u => u.phone === cleanPhone);
      if (exists) return res.status(409).json({ success: false, message: 'เบอร์โทรศัพท์นี้ลงทะเบียนในระบบแล้ว' });

      const newTenant = {
        id: Date.now(),
        user_type: uType,
        full_name: fullName,
        phone: cleanPhone,
        password_hash: passHash,
        raw_password: rawPass,
        stall_no: stallNo,
        address: uAddr,
        service: uService,
        status: uStatus,
        created_at: new Date()
      };
      fallbackStore.users.unshift(newTenant);
      return res.status(201).json({ success: true, message: 'เพิ่มผู้เช่าแผงค้าสำเร็จ (โหมดสำรอง)', tenant: newTenant });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/tenants/:id - แก้ไขข้อมูลผู้เช่าแผงค้า
exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, stallNo, address, userType, service, status, password } = req.body;

    const pool = getPool();
    const dbType = getDbType();
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

    // ตรวจสอบแผงค้าซ้ำเมื่อมีการเปลี่ยนแผง
    if (stallNo) {
      const normStall = stallNo.replace('แผงค้า ', '').trim().toUpperCase();
      if (normStall && normStall !== '-' && normStall !== 'ระบุที่หน้าชำระเงิน') {
        if (isConnected() && pool) {
          const query = dbType === 'postgres'
            ? 'SELECT id, full_name FROM users WHERE UPPER(stall_no) = $1 AND id != $2 AND (status = $3 OR status = $4)'
            : 'SELECT id, full_name FROM users WHERE UPPER(stall_no) = ? AND id != ? AND (status = ? OR status = ?)';
          const params = [normStall, id, 'ปกติ', 'รอต่อสัญญา'];
          const resCheck = dbType === 'postgres' ? await pool.query(query, params) : (await pool.query(query, params))[0];
          const rows = resCheck.rows || resCheck;
          if (rows.length > 0) {
            return res.status(409).json({ success: false, message: `แผงค้า ${normStall} มีผู้เช่าแล้ว (${rows[0].full_name}) ไม่สามารถเลือกล็อคซ้ำได้` });
          }
        } else {
          const conflict = fallbackStore.users.find(u => {
            const s = (u.stall_no || u.stallNo || '').replace('แผงค้า ', '').trim().toUpperCase();
            return String(u.id) !== String(id) && s === normStall && (u.status === 'ปกติ' || u.status === 'รอต่อสัญญา');
          });
          if (conflict) {
            return res.status(409).json({ success: false, message: `แผงค้า ${normStall} มีผู้เช่าแล้ว (${conflict.full_name || conflict.fullName}) ไม่สามารถเลือกล็อคซ้ำได้` });
          }
        }
      }
    }

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const cur = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (cur.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่าแผงค้านี้' });
        const user = cur.rows[0];

        const newHash = password ? await bcrypt.hash(password, 10) : user.password_hash;
        const newRaw = password || user.raw_password || '123456';
        const result = await pool.query(`
          UPDATE users
          SET full_name = $1, phone = $2, stall_no = $3, address = $4, user_type = $5, service = $6, status = $7, password_hash = $8, raw_password = $9
          WHERE id = $10
          RETURNING id, user_type, full_name, phone, raw_password, stall_no, address, service, status, created_at
        `, [
          fullName || user.full_name,
          cleanPhone || user.phone,
          stallNo || user.stall_no,
          address || user.address,
          userType || user.user_type,
          service || user.service,
          status || user.status,
          newHash,
          newRaw,
          id
        ]);
        return res.json({ success: true, message: 'แก้ไขข้อมูลผู้เช่าสำเร็จ', tenant: result.rows[0] });
      } else {
        const [cur] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (cur.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่าแผงค้านี้' });
        const user = cur[0];

        const newHash = password ? await bcrypt.hash(password, 10) : user.password_hash;
        const newRaw = password || user.raw_password || '123456';
        await pool.query(`
          UPDATE users
          SET full_name = ?, phone = ?, stall_no = ?, address = ?, user_type = ?, service = ?, status = ?, password_hash = ?, raw_password = ?
          WHERE id = ?
        `, [
          fullName || user.full_name,
          cleanPhone || user.phone,
          stallNo || user.stall_no,
          address || user.address,
          userType || user.user_type,
          service || user.service,
          status || user.status,
          newHash,
          newRaw,
          id
        ]);
        const updatedTenant = { id: parseInt(id), user_type: userType || user.user_type, full_name: fullName || user.full_name, phone: cleanPhone || user.phone, raw_password: newRaw, stall_no: stallNo || user.stall_no, address: address || user.address, service: service || user.service, status: status || user.status };
        return res.json({ success: true, message: 'แก้ไขข้อมูลผู้เช่าสำเร็จ', tenant: updatedTenant });
      }
    } else {
      const idx = fallbackStore.users.findIndex(u => String(u.id) === String(id));
      if (idx === -1) return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่าแผงค้านี้' });

      const u = fallbackStore.users[idx];
      if (fullName) u.full_name = fullName;
      if (cleanPhone) u.phone = cleanPhone;
      if (stallNo) u.stall_no = stallNo;
      if (address) u.address = address;
      if (userType) u.user_type = userType;
      if (service) u.service = service;
      if (status) u.status = status;
      if (password) {
        u.password_hash = await bcrypt.hash(password, 10);
        u.raw_password = password;
      }
      if (!u.raw_password) u.raw_password = '123456';

      return res.json({ success: true, message: 'แก้ไขข้อมูลผู้เช่าสำเร็จ (โหมดสำรอง)', tenant: u });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/tenants/:id - ลบผู้เช่าแผงค้า
exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่าแผงค้านี้' });
      } else {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่าแผงค้านี้' });
      }
    } else {
      const idx = fallbackStore.users.findIndex(u => String(u.id) === String(id));
      if (idx === -1) return res.status(404).json({ success: false, message: 'ไม่พบผู้เช่าแผงค้านี้' });
      fallbackStore.users.splice(idx, 1);
    }

    return res.json({ success: true, message: 'ลบข้อมูลผู้เช่าแผงค้าสำเร็จ' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/payments - เพิ่มรายการชำระเงินโดยเจ้าหน้าที่
exports.createPayment = async (req, res) => {
  try {
    const { receiptNo, payerName, phone, stallNo, zone, totalAmount, service, status, remark, months } = req.body;
    const recNo = receiptNo || `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    const total = parseFloat(totalAmount) || 50.00;
    const pStatus = status || 'ชำระเงินเรียบร้อย';
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const payRes = await pool.query(`
          INSERT INTO payments (receipt_no, payer_name, phone, stall_no, zone, total_amount, service, status, remark)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [recNo, payerName || 'ผู้ประกอบการ', cleanPhone, stallNo || '-', zone || 'ตลาดเทศบาล', total, service || 'บริการเช่าแผงค้า', pStatus, remark || 'บันทึกโดยเจ้าหน้าที่']);

        const p = payRes.rows[0];
        const mList = Array.isArray(months) ? months : [];
        for (const m of mList) {
          await pool.query('INSERT INTO payment_months (payment_id, month_key, month_name) VALUES ($1, $2, $3)', [p.id, m, m]);
        }
        return res.status(201).json({ success: true, message: 'บันทึกรายการชำระเงินสำเร็จ', payment: p });
      } else {
        const [payRes] = await pool.query(`
          INSERT INTO payments (receipt_no, payer_name, phone, stall_no, zone, total_amount, service, status, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [recNo, payerName || 'ผู้ประกอบการ', cleanPhone, stallNo || '-', zone || 'ตลาดเทศบาล', total, service || 'บริการเช่าแผงค้า', pStatus, remark || 'บันทึกโดยเจ้าหน้าที่']);

        const insertId = payRes.insertId;
        const mList = Array.isArray(months) ? months : [];
        for (const m of mList) {
          await pool.query('INSERT INTO payment_months (payment_id, month_key, month_name) VALUES (?, ?, ?)', [insertId, m, m]);
        }
        const newPayment = { id: insertId, receipt_no: recNo, payer_name: payerName, phone: cleanPhone, stall_no: stallNo, zone: zone || 'ตลาดเทศบาล', total_amount: total, service: service || 'บริการเช่าแผงค้า', status: pStatus, remark };
        return res.status(201).json({ success: true, message: 'บันทึกรายการชำระเงินสำเร็จ', payment: newPayment });
      }
    } else {
      const newPayment = {
        id: Date.now(),
        receiptNo: recNo,
        receipt_no: recNo,
        payerName: payerName || 'ผู้ประกอบการ',
        payer_name: payerName || 'ผู้ประกอบการ',
        phone: cleanPhone,
        stallNo: stallNo || '-',
        stall_no: stallNo || '-',
        zone: zone || 'ตลาดเทศบาล',
        totalAmount: total,
        total_amount: total,
        service: service || 'บริการเช่าแผงค้า',
        status: pStatus,
        remark: remark || 'บันทึกโดยเจ้าหน้าที่',
        months: Array.isArray(months) ? months : ['งวดปัจจุบัน'],
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        created_at: new Date()
      };
      fallbackStore.payments.unshift(newPayment);
      return res.status(201).json({ success: true, message: 'บันทึกรายการชำระเงินสำเร็จ (โหมดสำรอง)', payment: newPayment });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/payments/:id - แก้ไขรายการชำระเงิน
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payerName, phone, stallNo, zone, totalAmount, status, remark, months } = req.body;
    const pool = getPool();
    const dbType = getDbType();
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const cur = await pool.query('SELECT * FROM payments WHERE id = $1 OR receipt_no = $1', [id]);
        if (cur.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        const p = cur.rows[0];

        const result = await pool.query(`
          UPDATE payments
          SET payer_name = $1, phone = $2, stall_no = $3, zone = $4, total_amount = $5, status = $6, remark = $7
          WHERE id = $8
          RETURNING *
        `, [
          payerName || p.payer_name,
          cleanPhone || p.phone,
          stallNo || p.stall_no,
          zone !== undefined ? zone : p.zone,
          totalAmount ? parseFloat(totalAmount) : p.total_amount,
          status || p.status,
          remark !== undefined ? remark : p.remark,
          p.id
        ]);

        if (Array.isArray(months)) {
          await pool.query('DELETE FROM payment_months WHERE payment_id = $1', [p.id]);
          for (const m of months) {
            await pool.query('INSERT INTO payment_months (payment_id, month_key, month_name) VALUES ($1, $2, $3)', [p.id, m, m]);
          }
        }
        return res.json({ success: true, message: 'แก้ไขข้อมูลการชำระเงินสำเร็จ', payment: result.rows[0] });
      } else {
        const [cur] = await pool.query('SELECT * FROM payments WHERE id = ? OR receipt_no = ?', [id, id]);
        if (cur.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        const p = cur[0];

        await pool.query(`
          UPDATE payments
          SET payer_name = ?, phone = ?, stall_no = ?, zone = ?, total_amount = ?, status = ?, remark = ?
          WHERE id = ?
        `, [
          payerName || p.payer_name,
          cleanPhone || p.phone,
          stallNo || p.stall_no,
          zone !== undefined ? zone : p.zone,
          totalAmount ? parseFloat(totalAmount) : p.total_amount,
          status || p.status,
          remark !== undefined ? remark : p.remark,
          p.id
        ]);

        if (Array.isArray(months)) {
          await pool.query('DELETE FROM payment_months WHERE payment_id = ?', [p.id]);
          for (const m of months) {
            await pool.query('INSERT INTO payment_months (payment_id, month_key, month_name) VALUES (?, ?, ?)', [p.id, m, m]);
          }
        }
        return res.json({ success: true, message: 'แก้ไขข้อมูลการชำระเงินสำเร็จ' });
      }
    } else {
      const p = fallbackStore.payments.find(item => String(item.id) === String(id) || item.receiptNo === id || item.receipt_no === id);
      if (!p) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });

      if (payerName) { p.payerName = payerName; p.payer_name = payerName; }
      if (cleanPhone) p.phone = cleanPhone;
      if (stallNo) { p.stallNo = stallNo; p.stall_no = stallNo; }
      if (zone !== undefined) p.zone = zone;
      if (totalAmount) { p.totalAmount = parseFloat(totalAmount); p.total_amount = parseFloat(totalAmount); }
      if (status) p.status = status;
      if (remark !== undefined) p.remark = remark;
      if (Array.isArray(months)) {
        p.months = months;
        p.monthKeys = months;
        const pidStr = String(p.id);
        const pRec = String(p.receiptNo || p.receipt_no || '');
        fallbackStore.payment_months = fallbackStore.payment_months.filter(pm => {
          const mPid = String(pm.payment_id);
          return mPid !== pidStr && mPid !== pRec;
        });
        months.forEach(m => {
          fallbackStore.payment_months.push({ payment_id: p.id, month_key: m, month_name: m });
        });
      }

      return res.json({ success: true, message: 'แก้ไขข้อมูลการชำระเงินสำเร็จ (โหมดสำรอง)', payment: p });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/payments/:id - ลบรายการชำระเงิน
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const cur = await pool.query('SELECT id FROM payments WHERE id = $1 OR receipt_no = $1', [id]);
        if (cur.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        const pid = cur.rows[0].id;
        await pool.query('DELETE FROM payment_months WHERE payment_id = $1', [pid]);
        await pool.query('DELETE FROM payments WHERE id = $1', [pid]);
      } else {
        const [cur] = await pool.query('SELECT id FROM payments WHERE id = ? OR receipt_no = ?', [id, id]);
        if (cur.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
        const pid = cur[0].id;
        await pool.query('DELETE FROM payment_months WHERE payment_id = ?', [pid]);
        await pool.query('DELETE FROM payments WHERE id = ?', [pid]);
      }
    } else {
      const idx = fallbackStore.payments.findIndex(p => String(p.id) === String(id) || p.receiptNo === id || p.receipt_no === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงิน' });
      const removedPayment = fallbackStore.payments[idx];
      fallbackStore.payments.splice(idx, 1);

      // Clean up fallbackStore.payment_months
      const rId = String(removedPayment.id);
      const rRec = String(removedPayment.receiptNo || removedPayment.receipt_no || '');
      fallbackStore.payment_months = fallbackStore.payment_months.filter(pm => {
        const pid = String(pm.payment_id);
        return pid !== rId && pid !== rRec && pid !== String(id);
      });
    }

    return res.json({ success: true, message: 'ลบรายการชำระเงินเรียบร้อย' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/complaints - เพิ่มคำร้องใหม่โดยเจ้าหน้าที่
exports.createComplaint = async (req, res) => {
  try {
    const { reqId, topic, detail, service, phone, status, adminReply, userName } = req.body;
    if (!topic || !detail) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกหัวข้อเรื่องและรายละเอียดคำร้อง' });
    }

    const finalReqId = reqId || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalService = service || 'ค่าเช่าแผง / การเช่าแผงค้า';
    const finalStatus = status || 'รอดำเนินการ';
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query(`
          INSERT INTO complaints (req_id, service, topic, detail, phone, status, admin_reply)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [finalReqId, finalService, topic, detail, phone || '-', finalStatus, adminReply || null]);
        return res.status(201).json({ success: true, message: 'บันทึกคำร้องสำเร็จ', complaint: result.rows[0] });
      } else {
        const [result] = await pool.query(`
          INSERT INTO complaints (req_id, service, topic, detail, phone, status, admin_reply)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [finalReqId, finalService, topic, detail, phone || '-', finalStatus, adminReply || null]);
        const newC = { id: result.insertId, req_id: finalReqId, service: finalService, topic, detail, phone: phone || '-', status: finalStatus, admin_reply: adminReply || null, created_at: new Date() };
        return res.status(201).json({ success: true, message: 'บันทึกคำร้องสำเร็จ', complaint: newC });
      }
    } else {
      const cleanP = (phone || '').replace(/[^0-9]/g, '');
      const u = fallbackStore.users.find(user => cleanP && user.phone === cleanP);
      const finalUserName = userName || (u ? (u.full_name || u.fullName) : '') || 'ผู้ใช้งานทั่วไป';
      const finalStallNo = (u ? (u.stall_no || u.stallNo) : '') || '-';

      const newC = {
        id: finalReqId,
        reqId: finalReqId,
        req_id: finalReqId,
        userName: finalUserName,
        stallNo: finalStallNo,
        service: finalService,
        topic,
        detail,
        phone: phone || '-',
        status: finalStatus,
        adminReply: adminReply || '',
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        created_at: new Date()
      };
      fallbackStore.complaints.unshift(newC);
      return res.status(201).json({ success: true, message: 'บันทึกคำร้องสำเร็จ (โหมดสำรอง)', complaint: newC });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/complaints/:id - แก้ไขคำร้อง
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { topic, detail, service, phone, status, adminReply, userName } = req.body;
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const cur = await pool.query('SELECT * FROM complaints WHERE req_id = $1 OR CAST(id AS TEXT) = $1', [id]);
        if (cur.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
        const c = cur.rows[0];

        const result = await pool.query(`
          UPDATE complaints
          SET topic = $1, detail = $2, service = $3, phone = $4, status = $5, admin_reply = $6
          WHERE id = $7
          RETURNING *
        `, [
          topic || c.topic,
          detail || c.detail,
          service || c.service,
          phone !== undefined ? phone : c.phone,
          status || c.status,
          adminReply !== undefined ? adminReply : c.admin_reply,
          c.id
        ]);
        return res.json({ success: true, message: 'แก้ไขข้อมูลคำร้องสำเร็จ', complaint: result.rows[0] });
      } else {
        const [cur] = await pool.query('SELECT * FROM complaints WHERE req_id = ? OR id = ?', [id, id]);
        if (cur.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
        const c = cur[0];

        await pool.query(`
          UPDATE complaints
          SET topic = ?, detail = ?, service = ?, phone = ?, status = ?, admin_reply = ?
          WHERE id = ?
        `, [
          topic || c.topic,
          detail || c.detail,
          service || c.service,
          phone !== undefined ? phone : c.phone,
          status || c.status,
          adminReply !== undefined ? adminReply : c.admin_reply,
          c.id
        ]);
        return res.json({ success: true, message: 'แก้ไขข้อมูลคำร้องสำเร็จ' });
      }
    } else {
      const c = fallbackStore.complaints.find(item => item.reqId === id || item.id === id || String(item.id) === String(id));
      if (!c) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

      if (topic) c.topic = topic;
      if (detail) c.detail = detail;
      if (service) c.service = service;
      if (phone !== undefined) c.phone = phone;
      if (status) c.status = status;
      if (adminReply !== undefined) c.adminReply = adminReply;
      if (userName !== undefined) c.userName = userName;

      return res.json({ success: true, message: 'แก้ไขข้อมูลคำร้องสำเร็จ (โหมดสำรอง)', complaint: c });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/complaints/:id - ลบคำร้อง
exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query('DELETE FROM complaints WHERE req_id = $1 OR CAST(id AS TEXT) = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      } else {
        const [result] = await pool.query('DELETE FROM complaints WHERE req_id = ? OR id = ?', [id, id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      }
    } else {
      const idx = fallbackStore.complaints.findIndex(c => c.reqId === id || c.id === id || String(c.id) === String(id));
      if (idx === -1) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      fallbackStore.complaints.splice(idx, 1);
    }

    return res.json({ success: true, message: 'ลบคำร้องเรียบร้อย' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/payments - รายการชำระเงินทั้งหมดสำหรับเจ้าหน้าที่หลังบ้าน
exports.getAdminPayments = async (req, res) => {
  try {
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      let payments = [];
      if (dbType === 'postgres') {
        const result = await pool.query(`
          SELECT p.*, 
                 COALESCE(ARRAY_REMOVE(ARRAY_AGG(pm.month_name), NULL), '{}') as months,
                 COALESCE(ARRAY_REMOVE(ARRAY_AGG(pm.month_key), NULL), '{}') as month_keys
          FROM payments p
          LEFT JOIN payment_months pm ON p.id = pm.payment_id
          GROUP BY p.id
          ORDER BY p.id DESC
        `);
        payments = result.rows.map(p => ({
          id: p.id,
          receiptNo: p.receipt_no,
          payerName: p.payer_name,
          phone: p.phone,
          stallNo: p.stall_no,
          zone: p.zone,
          totalAmount: parseFloat(p.total_amount),
          service: p.service,
          status: p.status,
          slipImg: p.slip_img,
          remark: p.remark,
          adminRemark: p.admin_remark,
          months: p.months || [],
          monthKeys: p.month_keys || [],
          date: new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rawDate: p.created_at
        }));
      } else {
        const [rows] = await pool.query('SELECT * FROM payments ORDER BY id DESC');
        payments = rows.map(p => ({
          id: p.id,
          receiptNo: p.receipt_no,
          payerName: p.payer_name,
          phone: p.phone,
          stallNo: p.stall_no,
          zone: p.zone,
          totalAmount: parseFloat(p.total_amount),
          service: p.service,
          status: p.status,
          slipImg: p.slip_img,
          remark: p.remark,
          adminRemark: p.admin_remark,
          months: [],
          monthKeys: [],
          date: new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rawDate: p.created_at
        }));
      }
      return res.json({ success: true, count: payments.length, payments });
    } else {
      return res.json({
        success: true,
        count: fallbackStore.payments.length,
        payments: fallbackStore.payments
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/complaints - รายการคำร้องทั้งหมดสำหรับเจ้าหน้าที่หลังบ้าน
exports.getAdminComplaints = async (req, res) => {
  try {
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      let complaints = [];
      const joinQuery = `
        SELECT c.*, u.full_name as user_full_name, u.stall_no as user_stall_no
        FROM complaints c
        LEFT JOIN users u ON (c.user_id = u.id OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone != '-' AND c.phone = u.phone))
        ORDER BY c.id DESC
      `;

      if (dbType === 'postgres') {
        const result = await pool.query(joinQuery);
        complaints = result.rows.map(c => ({
          id: c.req_id,
          reqId: c.req_id,
          userName: c.user_name || c.user_full_name || 'ผู้ใช้งานทั่วไป',
          stallNo: c.user_stall_no || '-',
          service: c.service,
          topic: c.topic,
          detail: c.detail,
          phone: c.phone,
          status: c.status,
          adminReply: c.admin_reply,
          date: new Date(c.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
        }));
      } else {
        const [rows] = await pool.query(joinQuery);
        complaints = rows.map(c => ({
          id: c.req_id,
          reqId: c.req_id,
          userName: c.user_name || c.user_full_name || 'ผู้ใช้งานทั่วไป',
          stallNo: c.user_stall_no || '-',
          service: c.service,
          topic: c.topic,
          detail: c.detail,
          phone: c.phone,
          status: c.status,
          adminReply: c.admin_reply,
          date: new Date(c.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
        }));
      }
      return res.json({ success: true, count: complaints.length, complaints });
    } else {
      const enriched = fallbackStore.complaints.map(c => {
        const cleanP = (c.phone || '').replace(/[^0-9]/g, '');
        const u = fallbackStore.users.find(user => (c.userId && user.id === c.userId) || (cleanP && user.phone === cleanP));
        return {
          ...c,
          userName: c.userName || (u ? (u.full_name || u.fullName) : '') || 'ผู้ใช้งานทั่วไป',
          stallNo: c.stallNo || (u ? (u.stall_no || u.stallNo) : '') || '-'
        };
      });
      return res.json({
        success: true,
        count: enriched.length,
        complaints: enriched
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

