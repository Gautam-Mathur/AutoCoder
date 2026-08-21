import React from 'react';
import { useCart } from '../lib/context';

const ProductCard = ({ product }) => {
  const { addCartItem } = useCart();

  const handleAddToCart = () => {
    if (product) {
      addCartItem(product);
    }
  };

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p className="price">${product.price.toFixed(2)}</p>
      <p className="description">{product.description}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
};

export default ProductCard;