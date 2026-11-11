import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Forms & Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [stockDelta, setStockDelta] = useState(0);
  const [stockReason, setStockReason] = useState('');

  const [newProduct, setNewProduct] = useState({
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    imageUrl: '',
    variants: [
      { sku: '', priceMinor: 10000, stock: 10, attributes: {} }
    ]
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const data = await apiRequest('/api/admin/categories');
      setCategories(data.categories || []);
      if (data.categories?.length > 0 && !newProduct.categoryId) {
        setNewProduct(prev => ({ ...prev, categoryId: data.categories[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/admin/products');
      setProducts(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(newProduct)
      });
      setSuccess('Product created successfully');
      setShowCreateModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to create product');
    }
  }

  async function handleStockAdjust(e) {
    e.preventDefault();
    if (!selectedVariant) return;
    setError(null);
    try {
      await apiRequest(`/api/admin/variants/${selectedVariant._id}/stock-adjustments`, {
        method: 'POST',
        body: JSON.stringify({ delta: parseInt(stockDelta, 10), reason: stockReason })
      });
      setSuccess('Stock adjusted successfully');
      setShowStockModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to deactivate product');
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Product Management</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Add New Product
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="state-loading"><p>Loading products...</p></div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Variants & Stock</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)', opacity: p.isActive ? 1 : 0.6 }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.name}</td>
                  <td style={{ padding: '10px' }}>{p.categoryId?.name}</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.variants?.map(v => (
                        <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          <span>{v.sku} ({formatCurrency(v.priceMinor)}) - Stock: <strong>{v.stock}</strong></span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                            onClick={() => { setSelectedVariant(v); setStockDelta(0); setStockReason(''); setShowStockModal(true); }}
                          >
                            Adjust Stock
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className={`badge ${p.isActive ? 'badge-paid' : 'badge-failed'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {p.isActive && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ color: 'var(--danger)', fontSize: '0.8rem', padding: '4px 8px' }}
                        onClick={() => handleDeactivate(p._id)}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedVariant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Adjust Stock for {selectedVariant.sku}</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Current stock: <strong>{selectedVariant.stock}</strong>
            </p>

            <form onSubmit={handleStockAdjust}>
              <div className="form-group">
                <label className="form-label" htmlFor="delta-input">Stock Delta (+ / -)</label>
                <input
                  id="delta-input"
                  type="number"
                  className="form-input"
                  required
                  value={stockDelta}
                  onChange={e => setStockDelta(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reason-input">Reason (Required)</label>
                <input
                  id="reason-input"
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Supplier delivery, damaged goods"
                  value={stockReason}
                  onChange={e => setStockReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowStockModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Create New Product</h2>

            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  required
                  value={newProduct.categoryId}
                  onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={newProduct.imageUrl}
                  onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                />
              </div>

              <h3 style={{ fontSize: '1rem', margin: '16px 0 8px' }}>Initial Variant (SKU & Price)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">SKU</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newProduct.variants[0].sku}
                    onChange={e => {
                      const v = [...newProduct.variants];
                      v[0].sku = e.target.value.toUpperCase();
                      setNewProduct({ ...newProduct, variants: v });
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Price (Paise)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    value={newProduct.variants[0].priceMinor}
                    onChange={e => {
                      const v = [...newProduct.variants];
                      v[0].priceMinor = parseInt(e.target.value, 10);
                      setNewProduct({ ...newProduct, variants: v });
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Initial Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    value={newProduct.variants[0].stock}
                    onChange={e => {
                      const v = [...newProduct.variants];
                      v[0].stock = parseInt(e.target.value, 10);
                      setNewProduct({ ...newProduct, variants: v });
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

