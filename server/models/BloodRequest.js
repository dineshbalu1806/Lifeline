const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requesterName: { type: String, required: true },
    requesterPhone: { type: String, required: true },
    requesterEmail: { type: String },
    relationship: { type: String },

    patientName: { type: String, required: true },
    patientAge: { type: Number },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Any'],
      required: true,
    },
    unitsNeeded: { type: Number, required: true, min: 1 },

    reason: { type: String },
    medicalInfo: { type: String },

    hospitalName: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String },
    ward: { type: String },
    hospitalAddress: { type: String },
    hospitalPhone: { type: String },
    doctorName: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    urgency: { type: String, enum: ['yes', 'no'], default: 'no' },
    bloodNeededBy: {
      type: String,
      enum: ['immediate', '24hours', '2days', 'week'],
      default: 'week',
    },

    status: {
      type: String,
      enum: ['OPEN', 'CONFIRMED', 'CANCELLED'],
      default: 'OPEN',
    },

    unitsAccepted: { type: Number, default: 0 },

    acceptedBy: [
      {
        donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
        donorName: String,
        unitsAccepted: Number,
        acceptedAt: { type: Date, default: Date.now },
      },
    ],

    notifiedDonors: [
      {
        donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
        donorName: String,
        donorEmail: String,
        donorPhone: String,
        status: {
          type: String,
          enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
          default: 'PENDING',
        },
        notifiedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

bloodRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
