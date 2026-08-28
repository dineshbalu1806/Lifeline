const express = require('express');
const router = express.Router();
const {
  getProfile,
  updatePersonalInfo,
  updateAddressInfo,
  updateMedicalInfo,
  getNearbyDonors,
} = require('../controllers/donorController');
const { protect } = require('../middleware/auth');

router.use(protect); // All donor routes are protected

router.get('/profile', getProfile);
router.put('/profile/personal', updatePersonalInfo);
router.put('/profile/address', updateAddressInfo);
router.put('/profile/medical', updateMedicalInfo);
router.get('/nearby', getNearbyDonors);

module.exports = router;
