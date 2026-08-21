import React from 'react';
import { useCart } from '../lib/context';

const CartItem = ({ item }) => {
  const { updateCartItemQuantity, removeCartItem } = useCart();

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      updateCartItemQuantity(item.id, newQuantity);
    }
  };

  const handleRemoveItem = () => {
    removeCartItem(item.id);
  };

  return (
    <div className="cart-item">
      <img src={item.image} alt={item.name} className="cart-item-image" />
      <div className="cart-item-details">
        <h3 className="cart-item-name">{item.name}</h3>
        <p className="cart-item-price">${item.price.toFixed(2)}</p>
      </div>
      <div className="cart-item-controls">
        <label htmlFor={`quantity-${item.id}`} className="quantity-label">
          Quantity:
        </label>
        <input
          type="number"
          id={`quantity-${item.id}`}
          min="1"
          value={item.quantity}
          onChange={handleQuantityChange}
          className="quantity-input"
        />
        <button 
          onClick={handleRemoveItem}
          className="remove-button"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default CartItem;