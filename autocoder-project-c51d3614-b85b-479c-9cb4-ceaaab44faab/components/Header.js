import React from 'react';
import SearchBar from './SearchBar';
import CartIcon from './CartIcon';
import { useCart } from '../lib/context';

const Header = () => {
  const { cart } = useCart();

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <a href="/">MyStore</a>
        </div>
        
        <nav className="navigation">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li><a href="/categories">Categories</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
        
        <div className="header-actions">
          <SearchBar />
          <CartIcon cartCount={cart.items.length} />
        </div>
      </div>
    </header>
  );
};

export default Header;