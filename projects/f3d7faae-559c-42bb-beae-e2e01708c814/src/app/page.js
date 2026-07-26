import React, { useState, useEffect } from 'react';

const ProductListingPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock API call for product listing (API-001)
  const fetchProducts = async () => {
    try {
      // In a real implementation, this would be:
      // const response = await fetch('/api/products');
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockData = [
        { id: 1, name: 'Laptop', price: 999.99, description: 'High-performance laptop', category: 'Electronics' },
        { id: 2, name: 'Coffee Mug', price: 12.99, description: 'Ceramic coffee mug', category: 'Home' },
        { id: 3, name: 'Running Shoes', price: 89.99, description: 'Comfortable running shoes', category: 'Sports' },
        { id: 4, name: 'Desk Lamp', price: 34.99, description: 'LED desk lamp', category: 'Home' },
        { id: 5, name: 'Smartphone', price: 699.99, description: 'Latest smartphone model', category: 'Electronics' },
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProducts(mockData);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch products');
      setLoading(false);
    }
  };

  // Mock API call for product details (API-002)
  const fetchProductDetails = async (productId) => {
    try {
      // In a real implementation, this would be:
      // const response = await fetch(`/api/products/${productId}`);
      // const data = await response.json();
      
      // Mock product details
      const mockDetails = {
        id: productId,
        name: 'Product Name',
        price: 0,
        description: 'Detailed product description',
        category: 'Category',
        image: '/placeholder-image.jpg',
        inStock: true,
      };
      
      return mockDetails;
    } catch (err) {
      throw new Error('Failed to fetch product details');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={fetchProducts}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Products</h1>
          <p className="text-lg text-gray-600">Discover our wide range of high-quality products</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {product.category}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{product.description}</p>
                
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
                  <button 
                    onClick={() => fetchProductDetails(product.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListingPage;