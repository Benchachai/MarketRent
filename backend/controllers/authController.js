const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, isConnected, fallbackStore, getDbType } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      fullName: user.full_name || user.fullName,
      stallNo: user.stall_no || user.stallNo,
      userType: user.user_type || user.userType
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Format DB user object for frontend consumption
function formatUser(u) {
  return {
    id: u.id,
    userType: u.user_type || u.userType || 'บุคคลธรรมดา',
    fullName: u.full_name || u.fullName,
    phone: u.phone,
    stallNo: u.stall_no || u.stallNo,
    address: u.address,
    service: u.service || 'บริการเช่าแผงค้า',
    status: u.status || 'ปกติ',
    createdAt: u.created_at || u.createdAt
  };
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { userType, fullName, phone, password, stallNo, address } = req.body;

    if (!fullName || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง'
      });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)'
      });
    }

    const effectiveStallNo = (stallNo && stallNo.trim()) ? stallNo.trim() : '-';
    const effectiveAddress = (address && address.trim()) ? address.trim() : 'ระบุที่หน้าชำระเงิน';

    const passwordHash = await bcrypt.hash(password, 10);
    const pool = getPool();
    const dbType = getDbType();

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const check = await pool.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
        if (check.rows.length > 0) {
          // Update existing
          const updated = await pool.query(`
            UPDATE users 
            SET user_type = $1, full_name = $2, password_hash = $3, raw_password = $4, stall_no = $5, address = $6, updated_at = NOW()
            WHERE phone = $7
            RETURNING *
          `, [userType || 'บุคคลธรรมดา', fullName, passwordHash, password, effectiveStallNo, effectiveAddress, cleanPhone]);
          const user = formatUser(updated.rows[0]);
          return res.json({
            success: true,
            message: 'อัปเดตข้อมูลบัญชีผู้ใช้งานเรียบร้อยแล้ว',
            user,
            token: generateToken(user)
          });
        }

        const inserted = await pool.query(`
          INSERT INTO users (user_type, full_name, phone, password_hash, raw_password, stall_no, address, service, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'บริการเช่าแผงค้า', 'ปกติ')
          RETURNING *
        `, [userType || 'บุคคลธรรมดา', fullName, cleanPhone, passwordHash, password, effectiveStallNo, effectiveAddress]);
        const user = formatUser(inserted.rows[0]);
        return res.status(201).json({
          success: true,
          message: 'ลงทะเบียนผู้เช่าแผงค้าใหม่สำเร็จ',
          user,
          token: generateToken(user)
        });
      } else {
        // MySQL
        const [check] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
        if (check.length > 0) {
          await pool.query(`
            UPDATE users 
            SET user_type = ?, full_name = ?, password_hash = ?, raw_password = ?, stall_no = ?, address = ?
            WHERE phone = ?
          `, [userType || 'บุคคลธรรมดา', fullName, passwordHash, password, effectiveStallNo, effectiveAddress, cleanPhone]);
          const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
          const user = formatUser(rows[0]);
          return res.json({
            success: true,
            message: 'อัปเดตข้อมูลบัญชีผู้ใช้งานเรียบร้อยแล้ว',
            user,
            token: generateToken(user)
          });
        }

        const [result] = await pool.query(`
          INSERT INTO users (user_type, full_name, phone, password_hash, raw_password, stall_no, address, service, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'บริการเช่าแผงค้า', 'ปกติ')
        `, [userType || 'บุคคลธรรมดา', fullName, cleanPhone, passwordHash, password, effectiveStallNo, effectiveAddress]);

        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        const user = formatUser(rows[0]);
        return res.status(201).json({
          success: true,
          message: 'ลงทะเบียนผู้เช่าแผงค้าใหม่สำเร็จ',
          user,
          token: generateToken(user)
        });
      }
    } else {
      // Fallback In-Memory Storage
      const existingIdx = fallbackStore.users.findIndex(u => (u.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
      const userRecord = {
        id: existingIdx >= 0 ? fallbackStore.users[existingIdx].id : fallbackStore.users.length + 1,
        user_type: userType || 'บุคคลธรรมดา',
        full_name: fullName,
        phone: cleanPhone,
        password_hash: passwordHash,
        raw_password: password,
        stall_no: effectiveStallNo,
        address: effectiveAddress,
        service: 'บริการเช่าแผงค้า',
        status: 'ปกติ',
        created_at: new Date()
      };

      if (existingIdx >= 0) {
        fallbackStore.users[existingIdx] = userRecord;
      } else {
        fallbackStore.users.push(userRecord);
      }

      const user = formatUser(userRecord);
      return res.status(201).json({
        success: true,
        message: 'ลงทะเบียนผู้เช่าแผงค้าใหม่สำเร็จ (โหมดสำรอง)',
        user,
        token: generateToken(user)
      });
    }
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน: ' + err.message
    });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์และรหัสผ่าน'
      });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const pool = getPool();
    const dbType = getDbType();
    let dbUser = null;

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
        if (result.rows.length > 0) dbUser = result.rows[0];
      } else {
        const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
        if (rows.length > 0) dbUser = rows[0];
      }
    } else {
      // Fallback
      dbUser = fallbackStore.users.find(u => (u.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
    }

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้งานที่ลงทะเบียนด้วยเบอร์นี้ กรุณาตรวจสอบหรือลงทะเบียนใหม่'
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
      });
    }

    const user = formatUser(dbUser);
    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message
    });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const userId = req.user.id;
    const pool = getPool();
    const dbType = getDbType();
    let dbUser = null;

    if (isConnected() && pool) {
      if (dbType === 'postgres') {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length > 0) dbUser = result.rows[0];
      } else {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length > 0) dbUser = rows[0];
      }
    } else {
      dbUser = fallbackStore.users.find(u => u.id === userId);
    }

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    return res.json({
      success: true,
      user: formatUser(dbUser)
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + err.message
    });
  }
}

module.exports = {
  register,
  login,
  getMe
};
