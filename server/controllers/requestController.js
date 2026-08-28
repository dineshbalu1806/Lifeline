const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const { geocodeAddress, buildAddressString } = require('../utils/geocode');
const { sendRequestMatchEmail, sendRequestAcceptedEmail } = require('../utils/email');
const { emitToDonor } = require('../utils/socket');

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
      coordinates,
    } = req.body;

    if (!requesterName || !requesterPhone || !patientName || !bloodType || !unitsNeeded || !hospitalName || !city) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Determine request location
    let requestCoords = coordinates;
    if (!requestCoords || requestCoords.length !== 2) {
      const addrStr = buildAddressString({ address: hospitalAddress, city, district, ward });
      const geo = await geocodeAddress(addrStr);
      if (geo) requestCoords = [geo.lng, geo.lat];
    }

    const requestLocation = requestCoords && requestCoords.length === 2
      ? { type: 'Point', coordinates: requestCoords }
      : undefined;

    // Find nearby eligible donors matching blood compatibility and location
    const compatibleTypes = getCompatibleDonorTypes(bloodType);
    const baseFilter = {
      eligibleToDonate: { $ne: false },
      'personalInfo.bloodGroup': { $in: compatibleTypes },
    };

    let nearbyDonors = [];

    if (requestLocation) {
      try {
        nearbyDonors = await Donor.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: requestCoords },
              distanceField: 'distance',
              maxDistance: 100 * 1000,
              spherical: true,
              query: baseFilter,
            },
          },
          { $limit: 50 },
        ]);
      } catch {
        nearbyDonors = [];
      }
    }

    // Fallback if geo query returned no results
    if (nearbyDonors.length === 0) {
      const fallbackQuery = { ...baseFilter };
      if (city) fallbackQuery['personalInfo.city'] = { $regex: city, $options: 'i' };

      nearbyDonors = await Donor.find(fallbackQuery)
        .select('personalInfo.fullName personalInfo.email personalInfo.phone personalInfo.bloodGroup')
        .limit(50)
        .lean();
    }

    const notifiedDonors = nearbyDonors.map((d) => ({
      donorId: d._id,
      donorName: d.personalInfo?.fullName || d.donorName,
      donorEmail: d.personalInfo?.email || d.donorEmail,
      donorPhone: d.personalInfo?.phone || d.donorPhone,
      status: 'PENDING',
      notifiedAt: new Date(),
    }));

    const requestPayload = {
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
    };

    if (requestLocation) requestPayload.location = requestLocation;

    const bloodRequest = await BloodRequest.create(requestPayload);

    // Send notifications (non-blocking)
    nearbyDonors.forEach((d) => {
      const email = d.personalInfo?.email || d.donorEmail;
      const id = d._id || d.donorId;
      if (id) {
        emitToDonor(id.toString(), 'newMatchingRequest', {
          requestId: bloodRequest._id,
          patientName: bloodRequest.patientName,
          bloodType: bloodRequest.bloodType,
          unitsNeeded: bloodRequest.unitsNeeded,
          hospitalName: bloodRequest.hospitalName,
          city: bloodRequest.city,
          urgency: bloodRequest.urgency,
          message: `New ${bloodRequest.urgency === 'yes' ? 'URGENT ' : ''}blood request for ${bloodRequest.patientName} in ${bloodRequest.city}`,
        });
      }
      if (email) {
        sendRequestMatchEmail(
          { personalInfo: { fullName: d.personalInfo?.fullName || d.donorName, email } },
          bloodRequest
        ).catch(() => {});
      }
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

    const { bloodGroup } = donor.personalInfo;
    const donorCoords = donor.location?.coordinates;

    let nearbyRequests = [];

    if (donorCoords && donorCoords[0] !== 0 && donorCoords[1] !== 0) {
      try {
        nearbyRequests = await BloodRequest.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: donorCoords },
              distanceField: 'distance',
              maxDistance: 100 * 1000,
              spherical: true,
              query: { status: 'OPEN' },
            },
          },
          { $sort: { distance: 1 } },
        ]);
      } catch {
        nearbyRequests = [];
      }
    }

    // Filter by blood compatibility client-side since $geoNear can't filter on request bloodType vs donor bloodGroup easily
    nearbyRequests = nearbyRequests.filter((r) => {
      const compatible = getCompatibleDonorTypes(r.bloodType);
      return compatible.includes(bloodGroup);
    });

    // Fallback: if geo returned nothing, try city-based matching
    if (nearbyRequests.length === 0) {
      const { city } = donor.personalInfo;
      const allOpen = await BloodRequest.find({ status: 'OPEN' }).lean();
      nearbyRequests = allOpen.filter((r) => {
        const cityMatch = city && r.city && r.city.toLowerCase() === city.toLowerCase();
        if (!cityMatch) return false;
        const compatible = getCompatibleDonorTypes(r.bloodType);
        return compatible.includes(bloodGroup);
      });
    }

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

    // ── Eligibility check: enforce donation gap ──
    if (donor.lastDonationDate) {
      const daysSinceLastDonation = Math.floor((Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24));
      const requiredGap = donor.personalInfo.gender === 'female' ? 90 : 56;
      if (daysSinceLastDonation < requiredGap) {
        return res.status(400).json({
          success: false,
          message: `You must wait ${requiredGap - daysSinceLastDonation} more day(s) before donating again (${requiredGap}-day donation gap).`,
        });
      }
    }

    // ── Eligibility: must not be marked ineligible ──
    if (donor.eligibleToDonate === false) {
      return res.status(400).json({ success: false, message: 'Your account is marked as ineligible to donate.' });
    }

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

    // Send confirmation email to requester (non-blocking)
    if (request.requesterEmail) {
      sendRequestAcceptedEmail(request.requesterEmail, request, donor.personalInfo.fullName).catch(() => {});
    }

    // Emit socket event to requester if they have a donor account with matching email
    const requesterDonor = await Donor.findOne({ 'personalInfo.email': request.requesterEmail?.toLowerCase() }).lean();
    if (requesterDonor) {
      emitToDonor(requesterDonor._id.toString(), 'requestAccepted', {
        requestId: request._id,
        patientName: request.patientName,
        donorName: donor.personalInfo.fullName,
        message: `${donor.personalInfo.fullName} has accepted the blood request for ${request.patientName}`,
      });
    }

    res.json({ success: true, request, donation });
  } catch (error) {
    console.error('AcceptRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createRequest, getAllRequests, getRequestById, getOpenRequestsNearDonor, acceptRequest };
