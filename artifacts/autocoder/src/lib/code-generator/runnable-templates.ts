// Runnable Full-Stack Templates - Generate projects that actually run in WebContainer
// Each template produces a complete Node.js project with package.json, server, and frontend

import {
  matchSaaSTemplate,
  saasTemplates,
  generateInvoicingSaaS,
  generateCRMSaaS,
  generateEcommerceSaaS,
  generateProjectSaaS
} from './saas-templates';

export interface RunnableProject {
  name: string;
  description: string;
  files: { path: string; content: string; language: string }[];
}

// Base package.json for Vite + React projects
function createPackageJson(name: string, deps: Record<string, string> = {}): string {
  return JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      ...deps
    },
    devDependencies: {
      vite: "^5.0.0"
    }
  }, null, 2);
}

// Base package.json for Express + React projects
function createFullStackPackageJson(name: string, deps: Record<string, string> = {}): string {
  return JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "node server.js",
      start: "node server.js"
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      ...deps
    }
  }, null, 2);
}

// Vite config for React (uses esbuild JSX - lighter than @vitejs/plugin-react for WebContainer)
const viteConfig = `import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  server: {
    host: '0.0.0.0',
    port: 5200
  }
});
`;

// Basic index.html for Vite
const viteIndexHtml = (title: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`;

// Main.jsx entry point
const mainJsx = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

// ============================================
// COUNTER APP
// ============================================
export function generateCounterApp(): RunnableProject {
  return {
    name: "Counter App",
    description: "Interactive counter with increment, decrement, and reset",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createPackageJson("counter-app")
      },
      {
        path: "vite.config.js",
        language: "javascript",
        content: viteConfig
      },
      {
        path: "index.html",
        language: "html",
        content: viteIndexHtml("Counter App")
      },
      {
        path: "src/main.jsx",
        language: "jsx",
        content: mainJsx
      },
      {
        path: "src/index.css",
        language: "css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  color: #e2e8f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.container {
  text-align: center;
  padding: 3rem;
  background: rgba(255,255,255,0.05);
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
}
h1 { font-size: 1.5rem; color: #94a3b8; margin-bottom: 1rem; }
.counter {
  font-size: 6rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 1rem 0;
}
.buttons { display: flex; gap: 1rem; justify-content: center; }
button {
  padding: 1rem 2rem;
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.decrement { background: #ef4444; color: white; }
.decrement:hover { background: #dc2626; transform: translateY(-2px); }
.increment { background: #6366f1; color: white; }
.increment:hover { background: #4f46e5; transform: translateY(-2px); }
.reset { background: #1f2937; color: #e2e8f0; border: 1px solid #374151; }
.reset:hover { background: #374151; }`
      },
      {
        path: "src/App.jsx",
        language: "jsx",
        content: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Counter</h1>
      <div className="counter">{count}</div>
      <div className="buttons">
        <button className="decrement" onClick={() => setCount(c => c - 1)}>-</button>
        <button className="reset" onClick={() => setCount(0)}>Reset</button>
        <button className="increment" onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  );
}
`
      }
    ]
  };
}

// ============================================
// TODO LIST APP
// ============================================
export function generateTodoApp(): RunnableProject {
  return {
    name: "Todo List",
    description: "Full-featured todo list with add, complete, and delete",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createPackageJson("todo-app")
      },
      {
        path: "vite.config.js",
        language: "javascript",
        content: viteConfig
      },
      {
        path: "index.html",
        language: "html",
        content: viteIndexHtml("Todo List")
      },
      {
        path: "src/main.jsx",
        language: "jsx",
        content: mainJsx
      },
      {
        path: "src/index.css",
        language: "css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0f0f23;
  color: #e2e8f0;
  min-height: 100vh;
  padding: 2rem;
}
.container { max-width: 600px; margin: 0 auto; }
h1 { text-align: center; margin-bottom: 2rem; font-size: 2rem; }
.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #374151;
  border-radius: 8px;
  background: #1a1a2e;
  color: #e2e8f0;
  font-size: 1rem;
}
input:focus { outline: none; border-color: #6366f1; }
button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.add-btn { background: #6366f1; color: white; }
.add-btn:hover { background: #4f46e5; }
.todo-list { list-style: none; }
.todo-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  border: 1px solid #374151;
}
.todo-item.completed span { text-decoration: line-through; color: #6b7280; }
.todo-item span { flex: 1; }
.delete-btn { background: #ef4444; color: white; padding: 0.5rem 1rem; }
.delete-btn:hover { background: #dc2626; }
.checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
.empty { text-align: center; color: #6b7280; padding: 2rem; }`
      },
      {
        path: "src/App.jsx",
        language: "jsx",
        content: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build something awesome', completed: false }
  ]);
  const [input, setInput] = useState('');

  const addTodo = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className="container">
      <h1>Todo List</h1>
      <form className="add-form" onSubmit={addTodo}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a new task..."
        />
        <button type="submit" className="add-btn">Add</button>
      </form>
      {todos.length === 0 ? (
        <p className="empty">No todos yet. Add one above!</p>
      ) : (
        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo.id} className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>
              <input
                type="checkbox"
                className="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span>{todo.text}</span>
              <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
`
      }
    ]
  };
}

// ============================================
// CALCULATOR APP
// ============================================
export function generateCalculatorApp(): RunnableProject {
  return {
    name: "Calculator",
    description: "Functional calculator with basic operations",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createPackageJson("calculator-app")
      },
      {
        path: "vite.config.js",
        language: "javascript",
        content: viteConfig
      },
      {
        path: "index.html",
        language: "html",
        content: viteIndexHtml("Calculator")
      },
      {
        path: "src/main.jsx",
        language: "jsx",
        content: mainJsx
      },
      {
        path: "src/index.css",
        language: "css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0f0f23;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.calculator {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #374151;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}
.display {
  background: #0f0f23;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: right;
}
.display .previous { color: #6b7280; font-size: 1rem; min-height: 1.5rem; }
.display .current { color: #e2e8f0; font-size: 2.5rem; font-weight: 600; }
.buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
button {
  padding: 1.25rem;
  font-size: 1.25rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: #374151;
  color: #e2e8f0;
}
button:hover { background: #4b5563; }
button:active { transform: scale(0.95); }
.operator { background: #6366f1; }
.operator:hover { background: #4f46e5; }
.equals { background: #22c55e; grid-column: span 2; }
.equals:hover { background: #16a34a; }
.clear { background: #ef4444; }
.clear:hover { background: #dc2626; }
.zero { grid-column: span 2; }`
      },
      {
        path: "src/App.jsx",
        language: "jsx",
        content: `import { useState } from 'react';

export default function App() {
  const [current, setCurrent] = useState('0');
  const [previous, setPrevious] = useState('');
  const [operator, setOperator] = useState(null);

  const handleNumber = (num) => {
    if (current === '0' && num !== '.') {
      setCurrent(num);
    } else if (num === '.' && current.includes('.')) {
      return;
    } else {
      setCurrent(current + num);
    }
  };

  const handleOperator = (op) => {
    setPrevious(current + ' ' + op);
    setOperator(op);
    setCurrent('0');
  };

  const calculate = () => {
    if (!operator) return;
    const prev = parseFloat(previous);
    const curr = parseFloat(current);
    let result;
    switch (operator) {
      case '+': result = prev + curr; break;
      case '-': result = prev - curr; break;
      case '*': result = prev * curr; break;
      case '/': result = prev / curr; break;
      default: return;
    }
    setCurrent(String(result));
    setPrevious('');
    setOperator(null);
  };

  const clear = () => {
    setCurrent('0');
    setPrevious('');
    setOperator(null);
  };

  return (
    <div className="calculator">
      <div className="display">
        <div className="previous">{previous}</div>
        <div className="current">{current}</div>
      </div>
      <div className="buttons">
        <button className="clear" onClick={clear}>C</button>
        <button onClick={() => setCurrent(current.slice(0, -1) || '0')}>DEL</button>
        <button onClick={() => setCurrent(String(-parseFloat(current)))}>+/-</button>
        <button className="operator" onClick={() => handleOperator('/')}>/</button>

        <button onClick={() => handleNumber('7')}>7</button>
        <button onClick={() => handleNumber('8')}>8</button>
        <button onClick={() => handleNumber('9')}>9</button>
        <button className="operator" onClick={() => handleOperator('*')}>*</button>

        <button onClick={() => handleNumber('4')}>4</button>
        <button onClick={() => handleNumber('5')}>5</button>
        <button onClick={() => handleNumber('6')}>6</button>
        <button className="operator" onClick={() => handleOperator('-')}>-</button>

        <button onClick={() => handleNumber('1')}>1</button>
        <button onClick={() => handleNumber('2')}>2</button>
        <button onClick={() => handleNumber('3')}>3</button>
        <button className="operator" onClick={() => handleOperator('+')}>+</button>

        <button className="zero" onClick={() => handleNumber('0')}>0</button>
        <button onClick={() => handleNumber('.')}>.</button>
        <button className="equals" onClick={calculate}>=</button>
      </div>
    </div>
  );
}
`
      }
    ]
  };
}

// ============================================
// FULL-STACK TODO WITH EXPRESS BACKEND
// ============================================
export function generateFullStackTodoApp(): RunnableProject {
  return {
    name: "Full-Stack Todo",
    description: "Todo app with Express backend and REST API",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createFullStackPackageJson("fullstack-todo")
      },
      {
        path: "server.js",
        language: "javascript",
        content: `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory database
let todos = [
  { id: 1, text: 'Learn Express', completed: false },
  { id: 2, text: 'Build REST API', completed: false }
];
let nextId = 3;

// API Routes
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  const todo = { id: nextId++, text, completed: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  if (!todo) return res.status(404).json({ error: 'Not found' });
  todo.completed = !todo.completed;
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.status(204).send();
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
`
      },
      {
        path: "public/index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Full-Stack Todo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #0f0f23;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 0.5rem; font-size: 2rem; }
    .subtitle { text-align: center; color: #6b7280; margin-bottom: 2rem; }
    .add-form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    input {
      flex: 1; padding: 0.75rem 1rem; border: 1px solid #374151;
      border-radius: 8px; background: #1a1a2e; color: #e2e8f0; font-size: 1rem;
    }
    input:focus { outline: none; border-color: #6366f1; }
    button {
      padding: 0.75rem 1.5rem; border: none; border-radius: 8px;
      cursor: pointer; font-weight: 600; transition: all 0.2s;
    }
    .add-btn { background: #6366f1; color: white; }
    .add-btn:hover { background: #4f46e5; }
    .todo-list { list-style: none; }
    .todo-item {
      display: flex; align-items: center; gap: 1rem; padding: 1rem;
      background: #1a1a2e; border-radius: 8px; margin-bottom: 0.5rem;
      border: 1px solid #374151;
    }
    .todo-item.completed span { text-decoration: line-through; color: #6b7280; }
    .todo-item span { flex: 1; }
    .delete-btn { background: #ef4444; color: white; padding: 0.5rem 1rem; }
    .delete-btn:hover { background: #dc2626; }
    .checkbox { width: 20px; height: 20px; cursor: pointer; }
    .empty { text-align: center; color: #6b7280; padding: 2rem; }
    .loading { text-align: center; color: #6b7280; padding: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Full-Stack Todo</h1>
    <p class="subtitle">Powered by Express + REST API</p>
    <form class="add-form" id="addForm">
      <input type="text" id="input" placeholder="Add a new task...">
      <button type="submit" class="add-btn">Add</button>
    </form>
    <div id="loading" class="loading">Loading todos...</div>
    <ul class="todo-list" id="todoList"></ul>
  </div>
  <script>
    const API = '/api/todos';
    const todoList = document.getElementById('todoList');
    const addForm = document.getElementById('addForm');
    const input = document.getElementById('input');
    const loading = document.getElementById('loading');

    async function fetchTodos() {
      try {
        const res = await fetch(API);
        const todos = await res.json();
        loading.style.display = 'none';
        renderTodos(todos);
      } catch (err) {
        loading.textContent = 'Error loading todos';
      }
    }

    function renderTodos(todos) {
      if (todos.length === 0) {
        todoList.innerHTML = '<li class="empty">No todos yet. Add one above!</li>';
        return;
      }
      todoList.innerHTML = todos.map(todo => \`
        <li class="todo-item \${todo.completed ? 'completed' : ''}">
          <input type="checkbox" class="checkbox" \${todo.completed ? 'checked' : ''}
            onchange="toggleTodo(\${todo.id})">
          <span>\${todo.text}</span>
          <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
        </li>
      \`).join('');
    }

    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      input.value = '';
      fetchTodos();
    });

    async function toggleTodo(id) {
      await fetch(\`\${API}/\${id}\`, { method: 'PUT' });
      fetchTodos();
    }

    async function deleteTodo(id) {
      await fetch(\`\${API}/\${id}\`, { method: 'DELETE' });
      fetchTodos();
    }

    fetchTodos();
  </script>
</body>
</html>`
      }
    ]
  };
}

// ============================================
// WEATHER APP
// ============================================
export function generateWeatherApp(): RunnableProject {
  return {
    name: "Weather App",
    description: "Weather lookup with mock data (no API key needed)",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createPackageJson("weather-app")
      },
      {
        path: "vite.config.js",
        language: "javascript",
        content: viteConfig
      },
      {
        path: "index.html",
        language: "html",
        content: viteIndexHtml("Weather App")
      },
      {
        path: "src/main.jsx",
        language: "jsx",
        content: mainJsx
      },
      {
        path: "src/index.css",
        language: "css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  color: #e2e8f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.container { text-align: center; padding: 2rem; }
h1 { margin-bottom: 1.5rem; }
.search-form { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 2rem; }
input {
  padding: 0.75rem 1rem; border: 1px solid #374151; border-radius: 8px;
  background: rgba(255,255,255,0.1); color: white; font-size: 1rem; width: 250px;
}
input::placeholder { color: #94a3b8; }
button {
  padding: 0.75rem 1.5rem; border: none; border-radius: 8px;
  background: #3b82f6; color: white; font-weight: 600; cursor: pointer;
}
button:hover { background: #2563eb; }
.weather-card {
  background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
  border-radius: 24px; padding: 2rem; border: 1px solid rgba(255,255,255,0.2);
  max-width: 400px; margin: 0 auto;
}
.city { font-size: 1.5rem; margin-bottom: 0.5rem; }
.temp { font-size: 4rem; font-weight: 700; }
.condition { font-size: 1.25rem; color: #94a3b8; }
.details { display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; }
.detail { text-align: center; }
.detail-value { font-size: 1.5rem; font-weight: 600; }
.detail-label { font-size: 0.875rem; color: #94a3b8; }`
      },
      {
        path: "src/App.jsx",
        language: "jsx",
        content: `import { useState } from 'react';

const mockWeather = {
  'new york': { temp: 72, condition: 'Sunny', humidity: 45, wind: 12 },
  'london': { temp: 58, condition: 'Cloudy', humidity: 78, wind: 8 },
  'tokyo': { temp: 68, condition: 'Partly Cloudy', humidity: 60, wind: 5 },
  'paris': { temp: 64, condition: 'Rainy', humidity: 82, wind: 10 },
  'sydney': { temp: 78, condition: 'Clear', humidity: 55, wind: 15 },
};

export default function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const key = city.toLowerCase().trim();
    if (mockWeather[key]) {
      setWeather({ city: city, ...mockWeather[key] });
      setError('');
    } else {
      setError('City not found. Try: New York, London, Tokyo, Paris, Sydney');
      setWeather(null);
    }
  };

  return (
    <div className="container">
      <h1>Weather App</h1>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name..."
        />
        <button type="submit">Search</button>
      </form>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {weather && (
        <div className="weather-card">
          <div className="city">{weather.city}</div>
          <div className="temp">{weather.temp}°F</div>
          <div className="condition">{weather.condition}</div>
          <div className="details">
            <div className="detail">
              <div className="detail-value">{weather.humidity}%</div>
              <div className="detail-label">Humidity</div>
            </div>
            <div className="detail">
              <div className="detail-value">{weather.wind} mph</div>
              <div className="detail-label">Wind</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
      }
    ]
  };
}

// ============================================
// CHAT APP
// ============================================
export function generateChatApp(): RunnableProject {
  return {
    name: "Chat App",
    description: "Real-time chat interface with simulated responses",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createPackageJson("chat-app")
      },
      {
        path: "vite.config.js",
        language: "javascript",
        content: viteConfig
      },
      {
        path: "index.html",
        language: "html",
        content: viteIndexHtml("Chat App")
      },
      {
        path: "src/main.jsx",
        language: "jsx",
        content: mainJsx
      },
      {
        path: "src/index.css",
        language: "css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0f0f23;
  color: #e2e8f0;
  height: 100vh;
}
.chat-container {
  max-width: 600px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #374151;
  text-align: center;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.message {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  line-height: 1.4;
}
.message.user {
  align-self: flex-end;
  background: #6366f1;
  border-bottom-right-radius: 4px;
}
.message.bot {
  align-self: flex-start;
  background: #374151;
  border-bottom-left-radius: 4px;
}
.input-form {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #1a1a2e;
  border-top: 1px solid #374151;
}
input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #374151;
  border-radius: 24px;
  background: #0f0f23;
  color: #e2e8f0;
  font-size: 1rem;
}
input:focus { outline: none; border-color: #6366f1; }
button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 24px;
  background: #6366f1;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
button:hover { background: #4f46e5; }
button:disabled { opacity: 0.5; cursor: not-allowed; }`
      },
      {
        path: "src/App.jsx",
        language: "jsx",
        content: `import { useState, useRef, useEffect } from 'react';

const botResponses = [
  "That's interesting! Tell me more.",
  "I understand. How can I help with that?",
  "Great question! Let me think about that.",
  "I'm here to assist you. What else would you like to know?",
  "Thanks for sharing! Is there anything specific you need?",
];

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        text: botResponses[Math.floor(Math.random() * botResponses.length)],
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  return (
    <div className="chat-container">
      <div className="header">
        <h1>Chat App</h1>
      </div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={\`message \${msg.sender}\`}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="message bot" style={{ opacity: 0.7 }}>
            Typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="input-form" onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isTyping}
        />
        <button type="submit" disabled={isTyping || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
`
      }
    ]
  };
}

// ============================================
// E-COMMERCE STORE WITH CART
// ============================================
export function generateEcommerceApp(): RunnableProject {
  return {
    name: "E-Commerce Store",
    description: "Full-stack store with products, cart, and checkout API",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createFullStackPackageJson("ecommerce-store", { "uuid": "^9.0.0" })
      },
      {
        path: "server.js",
        language: "javascript",
        content: `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory database
const products = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧', category: 'Electronics', stock: 15 },
  { id: 2, name: 'Smart Watch', price: 199.99, image: '⌚', category: 'Electronics', stock: 8 },
  { id: 3, name: 'Running Shoes', price: 129.99, image: '👟', category: 'Sports', stock: 20 },
  { id: 4, name: 'Backpack', price: 49.99, image: '🎒', category: 'Accessories', stock: 25 },
  { id: 5, name: 'Coffee Maker', price: 89.99, image: '☕', category: 'Home', stock: 12 },
  { id: 6, name: 'Desk Lamp', price: 34.99, image: '💡', category: 'Home', stock: 30 },
];

const carts = new Map(); // sessionId -> cart items
const orders = [];
let orderId = 1;

// Get all products
app.get('/api/products', (req, res) => {
  const { category, search } = req.query;
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  res.json(result);
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Get cart
app.get('/api/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const cart = carts.get(sessionId) || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ items: cart, total: total.toFixed(2), count: cart.reduce((s, i) => s + i.quantity, 0) });
});

// Add to cart
app.post('/api/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const { productId, quantity = 1 } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  let cart = carts.get(sessionId) || [];
  const existing = cart.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, name: product.name, price: product.price, image: product.image, quantity });
  }
  carts.set(sessionId, cart);
  res.json({ message: 'Added to cart', cart });
});

// Update cart item
app.put('/api/cart/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const { quantity } = req.body;
  let cart = carts.get(sessionId) || [];
  const item = cart.find(i => i.productId === parseInt(req.params.productId));
  if (!item) return res.status(404).json({ error: 'Item not in cart' });
  if (quantity <= 0) {
    cart = cart.filter(i => i.productId !== parseInt(req.params.productId));
  } else {
    item.quantity = quantity;
  }
  carts.set(sessionId, cart);
  res.json({ cart });
});

// Remove from cart
app.delete('/api/cart/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  let cart = carts.get(sessionId) || [];
  cart = cart.filter(i => i.productId !== parseInt(req.params.productId));
  carts.set(sessionId, cart);
  res.json({ cart });
});

// Checkout
app.post('/api/checkout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const cart = carts.get(sessionId) || [];
  if (cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = { id: orderId++, items: [...cart], total: total.toFixed(2), date: new Date().toISOString() };
  orders.push(order);
  carts.set(sessionId, []);
  res.json({ message: 'Order placed!', order });
});

app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(\`Store running at http://localhost:\${PORT}\`));
`
      },
      {
        path: "public/index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Commerce Store</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
    header { background: #1a1a2e; padding: 1rem; border-bottom: 1px solid #374151; margin-bottom: 2rem; }
    .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 1.5rem; }
    .cart-btn { background: #6366f1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .cart-btn:hover { background: #4f46e5; }
    .products { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
    .product-card { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; border: 1px solid #374151; transition: transform 0.2s; }
    .product-card:hover { transform: translateY(-4px); }
    .product-image { font-size: 4rem; text-align: center; margin-bottom: 1rem; }
    .product-name { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .product-price { font-size: 1.25rem; color: #22c55e; font-weight: 700; margin-bottom: 1rem; }
    .add-btn { width: 100%; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .add-btn:hover { background: #4f46e5; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center; }
    .modal.open { display: flex; }
    .modal-content { background: #1a1a2e; border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .close-btn { background: none; border: none; color: #e2e8f0; font-size: 1.5rem; cursor: pointer; }
    .cart-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #0f0f23; border-radius: 8px; margin-bottom: 0.5rem; }
    .cart-item-image { font-size: 2rem; }
    .cart-item-info { flex: 1; }
    .cart-item-name { font-weight: 600; }
    .cart-item-price { color: #22c55e; }
    .quantity-controls { display: flex; align-items: center; gap: 0.5rem; }
    .qty-btn { width: 28px; height: 28px; border: none; border-radius: 4px; background: #374151; color: white; cursor: pointer; }
    .cart-total { font-size: 1.25rem; font-weight: 700; text-align: right; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #374151; }
    .checkout-btn { width: 100%; padding: 1rem; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; margin-top: 1rem; }
    .checkout-btn:hover { background: #16a34a; }
    .empty-cart { text-align: center; color: #6b7280; padding: 2rem; }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <h1>🛒 E-Commerce Store</h1>
      <button class="cart-btn" onclick="openCart()">Cart (<span id="cartCount">0</span>)</button>
    </div>
  </header>
  <div class="container">
    <div class="products" id="products"></div>
  </div>
  <div class="modal" id="cartModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Your Cart</h2>
        <button class="close-btn" onclick="closeCart()">&times;</button>
      </div>
      <div id="cartItems"></div>
      <div class="cart-total">Total: $<span id="cartTotal">0.00</span></div>
      <button class="checkout-btn" onclick="checkout()">Checkout</button>
    </div>
  </div>
  <script>
    const SESSION_ID = 'session-' + Math.random().toString(36).substr(2, 9);
    const headers = { 'Content-Type': 'application/json', 'x-session-id': SESSION_ID };

    async function loadProducts() {
      const res = await fetch('/api/products');
      const products = await res.json();
      document.getElementById('products').innerHTML = products.map(p => \`
        <div class="product-card">
          <div class="product-image">\${p.image}</div>
          <div class="product-name">\${p.name}</div>
          <div class="product-price">$\${p.price.toFixed(2)}</div>
          <button class="add-btn" onclick="addToCart(\${p.id})">Add to Cart</button>
        </div>
      \`).join('');
    }

    async function loadCart() {
      const res = await fetch('/api/cart', { headers });
      const cart = await res.json();
      document.getElementById('cartCount').textContent = cart.count;
      document.getElementById('cartTotal').textContent = cart.total;
      if (cart.items.length === 0) {
        document.getElementById('cartItems').innerHTML = '<p class="empty-cart">Your cart is empty</p>';
      } else {
        document.getElementById('cartItems').innerHTML = cart.items.map(item => \`
          <div class="cart-item">
            <div class="cart-item-image">\${item.image}</div>
            <div class="cart-item-info">
              <div class="cart-item-name">\${item.name}</div>
              <div class="cart-item-price">$\${item.price.toFixed(2)}</div>
            </div>
            <div class="quantity-controls">
              <button class="qty-btn" onclick="updateQty(\${item.productId}, \${item.quantity - 1})">-</button>
              <span>\${item.quantity}</span>
              <button class="qty-btn" onclick="updateQty(\${item.productId}, \${item.quantity + 1})">+</button>
            </div>
          </div>
        \`).join('');
      }
    }

    async function addToCart(productId) {
      await fetch('/api/cart', { method: 'POST', headers, body: JSON.stringify({ productId }) });
      loadCart();
    }

    async function updateQty(productId, quantity) {
      if (quantity <= 0) {
        await fetch('/api/cart/' + productId, { method: 'DELETE', headers });
      } else {
        await fetch('/api/cart/' + productId, { method: 'PUT', headers, body: JSON.stringify({ quantity }) });
      }
      loadCart();
    }

    async function checkout() {
      const res = await fetch('/api/checkout', { method: 'POST', headers });
      const data = await res.json();
      if (data.order) {
        alert('Order #' + data.order.id + ' placed! Total: $' + data.order.total);
        closeCart();
        loadCart();
      }
    }

    function openCart() { document.getElementById('cartModal').classList.add('open'); loadCart(); }
    function closeCart() { document.getElementById('cartModal').classList.remove('open'); }

    loadProducts();
    loadCart();
  </script>
</body>
</html>`
      }
    ]
  };
}

// ============================================
// BLOG WITH POSTS AND COMMENTS
// ============================================
export function generateBlogApp(): RunnableProject {
  return {
    name: "Blog Platform",
    description: "Full-stack blog with posts, comments, and categories",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createFullStackPackageJson("blog-platform")
      },
      {
        path: "server.js",
        language: "javascript",
        content: `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory database
let posts = [
  { id: 1, title: 'Getting Started with Node.js', content: 'Node.js is a powerful runtime for building server-side applications...', author: 'John Doe', category: 'Technology', createdAt: '2024-01-15', likes: 24 },
  { id: 2, title: 'Modern CSS Techniques', content: 'CSS has evolved significantly with flexbox, grid, and custom properties...', author: 'Jane Smith', category: 'Design', createdAt: '2024-01-18', likes: 18 },
  { id: 3, title: 'Building REST APIs', content: 'REST APIs are the backbone of modern web applications...', author: 'Bob Wilson', category: 'Technology', createdAt: '2024-01-20', likes: 32 },
];

let comments = [
  { id: 1, postId: 1, author: 'Reader1', content: 'Great article!', createdAt: '2024-01-16' },
  { id: 2, postId: 1, author: 'Reader2', content: 'Very helpful, thanks!', createdAt: '2024-01-17' },
  { id: 3, postId: 3, author: 'DevFan', content: 'Excellent explanation of REST concepts.', createdAt: '2024-01-21' },
];

let postId = 4, commentId = 4;

// Posts API
app.get('/api/posts', (req, res) => {
  const { category } = req.query;
  let result = posts.map(p => ({ ...p, commentCount: comments.filter(c => c.postId === p.id).length }));
  if (category) result = result.filter(p => p.category === category);
  res.json(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const postComments = comments.filter(c => c.postId === post.id);
  res.json({ ...post, comments: postComments });
});

app.post('/api/posts', (req, res) => {
  const { title, content, author, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  const post = { id: postId++, title, content, author: author || 'Anonymous', category: category || 'General', createdAt: new Date().toISOString().split('T')[0], likes: 0 };
  posts.push(post);
  res.status(201).json(post);
});

app.post('/api/posts/:id/like', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.likes++;
  res.json({ likes: post.likes });
});

// Comments API
app.post('/api/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { author, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const comment = { id: commentId++, postId, author: author || 'Anonymous', content, createdAt: new Date().toISOString().split('T')[0] };
  comments.push(comment);
  res.status(201).json(comment);
});

app.get('/api/categories', (req, res) => {
  const categories = [...new Set(posts.map(p => p.category))];
  res.json(categories);
});

app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(\`Blog running at http://localhost:\${PORT}\`));
`
      },
      {
        path: "public/index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    header { text-align: center; margin-bottom: 3rem; padding-top: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .tagline { color: #6b7280; }
    .categories { display: flex; gap: 0.5rem; justify-content: center; margin: 1.5rem 0; flex-wrap: wrap; }
    .category-btn { padding: 0.5rem 1rem; border: 1px solid #374151; border-radius: 20px; background: transparent; color: #e2e8f0; cursor: pointer; }
    .category-btn:hover, .category-btn.active { background: #6366f1; border-color: #6366f1; }
    .post-card { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #374151; }
    .post-meta { display: flex; gap: 1rem; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.75rem; }
    .post-title { font-size: 1.5rem; margin-bottom: 0.75rem; cursor: pointer; }
    .post-title:hover { color: #6366f1; }
    .post-excerpt { color: #94a3b8; line-height: 1.6; margin-bottom: 1rem; }
    .post-footer { display: flex; justify-content: space-between; align-items: center; }
    .like-btn { background: none; border: 1px solid #374151; color: #e2e8f0; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
    .like-btn:hover { background: #ef4444; border-color: #ef4444; }
    .comment-count { color: #6b7280; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; overflow-y: auto; padding: 2rem; }
    .modal.open { display: block; }
    .modal-content { background: #1a1a2e; border-radius: 16px; padding: 2rem; max-width: 700px; margin: 0 auto; }
    .close-btn { float: right; background: none; border: none; color: #e2e8f0; font-size: 1.5rem; cursor: pointer; }
    .post-full-content { line-height: 1.8; margin: 1.5rem 0; }
    .comments-section { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #374151; }
    .comment { background: #0f0f23; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; }
    .comment-author { font-weight: bold; margin-bottom: 0.25rem; }
    .comment-form { margin-top: 1rem; display: flex; gap: 0.5rem; }
    .comment-form input, .comment-form textarea { flex: 1; padding: 0.75rem; border: 1px solid #374151; border-radius: 8px; background: #0f0f23; color: #e2e8f0; }
    .comment-form button { padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .new-post-btn { position: fixed; bottom: 2rem; right: 2rem; width: 60px; height: 60px; border-radius: 50%; background: #6366f1; color: white; border: none; font-size: 2rem; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
  </style>
</head>
<body>
  <header>
    <h1>📝 Blog Platform</h1>
    <p class="tagline">Share your thoughts with the world</p>
    <div class="categories" id="categories"></div>
  </header>
  <div class="container">
    <div id="posts"></div>
  </div>
  <button class="new-post-btn" onclick="openNewPost()">+</button>
  <div class="modal" id="postModal">
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal()">&times;</button>
      <div id="postDetail"></div>
    </div>
  </div>
  <script>
    let currentCategory = null;

    async function loadCategories() {
      const res = await fetch('/api/categories');
      const cats = await res.json();
      document.getElementById('categories').innerHTML =
        '<button class="category-btn active" onclick="filterCategory(null)">All</button>' +
        cats.map(c => \`<button class="category-btn" onclick="filterCategory('\${c}')">\${c}</button>\`).join('');
    }

    async function loadPosts() {
      const url = currentCategory ? '/api/posts?category=' + currentCategory : '/api/posts';
      const res = await fetch(url);
      const posts = await res.json();
      document.getElementById('posts').innerHTML = posts.map(p => \`
        <div class="post-card">
          <div class="post-meta">
            <span>\${p.author}</span>
            <span>\${p.category}</span>
            <span>\${p.createdAt}</span>
          </div>
          <h2 class="post-title" onclick="openPost(\${p.id})">\${p.title}</h2>
          <p class="post-excerpt">\${p.content.substring(0, 150)}...</p>
          <div class="post-footer">
            <button class="like-btn" onclick="likePost(\${p.id})">❤️ \${p.likes}</button>
            <span class="comment-count">💬 \${p.commentCount} comments</span>
          </div>
        </div>
      \`).join('');
    }

    function filterCategory(cat) {
      currentCategory = cat;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      loadPosts();
    }

    async function openPost(id) {
      const res = await fetch('/api/posts/' + id);
      const post = await res.json();
      document.getElementById('postDetail').innerHTML = \`
        <div class="post-meta"><span>\${post.author}</span><span>\${post.createdAt}</span></div>
        <h2>\${post.title}</h2>
        <div class="post-full-content">\${post.content}</div>
        <button class="like-btn" onclick="likePost(\${post.id})">❤️ \${post.likes} likes</button>
        <div class="comments-section">
          <h3>Comments (\${post.comments.length})</h3>
          \${post.comments.map(c => \`
            <div class="comment">
              <div class="comment-author">\${c.author}</div>
              <div>\${c.content}</div>
            </div>
          \`).join('')}
          <form class="comment-form" onsubmit="addComment(event, \${post.id})">
            <input name="author" placeholder="Your name">
            <input name="content" placeholder="Add a comment..." required>
            <button type="submit">Post</button>
          </form>
        </div>
      \`;
      document.getElementById('postModal').classList.add('open');
    }

    async function likePost(id) {
      await fetch('/api/posts/' + id + '/like', { method: 'POST' });
      loadPosts();
    }

    async function addComment(e, postId) {
      e.preventDefault();
      const form = e.target;
      await fetch('/api/posts/' + postId + '/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: form.author.value, content: form.content.value })
      });
      openPost(postId);
    }

    function closeModal() { document.getElementById('postModal').classList.remove('open'); }
    function openNewPost() { alert('New post form would open here!'); }

    loadCategories();
    loadPosts();
  </script>
</body>
</html>`
      }
    ]
  };
}

// ============================================
// DASHBOARD WITH ANALYTICS
// ============================================
export function generateDashboardApp(): RunnableProject {
  return {
    name: "Analytics Dashboard",
    description: "Admin dashboard with charts, stats, and data tables",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createFullStackPackageJson("analytics-dashboard")
      },
      {
        path: "server.js",
        language: "javascript",
        content: `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock data generators
const generateStats = () => ({
  totalUsers: Math.floor(Math.random() * 5000) + 10000,
  activeUsers: Math.floor(Math.random() * 2000) + 3000,
  revenue: (Math.random() * 50000 + 100000).toFixed(2),
  orders: Math.floor(Math.random() * 500) + 1000,
  growth: (Math.random() * 20 + 5).toFixed(1),
  conversionRate: (Math.random() * 3 + 2).toFixed(2)
});

const generateChartData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(month => ({
    month,
    revenue: Math.floor(Math.random() * 30000) + 20000,
    users: Math.floor(Math.random() * 1000) + 500
  }));
};

const generateUsers = () => [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active', joined: '2024-01-05' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'Active', joined: '2024-01-12' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Editor', status: 'Inactive', joined: '2024-01-18' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'User', status: 'Active', joined: '2024-01-22' },
  { id: 5, name: 'Eva Green', email: 'eva@example.com', role: 'User', status: 'Active', joined: '2024-01-28' },
];

const generateActivity = () => [
  { id: 1, action: 'New user registered', user: 'John Doe', time: '2 minutes ago' },
  { id: 2, action: 'Order #1234 completed', user: 'System', time: '15 minutes ago' },
  { id: 3, action: 'Payment received', user: 'Stripe', time: '1 hour ago' },
  { id: 4, action: 'Report generated', user: 'Admin', time: '2 hours ago' },
  { id: 5, action: 'Settings updated', user: 'Admin', time: '3 hours ago' },
];

// API endpoints
app.get('/api/stats', (req, res) => res.json(generateStats()));
app.get('/api/chart-data', (req, res) => res.json(generateChartData()));
app.get('/api/users', (req, res) => res.json(generateUsers()));
app.get('/api/activity', (req, res) => res.json(generateActivity()));

app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(\`Dashboard running at http://localhost:\${PORT}\`));
`
      },
      {
        path: "public/index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; }
    .dashboard { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    .sidebar { background: #1a1a2e; padding: 1.5rem; border-right: 1px solid #374151; }
    .logo { font-size: 1.25rem; font-weight: 700; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem; }
    .nav-item { display: block; padding: 0.75rem 1rem; color: #94a3b8; text-decoration: none; border-radius: 8px; margin-bottom: 0.25rem; }
    .nav-item:hover, .nav-item.active { background: #6366f1; color: white; }
    .main { padding: 2rem; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .header h1 { font-size: 1.5rem; }
    .refresh-btn { padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: #1a1a2e; padding: 1.5rem; border-radius: 12px; border: 1px solid #374151; }
    .stat-label { color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-change { font-size: 0.875rem; color: #22c55e; margin-top: 0.5rem; }
    .stat-change.negative { color: #ef4444; }
    .grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: #1a1a2e; border-radius: 12px; border: 1px solid #374151; padding: 1.5rem; }
    .card-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
    .chart { height: 200px; display: flex; align-items: flex-end; gap: 1rem; padding: 1rem 0; }
    .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .bar { width: 100%; background: #6366f1; border-radius: 4px 4px 0 0; transition: height 0.3s; }
    .bar-label { font-size: 0.75rem; color: #6b7280; }
    .activity-item { display: flex; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid #374151; }
    .activity-item:last-child { border: none; }
    .activity-icon { width: 36px; height: 36px; background: #374151; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .activity-text { flex: 1; }
    .activity-action { font-weight: 500; }
    .activity-time { font-size: 0.875rem; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #374151; }
    th { color: #6b7280; font-weight: 500; font-size: 0.875rem; }
    .status { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; }
    .status.active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .status.inactive { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    @media (max-width: 768px) {
      .dashboard { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .grid-2 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <aside class="sidebar">
      <div class="logo">📊 Dashboard</div>
      <nav>
        <a href="#" class="nav-item active">Overview</a>
        <a href="#" class="nav-item">Analytics</a>
        <a href="#" class="nav-item">Users</a>
        <a href="#" class="nav-item">Reports</a>
        <a href="#" class="nav-item">Settings</a>
      </nav>
    </aside>
    <main class="main">
      <div class="header">
        <h1>Dashboard Overview</h1>
        <button class="refresh-btn" onclick="loadData()">Refresh</button>
      </div>
      <div class="stats-grid" id="stats"></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Revenue Overview</div>
          <div class="chart" id="chart"></div>
        </div>
        <div class="card">
          <div class="card-title">Recent Activity</div>
          <div id="activity"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Users</div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody id="users"></tbody>
        </table>
      </div>
    </main>
  </div>
  <script>
    async function loadData() {
      // Load stats
      const stats = await (await fetch('/api/stats')).json();
      document.getElementById('stats').innerHTML = \`
        <div class="stat-card"><div class="stat-label">Total Users</div><div class="stat-value">\${stats.totalUsers.toLocaleString()}</div><div class="stat-change">+\${stats.growth}% this month</div></div>
        <div class="stat-card"><div class="stat-label">Active Users</div><div class="stat-value">\${stats.activeUsers.toLocaleString()}</div><div class="stat-change">Online now</div></div>
        <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">$\${parseFloat(stats.revenue).toLocaleString()}</div><div class="stat-change">+12.5% vs last month</div></div>
        <div class="stat-card"><div class="stat-label">Orders</div><div class="stat-value">\${stats.orders}</div><div class="stat-change">\${stats.conversionRate}% conversion</div></div>
      \`;

      // Load chart
      const chartData = await (await fetch('/api/chart-data')).json();
      const maxRevenue = Math.max(...chartData.map(d => d.revenue));
      document.getElementById('chart').innerHTML = chartData.map(d => \`
        <div class="bar-group">
          <div class="bar" style="height: \${(d.revenue / maxRevenue) * 150}px"></div>
          <div class="bar-label">\${d.month}</div>
        </div>
      \`).join('');

      // Load activity
      const activity = await (await fetch('/api/activity')).json();
      document.getElementById('activity').innerHTML = activity.map(a => \`
        <div class="activity-item">
          <div class="activity-icon">📌</div>
          <div class="activity-text">
            <div class="activity-action">\${a.action}</div>
            <div class="activity-time">\${a.time}</div>
          </div>
        </div>
      \`).join('');

      // Load users
      const users = await (await fetch('/api/users')).json();
      document.getElementById('users').innerHTML = users.map(u => \`
        <tr>
          <td>\${u.name}</td>
          <td>\${u.email}</td>
          <td>\${u.role}</td>
          <td><span class="status \${u.status.toLowerCase()}">\${u.status}</span></td>
          <td>\${u.joined}</td>
        </tr>
      \`).join('');
    }

    loadData();
  </script>
</body>
</html>`
      }
    ]
  };
}

// ============================================
// NOTES APP WITH USER ACCOUNTS
// ============================================
export function generateNotesApp(): RunnableProject {
  return {
    name: "Notes App",
    description: "Full-stack notes with authentication and CRUD operations",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createFullStackPackageJson("notes-app")
      },
      {
        path: "server.js",
        language: "javascript",
        content: `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory database
const users = new Map();
const notes = new Map();
let noteId = 1;

// Auth middleware
const getUser = (req) => {
  const token = req.headers['authorization'];
  return token ? users.get(token) : null;
};

// Auth routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (Array.from(users.values()).some(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const token = 'token-' + Math.random().toString(36).substr(2, 16);
  const user = { id: users.size + 1, username, password, token };
  users.set(token, user);
  notes.set(user.id, []);
  res.json({ token, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = Array.from(users.values()).find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: user.token, username: user.username });
});

// Notes routes
app.get('/api/notes', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const userNotes = notes.get(user.id) || [];
  res.json(userNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
});

app.post('/api/notes', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, content, color } = req.body;
  const note = {
    id: noteId++,
    title: title || 'Untitled',
    content: content || '',
    color: color || '#6366f1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const userNotes = notes.get(user.id) || [];
  userNotes.push(note);
  notes.set(user.id, userNotes);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const userNotes = notes.get(user.id) || [];
  const note = userNotes.find(n => n.id === parseInt(req.params.id));
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const { title, content, color } = req.body;
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (color !== undefined) note.color = color;
  note.updatedAt = new Date().toISOString();
  res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  let userNotes = notes.get(user.id) || [];
  userNotes = userNotes.filter(n => n.id !== parseInt(req.params.id));
  notes.set(user.id, userNotes);
  res.status(204).send();
});

app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(\`Notes app running at http://localhost:\${PORT}\`));
`
      },
      {
        path: "public/index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notes App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    .auth-screen { max-width: 400px; margin: 4rem auto; }
    .auth-card { background: #1a1a2e; padding: 2rem; border-radius: 16px; border: 1px solid #374151; }
    .auth-card h1 { text-align: center; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: #94a3b8; }
    .form-group input { width: 100%; padding: 0.75rem; border: 1px solid #374151; border-radius: 8px; background: #0f0f23; color: #e2e8f0; }
    .btn { width: 100%; padding: 0.75rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 0.5rem; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-secondary { background: transparent; color: #6366f1; border: 1px solid #6366f1; }
    .error { color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    header h1 { display: flex; align-items: center; gap: 0.5rem; }
    .user-info { display: flex; align-items: center; gap: 1rem; }
    .logout-btn { background: none; border: 1px solid #374151; color: #e2e8f0; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
    .notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .new-note-btn { padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
    .note-card { padding: 1.25rem; border-radius: 12px; cursor: pointer; transition: transform 0.2s; }
    .note-card:hover { transform: translateY(-4px); }
    .note-title { font-weight: 600; margin-bottom: 0.5rem; color: white; }
    .note-content { font-size: 0.875rem; color: rgba(255,255,255,0.8); line-height: 1.5; overflow: hidden; max-height: 100px; }
    .note-date { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 0.75rem; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center; padding: 1rem; }
    .modal.open { display: flex; }
    .modal-content { background: #1a1a2e; border-radius: 16px; padding: 2rem; width: 100%; max-width: 500px; }
    .modal-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
    .close-btn { background: none; border: none; color: #e2e8f0; font-size: 1.5rem; cursor: pointer; }
    textarea { width: 100%; min-height: 200px; padding: 0.75rem; border: 1px solid #374151; border-radius: 8px; background: #0f0f23; color: #e2e8f0; resize: vertical; }
    .color-picker { display: flex; gap: 0.5rem; margin: 1rem 0; }
    .color-option { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
    .color-option.selected { border-color: white; }
    .modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .modal-actions button { flex: 1; }
    .delete-btn { background: #ef4444 !important; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div id="authScreen" class="auth-screen">
    <div class="auth-card">
      <h1>📝 Notes</h1>
      <div id="loginForm">
        <div class="form-group"><label>Username</label><input type="text" id="loginUsername"></div>
        <div class="form-group"><label>Password</label><input type="password" id="loginPassword"></div>
        <div id="loginError" class="error"></div>
        <button class="btn btn-primary" onclick="login()">Login</button>
        <button class="btn btn-secondary" onclick="showRegister()">Create Account</button>
      </div>
      <div id="registerForm" class="hidden">
        <div class="form-group"><label>Username</label><input type="text" id="regUsername"></div>
        <div class="form-group"><label>Password</label><input type="password" id="regPassword"></div>
        <div id="regError" class="error"></div>
        <button class="btn btn-primary" onclick="register()">Register</button>
        <button class="btn btn-secondary" onclick="showLogin()">Back to Login</button>
      </div>
    </div>
  </div>

  <div id="appScreen" class="container hidden">
    <header>
      <h1>📝 My Notes</h1>
      <div class="user-info">
        <span id="username"></span>
        <button class="logout-btn" onclick="logout()">Logout</button>
      </div>
    </header>
    <div class="notes-header">
      <span id="noteCount">0 notes</span>
      <button class="new-note-btn" onclick="openNewNote()">+ New Note</button>
    </div>
    <div class="notes-grid" id="notesGrid"></div>
  </div>

  <div class="modal" id="noteModal">
    <div class="modal-content">
      <div class="modal-header">
        <input type="text" id="noteTitle" placeholder="Note title..." style="background:none;border:none;color:#e2e8f0;font-size:1.25rem;font-weight:600;width:100%;">
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <textarea id="noteContent" placeholder="Write your note..."></textarea>
      <div class="color-picker" id="colorPicker"></div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveNote()">Save</button>
        <button class="btn delete-btn" id="deleteBtn" onclick="deleteNote()">Delete</button>
      </div>
    </div>
  </div>

  <script>
    let token = localStorage.getItem('token');
    let currentNote = null;
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#06b6d4'];
    let selectedColor = colors[0];

    const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': token });

    function showLogin() { document.getElementById('loginForm').classList.remove('hidden'); document.getElementById('registerForm').classList.add('hidden'); }
    function showRegister() { document.getElementById('loginForm').classList.add('hidden'); document.getElementById('registerForm').classList.remove('hidden'); }

    async function login() {
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;
      try {
        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (res.ok) { token = data.token; localStorage.setItem('token', token); showApp(data.username); }
        else { document.getElementById('loginError').textContent = data.error; }
      } catch (e) { document.getElementById('loginError').textContent = 'Connection error'; }
    }

    async function register() {
      const username = document.getElementById('regUsername').value;
      const password = document.getElementById('regPassword').value;
      try {
        const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (res.ok) { token = data.token; localStorage.setItem('token', token); showApp(data.username); }
        else { document.getElementById('regError').textContent = data.error; }
      } catch (e) { document.getElementById('regError').textContent = 'Connection error'; }
    }

    function logout() { localStorage.removeItem('token'); token = null; location.reload(); }

    function showApp(username) {
      document.getElementById('authScreen').classList.add('hidden');
      document.getElementById('appScreen').classList.remove('hidden');
      document.getElementById('username').textContent = username;
      loadNotes();
      initColorPicker();
    }

    function initColorPicker() {
      document.getElementById('colorPicker').innerHTML = colors.map(c =>
        \`<div class="color-option \${c === selectedColor ? 'selected' : ''}" style="background:\${c}" onclick="selectColor('\${c}')"></div>\`
      ).join('');
    }

    function selectColor(color) {
      selectedColor = color;
      document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
      event.target.classList.add('selected');
    }

    async function loadNotes() {
      const res = await fetch('/api/notes', { headers: headers() });
      const notes = await res.json();
      document.getElementById('noteCount').textContent = notes.length + ' notes';
      document.getElementById('notesGrid').innerHTML = notes.map(n => \`
        <div class="note-card" style="background:\${n.color}" onclick="openNote(\${n.id}, '\${n.title.replace(/'/g, "\\\\'")}', '\${n.content.replace(/'/g, "\\\\'")}', '\${n.color}')">
          <div class="note-title">\${n.title}</div>
          <div class="note-content">\${n.content}</div>
          <div class="note-date">\${new Date(n.updatedAt).toLocaleDateString()}</div>
        </div>
      \`).join('') || '<p style="color:#6b7280">No notes yet. Create your first note!</p>';
    }

    function openNewNote() {
      currentNote = null;
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteContent').value = '';
      selectedColor = colors[0];
      initColorPicker();
      document.getElementById('deleteBtn').classList.add('hidden');
      document.getElementById('noteModal').classList.add('open');
    }

    function openNote(id, title, content, color) {
      currentNote = id;
      document.getElementById('noteTitle').value = title;
      document.getElementById('noteContent').value = content;
      selectedColor = color;
      initColorPicker();
      document.getElementById('deleteBtn').classList.remove('hidden');
      document.getElementById('noteModal').classList.add('open');
    }

    function closeModal() { document.getElementById('noteModal').classList.remove('open'); }

    async function saveNote() {
      const title = document.getElementById('noteTitle').value || 'Untitled';
      const content = document.getElementById('noteContent').value;
      const body = JSON.stringify({ title, content, color: selectedColor });
      if (currentNote) {
        await fetch('/api/notes/' + currentNote, { method: 'PUT', headers: headers(), body });
      } else {
        await fetch('/api/notes', { method: 'POST', headers: headers(), body });
      }
      closeModal();
      loadNotes();
    }

    async function deleteNote() {
      if (!currentNote) return;
      await fetch('/api/notes/' + currentNote, { method: 'DELETE', headers: headers() });
      closeModal();
      loadNotes();
    }

    // Check if already logged in
    if (token) {
      document.getElementById('authScreen').classList.add('hidden');
      document.getElementById('appScreen').classList.remove('hidden');
      loadNotes();
      initColorPicker();
    }
  </script>
</body>
</html>`
      }
    ]
  };
}

// ============================================
// KANBAN BOARD
// ============================================
export function generateKanbanApp(): RunnableProject {
  return {
    name: "Kanban Board",
    description: "Project management board with drag-and-drop columns",
    files: [
      {
        path: "package.json",
        language: "json",
        content: createFullStackPackageJson("kanban-board")
      },
      {
        path: "server.js",
        language: "javascript",
        content: `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory database
let columns = [
  { id: 'todo', title: 'To Do', color: '#6366f1' },
  { id: 'progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'review', title: 'Review', color: '#8b5cf6' },
  { id: 'done', title: 'Done', color: '#22c55e' }
];

let tasks = [
  { id: 1, columnId: 'todo', title: 'Design homepage', description: 'Create wireframes and mockups', priority: 'high', assignee: 'Alice' },
  { id: 2, columnId: 'todo', title: 'Setup database', description: 'Configure PostgreSQL', priority: 'medium', assignee: 'Bob' },
  { id: 3, columnId: 'progress', title: 'Build API endpoints', description: 'REST API for users and posts', priority: 'high', assignee: 'Carol' },
  { id: 4, columnId: 'review', title: 'Write unit tests', description: 'Test coverage for auth module', priority: 'low', assignee: 'David' },
  { id: 5, columnId: 'done', title: 'Project setup', description: 'Initialize repo and CI/CD', priority: 'medium', assignee: 'Alice' },
];

let taskId = 6;

// API endpoints
app.get('/api/board', (req, res) => {
  const board = columns.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.columnId === col.id)
  }));
  res.json(board);
});

app.post('/api/tasks', (req, res) => {
  const { columnId, title, description, priority, assignee } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const task = { id: taskId++, columnId: columnId || 'todo', title, description: description || '', priority: priority || 'medium', assignee: assignee || '' };
  tasks.push(task);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { columnId, title, description, priority, assignee } = req.body;
  if (columnId) task.columnId = columnId;
  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority) task.priority = priority;
  if (assignee !== undefined) task.assignee = assignee;
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks = tasks.filter(t => t.id !== parseInt(req.params.id));
  res.status(204).send();
});

app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(\`Kanban running at http://localhost:\${PORT}\`));
`
      },
      {
        path: "public/index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; overflow-x: auto; }
    header { background: #1a1a2e; padding: 1rem 2rem; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .add-btn { padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .board { display: flex; gap: 1.5rem; padding: 2rem; min-height: calc(100vh - 60px); }
    .column { background: #1a1a2e; border-radius: 12px; width: 300px; min-width: 300px; display: flex; flex-direction: column; }
    .column-header { padding: 1rem; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
    .column-title { font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    .column-title::before { content: ''; width: 12px; height: 12px; border-radius: 50%; }
    .column-count { background: #374151; padding: 0.125rem 0.5rem; border-radius: 10px; font-size: 0.75rem; }
    .column-tasks { flex: 1; padding: 0.75rem; overflow-y: auto; min-height: 200px; }
    .task-card { background: #0f0f23; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; cursor: grab; border: 1px solid #374151; transition: transform 0.15s, box-shadow 0.15s; }
    .task-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .task-card.dragging { opacity: 0.5; }
    .task-title { font-weight: 600; margin-bottom: 0.5rem; }
    .task-desc { font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.75rem; }
    .task-meta { display: flex; justify-content: space-between; align-items: center; }
    .priority { padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .priority.high { background: rgba(239,68,68,0.2); color: #ef4444; }
    .priority.medium { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .priority.low { background: rgba(34,197,94,0.2); color: #22c55e; }
    .assignee { font-size: 0.875rem; color: #6b7280; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center; }
    .modal.open { display: flex; }
    .modal-content { background: #1a1a2e; border-radius: 16px; padding: 2rem; width: 400px; }
    .modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
    .modal-header h2 { font-size: 1.25rem; }
    .close-btn { background: none; border: none; color: #e2e8f0; font-size: 1.5rem; cursor: pointer; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.875rem; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #374151; border-radius: 8px; background: #0f0f23; color: #e2e8f0; }
    .form-group textarea { min-height: 80px; resize: vertical; }
    .submit-btn { width: 100%; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .delete-btn { background: #ef4444; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <header>
    <h1>📋 Kanban Board</h1>
    <button class="add-btn" onclick="openAddTask()">+ Add Task</button>
  </header>
  <div class="board" id="board"></div>

  <div class="modal" id="taskModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle">Add Task</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <form onsubmit="saveTask(event)">
        <div class="form-group"><label>Title</label><input type="text" id="taskTitle" required></div>
        <div class="form-group"><label>Description</label><textarea id="taskDesc"></textarea></div>
        <div class="form-group">
          <label>Priority</label>
          <select id="taskPriority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
        </div>
        <div class="form-group"><label>Assignee</label><input type="text" id="taskAssignee"></div>
        <div class="form-group"><label>Column</label><select id="taskColumn"></select></div>
        <button type="submit" class="submit-btn">Save Task</button>
        <button type="button" class="submit-btn delete-btn" id="deleteTaskBtn" onclick="deleteTask()" style="display:none">Delete</button>
      </form>
    </div>
  </div>

  <script>
    let board = [];
    let editingTask = null;
    let draggedTask = null;

    async function loadBoard() {
      const res = await fetch('/api/board');
      board = await res.json();
      renderBoard();
      populateColumnSelect();
    }

    function renderBoard() {
      document.getElementById('board').innerHTML = board.map(col => \`
        <div class="column" data-column="\${col.id}">
          <div class="column-header">
            <span class="column-title" style="--color:\${col.color}">\${col.title}</span>
            <span class="column-count">\${col.tasks.length}</span>
          </div>
          <div class="column-tasks" ondragover="allowDrop(event)" ondrop="drop(event, '\${col.id}')">
            \${col.tasks.map(t => \`
              <div class="task-card" draggable="true" ondragstart="drag(event, \${t.id})" onclick="openEditTask(\${t.id})">
                <div class="task-title">\${t.title}</div>
                \${t.description ? \`<div class="task-desc">\${t.description}</div>\` : ''}
                <div class="task-meta">
                  <span class="priority \${t.priority}">\${t.priority}</span>
                  \${t.assignee ? \`<span class="assignee">\${t.assignee}</span>\` : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`).join('');

      document.querySelectorAll('.column-title').forEach(el => {
        const color = el.style.getPropertyValue('--color');
        el.style.cssText = \`--color:\${color}\`;
        el.querySelector('::before')?.style.setProperty('background', color);
      });
    }

    function populateColumnSelect() {
      document.getElementById('taskColumn').innerHTML = board.map(c => \`<option value="\${c.id}">\${c.title}</option>\`).join('');
    }

    function drag(e, taskId) { draggedTask = taskId; e.target.classList.add('dragging'); }
    function allowDrop(e) { e.preventDefault(); }
    async function drop(e, columnId) {
      e.preventDefault();
      if (!draggedTask) return;
      await fetch('/api/tasks/' + draggedTask, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId })
      });
      draggedTask = null;
      loadBoard();
    }

    function openAddTask() {
      editingTask = null;
      document.getElementById('modalTitle').textContent = 'Add Task';
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDesc').value = '';
      document.getElementById('taskPriority').value = 'medium';
      document.getElementById('taskAssignee').value = '';
      document.getElementById('taskColumn').value = 'todo';
      document.getElementById('deleteTaskBtn').style.display = 'none';
      document.getElementById('taskModal').classList.add('open');
    }

    function openEditTask(id) {
      const task = board.flatMap(c => c.tasks).find(t => t.id === id);
      if (!task) return;
      editingTask = id;
      document.getElementById('modalTitle').textContent = 'Edit Task';
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDesc').value = task.description;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskAssignee').value = task.assignee;
      document.getElementById('taskColumn').value = task.columnId;
      document.getElementById('deleteTaskBtn').style.display = 'block';
      document.getElementById('taskModal').classList.add('open');
    }

    function closeModal() { document.getElementById('taskModal').classList.remove('open'); }

    async function saveTask(e) {
      e.preventDefault();
      const data = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDesc').value,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value,
        columnId: document.getElementById('taskColumn').value
      };
      if (editingTask) {
        await fetch('/api/tasks/' + editingTask, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      } else {
        await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      }
      closeModal();
      loadBoard();
    }

    async function deleteTask() {
      if (!editingTask) return;
      await fetch('/api/tasks/' + editingTask, { method: 'DELETE' });
      closeModal();
      loadBoard();
    }

    loadBoard();
  </script>
</body>
</html>`
      }
    ]
  };
}

// ============================================
// INVOICING APP
// ============================================
export function generateInvoicingApp(): RunnableProject {
  return {
    name: "Invoice Manager",
    description: "Professional invoicing system with client management and payment tracking",
    files: [
      {
        path: "package.json",
        content: createFullStackPackageJson("invoice-manager", { uuid: "^9.0.0" }),
        language: "json"
      },
      {
        path: "server.js",
        content: `import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let clients = [
  { id: '1', name: 'Acme Corp', email: 'contact@acme.com', address: '123 Business St', phone: '555-0100' },
  { id: '2', name: 'Tech Solutions', email: 'info@techsol.com', address: '456 Tech Ave', phone: '555-0200' }
];

let invoices = [
  { id: 'INV-001', clientId: '1', items: [{ desc: 'Web Development', qty: 1, rate: 2500 }], status: 'paid', date: '2024-01-15', dueDate: '2024-02-15', total: 2500 },
  { id: 'INV-002', clientId: '2', items: [{ desc: 'Consulting', qty: 10, rate: 150 }], status: 'pending', date: '2024-01-20', dueDate: '2024-02-20', total: 1500 }
];

app.get('/api/clients', (req, res) => res.json(clients));
app.post('/api/clients', (req, res) => {
  const client = { id: randomUUID(), ...req.body };
  clients.push(client);
  res.json(client);
});

app.get('/api/invoices', (req, res) => {
  const enriched = invoices.map(inv => ({
    ...inv,
    client: clients.find(c => c.id === inv.clientId)
  }));
  res.json(enriched);
});

app.post('/api/invoices', (req, res) => {
  const id = 'INV-' + String(invoices.length + 1).padStart(3, '0');
  const total = req.body.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const invoice = { id, ...req.body, total, status: 'pending' };
  invoices.push(invoice);
  res.json(invoice);
});

app.patch('/api/invoices/:id/status', (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (invoice) {
    invoice.status = req.body.status;
    res.json(invoice);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/api/stats', (req, res) => {
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0);
  res.json({ total, paid, pending, count: invoices.length, clientCount: clients.length });
});

app.listen(5200, () => console.log('Server running on port 5200'));`,
        language: "javascript"
      },
      {
        path: "public/index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Manager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { background: #1a1a2e; padding: 1rem 2rem; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
    nav { display: flex; gap: 1rem; }
    nav button { padding: 0.5rem 1rem; background: transparent; border: 1px solid #374151; color: #e2e8f0; border-radius: 8px; cursor: pointer; }
    nav button.active { background: #6366f1; border-color: #6366f1; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #1a1a2e; padding: 1.5rem; border-radius: 12px; border: 1px solid #374151; }
    .stat-label { color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .stat-value { font-size: 1.75rem; font-weight: 700; }
    .stat-value.green { color: #22c55e; }
    .stat-value.yellow { color: #eab308; }
    .btn { padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }
    .btn-success { background: #22c55e; }
    .btn-outline { background: transparent; border: 1px solid #374151; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #374151; }
    th { background: #0f0f23; font-weight: 600; color: #94a3b8; }
    .status { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .status-paid { background: rgba(34,197,94,0.2); color: #22c55e; }
    .status-pending { background: rgba(234,179,8,0.2); color: #eab308; }
    .status-overdue { background: rgba(239,68,68,0.2); color: #ef4444; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center; }
    .modal.open { display: flex; }
    .modal-content { background: #1a1a2e; border-radius: 16px; padding: 2rem; width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
    .close-btn { background: none; border: none; color: #e2e8f0; font-size: 1.5rem; cursor: pointer; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.875rem; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #374151; border-radius: 8px; background: #0f0f23; color: #e2e8f0; }
    .items-list { margin-bottom: 1rem; }
    .item-row { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; margin-bottom: 0.5rem; }
    .item-row input { padding: 0.5rem; }
    .total-row { display: flex; justify-content: space-between; padding: 1rem; background: #0f0f23; border-radius: 8px; font-weight: 700; font-size: 1.25rem; }
    .page { display: none; }
    .page.active { display: block; }
  </style>
</head>
<body>
  <header>
    <h1>📄 Invoice Manager</h1>
    <nav>
      <button class="active" onclick="showPage('dashboard')">Dashboard</button>
      <button onclick="showPage('invoices')">Invoices</button>
      <button onclick="showPage('clients')">Clients</button>
    </nav>
  </header>

  <div class="container">
    <div id="dashboard" class="page active">
      <h2 style="margin-bottom: 1.5rem">Dashboard</h2>
      <div class="stats" id="stats"></div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3>Recent Invoices</h3>
        <button class="btn" onclick="openInvoiceModal()">+ New Invoice</button>
      </div>
      <table id="recentInvoices"></table>
    </div>

    <div id="invoices" class="page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>All Invoices</h2>
        <button class="btn" onclick="openInvoiceModal()">+ New Invoice</button>
      </div>
      <table id="invoiceTable"></table>
    </div>

    <div id="clients" class="page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>Clients</h2>
        <button class="btn" onclick="openClientModal()">+ Add Client</button>
      </div>
      <table id="clientTable"></table>
    </div>
  </div>

  <div class="modal" id="invoiceModal">
    <div class="modal-content">
      <div class="modal-header"><h2>New Invoice</h2><button class="close-btn" onclick="closeModals()">&times;</button></div>
      <form onsubmit="createInvoice(event)">
        <div class="form-group"><label>Client</label><select id="invClient" required></select></div>
        <div class="form-group"><label>Date</label><input type="date" id="invDate" required></div>
        <div class="form-group"><label>Due Date</label><input type="date" id="invDueDate" required></div>
        <div class="form-group"><label>Items</label></div>
        <div class="items-list" id="itemsList"></div>
        <button type="button" class="btn btn-outline btn-sm" onclick="addItem()">+ Add Item</button>
        <div class="total-row" style="margin-top: 1rem;"><span>Total</span><span id="invoiceTotal">$0.00</span></div>
        <button type="submit" class="btn" style="width: 100%; margin-top: 1rem;">Create Invoice</button>
      </form>
    </div>
  </div>

  <div class="modal" id="clientModal">
    <div class="modal-content">
      <div class="modal-header"><h2>Add Client</h2><button class="close-btn" onclick="closeModals()">&times;</button></div>
      <form onsubmit="createClient(event)">
        <div class="form-group"><label>Name</label><input type="text" id="clientName" required></div>
        <div class="form-group"><label>Email</label><input type="email" id="clientEmail" required></div>
        <div class="form-group"><label>Phone</label><input type="tel" id="clientPhone"></div>
        <div class="form-group"><label>Address</label><textarea id="clientAddress"></textarea></div>
        <button type="submit" class="btn" style="width: 100%;">Add Client</button>
      </form>
    </div>
  </div>

  <script>
    let invoices = [];
    let clients = [];
    let items = [];

    async function loadData() {
      const [invRes, clientRes, statsRes] = await Promise.all([
        fetch('/api/invoices'), fetch('/api/clients'), fetch('/api/stats')
      ]);
      invoices = await invRes.json();
      clients = await clientRes.json();
      const stats = await statsRes.json();
      renderStats(stats);
      renderInvoices();
      renderClients();
    }

    function renderStats(stats) {
      document.getElementById('stats').innerHTML = \`
        <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">$\${stats.total.toLocaleString()}</div></div>
        <div class="stat-card"><div class="stat-label">Paid</div><div class="stat-value green">$\${stats.paid.toLocaleString()}</div></div>
        <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value yellow">$\${stats.pending.toLocaleString()}</div></div>
        <div class="stat-card"><div class="stat-label">Invoices</div><div class="stat-value">\${stats.count}</div></div>
      \`;
    }

    function renderInvoices() {
      const html = \`<thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>\${
        invoices.map(inv => \`<tr>
          <td>\${inv.id}</td>
          <td>\${inv.client?.name || 'Unknown'}</td>
          <td>\${inv.date}</td>
          <td>$\${inv.total.toLocaleString()}</td>
          <td><span class="status status-\${inv.status}">\${inv.status}</span></td>
          <td>\${inv.status === 'pending' ? \`<button class="btn btn-sm btn-success" onclick="markPaid('\${inv.id}')">Mark Paid</button>\` : ''}</td>
        </tr>\`).join('')
      }</tbody>\`;
      document.getElementById('invoiceTable').innerHTML = html;
      document.getElementById('recentInvoices').innerHTML = html;
    }

    function renderClients() {
      document.getElementById('clientTable').innerHTML = \`<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th></tr></thead><tbody>\${
        clients.map(c => \`<tr><td>\${c.name}</td><td>\${c.email}</td><td>\${c.phone || '-'}</td><td>\${c.address || '-'}</td></tr>\`).join('')
      }</tbody>\`;
      document.getElementById('invClient').innerHTML = clients.map(c => \`<option value="\${c.id}">\${c.name}</option>\`).join('');
    }

    function showPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(page).classList.add('active');
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
    }

    function openInvoiceModal() {
      items = [{ desc: '', qty: 1, rate: 0 }];
      renderItems();
      document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('invDueDate').value = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
      document.getElementById('invoiceModal').classList.add('open');
    }

    function openClientModal() { document.getElementById('clientModal').classList.add('open'); }
    function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); }

    function addItem() { items.push({ desc: '', qty: 1, rate: 0 }); renderItems(); }

    function renderItems() {
      document.getElementById('itemsList').innerHTML = items.map((item, i) => \`
        <div class="item-row">
          <input placeholder="Description" value="\${item.desc}" onchange="updateItem(\${i}, 'desc', this.value)">
          <input type="number" placeholder="Qty" value="\${item.qty}" onchange="updateItem(\${i}, 'qty', this.value)">
          <input type="number" placeholder="Rate" value="\${item.rate}" onchange="updateItem(\${i}, 'rate', this.value)">
          <button type="button" class="btn btn-sm btn-outline" onclick="removeItem(\${i})">X</button>
        </div>
      \`).join('');
      updateTotal();
    }

    function updateItem(i, field, value) {
      items[i][field] = field === 'desc' ? value : Number(value);
      updateTotal();
    }

    function removeItem(i) { items.splice(i, 1); renderItems(); }

    function updateTotal() {
      const total = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
      document.getElementById('invoiceTotal').textContent = '$' + total.toLocaleString();
    }

    async function createInvoice(e) {
      e.preventDefault();
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: document.getElementById('invClient').value,
          date: document.getElementById('invDate').value,
          dueDate: document.getElementById('invDueDate').value,
          items: items.filter(i => i.desc)
        })
      });
      closeModals();
      loadData();
    }

    async function createClient(e) {
      e.preventDefault();
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('clientName').value,
          email: document.getElementById('clientEmail').value,
          phone: document.getElementById('clientPhone').value,
          address: document.getElementById('clientAddress').value
        })
      });
      closeModals();
      loadData();
    }

    async function markPaid(id) {
      await fetch(\`/api/invoices/\${id}/status\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      loadData();
    }

    loadData();
  </script>
</body>
</html>`,
        language: "html"
      }
    ]
  };
}

// Pattern matching to select the right template
export function matchRunnableTemplate(input: string): RunnableProject | null {
  const lower = input.toLowerCase();

  // Invoice / Billing
  if (lower.includes('invoice') || lower.includes('invoicing') || lower.includes('billing') || lower.includes('receipt')) {
    return generateInvoicingApp();
  }

  // Kanban / Project management
  if (lower.includes('kanban') || lower.includes('project board') || lower.includes('task board') || lower.includes('trello')) {
    return generateKanbanApp();
  }

  // E-commerce / Store / Shop
  if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('store') ||
      lower.includes('shop') || lower.includes('cart') || lower.includes('products')) {
    return generateEcommerceApp();
  }

  // Blog
  if (lower.includes('blog') || lower.includes('posts') || lower.includes('articles') || lower.includes('cms')) {
    return generateBlogApp();
  }

  // Dashboard / Analytics / Admin
  if (lower.includes('dashboard') || lower.includes('analytics') || lower.includes('admin') ||
      lower.includes('stats') || lower.includes('metrics')) {
    return generateDashboardApp();
  }

  // Notes app
  if (lower.includes('notes') || lower.includes('notebook') || lower.includes('memo')) {
    return generateNotesApp();
  }

  // Full-stack todo (with backend keywords)
  if ((lower.includes('full') || lower.includes('backend') || lower.includes('api') || lower.includes('express') || lower.includes('server')) &&
      (lower.includes('todo') || lower.includes('task'))) {
    return generateFullStackTodoApp();
  }

  // Counter
  if (lower.includes('counter') || lower.includes('increment') || lower.includes('clicker')) {
    return generateCounterApp();
  }

  // Todo/Task list (simple)
  if (lower.includes('todo') || lower.includes('task list') || lower.includes('checklist')) {
    return generateTodoApp();
  }

  // Calculator
  if (lower.includes('calculator') || lower.includes('calc')) {
    return generateCalculatorApp();
  }

  // Weather
  if (lower.includes('weather') || lower.includes('forecast')) {
    return generateWeatherApp();
  }

  // Chat
  if (lower.includes('chat') || lower.includes('messenger') || lower.includes('messaging')) {
    return generateChatApp();
  }

  // Check for comprehensive SaaS templates (priority for business apps)
  const saasTemplate = matchSaaSTemplate(input);
  if (saasTemplate) {
    return saasTemplate;
  }

  return null;
}

// Export all generators (including comprehensive SaaS templates)
export const runnableTemplates = {
  // Simple apps
  counter: generateCounterApp,
  todo: generateTodoApp,
  fullstackTodo: generateFullStackTodoApp,
  calculator: generateCalculatorApp,
  weather: generateWeatherApp,
  chat: generateChatApp,
  blog: generateBlogApp,
  dashboard: generateDashboardApp,
  notes: generateNotesApp,

  // Comprehensive SaaS templates (20-40+ files each)
  invoicingSaaS: generateInvoicingSaaS,
  crmSaaS: generateCRMSaaS,
  ecommerceSaaS: generateEcommerceSaaS,
  projectSaaS: generateProjectSaaS,

  // Legacy simple versions
  ecommerce: generateEcommerceApp,
  kanban: generateKanbanApp,
  invoicing: generateInvoicingApp
};

// Re-export SaaS templates for direct access
export { saasTemplates, matchSaaSTemplate };