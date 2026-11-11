const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  variantInputSchema,
  updateVariantSchema,
  stockAdjustmentSchema,
  createCouponSchema,
  updateOrderStatusSchema
} = require('../validators/commonValidators');

const router = express.Router();

// Enforce admin role on every route under /api/admin
router.use(requireAuth, requireRole('admin'));

// Categories
router.get('/categories', adminController.listCategories);
router.post('/categories', validate(createCategorySchema), adminController.createCategory);
router.patch('/categories/:id', validate(updateCategorySchema), adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Products
router.get('/products', adminController.listProducts);
router.post('/products', validate(createProductSchema), adminController.createProduct);
router.patch('/products/:id', validate(updateProductSchema), adminController.updateProduct);
router.delete('/products/:id', adminController.deactivateProduct);

// Variants
router.post('/products/:productId/variants', validate(variantInputSchema), adminController.createVariant);
router.patch('/variants/:id', validate(updateVariantSchema), adminController.updateVariant);

// Inventory
router.post('/variants/:id/stock-adjustments', validate(stockAdjustmentSchema), adminController.adjustStock);
router.get('/inventory/low-stock', adminController.getLowStock);

// Orders
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrderById);
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), adminController.updateOrderStatus);

// Customers
router.get('/customers', adminController.listCustomers);
router.get('/customers/:id', adminController.getCustomerDetail);

// Coupons
router.get('/coupons', adminController.listCoupons);
router.post('/coupons', validate(createCouponSchema), adminController.createCoupon);
router.delete('/coupons/:id', adminController.deactivateCoupon);

// Audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// Reports
router.get('/reports/summary', adminController.getSummaryReport);
router.get('/reports/reconciliation', adminController.getReconciliationReport);

module.exports = router;

