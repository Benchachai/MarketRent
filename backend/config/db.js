const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
const bcrypt = require('bcryptjs');

let dbPool = null;
let dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
let isConnected = false;

// In-memory fallback database in case MySQL/PostgreSQL is not currently running
const fallbackStore = {
  admins: [
    {
      id: 1,
      username: 'admin',
      password_hash: bcrypt.hashSync('admin1234', 10),
      full_name: 'นายตรวจตลาด กองคลังเทศบาล',
      role: 'admin',
      department: 'กองคลัง ฝ่ายจัดเก็บรายได้ เทศบาลตำบล / อบต.',
      created_at: new Date()
    }
  ],
  users: [
    {
      id: 1,
      user_type: 'บุคคลธรรมดา',
      full_name: 'นายสมชาย สุขสมบูรณ์',
      phone: '0812345678',
      password_hash: bcrypt.hashSync('123456', 10),
      raw_password: '123456',
      stall_no: 'A-10',
      address: 'โซนตลาดสด ล็อค 10',
      service: 'บริการเช่าแผงค้า',
      status: 'ปกติ',
      created_at: new Date()
    }
  ],
  payments: [],
  payment_months: [],
  complaints: [
    {
      id: 'REQ-648291',
      reqId: 'REQ-648291',
      userId: 1,
      phone: '0812345678',
      service: 'ค่าเช่าแผง / การเช่าแผงค้า',
      topic: 'ร้องเรียนการให้บริการแผงค้า',
      detail: 'สอบถามรอบเวลาเจ้าหน้าที่เข้าจัดเก็บขยะและทำความสะอาดบริเวณทางเดินล็อค A-10 ตลาดสดครับ',
      status: 'ดำเนินการแก้ไขแล้ว',
      adminReply: 'เจ้าหน้าที่เข้าจัดเก็บรอบ 09:30 น. ทุกวันจันทร์และพฤหัสบดีครับ',
      date: '15 ต.ค. 2569',
      created_at: new Date()
    }
  ]
};

async function initDatabase() {
  dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
  
  if (dbType === 'postgres') {
    try {
      dbPool = new PgPool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        database: process.env.PG_DATABASE || 'marketpay_db'
      });
      await dbPool.query('SELECT NOW()');
      isConnected = true;
      console.log('✅ [Database] เชื่อมต่อ PostgreSQL สำเร็จ');
      await createPostgresTables();
    } catch (err) {
      isConnected = false;
      console.warn(`⚠️ [Database] ไม่สามารถเชื่อมต่อ PostgreSQL (${err.message})`);
      console.warn('💡 [Database] ระบบเปิดใช้งาน Fallback In-Memory Storage อัตโนมัติ (รันระบบต่อได้ทันที)');
    }
  } else {
    // Default: MySQL
    try {
      dbPool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'marketpay_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      // Test ping
      const connection = await dbPool.getConnection();
      connection.release();
      isConnected = true;
      console.log('✅ [Database] เชื่อมต่อ MySQL สำเร็จ');
      await createMySQLTables();
    } catch (err) {
      isConnected = false;
      console.warn(`⚠️ [Database] ไม่สามารถเชื่อมต่อ MySQL (${err.message})`);
      console.warn('💡 [Database] ระบบเปิดใช้งาน Fallback Storage อัตโนมัติ เพื่อให้ทดสอบหน้าบ้านได้ทันที');
      console.warn('👉 เมื่อคุณเปิด MySQL (เช่น XAMPP / MariaDB) แล้วสร้าง database "marketpay_db" ระบบจะบันทึกลงฐานข้อมูลจริงทันที');
    }
  }
}

async function createMySQLTables() {
  if (!isConnected || !dbPool) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_type VARCHAR(50) DEFAULT 'บุคคลธรรมดา',
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        raw_password VARCHAR(100) NULL,
        stall_no VARCHAR(100) NOT NULL,
        address VARCHAR(255) NOT NULL,
        service VARCHAR(100) DEFAULT 'บริการเช่าแผงค้า',
        status VARCHAR(50) DEFAULT 'ปกติ',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN raw_password VARCHAR(100) NULL AFTER password_hash');
    } catch (e) {
      // Column may already exist
    }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receipt_no VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NULL,
        payer_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        stall_no VARCHAR(100) NOT NULL,
        zone VARCHAR(255) NULL,
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
        service VARCHAR(100) DEFAULT 'บริการเช่าแผงค้า',
        status VARCHAR(50) DEFAULT 'ชำระเงินเรียบร้อย',
        slip_url LONGTEXT NULL,
        remark TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_receipt (receipt_no),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS payment_months (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NOT NULL,
        month_key VARCHAR(20) NOT NULL,
        month_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_payment_month (payment_id, month_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        req_id VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NULL,
        phone VARCHAR(30) NULL,
        service VARCHAR(150) DEFAULT 'ค่าเช่าแผง / การเช่าแผงค้า',
        topic VARCHAR(200) NOT NULL,
        detail TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'รอดำเนินการ',
        admin_reply TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_req_id (req_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await dbPool.query('ALTER TABLE complaints ADD COLUMN admin_reply TEXT NULL');
    } catch (e) {
      // Column may already exist
    }

    // Ensure default demo user exists
    const [existing] = await dbPool.query('SELECT id FROM users WHERE phone = ?', ['0812345678']);
    if (existing.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await dbPool.query(`
        INSERT INTO users (user_type, full_name, phone, password_hash, stall_no, address, service, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['บุคคลธรรมดา', 'นายสมชาย สุขสมบูรณ์', '0812345678', hash, 'A-10', 'โซนตลาดสด ล็อค 10', 'บริการเช่าแผงค้า', 'ปกติ']);
      console.log('👤 [Database] เพิ่มผู้ใช้งานทดสอบเริ่มต้น: เบอร์ 0812345678 / รหัสผ่าน 123456');
    }

    // Admins Table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        department VARCHAR(150) DEFAULT 'กองคลัง เทศบาลตำบล / อบต.',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_user (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure default demo admin exists
    const [existingAdmin] = await dbPool.query('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (existingAdmin.length === 0) {
      const adminHash = await bcrypt.hash('admin1234', 10);
      await dbPool.query(`
        INSERT INTO admins (username, password_hash, full_name, role, department)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin', adminHash, 'นายตรวจตลาด กองคลังเทศบาล', 'admin', 'กองคลัง ฝ่ายจัดเก็บรายได้ เทศบาลตำบล / อบต.']);
      console.log('🛡️ [Database] เพิ่มผู้ดูแลระบบหลังบ้านเริ่มต้น: ชื่อผู้ใช้ admin / รหัสผ่าน admin1234');
    }
  } catch (err) {
    console.error('⚠️ [Database] ตรวจสอบโครงสร้างตาราง MySQL เกิดข้อผิดพลาด:', err.message);
  }
}

async function createPostgresTables() {
  if (!isConnected || !dbPool) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) DEFAULT 'บุคคลธรรมดา',
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        raw_password VARCHAR(100),
        stall_no VARCHAR(100) NOT NULL,
        address VARCHAR(255) NOT NULL,
        service VARCHAR(100) DEFAULT 'บริการเช่าแผงค้า',
        status VARCHAR(50) DEFAULT 'ปกติ',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        receipt_no VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NULL,
        payer_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        stall_no VARCHAR(100) NOT NULL,
        zone VARCHAR(255),
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
        service VARCHAR(100) DEFAULT 'บริการเช่าแผงค้า',
        status VARCHAR(50) DEFAULT 'ชำระเงินเรียบร้อย',
        slip_url TEXT,
        remark TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS payment_months (
        id SERIAL PRIMARY KEY,
        payment_id INT NOT NULL,
        month_key VARCHAR(20) NOT NULL,
        month_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        req_id VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NULL,
        phone VARCHAR(30),
        service VARCHAR(150) DEFAULT 'ค่าเช่าแผง / การเช่าแผงค้า',
        topic VARCHAR(200) NOT NULL,
        detail TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'รอดำเนินการ',
        admin_reply TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        department VARCHAR(150) DEFAULT 'กองคลัง เทศบาลตำบล / อบต.',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await dbPool.query('ALTER TABLE complaints ADD COLUMN IF NOT EXISTS admin_reply TEXT');
    } catch (e) {
      // Column may already exist
    }

    // Ensure default demo admin exists
    const adminCheck = await dbPool.query('SELECT id FROM admins WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const adminHash = await bcrypt.hash('admin1234', 10);
      await dbPool.query(`
        INSERT INTO admins (username, password_hash, full_name, role, department)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin', adminHash, 'นายตรวจตลาด กองคลังเทศบาล', 'admin', 'กองคลัง ฝ่ายจัดเก็บรายได้ เทศบาลตำบล / อบต.']);
      console.log('🛡️ [Database] เพิ่มผู้ดูแลระบบหลังบ้านเริ่มต้น (PG): ชื่อผู้ใช้ admin / รหัสผ่าน admin1234');
    }
  } catch (err) {
    console.error('⚠️ [Database] ตรวจสอบโครงสร้างตาราง Postgres เกิดข้อผิดพลาด:', err.message);
  }
}

module.exports = {
  initDatabase,
  getPool: () => dbPool,
  getDbType: () => dbType,
  isConnected: () => isConnected,
  fallbackStore
};
