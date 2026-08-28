const mongoose = require('mongoose');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const bloodInventorySchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
    },
    units: { type: Number, required: true, min: 0 },
    storageLocation: { type: String, required: true, trim: true },
    collectionDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['available', 'expired', 'discarded'],
      default: 'available',
    },
    notes: { type: String, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

bloodInventorySchema.index({ bloodGroup: 1, status: 1 });
bloodInventorySchema.index({ expiryDate: 1 });

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
