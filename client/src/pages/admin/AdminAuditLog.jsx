import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [entityType]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const q = entityType ? `?entityType=${entityType}` : '';
      const data = await apiRequest(`/api/admin/audit-logs${q}`);
      setLogs(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Append-Only Audit Log</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: '20px', maxWidth: '300px' }}>
        <label className="form-label">Filter by Entity Type</label>
        <select
          className="form-select"
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
        >
          <option value="">All Entities</option>
          <option value="Order">Order</option>
          <option value="Product">Product</option>
          <option value="Variant">Variant</option>
          <option value="Category">Category</option>
          <option value="Coupon">Coupon</option>
          <option value="User">User</option>
        </select>
      </div>

      {loading ? (
        <div className="state-loading"><p>Loading audit trail...</p></div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '8px' }}>Timestamp</th>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>Actor</th>
                <th style={{ padding: '8px' }}>Entity</th>
                <th style={{ padding: '8px' }}>Reason / Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{log.action}</td>
                  <td style={{ padding: '8px' }}>
                    {log.actorRole} ({log.actorId?.email || 'system'})
                  </td>
                  <td style={{ padding: '8px' }}>
                    {log.entityType} ({log.entityId})
                  </td>
                  <td style={{ padding: '8px', maxWidth: '300px' }}>
                    {log.reason && <div style={{ color: 'var(--primary)' }}>{log.reason}</div>}
                    {log.before && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Before: {JSON.stringify(log.before)}</div>}
                    {log.after && <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>After: {JSON.stringify(log.after)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

