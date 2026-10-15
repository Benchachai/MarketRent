const express = require('express');
const router = express.Router();
const { 
  createPayment, 
  getPayments, 
  getPaidMonths, 
  updatePaymentStatus, 
  getPaymentById,
  getStallsStatus
} = require('../controllers/paymentController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/', optionalAuth, createPayment);
router.get('/', optionalAuth, getPayments);
router.get('/stalls/status', optionalAuth, getStallsStatus);
router.get('/paid-months', optionalAuth, getPaidMonths);
router.get('/:id', optionalAuth, getPaymentById);
router.patch('/:id/status', optionalAuth, updatePaymentStatus);

module.exports = router;

