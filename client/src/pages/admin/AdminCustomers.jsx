import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    setError(null);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiRequest(`/api/admin/customers${q}`);
      setCustomers(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  async function viewCustomerDetails(id) {
    try {
      const data = await apiRequest(`/api/admin/customers/${id}`);
      setSelectedCustomer(data.customer);
      setCustomerOrders(data.orders || []);
    } catch (err) {
      alert(err.message || 'Failed to load customer profile');
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Customer Directory</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '8px', maxWidth: '500px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search customer name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="button" onClick={fetchCustomers} className="btn btn-secondary">Search</button>
      </div>

      {loading ? (
        <div className="state-loading"><p>Loading customers...</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 1fr' : '1fr', gap: '24px' }}>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '8px' }}>Customer Name</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Orders</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.name}</td>
                    <td style={{ padding: '8px' }}>{c.email}</td>
                    <td style={{ padding: '8px' }}>{c.orderCount} order(s)</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => viewCustomerDetails(c._id)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCustomer && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.2rem' }}>{selectedCustomer.name}</h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => setSelectedCustomer(null)}
                >
                  Close
                </button>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedCustomer.email}</p>

              <h3 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>Order History ({customerOrders.length})</h3>
              {customerOrders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No orders placed.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customerOrders.map(o => (
                    <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div>
                        <strong>#{o.orderNumber}</strong>
                        <div style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>{formatCurrency(o.totalMinor)}</div>
                        <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

