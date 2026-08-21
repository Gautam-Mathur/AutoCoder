import React from 'react';
import { CartProvider } from '../lib/context';
import { apiClient } from '../lib/api';

const ProviderWrapper = ({ children }) => {
  return (
    <CartProvider value={apiClient}>
      {children}
    </CartProvider>
  );
};

export default ProviderWrapper;