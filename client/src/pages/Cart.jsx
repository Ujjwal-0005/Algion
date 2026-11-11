import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

export default function Cart() {
  const { cart, loading, error, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
        <h2>Your Cart</h2>
        <p style={{ margin: '16px 0', color: 'var(--text-muted)' }}>
          Please log in to view and manage your cart items.
        </p>
        <Link to="/login" className="btn btn-primary">Login Now</Link>
      </div>
    );
  }

  if (loading && !cart) {
    return <div className="state-loading" aria-live="polite"><p>Loading your cart...</p></div>;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert" aria-live="assertive">
        {error}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="card state-empty" style={{ margin: '40px 0' }}>
        <h2>Your cart is empty</h2>
        <p style={{ margin: '12px 0 20px', color: 'var(--text-muted)' }}>
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link to="/catalogue" className="btn btn-primary">Explore Catalogue</Link>
      </div>
    );
  }

  async function handleApplyCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError(null);
    setActionLoading(true);
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    } catch (err) {
      setCouponError(err.message || 'Failed to apply coupon');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveCoupon() {
    setCouponError(null);
    setActionLoading(true);
    try {
      await removeCoupon();
    } catch (err) {
      setCouponError(err.message || 'Failed to remove coupon');
    } finally {
      setActionLoading(false);
    }
  }

  const hasWarnings = cart.hasWarnings;

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Shopping Cart</h1>

      {hasWarnings && (
        <div className="alert alert-warning" role="alert" aria-live="assertive">
          <strong>Attention:</strong> Some items in your cart have stock shortages or are no longer active. Please review your cart before proceeding to checkout.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Cart Items List */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Items ({cart.items.length})</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.items.map(item => (
              <div
                key={item.variantId}
                style={{
                  display: 'flex',
                  gap: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border-color)',
                  opacity: item.isInactive ? 0.5 : 1
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                ) : (
                  <div style={{ width: '80px', height: '80px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                    No img
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 4px' }}>
                    <Link to={`/products/${item.productSlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {item.productName}
                    </Link>
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    SKU: {item.sku}
                    {item.attributes && Object.entries(item.attributes).map(([k, v]) => ` | ${k}: ${v}`)}
                  </div>

                  <div style={{ fontWeight: '600', color: 'var(--primary)' }}>
                    {formatCurrency(item.unitPriceMinor)}
                  </div>

                  {item.warning && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px' }}>
                      {item.warning}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label htmlFor={`qty-${item.variantId}`} style={{ fontSize: '0.85rem' }}>Qty:</label>
                      <select
                        id={`qty-${item.variantId}`}
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: '70px' }}
                        value={item.quantity}
                        disabled={item.isInactive}
                        onChange={e => updateQuantity(item.variantId, parseInt(e.target.value, 10))}
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--danger)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(item.lineTotalMinor)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary Breakdown */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Price Breakdown</h2>

          {/* Coupon Entry */}
          <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <label className="form-label" htmlFor="coupon-input">Have a Coupon?</label>
            {cart.couponCode ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{cart.couponCode}</span>
                  {cart.couponApplied ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'block' }}>
                      Applied: {formatCurrency(cart.discountMinor)} off
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--warning)', display: 'block' }}>
                      (Min subtotal requirement not met)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="coupon-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. WELCOME10"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                />
                <button
                  type="submit"
                  disabled={actionLoading || !couponCode.trim()}
                  className="btn btn-secondary"
                >
                  Apply
                </button>
              </form>
            )}

            {couponError && (
              <div className="form-error" role="alert" style={{ marginTop: '6px' }}>
                {couponError}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span>{formatCurrency(cart.subtotalMinor)}</span>
            </div>

            {cart.discountMinor > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>Discount</span>
                <span>-{formatCurrency(cart.discountMinor)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tax (18% GST)</span>
              <span>{formatCurrency(cart.taxMinor)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shipping</span>
              <span>{cart.shippingMinor === 0 ? 'FREE' : formatCurrency(cart.shippingMinor)}</span>
            </div>

            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>{formatCurrency(cart.totalMinor)}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '20px', padding: '12px' }}
            disabled={hasWarnings || cart.items.length === 0}
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

