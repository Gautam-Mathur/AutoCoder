/**
 * Knowledge Base Module
 * Programming concepts encyclopedia, best practices, anti-patterns, optimization tips
 */

// ============================================
// Programming Concepts
// ============================================

export interface Concept {
  id: string;
  name: string;
  category: 'paradigm' | 'pattern' | 'principle' | 'data-structure' | 'algorithm' | 'architecture' | 'testing' | 'security' | 'performance';
  description: string;
  explanation: string;
  examples: string[];
  relatedConcepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  languages: string[];
}

const CONCEPTS: Record<string, Concept> = {
  // Paradigms
  oop: {
    id: 'oop',
    name: 'Object-Oriented Programming',
    category: 'paradigm',
    description: 'A programming paradigm based on objects containing data and methods.',
    explanation: 'OOP organizes code into reusable "objects" that model real-world things. Each object has properties (data) and methods (actions). The four pillars are: Encapsulation (hiding internal details), Inheritance (sharing code between classes), Polymorphism (same interface, different implementations), and Abstraction (hiding complexity).',
    examples: ['class User { name; login() {} }', 'class AdminUser extends User { delete() {} }'],
    relatedConcepts: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'],
    difficulty: 'intermediate',
    languages: ['javascript', 'typescript', 'python', 'java', 'csharp'],
  },
  functional: {
    id: 'functional',
    name: 'Functional Programming',
    category: 'paradigm',
    description: 'A paradigm that treats computation as evaluation of mathematical functions.',
    explanation: 'FP emphasizes pure functions (no side effects), immutability (no changing data), and declarative code (what to do, not how). Functions are first-class citizens that can be passed around like data. Common techniques include map, filter, reduce, and function composition.',
    examples: ['const double = x => x * 2', 'const result = [1,2,3].map(double).filter(x => x > 2)'],
    relatedConcepts: ['pure-functions', 'immutability', 'higher-order-functions'],
    difficulty: 'intermediate',
    languages: ['javascript', 'typescript', 'python', 'haskell', 'elixir'],
  },
  async: {
    id: 'async',
    name: 'Asynchronous Programming',
    category: 'paradigm',
    description: 'Writing code that can start operations and continue without waiting.',
    explanation: 'Async code handles operations that take time (network requests, file I/O) without blocking. JavaScript uses Promises and async/await. Python uses asyncio. This allows apps to remain responsive while waiting for slow operations.',
    examples: ['async function getData() { const res = await fetch(url); return res.json(); }', 'promise.then(data => console.log(data))'],
    relatedConcepts: ['promises', 'callbacks', 'event-loop'],
    difficulty: 'intermediate',
    languages: ['javascript', 'typescript', 'python', 'csharp'],
  },

  // Principles
  solid: {
    id: 'solid',
    name: 'SOLID Principles',
    category: 'principle',
    description: 'Five design principles for maintainable object-oriented code.',
    explanation: 'S: Single Responsibility - one reason to change. O: Open/Closed - open for extension, closed for modification. L: Liskov Substitution - subtypes must be substitutable. I: Interface Segregation - many specific interfaces. D: Dependency Inversion - depend on abstractions.',
    examples: ['class UserValidator { validate() {} } // Single responsibility', 'interface Readable { read() } // Interface segregation'],
    relatedConcepts: ['oop', 'clean-code', 'design-patterns'],
    difficulty: 'intermediate',
    languages: ['javascript', 'typescript', 'java', 'csharp'],
  },
  dry: {
    id: 'dry',
    name: "DRY (Don't Repeat Yourself)",
    category: 'principle',
    description: 'Every piece of knowledge should have a single, authoritative representation.',
    explanation: 'Avoid duplicating code or logic. If you find yourself copy-pasting, extract it into a reusable function, class, or module. This makes maintenance easier and reduces bugs.',
    examples: ['// Instead of repeating validation, create: function validateEmail(email) { return /regex/.test(email); }'],
    relatedConcepts: ['clean-code', 'refactoring'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  kiss: {
    id: 'kiss',
    name: 'KISS (Keep It Simple, Stupid)',
    category: 'principle',
    description: 'Systems work best when kept simple rather than made complex.',
    explanation: 'Avoid over-engineering. Write the simplest code that solves the problem. Complex solutions are harder to understand, maintain, and debug. Simplicity is a feature.',
    examples: ['// Simple: users.find(u => u.id === id)', '// Over-engineered: UserRepositoryFactoryBuilder.createInstance().getUserById(id)'],
    relatedConcepts: ['clean-code', 'yagni'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  yagni: {
    id: 'yagni',
    name: "YAGNI (You Aren't Gonna Need It)",
    category: 'principle',
    description: "Don't add functionality until it's necessary.",
    explanation: "Resist the urge to build features 'just in case'. Focus on current requirements. Future requirements often differ from predictions. Adding unused code increases complexity without benefit.",
    examples: ['// Bad: Building a plugin system when you have one plugin', '// Good: Add abstraction when second use case appears'],
    relatedConcepts: ['kiss', 'agile'],
    difficulty: 'beginner',
    languages: ['all'],
  },

  // Data Structures
  array: {
    id: 'array',
    name: 'Array',
    category: 'data-structure',
    description: 'An ordered collection of elements accessible by index.',
    explanation: 'Arrays store multiple values in a single variable. Access by index is O(1). Inserting/removing at the end is O(1), but at the beginning or middle is O(n). Good for ordered data with known size.',
    examples: ['const arr = [1, 2, 3]; arr[0]; // 1', 'arr.push(4); arr.pop();'],
    relatedConcepts: ['list', 'stack', 'queue'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  hashmap: {
    id: 'hashmap',
    name: 'Hash Map / Object / Dictionary',
    category: 'data-structure',
    description: 'A collection of key-value pairs with O(1) average lookup.',
    explanation: 'Hash maps store data as key-value pairs. Looking up, inserting, and deleting by key is very fast (O(1) average). Use when you need quick access by a unique key. Called Object in JS, dict in Python, HashMap in Java.',
    examples: ['const map = { name: "John", age: 30 }; map.name; // "John"', 'const users = new Map(); users.set(id, user);'],
    relatedConcepts: ['array', 'set'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  stack: {
    id: 'stack',
    name: 'Stack',
    category: 'data-structure',
    description: 'A LIFO (Last In, First Out) data structure.',
    explanation: 'Like a stack of plates - you can only add or remove from the top. Push adds to top, pop removes from top. Used for undo operations, function call tracking, expression parsing.',
    examples: ['const stack = []; stack.push(1); stack.push(2); stack.pop(); // 2'],
    relatedConcepts: ['queue', 'array'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  queue: {
    id: 'queue',
    name: 'Queue',
    category: 'data-structure',
    description: 'A FIFO (First In, First Out) data structure.',
    explanation: 'Like a line at a store - first person in line is served first. Enqueue adds to back, dequeue removes from front. Used for task scheduling, breadth-first search, message queues.',
    examples: ['const queue = []; queue.push(1); queue.push(2); queue.shift(); // 1'],
    relatedConcepts: ['stack', 'priority-queue'],
    difficulty: 'beginner',
    languages: ['all'],
  },

  // Architecture
  mvc: {
    id: 'mvc',
    name: 'MVC (Model-View-Controller)',
    category: 'architecture',
    description: 'Separates application into Model (data), View (UI), and Controller (logic).',
    explanation: 'Model handles data and business logic. View displays the UI. Controller receives user input and coordinates Model and View. This separation makes code more organized and testable.',
    examples: ['// Model: User class', '// View: UserProfile component', '// Controller: UserController handles requests'],
    relatedConcepts: ['mvvm', 'clean-architecture'],
    difficulty: 'intermediate',
    languages: ['all'],
  },
  rest: {
    id: 'rest',
    name: 'REST API',
    category: 'architecture',
    description: 'An architectural style for designing networked applications.',
    explanation: 'REST uses HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations on resources identified by URLs. Stateless, cacheable, and uniform interface. The standard for web APIs.',
    examples: ['GET /users - list users', 'POST /users - create user', 'PUT /users/1 - update user 1', 'DELETE /users/1 - delete user 1'],
    relatedConcepts: ['api', 'http', 'graphql'],
    difficulty: 'intermediate',
    languages: ['all'],
  },
  microservices: {
    id: 'microservices',
    name: 'Microservices',
    category: 'architecture',
    description: 'An architecture where the application is a collection of loosely coupled services.',
    explanation: 'Instead of one big application (monolith), split into small, independent services that communicate via APIs. Each service can be developed, deployed, and scaled independently. More complex but more flexible.',
    examples: ['User Service', 'Order Service', 'Payment Service', 'Notification Service'],
    relatedConcepts: ['monolith', 'api-gateway', 'docker'],
    difficulty: 'advanced',
    languages: ['all'],
  },

  // Testing
  unit_testing: {
    id: 'unit_testing',
    name: 'Unit Testing',
    category: 'testing',
    description: 'Testing individual units of code in isolation.',
    explanation: 'Unit tests verify that small pieces of code (functions, methods) work correctly. They are fast, focused, and help catch bugs early. Mock dependencies to test in isolation.',
    examples: ['test("add returns sum", () => { expect(add(2, 3)).toBe(5); })'],
    relatedConcepts: ['integration-testing', 'tdd', 'mocking'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  tdd: {
    id: 'tdd',
    name: 'Test-Driven Development',
    category: 'testing',
    description: 'Write tests before writing the code that makes them pass.',
    explanation: 'Red-Green-Refactor cycle: 1) Write a failing test (Red), 2) Write minimum code to pass (Green), 3) Refactor while keeping tests green. Leads to better design and test coverage.',
    examples: ['// 1. Write test: expect(calculator.add(2, 3)).toBe(5)', '// 2. Implement add() to pass', '// 3. Refactor if needed'],
    relatedConcepts: ['unit_testing', 'bdd'],
    difficulty: 'intermediate',
    languages: ['all'],
  },

  // Security
  xss: {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    category: 'security',
    description: 'An attack where malicious scripts are injected into trusted websites.',
    explanation: 'Attackers inject JavaScript into pages that other users view. The script can steal cookies, session tokens, or perform actions as the user. Prevent by escaping user input and using Content Security Policy.',
    examples: ['// Vulnerable: innerHTML = userInput', '// Safe: textContent = userInput or sanitize HTML'],
    relatedConcepts: ['csrf', 'sql-injection', 'input-validation'],
    difficulty: 'intermediate',
    languages: ['javascript', 'html'],
  },
  sql_injection: {
    id: 'sql_injection',
    name: 'SQL Injection',
    category: 'security',
    description: 'An attack that inserts malicious SQL code through user input.',
    explanation: "Attackers insert SQL code into input fields to manipulate database queries. Can read, modify, or delete data. Prevent by using parameterized queries/prepared statements, never concatenating user input into SQL.",
    examples: ["// Vulnerable: query(`SELECT * FROM users WHERE id = ${id}`)", "// Safe: query('SELECT * FROM users WHERE id = $1', [id])"],
    relatedConcepts: ['xss', 'input-validation', 'orm'],
    difficulty: 'intermediate',
    languages: ['sql', 'javascript', 'python', 'java'],
  },

  // Performance
  caching: {
    id: 'caching',
    name: 'Caching',
    category: 'performance',
    description: 'Storing computed results to avoid redundant calculations or requests.',
    explanation: 'Cache expensive operations (database queries, API calls, computations) to serve repeated requests faster. Types: in-memory (Redis, Memcached), browser cache, CDN. Consider cache invalidation strategies.',
    examples: ['const cache = new Map(); if (cache.has(key)) return cache.get(key);', 'Redis, Memcached, localStorage'],
    relatedConcepts: ['memoization', 'cdn', 'lazy-loading'],
    difficulty: 'intermediate',
    languages: ['all'],
  },
  lazy_loading: {
    id: 'lazy_loading',
    name: 'Lazy Loading',
    category: 'performance',
    description: 'Deferring initialization of an object until it is needed.',
    explanation: 'Load resources (images, code, data) only when needed, not upfront. Reduces initial load time and memory usage. Common in React (React.lazy), images (loading="lazy"), and infinite scroll.',
    examples: ['const LazyComponent = React.lazy(() => import("./Component"))', '<img loading="lazy" src="..." />'],
    relatedConcepts: ['code-splitting', 'virtual-scrolling', 'caching'],
    difficulty: 'intermediate',
    languages: ['javascript', 'typescript'],
  },
  memoization: {
    id: 'memoization',
    name: 'Memoization',
    category: 'performance',
    description: 'Caching the results of function calls based on their inputs.',
    explanation: 'If a function is called with the same arguments again, return the cached result instead of recalculating. Useful for expensive pure functions. React useMemo and useCallback are examples.',
    examples: ['const memoize = fn => { const cache = {}; return x => cache[x] ??= fn(x); }', 'const memoized = useMemo(() => compute(a, b), [a, b])'],
    relatedConcepts: ['caching', 'pure-functions', 'react-hooks'],
    difficulty: 'intermediate',
    languages: ['javascript', 'typescript', 'python'],
  },
};

// ============================================
// Best Practices Database
// ============================================

export interface BestPractice {
  id: string;
  title: string;
  category: string;
  description: string;
  do: string[];
  dont: string[];
  languages: string[];
}

const BEST_PRACTICES: BestPractice[] = [
  {
    id: 'naming',
    title: 'Naming Conventions',
    category: 'code-style',
    description: 'Clear, consistent naming makes code self-documenting.',
    do: [
      'Use descriptive names (getUserById, isValidEmail)',
      'Use camelCase for variables/functions in JS/TS',
      'Use PascalCase for classes and React components',
      'Use SCREAMING_SNAKE_CASE for constants',
      'Boolean names should be questions (isActive, hasPermission)',
    ],
    dont: [
      'Use single letters except for loop counters (x, y, z)',
      'Use abbreviations that aren\'t universally known (usr, btn)',
      'Use Hungarian notation (strName, intCount)',
      'Name functions after implementation details',
    ],
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'error-handling',
    title: 'Error Handling',
    category: 'reliability',
    description: 'Proper error handling prevents crashes and improves debugging.',
    do: [
      'Use try-catch for operations that can fail',
      'Provide meaningful error messages',
      'Log errors with context (user, action, timestamp)',
      'Use custom error classes for different error types',
      'Return appropriate HTTP status codes in APIs',
    ],
    dont: [
      'Swallow errors silently (empty catch blocks)',
      'Show raw error messages to users',
      'Use generic error messages ("Something went wrong")',
      'Throw strings instead of Error objects',
    ],
    languages: ['javascript', 'typescript', 'python'],
  },
  {
    id: 'security',
    title: 'Security Best Practices',
    category: 'security',
    description: 'Protect your application and user data.',
    do: [
      'Validate and sanitize all user input',
      'Use parameterized queries for SQL',
      'Hash passwords with bcrypt/argon2',
      'Use HTTPS everywhere',
      'Implement rate limiting',
      'Set secure cookie flags (httpOnly, secure, sameSite)',
    ],
    dont: [
      'Store passwords in plain text',
      'Trust user input without validation',
      'Expose sensitive data in URLs or logs',
      'Use eval() or innerHTML with user data',
      'Store secrets in code or version control',
    ],
    languages: ['all'],
  },
  {
    id: 'react-patterns',
    title: 'React Best Practices',
    category: 'framework',
    description: 'Write maintainable React applications.',
    do: [
      'Keep components small and focused',
      'Use functional components with hooks',
      'Lift state up when shared between components',
      'Memoize expensive calculations with useMemo',
      'Use keys when rendering lists',
      'Colocate state with the components that use it',
    ],
    dont: [
      'Mutate state directly',
      'Use index as key for dynamic lists',
      'Create new functions/objects in render without memoization',
      'Put everything in one giant component',
      'Overuse useEffect',
    ],
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'api-design',
    title: 'API Design',
    category: 'architecture',
    description: 'Design consistent, intuitive APIs.',
    do: [
      'Use nouns for resources (GET /users, not GET /getUsers)',
      'Use proper HTTP methods (GET, POST, PUT, DELETE)',
      'Return consistent response formats',
      'Version your API (/v1/users)',
      'Provide meaningful error responses',
      'Document with OpenAPI/Swagger',
    ],
    dont: [
      'Use verbs in URLs (POST /createUser)',
      'Return different structures for success/error',
      'Ignore HTTP status codes (always 200)',
      'Break backwards compatibility without versioning',
    ],
    languages: ['all'],
  },
  {
    id: 'database',
    title: 'Database Best Practices',
    category: 'data',
    description: 'Efficient and safe database usage.',
    do: [
      'Use indexes on frequently queried columns',
      'Use transactions for related operations',
      'Normalize data appropriately',
      'Use connection pooling',
      'Validate data before inserting',
      'Plan for migrations',
    ],
    dont: [
      'Store sensitive data unencrypted',
      'Use SELECT * in production',
      'Ignore N+1 query problems',
      'Store large files in the database',
      'Trust user input in queries',
    ],
    languages: ['sql'],
  },
];

// ============================================
// API Functions
// ============================================

export function getConcept(id: string): Concept | null {
  return CONCEPTS[id] || null;
}

export function searchConcepts(query: string): Concept[] {
  const lower = query.toLowerCase();
  return Object.values(CONCEPTS).filter(c =>
    c.name.toLowerCase().includes(lower) ||
    c.description.toLowerCase().includes(lower) ||
    c.category.toLowerCase().includes(lower)
  );
}

export function getConceptsByCategory(category: Concept['category']): Concept[] {
  return Object.values(CONCEPTS).filter(c => c.category === category);
}

export function getConceptsByDifficulty(difficulty: Concept['difficulty']): Concept[] {
  return Object.values(CONCEPTS).filter(c => c.difficulty === difficulty);
}

export function getBestPractices(category?: string): BestPractice[] {
  if (category) {
    return BEST_PRACTICES.filter(bp => bp.category === category);
  }
  return BEST_PRACTICES;
}

export function getBestPractice(id: string): BestPractice | null {
  return BEST_PRACTICES.find(bp => bp.id === id) || null;
}

export function getRelatedConcepts(conceptId: string): Concept[] {
  const concept = CONCEPTS[conceptId];
  if (!concept) return [];

  return concept.relatedConcepts
    .map(id => CONCEPTS[id])
    .filter(Boolean);
}

// ============================================
// Learning Path
// ============================================

export interface LearningPath {
  title: string;
  description: string;
  concepts: string[];
  estimatedHours: number;
}

export function getLearningPath(topic: string): LearningPath | null {
  const paths: Record<string, LearningPath> = {
    'web-development': {
      title: 'Web Development Fundamentals',
      description: 'Learn the core concepts of modern web development',
      concepts: ['array', 'hashmap', 'oop', 'functional', 'async', 'rest', 'mvc'],
      estimatedHours: 40,
    },
    'react': {
      title: 'React Mastery',
      description: 'Become proficient in React development',
      concepts: ['functional', 'oop', 'async', 'memoization', 'unit_testing'],
      estimatedHours: 30,
    },
    'backend': {
      title: 'Backend Development',
      description: 'Build robust server-side applications',
      concepts: ['rest', 'async', 'caching', 'sql_injection', 'microservices'],
      estimatedHours: 50,
    },
    'security': {
      title: 'Application Security',
      description: 'Secure your applications against common attacks',
      concepts: ['xss', 'sql_injection'],
      estimatedHours: 20,
    },
  };

  return paths[topic] || null;
}

export function formatConceptAsMarkdown(concept: Concept): string {
  return `## ${concept.name}

**Category**: ${concept.category} | **Difficulty**: ${concept.difficulty}

${concept.description}

### Explanation
${concept.explanation}

### Examples
${concept.examples.map(e => `\`\`\`\n${e}\n\`\`\``).join('\n')}

### Related Concepts
${concept.relatedConcepts.map(r => `- ${r}`).join('\n')}

### Languages
${concept.languages.join(', ')}
`;
}

export function formatBestPracticeAsMarkdown(bp: BestPractice): string {
  return `## ${bp.title}

${bp.description}

### Do ✅
${bp.do.map(d => `- ${d}`).join('\n')}

### Don't ❌
${bp.dont.map(d => `- ${d}`).join('\n')}
`;
}