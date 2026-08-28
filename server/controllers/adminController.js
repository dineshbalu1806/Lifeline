const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');
const Donation = require('../models/Donation');
const { sendLowStockAlert } = require('../utils/email');
const { emitToAdmins } = require('../utils/socket');
const { BLOOD_GROUPS } = require('../models/BloodInventory');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── Admin Auth ────────────────────────────────────────────────

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
    }

    const admin = await Admin.create({ name, email, password });
    const token = generateToken(admin._id);
    const adminData = admin.toObject();
    delete adminData.password;

    res.status(201).json({ success: true, token, admin: adminData });
  } catch (error) {
    console.error('RegisterAdmin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id);
    const adminData = admin.toObject();
    delete adminData.password;

    res.json({ success: true, token, admin: adminData });
  } catch (error) {
    console.error('LoginAdmin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const adminData = req.admin.toObject();
    delete adminData.password;
    res.json({ success: true, admin: adminData });
  } catch (error) {
    console.error('GetAdminMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Dashboard Stats ───────────────────────────────────────────

const getStats = async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    const totalRequests = await BloodRequest.countDocuments();
    const pendingRequests = await BloodRequest.countDocuments({ status: 'OPEN' });
    const confirmedRequests = await BloodRequest.countDocuments({ status: 'CONFIRMED' });
    const totalDonations = await Donation.countDocuments();

    // Stock summary by blood group
    const available = await BloodInventory.find({ status: 'available' }).lean();
    const stockByGroup = {};
    for (const bg of BloodInventory.BLOOD_GROUPS) {
      stockByGroup[bg] = 0;
    }
    available.forEach((item) => {
      if (stockByGroup[item.bloodGroup] !== undefined) {
        stockByGroup[item.bloodGroup] += item.units;
      }
    });

    const totalStock = Object.values(stockByGroup).reduce((a, b) => a + b, 0);

    // Low-stock alerts (under 5 units)
    const LOW_STOCK_THRESHOLD = 5;
    const lowStockAlerts = BloodInventory.BLOOD_GROUPS.filter(
      (bg) => stockByGroup[bg] > 0 && stockByGroup[bg] < LOW_STOCK_THRESHOLD
    ).map((bg) => ({ bloodGroup: bg, units: stockByGroup[bg] }));

    // Expiring soon (within 7 days)
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await BloodInventory.find({
      status: 'available',
      expiryDate: { $gte: now, $lte: sevenDaysLater },
    })
      .sort({ expiryDate: 1 })
      .lean();

    // Auto-mark expired items
    await BloodInventory.updateMany(
      { status: 'available', expiryDate: { $lt: now } },
      { $set: { status: 'expired' } }
    );

    res.json({
      success: true,
      stats: {
        totalDonors,
        totalRequests,
        pendingRequests,
        confirmedRequests,
        totalDonations,
        totalStock,
        stockByGroup,
        lowStockAlerts,
        expiringSoon,
      },
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Inventory Management ──────────────────────────────────────

const getInventory = async (req, res) => {
  try {
    const { status, bloodGroup } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    // Auto-mark expired
    await BloodInventory.updateMany(
      { status: 'available', expiryDate: { $lt: new Date() } },
      { $set: { status: 'expired' } }
    );

    const items = await BloodInventory.find(filter)
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name email')
      .lean();

    res.json({ success: true, count: items.length, items });
  } catch (error) {
    console.error('GetInventory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addInventory = async (req, res) => {
  try {
    const { bloodGroup, units, storageLocation, collectionDate, expiryDate, notes } = req.body;

    if (!bloodGroup || !units || !storageLocation || !collectionDate) {
      return res.status(400).json({ success: false, message: 'Blood group, units, storage location and collection date are required' });
    }

    // Auto-calculate expiry if not provided (42 days from collection)
    let calculatedExpiry = expiryDate;
    if (!calculatedExpiry) {
      const coll = new Date(collectionDate);
      calculatedExpiry = new Date(coll.getTime() + 42 * 24 * 60 * 60 * 1000);
    }

    const item = await BloodInventory.create({
      bloodGroup,
      units: Number(units),
      storageLocation,
      collectionDate: new Date(collectionDate),
      expiryDate: new Date(calculatedExpiry),
      notes: notes || '',
      addedBy: req.admin._id,
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error('AddInventory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateInventory = async (req, res) => {
  try {
    const { units, storageLocation, expiryDate, status, notes } = req.body;
    const item = await BloodInventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    if (units !== undefined) item.units = Number(units);
    if (storageLocation !== undefined) item.storageLocation = storageLocation;
    if (expiryDate !== undefined) item.expiryDate = new Date(expiryDate);
    if (status !== undefined) item.status = status;
    if (notes !== undefined) item.notes = notes;

    await item.save();
// Check for low stock and alert
      const available = await BloodInventory.find({ status: 'available' }).lean();
      const stockByGroup = {};
      for (const bg of BloodInventory.BLOOD_GROUPS) stockByGroup[bg] = 0;
      available.forEach((i) => { if (stockByGroup[i.bloodGroup] !== undefined) stockByGroup[i.bloodGroup] += i.units; });

      const lowStockGroups = BloodInventory.BLOOD_GROUPS
        .filter((bg) => stockByGroup[bg] > 0 && stockByGroup[bg] < 5)
        .map((bg) => ({ bloodGroup: bg, units: stockByGroup[bg] }));

      if (lowStockGroups.length > 0) {
        const admins = await Admin.find().select('email').lean();
        admins.forEach((a) => {
          sendLowStockAlert(a.email, lowStockGroups).catch(() => {});
        });
        emitToAdmins('lowStockAlert', { groups: lowStockGroups });
      }

      res.json({ success: true, item });
    } catch (error) {
      console.error('AddInventory error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

const deleteInventory = async (req, res) => {
  try {
    const item = await BloodInventory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    res.json({ success: true, message: 'Inventory item removed' });
  } catch (error) {
    console.error('DeleteInventory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkExpiry = async (req, res) => {
  try {
    const result = await BloodInventory.updateMany(
      { status: 'available', expiryDate: { $lt: new Date() } },
      { $set: { status: 'expired' } }
    );
    res.json({ success: true, expired: result.modifiedCount });
  } catch (error) {
    console.error('CheckExpiry error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Donor Management ──────────────────────────────────────────

const getDonors = async (req, res) => {
  try {
    const { search, bloodGroup, city, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { 'personalInfo.fullName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { 'personalInfo.phone': { $regex: search, $options: 'i' } },
      ];
    }
    if (bloodGroup) filter['personalInfo.bloodGroup'] = bloodGroup;
    if (city) filter['personalInfo.city'] = { $regex: city, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [donors, total] = await Promise.all([
      Donor.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Donor.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: donors.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      donors,
    });
  } catch (error) {
    console.error('GetDonors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateDonor = async (req, res) => {
  try {
    const { eligibleToDonate, verified } = req.body;
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    if (eligibleToDonate !== undefined) donor.eligibleToDonate = eligibleToDonate;
    if (verified !== undefined) donor.verified = verified;

    await donor.save();
    const updated = donor.toObject();
    delete updated.password;

    res.json({ success: true, donor: updated });
  } catch (error) {
    console.error('UpdateDonor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Request Management ────────────────────────────────────────

const getRequests = async (req, res) => {
  try {
    const { status, bloodType, city, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (bloodType) filter.bloodType = bloodType;
    if (city) filter.city = { $regex: city, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      BloodRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      BloodRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: requests.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      requests,
    });
  } catch (error) {
    console.error('GetRequests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['OPEN', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const request = await BloodRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('UpdateRequestStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error('DeleteRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Analytics ────────────────────────────────────────────────

const getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [donations30d, requests30d, allDonations, donationsOverTime, requestsOverTime] = await Promise.all([
      Donation.countDocuments({ date: { $gte: thirtyDaysAgo } }),
      BloodRequest.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Donation.find().lean(),
      Donation.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
      BloodRequest.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const totalRequests = await BloodRequest.countDocuments();
    const confirmedRequests = await BloodRequest.countDocuments({ status: 'CONFIRMED' });
    const fulfillmentRate = totalRequests > 0 ? Math.round((confirmedRequests / totalRequests) * 100) : 0;

    // Stock by group
    const available = await BloodInventory.find({ status: 'available' }).lean();
    const stockByGroup = {};
    BLOOD_GROUPS.forEach((bg) => { stockByGroup[bg] = 0; });
    available.forEach((item) => { if (stockByGroup[item.bloodGroup] !== undefined) stockByGroup[item.bloodGroup] += item.units; });

    // Top cities
    const topCities = await Donation.aggregate([
      { $group: { _id: '$center', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        donations30d,
        requests30d,
        fulfillmentRate,
        totalDonations: allDonations.length,
        totalRequests,
        confirmedRequests,
        donationsOverTime,
        requestsOverTime,
        stockByGroup,
        topCities,
      },
    });
  } catch (error) {
    console.error('GetAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  registerAdmin, loginAdmin, getMe,
  getStats,
  getInventory, addInventory, updateInventory, deleteInventory, checkExpiry,
  getDonors, updateDonor,
  getRequests, updateRequestStatus, deleteRequest,
  getAnalytics,
};
