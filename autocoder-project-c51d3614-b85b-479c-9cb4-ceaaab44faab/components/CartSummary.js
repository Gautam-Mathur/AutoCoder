import React from 'react';
import { useCart } from '../lib/context';

const CartSummary = () => {
  const { cart, clearCart } = useCart();

  const handleCheckout = () => {
    // In a real application, this would redirect to checkout or open payment modal
    alert('Proceeding to checkout!');
    clearCart();
  };

  return (
    <div className="cart-summary">
      <h2>Cart Summary</h2>
      <p>Total Items: {cart.items.length}</p>
      <p>Total Amount: ${cart.total.toFixed(2)}</p>
      <button onClick={handleCheckout} disabled={cart.items.length === 0}>
        Checkout
      </button>
    </div>
  );
};

export default CartSummary;