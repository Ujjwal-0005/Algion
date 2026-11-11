import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [user]);

  async function fetchCart() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/cart');
      setCart(data.cart);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(variantId, quantity) {
    setError(null);
    try {
      const data = await apiRequest('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity })
      });
      setCart(data.cart);
      return data.cart;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function updateQuantity(variantId, quantity) {
    setError(null);
    try {
      const data = await apiRequest(`/api/cart/items/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity })
      });
      setCart(data.cart);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function removeItem(variantId) {
    setError(null);
    try {
      const data = await apiRequest(`/api/cart/items/${variantId}`, {
        method: 'DELETE'
      });
      setCart(data.cart);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function applyCoupon(code) {
    setError(null);
    try {
      const data = await apiRequest('/api/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      setCart(data.cart);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function removeCoupon() {
    setError(null);
    try {
      const data = await apiRequest('/api/cart/coupon', {
        method: 'DELETE'
      });
      setCart(data.cart);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      error,
      fetchCart,
      addItem,
      updateQuantity,
      removeItem,
      applyCoupon,
      removeCoupon
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

