require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDatabase, isConnected, getDbType, getPool, fallbackStore } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser with 50mb limit for base64 slip images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Dedicated Admin Portal Entry (Isolated from regular public users)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin-login.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'MarketRent API - ระบบบริหารและชำระค่าเช่าแผงค้า (GURU IT Solution)',
    version: '1.2.0',
    database: {
      type: getDbType(),
      connected: isConnected(),
      mode: isConnected() ? 'Live Database' : 'Fallback Storage'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/complaints', complaintRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาดภายใน (Internal Server Error)',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 MarketPay Server รันอยู่ที่: http://localhost:${PORT}`);
    console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`💻 Frontend Web App: http://localhost:${PORT}/`);
    console.log(`=======================================================`);
  });
}

start();
