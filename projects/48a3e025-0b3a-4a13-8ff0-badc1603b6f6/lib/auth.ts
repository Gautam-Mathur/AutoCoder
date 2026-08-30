// lib/auth.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'current_user';

/**
 * Login function to authenticate user
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with authentication result
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    // In a real application, this would make an API call to the backend
    // For demonstration, we'll simulate a successful login
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      // Store token and user in localStorage
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Authentication failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Network error occurred during login',
    };
  }
}

/**
 * Logout function to clear session
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Redirect to home page
  window.location.href = '/';
}

/**
 * Get current user information from session
 * @returns User object or null if not authenticated
 */
export function getUser(): User | null {
  const userString = localStorage.getItem(USER_KEY);
  return userString ? JSON.parse(userString) : null;
}

/**
 * Check if user is authenticated
 * @returns boolean indicating authentication status
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}

/**
 * Refresh authentication token
 * @returns Promise with refreshed token or null
 */
export async function refreshAuth(): Promise<string | null> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!token) {
      return null;
    }

    // In a real application, this would make an API call to refresh the token
    // For demonstration, we'll just return the existing token
    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Handle authentication errors and display messages
 * @param error - Error object or message
 */
export function handleAuthError(error: any): void {
  console.error('Authentication error:', error);
  
  // Display error message to user (in a real app, this would update UI)
  if (error.message) {
    alert(`Authentication error: ${error.message}`);
  } else {
    alert('An authentication error occurred');
  }
}