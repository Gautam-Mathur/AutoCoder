export const API_004 = 'getCart';
export const API_005 = 'addToCart';
export const API_006 = 'removeFromCart';

// Mock implementation for cart functionality
const cart = [];

export function getCart() {
  return cart;
}

export function addToCart(item) {
  cart.push(item);
  return cart;
}

export function removeFromCart(itemId) {
  const index = cart.findIndex(item => item.id === itemId);
  if (index !== -1) {
    cart.splice(index, 1);
  }
  return cart;
}