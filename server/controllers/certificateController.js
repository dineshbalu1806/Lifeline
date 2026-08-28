const Donation = require('../models/Donation');
const Donor = require('../models/Donor');

// @desc    Generate a donation certificate PDF as text/HTML for printing
// @route   GET /api/donations/:id/certificate
// @access  Private
const getCertificate = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).lean();
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Ensure only the donor who made this donation can get the certificate
    if (donation.donorId.toString() !== req.donor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const donor = await Donor.findById(req.donor._id).lean();
    const name = donation.donorName || donor?.personalInfo?.fullName || 'Donor';
    const bloodGroup = donation.bloodGroup || donor?.personalInfo?.bloodGroup || 'Unknown';
    const date = new Date(donation.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const certData = {
      certNumber: `LIFELINE-${donation._id.toString().slice(-8).toUpperCase()}`,
      donorName: name,
      bloodGroup,
      units: donation.units || 450,
      date,
      center: donation.center || 'LifeLine Blood Bank',
      patient: donation.patientName || 'N/A',
      requestId: donation.requestId || 'N/A',
    };

    res.json({ success: true, certificate: certData });
  } catch (error) {
    console.error('GetCertificate error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCertificate };