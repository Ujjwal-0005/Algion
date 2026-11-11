const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  attributes: {
    type: Map,
    of: String,
    default: {}
  },
  priceMinor: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Price must be an integer minor unit'
    }
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be an integer'
    }
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

variantSchema.index({ productId: 1, isActive: 1 });

module.exports = mongoose.model('Variant', variantSchema);

