const Order = require('../models/Order');
const Variant = require('../models/Variant');
const AuditLog = require('../models/AuditLog');
const config = require('../config');

/**
 * Summary report computed strictly via MongoDB aggregation over the orders collection.
 * No separate totals are stored.
 */
async function getSummaryReport({ from, to }) {
  const matchFilter = {};
  if (from || to) {
    matchFilter.createdAt = {};
    if (from) matchFilter.createdAt.$gte = new Date(from);
    if (to) matchFilter.createdAt.$lte = new Date(to);
  }

  // 1. Order counts by status
  const statusCountsAgg = await Order.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const orderCountsByStatus = {
    PLACED: 0,
    PAID: 0,
    PACKED: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    PAYMENT_FAILED: 0,
    CANCELLED: 0
  };
  let totalOrders = 0;
  statusCountsAgg.forEach(item => {
    orderCountsByStatus[item._id] = item.count;
    totalOrders += item.count;
  });

  // 2. Gross revenue: sum of totalMinor for PAID, PACKED, SHIPPED, and DELIVERED
  const grossRevenueAgg = await Order.aggregate([
    {
      $match: {
        ...matchFilter,
        status: { $in: ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] }
      }
    },
    {
      $group: {
        _id: null,
        grossRevenueMinor: { $sum: '$totalMinor' },
        paidOrderCount: { $sum: 1 }
      }
    }
  ]);

  const grossRevenueMinor = grossRevenueAgg[0]?.grossRevenueMinor || 0;
  const paidOrderCount = grossRevenueAgg[0]?.paidOrderCount || 0;
  const averageOrderValueMinor = paidOrderCount > 0 ? Math.round(grossRevenueMinor / paidOrderCount) : 0;

  const cancelledCount = orderCountsByStatus.CANCELLED || 0;
  const paymentFailedCount = orderCountsByStatus.PAYMENT_FAILED || 0;

  // 3. Daily revenue series
  const dailyRevenueAgg = await Order.aggregate([
    {
      $match: {
        ...matchFilter,
        status: { $in: ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenueMinor: { $sum: '$totalMinor' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const dailyRevenueSeries = dailyRevenueAgg.map(day => ({
    date: day._id,
    revenueMinor: day.revenueMinor,
    orderCount: day.orderCount
  }));

  // 4. Low stock variants
  const lowStockVariants = await Variant.find({
    stock: { $lte: config.lowStockThreshold },
    isActive: true
  })
    .populate('productId', 'name slug')
    .sort({ stock: 1 })
    .lean();

  return {
    totalOrders,
    orderCountsByStatus,
    grossRevenueMinor,
    averageOrderValueMinor,
    cancelledCount,
    paymentFailedCount,
    lowStockVariants,
    dailyRevenueSeries
  };
}

/**
 * Reconciliation checks to assert system invariants:
 * 1. The daily series sums to gross revenue.
 * 2. The status counts sum to the total order count.
 * 3. For each variant, stock plus the quantity reserved by active orders matches the recorded inventory movements.
 */
async function getReconciliationReport() {
  const orders = await Order.find().lean();
  const variants = await Variant.find().lean();
  const auditLogs = await AuditLog.find().lean();

  // Invariant 1: Daily series sums to gross revenue
  const revenueOrders = orders.filter(o => ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(o.status));
  const expectedGrossRevenue = revenueOrders.reduce((acc, o) => acc + o.totalMinor, 0);

  const dailyMap = {};
  revenueOrders.forEach(o => {
    const d = new Date(o.createdAt).toISOString().split('T')[0];
    dailyMap[d] = (dailyMap[d] || 0) + o.totalMinor;
  });
  const sumDailyRevenue = Object.values(dailyMap).reduce((acc, v) => acc + v, 0);
  const dailySeriesMatchesRevenue = sumDailyRevenue === expectedGrossRevenue;

  // Invariant 2: Status counts sum to total order count
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const sumStatusCounts = Object.values(statusCounts).reduce((acc, v) => acc + v, 0);
  const statusCountsSumMatchesTotal = sumStatusCounts === orders.length;

  // Invariant 3: Variant stock invariant
  // Active orders that currently hold/consume reserved stock: PLACED, PAID, PACKED, SHIPPED, DELIVERED
  // Note: PAYMENT_FAILED and CANCELLED have had their stock returned.
  // For each variant:
  // Current stock + sum of quantities across active orders (orders where stock was not restored)
  // should match the initial stock + net manual adjustments recorded in audit logs.
  let variantChecksPassed = true;
  const variantDetails = [];

  for (const variant of variants) {
    const vIdStr = variant._id.toString();

    // Sum quantity in active orders
    let reservedInActiveOrders = 0;
    for (const order of orders) {
      if (['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
        for (const item of order.items) {
          if (item.variantId.toString() === vIdStr) {
            reservedInActiveOrders += item.quantity;
          }
        }
      }
    }

    // Find initial stock from variant.create audit log
    const createLog = auditLogs.find(
      l => l.entityType === 'Variant' && l.entityId.toString() === vIdStr && l.action === 'variant.create'
    );
    // Alternatively from product.create
    let initialStock = 0;
    if (createLog && createLog.after && typeof createLog.after.stock === 'number') {
      initialStock = createLog.after.stock;
    } else {
      // Find from product.create log if created during product creation
      const prodCreateLog = auditLogs.find(
        l => l.entityType === 'Product' && l.action === 'product.create' &&
             Array.isArray(l.after?.variants) &&
             l.after.variants.some(v => v._id.toString() === vIdStr)
      );
      if (prodCreateLog) {
        const vEntry = prodCreateLog.after.variants.find(v => v._id.toString() === vIdStr);
        initialStock = vEntry ? vEntry.stock : 0;
      }
    }

    // Sum manual stock adjustments from audit logs
    const adjustments = auditLogs.filter(
      l => l.entityType === 'Variant' && l.entityId.toString() === vIdStr && l.action === 'variant.stock_adjust'
    );
    let netAdjustments = 0;
    adjustments.forEach(adj => {
      if (adj.before && adj.after && typeof adj.after.stock === 'number' && typeof adj.before.stock === 'number') {
        netAdjustments += (adj.after.stock - adj.before.stock);
      }
    });

    const expectedTotalStock = initialStock + netAdjustments;
    const actualTotalStock = variant.stock + reservedInActiveOrders;

    const matches = expectedTotalStock === actualTotalStock;
    if (!matches) {
      variantChecksPassed = false;
    }

    variantDetails.push({
      variantId: variant._id,
      sku: variant.sku,
      currentStock: variant.stock,
      reservedInActiveOrders,
      initialStock,
      netAdjustments,
      expectedTotalStock,
      actualTotalStock,
      matches
    });
  }

  const allPassed = dailySeriesMatchesRevenue && statusCountsSumMatchesTotal && variantChecksPassed;

  return {
    allPassed,
    checks: {
      dailySeriesMatchesGrossRevenue: {
        pass: dailySeriesMatchesRevenue,
        sumDailyRevenue,
        expectedGrossRevenue
      },
      statusCountsSumMatchesTotalOrders: {
        pass: statusCountsSumMatchesTotal,
        sumStatusCounts,
        totalOrders: orders.length
      },
      variantInventoryIntegrity: {
        pass: variantChecksPassed,
        variantsChecked: variants.length,
        details: variantDetails
      }
    }
  };
}

module.exports = {
  getSummaryReport,
  getReconciliationReport
};

