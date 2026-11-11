const express = require('express');
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  checkoutSchema,
  payOrderSchema
} = require('../validators/commonValidators');

const router = express.Router();

router.use(requireAuth);

// Checkout
router.post('/checkout', validate(checkoutSchema), orderController.checkout);

// Orders
router.get('/orders', orderController.listMyOrders);
router.get('/orders/:id', orderController.getMyOrderById);
router.post('/orders/:id/pay', validate(payOrderSchema), orderController.payOrder);
router.post('/orders/:id/cancel', orderController.cancelOrder);

module.exports = router;

