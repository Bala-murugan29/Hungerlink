const mongoose = require('mongoose');

function parseNumericQuantity(qty) {
  if (qty == null) return 0;
  if (typeof qty === 'number') return isFinite(qty) ? qty : 0;
  const match = String(qty).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

const DonationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Optional link to a specific request being fulfilled
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  foodType: { type: String, required: true },
  quantity: { type: String, required: true },
  // Numeric quantity for enforcement
  numericQuantity: { type: Number, default: 0 },
  // expiryTime removed to avoid client-side falsification; use manufacturingDate when provided
  expiryTime: { type: String },
  manufacturingDate: { type: String },
  location: {
    address: { type: String, required: true },
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    }
  },
  photo: { type: String },
  status: { type: String, enum: ['available', 'claimed', 'completed'], default: 'available' },
  aiQuality: { type: String, enum: ['fresh', 'check', 'not-suitable'] },
  aiAnalysis: {
    quality: { type: String, enum: ['fresh', 'check', 'not-suitable'] },
    confidence: { type: Number },
    reasons: { type: [String], default: [] },
    recommendations: { type: [String], default: [] }
  },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  claimantPhone: { type: String },
  donorPhone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

DonationSchema.index({ request: 1 });

DonationSchema.pre('save', function(next) {
  if (!this.numericQuantity || this.isModified('quantity')) {
    const match = String(this.quantity || '').match(/\d+(?:\.\d+)?/);
    this.numericQuantity = match ? Number(match[0]) : 0;
  }
  next();
});

module.exports = mongoose.model('Donation', DonationSchema);
