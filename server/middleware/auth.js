const jwt = require('jsonwebtoken');
const Donor = require('../models/Donor');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const donor = await Donor.findById(decoded.id).select('-password');

    if (!donor) {
      return res.status(401).json({ success: false, message: 'Not authorized, donor not found' });
    }

    req.donor = donor;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };
