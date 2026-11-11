const AppError = require('../errors/AppError');

// Default constants (in minor units / basis points)
const DEFAULT_TAX_RATE_BPS = 1800; // 18%
const DEFAULT_SHIPPING_FLAT_MINOR = 4900; // ₹49
const DEFAULT_FREE_SHIPPING_MIN_MINOR = 99900; // ₹999

/**
 * Pure calculation function for order pricing.
 * Everything is in whole minor units (paise). Floats are never returned.
 */
function calculateCartPricing({
  items = [],
  coupon = null,
  taxRateBps = DEFAULT_TAX_RATE_BPS,
  shippingFlatMinor = DEFAULT_SHIPPING_FLAT_MINOR,
  freeShippingMinMinor = DEFAULT_FREE_SHIPPING_MIN_MINOR
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.validation('Cart cannot be empty for checkout');
  }

  // 1. Calculate subtotal
  let subtotalMinor = 0;
  const pricedLines = items.map(item => {
    const lineTotalMinor = item.unitPriceMinor * item.quantity;
    subtotalMinor += lineTotalMinor;
    return {
      ...item,
      lineTotalMinor
    };
  });

  // 2. Calculate discount
  let discountMinor = 0;
  let couponApplied = null;

  if (coupon && coupon.isActive) {
    const isExpired = new Date(coupon.expiresAt).getTime() < Date.now();
    const meetsMin = subtotalMinor >= (coupon.minSubtotalMinor || 0);

    if (!isExpired && meetsMin) {
      if (coupon.type === 'percent') {
        discountMinor = Math.round((subtotalMinor * coupon.value) / 100);
      } else if (coupon.type === 'fixed') {
        discountMinor = coupon.value;
      }
      // Discount never exceeds subtotal
      if (discountMinor > subtotalMinor) {
        discountMinor = subtotalMinor;
      }
      couponApplied = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountMinor
      };
    }
  }

  // 3. Tax calculation: on (subtotal minus discount)
  const taxableMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxMinor = Math.round((taxableMinor * taxRateBps) / 10000);

  // 4. Shipping calculation: based on post-discount subtotal
  let shippingMinor = shippingFlatMinor;
  if (taxableMinor >= freeShippingMinMinor) {
    shippingMinor = 0;
  }

  // 5. Total calculation
  const totalMinor = subtotalMinor - discountMinor + taxMinor + shippingMinor;

  return {
    items: pricedLines,
    subtotalMinor,
    discountMinor,
    taxMinor,
    shippingMinor,
    totalMinor,
    couponApplied
  };
}

module.exports = {
  calculateCartPricing,
  DEFAULT_TAX_RATE_BPS,
  DEFAULT_SHIPPING_FLAT_MINOR,
  DEFAULT_FREE_SHIPPING_MIN_MINOR
};

