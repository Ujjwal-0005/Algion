const {
  isValidTransition,
  assertValidTransition,
  shouldRestoreStock,
  VALID_TRANSITIONS
} = require('../../src/services/orderStateMachine');
const AppError = require('../../src/errors/AppError');

describe('Order State Machine', () => {
  test('allows defined transitions', () => {
    expect(isValidTransition('PLACED', 'PAID')).toBe(true);
    expect(isValidTransition('PLACED', 'PAYMENT_FAILED')).toBe(true);
    expect(isValidTransition('PLACED', 'CANCELLED')).toBe(true);

    expect(isValidTransition('PAID', 'PACKED')).toBe(true);
    expect(isValidTransition('PAID', 'CANCELLED')).toBe(true);

    expect(isValidTransition('PACKED', 'SHIPPED')).toBe(true);
    expect(isValidTransition('SHIPPED', 'DELIVERED')).toBe(true);
  });

  test('forbids invalid transitions', () => {
    // Cannot cancel after packed or shipped
    expect(isValidTransition('PACKED', 'CANCELLED')).toBe(false);
    expect(isValidTransition('SHIPPED', 'CANCELLED')).toBe(false);
    expect(isValidTransition('DELIVERED', 'CANCELLED')).toBe(false);

    // Terminal states cannot transition to anything
    expect(isValidTransition('PAYMENT_FAILED', 'PAID')).toBe(false);
    expect(isValidTransition('DELIVERED', 'CANCELLED')).toBe(false);
    expect(isValidTransition('CANCELLED', 'PAID')).toBe(false);

    // Cannot skip states
    expect(isValidTransition('PLACED', 'SHIPPED')).toBe(false);
    expect(isValidTransition('PAID', 'DELIVERED')).toBe(false);
  });

  test('assertValidTransition throws AppError for invalid transition', () => {
    expect(() => {
      assertValidTransition('SHIPPED', 'CANCELLED');
    }).toThrow(AppError);
  });

  test('correctly identifies states that restore stock', () => {
    expect(shouldRestoreStock('PLACED', 'PAYMENT_FAILED')).toBe(true);
    expect(shouldRestoreStock('PLACED', 'CANCELLED')).toBe(true);
    expect(shouldRestoreStock('PAID', 'CANCELLED')).toBe(true);

    expect(shouldRestoreStock('PLACED', 'PAID')).toBe(false);
    expect(shouldRestoreStock('PAID', 'PACKED')).toBe(false);
    expect(shouldRestoreStock('PACKED', 'SHIPPED')).toBe(false);
    expect(shouldRestoreStock('SHIPPED', 'DELIVERED')).toBe(false);
  });
});

