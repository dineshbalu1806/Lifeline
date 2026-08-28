const express = require('express');
const router = express.Router();
const { getCertificate } = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');

router.get('/:id/certificate', protect, getCertificate);

module.exports = router;