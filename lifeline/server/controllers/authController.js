const jwt = require('jsonwebtoken');
const Donor = require('../models/Donor');

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
    const { personalInfo, medicalInfo, password } = req.body;

    if (!personalInfo || !personalInfo.email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide required fields' });
    }

    // Check if donor already exists
    const existingDonor = await Donor.findOne({ 'personalInfo.email': personalInfo.email.toLowerCase() });
    if (existingDonor) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create donor (password will be hashed by pre-save hook)
    const donor = await Donor.create({
      personalInfo,
      medicalInfo: medicalInfo || {},
      password,
      verified: true, // Simulated doc verification
    });

    const token = generateToken(donor._id);

    const donorData = donor.toObject();
    delete donorData.password;

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const donor = await Donor.findOne({ 'personalInfo.email': email.toLowerCase() });

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
