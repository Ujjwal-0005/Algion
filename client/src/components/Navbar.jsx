import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          ModStore
        </Link>

        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <NavLink to="/catalogue" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Catalogue
              </NavLink>
            </li>

            {user && user.role === 'customer' && (
              <>
                <li>
                  <NavLink to="/cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Cart {cartCount > 0 && `(${cartCount})`}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    My Orders
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Profile
                  </NavLink>
                </li>
              </>
            )}

            {user && user.role === 'admin' && (
              <>
                <li>
                  <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Products
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Categories
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Orders
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/customers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Customers
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/coupons" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Coupons
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/audit-logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Audit
                  </NavLink>
                </li>
              </>
            )}

            {user ? (
              <li>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
                  Logout ({user.name.split(' ')[0]})
                </button>
              </li>
            ) : (
              <>
                <li>
                  <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Login
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Register
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

