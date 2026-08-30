import { useState, useEffect } from 'react';

// Mock components and services since actual imports are not available
const ProductCard = ({ product, onAddToCart }) => (
  <div className="border rounded-lg p-4 shadow-sm">
    <h3 className="font-semibold text-gray-900">{product.name}</h3>
    <p className="text-gray-600">${product.price}</p>
    <button 
      onClick={() => onAddToCart(product.id)}
      className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
    >
      Add to Cart
    </button>
  </div>
);

const CategoryFilter = ({ selectedCategory, onCategoryChange }) => (
  <select 
    value={selectedCategory || ''}
    onChange={(e) => onCategoryChange(e.target.value || null)}
    className="border rounded px-3 py-2"
  >
    <option value="">All Categories</option>
    <option value="electronics">Electronics</option>
    <option value="clothing">Clothing</option>
    <option value="books">Books</option>
  </select>
);

const SearchBar = ({ onSearch }) => (
  <input 
    type="text" 
    placeholder="Search products..." 
    onChange={(e) => onSearch(e.target.value)}
    className="border rounded px-3 py-2 w-full md:w-auto"
  />
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex justify-center space-x-2 mt-6">
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-500 text-white' : 'border'}`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};

const getProducts = async (filter) => {
  // Mock implementation
  return [
    { id: '1', name: 'Product 1', price: 29.99, category: 'electronics' },
    { id: '2', name: 'Product 2', price: 39.99, category: 'clothing' },
    { id: '3', name: 'Product 3', price: 19.99, category: 'books' },
  ];
};

const addToCart = async (productId, userId) => {
  // Mock implementation
  return Promise.resolve();
};

const ProductCatalogPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);

  // Fetch products when filter changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const filteredProducts = await getProducts({
          ...filter,
          categoryId: selectedCategory || undefined,
          searchQuery: searchQuery || undefined
        });
        
        setProducts(filteredProducts);
        // In a real implementation, you would also fetch total count for pagination
        // For now, we'll assume the API returns all products if no limit is specified
        setTotalProducts(100); // Placeholder value
      } catch (err) {
        setError('Failed to load products. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filter, selectedCategory, searchQuery]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilter({ ...filter, page: 1 });
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setFilter({ ...filter, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilter({ ...filter, page });
  };

  const handleAddToCart = async (productId) => {
    try {
      // In a real app, you'd need the current user's ID
      // For now, we'll simulate adding to cart
      await addToCart(productId, 'current-user-id');
      // You might want to show a success message or update cart count
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Our Products</h1>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <SearchBar onSearch={handleSearch} />
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onCategoryChange={handleCategoryChange} 
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          <Pagination 
            currentPage={filter.page || 1}
            totalPages={Math.ceil(totalProducts / (filter.limit || 12))}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default ProductCatalogPage;