const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, teardownTestDb, clearTestDb } = require('./setup');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const Product = require('../../src/models/Product');
const Variant = require('../../src/models/Variant');
const Order = require('../../src/models/Order');
const AuditLog = require('../../src/models/AuditLog');
const Coupon = require('../../src/models/Coupon');

beforeAll(async () => {
  await setupTestDb();
}, 60000);

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Acceptance Tests (A1 - A5) & Negative Scenarios', () => {
  let adminToken;
  let adminUser;
  let testCategory;
  let testProduct;
  let testVariant;

  async function createAdmin() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@example.com', password: 'Admin@12345' });
    
    // elevate to admin role
    await User.updateOne({ email: 'admin@example.com' }, { role: 'admin' });
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@12345' });
    
    adminToken = loginRes.body.token;
    adminUser = loginRes.body.user;
    return { adminToken, adminUser };
  }

  async function setupCatalog() {
    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' });
    testCategory = catRes.body.category;

    const prodRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Wireless Mouse',
        slug: 'wireless-mouse',
        description: 'Smooth optical mouse',
        categoryId: testCategory._id,
        variants: [
          { sku: 'WM-BLK', priceMinor: 150000, stock: 10 }
        ]
      });
    testProduct = prodRes.body.product;
    testVariant = prodRes.body.variants[0];
  }

  // Acceptance Test A1
  test('A1: Register, login, search catalogue, add to cart, checkout, pay with success', async () => {
    await createAdmin();
    await setupCatalog();

    // 1. Register customer
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice Customer', email: 'alice@example.com', password: 'Customer@12345' });
    expect(regRes.status).toBe(201);
    const customerToken = regRes.body.token;

    // 2. Add an address
    const addrRes = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        label: 'Home',
        fullName: 'Alice Customer',
        phone: '9876543210',
        line1: '123 Tech Park',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001'
      });
    expect(addrRes.status).toBe(201);
    const addressId = addrRes.body.user.addresses[0]._id;

    // 3. Search catalogue
    const catSearchRes = await request(app)
      .get('/api/products?q=Wireless')
      .expect(200);
    expect(catSearchRes.body.items.length).toBe(1);
    expect(catSearchRes.body.items[0].slug).toBe('wireless-mouse');

    // 4. Add to cart
    const cartRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ variantId: testVariant._id, quantity: 2 })
      .expect(200);
    expect(cartRes.body.cart.items.length).toBe(1);
    expect(cartRes.body.cart.items[0].quantity).toBe(2);

    // 5. Checkout
    const checkoutRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'checkout-a1-key')
      .send({ addressId })
      .expect(201);
    const order = checkoutRes.body.order;
    expect(order.status).toBe('PLACED');
    expect(order.totalMinor).toBeGreaterThan(0);

    // Stock should have decremented from 10 to 8
    const updatedVar = await Variant.findById(testVariant._id);
    expect(updatedVar.stock).toBe(8);

    // 6. Pay with success
    const payRes = await request(app)
      .post(`/api/orders/${order._id}/pay`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ outcome: 'success' })
      .expect(200);
    expect(payRes.body.order.status).toBe('PAID');
    expect(payRes.body.order.payment.status).toBe('captured');

    // 7. Verify order appears in customer's order list
    const myOrdersRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(myOrdersRes.body.items.length).toBe(1);
    expect(myOrdersRes.body.items[0]._id).toBe(order._id);

    // 8. Verify order appears in admin order list
    const adminOrdersRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminOrdersRes.body.items.some(o => o._id === order._id)).toBe(true);
  });

  // Acceptance Test A2
  test('A2: Two customers buy the last unit concurrently. Exactly one succeeds, one gets INSUFFICIENT_STOCK. Stock is never negative. Admin negative adjustment is rejected.', async () => {
    await createAdmin();
    
    // Create product with stock exactly 1
    const cat = await Category.create({ name: 'Rare Items', slug: 'rare' });
    const prod = await Product.create({
      name: 'Limited Watch',
      slug: 'limited-watch',
      description: 'Exclusive edition',
      categoryId: cat._id
    });
    const singleVariant = await Variant.create({
      productId: prod._id,
      sku: 'WATCH-1',
      priceMinor: 500000,
      stock: 1
    });

    // Create 2 customers with addresses
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cust 1', email: 'c1@example.com', password: 'Password123' });
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cust 2', email: 'c2@example.com', password: 'Password123' });

    const token1 = user1Res.body.token;
    const token2 = user2Res.body.token;

    const addr1 = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token1}`)
      .send({ label: 'H', fullName: 'C1', phone: '11', line1: 'L1', city: 'C', state: 'S', postalCode: 'P' });
    const addr2 = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token2}`)
      .send({ label: 'H', fullName: 'C2', phone: '22', line1: 'L2', city: 'C', state: 'S', postalCode: 'P' });

    // Both add 1 to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token1}`)
      .send({ variantId: singleVariant._id, quantity: 1 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token2}`)
      .send({ variantId: singleVariant._id, quantity: 1 });

    // Both checkout concurrently
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${token1}`)
        .set('Idempotency-Key', 'key-c1-race')
        .send({ addressId: addr1.body.user.addresses[0]._id }),
      request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${token2}`)
        .set('Idempotency-Key', 'key-c2-race')
        .send({ addressId: addr2.body.user.addresses[0]._id })
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const failRes = res1.status === 400 ? res1 : res2;
    expect(failRes.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Variant stock must be exactly 0, never negative
    const finalVariant = await Variant.findById(singleVariant._id);
    expect(finalVariant.stock).toBe(0);

    // Admin adjustment that would make stock negative is rejected
    const badAdjustRes = await request(app)
      .post(`/api/admin/variants/${singleVariant._id}/stock-adjustments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: -1, reason: 'Damaged item' });
    
    expect(badAdjustRes.status).toBe(400);
    expect(badAdjustRes.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // Acceptance Test A3
  test('A3: The same Idempotency-Key sent 5 times in parallel creates exactly one order. Same key with different body returns 409 DUPLICATE_REQUEST.', async () => {
    await createAdmin();
    await setupCatalog();

    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'Password123' });
    const token = userRes.body.token;

    const addrRes1 = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Addr1', fullName: 'Bob', phone: '123', line1: 'L1', city: 'C', state: 'S', postalCode: 'P' });
    const addrId1 = addrRes1.body.user.addresses[0]._id;

    const addrRes2 = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Addr2', fullName: 'Bob', phone: '456', line1: 'L2', city: 'C', state: 'S', postalCode: 'P' });
    const addrId2 = addrRes2.body.user.addresses[1]._id;

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId: testVariant._id, quantity: 1 });

    const key = 'parallel-key-123';

    // Send 5 parallel checkouts with the same key and same payload
    const parallelResponses = await Promise.all([
      request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ addressId: addrId1 }),
      request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ addressId: addrId1 }),
      request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ addressId: addrId1 }),
      request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ addressId: addrId1 }),
      request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ addressId: addrId1 })
    ]);

    // All should be successful (either 201 created or 200 returned duplicate order)
    parallelResponses.forEach(r => {
      expect([200, 201]).toContain(r.status);
    });

    // Check that exactly one order exists with this key
    const ordersInDb = await Order.find({ userId: userRes.body.user._id, idempotencyKey: key });
    expect(ordersInDb.length).toBe(1);

    // Send same key with different body (addrId2)
    const diffBodyRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ addressId: addrId2 });

    expect(diffBodyRes.status).toBe(409);
    expect(diffBodyRes.body.error.code).toBe('DUPLICATE_REQUEST');
  });

  // Acceptance Test A4
  test('A4: Simulated decline moves to PAYMENT_FAILED and restores stock. Cancelling PLACED or PAID restores stock once. Second cancel fails. Cancelling SHIPPED returns INVALID_TRANSITION. Concurrent cancel and pay produces one winner.', async () => {
    await createAdmin();
    await setupCatalog();

    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Charlie', email: 'charlie@example.com', password: 'Password123' });
    const token = userRes.body.token;

    const addrRes = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'H', fullName: 'Charlie', phone: '123', line1: 'L1', city: 'C', state: 'S', postalCode: 'P' });
    const addressId = addrRes.body.user.addresses[0]._id;

    // Subtest 1: Decline restores stock
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ variantId: testVariant._id, quantity: 2 });
    const chk1 = await request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k1').send({ addressId });
    const order1 = chk1.body.order;

    let varCurrent = await Variant.findById(testVariant._id);
    expect(varCurrent.stock).toBe(8); // 10 - 2

    const declineRes = await request(app)
      .post(`/api/orders/${order1._id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outcome: 'decline' })
      .expect(200);

    expect(declineRes.body.order.status).toBe('PAYMENT_FAILED');
    varCurrent = await Variant.findById(testVariant._id);
    expect(varCurrent.stock).toBe(10); // Restored!

    // Subtest 2: Cancelling PLACED order restores stock
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ variantId: testVariant._id, quantity: 3 });
    const chk2 = await request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k2').send({ addressId });
    const order2 = chk2.body.order;

    varCurrent = await Variant.findById(testVariant._id);
    expect(varCurrent.stock).toBe(7);

    const cancelRes = await request(app)
      .post(`/api/orders/${order2._id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancelRes.body.order.status).toBe('CANCELLED');

    varCurrent = await Variant.findById(testVariant._id);
    expect(varCurrent.stock).toBe(10); // Restored!

    // Second cancel fails
    const secondCancel = await request(app)
      .post(`/api/orders/${order2._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(secondCancel.status).toBe(409);
    expect(secondCancel.body.error.code).toBe('INVALID_TRANSITION');

    // Subtest 3: Cancelling a SHIPPED order returns INVALID_TRANSITION
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ variantId: testVariant._id, quantity: 1 });
    const chk3 = await request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k3').send({ addressId });
    const order3 = chk3.body.order;

    await request(app).post(`/api/orders/${order3._id}/pay`).set('Authorization', `Bearer ${token}`).send({ outcome: 'success' });
    await request(app).patch(`/api/admin/orders/${order3._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ to: 'PACKED', expectedStatus: 'PAID' });
    await request(app).patch(`/api/admin/orders/${order3._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ to: 'SHIPPED', expectedStatus: 'PACKED' });

    const cancelShipped = await request(app)
      .post(`/api/orders/${order3._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancelShipped.status).toBe(409);
    expect(cancelShipped.body.error.code).toBe('INVALID_TRANSITION');

    // Subtest 4: Concurrent cancel and pay produces exactly one winner
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ variantId: testVariant._id, quantity: 1 });
    const chk4 = await request(app).post('/api/checkout').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k4').send({ addressId });
    const order4 = chk4.body.order;

    const [racePay, raceCancel] = await Promise.all([
      request(app).post(`/api/orders/${order4._id}/pay`).set('Authorization', `Bearer ${token}`).send({ outcome: 'success' }),
      request(app).post(`/api/orders/${order4._id}/cancel`).set('Authorization', `Bearer ${token}`)
    ]);

    const raceStatuses = [racePay.status, raceCancel.status];
    // One succeeds (200) and the other fails due to invalid transition or conflict (409)
    expect(raceStatuses).toContain(200);
    expect(raceStatuses).toContain(409);
  });

  // Acceptance Test A5
  test('A5: Customer token on admin route returns 403. Customer requesting another customer order returns 404. Admin stale status returns 409. Reconciliation reports all checks pass.', async () => {
    await createAdmin();
    await setupCatalog();

    // Create Customer 1 and Customer 2
    const u1 = await request(app).post('/api/auth/register').send({ name: 'U1', email: 'u1@example.com', password: 'Password123' });
    const u2 = await request(app).post('/api/auth/register').send({ name: 'U2', email: 'u2@example.com', password: 'Password123' });
    const token1 = u1.body.token;
    const token2 = u2.body.token;

    // 1. Customer token on admin route returns 403
    const forbiddenRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${token1}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // 2. Customer 1 creates an order
    const addr = await request(app).post('/api/auth/addresses').set('Authorization', `Bearer ${token1}`).send({
      label: 'H', fullName: 'U1', phone: '1', line1: 'L', city: 'C', state: 'S', postalCode: 'P'
    });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token1}`).send({ variantId: testVariant._id, quantity: 1 });
    const chk = await request(app).post('/api/checkout').set('Authorization', `Bearer ${token1}`).set('Idempotency-Key', 'k-u1').send({ addressId: addr.body.user.addresses[0]._id });
    const orderU1 = chk.body.order;

    // Customer 2 requests Customer 1's order -> must return 404 NOT_FOUND, not 403
    const leakCheckRes = await request(app)
      .get(`/api/orders/${orderU1._id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(leakCheckRes.status).toBe(404);
    expect(leakCheckRes.body.error.code).toBe('NOT_FOUND');

    // Pay order so it is PAID
    await request(app).post(`/api/orders/${orderU1._id}/pay`).set('Authorization', `Bearer ${token1}`).send({ outcome: 'success' });

    // 3. Admin status change with stale expectedStatus returns 409
    const staleRes = await request(app)
      .patch(`/api/admin/orders/${orderU1._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to: 'PACKED', expectedStatus: 'PLACED' }); // Actual is PAID
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe('CONFLICT');

    // 4. Check reconciliation endpoint
    const reconRes = await request(app)
      .get('/api/admin/reports/reconciliation')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reconRes.status).toBe(200);
    expect(reconRes.body.allPassed).toBe(true);
    expect(reconRes.body.checks.dailySeriesMatchesGrossRevenue.pass).toBe(true);
    expect(reconRes.body.checks.statusCountsSumMatchesTotalOrders.pass).toBe(true);
    expect(reconRes.body.checks.variantInventoryIntegrity.pass).toBe(true);

    // Check report summary totals match sums directly computed over orders
    const summaryRes = await request(app)
      .get('/api/admin/reports/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(summaryRes.status).toBe(200);
    const summary = summaryRes.body.summary;

    const allDbOrders = await Order.find();
    expect(summary.totalOrders).toBe(allDbOrders.length);
    const paidDbOrders = allDbOrders.filter(o => ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(o.status));
    const expectedGross = paidDbOrders.reduce((sum, o) => sum + o.totalMinor, 0);
    expect(summary.grossRevenueMinor).toBe(expectedGross);
  });

  test('Negative cases: empty checkout, malformed input, unauthenticated requests', async () => {
    // 1. Unauthenticated request
    const unauth = await request(app).get('/api/cart');
    expect(unauth.status).toBe(401);
    expect(unauth.body.error.code).toBe('UNAUTHENTICATED');

    // 2. Malformed input
    const malformed = await request(app).post('/api/auth/register').send({ email: 'notanemail' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');

    // 3. Empty checkout
    const user = await request(app).post('/api/auth/register').send({ name: 'Empty', email: 'empty@example.com', password: 'Password123' });
    const token = user.body.token;
    const addr = await request(app).post('/api/auth/addresses').set('Authorization', `Bearer ${token}`).send({
      label: 'H', fullName: 'E', phone: '1', line1: 'L', city: 'C', state: 'S', postalCode: 'P'
    });

    const emptyCheckout = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'empty-key')
      .send({ addressId: addr.body.user.addresses[0]._id });
    expect(emptyCheckout.status).toBe(400);
    expect(emptyCheckout.body.error.code).toBe('VALIDATION_ERROR');
  });
});

