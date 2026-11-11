import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/admin/categories');
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, slug: slug.trim() || undefined })
      });
      setName('');
      setSlug('');
      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to create category');
    }
  }

  async function handleDeleteOrDeactivate(id) {
    if (!window.confirm('Delete or deactivate this category?')) return;
    try {
      const res = await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.deactivated) {
        alert('Category is referenced by products and was deactivated instead of deleted.');
      }
      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    }
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Category Management</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Create Category Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Create Category</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Category Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Home & Kitchen"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Custom Slug (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. home-kitchen"
              value={slug}
              onChange={e => setSlug(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            Add Category
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Existing Categories</h2>
        {loading ? (
          <div className="state-loading"><p>Loading...</p></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Slug</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{c.slug}</td>
                  <td style={{ padding: '8px' }}>
                    <span className={`badge ${c.isActive ? 'badge-paid' : 'badge-failed'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => handleDeleteOrDeactivate(c._id)}
                    >
                      Delete / Deactivate
                    </button>
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

