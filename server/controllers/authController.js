const jwt = require('jsonwebtoken');
const Donor = require('../models/Donor');
const { sendWelcomeEmail } = require('../utils/email');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register a new donor
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { personalInfo, medicalInfo, password, location } = req.body;

    if (!personalInfo || !personalInfo.email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide required fields' });
    }

    // Check if donor already exists
    const existingDonor = await Donor.findOne({ 'personalInfo.email': personalInfo.email.toLowerCase() });
    if (existingDonor) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Set location if coordinates provided
    const donorPayload = {
      personalInfo,
      medicalInfo: medicalInfo || {},
      password,
      verified: true,
    };

    if (location && location.coordinates && location.coordinates.length === 2) {
      donorPayload.location = {
        type: 'Point',
        coordinates: location.coordinates,
      };
    }

    // Create donor (password will be hashed by pre-save hook)
    const donor = await Donor.create(donorPayload);

    const token = generateToken(donor._id);

    const donorData = donor.toObject();
    delete donorData.password;

    // Send welcome email (non-blocking)
    sendWelcomeEmail(donorData).catch((err) => console.error('[EMAIL] Welcome email failed:', err.message));

    res.status(201).json({
      success: true,
      token,
      donor: donorData,
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Login donor
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    const identifier = email || phone;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password' });
    }

    let donor;
    if (email) {
      donor = await Donor.findOne({ 'personalInfo.email': email.toLowerCase() });
    } else {
      donor = await Donor.findOne({ 'personalInfo.phone': phone });
    }

    if (!donor) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await donor.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(donor._id);

    const donorData = donor.toObject();
    delete donorData.password;

    res.json({
      success: true,
      token,
      donor: donorData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get current logged-in donor
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const donorData = req.donor.toObject();
    delete donorData.password;

    res.json({
      success: true,
      donor: donorData,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, getMe };
