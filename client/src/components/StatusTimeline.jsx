import React from 'react';

export default function StatusTimeline({ statusHistory = [], currentStatus }) {
  const steps = ['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const isTerminal = ['PAYMENT_FAILED', 'CANCELLED'].includes(currentStatus);

  return (
    <div style={{ margin: '20px 0', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Order Status</h3>
      
      {isTerminal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge badge-${currentStatus === 'CANCELLED' ? 'cancelled' : 'failed'}`} style={{ fontSize: '1rem', padding: '6px 12px' }}>
            {currentStatus}
          </span>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
            This order has ended in {currentStatus}.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {steps.map((step, idx) => {
            const isCompleted = steps.indexOf(currentStatus) >= idx;
            const isCurrent = currentStatus === step;

            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#2563eb' : '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ fontWeight: isCurrent ? '700' : '500', color: isCompleted ? '#0f172a' : '#94a3b8' }}>
                  {step}
                </span>
                {idx < steps.length - 1 && (
                  <span style={{ color: '#cbd5e1', margin: '0 4px' }}>&rarr;</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {statusHistory.length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>History Log</h4>
          <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: '#334155' }}>
            {statusHistory.map((h, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                <strong>{h.to}</strong> — {new Date(h.at).toLocaleString()} {h.from ? `(from ${h.from})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

