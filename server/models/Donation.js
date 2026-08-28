const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    donorEmail: { type: String, required: true },
    donorName: { type: String, required: true },
    bloodGroup: { type: String },
    date: { type: Date, required: true },
    center: { type: String },
    patientName: { type: String },
    patientPhone: { type: String },
    units: { type: Number, default: 450 },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
    type: {
      type: String,
      enum: ['manual', 'request_accepted'],
      default: 'manual',
    },
    status: { type: String, default: 'Completed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donation', donationSchema);
