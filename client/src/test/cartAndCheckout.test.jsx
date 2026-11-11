import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import * as AuthContextModule from '../context/AuthContext';
import * as CartContextModule from '../context/CartContext';
import * as apiService from '../services/api';

vi.mock('../context/AuthContext');
vi.mock('../context/CartContext');
vi.mock('../services/api');

describe('Client Cart & Checkout Component States', () => {
  const mockUser = {
    _id: 'user123',
    name: 'Test Customer',
    email: 'customer@example.com',
    role: 'customer',
    addresses: [
      {
        _id: 'addr123',
        label: 'Home',
        fullName: 'Test Customer',
        phone: '9988776655',
        line1: '123 Main St',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        isDefault: true
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Cart renders loading state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: mockUser });
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: null,
      loading: true,
      error: null
    });

    render(
      <MemoryRouter>
        <Cart />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading your cart/i)).toBeInTheDocument();
  });

  test('Cart renders empty state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: mockUser });
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: { items: [] },
      loading: false,
      error: null
    });

    render(
      <MemoryRouter>
        <Cart />
      </MemoryRouter>
    );

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test('Cart renders error state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: mockUser });
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: null,
      loading: false,
      error: 'Network connection failure'
    });

    render(
      <MemoryRouter>
        <Cart />
      </MemoryRouter>
    );

    expect(screen.getByText(/network connection failure/i)).toBeInTheDocument();
  });

  test('Cart renders success state with priced items', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: mockUser });
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: {
        items: [
          {
            variantId: 'v1',
            sku: 'SH-BLK-M',
            productName: 'Cool Shirt',
            productSlug: 'cool-shirt',
            unitPriceMinor: 49900,
            quantity: 2,
            lineTotalMinor: 99800,
            currentStock: 10,
            isInactive: false,
            warning: null
          }
        ],
        subtotalMinor: 99800,
        discountMinor: 0,
        taxMinor: 17964,
        shippingMinor: 0,
        totalMinor: 117764,
        couponCode: null,
        hasWarnings: false
      },
      loading: false,
      error: null
    });

    render(
      <MemoryRouter>
        <Cart />
      </MemoryRouter>
    );

    expect(screen.getByText(/cool shirt/i)).toBeInTheDocument();
    expect(screen.getByText(/proceed to checkout/i)).toBeInTheDocument();
  });

  test('Checkout renders addresses and order review', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      refreshUser: vi.fn()
    });
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: {
        items: [
          {
            variantId: 'v1',
            sku: 'SH-BLK-M',
            productName: 'Cool Shirt',
            quantity: 1,
            lineTotalMinor: 49900
          }
        ],
        subtotalMinor: 49900,
        discountMinor: 0,
        taxMinor: 8982,
        shippingMinor: 4900,
        totalMinor: 63782
      },
      fetchCart: vi.fn()
    });

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );

    expect(screen.getByText(/1\. shipping address/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. review order/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });
});

