const Coupon = require('../models/Coupon');
const AppError = require('../errors/AppError');
const auditService = require('./auditService');

async function listCoupons(includeInactive = true) {
  const query = includeInactive ? {} : { isActive: true };
  return Coupon.find(query).sort({ createdAt: -1 });
}

async function createCoupon(data, actor) {
  const code = data.code.toUpperCase().trim();
  const existing = await Coupon.findOne({ code });
  if (existing) {
    throw AppError.conflict('Coupon code already exists');
  }

  const coupon = await Coupon.create({
    code,
    type: data.type,
    value: data.value,
    minSubtotalMinor: data.minSubtotalMinor || 0,
    expiresAt: new Date(data.expiresAt),
    isActive: data.isActive !== undefined ? data.isActive : true
  });

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'coupon.create',
    entityType: 'Coupon',
    entityId: coupon._id,
    after: coupon.toJSON()
  });

  return coupon;
}

async function deactivateCoupon(id, actor) {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw AppError.notFound('Coupon not found');
  }

  const before = coupon.toJSON();
  coupon.isActive = false;
  await coupon.save();

  await auditService.createAuditLog({
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'coupon.deactivate',
    entityType: 'Coupon',
    entityId: coupon._id,
    before,
    after: coupon.toJSON()
  });

  return coupon;
}

module.exports = {
  listCoupons,
  createCoupon,
  deactivateCoupon
};

