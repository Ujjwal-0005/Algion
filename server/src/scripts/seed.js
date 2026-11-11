const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Variant = require('../models/Variant');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

async function seed() {
  try {
    console.log(`Connecting to MongoDB at ${config.mongodbUri}...`);
    await mongoose.connect(config.mongodbUri);

    const isReset = process.argv.includes('--reset');
    if (isReset) {
      console.log('Reset flag detected. Clearing seeded collections...');
      await User.deleteMany({});
      await Category.deleteMany({});
      await Product.deleteMany({});
      await Variant.deleteMany({});
      await Cart.deleteMany({});
      await Coupon.deleteMany({});
      await Order.deleteMany({});
      await AuditLog.deleteMany({});
      console.log('Collections cleared.');
    }

    // 1. Create Admin
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
    let admin = await User.findOne({ email: 'admin@example.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Store Administrator',
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        addresses: [{
          label: 'HQ Office',
          fullName: 'Store Admin',
          phone: '9999999999',
          line1: '100 Commerce Boulevard',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
          isDefault: true
        }]
      });
      console.log('Created admin user: admin@example.com');
    }

    // 2. Create Two Customers
    const customerPasswordHash = await bcrypt.hash('Customer@12345', 10);
    let customer1 = await User.findOne({ email: 'customer1@example.com' });
    if (!customer1) {
      customer1 = await User.create({
        name: 'Rahul Sharma',
        email: 'customer1@example.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
        addresses: [{
          label: 'Home',
          fullName: 'Rahul Sharma',
          phone: '9876543210',
          line1: 'Flat 402, Lotus Apartments',
          line2: 'Koramangala 4th Block',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560034',
          country: 'India',
          isDefault: true
        }]
      });
      console.log('Created customer 1: customer1@example.com');
    }

    let customer2 = await User.findOne({ email: 'customer2@example.com' });
    if (!customer2) {
      customer2 = await User.create({
        name: 'Priya Patel',
        email: 'customer2@example.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
        addresses: [{
          label: 'Home',
          fullName: 'Priya Patel',
          phone: '9822334455',
          line1: '12 Green Park Society',
          city: 'Ahmedabad',
          state: 'Gujarat',
          postalCode: '380015',
          country: 'India',
          isDefault: true
        }]
      });
      console.log('Created customer 2: customer2@example.com');
    }

    // 3. Create Four Categories
    const categoriesData = [
      { name: 'Apparel', slug: 'apparel' },
      { name: 'Footwear', slug: 'footwear' },
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Accessories', slug: 'accessories' }
    ];

    const categoryDocs = {};
    for (const cat of categoriesData) {
      let doc = await Category.findOne({ slug: cat.slug });
      if (!doc) {
        doc = await Category.create({ name: cat.name, slug: cat.slug, isActive: true });
        console.log(`Created category: ${cat.name}`);
      }
      categoryDocs[cat.slug] = doc;
    }

    // 4. Create Twelve Products with Variants
    const productsData = [
      // Apparel
      {
        name: 'Classic Crewneck T-Shirt',
        slug: 'classic-crewneck-tshirt',
        description: 'Premium organic cotton t-shirt built for daily comfort.',
        categorySlug: 'apparel',
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
        variants: [
          { sku: 'TS-BLK-S', attributes: { size: 'S', color: 'Black' }, priceMinor: 49900, stock: 15 },
          { sku: 'TS-BLK-M', attributes: { size: 'M', color: 'Black' }, priceMinor: 49900, stock: 25 },
          { sku: 'TS-WHT-L', attributes: { size: 'L', color: 'White' }, priceMinor: 49900, stock: 10 }
        ]
      },
      {
        name: 'Slim Fit Denim Jeans',
        slug: 'slim-fit-denim-jeans',
        description: 'Durable stretch denim with contemporary slim styling.',
        categorySlug: 'apparel',
        imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500',
        variants: [
          { sku: 'JN-30-BLU', attributes: { waist: '30', color: 'Indigo' }, priceMinor: 149900, stock: 12 },
          { sku: 'JN-32-BLU', attributes: { waist: '32', color: 'Indigo' }, priceMinor: 149900, stock: 18 }
        ]
      },
      {
        name: 'Zip-Up Fleece Hoodie',
        slug: 'zip-up-fleece-hoodie',
        description: 'Warm, breathable fleece hoodie with deep front pockets.',
        categorySlug: 'apparel',
        imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500',
        variants: [
          { sku: 'HD-GRY-M', attributes: { size: 'M', color: 'Heather Grey' }, priceMinor: 189900, stock: 8 },
          { sku: 'HD-GRY-L', attributes: { size: 'L', color: 'Heather Grey' }, priceMinor: 189900, stock: 4 }
        ]
      },

      // Footwear
      {
        name: 'Performance Running Shoes',
        slug: 'performance-running-shoes',
        description: 'Lightweight running shoes featuring responsive foam cushioning.',
        categorySlug: 'footwear',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
        variants: [
          { sku: 'SH-RUN-8', attributes: { size: '8' }, priceMinor: 299900, stock: 7 },
          { sku: 'SH-RUN-9', attributes: { size: '9' }, priceMinor: 299900, stock: 14 },
          { sku: 'SH-RUN-10', attributes: { size: '10' }, priceMinor: 299900, stock: 3 }
        ]
      },
      {
        name: 'Leather Low-Top Sneakers',
        slug: 'leather-low-top-sneakers',
        description: 'Clean minimalist white leather sneakers for everyday outfits.',
        categorySlug: 'footwear',
        imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500',
        variants: [
          { sku: 'SH-SNK-8', attributes: { size: '8', color: 'White' }, priceMinor: 249900, stock: 9 },
          { sku: 'SH-SNK-9', attributes: { size: '9', color: 'White' }, priceMinor: 249900, stock: 12 }
        ]
      },
      {
        name: 'Waterproof Trail Boots',
        slug: 'waterproof-trail-boots',
        description: 'Rugged hiking boots with waterproof membrane and high-traction grip.',
        categorySlug: 'footwear',
        imageUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500',
        variants: [
          { sku: 'BT-TRL-9', attributes: { size: '9', color: 'Brown' }, priceMinor: 399900, stock: 5 },
          { sku: 'BT-TRL-10', attributes: { size: '10', color: 'Brown' }, priceMinor: 399900, stock: 6 }
        ]
      },

      // Electronics
      {
        name: 'Noise-Cancelling Wireless Headphones',
        slug: 'noise-cancelling-wireless-headphones',
        description: 'Over-ear headphones with active noise cancellation and 30-hour battery.',
        categorySlug: 'electronics',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        variants: [
          { sku: 'HP-NC-BLK', attributes: { color: 'Matte Black' }, priceMinor: 499900, stock: 20 },
          { sku: 'HP-NC-SLV', attributes: { color: 'Silver' }, priceMinor: 499900, stock: 11 }
        ]
      },
      {
        name: 'Compact Mechanical Keyboard',
        slug: 'compact-mechanical-keyboard',
        description: '75% compact layout with hot-swappable switches and RGB backlighting.',
        categorySlug: 'electronics',
        imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
        variants: [
          { sku: 'KB-RED-SW', attributes: { switch: 'Linear Red' }, priceMinor: 349900, stock: 16 },
          { sku: 'KB-BRN-SW', attributes: { switch: 'Tactile Brown' }, priceMinor: 349900, stock: 14 }
        ]
      },
      {
        name: 'Ergonomic Wireless Mouse',
        slug: 'ergonomic-wireless-mouse',
        description: 'Precision ergonomic mouse engineered to reduce wrist strain.',
        categorySlug: 'electronics',
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
        variants: [
          { sku: 'MS-ERGO-BLK', attributes: { color: 'Black' }, priceMinor: 159900, stock: 22 }
        ]
      },

      // Accessories
      {
        name: 'Waxed Canvas Backpack',
        slug: 'waxed-canvas-backpack',
        description: 'Water-resistant everyday backpack with padded 15-inch laptop sleeve.',
        categorySlug: 'accessories',
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        variants: [
          { sku: 'BP-CAN-OLV', attributes: { color: 'Olive Green' }, priceMinor: 279900, stock: 15 },
          { sku: 'BP-CAN-KHK', attributes: { color: 'Khaki' }, priceMinor: 279900, stock: 9 }
        ]
      },
      {
        name: 'Full Grain Leather Bi-Fold Wallet',
        slug: 'full-grain-leather-wallet',
        description: 'Handcrafted slim wallet with RFID blocking layer and six card slots.',
        categorySlug: 'accessories',
        imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500',
        variants: [
          { sku: 'WL-LTR-BRN', attributes: { color: 'Tan Brown' }, priceMinor: 99900, stock: 30 }
        ]
      },
      {
        name: 'Stainless Steel Insulated Bottle',
        slug: 'stainless-steel-insulated-bottle',
        description: 'Double-wall vacuum bottle keeping drinks cold for 24h or hot for 12h.',
        categorySlug: 'accessories',
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
        variants: [
          { sku: 'BT-750-SLV', attributes: { capacity: '750ml', finish: 'Brushed Steel' }, priceMinor: 79900, stock: 25 },
          { sku: 'BT-750-BLK', attributes: { capacity: '750ml', finish: 'Matte Black' }, priceMinor: 79900, stock: 18 }
        ]
      }
    ];

    for (const p of productsData) {
      let product = await Product.findOne({ slug: p.slug });
      if (!product) {
        product = await Product.create({
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: categoryDocs[p.categorySlug]._id,
          imageUrl: p.imageUrl,
          isActive: true
        });

        const createdVariants = [];
        for (const v of p.variants) {
          const varDoc = await Variant.create({
            productId: product._id,
            sku: v.sku,
            attributes: v.attributes || {},
            priceMinor: v.priceMinor,
            stock: v.stock,
            isActive: true
          });
          createdVariants.push(varDoc);
        }

        await AuditLog.create({
          actorId: admin._id,
          actorRole: 'admin',
          action: 'product.create',
          entityType: 'Product',
          entityId: product._id,
          after: {
            ...product.toJSON(),
            variants: createdVariants.map(v => v.toJSON())
          }
        });

        console.log(`Created product: ${p.name}`);
      }
    }

    // 5. Create Coupon: WELCOME10 (10% off, min subtotal 50,000 paise = ₹500)
    let coupon = await Coupon.findOne({ code: 'WELCOME10' });
    if (!coupon) {
      coupon = await Coupon.create({
        code: 'WELCOME10',
        type: 'percent',
        value: 10,
        minSubtotalMinor: 50000,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true
      });
      console.log('Created coupon: WELCOME10');
    }

    console.log('Database seed completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();

