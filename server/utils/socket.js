const jwt = require('jsonwebtoken');
const Donor = require('../models/Donor');
const Admin = require('../models/Admin');

let io = null;

const setupSocket = (server) => {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const donor = await Donor.findById(decoded.id).select('-password');
      if (donor) {
        socket.donorId = donor._id.toString();
        socket.userType = 'donor';
        return next();
      }

      const admin = await Admin.findById(decoded.id).select('-password');
      if (admin) {
        socket.adminId = admin._id.toString();
        socket.userType = 'admin';
        return next();
      }

      next(new Error('User not found'));
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] ${socket.userType} connected: ${socket.donorId || socket.adminId}`);

    if (socket.donorId) {
      socket.join(`donor:${socket.donorId}`);
    }
    if (socket.adminId) {
      socket.join('admin:all');
    }

    socket.on('disconnect', () => {
      console.log(`[SOCKET] ${socket.userType} disconnected: ${socket.donorId || socket.adminId}`);
    });
  });

  return io;
};

const emitToDonor = (donorId, event, data) => {
  if (!io) return;
  io.to(`donor:${donorId}`).emit(event, data);
};

const emitToAdmins = (event, data) => {
  if (!io) return;
  io.to('admin:all').emit(event, data);
};

const emitToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

const getIO = () => io;

module.exports = { setupSocket, emitToDonor, emitToAdmins, emitToAll, getIO };
