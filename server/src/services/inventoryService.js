const Variant = require('../models/Variant');
const config = require('../config');
const AppError = require('../errors/AppError');
const auditService = require('./auditService');

async function adjustStock(variantId, delta, reason, actor) {
  if (!reason || !reason.trim()) {
    throw AppError.validation('A reason is required for stock adjustments');
  }

  if (typeof delta !== 'number' || !Number.isInteger(delta)) {
    throw AppError.validation('Stock delta must be an integer');
  }

  const variant = await Variant.findById(variantId);
  if (!variant) {
    throw AppError.notFound('Variant not found');
  }

  const beforeStock = variant.stock;

  // Conditional update ensuring stock does not become negative:
  // if delta is negative, stock must be >= Math.abs(delta)
  const filter = { _id: variantId };
  if (delta < 0) {
    filter.stock = { $gte: Math.abs(delta) };
  }

  const updatedVariant = await Variant.findOneAndUpdate(
    filter,
    { $inc: { stock: delta } },
    { new: true, runValidators: true }
  );

  if (!updatedVariant) {
    throw AppError.insufficientStock(
      `Cannot adjust stock by ${delta}. Resulting stock cannot be negative. Current stock is ${beforeStock}.`
    );
  }

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'variant.stock_adjust',
    entityType: 'Variant',
    entityId: updatedVariant._id,
    before: { stock: beforeStock },
    after: { stock: updatedVariant.stock },
    reason: reason.trim()
  });

  return updatedVariant;
}

async function getLowStockVariants(threshold = config.lowStockThreshold) {
  const limitThreshold = parseInt(threshold, 10) || config.lowStockThreshold;

  return Variant.find({
    stock: { $lte: limitThreshold },
    isActive: true
  })
    .populate('productId', 'name slug imageUrl')
    .sort({ stock: 1 });
}

module.exports = {
  adjustStock,
  getLowStockVariants
};

