const Donor = require('../models/Donor');
const Donation = require('../models/Donation');

// @desc    Get logged-in donor profile with donations
// @route   GET /api/donors/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const donor = await Donor.findById(req.donor._id).select('-password');
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const donations = await Donation.find({ donorId: req.donor._id })
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, donor, donations });
  } catch (error) {
    console.error('GetProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update personal info
// @route   PUT /api/donors/profile/personal
// @access  Private
const updatePersonalInfo = async (req, res) => {
  try {
    const { fullName, bloodGroup, phone, email, dob, gender } = req.body;

    const donor = await Donor.findById(req.donor._id);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    if (fullName !== undefined) donor.personalInfo.fullName = fullName;
    if (bloodGroup !== undefined) donor.personalInfo.bloodGroup = bloodGroup;
    if (phone !== undefined) donor.personalInfo.phone = phone;
    if (email !== undefined) donor.personalInfo.email = email;
    if (dob !== undefined) donor.personalInfo.dob = dob;
    if (gender !== undefined) donor.personalInfo.gender = gender;

    await donor.save();
    const updated = donor.toObject();
    delete updated.password;

    res.json({ success: true, donor: updated });
  } catch (error) {
    console.error('UpdatePersonalInfo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update address info
// @route   PUT /api/donors/profile/address
// @access  Private
const updateAddressInfo = async (req, res) => {
  try {
    const { city, district, ward, address } = req.body;

    const donor = await Donor.findById(req.donor._id);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    if (city !== undefined) donor.personalInfo.city = city;
    if (district !== undefined) donor.personalInfo.district = district;
    if (ward !== undefined) donor.personalInfo.ward = ward;
    if (address !== undefined) donor.personalInfo.address = address;

    await donor.save();
    const updated = donor.toObject();
    delete updated.password;

    res.json({ success: true, donor: updated });
  } catch (error) {
    console.error('UpdateAddressInfo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update medical info
// @route   PUT /api/donors/profile/medical
// @access  Private
const updateMedicalInfo = async (req, res) => {
  try {
    const { weight, height, conditions, onMedication, medications, habits, recentDonation, additionalInfo } = req.body;

    const donor = await Donor.findById(req.donor._id);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    if (weight !== undefined) donor.medicalInfo.weight = weight;
    if (height !== undefined) donor.medicalInfo.height = height;
    if (conditions !== undefined) donor.medicalInfo.conditions = conditions;
    if (onMedication !== undefined) donor.medicalInfo.onMedication = onMedication;
    if (medications !== undefined) donor.medicalInfo.medications = medications;
    if (habits !== undefined) donor.medicalInfo.habits = habits;
    if (recentDonation !== undefined) donor.medicalInfo.recentDonation = recentDonation;
    if (additionalInfo !== undefined) donor.medicalInfo.additionalInfo = additionalInfo;

    await donor.save();
    const updated = donor.toObject();
    delete updated.password;

    res.json({ success: true, donor: updated });
  } catch (error) {
    console.error('UpdateMedicalInfo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get nearby donors by location and blood group
// @route   GET /api/donors/nearby
// @access  Private
const getNearbyDonors = async (req, res) => {
  try {
    const { city, district, ward, bloodGroup } = req.query;
    const query = { 'personalInfo.eligibleToDonate': { $ne: false } };

    if (city) query['personalInfo.city'] = { $regex: city, $options: 'i' };
    if (district) query['personalInfo.district'] = { $regex: district, $options: 'i' };
    if (ward) query['personalInfo.ward'] = { $regex: ward, $options: 'i' };
    if (bloodGroup) query['personalInfo.bloodGroup'] = bloodGroup;

    const donors = await Donor.find(query)
      .select('personalInfo.fullName personalInfo.bloodGroup personalInfo.city personalInfo.district personalInfo.ward personalInfo.phone')
      .lean();

    res.json({ success: true, count: donors.length, donors });
  } catch (error) {
    console.error('GetNearbyDonors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProfile, updatePersonalInfo, updateAddressInfo, updateMedicalInfo, getNearbyDonors };
