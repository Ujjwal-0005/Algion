import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [sumData, recData] = await Promise.all([
        apiRequest('/api/admin/reports/summary'),
        apiRequest('/api/admin/reports/reconciliation')
      ]);
      setSummary(sumData.summary);
      setReconciliation(recData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="state-loading"><p>Loading admin metrics...</p></div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Admin Dashboard</h1>

      {/* Reconciliation Alert Banner */}
      {reconciliation && (
        <div className={`alert ${reconciliation.allPassed ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '24px' }}>
          <strong>System Reconciliation Status: {reconciliation.allPassed ? 'ALL INVARIANTS PASS' : 'INVARIANTS FAILED'}</strong>
          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Daily revenue match: {reconciliation.checks.dailySeriesMatchesGrossRevenue.pass ? 'PASS' : 'FAIL'} |
            Status counts match: {reconciliation.checks.statusCountsSumMatchesTotalOrders.pass ? 'PASS' : 'FAIL'} |
            Variant inventory movements: {reconciliation.checks.variantInventoryIntegrity.pass ? 'PASS' : 'FAIL'}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid" style={{ marginBottom: '24px' }}>
        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gross Revenue</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {formatCurrency(summary.grossRevenueMinor)}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From paid & fulfilled orders</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Orders</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>
            {summary.totalOrders}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Across all lifecycle states</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Order Value</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>
            {formatCurrency(summary.averageOrderValueMinor)}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Per captured order</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cancellations & Failures</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--danger)' }}>
            {summary.cancelledCount + summary.paymentFailedCount}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {summary.cancelledCount} Cancelled / {summary.paymentFailedCount} Failed
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Daily Revenue Table */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Daily Revenue Series</h2>
          {summary.dailyRevenueSeries.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No revenue recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Orders</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Gross Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.dailyRevenueSeries.map(day => (
                    <tr key={day.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>{day.date}</td>
                      <td style={{ padding: '8px' }}>{day.orderCount}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(day.revenueMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alert List */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Low Stock Variants (≤ 5 units)</h2>
          {summary.lowStockVariants.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>All variants have healthy stock levels.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {summary.lowStockVariants.map(v => (
                <div key={v._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px' }}>
                  <div>
                    <strong>{v.productId?.name || 'Product'}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#92400e' }}>SKU: {v.sku}</div>
                  </div>
                  <span className="badge badge-failed">
                    {v.stock} remaining
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

