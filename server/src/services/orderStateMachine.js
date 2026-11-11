const AppError = require('../errors/AppError');

/**
 * Valid state transitions definition:
 * PLACED -> PAID, PAYMENT_FAILED, CANCELLED
 * PAID -> PACKED, CANCELLED
 * PACKED -> SHIPPED
 * SHIPPED -> DELIVERED
 * PAYMENT_FAILED, DELIVERED, and CANCELLED are terminal.
 */
const VALID_TRANSITIONS = {
  PLACED: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  PAYMENT_FAILED: [],
  DELIVERED: [],
  CANCELLED: []
};

// States where stock must be restored back into inventory
const STOCK_RESTORING_TARGETS = ['PAYMENT_FAILED', 'CANCELLED'];

function isValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

function assertValidTransition(fromStatus, toStatus) {
  if (!isValidTransition(fromStatus, toStatus)) {
    throw AppError.invalidTransition(
      `Cannot transition order from status '${fromStatus}' to '${toStatus}'`
    );
  }
}

function shouldRestoreStock(fromStatus, toStatus) {
  return STOCK_RESTORING_TARGETS.includes(toStatus);
}

module.exports = {
  VALID_TRANSITIONS,
  STOCK_RESTORING_TARGETS,
  isValidTransition,
  assertValidTransition,
  shouldRestoreStock
};

