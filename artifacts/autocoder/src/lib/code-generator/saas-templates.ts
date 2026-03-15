// Full SaaS Templates - Complete production-ready applications
// Each template produces 20-50+ files with proper architecture

export interface SaaSProject {
  name: string;
  description: string;
  files: { path: string; content: string; language: string }[];
}

// ============================================
// SHARED BASE COMPONENTS
// ============================================

const createSaaSPackageJson = (name: string, extraDeps: Record<string, string> = {}) => JSON.stringify({
  name: name.toLowerCase().replace(/\s+/g, '-'),
  version: "1.0.0",
  type: "module",
  scripts: {
    dev: "concurrently \"npm run server\" \"npm run client\"",
    server: "node server/index.js",
    client: "vite",
    build: "vite build",
    start: "node server/index.js"
  },
  dependencies: {
    express: "^4.18.2",
    cors: "^2.8.5",
    bcryptjs: "^2.4.3",
    jsonwebtoken: "^9.0.2",
    uuid: "^9.0.0",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    axios: "^1.6.0",
    "date-fns": "^3.3.1",
    recharts: "^2.12.0",
    concurrently: "^8.2.2",
    ...extraDeps
  },
  devDependencies: {
    vite: "^5.0.0"
  }
}, null, 2);

const viteConfig = `import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  server: {
    host: '0.0.0.0',
    port: 5200,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
`;

const indexHtml = (title: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`;

const mainJsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
`;

const globalsCss = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #252542;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border: #374151;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
  --info: #3b82f6;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

a { color: inherit; text-decoration: none; }

button {
  cursor: pointer;
  font-family: inherit;
}

input, textarea, select {
  font-family: inherit;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-success {
  background: var(--success);
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success { background: rgba(34,197,94,0.2); color: var(--success); }
.badge-warning { background: rgba(234,179,8,0.2); color: var(--warning); }
.badge-danger { background: rgba(239,68,68,0.2); color: var(--danger); }
.badge-info { background: rgba(59,130,246,0.2); color: var(--info); }
.badge-primary { background: rgba(99,102,241,0.2); color: var(--primary); }
`;

const authContext = `import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/api/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
`;

const apiUtils = `import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
`;

const serverAuth = `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory user store (replace with database in production)
const users = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', password: bcrypt.hashSync('password123', 10), role: 'admin', createdAt: new Date().toISOString() },
  { id: '2', name: 'Demo User', email: 'user@example.com', password: bcrypt.hashSync('password123', 10), role: 'user', createdAt: new Date().toISOString() }
];

export function getUsers() { return users; }

export function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

export function findUserById(id) {
  return users.find(u => u.id === id);
}

export function createUser(name, email, password, role = 'user') {
  const user = {
    id: uuidv4(),
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  return user;
}

export function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = findUserById(decoded.id);
  if (!req.user) {
    return res.status(401).json({ error: 'User not found' });
  }

  next();
}

export function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}
`;

const authRoutes = `import { Router } from 'express';
import { findUserByEmail, createUser, generateToken, comparePassword, findUserById, authMiddleware } from './auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const user = createUser(name, email, password);
  const token = generateToken(user);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = findUserByEmail(email);
  if (!user || !comparePassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const { password, ...user } = req.user;
  res.json({ user });
});

export default router;
`;

const layoutComponent = `import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children, navItems = [] }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>SaaS App</h1>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                background: location.pathname === item.path ? 'var(--bg-tertiary)' : 'transparent',
                color: location.pathname === item.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: location.pathname === item.path ? '600' : '400'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600'
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role || 'User'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
`;

const loginPage = `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
          Welcome Back
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            color: 'var(--danger)',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)' }}>Sign up</Link>
        </p>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.75rem' }}>
          <strong>Demo Credentials:</strong><br />
          Admin: admin@example.com / password123<br />
          User: user@example.com / password123
        </div>
      </div>
    </div>
  );
}
`;

const registerPage = `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
          Create Account
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>
          Get started with your free account
        </p>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            color: 'var(--danger)',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Full Name
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
`;

const settingsPage = `import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/users/profile', { name, email });
      setMessage('Profile updated successfully');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Update failed');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/users/password', { currentPassword, newPassword });
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Password change failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Settings</h1>

      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          background: message.includes('success') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: \`1px solid \${message.includes('success') ? 'var(--success)' : 'var(--danger)'}\`,
          borderRadius: '8px',
          marginBottom: '1.5rem',
          color: message.includes('success') ? 'var(--success)' : 'var(--danger)'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '2rem', maxWidth: '600px' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Profile Information</h2>
          <form onSubmit={handleProfileUpdate}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Change Password</h2>
          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Current Password
              </label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                New Password
              </label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Account Information</h2>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>User ID</span>
              <span>{user?.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Role</span>
              <span className="badge badge-primary">{user?.role}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Member Since</span>
              <span>{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// ============================================
// INVOICING SAAS
// ============================================
export function generateInvoicingSaaS(): SaaSProject {
  return {
    name: "Invoice Pro",
    description: "Complete invoicing and billing SaaS with client management, recurring invoices, and payment tracking",
    files: [
      { path: "package.json", content: createSaaSPackageJson("invoice-pro"), language: "json" },
      { path: "vite.config.js", content: viteConfig, language: "javascript" },
      { path: "index.html", content: indexHtml("Invoice Pro - Billing Made Simple"), language: "html" },
      { path: "src/main.jsx", content: mainJsx, language: "javascript" },
      { path: "src/styles/globals.css", content: globalsCss, language: "css" },
      { path: "src/context/AuthContext.jsx", content: authContext, language: "javascript" },
      { path: "src/utils/api.js", content: apiUtils, language: "javascript" },
      { path: "src/components/Layout.jsx", content: layoutComponent, language: "javascript" },
      { path: "src/pages/Login.jsx", content: loginPage, language: "javascript" },
      { path: "src/pages/Register.jsx", content: registerPage, language: "javascript" },
      { path: "src/pages/Settings.jsx", content: settingsPage, language: "javascript" },
      { path: "server/auth.js", content: serverAuth, language: "javascript" },
      { path: "server/routes/auth.js", content: authRoutes, language: "javascript" },

      // Invoice-specific files
      {
        path: "src/App.jsx",
        content: `import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import CreateInvoice from './pages/CreateInvoice';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/invoices', label: 'Invoices', icon: '📄' },
  { path: '/clients', label: 'Clients', icon: '👥' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  return user ? <Layout navItems={navItems}>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/invoices/new" element={<PrivateRoute><CreateInvoice /></PrivateRoute>} />
      <Route path="/invoices/:id" element={<PrivateRoute><InvoiceDetail /></PrivateRoute>} />
      <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Dashboard.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [statsRes, invoicesRes] = await Promise.all([
      api.get('/api/stats'),
      api.get('/api/invoices?limit=5')
    ]);
    setStats(statsRes.data);
    setRecentInvoices(invoicesRes.data.invoices || []);
    setChartData(statsRes.data.monthlyRevenue || []);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Dashboard</h1>
        <Link to="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{formatCurrency(stats?.totalRevenue || 0)}</div>
          <div style={{ color: 'var(--success)', fontSize: '0.875rem', marginTop: '0.5rem' }}>+12.5% from last month</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Pending</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning)' }}>{formatCurrency(stats?.pending || 0)}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{stats?.pendingCount || 0} invoices</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Overdue</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--danger)' }}>{formatCurrency(stats?.overdue || 0)}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{stats?.overdueCount || 0} invoices</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Clients</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats?.clientCount || 0}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Active accounts</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Revenue Overview</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #374151' }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recent Invoices</h2>
            <Link to="/invoices" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentInvoices.map(invoice => (
              <Link
                key={invoice.id}
                to={\`/invoices/\${invoice.id}\`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{invoice.number}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{invoice.clientName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600' }}>{formatCurrency(invoice.total)}</div>
                  <span className={\`badge badge-\${invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}\`}>
                    {invoice.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Invoices.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    const res = await api.get(\`/api/invoices?status=\${filter}\`);
    setInvoices(res.data.invoices || []);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const filteredInvoices = invoices.filter(inv =>
    inv.number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="input"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <select
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: '150px' }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Invoice</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Client</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Due Date</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <Link to={\`/invoices/\${invoice.id}\`} style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    {invoice.number}
                  </Link>
                </td>
                <td style={{ padding: '1rem' }}>{invoice.clientName}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{invoice.date}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{invoice.dueDate}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(invoice.total)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span className={\`badge badge-\${invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : invoice.status === 'draft' ? 'info' : 'warning'}\`}>
                    {invoice.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn btn-sm btn-secondary" style={{ marginRight: '0.5rem' }}>Edit</button>
                  <button className="btn btn-sm btn-success">Mark Paid</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No invoices found
          </div>
        )}
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/InvoiceDetail.jsx",
        content: `import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const res = await api.get(\`/api/invoices/\${id}\`);
      setInvoice(res.data);
    } catch (err) {
      navigate('/invoices');
    }
  };

  const markAsPaid = async () => {
    await api.patch(\`/api/invoices/\${id}/status\`, { status: 'paid' });
    loadInvoice();
  };

  const sendReminder = async () => {
    await api.post(\`/api/invoices/\${id}/remind\`);
    alert('Reminder sent!');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (!invoice) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Link to="/invoices" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>← Back to Invoices</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.5rem' }}>Invoice {invoice.number}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn btn-secondary" onClick={sendReminder}>Send Reminder</button>
          {invoice.status !== 'paid' && (
            <button className="btn btn-success" onClick={markAsPaid}>Mark as Paid</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Invoice Pro</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                123 Business Street<br />
                City, State 12345<br />
                contact@invoicepro.com
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>{invoice.number}</div>
              <span className={\`badge badge-\${invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}\`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Bill To</div>
              <div style={{ fontWeight: '600' }}>{invoice.clientName}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{invoice.clientEmail}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Issue Date: </span>
                <span>{invoice.date}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Due Date: </span>
                <span>{invoice.dueDate}</span>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 0', textAlign: 'left', color: 'var(--text-secondary)' }}>Description</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--text-secondary)' }}>Qty</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--text-secondary)' }}>Rate</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--text-secondary)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0' }}>{item.description}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{formatCurrency(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '250px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal || invoice.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tax (0%)</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '2px solid var(--border)', fontWeight: '700', fontSize: '1.25rem' }}>
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Payment History</h3>
            {invoice.payments?.length > 0 ? (
              invoice.payments.map((p, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatCurrency(p.amount)}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{p.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No payments recorded</div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', marginTop: '6px' }}></div>
                <div>
                  <div>Invoice created</div>
                  <div style={{ color: 'var(--text-muted)' }}>{invoice.date}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px' }}></div>
                <div>
                  <div>Invoice sent to client</div>
                  <div style={{ color: 'var(--text-muted)' }}>{invoice.date}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/CreateInvoice.jsx",
        content: `import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadClients();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().split('T')[0]);
  }, []);

  const loadClients = async () => {
    const res = await api.get('/api/clients');
    setClients(res.data.clients || []);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'description' ? value : Number(value);
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

  const handleSubmit = async (e, status = 'pending') => {
    e.preventDefault();
    try {
      await api.post('/api/invoices', {
        clientId,
        date,
        dueDate,
        items: items.filter(i => i.description),
        notes,
        status
      });
      navigate('/invoices');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create invoice');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Create Invoice</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Invoice Details</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Client</label>
                  <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Issue Date</label>
                  <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Due Date</label>
                  <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Line Items</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <div>Description</div>
                <div>Qty</div>
                <div>Rate</div>
                <div>Amount</div>
                <div></div>
              </div>

              {items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                  />
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(i, 'rate', e.target.value)}
                  />
                  <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)' }}>
                    {formatCurrency(item.quantity * item.rate)}
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => removeItem(i)}>X</button>
                </div>
              ))}

              <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>+ Add Item</button>
            </div>

            <div className="card">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Notes</label>
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, thank you note, etc."
              />
            </div>
          </div>

          <div>
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Summary</h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tax (0%)</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontWeight: '700', fontSize: '1.25rem' }}>
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary">Create & Send</button>
                <button type="button" className="btn btn-secondary" onClick={(e) => handleSubmit(e, 'draft')}>Save as Draft</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Clients.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', company: '' });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const res = await api.get('/api/clients');
    setClients(res.data.clients || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(\`/api/clients/\${editingClient.id}\`, form);
      } else {
        await api.post('/api/clients', form);
      }
      setShowModal(false);
      setEditingClient(null);
      setForm({ name: '', email: '', phone: '', address: '', company: '' });
      loadClients();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save client');
    }
  };

  const editClient = (client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email, phone: client.phone || '', address: client.address || '', company: client.company || '' });
    setShowModal(true);
  };

  const deleteClient = async (id) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await api.delete(\`/api/clients/\${id}\`);
      loadClients();
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Clients</h1>
        <button className="btn btn-primary" onClick={() => { setEditingClient(null); setForm({ name: '', email: '', phone: '', address: '', company: '' }); setShowModal(true); }}>
          + Add Client
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {clients.map(client => (
          <div key={client.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.25rem'
                }}>
                  {client.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>{client.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{client.company || 'No company'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => editClient(client)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteClient(client.id)}>Delete</button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                <span>{client.email}</span>
              </div>
              {client.phone && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Address:</span>
                  <span>{client.address}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Total Billed</div>
                <div style={{ fontWeight: '600' }}>{formatCurrency(client.totalBilled)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Outstanding</div>
                <div style={{ fontWeight: '600', color: client.outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {formatCurrency(client.outstanding)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Invoices</div>
                <div style={{ fontWeight: '600' }}>{client.invoiceCount || 0}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{editingClient ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Name *</label>
                  <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email *</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Company</label>
                  <input type="text" className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Phone</label>
                  <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Address</label>
                  <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingClient ? 'Update' : 'Add'} Client</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Reports.jsx",
        content: `import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../utils/api';

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState('year');

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    const res = await api.get(\`/api/reports?range=\${dateRange}\`);
    setReportData(res.data);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#3b82f6'];

  if (!reportData) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reports</h1>
        <select className="input" value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width: 'auto' }}>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{formatCurrency(reportData.totalRevenue)}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Invoices Sent</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{reportData.invoiceCount}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Collection Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--success)' }}>{reportData.collectionRate}%</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Avg Invoice</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{formatCurrency(reportData.avgInvoice)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Revenue Trend</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #374151' }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Invoice Status</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.statusBreakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(reportData.statusBreakdown || []).map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
            {(reportData.statusBreakdown || []).map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: COLORS[i] }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Top Clients by Revenue</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {(reportData.topClients || []).map((client, i) => (
            <div key={client.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '32px', fontWeight: '600', color: 'var(--text-secondary)' }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{client.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{client.invoiceCount} invoices</div>
              </div>
              <div style={{ fontWeight: '700' }}>{formatCurrency(client.revenue)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "server/index.js",
        content: `import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import invoiceRoutes from './routes/invoices.js';
import clientRoutes from './routes/clients.js';
import statsRoutes from './routes/stats.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportRoutes);

// Serve static files in production
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});`,
        language: "javascript"
      },
      {
        path: "server/routes/invoices.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth.js';

const router = Router();

// In-memory store
let invoices = [
  { id: '1', number: 'INV-0001', clientId: '1', clientName: 'Acme Corp', clientEmail: 'contact@acme.com', date: '2024-01-15', dueDate: '2024-02-15', items: [{ description: 'Web Development', quantity: 1, rate: 5000 }], total: 5000, status: 'paid', userId: '1' },
  { id: '2', number: 'INV-0002', clientId: '2', clientName: 'Tech Solutions', clientEmail: 'info@techsol.com', date: '2024-01-20', dueDate: '2024-02-20', items: [{ description: 'Consulting', quantity: 10, rate: 150 }], total: 1500, status: 'pending', userId: '1' },
  { id: '3', number: 'INV-0003', clientId: '1', clientName: 'Acme Corp', clientEmail: 'contact@acme.com', date: '2024-02-01', dueDate: '2024-03-01', items: [{ description: 'Maintenance', quantity: 1, rate: 2000 }], total: 2000, status: 'overdue', userId: '1' },
];

let invoiceCounter = 4;

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status, limit } = req.query;
  let result = invoices.filter(i => i.userId === req.user.id || req.user.role === 'admin');

  if (status && status !== 'all') {
    result = result.filter(i => i.status === status);
  }

  if (limit) {
    result = result.slice(0, parseInt(limit));
  }

  res.json({ invoices: result });
});

router.get('/:id', (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.post('/', (req, res) => {
  const { clientId, date, dueDate, items, notes, status = 'pending' } = req.body;

  // Get client info (simplified)
  const clientName = 'Client ' + clientId;
  const clientEmail = 'client' + clientId + '@example.com';

  const total = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

  const invoice = {
    id: uuidv4(),
    number: \`INV-\${String(invoiceCounter++).padStart(4, '0')}\`,
    clientId,
    clientName,
    clientEmail,
    date,
    dueDate,
    items,
    notes,
    total,
    status,
    userId: req.user.id,
    createdAt: new Date().toISOString()
  };

  invoices.push(invoice);
  res.json(invoice);
});

router.patch('/:id/status', (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  invoice.status = req.body.status;
  res.json(invoice);
});

router.post('/:id/remind', (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  // Simulate sending reminder
  res.json({ success: true, message: 'Reminder sent to ' + invoice.clientEmail });
});

router.delete('/:id', (req, res) => {
  const index = invoices.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Invoice not found' });

  invoices.splice(index, 1);
  res.json({ success: true });
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/clients.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth.js';

const router = Router();

let clients = [
  { id: '1', name: 'Acme Corporation', email: 'contact@acme.com', phone: '555-0100', address: '123 Business St, NYC', company: 'Acme Corp', totalBilled: 7000, outstanding: 2000, invoiceCount: 2, userId: '1' },
  { id: '2', name: 'Tech Solutions Inc', email: 'info@techsol.com', phone: '555-0200', address: '456 Tech Ave, SF', company: 'Tech Solutions', totalBilled: 1500, outstanding: 1500, invoiceCount: 1, userId: '1' },
  { id: '3', name: 'StartUp Ventures', email: 'hello@startup.io', phone: '555-0300', address: '789 Innovation Blvd', company: 'StartUp.io', totalBilled: 3500, outstanding: 0, invoiceCount: 3, userId: '1' },
];

router.use(authMiddleware);

router.get('/', (req, res) => {
  const userClients = clients.filter(c => c.userId === req.user.id || req.user.role === 'admin');
  res.json({ clients: userClients });
});

router.get('/:id', (req, res) => {
  const client = clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

router.post('/', (req, res) => {
  const { name, email, phone, address, company } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const client = {
    id: uuidv4(),
    name,
    email,
    phone: phone || '',
    address: address || '',
    company: company || '',
    totalBilled: 0,
    outstanding: 0,
    invoiceCount: 0,
    userId: req.user.id,
    createdAt: new Date().toISOString()
  };

  clients.push(client);
  res.json(client);
});

router.put('/:id', (req, res) => {
  const client = clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const { name, email, phone, address, company } = req.body;
  Object.assign(client, { name, email, phone, address, company });

  res.json(client);
});

router.delete('/:id', (req, res) => {
  const index = clients.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Client not found' });

  clients.splice(index, 1);
  res.json({ success: true });
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/stats.js",
        content: `import { Router } from 'express';
import { authMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  // Simulated stats
  res.json({
    totalRevenue: 12000,
    pending: 3500,
    pendingCount: 2,
    overdue: 2000,
    overdueCount: 1,
    clientCount: 3,
    monthlyRevenue: [
      { month: 'Jan', revenue: 5000 },
      { month: 'Feb', revenue: 3500 },
      { month: 'Mar', revenue: 4200 },
      { month: 'Apr', revenue: 6100 },
      { month: 'May', revenue: 5800 },
      { month: 'Jun', revenue: 7200 }
    ]
  });
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/reports.js",
        content: `import { Router } from 'express';
import { authMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  // Simulated report data
  res.json({
    totalRevenue: 45000,
    invoiceCount: 24,
    collectionRate: 87,
    avgInvoice: 1875,
    revenueTrend: [
      { month: 'Jan', revenue: 5000 },
      { month: 'Feb', revenue: 6500 },
      { month: 'Mar', revenue: 4200 },
      { month: 'Apr', revenue: 8100 },
      { month: 'May', revenue: 7800 },
      { month: 'Jun', revenue: 9200 },
      { month: 'Jul', revenue: 4200 }
    ],
    statusBreakdown: [
      { name: 'Paid', value: 18 },
      { name: 'Pending', value: 4 },
      { name: 'Overdue', value: 2 }
    ],
    topClients: [
      { name: 'Acme Corporation', revenue: 15000, invoiceCount: 8 },
      { name: 'Tech Solutions Inc', revenue: 12000, invoiceCount: 6 },
      { name: 'StartUp Ventures', revenue: 8000, invoiceCount: 5 },
      { name: 'Global Industries', revenue: 6000, invoiceCount: 3 },
      { name: 'Local Business Co', revenue: 4000, invoiceCount: 2 }
    ]
  });
});

export default router;`,
        language: "javascript"
      }
    ]
  };
}

// ============================================
// CRM SAAS
// ============================================
export function generateCRMSaaS(): SaaSProject {
  return {
    name: "CRM Pro",
    description: "Complete CRM with contacts, deals pipeline, activities, and email integration",
    files: [
      { path: "package.json", content: createSaaSPackageJson("crm-pro"), language: "json" },
      { path: "vite.config.js", content: viteConfig, language: "javascript" },
      { path: "index.html", content: indexHtml("CRM Pro - Customer Relationship Management"), language: "html" },
      { path: "src/main.jsx", content: mainJsx, language: "javascript" },
      { path: "src/styles/globals.css", content: globalsCss, language: "css" },
      { path: "src/context/AuthContext.jsx", content: authContext, language: "javascript" },
      { path: "src/utils/api.js", content: apiUtils, language: "javascript" },
      { path: "src/components/Layout.jsx", content: layoutComponent, language: "javascript" },
      { path: "src/pages/Login.jsx", content: loginPage, language: "javascript" },
      { path: "src/pages/Register.jsx", content: registerPage, language: "javascript" },
      { path: "src/pages/Settings.jsx", content: settingsPage, language: "javascript" },
      { path: "server/auth.js", content: serverAuth, language: "javascript" },
      { path: "server/routes/auth.js", content: authRoutes, language: "javascript" },

      {
        path: "src/App.jsx",
        content: `import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Deals from './pages/Deals';
import Activities from './pages/Activities';
import Settings from './pages/Settings';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/contacts', label: 'Contacts', icon: '👥' },
  { path: '/deals', label: 'Deals', icon: '💰' },
  { path: '/activities', label: 'Activities', icon: '📋' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  return user ? <Layout navItems={navItems}>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
      <Route path="/contacts/:id" element={<PrivateRoute><ContactDetail /></PrivateRoute>} />
      <Route path="/deals" element={<PrivateRoute><Deals /></PrivateRoute>} />
      <Route path="/activities" element={<PrivateRoute><Activities /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Dashboard.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const res = await api.get('/api/stats');
    setStats(res.data);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#3b82f6'];

  if (!stats) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Dashboard</h1>
        <Link to="/deals" className="btn btn-primary">+ New Deal</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Contacts</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.contactCount}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Open Deals</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.openDeals}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Pipeline Value</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(stats.pipelineValue)}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Won This Month</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{formatCurrency(stats.wonThisMonth)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Deal Pipeline</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pipelineData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="stage" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #374151' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Upcoming Activities</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(stats.upcomingActivities || []).map(activity => (
              <div key={activity.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '600' }}>{activity.title}</span>
                  <span className={\`badge badge-\${activity.type === 'call' ? 'info' : activity.type === 'meeting' ? 'primary' : 'warning'}\`}>
                    {activity.type}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{activity.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Contacts.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', title: '' });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const res = await api.get('/api/contacts');
    setContacts(res.data.contacts || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/contacts', form);
    setShowModal(false);
    setForm({ name: '', email: '', phone: '', company: '', title: '' });
    loadContacts();
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Contacts</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Contact</button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="input"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Name</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Company</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Title</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map(contact => (
              <tr key={contact.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <Link to={\`/contacts/\${contact.id}\`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600'
                    }}>
                      {contact.name?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{contact.name}</span>
                  </Link>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{contact.email}</td>
                <td style={{ padding: '1rem' }}>{contact.company}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{contact.title}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={\`badge badge-\${contact.status === 'active' ? 'success' : contact.status === 'lead' ? 'info' : 'warning'}\`}>
                    {contact.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Add Contact</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Name *</label>
                  <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email *</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Company</label>
                  <input type="text" className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Title</label>
                  <input type="text" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Phone</label>
                  <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Add Contact</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/ContactDetail.jsx",
        content: `import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    loadContact();
  }, [id]);

  const loadContact = async () => {
    const [contactRes, activitiesRes, dealsRes] = await Promise.all([
      api.get(\`/api/contacts/\${id}\`),
      api.get(\`/api/activities?contactId=\${id}\`),
      api.get(\`/api/deals?contactId=\${id}\`)
    ]);
    setContact(contactRes.data);
    setActivities(activitiesRes.data.activities || []);
    setDeals(dealsRes.data.deals || []);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (!contact) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/contacts" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>← Back to Contacts</Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '1rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '1.5rem'
              }}>
                {contact.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{contact.name}</h1>
                <div style={{ color: 'var(--text-secondary)' }}>{contact.title} at {contact.company}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                <div>{contact.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <div>{contact.phone || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
                <span className={\`badge badge-\${contact.status === 'active' ? 'success' : 'info'}\`}>{contact.status}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>Email</button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Call</button>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Deals</h2>
            {deals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {deals.map(deal => (
                  <div key={deal.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600' }}>{deal.title}</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(deal.value)}</span>
                    </div>
                    <span className={\`badge badge-\${deal.stage === 'won' ? 'success' : deal.stage === 'lost' ? 'danger' : 'primary'}\`}>
                      {deal.stage}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No deals yet</div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Activity Timeline</h2>
              <button className="btn btn-sm btn-primary">+ Log Activity</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {activities.map((activity, i) => (
                <div key={activity.id} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: activity.type === 'call' ? 'rgba(59,130,246,0.2)' : activity.type === 'email' ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {activity.type === 'call' ? '📞' : activity.type === 'email' ? '✉️' : '📅'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{activity.title}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{activity.date}</div>
                    {activity.notes && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{activity.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Deals.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', stage: 'Lead', contactId: '' });
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [dealsRes, contactsRes] = await Promise.all([
      api.get('/api/deals'),
      api.get('/api/contacts')
    ]);
    setDeals(dealsRes.data.deals || []);
    setContacts(contactsRes.data.contacts || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/deals', form);
    setShowModal(false);
    setForm({ title: '', value: '', stage: 'Lead', contactId: '' });
    loadData();
  };

  const updateStage = async (dealId, newStage) => {
    await api.patch(\`/api/deals/\${dealId}\`, { stage: newStage });
    loadData();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    return acc;
  }, {});

  const stageColors = {
    Lead: '#64748b',
    Qualified: '#3b82f6',
    Proposal: '#6366f1',
    Negotiation: '#eab308',
    Won: '#22c55e',
    Lost: '#ef4444'
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Deals Pipeline</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Deal</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {STAGES.map(stage => (
          <div key={stage} style={{ minWidth: '280px', flex: '0 0 280px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              padding: '0.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stageColors[stage] }} />
              <span style={{ fontWeight: '600' }}>{stage}</span>
              <span style={{
                background: 'var(--bg-tertiary)',
                padding: '0.125rem 0.5rem',
                borderRadius: '10px',
                fontSize: '0.75rem',
                marginLeft: 'auto'
              }}>
                {dealsByStage[stage].length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dealsByStage[stage].map(deal => (
                <div
                  key={deal.id}
                  className="card"
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{deal.title}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {formatCurrency(deal.value)}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {deal.contactName}
                  </div>
                  {stage !== 'Won' && stage !== 'Lost' && (
                    <select
                      className="input"
                      value={stage}
                      onChange={(e) => updateStage(deal.id, e.target.value)}
                      style={{ padding: '0.5rem' }}
                    >
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Add Deal</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Deal Title *</label>
                  <input type="text" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Value *</label>
                  <input type="number" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contact</label>
                  <select className="input" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                    <option value="">Select contact</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Stage</label>
                  <select className="input" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Create Deal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Activities.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'call', date: '', notes: '', contactId: '' });
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    const [activitiesRes, contactsRes] = await Promise.all([
      api.get(\`/api/activities?type=\${filter}\`),
      api.get('/api/contacts')
    ]);
    setActivities(activitiesRes.data.activities || []);
    setContacts(contactsRes.data.contacts || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/activities', form);
    setShowModal(false);
    setForm({ title: '', type: 'call', date: '', notes: '', contactId: '' });
    loadData();
  };

  const markComplete = async (id) => {
    await api.patch(\`/api/activities/\${id}\`, { completed: true });
    loadData();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Activities</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Schedule Activity</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'call', 'email', 'meeting', 'task'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={\`btn btn-sm \${filter === type ? 'btn-primary' : 'btn-secondary'}\`}
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {activities.map(activity => (
          <div key={activity.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: activity.type === 'call' ? 'rgba(59,130,246,0.2)' : activity.type === 'email' ? 'rgba(34,197,94,0.2)' : activity.type === 'meeting' ? 'rgba(99,102,241,0.2)' : 'rgba(234,179,8,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {activity.type === 'call' ? '📞' : activity.type === 'email' ? '✉️' : activity.type === 'meeting' ? '📅' : '✓'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{activity.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {activity.contactName && <span>{activity.contactName} • </span>}
                    {activity.date}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={\`badge badge-\${activity.type === 'call' ? 'info' : activity.type === 'email' ? 'success' : activity.type === 'meeting' ? 'primary' : 'warning'}\`}>
                    {activity.type}
                  </span>
                  {!activity.completed && (
                    <button className="btn btn-sm btn-success" onClick={() => markComplete(activity.id)}>Complete</button>
                  )}
                </div>
              </div>
              {activity.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{activity.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Schedule Activity</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Title *</label>
                  <input type="text" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Date *</label>
                  <input type="datetime-local" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contact</label>
                  <select className="input" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                    <option value="">Select contact</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Notes</label>
                  <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Schedule</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "server/index.js",
        content: `import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import dealRoutes from './routes/deals.js';
import activityRoutes from './routes/activities.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/stats', statsRoutes);

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});`,
        language: "javascript"
      },
      {
        path: "server/routes/contacts.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth.js';

const router = Router();

let contacts = [
  { id: '1', name: 'John Smith', email: 'john@acme.com', phone: '555-0101', company: 'Acme Corp', title: 'CEO', status: 'active', userId: '1' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@techco.com', phone: '555-0102', company: 'TechCo', title: 'CTO', status: 'active', userId: '1' },
  { id: '3', name: 'Mike Wilson', email: 'mike@startup.io', phone: '555-0103', company: 'StartUp Inc', title: 'Founder', status: 'lead', userId: '1' },
];

router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({ contacts });
});

router.get('/:id', (req, res) => {
  const contact = contacts.find(c => c.id === req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  res.json(contact);
});

router.post('/', (req, res) => {
  const contact = { id: uuidv4(), ...req.body, status: 'lead', userId: req.user.id };
  contacts.push(contact);
  res.json(contact);
});

router.put('/:id', (req, res) => {
  const contact = contacts.find(c => c.id === req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  Object.assign(contact, req.body);
  res.json(contact);
});

router.delete('/:id', (req, res) => {
  contacts = contacts.filter(c => c.id !== req.params.id);
  res.json({ success: true });
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/deals.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth.js';

const router = Router();

let deals = [
  { id: '1', title: 'Enterprise License', value: 50000, stage: 'Proposal', contactId: '1', contactName: 'John Smith', userId: '1' },
  { id: '2', title: 'Consulting Project', value: 25000, stage: 'Negotiation', contactId: '2', contactName: 'Sarah Johnson', userId: '1' },
  { id: '3', title: 'Startup Package', value: 10000, stage: 'Lead', contactId: '3', contactName: 'Mike Wilson', userId: '1' },
  { id: '4', title: 'Annual Contract', value: 75000, stage: 'Won', contactId: '1', contactName: 'John Smith', userId: '1' },
];

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { contactId } = req.query;
  let result = deals;
  if (contactId) result = deals.filter(d => d.contactId === contactId);
  res.json({ deals: result });
});

router.post('/', (req, res) => {
  const deal = { id: uuidv4(), ...req.body, userId: req.user.id };
  deals.push(deal);
  res.json(deal);
});

router.patch('/:id', (req, res) => {
  const deal = deals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: 'Not found' });
  Object.assign(deal, req.body);
  res.json(deal);
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/activities.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../auth.js';

const router = Router();

let activities = [
  { id: '1', title: 'Follow up call', type: 'call', date: '2024-02-15 10:00', contactId: '1', contactName: 'John Smith', notes: 'Discuss contract terms', completed: false, userId: '1' },
  { id: '2', title: 'Send proposal', type: 'email', date: '2024-02-14 14:00', contactId: '2', contactName: 'Sarah Johnson', notes: '', completed: true, userId: '1' },
  { id: '3', title: 'Product demo', type: 'meeting', date: '2024-02-16 15:30', contactId: '3', contactName: 'Mike Wilson', notes: 'Show new features', completed: false, userId: '1' },
];

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { type, contactId } = req.query;
  let result = activities;
  if (type && type !== 'all') result = result.filter(a => a.type === type);
  if (contactId) result = result.filter(a => a.contactId === contactId);
  res.json({ activities: result });
});

router.post('/', (req, res) => {
  const activity = { id: uuidv4(), ...req.body, completed: false, userId: req.user.id };
  activities.push(activity);
  res.json(activity);
});

router.patch('/:id', (req, res) => {
  const activity = activities.find(a => a.id === req.params.id);
  if (!activity) return res.status(404).json({ error: 'Not found' });
  Object.assign(activity, req.body);
  res.json(activity);
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/stats.js",
        content: `import { Router } from 'express';
import { authMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({
    contactCount: 15,
    openDeals: 8,
    pipelineValue: 185000,
    wonThisMonth: 75000,
    pipelineData: [
      { stage: 'Lead', value: 35000 },
      { stage: 'Qualified', value: 45000 },
      { stage: 'Proposal', value: 50000 },
      { stage: 'Negotiation', value: 55000 }
    ],
    upcomingActivities: [
      { id: '1', title: 'Follow up with John', type: 'call', date: 'Today, 2:00 PM' },
      { id: '2', title: 'Product demo', type: 'meeting', date: 'Tomorrow, 10:00 AM' },
      { id: '3', title: 'Send contract', type: 'task', date: 'Feb 16, 3:00 PM' }
    ]
  });
});

export default router;`,
        language: "javascript"
      }
    ]
  };
}

// ============================================
// E-COMMERCE SAAS (Simplified but complete)
// ============================================
export function generateEcommerceSaaS(): SaaSProject {
  const bt = '`';
  return {
    name: "Shop Pro",
    description: "Complete e-commerce platform with product catalog, cart, checkout, and order management",
    files: [
      { path: "package.json", content: createSaaSPackageJson("shop-pro", { stripe: "^14.0.0" }), language: "json" },
      { path: "vite.config.js", content: viteConfig, language: "javascript" },
      { path: "index.html", content: indexHtml("Shop Pro - E-Commerce Platform"), language: "html" },
      { path: "src/main.jsx", content: mainJsx, language: "javascript" },
      { path: "src/styles/globals.css", content: globalsCss, language: "css" },
      { path: "src/context/AuthContext.jsx", content: authContext, language: "javascript" },
      { path: "src/utils/api.js", content: apiUtils, language: "javascript" },
      { path: "src/components/Layout.jsx", content: layoutComponent, language: "javascript" },
      { path: "src/pages/Login.jsx", content: loginPage, language: "javascript" },
      { path: "src/pages/Register.jsx", content: registerPage, language: "javascript" },
      { path: "src/pages/Settings.jsx", content: settingsPage, language: "javascript" },
      { path: "server/auth.js", content: serverAuth, language: "javascript" },
      { path: "server/routes/auth.js", content: authRoutes, language: "javascript" },

      {
        path: "src/App.jsx",
        content: `import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Storefront from './pages/Storefront';
import Cart from './pages/Cart';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'D' },
  { path: '/products', label: 'Products', icon: 'P' },
  { path: '/orders', label: 'Orders', icon: 'O' },
  { path: '/customers', label: 'Customers', icon: 'C' },
  { path: '/storefront', label: 'Store', icon: 'S' },
  { path: '/settings', label: 'Settings', icon: 'G' },
];

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  return user ? <Layout navItems={navItems}>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/shop" element={<Storefront />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
      <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/storefront" element={<PrivateRoute><Storefront /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Dashboard.jsx",
        content: `import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/stats').then(res => setStats(res.data));
  }, []);

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (!stats) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{formatCurrency(stats.revenue)}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.orderCount}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Products</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.productCount}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Customers</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.customerCount}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Sales Overview</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #374151' }} />
              <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Products.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', category: '', stock: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await api.get('/api/products');
    setProducts(res.data.products || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/products', { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) });
    setShowModal(false);
    setForm({ name: '', price: '', category: '', stock: '' });
    loadProducts();
  };

  const deleteProduct = async (id) => {
    if (confirm('Delete this product?')) {
      await api.delete('/api/products/' + id);
      loadProducts();
    }
  };

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Products</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {products.map(product => (
          <div key={product.id} className="card">
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{product.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{product.category}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>{formatCurrency(product.price)}</span>
              <span className={'badge badge-' + (product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'danger')}>{product.stock} in stock</span>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(product.id)}>Delete</button>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Product</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input type="text" className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input type="number" className="input" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                <input type="number" className="input" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Home">Home</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Orders.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    const res = await api.get('/api/orders?status=' + filter);
    setOrders(res.data.orders || []);
  };

  const updateStatus = async (id, status) => {
    await api.patch('/api/orders/' + id, { status });
    loadOrders();
  };

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Orders</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'pending', 'processing', 'shipped', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={'btn btn-sm ' + (filter === s ? 'btn-primary' : 'btn-secondary')}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Order ID</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Customer</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{order.id}</td>
                <td style={{ padding: '1rem' }}>{order.customerName}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{order.date}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(order.total)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span className={'badge badge-' + (order.status === 'completed' ? 'success' : order.status === 'shipped' ? 'info' : 'warning')}>{order.status}</span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <select className="input" value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)} style={{ width: 'auto', padding: '0.5rem' }}>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Customers.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get('/api/customers').then(res => setCustomers(res.data.customers || []));
  }, []);

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Customers</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {customers.map(customer => (
          <div key={customer.id} className="card">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                {customer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{customer.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{customer.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders</div>
                <div style={{ fontWeight: '600' }}>{customer.orderCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spent</div>
                <div style={{ fontWeight: '600' }}>{formatCurrency(customer.totalSpent)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined</div>
                <div style={{ fontWeight: '600' }}>{customer.joinDate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Storefront.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    api.get('/api/products').then(res => setProducts(res.data.products || []));
    const saved = localStorage.getItem('cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const addToCart = (product) => {
    const existing = cart.find(i => i.id === product.id);
    const newCart = existing
      ? cart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      : [...cart, { ...product, qty: 1 }];
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Shop</h1>
        <Link to="/cart" className="btn btn-primary">
          Cart ({cart.reduce((sum, i) => sum + i.qty, 0)}) - {formatCurrency(cartTotal)}
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {products.map(product => (
          <div key={product.id} className="card">
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{product.name}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{product.category}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>{formatCurrency(product.price)}</span>
              <button className="btn btn-sm btn-primary" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                {product.stock === 0 ? 'Sold Out' : 'Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Cart.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const updateQty = (id, delta) => {
    const newCart = cart.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const checkout = async () => {
    await api.post('/api/orders', { items: cart, total: cart.reduce((sum, i) => sum + i.price * i.qty, 0) });
    localStorage.removeItem('cart');
    setCart([]);
    alert('Order placed!');
  };

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/shop" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Back to Shop</Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '1rem 0 2rem' }}>Cart</h1>

      {cart.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Your cart is empty</div>
          <Link to="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>Shop Now</Link>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatCurrency(item.price)} each</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => updateQty(item.id, -1)}>-</button>
                  <span>{item.qty}</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => updateQty(item.id, 1)}>+</button>
                  <span style={{ marginLeft: '1rem', fontWeight: '600' }}>{formatCurrency(item.price * item.qty)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <button onClick={checkout} className="btn btn-primary" style={{ width: '100%' }}>Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "server/index.js",
        content: `import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stats', statsRoutes);

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('E-commerce server on port ' + PORT));`,
        language: "javascript"
      },
      {
        path: "server/routes/products.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

let products = [
  { id: '1', name: 'Wireless Headphones', price: 149.99, category: 'Electronics', stock: 25 },
  { id: '2', name: 'Running Shoes', price: 89.99, category: 'Sports', stock: 50 },
  { id: '3', name: 'Coffee Maker', price: 79.99, category: 'Home', stock: 15 },
  { id: '4', name: 'Denim Jacket', price: 129.99, category: 'Clothing', stock: 30 },
  { id: '5', name: 'Smart Watch', price: 299.99, category: 'Electronics', stock: 8 },
];

router.get('/', (req, res) => res.json({ products }));

router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

router.post('/', (req, res) => {
  const product = { id: uuidv4(), ...req.body };
  products.push(product);
  res.json(product);
});

router.delete('/:id', (req, res) => {
  products = products.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/orders.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

let orders = [
  { id: 'ORD-001', customerName: 'John Doe', date: '2024-02-10', total: 259.97, status: 'completed' },
  { id: 'ORD-002', customerName: 'Jane Smith', date: '2024-02-11', total: 149.99, status: 'shipped' },
  { id: 'ORD-003', customerName: 'Bob Wilson', date: '2024-02-12', total: 169.98, status: 'processing' },
  { id: 'ORD-004', customerName: 'Alice Brown', date: '2024-02-12', total: 549.96, status: 'pending' },
];

router.get('/', (req, res) => {
  const { status } = req.query;
  let result = orders;
  if (status && status !== 'all') result = orders.filter(o => o.status === status);
  res.json({ orders: result });
});

router.post('/', (req, res) => {
  const order = {
    id: 'ORD-' + String(orders.length + 1).padStart(3, '0'),
    customerName: 'Customer',
    date: new Date().toISOString().split('T')[0],
    total: req.body.total,
    status: 'pending'
  };
  orders.push(order);
  res.json(order);
});

router.patch('/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  Object.assign(order, req.body);
  res.json(order);
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/customers.js",
        content: `import { Router } from 'express';

const router = Router();

const customers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', orderCount: 5, totalSpent: 849.95, joinDate: 'Jan 2024' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', orderCount: 3, totalSpent: 449.97, joinDate: 'Dec 2023' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', orderCount: 8, totalSpent: 1249.92, joinDate: 'Nov 2023' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', orderCount: 2, totalSpent: 299.98, joinDate: 'Feb 2024' },
];

router.get('/', (req, res) => res.json({ customers }));

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/stats.js",
        content: `import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    revenue: 12580.50,
    orderCount: 156,
    productCount: 48,
    customerCount: 89,
    salesData: [
      { month: 'Jan', sales: 4200 },
      { month: 'Feb', sales: 5100 },
      { month: 'Mar', sales: 4800 },
      { month: 'Apr', sales: 6200 },
      { month: 'May', sales: 5800 },
      { month: 'Jun', sales: 7100 }
    ]
  });
});

export default router;`,
        language: "javascript"
      }
    ]
  };
}

// ============================================
// PROJECT MANAGEMENT / KANBAN SAAS
// ============================================
export function generateProjectSaaS(): SaaSProject {
  return {
    name: "Project Hub",
    description: "Complete project management with Kanban boards, tasks, team collaboration, and time tracking",
    files: [
      { path: "package.json", content: createSaaSPackageJson("project-hub"), language: "json" },
      { path: "vite.config.js", content: viteConfig, language: "javascript" },
      { path: "index.html", content: indexHtml("Project Hub - Project Management"), language: "html" },
      { path: "src/main.jsx", content: mainJsx, language: "javascript" },
      { path: "src/styles/globals.css", content: globalsCss, language: "css" },
      { path: "src/context/AuthContext.jsx", content: authContext, language: "javascript" },
      { path: "src/utils/api.js", content: apiUtils, language: "javascript" },
      { path: "src/components/Layout.jsx", content: layoutComponent, language: "javascript" },
      { path: "src/pages/Login.jsx", content: loginPage, language: "javascript" },
      { path: "src/pages/Register.jsx", content: registerPage, language: "javascript" },
      { path: "src/pages/Settings.jsx", content: settingsPage, language: "javascript" },
      { path: "server/auth.js", content: serverAuth, language: "javascript" },
      { path: "server/routes/auth.js", content: authRoutes, language: "javascript" },

      {
        path: "src/App.jsx",
        content: `import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectBoard from './pages/ProjectBoard';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Settings from './pages/Settings';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'D' },
  { path: '/projects', label: 'Projects', icon: 'P' },
  { path: '/tasks', label: 'My Tasks', icon: 'T' },
  { path: '/team', label: 'Team', icon: 'M' },
  { path: '/settings', label: 'Settings', icon: 'S' },
];

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  return user ? <Layout navItems={navItems}>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectBoard /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
      <Route path="/team" element={<PrivateRoute><Team /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Dashboard.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/stats').then(res => setStats(res.data));
  }, []);

  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444'];

  if (!stats) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Active Projects</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.projectCount}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Tasks</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.taskCount}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Completed</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>{stats.completedTasks}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Team Members</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.teamCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Task Progress</h2>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.taskStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {stats.taskStatus?.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>My Tasks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.myTasks?.map(task => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{task.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{task.project}</div>
                </div>
                <span className={'badge badge-' + (task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info')}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
          <Link to="/tasks" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: 'var(--primary)', fontSize: '0.875rem' }}>View all tasks</Link>
        </div>
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Projects.jsx",
        content: `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });

  useEffect(() => {
    api.get('/api/projects').then(res => setProjects(res.data.projects || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/projects', form);
    setShowModal(false);
    setForm({ name: '', description: '', color: '#6366f1' });
    const res = await api.get('/api/projects');
    setProjects(res.data.projects || []);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {projects.map(project => (
          <Link key={project.id} to={'/projects/' + project.id} className="card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.25rem' }}>
                {project.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>{project.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{project.taskCount} tasks</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{project.description}</p>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: project.progress + '%', height: '100%', background: project.color, borderRadius: '4px' }} />
            </div>
          </Link>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>New Project</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input type="text" className="input" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <textarea className="input" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Color:</span>
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: '60px', height: '40px', padding: 0, border: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/ProjectBoard.jsx",
        content: `import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

const COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

export default function ProjectBoard() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'To Do', priority: 'medium' });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [projRes, tasksRes] = await Promise.all([
      api.get('/api/projects/' + id),
      api.get('/api/tasks?projectId=' + id)
    ]);
    setProject(projRes.data);
    setTasks(tasksRes.data.tasks || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/tasks', { ...form, projectId: id });
    setShowModal(false);
    setForm({ title: '', description: '', status: 'To Do', priority: 'medium' });
    loadData();
  };

  const moveTask = async (taskId, newStatus) => {
    await api.patch('/api/tasks/' + taskId, { status: newStatus });
    loadData();
  };

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col] = tasks.filter(t => t.status === col);
    return acc;
  }, {});

  if (!project) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/projects" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Back to Projects</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{project.name}</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Task</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {COLUMNS.map(col => (
          <div key={col} style={{ minWidth: '280px', flex: '0 0 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600' }}>{col}</span>
              <span style={{ background: 'var(--bg-tertiary)', padding: '0.125rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                {tasksByStatus[col].length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasksByStatus[col].map(task => (
                <div key={task.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className={'badge badge-' + (task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info')}>
                      {task.priority}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{task.title}</div>
                  <select className="input" value={task.status} onChange={(e) => moveTask(task.id, e.target.value)} style={{ padding: '0.5rem' }}>
                    {COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Task</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input type="text" className="input" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <textarea className="input" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Tasks.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/api/tasks').then(res => setTasks(res.data.tasks || []));
  }, []);

  const toggleComplete = async (id) => {
    const task = tasks.find(t => t.id === id);
    await api.patch('/api/tasks/' + id, { status: task.status === 'Done' ? 'To Do' : 'Done' });
    const res = await api.get('/api/tasks');
    setTasks(res.data.tasks || []);
  };

  const filtered = filter === 'all' ? tasks : filter === 'completed' ? tasks.filter(t => t.status === 'Done') : tasks.filter(t => t.status !== 'Done');

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem' }}>My Tasks</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'active', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={'btn btn-sm ' + (filter === f ? 'btn-primary' : 'btn-secondary')}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(task => (
          <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input type="checkbox" checked={task.status === 'Done'} onChange={() => toggleComplete(task.id)} style={{ width: '20px', height: '20px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{task.projectName}</div>
            </div>
            <span className={'badge badge-' + (task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info')}>
              {task.priority}
            </span>
            <span className="badge badge-primary">{task.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "src/pages/Team.jsx",
        content: `import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Member' });

  useEffect(() => {
    api.get('/api/team').then(res => setMembers(res.data.members || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/api/team', form);
    setShowModal(false);
    setForm({ name: '', email: '', role: 'Member' });
    const res = await api.get('/api/team');
    setMembers(res.data.members || []);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Team Members</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Invite Member</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {members.map(member => (
          <div key={member.id} className="card">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.25rem' }}>
                {member.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>{member.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{member.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={'badge badge-' + (member.role === 'Admin' ? 'primary' : member.role === 'Lead' ? 'info' : 'success')}>
                {member.role}
              </span>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {member.tasksCompleted} tasks completed
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Invite Member</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input type="text" className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input type="email" className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="Member">Member</option>
                  <option value="Lead">Lead</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Invite</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,
        language: "javascript"
      },
      {
        path: "server/index.js",
        content: `import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import teamRoutes from './routes/team.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/stats', statsRoutes);

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Project Hub server on port ' + PORT));`,
        language: "javascript"
      },
      {
        path: "server/routes/projects.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

let projects = [
  { id: '1', name: 'Website Redesign', description: 'Complete overhaul of company website', color: '#6366f1', taskCount: 24, progress: 65 },
  { id: '2', name: 'Mobile App', description: 'iOS and Android app development', color: '#22c55e', taskCount: 18, progress: 40 },
  { id: '3', name: 'API Integration', description: 'Third-party API integrations', color: '#eab308', taskCount: 12, progress: 80 },
];

router.get('/', (req, res) => res.json({ projects }));

router.get('/:id', (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.post('/', (req, res) => {
  const project = { id: uuidv4(), ...req.body, taskCount: 0, progress: 0 };
  projects.push(project);
  res.json(project);
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/tasks.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

let tasks = [
  { id: '1', title: 'Design homepage', description: 'Create new homepage design', projectId: '1', projectName: 'Website Redesign', status: 'In Progress', priority: 'high' },
  { id: '2', title: 'Implement login', description: 'User authentication system', projectId: '2', projectName: 'Mobile App', status: 'To Do', priority: 'high' },
  { id: '3', title: 'API documentation', description: 'Write API docs', projectId: '3', projectName: 'API Integration', status: 'Review', priority: 'medium' },
  { id: '4', title: 'Unit tests', description: 'Write unit tests', projectId: '1', projectName: 'Website Redesign', status: 'Backlog', priority: 'low' },
];

router.get('/', (req, res) => {
  const { projectId } = req.query;
  let result = tasks;
  if (projectId) result = tasks.filter(t => t.projectId === projectId);
  res.json({ tasks: result });
});

router.post('/', (req, res) => {
  const task = { id: uuidv4(), ...req.body };
  tasks.push(task);
  res.json(task);
});

router.patch('/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  Object.assign(task, req.body);
  res.json(task);
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/team.js",
        content: `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

let members = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', tasksCompleted: 45 },
  { id: '2', name: 'Sarah Kim', email: 'sarah@example.com', role: 'Lead', tasksCompleted: 38 },
  { id: '3', name: 'Alex Morgan', email: 'alex@example.com', role: 'Member', tasksCompleted: 22 },
  { id: '4', name: 'Bob Wilson', email: 'bob@example.com', role: 'Member', tasksCompleted: 31 },
];

router.get('/', (req, res) => res.json({ members }));

router.post('/', (req, res) => {
  const member = { id: uuidv4(), ...req.body, tasksCompleted: 0 };
  members.push(member);
  res.json(member);
});

export default router;`,
        language: "javascript"
      },
      {
        path: "server/routes/stats.js",
        content: `import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    projectCount: 5,
    taskCount: 48,
    completedTasks: 32,
    teamCount: 8,
    taskStatus: [
      { name: 'Done', value: 32 },
      { name: 'In Progress', value: 8 },
      { name: 'To Do', value: 5 },
      { name: 'Backlog', value: 3 }
    ],
    myTasks: [
      { id: '1', title: 'Design homepage', project: 'Website Redesign', priority: 'high' },
      { id: '2', title: 'API integration', project: 'Mobile App', priority: 'medium' },
      { id: '3', title: 'Write tests', project: 'API Integration', priority: 'low' }
    ]
  });
});

export default router;`,
        language: "javascript"
      }
    ]
  };
}

// Pattern matching function
export function matchSaaSTemplate(input: string): SaaSProject | null {
  const lower = input.toLowerCase();

  if (lower.includes('invoice') || lower.includes('invoicing') || lower.includes('billing') || lower.includes('receipt')) {
    return generateInvoicingSaaS();
  }

  if (lower.includes('crm') || lower.includes('customer relationship') || lower.includes('contacts') || lower.includes('deals') || lower.includes('pipeline') || lower.includes('sales')) {
    return generateCRMSaaS();
  }

  if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('shop') || lower.includes('store') || lower.includes('cart') || lower.includes('checkout') || lower.includes('product')) {
    return generateEcommerceSaaS();
  }

  if (lower.includes('project') || lower.includes('kanban') || lower.includes('task') || lower.includes('board') || lower.includes('sprint') || lower.includes('agile')) {
    return generateProjectSaaS();
  }

  return null;
}

export const saasTemplates = {
  invoicing: generateInvoicingSaaS,
  crm: generateCRMSaaS,
  ecommerce: generateEcommerceSaaS,
  project: generateProjectSaaS
};