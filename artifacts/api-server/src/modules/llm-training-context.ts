// LLM Training Context - Teaches local AI to generate working code
// Zero-config: This context is injected automatically

// Core patterns the LLM must understand
export const CODE_PATTERNS = {
  // React component pattern
  reactComponent: `// React Component Pattern
import { useState, useEffect } from 'react';

export default function ComponentName({ prop1, prop2 }) {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    // Side effects here
  }, [dependencies]);

  const handleEvent = () => {
    setState(newValue);
  };

  return (
    <div className="container">
      <h1>{prop1}</h1>
      <button onClick={handleEvent}>{state}</button>
    </div>
  );
}`,

  // Express server pattern
  expressServer: `// Express Server Pattern
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/api/items', (req, res) => {
  res.json({ items: [] });
});

app.post('/api/items', (req, res) => {
  const { name, value } = req.body;
  res.json({ success: true, item: { name, value } });
});

app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`,

  // HTML page pattern
  htmlPage: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .btn { background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; }
    .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Title</h1>
    <button class="btn" onclick="handleClick()">Click Me</button>
  </div>
  <script>
    function handleClick() {
      console.log('clicked');
    }
  </script>
</body>
</html>`,

  // CSS modern pattern
  modernCSS: `/* Modern CSS Pattern */
:root {
  --primary: #3b82f6;
  --background: #0a0a0a;
  --foreground: #fafafa;
  --card: #1a1a1a;
  --border: #2a2a2a;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--background);
  color: var(--foreground);
  line-height: 1.6;
}

.container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1.5rem; }
.btn { background: var(--primary); color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer; transition: opacity 0.2s; }
.btn:hover { opacity: 0.9; }
.grid { display: grid; gap: 1rem; }
.flex { display: flex; gap: 1rem; align-items: center; }`,

  // JavaScript utility pattern
  jsUtility: `// JavaScript Utility Pattern
const utils = {
  // Format currency
  formatCurrency: (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount),

  // Format date
  formatDate: (date) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date)),

  // Debounce function
  debounce: (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Fetch with error handling
  async fetchJSON(url, options = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return res.json();
  },

  // Generate unique ID
  generateId: () => Math.random().toString(36).substr(2, 9),
};`,
};

// Full project examples for different types
export const PROJECT_EXAMPLES = {
  todoApp: {
    name: "todo-app",
    files: [
      {
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>My Todos</h1>
    <form id="todo-form">
      <input type="text" id="todo-input" placeholder="Add a todo..." required>
      <button type="submit" class="btn">Add</button>
    </form>
    <ul id="todo-list"></ul>
  </div>
  <script src="app.js"></script>
</body>
</html>`
      },
      {
        path: "style.css",
        language: "css",
        content: `:root {
  --primary: #3b82f6;
  --bg: #0f172a;
  --card: #1e293b;
  --text: #f8fafc;
  --border: #334155;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 2rem;
}

.container {
  max-width: 500px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 1.5rem;
  font-size: 2rem;
}

#todo-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

#todo-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  font-size: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.btn:hover { opacity: 0.9; }

#todo-list {
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.todo-item.done span {
  text-decoration: line-through;
  opacity: 0.5;
}

.todo-item span { flex: 1; }

.delete-btn {
  background: #ef4444;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  color: white;
  cursor: pointer;
}`
      },
      {
        path: "app.js",
        language: "javascript",
        content: `const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');

let todos = JSON.parse(localStorage.getItem('todos')) || [];

function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
  list.innerHTML = todos.map((todo, index) => \`
    <li class="todo-item \${todo.done ? 'done' : ''}">
      <input type="checkbox" \${todo.done ? 'checked' : ''} onchange="toggleTodo(\${index})">
      <span>\${todo.text}</span>
      <button class="delete-btn" onclick="deleteTodo(\${index})">Delete</button>
    </li>
  \`).join('');
}

function addTodo(text) {
  todos.push({ text, done: false });
  saveTodos();
  renderTodos();
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    addTodo(input.value.trim());
    input.value = '';
  }
});

renderTodos();`
      }
    ],
    dependencies: [],
    instructions: "Open index.html in browser"
  },

  apiServer: {
    name: "api-server",
    files: [
      {
        path: "package.json",
        language: "json",
        content: `{
  "name": "api-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}`
      },
      {
        path: "server.js",
        language: "javascript",
        content: `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let items = [
  { id: 1, name: 'Item 1', description: 'First item' },
  { id: 2, name: 'Item 2', description: 'Second item' }
];

let nextId = 3;

app.get('/api/items', (req, res) => {
  res.json({ success: true, data: items });
});

app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  res.json({ success: true, data: item });
});

app.post('/api/items', (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }
  const item = { id: nextId++, name, description: description || '' };
  items.push(item);
  res.status(201).json({ success: true, data: item });
});

app.put('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  items[index] = { ...items[index], ...req.body };
  res.json({ success: true, data: items[index] });
});

app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  items.splice(index, 1);
  res.json({ success: true, message: 'Item deleted' });
});

app.listen(PORT, () => {
  console.log(\`API Server running on http://localhost:\${PORT}\`);
});`
      }
    ],
    dependencies: ["express", "cors"],
    instructions: "npm install && npm start"
  }
};

// Code editing patterns - how to modify existing code
export const CODE_EDITING_PATTERNS = {
  addFunction: `// To add a function to existing code:
// 1. Find the appropriate location (after imports, before exports)
// 2. Add the complete function with proper spacing
// 3. Export if needed

// BEFORE:
const utils = { existingFn: () => {} };

// AFTER (adding new function):
const utils = {
  existingFn: () => {},
  newFunction: (param) => {
    return param * 2;
  }
};`,

  fixBug: `// To fix a bug:
// 1. Identify the problematic code
// 2. Understand the intended behavior
// 3. Replace with corrected code

// BUG: Missing null check
const getName = (user) => user.name;

// FIXED: Added null check
const getName = (user) => user?.name ?? 'Unknown';`,

  addFeature: `// To add a feature:
// 1. Add required imports
// 2. Add state/data structures
// 3. Add UI elements
// 4. Add event handlers
// 5. Connect everything

// Example: Adding dark mode toggle
// Step 1: Add state
const [isDark, setIsDark] = useState(false);

// Step 2: Add toggle function
const toggleTheme = () => {
  setIsDark(!isDark);
  document.body.classList.toggle('dark');
};

// Step 3: Add UI
<button onClick={toggleTheme}>{isDark ? 'Light' : 'Dark'}</button>`,
};

// Error patterns and fixes
export const ERROR_FIXES = {
  "Cannot read property of undefined": `
// Problem: Accessing property on null/undefined
// Fix: Add optional chaining and nullish coalescing
const value = obj?.nested?.property ?? defaultValue;`,

  "is not a function": `
// Problem: Calling something that isn't a function
// Fix: Check if it's a function before calling
if (typeof fn === 'function') {
  fn();
}`,

  "Unexpected token": `
// Problem: Syntax error - missing/extra bracket, comma, etc.
// Fix: Check for:
// - Missing closing brackets: }, ], )
// - Missing commas in objects/arrays
// - Unclosed strings
// - Invalid JSON`,

  "Module not found": `
// Problem: Import path is wrong or module not installed
// Fix:
// 1. Check the import path (use relative paths: ./file)
// 2. Install missing package: npm install package-name
// 3. Check file extension if needed`,
};

// Build the complete training prompt
export function buildTrainingContext(taskType: 'generate' | 'edit' | 'fix' | 'understand'): string {
  let context = `You are a specialized CODE GENERATION AI. Your ONLY job is to write working code.

OUTPUT RULES - CRITICAL:
1. Output ONLY valid code or JSON - NEVER markdown, NEVER explanations
2. NO \`\`\` code fences - raw code only
3. Every file must be COMPLETE and RUNNABLE
4. Use modern JavaScript/TypeScript patterns
5. Include helpful inline comments in code where appropriate

`;

  if (taskType === 'generate') {
    context += `PROJECT OUTPUT FORMAT (JSON only):
{
  "name": "project-name-lowercase",
  "files": [
    {"path": "index.html", "content": "<!DOCTYPE html>...", "language": "html"},
    {"path": "style.css", "content": ":root {...", "language": "css"},
    {"path": "app.js", "content": "const app = ...", "language": "javascript"}
  ],
  "dependencies": [],
  "instructions": "Open index.html in browser"
}

REQUIRED PATTERNS:

HTML Structure:
- DOCTYPE, html, head (with meta viewport), body
- Link CSS files, script JS files at end of body
- Use semantic elements: header, main, section, footer

CSS Requirements:
- CSS variables for colors in :root
- Dark theme by default (bg: #0a0a0a to #1a1a1a)
- Mobile-first responsive design
- Flexbox/Grid for layouts

JavaScript Requirements:
- Use const/let, never var
- Arrow functions for callbacks
- Async/await for promises
- Error handling with try/catch
- DOM ready: document.addEventListener('DOMContentLoaded', ...)

`;

    // Add a concrete example
    context += `EXAMPLE - Todo App:
${JSON.stringify(PROJECT_EXAMPLES.todoApp, null, 2)}

`;
  }

  if (taskType === 'edit') {
    context += `CODE EDITING RULES:
1. Return ONLY the modified code
2. Preserve existing functionality unless asked to change it
3. Match the existing code style
4. Add new features without breaking existing ones

${CODE_EDITING_PATTERNS.addFunction}

${CODE_EDITING_PATTERNS.addFeature}
`;
  }

  if (taskType === 'fix') {
    context += `BUG FIXING RULES:
1. Identify the root cause, not just symptoms
2. Fix the bug without changing unrelated code
3. Add defensive checks to prevent similar bugs

COMMON FIXES:
${Object.entries(ERROR_FIXES).map(([error, fix]) => `${error}:\n${fix}`).join('\n\n')}
`;
  }

  if (taskType === 'understand') {
    context += `CODE ANALYSIS RULES:
1. Identify the main purpose of the code
2. List all functions and their roles
3. Note any bugs or issues
4. Suggest improvements

Output format:
{
  "purpose": "What this code does",
  "functions": [{"name": "fnName", "purpose": "what it does"}],
  "issues": ["list of problems"],
  "suggestions": ["list of improvements"]
}
`;
  }

  context += `
STYLE GUIDE:
- 2 space indentation
- Single quotes for strings
- Semicolons at end of statements
- camelCase for variables/functions
- PascalCase for components/classes
- UPPERCASE for constants

REMEMBER: Output RAW CODE or JSON only. No markdown. No explanations. Just working code.`;

  return context;
}

// Enhanced system prompt that includes training
export const ENHANCED_CODE_SYSTEM_PROMPT = buildTrainingContext('generate');

// Export specific prompts for different tasks
export const EDIT_CODE_PROMPT = buildTrainingContext('edit');
export const FIX_CODE_PROMPT = buildTrainingContext('fix');
export const UNDERSTAND_CODE_PROMPT = buildTrainingContext('understand');

// ============================================
// SAAS & FULLSTACK PATTERNS
// Production-ready patterns for complete applications
// ============================================

export const SAAS_PATTERNS = {
  // Complete Auth Context with JWT
  authContext: `// Auth Context - Complete Authentication System
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setUser(data.user);
  }

  async function register(data: RegisterData) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Registration failed');
    const result = await res.json();
    setUser(result.user);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  async function updateProfile(data: Partial<User>) {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Update failed');
    const result = await res.json();
    setUser(result.user);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}`,

  // Login Form with validation
  loginForm: `// Login Form - Complete with validation and error handling
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}`,

  // Dashboard with stats
  dashboard: `// Dashboard - Complete with stats, charts, and activity
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, Activity, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardStats {
  revenue: { value: number; change: number };
  users: { value: number; change: number };
  orders: { value: number; change: number };
  conversion: { value: number; change: number };
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const statCards = [
    { label: 'Total Revenue', value: stats?.revenue.value, change: stats?.revenue.change, icon: DollarSign, format: 'currency' },
    { label: 'Active Users', value: stats?.users.value, change: stats?.users.change, icon: Users, format: 'number' },
    { label: 'Total Orders', value: stats?.orders.value, change: stats?.orders.change, icon: Activity, format: 'number' },
    { label: 'Conversion Rate', value: stats?.conversion.value, change: stats?.conversion.change, icon: TrendingUp, format: 'percent' },
  ];

  const formatValue = (value: number | undefined, format: string) => {
    if (value === undefined) return '-';
    if (format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    if (format === 'percent') return \`\${value.toFixed(1)}%\`;
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <select className="border rounded-lg px-3 py-2 text-sm">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{formatValue(stat.value, stat.format)}</p>
                  <div className={\`flex items-center mt-2 text-sm \${(stat.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}\`}>
                    {(stat.change || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{Math.abs(stat.change || 0).toFixed(1)}% from last period</span>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Revenue Overview</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-400">Chart Component Here</p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">New order #100{i}</p>
                  <p className="text-sm text-gray-500">{i} hour(s) ago</p>
                </div>
                <span className="text-green-600 font-medium">+$99.00</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}`,

  // Data Table with CRUD
  dataTable: `// Data Table - Complete CRUD with search, filter, pagination
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit, Trash2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function DataTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const { data, isLoading } = useQuery<{ items: Item[]; total: number; pages: number }>({
    queryKey: ['/api/items', { page, search }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(\`/api/items/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    },
  });

  const filteredItems = data?.items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Items</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select className="border rounded-lg px-3 py-2">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredItems.map(i => i.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Created</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                  </td>
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-gray-500">{item.email}</td>
                  <td className="py-3 px-4">
                    <span className={\`px-2 py-1 rounded-full text-xs \${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}\`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {filteredItems.length} of {data?.total || 0} items
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">Page {page} of {data?.pages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.pages || 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}`,

  // Settings Page
  settingsPage: `// Settings Page - Complete with profile, security, notifications
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Bell, CreditCard, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const updateMutation = useMutation({
    mutationFn: updateProfile,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            <form className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-2xl font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <Button variant="outline">Change Avatar</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user?.email} type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <textarea className="w-full border rounded-lg p-3 min-h-[100px]" placeholder="Tell us about yourself..." />
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            <form className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" />
              </div>
              <Button>Update Password</Button>
            </form>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication</h2>
            <p className="text-gray-500 mb-4">Add an extra layer of security to your account.</p>
            <Button variant="outline">Enable 2FA</Button>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { id: 'email', label: 'Email notifications', desc: 'Receive email updates about your account' },
                { id: 'push', label: 'Push notifications', desc: 'Get notified about important events' },
                { id: 'marketing', label: 'Marketing emails', desc: 'Receive tips, updates, and offers' },
                { id: 'weekly', label: 'Weekly digest', desc: 'Summary of your weekly activity' },
              ].map((item) => (
                <label key={item.id} className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input type="checkbox" className="mt-1" defaultChecked={item.id !== 'marketing'} />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Plan</h2>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">Pro</span>
            </div>
            <p className="text-gray-500 mb-4">You are currently on the Pro plan. Your next billing date is January 1, 2025.</p>
            <div className="flex gap-4">
              <Button variant="outline">Change Plan</Button>
              <Button variant="ghost" className="text-red-600">Cancel Subscription</Button>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">VISA</div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-500">Expires 12/25</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto">Edit</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}`,
};

// ============================================
// DATABASE SCHEMAS (Drizzle ORM)
// ============================================

export const DATABASE_SCHEMAS = {
  // Users table
  users: `// Database Schema - Users
import { pgTable, varchar, text, timestamp, boolean, sql } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql\`gen_random_uuid()\`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;`,

  // Sessions table
  sessions: `// Database Schema - Sessions
import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});`,

  // Subscriptions (Billing)
  subscriptions: `// Database Schema - Subscriptions
import { pgTable, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core';

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});`,

  // Complete schema file
  completeSchema: `// Complete Database Schema
import { pgTable, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations, sql } from 'drizzle-orm';
import { z } from 'zod';

// Users
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql\`gen_random_uuid()\`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql\`gen_random_uuid()\`),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Projects (example resource)
export const projects = pgTable('projects', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql\`gen_random_uuid()\`),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit logs
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql\`gen_random_uuid()\`),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: varchar('resource_id', { length: 36 }),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  subscriptions: many(subscriptions),
  projects: many(projects),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;`,
};

// ============================================
// API PATTERNS (Express Routes, Controllers, Services)
// ============================================

export const API_PATTERNS = {
  // Auth routes
  authRoutes: `// Auth Routes
import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getCurrentUser);
router.patch('/profile', requireAuth, authController.updateProfile);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;`,

  // Auth controller
  authController: `// Auth Controller
import { Request, Response } from 'express';
import { authService } from '../services/auth';

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      const { user, token } = await authService.register({ email, password, name });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.json({ success: true });
  },

  async getCurrentUser(req: Request, res: Response) {
    res.json({ user: req.user });
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const user = await authService.updateProfile(req.user!.id, req.body);
      res.json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      await authService.forgotPassword(req.body.email);
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      res.json({ message: 'Password reset email sent' }); // Don't reveal if email exists
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};`,

  // Auth service
  authService: `// Auth Service
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authService = {
  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid credentials');

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Store session
    await db.insert(sessions).values({
      id: nanoid(),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  },

  async register(data: { email: string; password: string; name: string }) {
    // Check if user exists
    const [existing] = await db.select().from(users).where(eq(users.email, data.email));
    if (existing) throw new Error('Email already registered');

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const [user] = await db.insert(users).values({
      id: nanoid(),
      email: data.email,
      password: hashedPassword,
      name: data.name,
    }).returning();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  },

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
      if (!user) return null;
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch {
      return null;
    }
  },

  async updateProfile(userId: string, data: Partial<{ name: string; avatar: string }>) {
    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async forgotPassword(email: string) {
    // Implementation: Generate reset token, send email
  },

  async resetPassword(token: string, newPassword: string) {
    // Implementation: Verify token, update password
  },
};`,

  // Auth middleware
  authMiddleware: `// Auth Middleware
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; role: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await authService.validateToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}`,

  // CRUD routes template
  crudRoutes: `// CRUD Routes Template
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { db } from '../db';
import { items } from '../db/schema';
import { eq, desc, like, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

// List items
router.get('/', requireAuth, validateQuery(querySchema), async (req, res) => {
  const { page, limit, search, status } = req.query as z.infer<typeof querySchema>;
  const offset = (page - 1) * limit;

  const conditions = [eq(items.userId, req.user!.id)];
  if (search) conditions.push(like(items.name, \`%\${search}%\`));
  if (status) conditions.push(eq(items.status, status));

  const [data, [{ count }]] = await Promise.all([
    db.select().from(items).where(and(...conditions)).orderBy(desc(items.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql\`count(*)\` }).from(items).where(and(...conditions)),
  ]);

  res.json({
    items: data,
    total: Number(count),
    page,
    pages: Math.ceil(Number(count) / limit),
  });
});

// Get single item
router.get('/:id', requireAuth, async (req, res) => {
  const [item] = await db.select().from(items).where(
    and(eq(items.id, req.params.id), eq(items.userId, req.user!.id))
  );
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Create item
router.post('/', requireAuth, validateBody(createSchema), async (req, res) => {
  const [item] = await db.insert(items).values({
    id: nanoid(),
    userId: req.user!.id,
    ...req.body,
  }).returning();
  res.status(201).json(item);
});

// Update item
router.patch('/:id', requireAuth, validateBody(updateSchema), async (req, res) => {
  const [item] = await db.update(items)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(items.id, req.params.id), eq(items.userId, req.user!.id)))
    .returning();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Delete item
router.delete('/:id', requireAuth, async (req, res) => {
  await db.delete(items).where(
    and(eq(items.id, req.params.id), eq(items.userId, req.user!.id))
  );
  res.status(204).send();
});

export default router;`,
};

// ============================================
// COMPLETE FILE TEMPLATES
// ============================================

export const COMPLETE_TEMPLATES = {
  // Main entry point
  mainTsx: `// Main Entry Point
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);`,

  // App with routing
  appTsx: `// App with Routing
import { Switch, Route, Redirect } from 'wouter';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout';
import { Spinner } from './components/ui/spinner';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}`,

  // Layout component
  layoutTsx: `// Layout Component with Sidebar
import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import {
  Home, LayoutDashboard, FolderKanban, Settings,
  LogOut, Menu, X, ChevronDown, Bell, User
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={\`\${sidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-gray-800 border-r transition-all duration-300 flex flex-col\`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && <span className="font-bold text-xl">AppName</span>}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={\`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors \${
                location === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }\`}>
                <item.icon className="w-5 h-5" />
                {sidebarOpen && <span>{item.label}</span>}
              </a>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={logout}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold">
            {navItems.find(item => item.href === location)?.label || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>

            <div className="relative">
              <button
                className="flex items-center gap-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-medium">{user?.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border py-2">
                  <Link href="/settings">
                    <a className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Settings</a>
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}`,

  // Server entry point
  serverIndex: `// Server Entry Point
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { setupVite, serveStatic } from './vite';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import dashboardRoutes from './routes/dashboard';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Vite in dev or serve static in prod
(async () => {
  if (process.env.NODE_ENV === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
})();`,
};

// Build enhanced training context for SaaS
export function buildSaaSContext(appType: 'saas' | 'dashboard' | 'ecommerce' | 'social'): string {
  const lines = [
    'You are an expert full-stack developer specializing in modern web applications.',
    'You generate COMPLETE, PRODUCTION-READY code with proper error handling, validation, and security.',
    '',
    'APPLICATION TYPE: ' + appType.toUpperCase(),
    '',
    'TECH STACK:',
    '- Frontend: React 18 + TypeScript + Vite',
    '- Styling: Tailwind CSS + shadcn/ui',
    '- State: TanStack Query + Zustand',
    '- Routing: Wouter',
    '- Backend: Express.js + TypeScript',
    '- Database: PostgreSQL + Drizzle ORM',
    '- Auth: JWT + bcrypt + cookies',
    '',
    'FILE STRUCTURE FOR GENERATED PROJECTS:',
    'index.html, package.json, tsconfig.json, vite.config.ts, tailwind.config.ts, postcss.config.js',
    'src/main.tsx, src/App.tsx, src/index.css',
    'src/components/layout/ (Layout, Header, Sidebar, Footer)',
    'src/components/ui/ (button, card, input, label, etc - 20+ components)',
    'src/pages/ (Landing, Login, Register, Dashboard, Settings, NotFound)',
    'src/hooks/ (useAuth, useToast)',
    'src/lib/ (utils, queryClient)',
    'server/index.ts, server/routes/, server/controllers/, server/services/, server/middleware/, server/db/',
    '',
    'REMEMBER:',
    '1. Generate ALL files needed for a complete, runnable project',
    '2. Include proper TypeScript types everywhere',
    '3. Add error handling and loading states',
    '4. Use consistent naming (lowercase for files, PascalCase for components)',
    '5. Include proper imports and exports',
    '6. The project must work with: npm install && npm run dev',
  ];

  let context = lines.join('\n');

  context += '\n\nAUTH PATTERN:\n' + SAAS_PATTERNS.authContext;
  context += '\n\nLOGIN FORM:\n' + SAAS_PATTERNS.loginForm;
  context += '\n\nDASHBOARD:\n' + SAAS_PATTERNS.dashboard;
  context += '\n\nDATA TABLE:\n' + SAAS_PATTERNS.dataTable;
  context += '\n\nDATABASE SCHEMA:\n' + DATABASE_SCHEMAS.completeSchema;
  context += '\n\nAPI ROUTES:\n' + API_PATTERNS.authRoutes;
  context += '\n\nAUTH SERVICE:\n' + API_PATTERNS.authService;

  return context;
}

export const SAAS_TRAINING_CONTEXT = buildSaaSContext('saas');