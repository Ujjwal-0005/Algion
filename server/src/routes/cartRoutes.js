const express = require('express');
const cartController = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  addCartItemSchema,
  updateCartItemSchema,
  applyCouponSchema
} = require('../validators/commonValidators');

const router = express.Router();

router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addItem);
router.patch('/items/:variantId', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:variantId', cartController.removeItem);
router.post('/coupon', validate(applyCouponSchema), cartController.applyCoupon);
router.delete('/coupon', cartController.removeCoupon);

module.exports = router;

