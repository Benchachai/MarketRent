-- =============================================================================
-- MarketRent - Database Schema (GURU IT Solution)
-- Compatible with MySQL 8.x / MariaDB and PostgreSQL 12+
-- =============================================================================

-- ==========================================
-- 1. MYSQL SCHEMA (Run this in phpMyAdmin or MySQL CLI)
-- ==========================================

-- CREATE DATABASE IF NOT EXISTS marketpay_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE marketpay_db;

-- 1.1 Users Table
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

-- 1.2 Payments Table
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_receipt (receipt_no),
    INDEX idx_user_payments (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 Payment Months Detail (1 payment can cover multiple months)
CREATE TABLE IF NOT EXISTS payment_months (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    month_key VARCHAR(20) NOT NULL,
    month_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_payment_month (payment_id, month_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Complaints Table
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_req_id (req_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 Admins Table (Separate Back-Office Officers)
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

-- 1.6 Seed Initial Demo User & Admin
INSERT INTO users (user_type, full_name, phone, password_hash, raw_password, stall_no, address, service, status)
VALUES ('บุคคลธรรมดา', 'นายสมชาย สุขสมบูรณ์', '0812345678', '$2a$10$Q78K48BovZ9Lw2Yw2m9v9e2xM.yM/Lq8c8mGff7qQk6V29tC2VnGy', '123456', 'A-10', 'โซนตลาดสด ล็อค 10', 'บริการเช่าแผงค้า', 'ปกติ')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), raw_password=VALUES(raw_password);

-- Default Admin: admin / admin1234
INSERT INTO admins (username, password_hash, full_name, role, department)
VALUES ('admin', '$2a$10$5q9xL3r9vYgG8uO3F8K7veqHj5M2Q3E8eZ8x7c5v1a4b6c8d0e1f2', 'นายตรวจตลาด กองคลังเทศบาล', 'admin', 'กองคลัง ฝ่ายจัดเก็บรายได้ เทศบาลตำบล / อบต.')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);


-- ==========================================
-- 2. POSTGRESQL SCHEMA (Run this in pgAdmin or psql)
-- ==========================================
/*
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(50) DEFAULT 'บุคคลธรรมดา',
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    raw_password VARCHAR(100) NULL,
    stall_no VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    service VARCHAR(100) DEFAULT 'บริการเช่าแผงค้า',
    status VARCHAR(50) DEFAULT 'ปกติ',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
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
    payment_id INT REFERENCES payments(id) ON DELETE CASCADE,
    month_key VARCHAR(20) NOT NULL,
    month_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    req_id VARCHAR(50) NOT NULL UNIQUE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
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
*/
