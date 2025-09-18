const mongoose = require('mongoose');

// Helper to parse a numeric quantity from a free-form string like "50 meals"
function parseNumericQuantity(qty) {
  if (qty == null) return 0;
  if (typeof qty === 'number') return isFinite(qty) ? qty : 0;
  const match = String(qty).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

const RequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodNeeded: { type: String, required: true },
  // Free-form quantity label kept for display/back-compat (e.g., "50 meals")
  quantity: { type: String, required: true },
  // Numeric fields for enforcement
  numericRequested: { type: Number, default: 0 },
  fulfilledQuantity: { type: Number, default: 0 }, // amount pledged/fulfilled so far
  location: {
    address: { type: String, required: true },
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    }
  },
  distance: { type: String },
  requesterName: { type: String },
  requesterPhone: { type: String },
  requesterType: { type: String, enum: ['ngo', 'individual'], required: true },
  status: { type: String, enum: ['open', 'accepted', 'fulfilled'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

// Compute numericRequested if not provided and keep it in sync when quantity label changes
RequestSchema.pre('save', function(next) {
  if (!this.numericRequested || this.isModified('quantity')) {
    this.numericRequested = parseNumericQuantity(this.quantity);
  }
  // Clamp fulfilledQuantity between 0 and numericRequested
  if (this.fulfilledQuantity == null) this.fulfilledQuantity = 0;
  this.fulfilledQuantity = Math.max(0, Math.min(this.fulfilledQuantity, this.numericRequested || 0));

  // Auto status based on fulfillment
  if (this.numericRequested > 0) {
    if (this.fulfilledQuantity >= this.numericRequested) this.status = 'fulfilled';
    else if (this.fulfilledQuantity > 0) this.status = 'accepted';
    else this.status = this.status || 'open';
  }
  next();
});

RequestSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  // Support both direct set and $set
  const target = update.$set || update;
  if (target.quantity || typeof target.numericRequested !== 'undefined') {
    const numeric = typeof target.numericRequested !== 'undefined'
      ? target.numericRequested
      : parseNumericQuantity(target.quantity);
    if (!update.$set) update.$set = {};
    update.$set.numericRequested = numeric;
    // Clean up to avoid conflicting direct set
    delete update.numericRequested;
  }
  next();
});

// Virtual and JSON transform to expose remainingQuantity
RequestSchema.virtual('remainingQuantity').get(function() {
  const total = this.numericRequested || 0;
  const fulfilled = this.fulfilledQuantity || 0;
  return Math.max(0, total - fulfilled);
});

RequestSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => ret
});

module.exports = mongoose.model('Request', RequestSchema);
