import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  async function fetchProduct() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/products/${slug}`);
      setProduct(data.product);
      // Select first in-stock variant if available, otherwise first variant
      const firstInStock = data.product.variants.find(v => v.stock > 0) || data.product.variants[0];
      setSelectedVariant(firstInStock);
    } catch (err) {
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }

    if (!selectedVariant) return;

    setSubmitting(true);
    setSuccessMessage(null);
    setError(null);

    try {
      await addItem(selectedVariant._id, quantity);
      setSuccessMessage(`Added ${quantity} item(s) to your cart!`);
    } catch (err) {
      setError(err.message || 'Failed to add item to cart');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="state-loading"><p>Loading product details...</p></div>;
  }

  if (error || !product) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Product not found'}
      </div>
    );
  }

  const isOutOfStock = !selectedVariant || selectedVariant.stock === 0;

  return (
    <div style={{ padding: '32px 0' }}>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* Product Image */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.imageUrl ? (
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '360px',
              height: '320px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}>
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          ) : (
            <div style={{ height: '300px', width: '100%', maxWidth: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '8px', color: '#94a3b8' }}>
              No image available
            </div>
          )}
        </div>

        {/* Product Details & Variant Picker */}
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
            {product.categoryId?.name}
          </span>
          <h1 style={{ fontSize: '1.75rem', margin: '4px 0 12px' }}>{product.name}</h1>
          
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px' }}>
            {selectedVariant ? formatCurrency(selectedVariant.priceMinor) : 'Select a variant'}
          </div>

          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            {product.description}
          </p>

          {successMessage && (
            <div className="alert alert-success" role="status" aria-live="polite">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {/* Variant Picker */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Select Option / Variant:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {product.variants.map(variant => {
                const isSelected = selectedVariant?._id === variant._id;
                const outOfStock = variant.stock === 0;

                const attrText = Object.entries(variant.attributes || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ') || variant.sku;

                return (
                  <button
                    key={variant._id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => { setSelectedVariant(variant); setQuantity(1); }}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                      opacity: outOfStock ? 0.4 : 1,
                      textDecoration: outOfStock ? 'line-through' : 'none'
                    }}
                  >
                    {attrText} ({formatCurrency(variant.priceMinor)})
                    {outOfStock ? ' [Out of Stock]' : ` [${variant.stock} left]`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '100px' }}>
              <label className="form-label" htmlFor="qty-select">Qty</label>
              <select
                id="qty-select"
                className="form-select"
                value={quantity}
                disabled={isOutOfStock}
                onChange={e => setQuantity(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: Math.min(10, selectedVariant?.stock || 0) }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, marginTop: '22px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
                disabled={isOutOfStock || submitting}
                onClick={handleAddToCart}
              >
                {isOutOfStock ? 'Out of Stock' : submitting ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

