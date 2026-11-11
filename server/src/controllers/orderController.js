const orderService = require('../services/orderService');

async function checkout(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    const { order, isDuplicate } = await orderService.checkout({
      userId: req.user.userId,
      addressId: req.body.addressId,
      idempotencyKey,
      actor: req.user
    });

    const statusCode = isDuplicate ? 200 : 201;
    return res.status(statusCode).json({ order });
  } catch (err) {
    next(err);
  }
}

async function payOrder(req, res, next) {
  try {
    const order = await orderService.payOrder({
      orderId: req.params.id,
      userId: req.user.userId,
      method: req.body.method,
      outcome: req.body.outcome,
      actor: req.user
    });
    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelOrder({
      orderId: req.params.id,
      userId: req.user.userId,
      actor: req.user
    });
    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

async function listMyOrders(req, res, next) {
  try {
    const result = await orderService.getCustomerOrders(req.user.userId, req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getMyOrderById(req, res, next) {
  try {
    const order = await orderService.getCustomerOrderById(req.params.id, req.user.userId);
    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkout,
  payOrder,
  cancelOrder,
  listMyOrders,
  getMyOrderById
};

