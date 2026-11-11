import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

export default function Profile() {
  const { user, refreshUser } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <div className="card" style={{ margin: '40px auto', maxWidth: '500px' }}>Please log in to view your profile.</div>;
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify(addressForm)
      });
      await refreshUser();
      setSuccess('Address added successfully!');
      setShowAddForm(false);
      setAddressForm({
        label: 'Home',
        fullName: user.name,
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: false
      });
    } catch (err) {
      setError(err.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAddress(addressId) {
    if (!window.confirm('Delete this address?')) return;
    setError(null);
    try {
      await apiRequest(`/api/auth/addresses/${addressId}`, { method: 'DELETE' });
      await refreshUser();
      setSuccess('Address deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete address');
    }
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>My Profile</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Account Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name</span>
            <div style={{ fontWeight: '600' }}>{user.name}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</span>
            <div style={{ fontWeight: '600' }}>{user.email}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role</span>
            <div style={{ textTransform: 'capitalize' }}><span className="badge badge-paid">{user.role}</span></div>
          </div>
        </div>
      </div>

      {/* Addresses Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Saved Addresses ({user.addresses?.length || 0}/10)</h2>
          {!showAddForm && (user.addresses?.length || 0) < 10 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddForm(true)}
            >
              + Add Address
            </button>
          )}
        </div>

        {/* Existing Addresses List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {(!user.addresses || user.addresses.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No addresses saved yet.</p>
          ) : (
            user.addresses.map(addr => (
              <div
                key={addr._id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div>
                  <strong>{addr.fullName} ({addr.label})</strong> {addr.isDefault && <span className="badge badge-placed" style={{ marginLeft: '6px' }}>Default</span>}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {addr.line1}, {addr.line2 && `${addr.line2}, `}{addr.city}, {addr.state} - {addr.postalCode}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Phone: {addr.phone}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => handleDeleteAddress(addr._id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Address Form */}
        {showAddForm && (
          <form onSubmit={handleAddAddress} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>New Address</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Label (e.g. Home, Work)</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.label}
                  onChange={e => setAddressForm({ ...addressForm, label: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Recipient Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.fullName}
                  onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.phone}
                  onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Address Line 1</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.line1}
                  onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.city}
                  onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.state}
                  onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={addressForm.postalCode}
                  onChange={e => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving...' : 'Save Address'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

