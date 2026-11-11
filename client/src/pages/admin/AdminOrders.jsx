import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import StatusTimeline from '../../components/StatusTimeline';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [transitionError, setTransitionError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      if (search.trim()) q.set('search', search.trim());
      const data = await apiRequest(`/api/admin/orders?${q.toString()}`);
      setOrders(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusTransition(orderId, toStatus, expectedStatus) {
    setTransitionError(null);
    try {
      const res = await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ to: toStatus, expectedStatus })
      });
      setSelectedOrder(res.order);
      fetchOrders();
    } catch (err) {
      setTransitionError(err.message || 'Failed to change order status');
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Admin Order Management</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search order number or customer email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="button" onClick={fetchOrders} className="btn btn-secondary">Search</button>
        </div>

        <div style={{ minWidth: '180px' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PLACED">PLACED</option>
            <option value="PAID">PAID</option>
            <option value="PACKED">PACKED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="PAYMENT_FAILED">PAYMENT_FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="state-loading"><p>Loading orders...</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1fr' : '1fr', gap: '24px' }}>
          {/* Orders Table */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '8px' }}>Order Number</th>
                  <th style={{ padding: '8px' }}>Customer</th>
                  <th style={{ padding: '8px' }}>Total</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{o.orderNumber}</td>
                    <td style={{ padding: '8px' }}>{o.userId?.email || 'N/A'}</td>
                    <td style={{ padding: '8px' }}>{formatCurrency(o.totalMinor)}</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedOrder(o); setTransitionError(null); }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Order Detail & Transition Panel */}
          {selectedOrder && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.2rem' }}>Order #{selectedOrder.orderNumber}</h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>

              {transitionError && <div className="alert alert-danger">{transitionError}</div>}

              <StatusTimeline statusHistory={selectedOrder.statusHistory} currentStatus={selectedOrder.status} />

              <div style={{ margin: '16px 0', padding: '12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.9rem' }}>
                <div><strong>Customer:</strong> {selectedOrder.userId?.name} ({selectedOrder.userId?.email})</div>
                <div><strong>Total:</strong> {formatCurrency(selectedOrder.totalMinor)}</div>
                <div><strong>Current Status:</strong> <span className={`badge badge-${selectedOrder.status.toLowerCase()}`}>{selectedOrder.status}</span></div>
              </div>

              {/* Action Buttons strictly conforming to state machine */}
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Available Actions:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedOrder.status === 'PAID' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleStatusTransition(selectedOrder._id, 'PACKED', 'PAID')}
                      >
                        Mark as PACKED
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleStatusTransition(selectedOrder._id, 'CANCELLED', 'PAID')}
                      >
                        Cancel & Refund
                      </button>
                    </>
                  )}

                  {selectedOrder.status === 'PLACED' && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleStatusTransition(selectedOrder._id, 'CANCELLED', 'PLACED')}
                    >
                      Cancel Order
                    </button>
                  )}

                  {selectedOrder.status === 'PACKED' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleStatusTransition(selectedOrder._id, 'SHIPPED', 'PACKED')}
                    >
                      Mark as SHIPPED
                    </button>
                  )}

                  {selectedOrder.status === 'SHIPPED' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleStatusTransition(selectedOrder._id, 'DELIVERED', 'SHIPPED')}
                    >
                      Mark as DELIVERED
                    </button>
                  )}

                  {['DELIVERED', 'CANCELLED', 'PAYMENT_FAILED'].includes(selectedOrder.status) && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Terminal state. No further transitions allowed.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

