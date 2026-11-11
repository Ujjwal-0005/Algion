const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, addressSchema } = require('../validators/authValidators');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

// Address subdocument endpoints
router.post('/addresses', requireAuth, validate(addressSchema), authController.addAddress);
router.patch('/addresses/:addressId', requireAuth, validate(addressSchema.partial()), authController.updateAddress);
router.delete('/addresses/:addressId', requireAuth, authController.deleteAddress);

module.exports = router;

