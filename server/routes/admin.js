const express = require('express');
const router = express.Router();
const {
  registerAdmin, loginAdmin, getMe,
  getStats, getAnalytics,
  getInventory, addInventory, updateInventory, deleteInventory, checkExpiry,
  getDonors, updateDonor,
  getRequests, updateRequestStatus, deleteRequest,
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/adminAuth');

// ─── Auth routes (public) ──────────────────────────────────────
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protectAdmin, getMe);

// ─── All routes below require admin auth ───────────────────────
router.use(protectAdmin);

// Dashboard
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

// Inventory
router.get('/inventory', getInventory);
router.post('/inventory', addInventory);
router.put('/inventory/:id', updateInventory);
router.delete('/inventory/:id', deleteInventory);
router.post('/inventory/check-expiry', checkExpiry);

// Donors
router.get('/donors', getDonors);
router.put('/donors/:id', updateDonor);

// Requests
router.get('/requests', getRequests);
router.put('/requests/:id', updateRequestStatus);
router.delete('/requests/:id', deleteRequest);

module.exports = router;
