const mongoose = require('mongoose');

const orderItemSnapshotSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  attributes: { type: Map, of: String, default: {} },
  unitPriceMinor: { type: Number, required: true },
  quantity: { type: Number, required: true },
  lineTotalMinor: { type: Number, required: true }
}, { _id: false });

const addressSnapshotSchema = new mongoose.Schema({
  label: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  from: { type: String, default: null },
  to: { type: String, required: true },
  at: { type: Date, default: Date.now },
  byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'captured', 'failed', 'refunded_simulated'],
    default: 'pending'
  },
  method: { type: String, default: 'simulated' },
  attempts: { type: Number, default: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED', 'CANCELLED'],
    default: 'PLACED',
    required: true,
    index: true
  },
  items: { type: [orderItemSnapshotSchema], required: true },
  shippingAddress: { type: addressSnapshotSchema, required: true },
  subtotalMinor: { type: Number, required: true },
  discountMinor: { type: Number, required: true, default: 0 },
  taxMinor: { type: Number, required: true },
  shippingMinor: { type: Number, required: true },
  totalMinor: { type: Number, required: true },
  couponCode: { type: String, default: null },
  idempotencyKey: { type: String, required: true },
  requestHash: { type: String, required: true },
  payment: { type: paymentSchema, default: () => ({}) },
  statusHistory: { type: [statusHistorySchema], default: [] }
}, {
  timestamps: true
});

orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

