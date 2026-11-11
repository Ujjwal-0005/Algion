import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/orders');
      setOrders(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load your orders');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="state-loading"><p>Loading your orders...</p></div>;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card state-empty" style={{ margin: '40px auto', maxWidth: '500px' }}>
        <h2>No orders placed yet</h2>
        <p style={{ margin: '12px 0 20px', color: 'var(--text-muted)' }}>
          When you purchase items, your orders will appear here.
        </p>
        <Link to="/catalogue" className="btn btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>My Orders</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {orders.map(order => (
          <div key={order._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </span>
                <h3 style={{ fontSize: '1.1rem', margin: '2px 0' }}>#{order.orderNumber}</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge badge-${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
                <strong style={{ fontSize: '1.1rem' }}>
                  {formatCurrency(order.totalMinor)}
                </strong>
              </div>
            </div>

            <div style={{ padding: '12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {order.items.length} item(s): {order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link to={`/orders/${order._id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                View Details & Timeline &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

