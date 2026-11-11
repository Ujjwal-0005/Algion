const mongoose = require('mongoose');

module.exports = {
  name: '001_indexes.js',
  async up() {
    const db = mongoose.connection.db;

    // Users
    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    // Categories
    await db.collection('categories').createIndex({ name: 1 }, { unique: true });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });

    // Products
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ categoryId: 1, isActive: 1 });
    await db.collection('products').createIndex({ name: 'text', description: 'text' });

    // Variants
    await db.collection('variants').createIndex({ sku: 1 }, { unique: true });
    await db.collection('variants').createIndex({ productId: 1, isActive: 1 });

    // Cart
    await db.collection('carts').createIndex({ userId: 1 }, { unique: true });

    // Coupon
    await db.collection('coupons').createIndex({ code: 1 }, { unique: true });

    // Orders
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ userId: 1, idempotencyKey: 1 }, { unique: true });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });

    // AuditLog
    await db.collection('auditlogs').createIndex({ createdAt: -1 });
    await db.collection('auditlogs').createIndex({ entityType: 1 });
    await db.collection('auditlogs').createIndex({ actorId: 1 });

    console.log('001_indexes applied successfully');
  }
};

