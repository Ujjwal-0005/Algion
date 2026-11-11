const Cart = require('../models/Cart');
const Variant = require('../models/Variant');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const AppError = require('../errors/AppError');
const pricingService = require('./pricingService');
const config = require('../config');

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [], couponCode: null });
  }
  return cart;
}

async function getPricedCart(userId) {
  const cart = await getOrCreateCart(userId);

  if (cart.items.length === 0) {
    return {
      items: [],
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      shippingMinor: 0,
      totalMinor: 0,
      couponApplied: null,
      couponCode: cart.couponCode,
      hasWarnings: false
    };
  }

  // Load variants with their products
  const variantIds = cart.items.map(i => i.variantId);
  const variants = await Variant.find({ _id: { $in: variantIds } }).populate('productId');
  const variantMap = new Map();
  variants.forEach(v => variantMap.set(v._id.toString(), v));

  let hasWarnings = false;
  const pricedLines = [];

  for (const item of cart.items) {
    const v = variantMap.get(item.variantId.toString());
    const isInactive = !v || !v.isActive || (v.productId && !v.productId.isActive);
    const currentStock = v ? v.stock : 0;
    const isStockBelowQty = currentStock < item.quantity;
    const isOutOfStock = currentStock === 0;

    let warning = null;
    if (isInactive) {
      warning = 'This product or variant is no longer available';
      hasWarnings = true;
    } else if (isOutOfStock) {
      warning = 'This item is currently out of stock';
      hasWarnings = true;
    } else if (isStockBelowQty) {
      warning = `Only ${currentStock} item(s) available in stock`;
      hasWarnings = true;
    }

    pricedLines.push({
      variantId: item.variantId,
      sku: v ? v.sku : 'UNKNOWN',
      productName: v && v.productId ? v.productId.name : 'Unknown Product',
      productSlug: v && v.productId ? v.productId.slug : '',
      imageUrl: v && v.productId ? v.productId.imageUrl : null,
      attributes: v ? Object.fromEntries(v.attributes || new Map()) : {},
      unitPriceMinor: v ? v.priceMinor : 0,
      quantity: item.quantity,
      currentStock,
      isInactive,
      warning
    });
  }

  // Find active coupon if present
  let coupon = null;
  if (cart.couponCode) {
    coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true });
  }

  // Calculate pricing for valid active items
  const validPricedLines = pricedLines.filter(l => !l.isInactive);
  let pricingResult = {
    subtotalMinor: 0,
    discountMinor: 0,
    taxMinor: 0,
    shippingMinor: 0,
    totalMinor: 0,
    couponApplied: null
  };

  if (validPricedLines.length > 0) {
    pricingResult = pricingService.calculateCartPricing({
      items: validPricedLines,
      coupon,
      taxRateBps: config.taxRateBps,
      shippingFlatMinor: config.shippingFlatMinor,
      freeShippingMinMinor: config.freeShippingMinMinor
    });
  }

  return {
    items: pricedLines.map(line => {
      const priced = pricingResult.items?.find(i => i.variantId.toString() === line.variantId.toString());
      return {
        ...line,
        lineTotalMinor: priced ? priced.lineTotalMinor : 0
      };
    }),
    subtotalMinor: pricingResult.subtotalMinor,
    discountMinor: pricingResult.discountMinor,
    taxMinor: pricingResult.taxMinor,
    shippingMinor: pricingResult.shippingMinor,
    totalMinor: pricingResult.totalMinor,
    couponApplied: pricingResult.couponApplied,
    couponCode: cart.couponCode,
    hasWarnings
  };
}

async function addItem(userId, { variantId, quantity }) {
  if (quantity < 1 || quantity > 10) {
    throw AppError.validation('Quantity must be between 1 and 10');
  }

  const variant = await Variant.findById(variantId).populate('productId');
  if (!variant || !variant.isActive || (variant.productId && !variant.productId.isActive)) {
    throw AppError.notFound('Variant not found or is inactive');
  }

  if (quantity > variant.stock) {
    throw AppError.insufficientStock(
      `Requested quantity (${quantity}) exceeds available stock (${variant.stock})`
    );
  }

  const cart = await getOrCreateCart(userId);
  const existingItemIndex = cart.items.findIndex(
    i => i.variantId.toString() === variantId.toString()
  );

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].quantity + quantity;
    if (newQty > 10) {
      throw AppError.validation('Cannot have more than 10 of any item in cart');
    }
    if (newQty > variant.stock) {
      throw AppError.insufficientStock(
        `Total quantity (${newQty}) exceeds available stock (${variant.stock})`
      );
    }
    cart.items[existingItemIndex].quantity = newQty;
  } else {
    cart.items.push({ variantId, quantity });
  }

  await cart.save();
  return getPricedCart(userId);
}

async function updateItemQuantity(userId, variantId, quantity) {
  if (quantity < 1 || quantity > 10) {
    throw AppError.validation('Quantity must be between 1 and 10');
  }

  const variant = await Variant.findById(variantId);
  if (!variant || !variant.isActive) {
    throw AppError.notFound('Variant not found or inactive');
  }

  if (quantity > variant.stock) {
    throw AppError.insufficientStock(
      `Requested quantity (${quantity}) exceeds available stock (${variant.stock})`
    );
  }

  const cart = await getOrCreateCart(userId);
  const item = cart.items.find(i => i.variantId.toString() === variantId.toString());
  if (!item) {
    throw AppError.notFound('Item not in cart');
  }

  item.quantity = quantity;
  await cart.save();
  return getPricedCart(userId);
}

async function removeItem(userId, variantId) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter(i => i.variantId.toString() !== variantId.toString());
  await cart.save();
  return getPricedCart(userId);
}

async function applyCoupon(userId, code) {
  if (!code || !code.trim()) {
    throw AppError.validation('Coupon code is required');
  }

  const upperCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: upperCode, isActive: true });
  if (!coupon) {
    throw AppError.notFound('Invalid or inactive coupon code');
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw AppError.validation('Coupon has expired');
  }

  const cart = await getOrCreateCart(userId);
  cart.couponCode = upperCode;
  await cart.save();

  return getPricedCart(userId);
}

async function removeCoupon(userId) {
  const cart = await getOrCreateCart(userId);
  cart.couponCode = null;
  await cart.save();
  return getPricedCart(userId);
}

module.exports = {
  getOrCreateCart,
  getPricedCart,
  addItem,
  updateItemQuantity,
  removeItem,
  applyCoupon,
  removeCoupon
};

