import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
});

export const getProducts = async () => {
  try {
    const response = await apiClient.get('/products');
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch products');
  }
};

export const getProductById = async (id) => {
  try {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch product');
  }
};

export const addToCart = async (item) => {
  try {
    const response = await apiClient.post('/cart', item);
    return response.data;
  } catch (error) {
    throw new Error('Failed to add item to cart');
  }
};

export const removeFromCart = async (itemId) => {
  try {
    const response = await apiClient.delete(`/cart/${itemId}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to remove item from cart');
  }
};

export const updateCartItemQuantity = async (itemId, quantity) => {
  try {
    const response = await apiClient.put(`/cart/${itemId}`, { quantity });
    return response.data;
  } catch (error) {
    throw new Error('Failed to update cart item quantity');
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  } catch (error) {
    throw new Error('Failed to create order');
  }
};

export default {
  getProducts,
  getProductById,
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  createOrder,
};