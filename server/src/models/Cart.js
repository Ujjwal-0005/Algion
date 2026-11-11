const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Quantity cannot exceed 10'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer'
    }
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: {
    type: [cartItemSchema],
    default: []
  },
  couponCode: { type: String, default: null, uppercase: true, trim: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);

