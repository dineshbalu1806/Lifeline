const express = require('express');
const router = express.Router();
const { getDonationHistory, addDonation } = require('../controllers/donationController');
const { protect } = require('../middleware/auth');

router.use(protect); // All donation routes are protected

router.get('/', getDonationHistory);
router.post('/', addDonation);

module.exports = router;
