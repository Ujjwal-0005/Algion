const {
  createProductSchema,
  stockAdjustmentSchema,
  addCartItemSchema,
  payOrderSchema
} = require('../../src/validators/commonValidators');

describe('Validation Schemas (Zod)', () => {
  test('validates product creation schema', () => {
    const valid = {
      name: 'Test Shirt',
      description: 'Cotton shirt',
      categoryId: '507f1f77bcf86cd799439011',
      variants: [
        { sku: 'TS-BLK-M', priceMinor: 49900, stock: 10 }
      ]
    };
    expect(() => createProductSchema.parse(valid)).not.toThrow();

    // Rejects empty variants
    expect(() => createProductSchema.parse({ ...valid, variants: [] })).toThrow();
  });

  test('validates stock adjustment schema', () => {
    expect(() => stockAdjustmentSchema.parse({ delta: 5, reason: 'Restock' })).not.toThrow();
    // Rejects missing reason
    expect(() => stockAdjustmentSchema.parse({ delta: 5, reason: '' })).toThrow();
    // Rejects float delta
    expect(() => stockAdjustmentSchema.parse({ delta: 5.5, reason: 'Bad' })).toThrow();
  });

  test('validates cart item quantity between 1 and 10', () => {
    expect(() => addCartItemSchema.parse({ variantId: 'v1', quantity: 5 })).not.toThrow();
    expect(() => addCartItemSchema.parse({ variantId: 'v1', quantity: 0 })).toThrow();
    expect(() => addCartItemSchema.parse({ variantId: 'v1', quantity: 11 })).toThrow();
  });

  test('validates pay order outcome', () => {
    expect(() => payOrderSchema.parse({ outcome: 'success' })).not.toThrow();
    expect(() => payOrderSchema.parse({ outcome: 'decline' })).not.toThrow();
    expect(() => payOrderSchema.parse({ outcome: 'other' })).toThrow();
  });
});

