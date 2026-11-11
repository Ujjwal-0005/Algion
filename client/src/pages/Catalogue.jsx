import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read filter state from URL query parameters
  const q = searchParams.get('q') || '';
  const categorySlug = searchParams.get('categorySlug') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  async function fetchCategories() {
    try {
      const data = await apiRequest('/api/categories');
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (q) query.set('q', q);
      if (categorySlug) query.set('categorySlug', categorySlug);
      if (minPrice) query.set('minPrice', (parseInt(minPrice, 10) * 100).toString()); // convert rupees to minor paise
      if (maxPrice) query.set('maxPrice', (parseInt(maxPrice, 10) * 100).toString());
      if (inStock) query.set('inStock', 'true');
      if (sort) query.set('sort', sort);
      query.set('page', page.toString());
      query.set('limit', '12');

      const data = await apiRequest(`/api/products?${query.toString()}`);
      setProducts(data.items || []);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        pages: data.pages
      });
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(updates) {
    const nextParams = new URLSearchParams(searchParams);
    Object.keys(updates).forEach(key => {
      const val = updates[key];
      if (val === '' || val === null || val === undefined || val === false) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val.toString());
      }
    });
    // Reset to page 1 on filter changes unless page itself is changed
    if (!updates.page) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '16px' }}>Product Catalogue</h1>

      {/* Filters Toolbar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {/* Search Box */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="search-input">Search</label>
            <input
              id="search-input"
              type="text"
              className="form-input"
              placeholder="Search products..."
              value={q}
              onChange={e => updateFilter({ q: e.target.value })}
            />
          </div>

          {/* Category Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="category-select">Category</label>
            <select
              id="category-select"
              className="form-select"
              value={categorySlug}
              onChange={e => updateFilter({ categorySlug: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="min-price">Min Price (₹)</label>
            <input
              id="min-price"
              type="number"
              className="form-input"
              placeholder="Min ₹"
              value={minPrice}
              onChange={e => updateFilter({ minPrice: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="max-price">Max Price (₹)</label>
            <input
              id="max-price"
              type="number"
              className="form-input"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={e => updateFilter({ maxPrice: e.target.value })}
            />
          </div>

          {/* Sort */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="sort-select">Sort By</label>
            <select
              id="sort-select"
              className="form-select"
              value={sort}
              onChange={e => updateFilter({ sort: e.target.value })}
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>

          {/* In Stock Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={inStock}
                onChange={e => updateFilter({ inStock: e.target.checked })}
              />
              In Stock Only
            </label>
          </div>
        </div>
      </div>

      {/* Main Content Area with Loading, Error, Empty, and Success states */}
      {loading ? (
        <div className="state-loading" aria-live="polite">
          <p>Loading products...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="state-empty card">
          <h3>No products found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Try adjusting your search terms or filters.
          </p>
        </div>
      ) : (
        <>
          <div className="grid">
            {products.map(product => (
              <div key={product._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {product.imageUrl && (
                  <div style={{ height: '180px', overflow: 'hidden', borderRadius: '6px', marginBottom: '12px', background: '#e2e8f0' }}>
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {product.categoryId?.name || 'General'}
                  </span>
                  <h2 style={{ fontSize: '1.1rem', margin: '4px 0 8px' }}>
                    <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                      {product.name}
                    </Link>
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    {product.description.slice(0, 80)}...
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>From</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {formatCurrency(product.minPriceMinor)}
                    </strong>
                  </div>

                  <div>
                    {product.inStock ? (
                      <span className="badge badge-paid">In Stock</span>
                    ) : (
                      <span className="badge badge-failed">Out of Stock</span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/products/${product.slug}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px' }}>
              <button
                className="btn btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => updateFilter({ page: pagination.page - 1 })}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => updateFilter({ page: pagination.page + 1 })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

