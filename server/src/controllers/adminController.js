const catalogueService = require('../services/catalogueService');
const inventoryService = require('../services/inventoryService');
const orderService = require('../services/orderService');
const couponService = require('../services/couponService');
const reportService = require('../services/reportService');
const User = require('../models/User');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const AppError = require('../errors/AppError');

// Products
async function listProducts(req, res, next) {
  try {
    const result = await catalogueService.listAdminProducts(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const result = await catalogueService.createProductWithVariants(req.body, req.user);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await catalogueService.updateProduct(req.params.id, req.body, req.user);
    return res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

async function deactivateProduct(req, res, next) {
  try {
    // Never hard-delete a product that appears in any order
    const product = await catalogueService.deactivateProduct(req.params.id, req.user);
    return res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

// Variants
async function createVariant(req, res, next) {
  try {
    const variant = await catalogueService.createVariant(req.params.productId, req.body, req.user);
    return res.status(201).json({ variant });
  } catch (err) {
    next(err);
  }
}

async function updateVariant(req, res, next) {
  try {
    const variant = await catalogueService.updateVariant(req.params.id, req.body, req.user);
    return res.status(200).json({ variant });
  } catch (err) {
    next(err);
  }
}

// Inventory
async function adjustStock(req, res, next) {
  try {
    const { delta, reason } = req.body;
    const variant = await inventoryService.adjustStock(req.params.id, delta, reason, req.user);
    return res.status(200).json({ variant });
  } catch (err) {
    next(err);
  }
}

async function getLowStock(req, res, next) {
  try {
    const variants = await inventoryService.getLowStockVariants(req.query.threshold);
    return res.status(200).json({ variants });
  } catch (err) {
    next(err);
  }
}

// Categories
async function listCategories(req, res, next) {
  try {
    const categories = await catalogueService.listCategories(true);
    return res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await catalogueService.createCategory(req.body, req.user);
    return res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await catalogueService.updateCategory(req.params.id, req.body, req.user);
    return res.status(200).json({ category });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const result = await catalogueService.deleteOrDeactivateCategory(req.params.id, req.user);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// Orders
async function listOrders(req, res, next) {
  try {
    const result = await orderService.listAdminOrders(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getOrderById(req, res, next) {
  try {
    const order = await orderService.getAdminOrderById(req.params.id);
    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { to, expectedStatus } = req.body;
    const order = await orderService.updateOrderStatusByAdmin({
      orderId: req.params.id,
      to,
      expectedStatus,
      actor: req.user
    });
    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

// Customers
async function listCustomers(req, res, next) {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const filter = { role: 'customer' };
    if (search && search.trim()) {
      filter.$or = [
        { name: new RegExp(search.trim(), 'i') },
        { email: new RegExp(search.trim(), 'i') }
      ];
    }

    const total = await User.countDocuments(filter);
    const customers = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Attach order counts
    const customerIds = customers.map(c => c._id);
    const orderCounts = await Order.aggregate([
      { $match: { userId: { $in: customerIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const orderCountMap = {};
    orderCounts.forEach(o => { orderCountMap[o._id.toString()] = o.count; });

    const items = customers.map(c => ({
      ...c,
      orderCount: orderCountMap[c._id.toString()] || 0
    }));

    return res.status(200).json({
      items,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    next(err);
  }
}

async function getCustomerDetail(req, res, next) {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' }).lean();
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    const orders = await Order.find({ userId: customer._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      customer,
      orders
    });
  } catch (err) {
    next(err);
  }
}

// Coupons
async function listCoupons(req, res, next) {
  try {
    const coupons = await couponService.listCoupons(true);
    return res.status(200).json({ coupons });
  } catch (err) {
    next(err);
  }
}

async function createCoupon(req, res, next) {
  try {
    const coupon = await couponService.createCoupon(req.body, req.user);
    return res.status(201).json({ coupon });
  } catch (err) {
    next(err);
  }
}

async function deactivateCoupon(req, res, next) {
  try {
    const coupon = await couponService.deactivateCoupon(req.params.id, req.user);
    return res.status(200).json({ coupon });
  } catch (err) {
    next(err);
  }
}

// Audit Log (Append-only: no update or delete)
async function listAuditLogs(req, res, next) {
  try {
    const { entityType, actorId, from, to, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const filter = {};
    if (entityType && entityType.trim()) {
      filter.entityType = entityType.trim();
    }
    if (actorId && actorId.trim()) {
      filter.actorId = actorId.trim();
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      items: logs,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    next(err);
  }
}

// Reports
async function getSummaryReport(req, res, next) {
  try {
    const summary = await reportService.getSummaryReport(req.query);
    return res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

async function getReconciliationReport(req, res, next) {
  try {
    const report = await reportService.getReconciliationReport();
    return res.status(200).json(report);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  createVariant,
  updateVariant,
  adjustStock,
  getLowStock,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listOrders,
  getOrderById,
  updateOrderStatus,
  listCustomers,
  getCustomerDetail,
  listCoupons,
  createCoupon,
  deactivateCoupon,
  listAuditLogs,
  getSummaryReport,
  getReconciliationReport
};

