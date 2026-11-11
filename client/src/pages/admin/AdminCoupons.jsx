import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [code, setCode] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState(10);
  const [minSubtotalMinor, setMinSubtotalMinor] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/admin/coupons');
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: parseInt(value, 10),
          minSubtotalMinor: parseInt(minSubtotalMinor, 10),
          expiresAt: new Date(expiresAt).toISOString()
        })
      });
      setCode('');
      setValue(10);
      setMinSubtotalMinor(0);
      setExpiresAt('');
      fetchCoupons();
    } catch (err) {
      setError(err.message || 'Failed to create coupon');
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('Deactivate this coupon?')) return;
    try {
      await apiRequest(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      fetchCoupons();
    } catch (err) {
      setError(err.message || 'Failed to deactivate coupon');
    }
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Coupon Management</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Create Coupon Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Create Promotional Coupon</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Code</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. SUMMER20"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount (Paise)</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Value {type === 'percent' ? '(%)' : '(Paise)'}</label>
            <input
              type="number"
              className="form-input"
              required
              min={1}
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Min Subtotal (Paise)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              value={minSubtotalMinor}
              onChange={e => setMinSubtotalMinor(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-input"
              required
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            Create Coupon
          </button>
        </form>
      </div>

      {/* Coupons List */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Coupons</h2>
        {loading ? (
          <div className="state-loading"><p>Loading coupons...</p></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '8px' }}>Code</th>
                <th style={{ padding: '8px' }}>Benefit</th>
                <th style={{ padding: '8px' }}>Min Subtotal</th>
                <th style={{ padding: '8px' }}>Expires At</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(cp => (
                <tr key={cp._id} style={{ borderBottom: '1px solid var(--border-color)', opacity: cp.isActive ? 1 : 0.6 }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{cp.code}</td>
                  <td style={{ padding: '8px' }}>
                    {cp.type === 'percent' ? `${cp.value}% Off` : `${formatCurrency(cp.value)} Off`}
                  </td>
                  <td style={{ padding: '8px' }}>{formatCurrency(cp.minSubtotalMinor)}</td>
                  <td style={{ padding: '8px' }}>{new Date(cp.expiresAt).toLocaleDateString()}</td>
                  <td style={{ padding: '8px' }}>
                    <span className={`badge ${cp.isActive ? 'badge-paid' : 'badge-failed'}`}>
                      {cp.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {cp.isActive && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '4px 8px' }}
                        onClick={() => handleDeactivate(cp._id)}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

