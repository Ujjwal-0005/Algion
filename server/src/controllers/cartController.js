const cartService = require('../services/cartService');

async function getCart(req, res, next) {
  try {
    const cart = await cartService.getPricedCart(req.user.userId);
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const cart = await cartService.addItem(req.user.userId, req.body);
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const cart = await cartService.updateItemQuantity(
      req.user.userId,
      req.params.variantId,
      req.body.quantity
    );
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const cart = await cartService.removeItem(req.user.userId, req.params.variantId);
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function applyCoupon(req, res, next) {
  try {
    const cart = await cartService.applyCoupon(req.user.userId, req.body.code);
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function removeCoupon(req, res, next) {
  try {
    const cart = await cartService.removeCoupon(req.user.userId);
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  applyCoupon,
  removeCoupon
};

