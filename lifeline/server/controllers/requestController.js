const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const Donation = require('../models/Donation');

// Compatible blood types: which donor types can donate to a given request blood type
const getCompatibleDonorTypes = (requestedType) => {
  if (requestedType === 'Any') return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const compatibility = {
    'O-':  ['O-'],
    'O+':  ['O-', 'O+'],
    'A-':  ['O-', 'A-'],
    'A+':  ['O-', 'O+', 'A-', 'A+'],
    'B-':  ['O-', 'B-'],
    'B+':  ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  };
  return compatibility[requestedType] || [requestedType];
};

// @desc    Create a blood request and notify nearby matching donors
// @route   POST /api/requests
// @access  Public
const createRequest = async (req, res) => {
  try {
    const {
      requesterName, requesterPhone, requesterEmail, relationship,
      patientName, patientAge, bloodType, unitsNeeded,
      reason, medicalInfo,
      hospitalName, city, district, ward, hospitalAddress, hospitalPhone, doctorName,
      urgency, bloodNeededBy,
    } = req.body;

    if (!requesterName || !requesterPhone || !patientName || !bloodType || !unitsNeeded || !hospitalName || !city) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Find nearby eligible donors matching blood compatibility and location
    const compatibleTypes = getCompatibleDonorTypes(bloodType);
    const donorQuery = {
      eligibleToDonate: { $ne: false },
      'personalInfo.bloodGroup': { $in: compatibleTypes },
    };
    if (city) donorQuery['personalInfo.city'] = { $regex: city, $options: 'i' };

    const nearbyDonors = await Donor.find(donorQuery)
      .select('personalInfo.fullName personalInfo.email personalInfo.phone personalInfo.bloodGroup')
      .limit(50)
      .lean();

    const notifiedDonors = nearbyDonors.map((d) => ({
      donorId: d._id,
      donorName: d.personalInfo.fullName,
      donorEmail: d.personalInfo.email,
      donorPhone: d.personalInfo.phone,
      status: 'PENDING',
      notifiedAt: new Date(),
    }));

    const bloodRequest = await BloodRequest.create({
      requesterName,
      requesterPhone,
      requesterEmail,
      relationship,
      patientName,
      patientAge,
      bloodType,
      unitsNeeded,
      reason,
      medicalInfo,
      hospitalName,
      city,
      district,
      ward,
      hospitalAddress,
      hospitalPhone,
      doctorName,
      urgency,
      bloodNeededBy,
      notifiedDonors,
    });

    res.status(201).json({ success: true, request: bloodRequest });
  } catch (error) {
    console.error('CreateRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all requests (supports ?status= filter)
// @route   GET /api/requests
// @access  Public
const getAllRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const requests = await BloodRequest.find(filter).sort({ createdAt: -1 }).lean();

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error('GetAllRequests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single request by ID
// @route   GET /api/requests/:id
// @access  Public
const getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id).lean();
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    res.json({ success: true, request });
  } catch (error) {
    console.error('GetRequestById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get OPEN requests near logged-in donor (matching location and blood type)
// @route   GET /api/requests/nearby
// @access  Private
const getOpenRequestsNearDonor = async (req, res) => {
  try {
    const donor = await Donor.findById(req.donor._id);
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const { city, district, ward, bloodGroup } = donor.personalInfo;

    // Find OPEN requests where this donor's blood type is compatible
    const allOpen = await BloodRequest.find({ status: 'OPEN' }).lean();

    const nearbyRequests = allOpen.filter((r) => {
      // Location match: at least city should match
      const cityMatch = city && r.city && r.city.toLowerCase() === city.toLowerCase();
      if (!cityMatch) return false;

      // Blood compatibility: donor can donate to this request
      const compatible = getCompatibleDonorTypes(r.bloodType);
      return compatible.includes(bloodGroup);
    });

    res.json({ success: true, count: nearbyRequests.length, requests: nearbyRequests });
  } catch (error) {
    console.error('GetOpenRequestsNearDonor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Donor accepts a blood request
// @route   POST /api/requests/:id/accept
// @access  Private
const acceptRequest = async (req, res) => {
  try {
    const { unitsToAccept } = req.body;

    if (!unitsToAccept || unitsToAccept < 1) {
      return res.status(400).json({ success: false, message: 'Please specify valid units to accept' });
    }

    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'This request is no longer open' });
    }

    const remainingUnits = request.unitsNeeded - request.unitsAccepted;
    if (unitsToAccept > remainingUnits) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept more than ${remainingUnits} units remaining`,
      });
    }

    const donor = await Donor.findById(req.donor._id);

    // Add to acceptedBy array
    request.acceptedBy.push({
      donorId: donor._id,
      donorName: donor.personalInfo.fullName,
      unitsAccepted: unitsToAccept,
      acceptedAt: new Date(),
    });
    request.unitsAccepted += unitsToAccept;

    // Update the donor's notification status to ACCEPTED
    const notifIndex = request.notifiedDonors.findIndex(
      (n) => n.donorId && n.donorId.toString() === donor._id.toString()
    );
    if (notifIndex > -1) {
      request.notifiedDonors[notifIndex].status = 'ACCEPTED';
    }

    // Check if fully fulfilled
    if (request.unitsAccepted >= request.unitsNeeded) {
      request.status = 'CONFIRMED';
      // Reject all remaining PENDING notifications
      request.notifiedDonors = request.notifiedDonors.map((n) => {
        if (n.status === 'PENDING') n.status = 'REJECTED';
        return n;
      });
    }

    await request.save();

    // Create a donation record
    const donation = await Donation.create({
      donorId: donor._id,
      donorEmail: donor.personalInfo.email,
      donorName: donor.personalInfo.fullName,
      bloodGroup: donor.personalInfo.bloodGroup,
      date: new Date(),
      center: request.hospitalName,
      patientName: request.patientName,
      units: unitsToAccept * 450, // approximate ml per unit
      requestId: request._id,
      type: 'request_accepted',
      status: 'Completed',
    });

    // Update donor's lastDonationDate
    donor.lastDonationDate = new Date();
    await donor.save();

    res.json({ success: true, request, donation });
  } catch (error) {
    console.error('AcceptRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createRequest, getAllRequests, getRequestById, getOpenRequestsNearDonor, acceptRequest };
