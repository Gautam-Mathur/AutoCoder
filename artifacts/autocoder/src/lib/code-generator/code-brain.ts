// Code Brain - Intelligent Code Generation from Scratch
// Zero external API dependencies - all pattern-based generation

export interface CodeIntent {
  action: 'create' | 'modify' | 'add' | 'remove' | 'fix';
  target: string;
  features: string[];
  style: string;
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  appType: AppType;
  uiFramework: 'vanilla' | 'react' | 'vue';
  hasBackend: boolean;
  hasDatabase: boolean;
  hasAuth: boolean;
}

export type AppType =
  | 'landing' | 'dashboard' | 'crud' | 'ecommerce' | 'blog'
  | 'portfolio' | 'saas' | 'chat' | 'social' | 'game'
  | 'calculator' | 'form' | 'gallery' | 'todo' | 'api'
  | 'admin' | 'booking' | 'marketplace' | 'analytics' | 'cms';

// =============================================================================
// BUILDING BLOCKS - Composable code patterns
// =============================================================================

export const codeBlocks = {
  // React Hooks
  hooks: {
    useState: (name: string, defaultValue: string = '""') =>
      `const [${name}, set${capitalize(name)}] = useState(${defaultValue});`,

    useEffect: (deps: string = '[]', body: string = '') =>
      `useEffect(() => {\n    ${body}\n  }, ${deps});`,

    useLocalStorage: (key: string, defaultValue: string = '""') =>
      `const [${key}, set${capitalize(key)}] = useState(() => {
    const saved = localStorage.getItem('${key}');
    return saved ? JSON.parse(saved) : ${defaultValue};
  });

  useEffect(() => {
    localStorage.setItem('${key}', JSON.stringify(${key}));
  }, [${key}]);`,

    useApi: (endpoint: string, method: string = 'GET') =>
      `const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('${endpoint}')
      .then(res => res.json())
      .then(data => { setData(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);`,

    useForm: (fields: string[]) => {
      const initial = fields.map(f => `${f}: ''`).join(', ');
      return `const [form, setForm] = useState({ ${initial} });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', form);
  };`;
    },

    useModal: () =>
      `const [isOpen, setIsOpen] = useState(false);
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);`,

    useDebounce: (value: string, delay: string = '300') =>
      `const [debouncedValue, setDebouncedValue] = useState(${value});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(${value}), ${delay});
    return () => clearTimeout(timer);
  }, [${value}]);`,

    useToggle: (name: string = 'isOn') =>
      `const [${name}, set${capitalize(name)}] = useState(false);
  const toggle${capitalize(name)} = () => set${capitalize(name)}(prev => !prev);`,

    useFetch: () =>
      `const useFetch = (url) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      fetch(url)
        .then(res => res.json())
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }, [url]);

    return { data, loading, error };
  };`
  },

  // UI Components
  components: {
    button: (text: string, onClick: string = '() => {}', variant: string = 'primary') =>
      `<button
    className="btn btn-${variant}"
    onClick={${onClick}}
  >
    ${text}
  </button>`,

    input: (name: string, placeholder: string = '', type: string = 'text') =>
      `<input
    type="${type}"
    name="${name}"
    placeholder="${placeholder}"
    value={form.${name}}
    onChange={handleChange}
    className="input"
  />`,

    card: (title: string, content: string) =>
      `<div className="card">
    <h3 className="card-title">${title}</h3>
    <div className="card-content">${content}</div>
  </div>`,

    modal: (title: string, content: string) =>
      `{isOpen && (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>${title}</h2>
          <button onClick={closeModal}>&times;</button>
        </div>
        <div className="modal-body">${content}</div>
      </div>
    </div>
  )}`,

    list: (items: string, renderItem: string) =>
      `<ul className="list">
    {${items}.map((item, index) => (
      <li key={index} className="list-item">
        ${renderItem}
      </li>
    ))}
  </ul>`,

    table: (headers: string[], dataKey: string) => {
      const headerCells = headers.map(h => `<th>${h}</th>`).join('\n          ');
      const dataCells = headers.map(h => `<td>{row.${h.toLowerCase()}}</td>`).join('\n          ');
      return `<table className="table">
    <thead>
      <tr>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      {${dataKey}.map((row, i) => (
        <tr key={i}>
          ${dataCells}
        </tr>
      ))}
    </tbody>
  </table>`;
    },

    loader: () =>
      `<div className="loader">
    <div className="spinner"></div>
  </div>`,

    alert: (type: string, message: string) =>
      `<div className="alert alert-${type}">
    ${message}
  </div>`,

    navbar: (brand: string, links: string[]) => {
      const navLinks = links.map(l => `<a href="#${l.toLowerCase()}">${l}</a>`).join('\n      ');
      return `<nav className="navbar">
    <div className="navbar-brand">${brand}</div>
    <div className="navbar-links">
      ${navLinks}
    </div>
  </nav>`;
    },

    sidebar: (items: string[]) => {
      const menuItems = items.map(i =>
        `<li className="sidebar-item">
        <a href="#${i.toLowerCase()}">${i}</a>
      </li>`
      ).join('\n      ');
      return `<aside className="sidebar">
    <ul className="sidebar-menu">
      ${menuItems}
    </ul>
  </aside>`;
    },

    footer: (text: string = '© 2024') =>
      `<footer className="footer">
    <p>${text}</p>
  </footer>`,

    searchBar: (placeholder: string = 'Search...') =>
      `<div className="search-bar">
    <input
      type="search"
      placeholder="${placeholder}"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="search-input"
    />
    <button className="search-btn">Search</button>
  </div>`,

    pagination: (total: string, current: string, onChange: string) =>
      `<div className="pagination">
    <button
      disabled={${current} === 1}
      onClick={() => ${onChange}(${current} - 1)}
    >
      Previous
    </button>
    <span>Page {${current}} of {${total}}</span>
    <button
      disabled={${current} === ${total}}
      onClick={() => ${onChange}(${current} + 1)}
    >
      Next
    </button>
  </div>`,

    tabs: (tabs: string[]) => {
      const tabButtons = tabs.map((t, i) =>
        `<button
        className={\`tab \${activeTab === ${i} ? 'active' : ''}\`}
        onClick={() => setActiveTab(${i})}
      >
        ${t}
      </button>`
      ).join('\n      ');
      return `<div className="tabs">
    <div className="tab-list">
      ${tabButtons}
    </div>
    <div className="tab-content">
      {activeTab === 0 && <div>Content 1</div>}
      {activeTab === 1 && <div>Content 2</div>}
    </div>
  </div>`;
    },

    dropdown: (options: string[], name: string) => {
      const opts = options.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('\n      ');
      return `<select name="${name}" value={form.${name}} onChange={handleChange} className="select">
    <option value="">Select...</option>
    ${opts}
  </select>`;
    },

    avatar: (src: string, alt: string = 'Avatar') =>
      `<img src="${src}" alt="${alt}" className="avatar" />`,

    badge: (text: string, variant: string = 'primary') =>
      `<span className="badge badge-${variant}">${text}</span>`,

    progress: (value: string, max: string = '100') =>
      `<div className="progress-bar">
    <div
      className="progress-fill"
      style={{ width: \`\${(${value} / ${max}) * 100}%\` }}
    ></div>
  </div>`,

    tooltip: (text: string, content: string) =>
      `<div className="tooltip-wrapper">
    ${text}
    <span className="tooltip">${content}</span>
  </div>`,

    accordion: (items: { title: string; content: string }[]) => {
      const panels = items.map((item, i) =>
        `<div className="accordion-item">
      <button
        className="accordion-header"
        onClick={() => setOpenPanel(openPanel === ${i} ? null : ${i})}
      >
        ${item.title}
      </button>
      {openPanel === ${i} && (
        <div className="accordion-content">${item.content}</div>
      )}
    </div>`
      ).join('\n    ');
      return `<div className="accordion">
    ${panels}
  </div>`;
    },

    chart: (type: 'bar' | 'line' | 'pie', dataKey: string) => {
      if (type === 'bar') {
        return `<div className="chart">
    {${dataKey}.map((d, i) => (
      <div key={i} className="bar-container">
        <div className="bar" style={{ height: \`\${d.value}%\` }}></div>
        <span className="bar-label">{d.label}</span>
      </div>
    ))}
  </div>`;
      }
      return `<div className="chart chart-${type}">
    {/* Chart visualization for ${dataKey} */}
  </div>`;
    }
  },

  // CSS Styles
  styles: {
    reset: `* { margin: 0; padding: 0; box-sizing: border-box; }`,

    darkTheme: `:root {
  --bg-primary: #0f0f1a;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #252540;
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --primary: #6366f1;
  --primary-hover: #818cf8;
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
  --border: #374151;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, sans-serif;
  line-height: 1.6;
}`,

    lightTheme: `:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
  --border: #e2e8f0;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, sans-serif;
  line-height: 1.6;
}`,

    button: `.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-danger { background: var(--danger); color: white; }
.btn-success { background: var(--success); color: white; }`,

    card: `.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}
.card-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }`,

    input: `.input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
}
.input:focus { outline: none; border-color: var(--primary); }`,

    modal: `.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
}
.modal-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }`,

    navbar: `.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.navbar-brand { font-size: 1.5rem; font-weight: 700; }
.navbar-links { display: flex; gap: 2rem; }
.navbar-links a { color: var(--text-secondary); text-decoration: none; }
.navbar-links a:hover { color: var(--primary); }`,

    sidebar: `.sidebar {
  width: 250px;
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 1rem;
}
.sidebar-menu { list-style: none; }
.sidebar-item a {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 8px;
}
.sidebar-item a:hover { background: var(--bg-tertiary); color: var(--text-primary); }`,

    table: `.table {
  width: 100%;
  border-collapse: collapse;
}
.table th, .table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.table th { background: var(--bg-tertiary); font-weight: 600; }
.table tr:hover { background: var(--bg-tertiary); }`,

    grid: `.grid { display: grid; gap: 1.5rem; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 768px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }`,

    flex: `.flex { display: flex; }
.flex-center { align-items: center; justify-content: center; }
.flex-between { justify-content: space-between; }
.flex-col { flex-direction: column; }
.gap-1 { gap: 0.5rem; }
.gap-2 { gap: 1rem; }
.gap-3 { gap: 1.5rem; }`,

    badge: `.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
}
.badge-primary { background: var(--primary); color: white; }
.badge-success { background: var(--success); color: white; }
.badge-warning { background: var(--warning); color: black; }
.badge-danger { background: var(--danger); color: white; }`,

    loader: `.loader {
  display: flex;
  justify-content: center;
  padding: 2rem;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }`,

    animations: `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.animate-fade { animation: fadeIn 0.3s ease; }
.animate-slide { animation: slideUp 0.3s ease; }
.animate-pulse { animation: pulse 2s infinite; }`
  },

  // Backend Patterns
  backend: {
    expressServer: (routes: string[] = []) => {
      const routeImports = routes.map(r => `import ${r}Routes from './routes/${r}.js';`).join('\n');
      const routeUses = routes.map(r => `app.use('/api/${r}', ${r}Routes);`).join('\n');
      return `import express from 'express';
import cors from 'cors';
${routeImports}

const app = express();
app.use(cors());
app.use(express.json());

${routeUses}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(\`Server running on port \${PORT}\`));`;
    },

    crudRoutes: (resource: string) => {
      const Resource = capitalize(resource);
      return `import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
let ${resource}s = [];

// Get all
router.get('/', (req, res) => {
  res.json({ ${resource}s });
});

// Get one
router.get('/:id', (req, res) => {
  const item = ${resource}s.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Create
router.post('/', (req, res) => {
  const item = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  ${resource}s.push(item);
  res.status(201).json(item);
});

// Update
router.put('/:id', (req, res) => {
  const index = ${resource}s.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  ${resource}s[index] = { ...${resource}s[index], ...req.body };
  res.json(${resource}s[index]);
});

// Delete
router.delete('/:id', (req, res) => {
  ${resource}s = ${resource}s.filter(i => i.id !== req.params.id);
  res.json({ success: true });
});

export default router;`;
    },

    authMiddleware: () => `import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}`,

    authRoutes: () => `import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../auth.js';

const router = Router();
let users = [];

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email, name, password: hashedPassword };
  users.push(user);

  const token = generateToken(user);
  res.json({ user: { id: user.id, email, name }, token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
});

export default router;`
  },

  // Utility Functions
  utilities: {
    formatDate: `export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });`,

    formatCurrency: `export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(amount);`,

    debounce: `export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};`,

    throttle: `export const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};`,

    classNames: `export const cn = (...classes) =>
  classes.filter(Boolean).join(' ');`,

    storage: `export const storage = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key)
};`,

    api: `export const api = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  },
  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }
};`,

    validation: `export const validate = {
  email: (email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email),
  required: (value) => value !== null && value !== undefined && value !== '',
  minLength: (value, min) => String(value).length >= min,
  maxLength: (value, max) => String(value).length <= max,
  numeric: (value) => !isNaN(Number(value)),
  url: (value) => /^https?:\\/\\/.+/.test(value)
};`
  }
};

// =============================================================================
// INTENT PARSER - Understand what users want to build
// =============================================================================

const appTypeKeywords: Record<AppType, string[]> = {
  landing: ['landing', 'homepage', 'marketing', 'one page', 'promo'],
  dashboard: ['dashboard', 'admin panel', 'control panel', 'analytics', 'metrics'],
  crud: ['crud', 'manage', 'list', 'create read update delete'],
  ecommerce: ['ecommerce', 'shop', 'store', 'cart', 'checkout', 'product'],
  blog: ['blog', 'posts', 'articles', 'content', 'cms'],
  portfolio: ['portfolio', 'personal', 'resume', 'cv', 'showcase'],
  saas: ['saas', 'subscription', 'platform', 'service'],
  chat: ['chat', 'messaging', 'messenger', 'conversation'],
  social: ['social', 'feed', 'posts', 'followers', 'profile'],
  game: ['game', 'play', 'score', 'level'],
  calculator: ['calculator', 'calculate', 'converter', 'compute'],
  form: ['form', 'survey', 'questionnaire', 'input'],
  gallery: ['gallery', 'images', 'photos', 'slideshow'],
  todo: ['todo', 'task', 'checklist', 'notes'],
  api: ['api', 'backend', 'rest', 'endpoints'],
  admin: ['admin', 'management', 'control'],
  booking: ['booking', 'reservation', 'appointment', 'schedule'],
  marketplace: ['marketplace', 'listings', 'buy sell'],
  analytics: ['analytics', 'charts', 'graphs', 'reports'],
  cms: ['cms', 'content management', 'editor']
};

const featureKeywords: Record<string, string[]> = {
  auth: ['login', 'signup', 'register', 'authentication', 'user', 'account'],
  database: ['database', 'storage', 'persist', 'save', 'store data'],
  search: ['search', 'filter', 'find'],
  pagination: ['pagination', 'pages', 'load more'],
  charts: ['chart', 'graph', 'visualization', 'analytics'],
  forms: ['form', 'input', 'submit'],
  modal: ['modal', 'popup', 'dialog'],
  darkMode: ['dark mode', 'dark theme', 'light mode', 'theme toggle'],
  responsive: ['responsive', 'mobile', 'tablet'],
  animation: ['animation', 'animated', 'transition', 'motion'],
  realtime: ['realtime', 'real-time', 'live', 'websocket'],
  notification: ['notification', 'alert', 'toast'],
  upload: ['upload', 'file', 'image upload'],
  export: ['export', 'download', 'pdf', 'csv'],
  payment: ['payment', 'stripe', 'checkout', 'billing']
};

export function parseIntent(input: string): CodeIntent {
  const lower = input.toLowerCase();

  // Detect app type
  let detectedType: AppType = 'crud';
  let maxScore = 0;

  for (const [type, keywords] of Object.entries(appTypeKeywords)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as AppType;
    }
  }

  // Detect features
  const detectedFeatures: string[] = [];
  for (const [feature, keywords] of Object.entries(featureKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      detectedFeatures.push(feature);
    }
  }

  // Detect action
  let action: CodeIntent['action'] = 'create';
  if (lower.includes('add') || lower.includes('include')) action = 'add';
  if (lower.includes('change') || lower.includes('modify') || lower.includes('update')) action = 'modify';
  if (lower.includes('remove') || lower.includes('delete')) action = 'remove';
  if (lower.includes('fix') || lower.includes('debug') || lower.includes('error')) action = 'fix';

  // Detect complexity
  let complexity: CodeIntent['complexity'] = 'medium';
  if (lower.includes('simple') || lower.includes('basic') || lower.includes('minimal')) {
    complexity = 'simple';
  } else if (lower.includes('complex') || lower.includes('advanced') || lower.includes('full')) {
    complexity = 'complex';
  } else if (lower.includes('enterprise') || lower.includes('production') || lower.includes('scalable')) {
    complexity = 'enterprise';
  }

  // Detect UI framework
  let uiFramework: CodeIntent['uiFramework'] = 'react';
  if (lower.includes('vanilla') || lower.includes('plain') || lower.includes('no framework')) {
    uiFramework = 'vanilla';
  } else if (lower.includes('vue')) {
    uiFramework = 'vue';
  }

  // Detect backend/database/auth needs
  const hasBackend = lower.includes('backend') || lower.includes('server') ||
    lower.includes('api') || detectedType === 'saas' || detectedType === 'ecommerce';
  const hasDatabase = lower.includes('database') || lower.includes('storage') ||
    detectedFeatures.includes('database') || hasBackend;
  const hasAuth = detectedFeatures.includes('auth') || detectedType === 'saas' ||
    lower.includes('user') || lower.includes('login');

  // Extract target/subject
  const target = extractTarget(input);
  const style = extractStyle(input);

  return {
    action,
    target,
    features: detectedFeatures,
    style,
    complexity,
    appType: detectedType,
    uiFramework,
    hasBackend,
    hasDatabase,
    hasAuth
  };
}

export function extractTarget(input: string): string {
  // Try to extract what they want to build
  const patterns = [
    /(?:create|build|make|generate)\s+(?:a\s+)?(.+?)(?:\s+with|\s+that|\s+using|$)/i,
    /(?:i want|i need)\s+(?:a\s+)?(.+?)(?:\s+with|\s+that|$)/i,
    /(.+?)\s+(?:app|application|website|page|system)/i
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1].trim();
  }

  return 'application';
}

function extractStyle(input: string): string {
  const styles = ['modern', 'minimal', 'clean', 'professional', 'colorful',
    'dark', 'light', 'sleek', 'elegant', 'corporate', 'playful'];

  for (const style of styles) {
    if (input.toLowerCase().includes(style)) return style;
  }

  return 'modern';
}

// =============================================================================
// CODE COMPOSER - Build complete apps from building blocks
// =============================================================================

export interface GeneratedApp {
  name: string;
  description: string;
  files: { path: string; content: string; language: string }[];
}

export function composeApp(intent: CodeIntent): GeneratedApp {
  const files: GeneratedApp['files'] = [];
  const appName = intent.target.replace(/\s+/g, '-').toLowerCase() || 'my-app';

  // Always add package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(appName, intent),
    language: 'json'
  });

  // Add Vite config
  files.push({
    path: 'vite.config.js',
    content: generateViteConfig(),
    language: 'javascript'
  });

  // Add index.html
  files.push({
    path: 'index.html',
    content: generateIndexHtml(capitalize(intent.target)),
    language: 'html'
  });

  // Add main entry point
  files.push({
    path: 'src/main.jsx',
    content: generateMainJsx(intent),
    language: 'javascript'
  });

  // Add App component
  files.push({
    path: 'src/App.jsx',
    content: generateAppComponent(intent),
    language: 'javascript'
  });

  // Add styles
  files.push({
    path: 'src/styles/globals.css',
    content: generateStyles(intent),
    language: 'css'
  });

  // Add pages based on app type
  const pages = generatePages(intent);
  files.push(...pages);

  // Add components
  const components = generateComponents(intent);
  files.push(...components);

  // Add utilities
  files.push({
    path: 'src/utils/helpers.js',
    content: generateUtilities(intent),
    language: 'javascript'
  });

  // Add backend if needed
  if (intent.hasBackend) {
    const backendFiles = generateBackend(intent);
    files.push(...backendFiles);
  }

  // Add auth context if needed
  if (intent.hasAuth) {
    files.push({
      path: 'src/context/AuthContext.jsx',
      content: generateAuthContext(),
      language: 'javascript'
    });
  }

  return {
    name: capitalize(intent.target),
    description: `A ${intent.complexity} ${intent.appType} application with ${intent.features.join(', ') || 'core features'}`,
    files
  };
}

function generatePackageJson(name: string, intent: CodeIntent): string {
  const deps: Record<string, string> = {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  };

  if (intent.features.includes('charts')) {
    deps["recharts"] = "^2.10.0";
  }

  const devDeps: Record<string, string> = {
    "vite": "^5.0.0"
  };

  const scripts: Record<string, string> = {
    "dev": intent.hasBackend
      ? "concurrently \"vite\" \"node server/index.js\""
      : "vite",
    "build": "vite build",
    "preview": "vite preview"
  };

  if (intent.hasBackend) {
    deps["express"] = "^4.18.2";
    deps["cors"] = "^2.8.5";
    deps["uuid"] = "^9.0.0";
    devDeps["concurrently"] = "^8.2.0";

    if (intent.hasAuth) {
      deps["bcryptjs"] = "^2.4.3";
      deps["jsonwebtoken"] = "^9.0.0";
    }
  }

  return JSON.stringify({
    name,
    version: "1.0.0",
    type: "module",
    scripts,
    dependencies: deps,
    devDependencies: devDeps
  }, null, 2);
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  server: {
    port: 5200,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});`;
}

function generateIndexHtml(title: string): string {
  return `<!DOCTYPE html>
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
</html>`;
}

function generateMainJsx(intent: CodeIntent): string {
  const imports = [`import React from 'react';`,
    `import ReactDOM from 'react-dom/client';`,
    `import { BrowserRouter } from 'react-router-dom';`,
    `import App from './App';`,
    `import './styles/globals.css';`];

  if (intent.hasAuth) {
    imports.push(`import { AuthProvider } from './context/AuthContext';`);
  }

  let appWrapped = '<App />';
  if (intent.hasAuth) {
    appWrapped = `<AuthProvider>${appWrapped}</AuthProvider>`;
  }

  return `${imports.join('\n')}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      ${appWrapped}
    </BrowserRouter>
  </React.StrictMode>
);`;
}

function generateAppComponent(intent: CodeIntent): string {
  const pages = getPageNames(intent);
  const imports = pages.map(p => `import ${p} from './pages/${p}';`).join('\n');
  const routes = pages.map(p => {
    const path = p === 'Home' ? '/' : `/${p.toLowerCase()}`;
    return `<Route path="${path}" element={<${p} />} />`;
  }).join('\n        ');

  return `import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
${imports}

export default function App() {
  return (
    <Layout>
      <Routes>
        ${routes}
      </Routes>
    </Layout>
  );
}`;
}

function generateStyles(intent: CodeIntent): string {
  const theme = intent.style === 'light' ? codeBlocks.styles.lightTheme : codeBlocks.styles.darkTheme;

  return `${codeBlocks.styles.reset}

${theme}

${codeBlocks.styles.button}

${codeBlocks.styles.card}

${codeBlocks.styles.input}

${codeBlocks.styles.navbar}

${codeBlocks.styles.grid}

${codeBlocks.styles.flex}

${codeBlocks.styles.badge}

${codeBlocks.styles.loader}

${codeBlocks.styles.table}

${codeBlocks.styles.modal}

${codeBlocks.styles.animations}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
}`;
}

function getPageNames(intent: CodeIntent): string[] {
  const base = ['Home'];

  switch (intent.appType) {
    case 'dashboard':
      return ['Dashboard', 'Analytics', 'Settings'];
    case 'ecommerce':
      return ['Home', 'Products', 'Cart', 'Checkout'];
    case 'blog':
      return ['Home', 'Posts', 'Post', 'About'];
    case 'crud':
      return ['Home', 'List', 'Create', 'Edit'];
    case 'todo':
      return ['Home'];
    case 'portfolio':
      return ['Home', 'Projects', 'About', 'Contact'];
    case 'saas':
      return ['Home', 'Dashboard', 'Settings', 'Pricing'];
    default:
      return base;
  }
}

function generatePages(intent: CodeIntent): GeneratedApp['files'] {
  const pages = getPageNames(intent);
  const files: GeneratedApp['files'] = [];

  for (const page of pages) {
    files.push({
      path: `src/pages/${page}.jsx`,
      content: generatePageContent(page, intent),
      language: 'javascript'
    });
  }

  return files;
}

function generatePageContent(pageName: string, intent: CodeIntent): string {
  switch (pageName) {
    case 'Dashboard':
      return generateDashboardPage(intent);
    case 'Home':
      return generateHomePage(intent);
    case 'List':
    case 'Products':
      return generateListPage(intent);
    case 'Create':
      return generateCreatePage(intent);
    default:
      return generateGenericPage(pageName, intent);
  }
}

function generateDashboardPage(intent: CodeIntent): string {
  const hasCharts = intent.features.includes('charts');

  let imports = `import { useState, useEffect } from 'react';`;
  if (hasCharts) {
    imports += `\nimport { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';`;
  }

  return `${imports}

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 1234,
    revenue: 56789,
    orders: 432,
    growth: 12.5
  });

  ${hasCharts ? `const chartData = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 600 },
    { name: 'Mar', value: 550 },
    { name: 'Apr', value: 780 },
    { name: 'May', value: 890 },
    { name: 'Jun', value: 1100 }
  ];` : ''}

  return (
    <div className="container">
      <h1 className="page-title">Dashboard</h1>

      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Users</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.users.toLocaleString()}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>\${stats.revenue.toLocaleString()}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.orders}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Growth</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>+{stats.growth}%</div>
        </div>
      </div>

      ${hasCharts ? `<div className="card">
        <h2 style={{ marginBottom: '1rem', fontWeight: '600' }}>Monthly Overview</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>` : ''}
    </div>
  );
}`;
}

function generateHomePage(intent: CodeIntent): string {
  if (intent.appType === 'todo') {
    return generateTodoPage();
  }

  return `import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container">
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1rem' }}>
          Welcome to ${capitalize(intent.target)}
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          A ${intent.complexity} ${intent.appType} application
        </p>
        <div className="flex flex-center gap-2">
          <Link to="/dashboard" className="btn btn-primary">Get Started</Link>
          <a href="#features" className="btn btn-secondary">Learn More</a>
        </div>
      </div>

      <div id="features" className="grid grid-3" style={{ marginTop: '4rem' }}>
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Fast & Modern</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Built with React and modern best practices for optimal performance.</p>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Fully Responsive</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Works perfectly on desktop, tablet, and mobile devices.</p>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Easy to Customize</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Clean code structure makes it easy to modify and extend.</p>
        </div>
      </div>
    </div>
  );
}`;
}

function generateTodoPage(): string {
  return `import { useState } from 'react';

export default function Home() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Build awesome apps', completed: false },
    { id: 3, text: 'Deploy to production', completed: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo, completed: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="page-title">My Tasks</h1>

      <form onSubmit={addTodo} className="flex gap-2" style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          className="input"
          placeholder="Add a new task..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {todos.map(todo => (
          <div key={todo.id} className="card flex flex-between" style={{ padding: '1rem' }}>
            <div className="flex gap-2" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
                color: todo.completed ? 'var(--text-muted)' : 'inherit'
              }}>
                {todo.text}
              </span>
            </div>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="btn btn-danger"
              style={{ padding: '0.5rem 1rem' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        {todos.filter(t => !t.completed).length} tasks remaining
      </div>
    </div>
  );
}`;
}

function generateListPage(intent: CodeIntent): string {
  const itemName = intent.target.endsWith('s') ? intent.target.slice(0, -1) : intent.target;

  return `import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function List() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setItems([
        { id: 1, name: 'Item 1', description: 'Description for item 1', status: 'active' },
        { id: 2, name: 'Item 2', description: 'Description for item 2', status: 'pending' },
        { id: 3, name: 'Item 3', description: 'Description for item 3', status: 'active' },
        { id: 4, name: 'Item 4', description: 'Description for item 4', status: 'inactive' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container flex flex-center" style={{ minHeight: '50vh' }}>
        <div className="loader"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex flex-between" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>${capitalize(intent.target)}</h1>
        <Link to="/create" className="btn btn-primary">+ Add New</Link>
      </div>

      <input
        type="search"
        className="input"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      <div className="grid grid-3">
        {filtered.map(item => (
          <div key={item.id} className="card">
            <div className="flex flex-between" style={{ marginBottom: '0.5rem' }}>
              <h3 style={{ fontWeight: '600' }}>{item.name}</h3>
              <span className={\`badge badge-\${item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'}\`}>
                {item.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{item.description}</p>
            <div className="flex gap-1">
              <Link to={\`/edit/\${item.id}\`} className="btn btn-secondary" style={{ flex: 1 }}>Edit</Link>
              <button className="btn btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`;
}

function generateCreatePage(intent: CodeIntent): string {
  return `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Create() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));

    console.log('Created:', form);
    navigate('/list');
  };

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="page-title">Create New</h1>

      <form onSubmit={handleSubmit} className="card">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name</label>
            <input
              type="text"
              name="name"
              className="input"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
            <textarea
              name="description"
              className="input"
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
            <select name="status" className="input" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}`;
}

function generateGenericPage(pageName: string, intent: CodeIntent): string {
  return `export default function ${pageName}() {
  return (
    <div className="container">
      <h1 className="page-title">${pageName}</h1>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>
          This is the ${pageName.toLowerCase()} page. Add your content here.
        </p>
      </div>
    </div>
  );
}`;
}

function generateComponents(intent: CodeIntent): GeneratedApp['files'] {
  const files: GeneratedApp['files'] = [];

  // Layout component
  files.push({
    path: 'src/components/Layout.jsx',
    content: generateLayoutComponent(intent),
    language: 'javascript'
  });

  // Add more components based on features
  if (intent.features.includes('modal')) {
    files.push({
      path: 'src/components/Modal.jsx',
      content: generateModalComponent(),
      language: 'javascript'
    });
  }

  return files;
}

function generateLayoutComponent(intent: CodeIntent): string {
  const pages = getPageNames(intent);
  const navLinks = pages.map(p => {
    const path = p === 'Home' ? '/' : `/${p.toLowerCase()}`;
    return `{ path: '${path}', label: '${p}' }`;
  }).join(',\n    ');

  return `import { Link, useLocation } from 'react-router-dom';

const navItems = [
  ${navLinks}
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">${capitalize(intent.target)}</Link>
        <div className="navbar-links">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: location.pathname === item.path ? '600' : '400'
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <footer className="footer" style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>© 2024 ${capitalize(intent.target)}. All rights reserved.</p>
      </footer>
    </div>
  );
}`;
}

function generateModalComponent(): string {
  return `export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontWeight: '600' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}`;
}

function generateUtilities(intent: CodeIntent): string {
  return `${codeBlocks.utilities.formatDate}

${codeBlocks.utilities.formatCurrency}

${codeBlocks.utilities.debounce}

${codeBlocks.utilities.classNames}

${codeBlocks.utilities.storage}

${codeBlocks.utilities.api}

${codeBlocks.utilities.validation}`;
}

function generateBackend(intent: CodeIntent): GeneratedApp['files'] {
  const files: GeneratedApp['files'] = [];
  const resources = [intent.target.toLowerCase().replace(/\s+/g, '')];

  // Main server file
  files.push({
    path: 'server/index.js',
    content: codeBlocks.backend.expressServer(intent.hasAuth ? ['auth', ...resources] : resources),
    language: 'javascript'
  });

  // CRUD routes for main resource
  for (const resource of resources) {
    files.push({
      path: `server/routes/${resource}.js`,
      content: codeBlocks.backend.crudRoutes(resource),
      language: 'javascript'
    });
  }

  // Auth files if needed
  if (intent.hasAuth) {
    files.push({
      path: 'server/auth.js',
      content: codeBlocks.backend.authMiddleware(),
      language: 'javascript'
    });

    files.push({
      path: 'server/routes/auth.js',
      content: codeBlocks.backend.authRoutes(),
      language: 'javascript'
    });
  }

  return files;
}

function generateAuthContext(): string {
  return `import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) throw new Error('Invalid credentials');

    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!res.ok) throw new Error('Registration failed');

    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}`;
}

// Helper function
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================================================
// MAIN EXPORT - Generate complete app from natural language
// =============================================================================

export function generateFromScratch(input: string): GeneratedApp {
  const intent = parseIntent(input);
  return composeApp(intent);
}

export function formatGeneratedApp(app: GeneratedApp): string {
  let response = `# 🚀 ${app.name}\n\n`;
  response += `${app.description}\n\n`;
  response += `## Generated Files (${app.files.length})\n\n`;

  for (const file of app.files) {
    response += `### 📄 ${file.path}\n\n`;
    response += `\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
  }

  response += `## How to Run\n\n`;
  response += `1. Install dependencies: \`npm install\`\n`;
  response += `2. Start development: \`npm run dev\`\n`;
  response += `3. Open http://localhost:5173\n`;

  return response;
}

// =============================================================================
// ADVANCED INTELLIGENCE RE-EXPORTS
// =============================================================================

export {
  parseSemanticIntent,
  resolveSynonyms,
  handleAmbiguousRequest,
  decomposeProblem,
  addToMemory,
  rememberComponent,
  resolveReference,
  getRecentContext,
  getBuiltComponents,
  getCurrentProject,
  setCurrentProject,
  getPreferences,
  clearMemory,
  analyzeError,
  generateFix,
  traceRootCause,
  parseCode,
  modifyCode,
  refactorCode,
  solveCreatively,
  combinePatterns,
  explainCode,
  teachConcept,
  processWithIntelligence,
  type SemanticIntent,
  type Task,
  type DecomposedProblem,
  type BuiltComponent,
  type ConversationContext,
  type ErrorAnalysis,
  type CodeStructure,
  type CreativeSolution,
  type CodeExplanation,
  type IntelligenceResult,
} from './advanced-intelligence';