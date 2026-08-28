const express = require('express');
const router = express.Router();
const {
  createRequest,
  getAllRequests,
  getRequestById,
  getOpenRequestsNearDonor,
  acceptRequest,
} = require('../controllers/requestController');
const { protect } = require('../middleware/auth');

router.post('/', createRequest);             // Public - create request
router.get('/', getAllRequests);              // Public - get all with filters
router.get('/nearby', protect, getOpenRequestsNearDonor); // Protected - must be before /:id
router.get('/:id', getRequestById);          // Public - get single
router.post('/:id/accept', protect, acceptRequest); // Protected - accept request

module.exports = router;
