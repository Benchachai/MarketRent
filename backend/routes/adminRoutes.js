const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAdminMe, 
  getAdminStats, 
  getAdminTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  getAdminPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getAdminComplaints,
  createComplaint,
  updateComplaint,
  deleteComplaint
} = require('../controllers/adminController');
const { requireAdminAuth, optionalAuth } = require('../middleware/authMiddleware');

// Public Admin Login
router.post('/login', adminLogin);

// Protected Admin Endpoints
router.get('/me', requireAdminAuth, getAdminMe);
router.get('/stats', optionalAuth, getAdminStats);

// 1. Tenants CRUD
router.get('/tenants', optionalAuth, getAdminTenants);
router.post('/tenants', optionalAuth, createTenant);
router.put('/tenants/:id', optionalAuth, updateTenant);
router.delete('/tenants/:id', optionalAuth, deleteTenant);

// 2. Payments CRUD
router.get('/payments', optionalAuth, getAdminPayments);
router.post('/payments', optionalAuth, createPayment);
router.put('/payments/:id', optionalAuth, updatePayment);
router.delete('/payments/:id', optionalAuth, deletePayment);

// 3. Complaints CRUD
router.get('/complaints', optionalAuth, getAdminComplaints);
router.post('/complaints', optionalAuth, createComplaint);
router.put('/complaints/:id', optionalAuth, updateComplaint);
router.delete('/complaints/:id', optionalAuth, deleteComplaint);

module.exports = router;
