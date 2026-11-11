const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Variant = require('../models/Variant');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const AppError = require('../errors/AppError');
const auditService = require('./auditService');
const pricingService = require('./pricingService');
const { computeRequestHash } = require('../utils/idempotency');
const { assertValidTransition, shouldRestoreStock } = require('./orderStateMachine');
const { withTransactionRetry } = require('../utils/transactionHelper');
const config = require('../config');

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Checkout service with atomic MongoDB transaction and idempotency
 */
async function checkout({ userId, addressId, idempotencyKey, actor }) {
  if (!idempotencyKey || !idempotencyKey.trim()) {
    throw AppError.validation('Idempotency-Key header is required');
  }

  const normalizedIdempotencyKey = idempotencyKey.trim();
  const requestHash = computeRequestHash({ addressId });

  return withTransactionRetry(async (session) => {
    // 1. Check existing order with (userId, idempotencyKey)
    const existingOrder = await Order.findOne({
      userId,
      idempotencyKey: normalizedIdempotencyKey
    }).session(session);

    if (existingOrder) {
      if (existingOrder.requestHash === requestHash) {
        return { order: existingOrder, isDuplicate: true };
      }
      throw AppError.duplicateRequest('Idempotency key reused with different request payload');
    }

    // 2. Load the cart
    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw AppError.validation('Cart is empty. Cannot checkout an empty cart.');
    }

    // Load user and validate address
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw AppError.validation('Shipping address not found in user profile');
    }

    // Snapshot address
    const shippingAddressSnapshot = {
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country
    };

    // 3. Re-price everything from database values
    const variantIds = cart.items.map(i => i.variantId);
    const variants = await Variant.find({ _id: { $in: variantIds } })
      .populate('productId')
      .session(session);

    const variantMap = new Map();
    variants.forEach(v => variantMap.set(v._id.toString(), v));

    const itemSnapshots = [];
    for (const item of cart.items) {
      const v = variantMap.get(item.variantId.toString());
      if (!v || !v.isActive || (v.productId && !v.productId.isActive)) {
        throw AppError.validation(`Product or variant '${item.variantId}' is no longer active.`);
      }

      itemSnapshots.push({
        variantId: v._id,
        productName: v.productId ? v.productId.name : 'Unknown Product',
        sku: v.sku,
        attributes: v.attributes || {},
        unitPriceMinor: v.priceMinor,
        quantity: item.quantity
      });
    }

    // Coupon check
    let coupon = null;
    if (cart.couponCode) {
      coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true }).session(session);
    }

    const pricing = pricingService.calculateCartPricing({
      items: itemSnapshots,
      coupon,
      taxRateBps: config.taxRateBps,
      shippingFlatMinor: config.shippingFlatMinor,
      freeShippingMinMinor: config.freeShippingMinMinor
    });

    // 4. Conditional stock decrements
    for (const item of cart.items) {
      const updatedVariant = await Variant.findOneAndUpdate(
        {
          _id: item.variantId,
          isActive: true,
          stock: { $gte: item.quantity }
        },
        { $inc: { stock: -item.quantity } },
        { session, new: true, runValidators: true }
      );

      if (!updatedVariant) {
        const currentVariant = await Variant.findById(item.variantId).session(session);
        const availableStock = currentVariant ? currentVariant.stock : 0;
        throw AppError.insufficientStock(
          `Insufficient stock for variant '${item.variantId}'. Available: ${availableStock}, requested: ${item.quantity}`,
          { variantId: item.variantId, availableStock, requestedQuantity: item.quantity }
        );
      }
    }

    // 5. Create order in PLACED state
    const orderNumber = generateOrderNumber();
    const order = new Order({
      orderNumber,
      userId,
      status: 'PLACED',
      items: pricing.items,
      shippingAddress: shippingAddressSnapshot,
      subtotalMinor: pricing.subtotalMinor,
      discountMinor: pricing.discountMinor,
      taxMinor: pricing.taxMinor,
      shippingMinor: pricing.shippingMinor,
      totalMinor: pricing.totalMinor,
      couponCode: pricing.couponApplied ? pricing.couponApplied.code : null,
      idempotencyKey: normalizedIdempotencyKey,
      requestHash,
      payment: {
        status: 'pending',
        method: 'simulated',
        attempts: 0
      },
      statusHistory: [{
        from: null,
        to: 'PLACED',
        at: new Date(),
        byUserId: userId
      }]
    });

    await order.save({ session });

    // Clear user cart
    cart.items = [];
    cart.couponCode = null;
    await cart.save({ session });

    // Write audit entry
    await auditService.createAuditLog({
      actorId: userId,
      actorRole: actor.role || 'customer',
      action: 'order.create',
      entityType: 'Order',
      entityId: order._id,
      after: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalMinor: order.totalMinor
      },
      session
    });

    return { order, isDuplicate: false };
  });
}

/**
 * Simulated payment endpoint: POST /api/orders/:id/pay
 */
async function payOrder({ orderId, userId, method = 'simulated', outcome, actor }) {
  if (!['success', 'decline'].includes(outcome)) {
    throw AppError.validation("Outcome must be either 'success' or 'decline'");
  }

  return withTransactionRetry(async (session) => {
    const order = await Order.findOne({ _id: orderId, userId }).session(session);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    const currentStatus = order.status;
    // If order was already cancelled or payment failed, cannot pay
    if (currentStatus !== 'PLACED') {
      throw AppError.invalidTransition(
        `Cannot process payment for order in '${currentStatus}' status`
      );
    }

    if (outcome === 'success') {
      assertValidTransition('PLACED', 'PAID');

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: 'PLACED' },
        {
          $set: {
            status: 'PAID',
            'payment.status': 'captured',
            'payment.method': method
          },
          $inc: { 'payment.attempts': 1 },
          $push: {
            statusHistory: {
              from: 'PLACED',
              to: 'PAID',
              at: new Date(),
              byUserId: userId
            }
          }
        },
        { session, new: true }
      );

      if (!updatedOrder) {
        throw AppError.invalidTransition('Order status changed concurrently or is not PLACED');
      }

      await auditService.createAuditLog({
        actorId: userId,
        actorRole: actor.role || 'customer',
        action: 'order.pay_success',
        entityType: 'Order',
        entityId: order._id,
        before: { status: 'PLACED', paymentStatus: 'pending' },
        after: { status: 'PAID', paymentStatus: 'captured' },
        session
      });

      return updatedOrder;
    } else {
      assertValidTransition('PLACED', 'PAYMENT_FAILED');

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: 'PLACED' },
        {
          $set: {
            status: 'PAYMENT_FAILED',
            'payment.status': 'failed',
            'payment.method': method
          },
          $inc: { 'payment.attempts': 1 },
          $push: {
            statusHistory: {
              from: 'PLACED',
              to: 'PAYMENT_FAILED',
              at: new Date(),
              byUserId: userId
            }
          }
        },
        { session, new: true }
      );

      if (!updatedOrder) {
        throw AppError.invalidTransition('Order status changed concurrently or is not PLACED');
      }

      // Restore stock in the same transaction
      for (const item of updatedOrder.items) {
        await Variant.updateOne(
          { _id: item.variantId },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }

      await auditService.createAuditLog({
        actorId: userId,
        actorRole: actor.role || 'customer',
        action: 'order.pay_failed',
        entityType: 'Order',
        entityId: order._id,
        before: { status: 'PLACED', paymentStatus: 'pending' },
        after: { status: 'PAYMENT_FAILED', paymentStatus: 'failed' },
        reason: 'Payment declined by simulator',
        session
      });

      return updatedOrder;
    }
  });
}

/**
 * Customer cancels their own order: POST /api/orders/:id/cancel
 * Allowed only from PLACED or PAID.
 * When cancelling PLACED, we conditionally update matching status: 'PLACED'
 * so concurrent pay moves it to PAID and fails cancel, or cancel moves to CANCELLED and fails pay.
 */
async function cancelOrder({ orderId, userId, actor }) {
  return withTransactionRetry(async (session) => {
    const order = await Order.findOne({ _id: orderId, userId }).session(session);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.status !== 'PLACED') {
      throw AppError.invalidTransition(
        `Cannot cancel order in '${order.status}' status. Only PLACED orders can be cancelled.`
      );
    }

    const currentStatus = order.status;
    const paymentStatusUpdate = order.payment.status;

    // Use conditional update on PLACED so concurrent pay and cancel cannot both succeed
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'PLACED' },
      {
        $set: {
          status: 'CANCELLED',
          'payment.status': paymentStatusUpdate
        },
        $push: {
          statusHistory: {
            from: currentStatus,
            to: 'CANCELLED',
            at: new Date(),
            byUserId: userId
          }
        }
      },
      { session, new: true }
    );

    if (!updatedOrder) {
      throw AppError.invalidTransition(
        'Order cancellation failed because status changed concurrently'
      );
    }

    // Restore stock in the same transaction
    for (const item of updatedOrder.items) {
      await Variant.updateOne(
        { _id: item.variantId },
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    await auditService.createAuditLog({
      actorId: userId,
      actorRole: actor.role || 'customer',
      action: 'order.cancel',
      entityType: 'Order',
      entityId: order._id,
      before: { status: currentStatus, paymentStatus: order.payment.status },
      after: { status: 'CANCELLED', paymentStatus: paymentStatusUpdate },
      reason: 'Cancelled by customer',
      session
    });

    return updatedOrder;
  });
}

/**
 * Customer orders queries
 */
async function getCustomerOrders(userId, { page = 1, limit = 10 }) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const total = await Order.countDocuments({ userId });
  const orders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  return {
    items: orders,
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1
  };
}

async function getCustomerOrderById(orderId, userId) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    throw AppError.notFound('Order not found');
  }
  return order;
}

// Admin Order Management
async function listAdminOrders({ status, search, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const filter = {};
  if (status && status.trim()) {
    filter.status = status.trim();
  }

  if (search && search.trim()) {
    const term = search.trim();
    const users = await User.find({ email: new RegExp(term, 'i') }).select('_id');
    const userIds = users.map(u => u._id);

    filter.$or = [
      { orderNumber: new RegExp(term, 'i') },
      { userId: { $in: userIds } }
    ];
  }

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  return {
    items: orders,
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1
  };
}

async function getAdminOrderById(orderId) {
  const order = await Order.findById(orderId).populate('userId', 'name email addresses');
  if (!order) {
    throw AppError.notFound('Order not found');
  }
  return order;
}

async function updateOrderStatusByAdmin({ orderId, to, expectedStatus, actor }) {
  return withTransactionRetry(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    // Check if the current order in DB matches expectedStatus.
    // If not, it's a conflict!
    if (order.status !== expectedStatus) {
      throw AppError.conflict(
        `Order status mismatch. Expected '${expectedStatus}' but found '${order.status}'`
      );
    }

    // Now validate whether the transition from expectedStatus to 'to' is allowed
    assertValidTransition(expectedStatus, to);

    const paymentStatusUpdate = (to === 'CANCELLED' && order.status === 'PAID')
      ? 'refunded_simulated'
      : order.payment.status;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: expectedStatus },
      {
        $set: {
          status: to,
          'payment.status': paymentStatusUpdate
        },
        $push: {
          statusHistory: {
            from: expectedStatus,
            to,
            at: new Date(),
            byUserId: actor.userId
          }
        }
      },
      { session, new: true }
    );

    if (!updatedOrder) {
      throw AppError.conflict(
        `Concurrent update detected. Expected status '${expectedStatus}' was not matched.`
      );
    }

    if (shouldRestoreStock(expectedStatus, to)) {
      for (const item of updatedOrder.items) {
        await Variant.updateOne(
          { _id: item.variantId },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
    }

    await auditService.createAuditLog({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'order.status_change',
      entityType: 'Order',
      entityId: order._id,
      before: { status: expectedStatus },
      after: { status: to },
      reason: `Admin updated status from ${expectedStatus} to ${to}`,
      session
    });

    return updatedOrder;
  });
}

module.exports = {
  checkout,
  payOrder,
  cancelOrder,
  getCustomerOrders,
  getCustomerOrderById,
  listAdminOrders,
  getAdminOrderById,
  updateOrderStatusByAdmin
};
