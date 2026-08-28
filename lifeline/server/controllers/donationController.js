const Donation = require('../models/Donation');
const Donor = require('../models/Donor');

// @desc    Get donation history for logged-in donor
// @route   GET /api/donations
// @access  Private
const getDonationHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.donor._id })
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, count: donations.length, donations });
  } catch (error) {
    console.error('GetDonationHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Manually add a donation record
// @route   POST /api/donations
// @access  Private
const addDonation = async (req, res) => {
  try {
    const { date, center, patientName, patientPhone, units } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Donation date is required' });
    }

    const donor = await Donor.findById(req.donor._id);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const donation = await Donation.create({
      donorId: donor._id,
      donorEmail: donor.personalInfo.email,
      donorName: donor.personalInfo.fullName,
      bloodGroup: donor.personalInfo.bloodGroup,
      date: new Date(date),
      center: center || '',
      patientName: patientName || '',
      patientPhone: patientPhone || '',
      units: units || 450,
      type: 'manual',
      status: 'Completed',
    });

    // Update donor's lastDonationDate
    donor.lastDonationDate = new Date(date);
    await donor.save();

    res.status(201).json({ success: true, donation });
  } catch (error) {
    console.error('AddDonation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDonationHistory, addDonation };
