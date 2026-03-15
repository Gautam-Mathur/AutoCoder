// WebApp Knowledge Base - Teaches how to build COMPLETE multi-language web applications
// Works hand-in-hand with Sage Knowledge Base to create fully functional apps

export interface WebAppStack {
  id: string;
  name: string;
  description: string;
  languages: string[];
  files: FileTemplate[];
  features: string[];
  bestFor: string[];
}

export interface FileTemplate {
  name: string;
  language: string;
  purpose: string;
  template: string;
  dependencies?: string[];
}

export interface WebAppBlueprint {
  type: string;
  stacks: string[];
  requiredFiles: string[];
  optionalFiles: string[];
  connections: FileConnection[];
}

export interface FileConnection {
  from: string;
  to: string;
  method: string; // "import", "fetch", "link", "script"
  description: string;
}

// ========================================
// TECH STACKS - How languages work together
// ========================================

export const techStacks: Record<string, WebAppStack> = {

  "vanilla-fullstack": {
    id: "vanilla-fullstack",
    name: "Vanilla Full Stack",
    description: "Pure HTML + CSS + JavaScript - no frameworks, maximum control",
    languages: ["html", "css", "javascript"],
    files: [
      {
        name: "index.html",
        language: "html",
        purpose: "Main page structure and content",
        template: "html-structure"
      },
      {
        name: "styles.css",
        language: "css",
        purpose: "All styling and responsive design",
        template: "css-modern"
      },
      {
        name: "app.js",
        language: "javascript",
        purpose: "Interactivity, DOM manipulation, API calls",
        template: "js-app"
      }
    ],
    features: ["No build step", "Fast loading", "Full control", "Easy to debug"],
    bestFor: ["Landing pages", "Simple apps", "Learning", "Quick prototypes"]
  },

  "vanilla-with-api": {
    id: "vanilla-with-api",
    name: "Frontend + API",
    description: "HTML/CSS/JS frontend that connects to a backend API",
    languages: ["html", "css", "javascript", "json"],
    files: [
      {
        name: "index.html",
        language: "html",
        purpose: "Page structure",
        template: "html-structure"
      },
      {
        name: "styles.css",
        language: "css",
        purpose: "Styling",
        template: "css-modern"
      },
      {
        name: "app.js",
        language: "javascript",
        purpose: "Frontend logic and API integration",
        template: "js-api-client"
      },
      {
        name: "api.js",
        language: "javascript",
        purpose: "API helper functions",
        template: "js-api-helper"
      }
    ],
    features: ["API integration", "Dynamic data", "Reusable API layer"],
    bestFor: ["Data-driven apps", "CRUD applications", "Dashboards"]
  },

  "spa-vanilla": {
    id: "spa-vanilla",
    name: "Single Page App (Vanilla)",
    description: "Client-side routing without frameworks",
    languages: ["html", "css", "javascript"],
    files: [
      {
        name: "index.html",
        language: "html",
        purpose: "App shell with router container",
        template: "html-spa-shell"
      },
      {
        name: "styles.css",
        language: "css",
        purpose: "Global and component styles",
        template: "css-modern"
      },
      {
        name: "router.js",
        language: "javascript",
        purpose: "Client-side routing logic",
        template: "js-router"
      },
      {
        name: "app.js",
        language: "javascript",
        purpose: "Main app logic and components",
        template: "js-spa-app"
      },
      {
        name: "pages.js",
        language: "javascript",
        purpose: "Page components",
        template: "js-pages"
      }
    ],
    features: ["No page refresh", "Fast navigation", "State management"],
    bestFor: ["Complex apps", "Dashboards", "Admin panels"]
  },

  "interactive-dashboard": {
    id: "interactive-dashboard",
    name: "Interactive Dashboard",
    description: "Data visualization dashboard with charts and real-time updates",
    languages: ["html", "css", "javascript"],
    files: [
      {
        name: "index.html",
        language: "html",
        purpose: "Dashboard layout with sidebar and main area",
        template: "html-dashboard-layout"
      },
      {
        name: "styles.css",
        language: "css",
        purpose: "Dashboard styling, cards, sidebar",
        template: "css-dashboard"
      },
      {
        name: "app.js",
        language: "javascript",
        purpose: "Dashboard logic and interactions",
        template: "js-dashboard"
      },
      {
        name: "charts.js",
        language: "javascript",
        purpose: "Chart rendering and data visualization",
        template: "js-charts"
      },
      {
        name: "data.js",
        language: "javascript",
        purpose: "Data fetching and state management",
        template: "js-data-manager"
      }
    ],
    features: ["Charts", "Real-time updates", "Responsive sidebar", "Data tables"],
    bestFor: ["Admin dashboards", "Analytics", "Monitoring", "Business apps"]
  },

  "ecommerce-frontend": {
    id: "ecommerce-frontend",
    name: "E-Commerce Frontend",
    description: "Complete e-commerce frontend with cart and checkout",
    languages: ["html", "css", "javascript"],
    files: [
      {
        name: "index.html",
        language: "html",
        purpose: "Product listing page",
        template: "html-ecommerce"
      },
      {
        name: "styles.css",
        language: "css",
        purpose: "E-commerce styling",
        template: "css-ecommerce"
      },
      {
        name: "products.js",
        language: "javascript",
        purpose: "Product display and filtering",
        template: "js-products"
      },
      {
        name: "cart.js",
        language: "javascript",
        purpose: "Shopping cart functionality",
        template: "js-cart"
      },
      {
        name: "checkout.js",
        language: "javascript",
        purpose: "Checkout process",
        template: "js-checkout"
      }
    ],
    features: ["Product grid", "Cart system", "Checkout flow", "Local storage"],
    bestFor: ["Online stores", "Product catalogs", "Marketplaces"]
  },

  "form-heavy-app": {
    id: "form-heavy-app",
    name: "Form-Heavy Application",
    description: "Multi-step forms with validation and data handling",
    languages: ["html", "css", "javascript"],
    files: [
      {
        name: "index.html",
        language: "html",
        purpose: "Form container and structure",
        template: "html-form-app"
      },
      {
        name: "styles.css",
        language: "css",
        purpose: "Form styling and validation states",
        template: "css-forms"
      },
      {
        name: "form.js",
        language: "javascript",
        purpose: "Form logic and multi-step navigation",
        template: "js-form-handler"
      },
      {
        name: "validation.js",
        language: "javascript",
        purpose: "Input validation rules",
        template: "js-validation"
      },
      {
        name: "submit.js",
        language: "javascript",
        purpose: "Form submission and API integration",
        template: "js-form-submit"
      }
    ],
    features: ["Multi-step forms", "Real-time validation", "Error handling", "Progress indicator"],
    bestFor: ["Registration", "Surveys", "Applications", "Onboarding"]
  }
};

// ========================================
// APP BLUEPRINTS - How to build specific app types
// ========================================

export const appBlueprints: Record<string, WebAppBlueprint> = {

  "crud-app": {
    type: "CRUD Application",
    stacks: ["vanilla-with-api", "spa-vanilla"],
    requiredFiles: ["index.html", "styles.css", "app.js"],
    optionalFiles: ["api.js", "utils.js"],
    connections: [
      { from: "index.html", to: "styles.css", method: "link", description: "CSS styling" },
      { from: "index.html", to: "app.js", method: "script", description: "Main app logic" },
      { from: "app.js", to: "api.js", method: "import", description: "API helper functions" }
    ]
  },

  "dashboard": {
    type: "Dashboard",
    stacks: ["interactive-dashboard", "spa-vanilla"],
    requiredFiles: ["index.html", "styles.css", "app.js", "data.js"],
    optionalFiles: ["charts.js", "utils.js"],
    connections: [
      { from: "index.html", to: "styles.css", method: "link", description: "Dashboard styling" },
      { from: "index.html", to: "app.js", method: "script", description: "Dashboard logic" },
      { from: "app.js", to: "data.js", method: "import", description: "Data management" },
      { from: "app.js", to: "charts.js", method: "import", description: "Chart rendering" }
    ]
  },

  "ecommerce": {
    type: "E-Commerce",
    stacks: ["ecommerce-frontend"],
    requiredFiles: ["index.html", "styles.css", "products.js", "cart.js"],
    optionalFiles: ["checkout.js", "api.js"],
    connections: [
      { from: "index.html", to: "styles.css", method: "link", description: "Store styling" },
      { from: "index.html", to: "products.js", method: "script", description: "Product display" },
      { from: "index.html", to: "cart.js", method: "script", description: "Cart functionality" },
      { from: "cart.js", to: "checkout.js", method: "import", description: "Checkout flow" }
    ]
  },

  "landing-page": {
    type: "Landing Page",
    stacks: ["vanilla-fullstack"],
    requiredFiles: ["index.html", "styles.css"],
    optionalFiles: ["app.js"],
    connections: [
      { from: "index.html", to: "styles.css", method: "link", description: "Page styling" },
      { from: "index.html", to: "app.js", method: "script", description: "Interactivity" }
    ]
  },

  "form-app": {
    type: "Form Application",
    stacks: ["form-heavy-app"],
    requiredFiles: ["index.html", "styles.css", "form.js", "validation.js"],
    optionalFiles: ["submit.js"],
    connections: [
      { from: "index.html", to: "styles.css", method: "link", description: "Form styling" },
      { from: "index.html", to: "form.js", method: "script", description: "Form logic" },
      { from: "form.js", to: "validation.js", method: "import", description: "Validation rules" },
      { from: "form.js", to: "submit.js", method: "import", description: "Submission handling" }
    ]
  }
};

// ========================================
// CODE PATTERNS - Reusable code snippets
// ========================================

export const codePatterns: Record<string, string> = {

  // HTML Patterns
  "html-doctype": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  {{content}}
  <script src="app.js"></script>
</body>
</html>`,

  "html-nav": `<nav class="navbar">
  <div class="nav-brand">{{brand}}</div>
  <ul class="nav-links">
    {{#links}}
    <li><a href="{{href}}">{{text}}</a></li>
    {{/links}}
  </ul>
  <button class="nav-toggle" aria-label="Toggle menu">
    <span></span>
  </button>
</nav>`,

  "html-sidebar": `<aside class="sidebar">
  <div class="sidebar-header">
    <h2>{{title}}</h2>
  </div>
  <nav class="sidebar-nav">
    {{#items}}
    <a href="{{href}}" class="sidebar-item {{active}}">
      <span class="icon">{{icon}}</span>
      <span class="label">{{label}}</span>
    </a>
    {{/items}}
  </nav>
</aside>`,

  "html-card": `<div class="card">
  <div class="card-header">
    <h3>{{title}}</h3>
  </div>
  <div class="card-body">
    {{content}}
  </div>
  <div class="card-footer">
    {{actions}}
  </div>
</div>`,

  "html-form": `<form id="{{formId}}" class="form">
  {{#fields}}
  <div class="form-group">
    <label for="{{id}}">{{label}}</label>
    <input type="{{type}}" id="{{id}}" name="{{name}}" {{required}}>
    <span class="error-message"></span>
  </div>
  {{/fields}}
  <button type="submit" class="btn btn-primary">{{submitText}}</button>
</form>`,

  "html-modal": `<div class="modal" id="{{modalId}}">
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3>{{title}}</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      {{content}}
    </div>
    <div class="modal-footer">
      {{actions}}
    </div>
  </div>
</div>`,

  // CSS Patterns
  "css-reset": `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
}`,

  "css-variables": `:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --secondary: #64748b;
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;
  --background: #f8fafc;
  --surface: #ffffff;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --radius: 8px;
  --transition: 0.2s ease;
}`,

  "css-layout-sidebar": `.app-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 1rem;
}

.main-content {
  padding: 2rem;
  background: var(--background);
}

@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    left: -100%;
    transition: left var(--transition);
  }
  .sidebar.open {
    left: 0;
  }
}`,

  "css-card": `.card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.card-body {
  padding: 1.5rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}`,

  "css-button": `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--secondary);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-outline:hover {
  background: var(--background);
}`,

  // JavaScript Patterns
  "js-dom-ready": `document.addEventListener('DOMContentLoaded', () => {
  // App initialization
  init();
});

function init() {
  {{initCode}}
}`,

  "js-fetch-api": `async function fetchData(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

async function postData(endpoint, data) {
  return fetchData(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function updateData(endpoint, data) {
  return fetchData(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteData(endpoint) {
  return fetchData(endpoint, {
    method: 'DELETE'
  });
}`,

  "js-state-manager": `const State = {
  data: {},
  listeners: new Map(),

  set(key, value) {
    this.data[key] = value;
    this.notify(key);
  },

  get(key) {
    return this.data[key];
  },

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  },

  notify(key) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(cb => cb(this.data[key]));
    }
  }
};`,

  "js-router": `const Router = {
  routes: {},

  add(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path) {
    history.pushState({}, '', path);
    this.handle(path);
  },

  handle(path) {
    const route = this.routes[path] || this.routes['/404'];
    if (route) {
      route();
    }
  },

  init() {
    window.addEventListener('popstate', () => {
      this.handle(window.location.pathname);
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        this.navigate(e.target.getAttribute('href'));
      }
    });

    this.handle(window.location.pathname);
  }
};`,

  "js-form-validation": `function validateForm(form) {
  const errors = {};
  const data = new FormData(form);

  for (const [name, value] of data.entries()) {
    const input = form.querySelector(\`[name="\${name}"]\`);
    const rules = input.dataset.validate?.split('|') || [];

    for (const rule of rules) {
      const error = validateRule(rule, value, name);
      if (error) {
        errors[name] = error;
        break;
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateRule(rule, value, name) {
  const [ruleName, param] = rule.split(':');

  switch (ruleName) {
    case 'required':
      return !value ? \`\${name} is required\` : null;
    case 'email':
      return !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value) ? 'Invalid email' : null;
    case 'min':
      return value.length < parseInt(param) ? \`Minimum \${param} characters\` : null;
    case 'max':
      return value.length > parseInt(param) ? \`Maximum \${param} characters\` : null;
    default:
      return null;
  }
}`,

  "js-local-storage": `const Storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  }
};`,

  "js-event-emitter": `class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}`
};

// ========================================
// WEBAPP GENERATOR HELPERS
// ========================================

export function getStackForAppType(appType: string): WebAppStack | null {
  const blueprint = appBlueprints[appType];
  if (blueprint && blueprint.stacks.length > 0) {
    return techStacks[blueprint.stacks[0]];
  }
  return techStacks["vanilla-fullstack"];
}

export function getRequiredFiles(appType: string): string[] {
  const blueprint = appBlueprints[appType];
  return blueprint?.requiredFiles || ["index.html", "styles.css", "app.js"];
}

export function getCodePattern(patternName: string): string | null {
  return codePatterns[patternName] || null;
}

export function getBlueprintForType(type: string): WebAppBlueprint | null {
  // Try exact match first
  if (appBlueprints[type]) {
    return appBlueprints[type];
  }

  // Try to find by type name
  for (const [key, blueprint] of Object.entries(appBlueprints)) {
    if (blueprint.type.toLowerCase().includes(type.toLowerCase())) {
      return blueprint;
    }
  }

  return null;
}

// Get all available stacks
export function getAllStacks(): string[] {
  return Object.keys(techStacks);
}

// Get stack recommendations for a concept
export function getStackRecommendation(concept: string): string[] {
  const lowerConcept = concept.toLowerCase();

  if (lowerConcept.includes("dashboard") || lowerConcept.includes("admin") || lowerConcept.includes("erp")) {
    return ["interactive-dashboard", "spa-vanilla"];
  }
  if (lowerConcept.includes("shop") || lowerConcept.includes("store") || lowerConcept.includes("ecommerce")) {
    return ["ecommerce-frontend"];
  }
  if (lowerConcept.includes("form") || lowerConcept.includes("survey") || lowerConcept.includes("register")) {
    return ["form-heavy-app"];
  }
  if (lowerConcept.includes("landing") || lowerConcept.includes("marketing")) {
    return ["vanilla-fullstack"];
  }

  return ["vanilla-fullstack", "vanilla-with-api"];
}