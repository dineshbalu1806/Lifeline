const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const { geocodeAddress, buildAddressString } = require('../utils/geocode');

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
    const { city, district, ward, address, coordinates } = req.body;

    const donor = await Donor.findById(req.donor._id);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    if (city !== undefined) donor.personalInfo.city = city;
    if (district !== undefined) donor.personalInfo.district = district;
    if (ward !== undefined) donor.personalInfo.ward = ward;
    if (address !== undefined) donor.personalInfo.address = address;

    // Set coordinates if provided directly
    if (coordinates && coordinates.length === 2) {
      donor.location = { type: 'Point', coordinates };
    } else if (city && !donor.location?.coordinates?.some((c) => c !== 0)) {
      // Auto-geocode from address if no coordinates set yet
      const addrStr = buildAddressString({ address: req.body.address || donor.personalInfo.address, city, district, ward });
      geocodeAddress(addrStr).then((geo) => {
        if (geo) {
          donor.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
          donor.save().catch(() => {});
        }
      });
    }

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
    const { city, district, ward, bloodGroup, lng, lat, radius = 50 } = req.query;
    const baseFilter = { 'personalInfo.eligibleToDonate': { $ne: false } };

    if (bloodGroup) baseFilter['personalInfo.bloodGroup'] = bloodGroup;

    // Use $geoNear if coordinates provided
    if (lng && lat) {
      const donors = await Donor.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: 'distance',
            maxDistance: parseInt(radius) * 1000,
            spherical: true,
            query: baseFilter,
          },
        },
        {
          $project: {
            password: 0,
            'personalInfo.location': 0,
          },
        },
        { $sort: { distance: 1 } },
      ]);

      return res.json({ success: true, count: donors.length, donors, geo: true });
    }

    // Fallback to city/district/ward matching
    if (city) baseFilter['personalInfo.city'] = { $regex: city, $options: 'i' };
    if (district) baseFilter['personalInfo.district'] = { $regex: district, $options: 'i' };
    if (ward) baseFilter['personalInfo.ward'] = { $regex: ward, $options: 'i' };

    const donors = await Donor.find(baseFilter)
      .select('personalInfo.fullName personalInfo.bloodGroup personalInfo.city personalInfo.district personalInfo.ward personalInfo.phone')
      .lean();

    res.json({ success: true, count: donors.length, donors, geo: false });
  } catch (error) {
    console.error('GetNearbyDonors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProfile, updatePersonalInfo, updateAddressInfo, updateMedicalInfo, getNearbyDonors };
