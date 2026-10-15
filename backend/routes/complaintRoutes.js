const express = require('express');
const router = express.Router();
const { createComplaint, getComplaints, updateComplaintStatus } = require('../controllers/complaintController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/', optionalAuth, createComplaint);
router.get('/', optionalAuth, getComplaints);
router.patch('/:id/status', optionalAuth, updateComplaintStatus);

module.exports = router;

