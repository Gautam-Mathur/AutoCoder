import { useState, useEffect, useRef } from 'react';
import { searchProducts } from '@/lib/productService';
import { addToCart } from '@/lib/cart';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim() !== '') {
        setIsLoading(true);
        searchProducts(query)
          .then((data) => {
            setResults(data);
            setShowResults(true);
          })
          .catch(() => {
            setResults([]);
            setShowResults(true);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== '') {
      searchProducts(query).then(setResults);
    }
  };

  const handleResultClick = (product: Product) => {
    // Navigate to product details page
    window.location.href = `/products/${product.id}`;
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="search-bar" ref={searchRef}>
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="search-input"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-button"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <button type="submit" className="search-button">
            Search
          </button>
        </div>
      </form>

      {showResults && (
        <div className="search-results-dropdown">
          {isLoading ? (
            <div className="loading">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="results-list">
              {results.map((product) => (
                <li
                  key={product.id}
                  className="result-item"
                  onClick={() => handleResultClick(product)}
                >
                  <div className="product-info">
                    <h4>{product.name}</h4>
                    <p>{product.description.substring(0, 100)}...</p>
                    <span className="price">${product.price.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-results">No products found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;