import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Checkout() {
  const { cart, fetchCart } = useCart();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    fullName: user?.name || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false
  });

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);

  // Simulated Payment states
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Select default address if present
    if (user.addresses && user.addresses.length > 0) {
      const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
      setSelectedAddressId(def._id);
    } else {
      setShowNewAddress(true);
    }
  }, [user]);

  // Idempotency Key handling
  function getIdempotencyKey() {
    let key = sessionStorage.getItem('checkout_idempotency_key');
    if (!key) {
      key = 'idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('checkout_idempotency_key', key);
    }
    return key;
  }

  async function handleAddNewAddress(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddress)
      });
      await refreshUser();
      const added = data.user.addresses[data.user.addresses.length - 1];
      setSelectedAddressId(added._id);
      setShowNewAddress(false);
    } catch (err) {
      setOrderError(err.message || 'Failed to save address');
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      setOrderError('Please select or add a shipping address.');
      return;
    }

    setPlacingOrder(true);
    setOrderError(null);

    const idempotencyKey = getIdempotencyKey();

    try {
      const res = await apiRequest('/api/checkout', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ addressId: selectedAddressId })
      });

      // Clear key from session storage on success
      sessionStorage.removeItem('checkout_idempotency_key');
      setCreatedOrder(res.order);
      await fetchCart(); // Cart is now empty
    } catch (err) {
      setOrderError(err.message || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  }

  async function handleSimulatePayment(outcome) {
    if (!createdOrder) return;
    setPaying(true);
    setPaymentError(null);

    try {
      const res = await apiRequest(`/api/orders/${createdOrder._id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ method: 'simulated', outcome })
      });
      setPaymentResult(res.order);
    } catch (err) {
      setPaymentError(err.message || 'Payment simulation failed.');
    } finally {
      setPaying(false);
    }
  }

  // If order is created, present simulated payment screen
  if (createdOrder) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="card">
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            Order Placed: #{createdOrder.orderNumber}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            Amount to Pay: <strong>{formatCurrency(createdOrder.totalMinor)}</strong>
          </p>

          {paymentError && (
            <div className="alert alert-danger" role="alert" aria-live="assertive">
              {paymentError}
            </div>
          )}

          {paymentResult ? (
            <div>
              {paymentResult.status === 'PAID' ? (
                <div className="alert alert-success" role="status">
                  <h3>Payment Successful!</h3>
                  <p style={{ marginTop: '8px' }}>
                    Your payment of {formatCurrency(paymentResult.totalMinor)} has been captured.
                  </p>
                </div>
              ) : (
                <div className="alert alert-danger" role="alert">
                  <h3>Payment Declined</h3>
                  <p style={{ marginTop: '8px' }}>
                    Payment was declined. Your order status is now PAYMENT_FAILED and reserved inventory has been returned.
                  </p>
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <Link to={`/orders/${paymentResult._id}`} className="btn btn-primary">
                  View Order Details
                </Link>
                <Link to="/catalogue" className="btn btn-secondary">
                  Continue Shopping
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Simulated Payment Gateway</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  This application simulates real payment transactions. Choose an outcome to test the order lifecycle.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={paying}
                  onClick={() => handleSimulatePayment('success')}
                >
                  {paying ? 'Processing...' : 'Simulate Success'}
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={paying}
                  onClick={() => handleSimulatePayment('decline')}
                >
                  {paying ? 'Processing...' : 'Simulate Decline'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial Checkout Step
  if (!cart || cart.items.length === 0) {
    return (
      <div className="card state-empty" style={{ margin: '40px auto', maxWidth: '500px' }}>
        <h2>Cart is empty</h2>
        <p style={{ margin: '16px 0', color: 'var(--text-muted)' }}>
          You cannot checkout without items in your cart.
        </p>
        <Link to="/catalogue" className="btn btn-primary">Browse Catalogue</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Checkout</h1>

      {orderError && (
        <div className="alert alert-danger" role="alert" aria-live="assertive">
          {orderError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Shipping Address Section */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>1. Shipping Address</h2>

          {user?.addresses && user.addresses.length > 0 && !showNewAddress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {user.addresses.map(addr => (
                <label
                  key={addr._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    border: selectedAddressId === addr._id ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    checked={selectedAddressId === addr._id}
                    onChange={() => setSelectedAddressId(addr._id)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <strong style={{ display: 'block' }}>{addr.fullName} ({addr.label})</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {addr.line1}, {addr.line2 && `${addr.line2}, `}{addr.city}, {addr.state} - {addr.postalCode}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Phone: {addr.phone}
                    </div>
                  </div>
                </label>
              ))}

              <button
                type="button"
                onClick={() => setShowNewAddress(true)}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                + Add New Address
              </button>
            </div>
          )}

          {showNewAddress && (
            <form onSubmit={handleAddNewAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem' }}>Enter New Address</h3>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-label">Address Label (Home, Office)</label>
                <input
                  id="addr-label"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.label}
                  onChange={e => setNewAddress({ ...newAddress, label: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-name">Full Name</label>
                <input
                  id="addr-name"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.fullName}
                  onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-phone">Phone</label>
                <input
                  id="addr-phone"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.phone}
                  onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-l1">Street Address</label>
                <input
                  id="addr-l1"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.line1}
                  onChange={e => setNewAddress({ ...newAddress, line1: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-city">City</label>
                <input
                  id="addr-city"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.city}
                  onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-state">State</label>
                <input
                  id="addr-state"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.state}
                  onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="addr-pin">Postal Code</label>
                <input
                  id="addr-pin"
                  type="text"
                  className="form-input"
                  required
                  value={newAddress.postalCode}
                  onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary">Save Address</button>
                {user?.addresses && user.addresses.length > 0 && (
                  <button type="button" onClick={() => setShowNewAddress(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Order Review & Place Order Button */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>2. Review Order</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '16px' }}>
            {cart.items.map(item => (
              <div key={item.variantId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity}x {item.productName} ({item.sku})</span>
                <span>{formatCurrency(item.lineTotalMinor)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotalMinor)}</span>
            </div>
            {cart.discountMinor > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>Coupon ({cart.couponCode})</span>
                <span>-{formatCurrency(cart.discountMinor)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (18% GST)</span>
              <span>{formatCurrency(cart.taxMinor)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Shipping</span>
              <span>{cart.shippingMinor === 0 ? 'FREE' : formatCurrency(cart.shippingMinor)}</span>
            </div>
            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.15rem' }}>
              <span>Total Payable</span>
              <span>{formatCurrency(cart.totalMinor)}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px', padding: '12px' }}
            disabled={placingOrder || !selectedAddressId}
            onClick={handlePlaceOrder}
          >
            {placingOrder ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

