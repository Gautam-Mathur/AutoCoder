import { useState, useEffect } from 'react';
import SearchBar from '../SearchBar';
import { getUser, logout } from '../../lib/auth';
import { getCartCount } from '../../lib/cart';

const Header = () => {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
        
        const count = await getCartCount();
        setCartCount(count);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <a href="/" className="text-xl font-bold text-gray-800">ShopApp</a>
        </div>

        {/* Search Bar */}
        <div className="flex-1 mx-8">
          <SearchBar />
        </div>

        {/* User and Cart Navigation */}
        <nav className="flex items-center space-x-6">
          {user ? (
            <>
              <span className="text-gray-700">Welcome, {user.name}</span>
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <a 
              href="/login" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Login
            </a>
          )}
          
          <a href="/cart" className="relative">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-600 hover:text-gray-900 transition-colors"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;