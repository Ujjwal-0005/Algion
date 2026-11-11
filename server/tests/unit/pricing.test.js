const { calculateCartPricing } = require('../../src/services/pricingService');
const AppError = require('../../src/errors/AppError');

describe('Pricing Service (Pure calculation unit tests)', () => {
  const sampleItems = [
    { variantId: 'v1', unitPriceMinor: 20000, quantity: 2 }, // 40,000 paise (₹400)
    { variantId: 'v2', unitPriceMinor: 15000, quantity: 1 }  // 15,000 paise (₹150)
  ]; // Total subtotal: 55,000 paise (₹550)

  test('calculates correct subtotal, tax and shipping without coupon', () => {
    const result = calculateCartPricing({
      items: sampleItems,
      coupon: null,
      taxRateBps: 1800, // 18%
      shippingFlatMinor: 4900, // ₹49
      freeShippingMinMinor: 99900 // ₹999
    });

    expect(result.subtotalMinor).toBe(55000);
    expect(result.discountMinor).toBe(0);
    // Taxable: 55000. Tax = round(55000 * 1800 / 10000) = round(9900) = 9900
    expect(result.taxMinor).toBe(9900);
    // Shipping: 55000 < 99900 -> 4900
    expect(result.shippingMinor).toBe(4900);
    // Total = 55000 - 0 + 9900 + 4900 = 69800
    expect(result.totalMinor).toBe(69800);
  });

  test('applies percentage coupon with minimum subtotal check', () => {
    const coupon = {
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minSubtotalMinor: 50000,
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true
    };

    const result = calculateCartPricing({
      items: sampleItems, // 55,000 paise
      coupon,
      taxRateBps: 1800,
      shippingFlatMinor: 4900,
      freeShippingMinMinor: 99900
    });

    expect(result.subtotalMinor).toBe(55000);
    // 10% of 55000 = 5500
    expect(result.discountMinor).toBe(5500);
    // Taxable: 55000 - 5500 = 49500
    // Tax: round(49500 * 1800 / 10000) = 8910
    expect(result.taxMinor).toBe(8910);
    expect(result.shippingMinor).toBe(4900);
    expect(result.totalMinor).toBe(49500 + 8910 + 4900);
  });

  test('discount never exceeds the subtotal (discount cap)', () => {
    const hugeDiscountCoupon = {
      code: 'HUGE1000',
      type: 'fixed',
      value: 100000, // ₹1,000 discount on ₹550 cart
      minSubtotalMinor: 1000,
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true
    };

    const result = calculateCartPricing({
      items: sampleItems, // 55,000 paise
      coupon: hugeDiscountCoupon
    });

    // Discount capped at subtotal
    expect(result.discountMinor).toBe(55000);
    // Taxable: 0
    expect(result.taxMinor).toBe(0);
    // Shipping applied since post-discount subtotal is 0 (< 99900)
    expect(result.shippingMinor).toBe(4900);
    expect(result.totalMinor).toBe(4900);
  });

  test('applies free shipping when post-discount subtotal reaches threshold', () => {
    const highValueItems = [
      { variantId: 'v3', unitPriceMinor: 100000, quantity: 1 } // ₹1,000 (100,000 paise)
    ];

    const result = calculateCartPricing({
      items: highValueItems,
      coupon: null,
      freeShippingMinMinor: 99900
    });

    expect(result.subtotalMinor).toBe(100000);
    expect(result.shippingMinor).toBe(0); // Free shipping!
  });

  test('rejects expired coupon or coupon that does not meet minSubtotal', () => {
    const expiredCoupon = {
      code: 'OLD',
      type: 'fixed',
      value: 5000,
      minSubtotalMinor: 1000,
      expiresAt: new Date(Date.now() - 10000),
      isActive: true
    };

    const result = calculateCartPricing({
      items: sampleItems,
      coupon: expiredCoupon
    });

    expect(result.discountMinor).toBe(0);
  });

  test('throws VALIDATION_ERROR on empty cart', () => {
    expect(() => {
      calculateCartPricing({ items: [] });
    }).toThrow(AppError);
  });
});

