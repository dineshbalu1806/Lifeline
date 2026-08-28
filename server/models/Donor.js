const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const donorSchema = new mongoose.Schema(
  {
    personalInfo: {
      fullName: { type: String, required: true, trim: true },
      bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: true,
      },
      phone: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      address: { type: String },
      city: { type: String },
      district: { type: String },
      ward: { type: String },
      dob: { type: String },
      gender: { type: String, enum: ['male', 'female', 'other'] },
    },
    medicalInfo: {
      weight: { type: String },
      height: { type: String },
      conditions: [{ type: String }],
      onMedication: { type: Boolean, default: false },
      medications: { type: String },
      habits: [{ type: String }],
      recentDonation: { type: Boolean, default: false },
      additionalInfo: { type: String },
    },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    eligibleToDonate: { type: Boolean, default: true },
    registrationDate: { type: Date, default: Date.now },
    lastDonationDate: { type: Date },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

donorSchema.index({ location: '2dsphere' });

// Hash password before saving
donorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
donorSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Donor', donorSchema);
