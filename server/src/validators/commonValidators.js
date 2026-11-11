const { z } = require('zod');

// Catalogue validators
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().optional(),
  isActive: z.boolean().optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().optional(),
  isActive: z.boolean().optional()
});

const variantInputSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  attributes: z.record(z.string()).optional().default({}),
  priceMinor: z.number().int().nonnegative('Price cannot be negative'),
  stock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  isActive: z.boolean().optional().default(true)
});

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
  variants: z.array(variantInputSchema).min(1, 'At least one variant is required')
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional()
});

const updateVariantSchema = z.object({
  priceMinor: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  attributes: z.record(z.string()).optional(),
  isActive: z.boolean().optional()
});

const stockAdjustmentSchema = z.object({
  delta: z.number().int('Delta must be an integer'),
  reason: z.string().min(1, 'Reason is required')
});

// Cart & Coupon validators
const addCartItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().min(1).max(10)
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(10)
});

const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required')
});

const createCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  type: z.enum(['percent', 'fixed']),
  value: z.number().int().positive('Value must be positive'),
  minSubtotalMinor: z.number().int().nonnegative().default(0),
  expiresAt: z.string().datetime().or(z.string().min(1)),
  isActive: z.boolean().optional().default(true)
});

// Checkout and Order validators
const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Address ID is required')
});

const payOrderSchema = z.object({
  method: z.string().default('simulated'),
  outcome: z.enum(['success', 'decline'])
});

const updateOrderStatusSchema = z.object({
  to: z.enum(['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED', 'CANCELLED']),
  expectedStatus: z.enum(['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED', 'CANCELLED'])
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  variantInputSchema,
  updateVariantSchema,
  stockAdjustmentSchema,
  addCartItemSchema,
  updateCartItemSchema,
  applyCouponSchema,
  createCouponSchema,
  checkoutSchema,
  payOrderSchema,
  updateOrderStatusSchema
};

