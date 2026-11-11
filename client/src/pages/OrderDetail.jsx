import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import StatusTimeline from '../components/StatusTimeline';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState(null);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  async function fetchOrderDetail() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/orders/${id}`);
      setOrder(data.order);
    } catch (err) {
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder() {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/orders/${id}/cancel`, { method: 'POST' });
      setOrder(data.order);
      setCancelMessage('Order has been successfully cancelled and inventory restored.');
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <div className="state-loading"><p>Loading order details...</p></div>;
  }

  if (error || !order) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Order not found'}
      </div>
    );
  }

  // Customers can only cancel from PLACED or PAID
  const canCancel = ['PLACED', 'PAID'].includes(order.status);

  return (
    <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/orders" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          &larr; Back to Orders
        </Link>
      </div>

      {cancelMessage && (
        <div className="alert alert-success" role="status">
          {cancelMessage}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: '0 0 4px' }}>Order #{order.orderNumber}</h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Placed on {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge badge-${order.status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
              {order.status}
            </span>

            {canCancel && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ fontSize: '0.85rem' }}
                disabled={cancelling}
                onClick={handleCancelOrder}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>

        {/* Visual Lifecycle Timeline */}
        <StatusTimeline statusHistory={order.statusHistory} currentStatus={order.status} />

        {/* Shipping Address Snapshot */}
        <div style={{ margin: '20px 0', padding: '16px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Shipping Address</h3>
          <p style={{ fontWeight: 'bold' }}>{order.shippingAddress.fullName}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {order.shippingAddress.line1}, {order.shippingAddress.line2 && `${order.shippingAddress.line2}, `}
            {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Phone: {order.shippingAddress.phone}
          </p>
        </div>

        {/* Order Item Snapshots */}
        <div style={{ margin: '20px 0' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Items Snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <strong>{item.productName}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    SKU: {item.sku} | Qty: {item.quantity} × {formatCurrency(item.unitPriceMinor)}
                  </div>
                </div>
                <div style={{ fontWeight: '600' }}>
                  {formatCurrency(item.lineTotalMinor)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(order.subtotalMinor)}</span>
          </div>
          {order.discountMinor > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--success)' }}>
              <span>Discount ({order.couponCode || 'Coupon'}):</span>
              <span>-{formatCurrency(order.discountMinor)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Tax (GST):</span>
            <span>{formatCurrency(order.taxMinor)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Shipping:</span>
            <span>{order.shippingMinor === 0 ? 'FREE' : formatCurrency(order.shippingMinor)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <span>Total:</span>
            <span>{formatCurrency(order.totalMinor)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

