import React from 'react';
import { useCart } from '../lib/context';

const CartIcon = () => {
  const { cart } = useCart();
  
  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="cart-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.70711 15.2929C4.08071 15.9193 4.52334 17 5.41421 17H17M17 17H19C19.5304 17 20.0391 16.7893 20.4142 16.4142C20.7893 16.0391 21 15.5304 21 15V13M17 17V15M17 17H15M17 17H15M15 17H13M13 17H11M11 17H9M9 17H7M7 17H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {itemCount > 0 && (
        <span className="cart-count-badge">
          {itemCount}
        </span>
      )}
    </div>
  );
};

export default CartIcon;