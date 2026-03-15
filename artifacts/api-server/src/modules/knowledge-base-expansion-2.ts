import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 2
// Advanced React, State Management, Security, Testing
// ============================================

export const EXPANDED_CONCEPTS_2: Record<string, Concept> = {

  // ── React State Management ─────────────────────────────────────────────────

  react_context_pattern: {
    id: 'react-context-pattern',
    name: 'React Context + Reducer Pattern',
    category: 'react',
    description: 'Combine React Context and useReducer for complex state shared across deeply nested components.',
    explanation: 'When state needs to be shared across many components (auth user, theme, cart), lift it to a Context provider with useReducer. This gives you predictable state transitions (like Redux) without external libraries. Create a typed dispatch, action union, and provider. Avoid putting everything in one mega-context — split contexts by concern (AuthContext, ThemeContext, CartContext) to prevent unnecessary re-renders.',
    examples: [
      `type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR' };

interface CartState {
  items: CartItem[];
  total: number;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        const items = state.items.map(i =>
          i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
        );
        return { items, total: calculateTotal(items) };
      }
      const items = [...state.items, { ...action.payload, quantity: 1 }];
      return { items, total: calculateTotal(items) };
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter(i => i.id !== action.payload.id);
      return { items, total: calculateTotal(items) };
    }
    case 'UPDATE_QUANTITY': {
      const items = state.items.map(i =>
        i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i
      ).filter(i => i.quantity > 0);
      return { items, total: calculateTotal(items) };
    }
    case 'CLEAR':
      return { items: [], total: 0 };
  }
}

const CartContext = createContext<{ state: CartState; dispatch: React.Dispatch<CartAction> } | null>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });
  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}

function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}`,
    ],
    relatedConcepts: ['react-custom-hooks', 'state-management', 'react-render-props'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  react_compound_components: {
    id: 'react-compound-components',
    name: 'Compound Components Pattern',
    category: 'react',
    description: 'Components that work together through implicit context, like <Select>, <Select.Option>, <Select.Group>.',
    explanation: 'Compound components share internal state via React Context without exposing it to the consumer. The parent component provides context, and child components consume it. This creates a flexible, declarative API. Examples: headless UI libraries (Radix, Headless UI), form field groups, accordion/tabs.',
    examples: [
      `interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist" className="flex border-b">{children}</div>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab must be used within Tabs');
  const isActive = ctx.activeTab === id;
  return (
    <button role="tab" aria-selected={isActive} onClick={() => ctx.setActiveTab(id)}
      className={\`px-4 py-2 text-sm font-medium border-b-2 \${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}\`}>
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabPanel must be used within Tabs');
  if (ctx.activeTab !== id) return null;
  return <div role="tabpanel">{children}</div>;
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage:
// <Tabs defaultTab="general">
//   <Tabs.List>
//     <Tabs.Tab id="general">General</Tabs.Tab>
//     <Tabs.Tab id="security">Security</Tabs.Tab>
//   </Tabs.List>
//   <Tabs.Panel id="general">General settings...</Tabs.Panel>
//   <Tabs.Panel id="security">Security settings...</Tabs.Panel>
// </Tabs>`,
    ],
    relatedConcepts: ['react-context', 'react-render-props', 'react-custom-hooks'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  react_error_boundaries: {
    id: 'react-error-boundaries',
    name: 'React Error Boundaries',
    category: 'react',
    description: 'Class components that catch JavaScript errors in child components and display fallback UI.',
    explanation: 'Error boundaries catch errors during rendering, in lifecycle methods, and in constructors of the whole tree below them. They do NOT catch errors in event handlers, async code, or SSR. Place them at route boundaries and around major sections. Use react-error-boundary library for a hook-based API with retry support.',
    examples: [
      `import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" role="alert">
      <div className="text-destructive mb-4">
        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">{error.message}</p>
      <button onClick={resetErrorBoundary}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
        Try Again
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <MainContent />
      </ErrorBoundary>
    </ErrorBoundary>
  );
}`,
    ],
    relatedConcepts: ['react-suspense', 'react-portal'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Security Patterns ──────────────────────────────────────────────────────

  csrf_protection: {
    id: 'csrf-protection',
    name: 'CSRF Protection',
    category: 'security',
    description: 'Prevent Cross-Site Request Forgery attacks by validating request origin.',
    explanation: 'CSRF attacks trick users into making requests to your app from another site. Protect with: (1) SameSite cookie attribute (Lax or Strict). (2) Anti-CSRF tokens — server generates a random token, embeds it in forms, and validates on submission. (3) Check Origin/Referer headers. For API-only backends with JWT auth (no cookies), CSRF is not applicable — JWTs are not automatically sent by the browser.',
    examples: [
      `import crypto from 'crypto';

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

// Set token in session on page load:
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  req.session!.csrfToken = token;
  res.json({ csrfToken: token });
});`,
    ],
    relatedConcepts: ['jwt', 'input-validation', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  content_security_policy: {
    id: 'content-security-policy',
    name: 'Content Security Policy (CSP)',
    category: 'security',
    description: 'HTTP header that prevents XSS by controlling which scripts, styles, and resources can load on a page.',
    explanation: 'CSP is a defense-in-depth measure against XSS. It tells the browser which origins are allowed to load scripts, styles, images, fonts, and other resources. Start with a strict policy and relax as needed. Use report-only mode first to identify violations without breaking the site. Key directives: default-src, script-src, style-src, img-src, connect-src, font-src.',
    examples: [
      `import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'strict-dynamic'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs inline styles
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", process.env.API_URL],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));

// Additional security headers
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());`,
    ],
    relatedConcepts: ['csrf-protection', 'input-validation'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  rate_limiting_patterns: {
    id: 'rate-limiting-patterns',
    name: 'Rate Limiting Strategies',
    category: 'security',
    description: 'Protect your API from abuse with sliding window, token bucket, and tiered rate limiting.',
    explanation: 'Rate limiting prevents abuse, DoS attacks, and runaway scripts. Strategies: (1) Fixed window — count requests per time window (simple but allows burst at window boundary). (2) Sliding window — smoother distribution, no burst issue. (3) Token bucket — allows short bursts while maintaining average rate. (4) Tiered — different limits for different endpoints (read > write, auth attempts very low).',
    examples: [
      `import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => req.user?.id?.toString() ?? req.ip!,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
});

const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many submissions, please try again later' },
});

app.use('/api/', apiLimiter);
app.post('/api/auth/login', authLimiter);
app.post('/api/contact', publicFormLimiter);
app.post('/api/leads', publicFormLimiter);`,
    ],
    relatedConcepts: ['middleware-pattern', 'csrf-protection'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  input_sanitization: {
    id: 'input-sanitization',
    name: 'Input Validation & Sanitization',
    category: 'security',
    description: 'Validate all user input with Zod schemas and sanitize HTML to prevent XSS.',
    explanation: 'Never trust user input. Validate structure with Zod (type, length, format). Sanitize HTML content with DOMPurify or sanitize-html to strip malicious scripts. Validate on both client (for UX) and server (for security). Common attack vectors: SQL injection (use parameterized queries), XSS (sanitize HTML), path traversal (validate file paths), ReDoS (avoid complex regex on user input).',
    examples: [
      `import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const createPostSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .transform(s => s.trim()),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content too long')
    .transform(s => sanitizeHtml(s, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height'] },
      allowedSchemes: ['http', 'https'],
    })),
  slug: z.string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens')
    .max(200)
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  categoryId: z.number().int().positive().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

app.post('/api/posts', authenticate, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const post = await createPost({ ...parsed.data, authorId: req.user!.id });
  res.status(201).json(post);
});`,
    ],
    relatedConcepts: ['input-validation', 'csrf-protection'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Database Advanced ──────────────────────────────────────────────────────

  connection_pooling: {
    id: 'connection-pooling',
    name: 'Database Connection Pooling',
    category: 'database',
    description: 'Reuse database connections across requests to avoid the overhead of creating a new connection per query.',
    explanation: 'Opening a database connection takes 20-100ms (TCP handshake, TLS, auth). Connection pooling maintains a pool of pre-established connections that are reused across requests. In Node.js with pg: use Pool (not Client). Set pool.max based on your server instances and database max_connections. Rule of thumb: max_connections / number_of_instances = pool_max. Too many connections exhaust the database; too few create queuing delays.',
    examples: [
      `import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Error if can't connect in 5s
});

pool.on('error', (err) => {
  console.error('Unexpected pool error', err);
});

export const db = drizzle(pool);

// Health check — verify pool is working
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}`,
    ],
    relatedConcepts: ['database-transactions', 'database-indexing', 'graceful-shutdown'],
    difficulty: 'intermediate',
    languages: ['typescript', 'sql'],
  },

  database_transactions_advanced: {
    id: 'database-transactions-advanced',
    name: 'Advanced Transaction Patterns',
    category: 'database',
    description: 'Use database transactions for multi-step operations that must succeed or fail atomically.',
    explanation: 'Transactions ensure ACID properties: all queries succeed together or none do. In Drizzle: use db.transaction(async (tx) => { ... }). If any query throws, the entire transaction rolls back. Use transactions for: creating related records, transferring funds, updating stock on purchase. Never mix transaction and non-transaction queries for the same operation.',
    examples: [
      `export async function processOrder(orderId: number): Promise<Order> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!order) throw new NotFoundError('Order');
    if (order.status !== 'pending') throw new ConflictError('Order already processed');

    for (const item of order.items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .for('update');

      if (!product || product.stock < item.quantity) {
        throw new BadRequestError(\`Insufficient stock for \${product?.name ?? 'unknown product'}\`);
      }

      await tx.update(products)
        .set({ stock: product.stock - item.quantity })
        .where(eq(products.id, item.productId));
    }

    const [updated] = await tx.update(orders)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await tx.insert(orderHistory).values({
      orderId, action: 'confirmed', performedBy: 'system', timestamp: new Date(),
    });

    return updated;
  });
}`,
    ],
    relatedConcepts: ['optimistic-locking', 'database-migrations', 'database-indexing'],
    difficulty: 'advanced',
    languages: ['typescript', 'sql'],
  },

  // ── Testing Advanced ───────────────────────────────────────────────────────

  tdd_pattern: {
    id: 'tdd',
    name: 'Test-Driven Development (TDD)',
    category: 'testing',
    description: 'Write tests before implementation code, following the Red-Green-Refactor cycle.',
    explanation: 'TDD cycle: (1) RED — write a failing test that defines the desired behavior. (2) GREEN — write the minimum code to make the test pass. (3) REFACTOR — clean up the code while keeping tests green. Benefits: forces you to think about the API before implementation, produces code with high test coverage, catches regressions. Apply TDD for business logic and utility functions. For UI components, use it for complex interaction logic.',
    examples: [
      `// 1. RED — Write the test first
describe('calculateDiscount', () => {
  it('applies 10% discount for orders over $100', () => {
    expect(calculateDiscount(15000)).toBe(1500); // $150 → $15 discount
  });

  it('applies no discount for orders under $100', () => {
    expect(calculateDiscount(5000)).toBe(0); // $50 → no discount
  });

  it('applies 20% discount for orders over $500', () => {
    expect(calculateDiscount(60000)).toBe(12000); // $600 → $120 discount
  });

  it('returns 0 for negative amounts', () => {
    expect(calculateDiscount(-1000)).toBe(0);
  });
});

// 2. GREEN — Write minimum code to pass
function calculateDiscount(amountCents: number): number {
  if (amountCents <= 0) return 0;
  if (amountCents >= 50000) return Math.floor(amountCents * 0.20);
  if (amountCents >= 10000) return Math.floor(amountCents * 0.10);
  return 0;
}

// 3. REFACTOR — Clean up (extract constants, improve readability)
const DISCOUNT_TIERS = [
  { minAmount: 50000, rate: 0.20 },
  { minAmount: 10000, rate: 0.10 },
] as const;

function calculateDiscount(amountCents: number): number {
  if (amountCents <= 0) return 0;
  const tier = DISCOUNT_TIERS.find(t => amountCents >= t.minAmount);
  return tier ? Math.floor(amountCents * tier.rate) : 0;
}`,
    ],
    relatedConcepts: ['integration-testing', 'component-testing'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Performance ────────────────────────────────────────────────────────────

  react_memo_patterns: {
    id: 'react-memo',
    name: 'React.memo & useMemo & useCallback',
    category: 'performance',
    description: 'Prevent unnecessary re-renders by memoizing components, computed values, and callback functions.',
    explanation: 'React re-renders a component whenever its parent re-renders, even if its props did not change. React.memo wraps a component to skip re-renders when props are shallowly equal. useMemo caches expensive computations. useCallback caches function references. Rules: (1) Do not prematurely optimize — profile first. (2) Memoize expensive computations and large lists. (3) Use useCallback for functions passed to memoized children. (4) Do NOT wrap every component in memo — it has a comparison cost.',
    examples: [
      `// Memoize a list item to prevent re-renders when other items change
const TaskRow = React.memo(function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: number) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
      <span className={task.done ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
    </div>
  );
});

function TaskList({ tasks }: { tasks: Task[] }) {
  // useCallback ensures onToggle reference is stable between renders
  const onToggle = useCallback((id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  // useMemo for expensive computation
  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.done).length,
    remaining: tasks.filter(t => !t.done).length,
  }), [tasks]);

  return (
    <div className="space-y-2">
      <p>{stats.remaining} of {stats.total} remaining</p>
      {tasks.map(task => <TaskRow key={task.id} task={task} onToggle={onToggle} />)}
    </div>
  );
}`,
    ],
    relatedConcepts: ['virtual-scrolling', 'lazy-loading', 'debounce-throttle'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── State Management ───────────────────────────────────────────────────────

  zustand_state: {
    id: 'zustand',
    name: 'Zustand State Management',
    category: 'react',
    description: 'Lightweight state management with a simple hook-based API, no providers needed.',
    explanation: 'Zustand is a small, fast, React state management library. It uses a single store per concern (no Provider wrapping). Create a store with create(), access it with the returned hook. Supports middleware (persist, devtools, immer). Use Zustand for: client-side state that does not come from the server (UI state, filters, cart, selections). Use React Query for server state.',
    examples: [
      `import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  search: string;
  status: string | null;
  category: string | null;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  setSearch: (search: string) => void;
  setStatus: (status: string | null) => void;
  setCategory: (category: string | null) => void;
  setSort: (sortBy: string, sortDir: 'asc' | 'desc') => void;
  reset: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  status: null,
  category: null,
  sortBy: 'createdAt',
  sortDir: 'desc' as const,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...DEFAULT_FILTERS,
      setSearch: (search) => set({ search }),
      setStatus: (status) => set({ status }),
      setCategory: (category) => set({ category }),
      setSort: (sortBy, sortDir) => set({ sortBy, sortDir }),
      reset: () => set(DEFAULT_FILTERS),
    }),
    { name: 'filter-storage' }
  )
);

// Usage in component:
// const { search, setSearch, status, setStatus } = useFilterStore();`,
    ],
    relatedConcepts: ['react-context-pattern', 'state-management', 'react-custom-hooks'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── API Design ─────────────────────────────────────────────────────────────

  rest_api_design: {
    id: 'rest-api-design',
    name: 'RESTful API Design Principles',
    category: 'architecture',
    description: 'Design consistent, predictable HTTP APIs following REST conventions.',
    explanation: 'REST APIs use HTTP methods (GET, POST, PUT, PATCH, DELETE) on resource URLs. Key principles: (1) Use nouns for URLs (/users, /posts), not verbs (/getUsers). (2) Use HTTP methods correctly: GET for reading, POST for creating, PATCH for partial updates, DELETE for removing. (3) Return proper status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error. (4) Use cursor-based or offset-based pagination. (5) Use consistent error response format.',
    examples: [
      `// Consistent API response format
interface APIResponse<T> {
  data: T;
  meta?: { total: number; page: number; pageSize: number; totalPages: number };
}

interface APIError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

// GET /api/users?page=1&pageSize=20&search=john&role=admin
// Response: { data: User[], meta: { total: 42, page: 1, pageSize: 20, totalPages: 3 } }

// POST /api/users
// Body: { name: "John", email: "john@example.com" }
// Response (201): { data: { id: 1, name: "John", email: "john@example.com", createdAt: "..." } }

// PATCH /api/users/1
// Body: { name: "John Doe" }
// Response (200): { data: { id: 1, name: "John Doe", ... } }

// DELETE /api/users/1
// Response (204): no body

// Error response:
// Response (422): { error: "Validation failed", details: { email: ["Email already exists"] } }
// Response (404): { error: "User not found" }`,
    ],
    relatedConcepts: ['middleware-pattern', 'dependency-injection', 'event-driven'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  cursor_pagination: {
    id: 'cursor-pagination',
    name: 'Cursor-Based Pagination',
    category: 'architecture',
    description: 'Paginate results using a cursor (last item ID) instead of page offsets for consistent performance.',
    explanation: 'Offset pagination (OFFSET 100 LIMIT 20) is simple but slow for large datasets — the database must skip N rows. Cursor pagination uses the last item in the previous page as the starting point: WHERE id > $cursor ORDER BY id LIMIT 20. Benefits: (1) Consistent O(1) performance regardless of page number. (2) No skipped or duplicate items when data changes. (3) Works with real-time feeds. Downside: no "jump to page 5" — only next/previous.',
    examples: [
      `interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export async function listWithCursor<T>(
  table: any,
  params: CursorPaginationParams,
  additionalConditions?: SQL[]
): Promise<CursorPaginatedResult<T>> {
  const limit = Math.min(params.limit ?? 20, 100);
  const conditions: SQL[] = additionalConditions ? [...additionalConditions] : [];

  if (params.cursor) {
    const decodedCursor = Buffer.from(params.cursor, 'base64url').toString();
    const [cursorId] = decodedCursor.split('|');
    conditions.push(
      params.direction === 'backward'
        ? gt(table.id, Number(cursorId))
        : lt(table.id, Number(cursorId))
    );
  }

  const rows = await db.select().from(table)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(table.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  const encode = (id: number) => Buffer.from(\`\${id}|v1\`).toString('base64url');

  return {
    data: data as T[],
    nextCursor: hasMore && data.length > 0 ? encode(data[data.length - 1].id) : null,
    prevCursor: params.cursor && data.length > 0 ? encode(data[0].id) : null,
    hasMore,
  };
}

// Route handler:
app.get('/api/posts', async (req, res) => {
  const result = await listWithCursor(posts, {
    cursor: req.query.cursor as string,
    limit: Number(req.query.limit) || 20,
  });
  res.json(result);
});`,
    ],
    relatedConcepts: ['rest-api-design', 'database-indexing', 'virtual-scrolling'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── WebSocket / Real-Time ──────────────────────────────────────────────────

  websocket_patterns: {
    id: 'websocket-patterns',
    name: 'WebSocket Communication Patterns',
    category: 'architecture',
    description: 'Real-time bidirectional communication between client and server for chat, notifications, and live updates.',
    explanation: 'WebSockets provide a persistent, full-duplex connection between client and server. Use for: real-time chat, live notifications, collaborative editing, live dashboards. In Express: use the ws library or Socket.IO. Authenticate via the initial HTTP upgrade request (verify JWT). Handle reconnection on the client with exponential backoff. Send structured JSON messages with a type field for routing.',
    examples: [
      `// Server setup with ws
import { WebSocketServer, WebSocket } from 'ws';
import { verifyJWT } from './auth';

interface WSMessage {
  type: string;
  payload: unknown;
}

const wss = new WebSocketServer({ noServer: true });

const clients = new Map<number, Set<WebSocket>>(); // userId → connections

server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url!, \`http://\${req.headers.host}\`);
    const token = url.searchParams.get('token');
    if (!token) { socket.destroy(); return; }
    const user = await verifyJWT(token);
    if (!user) { socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      (ws as any).userId = user.id;
      wss.emit('connection', ws, req);
    });
  } catch {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket & { userId: number }) => {
  const userId = ws.userId;
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(ws);

  ws.on('message', (data: string) => {
    try {
      const msg: WSMessage = JSON.parse(data);
      handleWSMessage(ws, msg);
    } catch { /* invalid JSON */ }
  });

  ws.on('close', () => {
    clients.get(userId)?.delete(ws);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  });
});

function sendToUser(userId: number, message: WSMessage) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const data = JSON.stringify(message);
  for (const ws of userClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}`,
      `// Client-side WebSocket hook
function useWebSocket(url: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: unknown) => void>>>(new Map());

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => { setStatus('connected'); retryCount = 0; };
      ws.onclose = () => {
        setStatus('disconnected');
        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * 2 ** retryCount, 30000);
          retryCount++;
          setTimeout(connect, delay);
        }
      };
      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          listenersRef.current.get(type)?.forEach(fn => fn(payload));
        } catch { /* ignore */ }
      };
    }

    connect();
    return () => { wsRef.current?.close(); };
  }, [url]);

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const on = useCallback((type: string, handler: (payload: unknown) => void) => {
    if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set());
    listenersRef.current.get(type)!.add(handler);
    return () => { listenersRef.current.get(type)?.delete(handler); };
  }, []);

  return { status, send, on };
}`,
    ],
    relatedConcepts: ['event-driven', 'middleware-pattern'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  // ── File Upload ────────────────────────────────────────────────────────────

  file_upload_pattern: {
    id: 'file-upload',
    name: 'File Upload Pattern',
    category: 'architecture',
    description: 'Handle file uploads with validation, size limits, and cloud storage integration.',
    explanation: 'File uploads require: (1) Multer middleware to parse multipart form data. (2) File type validation (check MIME type AND magic bytes, not just extension). (3) Size limits (default 5MB, configurable). (4) Unique filenames to prevent collisions (UUID + original extension). (5) Storage — use cloud storage (S3, GCS) for production, local disk for development. (6) Return the file URL, not the file content. Clean up failed uploads.',
    examples: [
      `import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = \`\${crypto.randomUUID()}\${ext}\`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF'));
      return;
    }
    cb(null, true);
  },
});

app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = \`/uploads/\${req.file.filename}\`;
  res.status(201).json({ url: fileUrl, filename: req.file.originalname, size: req.file.size });
});

app.post('/api/upload/multiple', authenticate, upload.array('files', 10), (req, res) => {
  const files = (req.files as Express.Multer.File[]).map(f => ({
    url: \`/uploads/\${f.filename}\`,
    filename: f.originalname,
    size: f.size,
  }));
  res.status(201).json({ files });
});`,
    ],
    relatedConcepts: ['middleware-pattern', 'input-validation'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Email Integration ──────────────────────────────────────────────────────

  email_service_pattern: {
    id: 'email-service',
    name: 'Email Service Pattern',
    category: 'architecture',
    description: 'Structured email sending with templates, queue-based delivery, and error handling.',
    explanation: 'Email sending should be: (1) Abstracted behind a service interface (swap SendGrid for Resend without changing code). (2) Template-based (not raw HTML strings in code). (3) Async/queued (do not block the request while sending). (4) Retry-capable (emails can fail transiently). (5) Logged for debugging. Use a provider like Resend, SendGrid, or Postmark. In development, use Mailtrap or console logging.',
    examples: [
      `interface EmailService {
  send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
  }): Promise<void>;
}

class ResendEmailService implements EmailService {
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send({ to, subject, html, from, replyTo }: Parameters<EmailService['send']>[0]) {
    await this.client.emails.send({
      from: from ?? 'notifications@yourdomain.com',
      to,
      subject,
      html,
      replyTo,
    });
  }
}

class ConsoleEmailService implements EmailService {
  async send({ to, subject, html }: Parameters<EmailService['send']>[0]) {
    console.log(\`[EMAIL] To: \${to} | Subject: \${subject}\`);
    console.log(html.substring(0, 200) + '...');
  }
}

const emailService: EmailService = process.env.RESEND_API_KEY
  ? new ResendEmailService(process.env.RESEND_API_KEY)
  : new ConsoleEmailService();

// Email templates
function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: \`Welcome to Our Platform, \${name}!\`,
    html: \`
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome, \${name}!</h1>
        <p>Thanks for signing up. We're excited to have you on board.</p>
        <a href="\${process.env.APP_URL}/dashboard"
          style="display: inline-block; background: #0066ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Go to Dashboard
        </a>
      </div>
    \`,
  };
}

// Usage:
await emailService.send({ to: user.email, ...welcomeEmail(user.name) });`,
    ],
    relatedConcepts: ['dependency-injection', 'event-driven', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 2
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_2: Record<string, EntityArchetype> = {

  // ── E-Commerce Domain ──────────────────────────────────────────────────────

  product: {
    id: 'product',
    name: 'Product',
    aliases: ['item', 'merchandise', 'goods', 'sku', 'product listing'],
    domain: 'ecommerce',
    description: 'A product for sale with pricing, variants, images, and inventory tracking.',
    traits: ['pageable', 'searchable', 'taggable', 'soft-deletable', 'versioned'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(300) not null', nullable: false, description: 'Product name' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Full description' },
      { name: 'shortDescription', type: 'varchar(500)', nullable: true, description: 'Brief description for listing' },
      { name: 'sku', type: 'varchar(100)', nullable: true, description: 'Stock keeping unit' },
      { name: 'price', type: 'integer not null', nullable: false, description: 'Price in cents' },
      { name: 'compareAtPrice', type: 'integer', nullable: true, description: 'Original price before discount' },
      { name: 'cost', type: 'integer', nullable: true, description: 'Cost price for margin calculation' },
      { name: 'categoryId', type: 'integer references categories(id)', nullable: true, description: 'Product category' },
      { name: 'images', type: 'jsonb', nullable: true, description: 'Array of { url, alt, sortOrder }' },
      { name: 'stock', type: 'integer not null default 0', nullable: false, description: 'Available stock' },
      { name: 'lowStockThreshold', type: 'integer not null default 5', nullable: false, description: 'Low stock alert level' },
      { name: 'weight', type: 'numeric(8,2)', nullable: true, description: 'Weight in grams' },
      { name: 'dimensions', type: 'jsonb', nullable: true, description: '{ length, width, height } in cm' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Product tags' },
      { name: 'isFeatured', type: 'boolean not null default false', nullable: false, description: 'Featured on homepage' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|active|archived' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publication date' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['category', 'product_variant', 'order_item', 'review', 'cart_item'],
    suggestedIndexes: ['slug (unique)', 'sku', 'categoryId', 'status', 'isFeatured', 'price', '(status, price)', '(categoryId, status)', 'tags (GIN)', 'Full-text on (name, description)'],
    typicalEndpoints: [
      'GET /products?status=active&category=electronics&minPrice=1000&maxPrice=5000&sort=price&page=1',
      'GET /products/:slug',
      'POST /products',
      'PATCH /products/:id',
      'PATCH /products/:id/stock',
      'DELETE /products/:id',
    ],
  },

  order: {
    id: 'order',
    name: 'Order',
    aliases: ['purchase', 'transaction', 'sale', 'checkout'],
    domain: 'ecommerce',
    description: 'A customer order with line items, shipping, and payment tracking.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'orderNumber', type: 'varchar(50) not null unique', nullable: false, description: 'Human-readable order number' },
      { name: 'customerId', type: 'integer not null references users(id)', nullable: false, description: 'Customer' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|confirmed|processing|shipped|delivered|cancelled|refunded' },
      { name: 'subtotal', type: 'integer not null', nullable: false, description: 'Subtotal in cents' },
      { name: 'tax', type: 'integer not null default 0', nullable: false, description: 'Tax in cents' },
      { name: 'shipping', type: 'integer not null default 0', nullable: false, description: 'Shipping cost in cents' },
      { name: 'discount', type: 'integer not null default 0', nullable: false, description: 'Discount amount in cents' },
      { name: 'total', type: 'integer not null', nullable: false, description: 'Total in cents' },
      { name: 'currency', type: "varchar(3) not null default 'USD'", nullable: false, description: 'Currency code' },
      { name: 'shippingAddress', type: 'jsonb', nullable: true, description: '{ name, line1, line2, city, state, zip, country }' },
      { name: 'billingAddress', type: 'jsonb', nullable: true, description: 'Billing address' },
      { name: 'paymentMethod', type: 'varchar(50)', nullable: true, description: 'card|paypal|bank_transfer' },
      { name: 'paymentIntentId', type: 'varchar(200)', nullable: true, description: 'Stripe payment intent ID' },
      { name: 'paidAt', type: 'timestamptz', nullable: true, description: 'Payment confirmation time' },
      { name: 'shippedAt', type: 'timestamptz', nullable: true, description: 'Shipping date' },
      { name: 'deliveredAt', type: 'timestamptz', nullable: true, description: 'Delivery date' },
      { name: 'trackingNumber', type: 'varchar(100)', nullable: true, description: 'Shipping tracking number' },
      { name: 'notes', type: 'text', nullable: true, description: 'Customer notes' },
      { name: 'internalNotes', type: 'text', nullable: true, description: 'Internal notes' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Order placed' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'order_item', 'product', 'payment', 'shipment'],
    suggestedIndexes: ['orderNumber (unique)', 'customerId', 'status', 'paymentIntentId', '(customerId, status)', '(status, createdAt DESC)', 'createdAt DESC'],
    defaultWorkflow: {
      states: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      transitions: [
        { from: 'pending', to: 'confirmed', action: 'confirm_payment' },
        { from: 'confirmed', to: 'processing', action: 'start_processing' },
        { from: 'processing', to: 'shipped', action: 'ship' },
        { from: 'shipped', to: 'delivered', action: 'confirm_delivery' },
        { from: 'pending', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'cancelled', action: 'cancel' },
        { from: 'delivered', to: 'refunded', action: 'refund' },
      ],
    },
    typicalEndpoints: [
      'GET /orders?status=processing&page=1',
      'GET /orders/:id',
      'POST /orders',
      'PATCH /orders/:id/status',
      'GET /orders/me',
    ],
  },

  review: {
    id: 'review',
    name: 'Review / Rating',
    aliases: ['feedback', 'rating', 'testimonial', 'evaluation'],
    domain: 'ecommerce',
    description: 'A customer review with star rating for a product or service.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'productId', type: 'integer not null references products(id)', nullable: false, description: 'Reviewed product' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Reviewer' },
      { name: 'rating', type: 'integer not null', nullable: false, description: 'Star rating 1-5' },
      { name: 'title', type: 'varchar(200)', nullable: true, description: 'Review title' },
      { name: 'content', type: 'text', nullable: true, description: 'Review text' },
      { name: 'images', type: 'jsonb', nullable: true, description: 'Review images' },
      { name: 'helpfulCount', type: 'integer not null default 0', nullable: false, description: 'Helpful votes' },
      { name: 'isVerifiedPurchase', type: 'boolean not null default false', nullable: false, description: 'Verified purchase badge' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|approved|rejected' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Review time' },
    ],
    relatedEntities: ['product', 'user'],
    suggestedIndexes: ['productId', 'userId', 'status', 'rating', '(productId, status, rating)', '(productId, userId) unique'],
    typicalEndpoints: [
      'GET /products/:productId/reviews?sort=newest&page=1',
      'POST /products/:productId/reviews',
      'PATCH /reviews/:id',
      'POST /reviews/:id/helpful',
      'DELETE /reviews/:id',
    ],
  },

  // ── Fitness / Health Domain ────────────────────────────────────────────────

  workout: {
    id: 'workout',
    name: 'Workout / Exercise Session',
    aliases: ['training session', 'exercise', 'gym session', 'fitness activity'],
    domain: 'fitness',
    description: 'A logged workout session with exercises, sets, and performance metrics.',
    traits: ['pageable', 'searchable', 'taggable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'User' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Workout name' },
      { name: 'type', type: "varchar(50) not null default 'strength'", nullable: false, description: 'strength|cardio|flexibility|hiit|yoga|other' },
      { name: 'startTime', type: 'timestamptz not null', nullable: false, description: 'Start time' },
      { name: 'endTime', type: 'timestamptz', nullable: true, description: 'End time' },
      { name: 'duration', type: 'integer', nullable: true, description: 'Duration in minutes' },
      { name: 'caloriesBurned', type: 'integer', nullable: true, description: 'Estimated calories' },
      { name: 'notes', type: 'text', nullable: true, description: 'Workout notes' },
      { name: 'rating', type: 'integer', nullable: true, description: 'Self-rated difficulty 1-5' },
      { name: 'mood', type: 'varchar(20)', nullable: true, description: 'Post-workout mood' },
      { name: 'templateId', type: 'integer references workout_templates(id)', nullable: true, description: 'Based on template' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['exercise_log', 'workout_template', 'user'],
    suggestedIndexes: ['userId', 'type', 'startTime', '(userId, startTime DESC)', '(userId, type)'],
    typicalEndpoints: [
      'GET /workouts?type=strength&dateFrom=2024-01-01&dateTo=2024-01-31',
      'GET /workouts/:id',
      'POST /workouts',
      'PATCH /workouts/:id',
      'DELETE /workouts/:id',
      'GET /workouts/stats?period=week',
    ],
  },

  // ── CRM Domain ─────────────────────────────────────────────────────────────

  contact: {
    id: 'contact-crm',
    name: 'CRM Contact',
    aliases: ['customer', 'prospect', 'account', 'client'],
    domain: 'crm',
    description: 'A customer or prospect in a CRM system with contact info and deal history.',
    traits: ['pageable', 'auditable', 'searchable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'firstName', type: 'varchar(100) not null', nullable: false, description: 'First name' },
      { name: 'lastName', type: 'varchar(100) not null', nullable: false, description: 'Last name' },
      { name: 'email', type: 'varchar(254) not null', nullable: false, description: 'Primary email' },
      { name: 'phone', type: 'varchar(30)', nullable: true, description: 'Phone number' },
      { name: 'company', type: 'varchar(200)', nullable: true, description: 'Company name' },
      { name: 'jobTitle', type: 'varchar(200)', nullable: true, description: 'Job title' },
      { name: 'source', type: 'varchar(50)', nullable: true, description: 'Lead source (website, referral, linkedin)' },
      { name: 'status', type: "varchar(30) not null default 'lead'", nullable: false, description: 'lead|qualified|customer|churned' },
      { name: 'ownerId', type: 'integer references users(id)', nullable: true, description: 'Assigned sales rep' },
      { name: 'dealValue', type: 'integer', nullable: true, description: 'Estimated deal value in cents' },
      { name: 'lastContactedAt', type: 'timestamptz', nullable: true, description: 'Last interaction' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Contact tags' },
      { name: 'notes', type: 'text', nullable: true, description: 'Internal notes' },
      { name: 'customFields', type: 'jsonb', nullable: true, description: 'Custom field values' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['deal', 'activity', 'user', 'note'],
    suggestedIndexes: ['email', 'status', 'ownerId', 'company', 'source', '(status, ownerId)', 'tags (GIN)', 'Full-text on (firstName, lastName, email, company)'],
    typicalEndpoints: [
      'GET /contacts?status=lead&owner=me&search=john&page=1',
      'GET /contacts/:id',
      'POST /contacts',
      'PATCH /contacts/:id',
      'DELETE /contacts/:id',
      'POST /contacts/import (CSV)',
      'GET /contacts/export?format=csv',
    ],
  },

  // ── Inventory Domain ───────────────────────────────────────────────────────

  inventory_item: {
    id: 'inventory-item',
    name: 'Inventory Item',
    aliases: ['stock item', 'warehouse item', 'inventory record', 'asset'],
    domain: 'inventory',
    description: 'A tracked item in an inventory management system with location and quantity.',
    traits: ['pageable', 'auditable', 'searchable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'sku', type: 'varchar(100) not null unique', nullable: false, description: 'Stock keeping unit' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Item name' },
      { name: 'description', type: 'text', nullable: true, description: 'Description' },
      { name: 'categoryId', type: 'integer', nullable: true, description: 'Category' },
      { name: 'quantity', type: 'integer not null default 0', nullable: false, description: 'Current quantity' },
      { name: 'reorderPoint', type: 'integer not null default 10', nullable: false, description: 'Reorder when below' },
      { name: 'reorderQuantity', type: 'integer not null default 50', nullable: false, description: 'How many to reorder' },
      { name: 'unitCost', type: 'integer', nullable: true, description: 'Cost per unit in cents' },
      { name: 'unitPrice', type: 'integer', nullable: true, description: 'Sell price per unit' },
      { name: 'location', type: 'varchar(100)', nullable: true, description: 'Warehouse location/bin' },
      { name: 'supplierId', type: 'integer', nullable: true, description: 'Primary supplier' },
      { name: 'barcode', type: 'varchar(100)', nullable: true, description: 'Barcode/UPC' },
      { name: 'weight', type: 'numeric(8,2)', nullable: true, description: 'Weight in grams' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|discontinued|out-of-stock' },
      { name: 'lastRestockedAt', type: 'timestamptz', nullable: true, description: 'Last restock date' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Item tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['supplier', 'stock_movement', 'purchase_order', 'category'],
    suggestedIndexes: ['sku (unique)', 'barcode', 'status', 'categoryId', 'supplierId', 'location', '(status, quantity)', 'tags (GIN)', 'Full-text on (name, sku, description)'],
    typicalEndpoints: [
      'GET /inventory?status=active&belowReorderPoint=true&search=widget&page=1',
      'GET /inventory/:id',
      'POST /inventory',
      'PATCH /inventory/:id',
      'POST /inventory/:id/adjust (quantity adjustment)',
      'GET /inventory/low-stock',
      'GET /inventory/export?format=csv',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 2
// ============================================

export const EXPANDED_DOMAIN_MODELS_2: Record<string, DomainModel> = {

  'ecommerce': {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Online store with product catalog, cart, checkout, orders, and payment processing.',
    coreEntities: ['product', 'category', 'order', 'order_item', 'cart', 'user'],
    optionalEntities: ['product_variant', 'review', 'wishlist', 'coupon', 'shipment', 'payment', 'notification'],
    keyRelationships: [
      'product belongs to category (categoryId FK)',
      'product has many variants (productId FK)',
      'order belongs to customer (customerId FK)',
      'order has many order_items (orderId FK)',
      'order_item references product (productId FK)',
      'cart belongs to user or session (userId FK, nullable for guest)',
      'cart has many cart_items (cartId FK)',
      'review belongs to product and user (unique pair)',
    ],
    typicalFeatures: [
      'Product catalog with search, filter by category/price/rating',
      'Product detail page with images, variants, and reviews',
      'Shopping cart with quantity adjustment and guest support',
      'Multi-step checkout: shipping → payment → review → confirm',
      'Payment processing (Stripe, PayPal)',
      'Order confirmation email',
      'Order tracking and history',
      'Admin: product management, order processing, inventory',
      'Discount codes / coupons',
      'Product reviews and ratings',
      'Wishlist / favorites',
      'Related products recommendation',
    ],
    securityConsiderations: [
      'NEVER trust client-side prices — always recalculate server-side at checkout',
      'Validate stock availability in a transaction before confirming order',
      'Use Stripe Checkout or Payment Intents — never handle raw card data',
      'Rate limit checkout endpoint to prevent abuse',
      'Protect against price manipulation attacks',
      'PCI compliance — never store card numbers or CVVs',
    ],
    suggestedIndexStrategy: [
      'products: slug (unique) for product pages',
      'products: (status, categoryId) for category pages',
      'products: (status, price) for price filtering',
      'products: Full-text on (name, description) for search',
      'orders: (customerId, createdAt DESC) for order history',
      'orders: (status) for admin order management',
      'order_items: (orderId) for order details',
      'reviews: (productId, status) for product reviews',
      'cart_items: (cartId, productId) unique for deduplication',
    ],
  },

  'fitness-tracker': {
    id: 'fitness-tracker',
    name: 'Fitness / Health Tracker',
    description: 'Personal fitness tracker with workouts, exercises, goals, and progress analytics.',
    coreEntities: ['workout', 'exercise_log', 'exercise', 'user'],
    optionalEntities: ['workout_template', 'goal', 'body_measurement', 'nutrition_log', 'achievement'],
    keyRelationships: [
      'workout belongs to user (userId FK)',
      'exercise_log belongs to workout (workoutId FK)',
      'exercise_log references exercise (exerciseId FK)',
      'workout optionally based on template (templateId FK)',
      'goal belongs to user',
      'body_measurement belongs to user',
    ],
    typicalFeatures: [
      'Workout logging with exercises, sets, reps, and weight',
      'Workout templates for quick start',
      'Exercise library with categories (push, pull, legs, cardio)',
      'Progress charts (weight lifted, volume over time)',
      'Personal records tracking',
      'Goal setting and progress tracking',
      'Body measurement logging',
      'Workout calendar / history',
      'Rest timer between sets',
      'Weekly summary with stats',
      'Achievement badges for milestones',
    ],
    securityConsiderations: [
      'Health data is sensitive — encrypt at rest',
      'All queries scoped to authenticated user',
      'No sharing of health data without explicit consent',
    ],
    suggestedIndexStrategy: [
      'workouts: (userId, startTime DESC) for history',
      'workouts: (userId, type) for filtered views',
      'exercise_logs: (workoutId, sortOrder) for workout detail',
      'goals: (userId, status) for active goals',
      'body_measurements: (userId, measuredAt DESC) for progress',
    ],
  },

  'crm': {
    id: 'crm',
    name: 'CRM / Sales Pipeline',
    description: 'Customer relationship management with contacts, deals, activities, and sales pipeline.',
    coreEntities: ['contact', 'deal', 'activity', 'user', 'pipeline_stage'],
    optionalEntities: ['company', 'note', 'email_log', 'task', 'custom_field', 'import_job'],
    keyRelationships: [
      'contact can belong to company (companyId FK)',
      'contact is assigned to sales rep (ownerId FK)',
      'deal belongs to contact (contactId FK)',
      'deal is in a pipeline stage (stageId FK)',
      'activity belongs to contact and user (polymorphic: call, email, meeting, note)',
      'task belongs to deal or contact (polymorphic)',
    ],
    typicalFeatures: [
      'Contact management with search and filtering',
      'Deal pipeline (Kanban board with drag-and-drop)',
      'Activity timeline per contact (calls, emails, meetings)',
      'Task assignment and reminders',
      'Company profiles with associated contacts',
      'Sales forecasting and reports',
      'Email integration (log sent/received emails)',
      'CSV import/export for contacts',
      'Custom fields per entity',
      'Lead scoring based on activity',
      'Dashboard with KPIs (deals won, pipeline value, conversion rate)',
    ],
    securityConsiderations: [
      'Role-based access: reps see their contacts, managers see team, admins see all',
      'Audit log all contact and deal changes',
      'PII handling — name, email, phone are personal data (GDPR)',
      'Encrypt sensitive notes at rest',
    ],
    suggestedIndexStrategy: [
      'contacts: (ownerId, status) for "my contacts"',
      'contacts: Full-text on (firstName, lastName, email, company)',
      'deals: (stageId) for pipeline view',
      'deals: (ownerId, status) for sales rep dashboard',
      'activities: (contactId, createdAt DESC) for timeline',
      'tasks: (assigneeId, dueDate, status) for task list',
    ],
  },

  'inventory': {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Track stock levels, movements, suppliers, and purchase orders.',
    coreEntities: ['inventory_item', 'stock_movement', 'supplier', 'purchase_order', 'category'],
    optionalEntities: ['warehouse', 'bin_location', 'stock_count', 'alert'],
    keyRelationships: [
      'inventory_item has many stock_movements (itemId FK)',
      'stock_movement records quantity changes (in/out/adjustment)',
      'purchase_order belongs to supplier',
      'purchase_order has many order lines referencing inventory_items',
    ],
    typicalFeatures: [
      'Item catalog with SKU, barcode, and images',
      'Real-time stock level tracking',
      'Low stock alerts and reorder notifications',
      'Stock movement history (received, sold, adjusted, transferred)',
      'Purchase order management',
      'Supplier directory',
      'Barcode scanning for receiving and picking',
      'Stock count / audit functionality',
      'Multi-location / warehouse support',
      'Reports: stock valuation, turnover, reorder forecast',
      'CSV import/export',
    ],
    securityConsiderations: [
      'Audit trail for all stock adjustments (who, when, reason)',
      'Role-based access: warehouse staff can adjust stock, managers can create POs',
      'Prevent negative stock with database constraints',
    ],
    suggestedIndexStrategy: [
      'inventory_items: sku (unique) for lookup',
      'inventory_items: (status, quantity) for low stock alerts',
      'stock_movements: (itemId, createdAt DESC) for movement history',
      'purchase_orders: (status, supplierId) for PO management',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 2
// ============================================

export const EXPANDED_CODE_SNIPPETS_2: CodeSnippet[] = [

  // ── E-Commerce Snippets ────────────────────────────────────────────────────

  {
    id: 'ecommerce-product-card',
    title: 'E-Commerce Product Card',
    description: 'Product card with image, price, rating, and add-to-cart button.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['ecommerce', 'product', 'card', 'component'],
    code: `interface ProductCardProps {
  name: string;
  slug: string;
  imageUrl?: string;
  price: number; // cents
  compareAtPrice?: number; // cents
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  onAddToCart?: () => void;
}

function ProductCard({ name, slug, imageUrl, price, compareAtPrice, rating, reviewCount, inStock, onAddToCart }: ProductCardProps) {
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  return (
    <div className="group bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <a href={\`/products/\${slug}\`} className="block">
        <div className="aspect-square overflow-hidden bg-muted relative">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
          )}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              -{discount}%
            </span>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-black text-sm px-3 py-1 rounded font-medium">Out of Stock</span>
            </div>
          )}
        </div>
      </a>
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm line-clamp-2">
          <a href={\`/products/\${slug}\`} className="hover:text-primary transition-colors">{name}</a>
        </h3>
        {rating !== undefined && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className={\`w-3.5 h-3.5 \${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}\`}
                  fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {reviewCount !== undefined && <span className="text-xs text-muted-foreground">({reviewCount})</span>}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold">\${(price / 100).toFixed(2)}</span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-sm text-muted-foreground line-through">\${(compareAtPrice / 100).toFixed(2)}</span>
          )}
        </div>
        <button onClick={onAddToCart} disabled={!inStock}
          className="w-full bg-primary text-primary-foreground text-sm py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}`,
  },

  {
    id: 'ecommerce-cart-sidebar',
    title: 'Shopping Cart Sidebar Component',
    description: 'Slide-out cart sidebar with item list, quantity controls, subtotal, and checkout button.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['ecommerce', 'cart', 'sidebar', 'component'],
    code: `interface CartItem {
  id: number;
  productId: number;
  name: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

function CartSidebar({ items, isOpen, onClose, onUpdateQuantity, onRemove, onCheckout }: {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Cart ({items.reduce((s, i) => s + i.quantity, 0)})</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close cart">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <svg className="w-16 h-16 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <p className="text-muted-foreground">Your cart is empty</p>
            <button onClick={onClose} className="mt-4 text-sm text-primary hover:underline">Continue Shopping</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">\${(item.price / 100).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center border rounded text-sm disabled:opacity-50">
                        -
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        className="w-7 h-7 flex items-center justify-center border rounded text-sm disabled:opacity-50">
                        +
                      </button>
                      <button onClick={() => onRemove(item.id)} className="ml-auto text-xs text-red-500 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">\${(subtotal / 100).toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
              <button onClick={onCheckout}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}`,
  },

  {
    id: 'ecommerce-checkout-flow',
    title: 'Multi-Step Checkout Flow',
    description: 'Three-step checkout: shipping address → payment → order review with validation.',
    tech: ['react', 'typescript', 'tailwind', 'zod'],
    tags: ['ecommerce', 'checkout', 'form', 'multi-step'],
    code: `import { z } from 'zod';

const addressSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  zip: z.string().min(4, 'Invalid zip code'),
  country: z.string().min(2, 'Required').default('US'),
});

type CheckoutStep = 'shipping' | 'payment' | 'review';

function Checkout({ cartItems, subtotal }: { cartItems: CartItem[]; subtotal: number }) {
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [address, setAddress] = useState<z.infer<typeof addressSchema> | null>(null);
  const [processing, setProcessing] = useState(false);

  const tax = Math.round(subtotal * 0.08);
  const shipping = subtotal >= 5000 ? 0 : 999;
  const total = subtotal + tax + shipping;

  const handleAddressSubmit = (data: z.infer<typeof addressSchema>) => {
    setAddress(data);
    setStep('payment');
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
          shippingAddress: address,
        }),
      });
      if (!res.ok) throw new Error('Order failed');
      const order = await res.json();
      window.location.href = \`/orders/\${order.id}/confirmation\`;
    } catch {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {(['shipping', 'payment', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium \${
              step === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            }\`}>{i + 1}</span>
            <span className={\`text-sm capitalize \${step === s ? 'font-medium' : 'text-muted-foreground'}\`}>{s}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === 'shipping' && (
        <AddressForm onSubmit={handleAddressSubmit} defaultValues={address ?? undefined} />
      )}

      {step === 'payment' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Payment</h2>
          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              In production, this would integrate with Stripe Elements or PayPal.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('shipping')} className="border px-4 py-2 rounded-lg">Back</button>
            <button onClick={() => setStep('review')} className="bg-primary text-white px-6 py-2 rounded-lg">Continue</button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Review Order</h2>
          <div className="border rounded-lg divide-y">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="w-12 h-12 rounded object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-medium">\${((item.price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>\${(subtotal / 100).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Shipping</span><span>{shipping === 0 ? 'Free' : \`$\${(shipping / 100).toFixed(2)}\`}</span></div>
            <div className="flex justify-between text-sm"><span>Tax</span><span>\${(tax / 100).toFixed(2)}</span></div>
            <hr />
            <div className="flex justify-between font-semibold"><span>Total</span><span>\${(total / 100).toFixed(2)}</span></div>
          </div>
          {address && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-1">Ship to:</h3>
              <p className="text-sm text-muted-foreground">
                {address.firstName} {address.lastName}<br />
                {address.line1}{address.line2 ? \`, \${address.line2}\` : ''}<br />
                {address.city}, {address.state} {address.zip}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('payment')} className="border px-4 py-2 rounded-lg">Back</button>
            <button onClick={handlePayment} disabled={processing}
              className="bg-primary text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {processing ? 'Processing...' : \`Pay $\${(total / 100).toFixed(2)}\`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`,
  },

  // ── Fitness Tracker Snippets ───────────────────────────────────────────────

  {
    id: 'fitness-workout-logger',
    title: 'Workout Logger Component',
    description: 'Interactive workout logging with exercise selection, sets tracking, and rest timer.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['fitness', 'workout', 'component', 'form'],
    code: `interface ExerciseSet {
  weight: number;
  reps: number;
  completed: boolean;
}

interface ExerciseEntry {
  exerciseId: number;
  exerciseName: string;
  sets: ExerciseSet[];
}

function WorkoutLogger() {
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [startTime] = useState(new Date());
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const addExercise = (exerciseId: number, name: string) => {
    setExercises(prev => [...prev, {
      exerciseId,
      exerciseName: name,
      sets: [{ weight: 0, reps: 0, completed: false }],
    }]);
  };

  const addSet = (exerciseIndex: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 0, completed: false }] };
    }));
  };

  const updateSet = (exerciseIndex: number, setIndex: number, update: Partial<ExerciseSet>) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIndex ? { ...s, ...update } : s) };
    }));
  };

  const completeSet = (exerciseIndex: number, setIndex: number) => {
    updateSet(exerciseIndex, setIndex, { completed: true });
    setRestTimer(90);
  };

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return;
    const interval = setInterval(() => setRestTimer(t => t !== null ? t - 1 : null), 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Workout',
          startTime: startTime.toISOString(),
          endTime: new Date().toISOString(),
          exercises: exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets.filter(s => s.completed).map(s => ({ weight: s.weight, reps: s.reps })),
          })),
        }),
      });
    } finally { setSaving(false); }
  };

  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Workout</h1>
        <span className="text-sm text-muted-foreground">{elapsed} min</span>
      </div>

      {restTimer !== null && restTimer > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">Rest Timer</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-blue-700">
              {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
            </span>
            <button onClick={() => setRestTimer(null)} className="text-xs text-blue-600 hover:underline">Skip</button>
          </div>
        </div>
      )}

      {exercises.map((exercise, ei) => (
        <div key={ei} className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">{exercise.exerciseName}</h3>
          <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-xs text-muted-foreground font-medium">
            <span>SET</span><span>WEIGHT</span><span>REPS</span><span />
          </div>
          {exercise.sets.map((set, si) => (
            <div key={si} className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center">
              <span className="text-sm text-center font-medium">{si + 1}</span>
              <input type="number" value={set.weight || ''} onChange={e => updateSet(ei, si, { weight: Number(e.target.value) })}
                className="border rounded px-2 py-1.5 text-sm" placeholder="lbs" />
              <input type="number" value={set.reps || ''} onChange={e => updateSet(ei, si, { reps: Number(e.target.value) })}
                className="border rounded px-2 py-1.5 text-sm" placeholder="reps" />
              <button onClick={() => completeSet(ei, si)} disabled={set.completed}
                className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm \${
                  set.completed ? 'bg-green-500 text-white' : 'border-2 border-muted-foreground/30 hover:border-green-500'
                }\`}>
                {set.completed ? '✓' : ''}
              </button>
            </div>
          ))}
          <button onClick={() => addSet(ei)} className="text-sm text-primary hover:underline">+ Add Set</button>
        </div>
      ))}

      <button onClick={handleFinish} disabled={saving}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
        {saving ? 'Saving...' : 'Finish Workout'}
      </button>
    </div>
  );
}`,
  },

  // ── CRM Snippets ───────────────────────────────────────────────────────────

  {
    id: 'crm-pipeline-kanban',
    title: 'CRM Deal Pipeline Kanban Board',
    description: 'Kanban-style pipeline view with columns per stage and deal cards.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['crm', 'kanban', 'pipeline', 'component'],
    code: `interface Deal {
  id: number;
  title: string;
  value: number; // cents
  contactName: string;
  stageId: number;
  daysInStage: number;
  assigneeName: string;
  probability: number; // 0-100
}

interface PipelineStage {
  id: number;
  name: string;
  color: string;
  deals: Deal[];
  totalValue: number;
}

function PipelineKanban({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1">
      {stages.map(stage => (
        <div key={stage.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
            <h3 className="font-medium text-sm">{stage.name}</h3>
            <span className="text-xs text-muted-foreground ml-auto">{stage.deals.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 px-1">
            \${(stage.totalValue / 100).toLocaleString()}
          </p>
          <div className="space-y-2">
            {stage.deals.map(deal => (
              <div key={deal.id} className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow">
                <h4 className="text-sm font-medium mb-1">{deal.title}</h4>
                <p className="text-xs text-muted-foreground">{deal.contactName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-green-600">\${(deal.value / 100).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{deal.assigneeName}</span>
                  <span className={\`text-xs \${deal.daysInStage > 14 ? 'text-red-500' : 'text-muted-foreground'}\`}>
                    {deal.daysInStage}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}`,
  },

  // ── Inventory Snippets ─────────────────────────────────────────────────────

  {
    id: 'inventory-stock-table',
    title: 'Inventory Stock Table with Low Stock Alerts',
    description: 'Data table showing inventory items with status badges, stock level indicators, and reorder alerts.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['inventory', 'table', 'component', 'dashboard'],
    code: `interface InventoryRow {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  location: string;
  status: 'active' | 'discontinued' | 'out-of-stock';
  lastRestockedAt: string | null;
}

function StockLevelBadge({ quantity, reorderPoint }: { quantity: number; reorderPoint: number }) {
  if (quantity === 0) return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">Out of Stock</span>;
  if (quantity <= reorderPoint) return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">Low Stock</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">In Stock</span>;
}

function InventoryTable({ items, onReorder }: { items: InventoryRow[]; onReorder: (id: number) => void }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">SKU</th>
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Category</th>
            <th className="text-right p-3 font-medium">Qty</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Location</th>
            <th className="text-right p-3 font-medium">Value</th>
            <th className="text-left p-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 font-mono text-xs">{item.sku}</td>
              <td className="p-3 font-medium">{item.name}</td>
              <td className="p-3 text-muted-foreground">{item.category}</td>
              <td className="p-3 text-right tabular-nums">{item.quantity}</td>
              <td className="p-3"><StockLevelBadge quantity={item.quantity} reorderPoint={item.reorderPoint} /></td>
              <td className="p-3 text-muted-foreground">{item.location}</td>
              <td className="p-3 text-right tabular-nums">\${((item.quantity * item.unitCost) / 100).toLocaleString()}</td>
              <td className="p-3">
                {item.quantity <= item.reorderPoint && item.status === 'active' && (
                  <button onClick={() => onReorder(item.id)}
                    className="text-xs text-primary hover:underline font-medium">
                    Reorder
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
  },

  // ── Drizzle Schema Patterns ────────────────────────────────────────────────

  {
    id: 'drizzle-schema-ecommerce',
    title: 'Drizzle Schema: E-Commerce (Products, Orders, Cart)',
    description: 'Complete Drizzle schema for an e-commerce store with products, orders, cart, and reviews.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'ecommerce', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 500 }),
  sku: varchar('sku', { length: 100 }),
  price: integer('price').notNull(),
  compareAtPrice: integer('compare_at_price'),
  cost: integer('cost'),
  categoryId: integer('category_id').references(() => categories.id),
  images: jsonb('images').$type<{ url: string; alt: string; sortOrder: number }[]>(),
  stock: integer('stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  weight: numeric('weight', { precision: 8, scale: 2 }),
  tags: text('tags').array(),
  isFeatured: boolean('is_featured').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(t.slug),
  categoryIdx: index('products_category_idx').on(t.categoryId),
  statusIdx: index('products_status_idx').on(t.status),
  priceIdx: index('products_price_idx').on(t.price),
}));

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  parentId: integer('parent_id').references((): any => categories.id),
  sortOrder: integer('sort_order').notNull().default(0),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  customerId: integer('customer_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  subtotal: integer('subtotal').notNull(),
  tax: integer('tax').notNull().default(0),
  shipping: integer('shipping').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  total: integer('total').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  paymentIntentId: varchar('payment_intent_id', { length: 200 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderNumberIdx: uniqueIndex('orders_order_number_idx').on(t.orderNumber),
  customerIdx: index('orders_customer_idx').on(t.customerId),
  statusIdx: index('orders_status_idx').on(t.status),
}));

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  productName: varchar('product_name', { length: 300 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  total: integer('total').notNull(),
}, (t) => ({
  orderIdx: index('order_items_order_idx').on(t.orderId),
}));

export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  sessionId: varchar('session_id', { length: 100 }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  userId: integer('user_id').notNull(),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 200 }),
  content: text('content'),
  helpfulCount: integer('helpful_count').notNull().default(0),
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productIdx: index('reviews_product_idx').on(t.productId),
  uniqueReview: uniqueIndex('reviews_unique_idx').on(t.productId, t.userId),
}));`,
  },

  {
    id: 'drizzle-schema-blog',
    title: 'Drizzle Schema: Blog (Posts, Categories, Comments)',
    description: 'Complete Drizzle schema for a blog with posts, categories, comments, and subscribers.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'blog', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const blogCategories = pgTable('blog_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  coverImageUrl: text('cover_image_url'),
  authorId: integer('author_id').notNull(),
  categoryId: integer('category_id').references(() => blogCategories.id),
  tags: text('tags').array(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  readTimeMinutes: integer('read_time_minutes'),
  viewCount: integer('view_count').notNull().default(0),
  metaTitle: varchar('meta_title', { length: 100 }),
  metaDescription: varchar('meta_description', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  slugIdx: uniqueIndex('blog_posts_slug_idx').on(t.slug),
  authorIdx: index('blog_posts_author_idx').on(t.authorId),
  categoryIdx: index('blog_posts_category_idx').on(t.categoryId),
  statusIdx: index('blog_posts_status_idx').on(t.status),
  publishedIdx: index('blog_posts_published_idx').on(t.publishedAt),
}));

export const blogComments = pgTable('blog_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  authorName: varchar('author_name', { length: 100 }).notNull(),
  authorEmail: varchar('author_email', { length: 254 }).notNull(),
  content: text('content').notNull(),
  parentId: integer('parent_id').references((): any => blogComments.id),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  postIdx: index('blog_comments_post_idx').on(t.postId),
  statusIdx: index('blog_comments_status_idx').on(t.status),
}));

export const blogSubscribers = pgTable('blog_subscribers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  isConfirmed: boolean('is_confirmed').notNull().default(false),
  confirmToken: varchar('confirm_token', { length: 100 }),
  unsubscribeToken: varchar('unsubscribe_token', { length: 100 }).notNull(),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
}, (t) => ({
  emailIdx: uniqueIndex('blog_subscribers_email_idx').on(t.email),
}));`,
  },

  {
    id: 'drizzle-schema-booking',
    title: 'Drizzle Schema: Booking System (Services, Staff, Appointments)',
    description: 'Complete Drizzle schema for a booking platform with services, staff availability, and appointments.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'booking', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const bookingServices = pgTable('booking_services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  categoryId: integer('category_id'),
  imageUrl: text('image_url'),
  color: varchar('color', { length: 7 }),
  bufferBefore: integer('buffer_before').notNull().default(0),
  bufferAfter: integer('buffer_after').notNull().default(0),
  maxAdvanceBookingDays: integer('max_advance_booking_days').notNull().default(30),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('booking_services_status_idx').on(t.status),
}));

export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  email: varchar('email', { length: 254 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  title: varchar('title', { length: 100 }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const staffServices = pgTable('staff_services', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => bookingServices.id, { onDelete: 'cascade' }),
}, (t) => ({
  uniqueIdx: uniqueIndex('staff_services_unique_idx').on(t.staffId, t.serviceId),
}));

export const staffAvailability = pgTable('staff_availability', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(),
  endTime: varchar('end_time', { length: 5 }).notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
}, (t) => ({
  staffDayIdx: index('staff_availability_staff_day_idx').on(t.staffId, t.dayOfWeek),
}));

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull().references(() => bookingServices.id),
  staffId: integer('staff_id').notNull().references(() => staff.id),
  customerId: integer('customer_id'),
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  customerEmail: varchar('customer_email', { length: 254 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 30 }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  duration: integer('duration').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('booked'),
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  price: integer('price'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  staffTimeIdx: index('appointments_staff_time_idx').on(t.staffId, t.startTime),
  statusIdx: index('appointments_status_idx').on(t.status),
  customerIdx: index('appointments_customer_idx').on(t.customerEmail),
}));`,
  },

  // ── React Hook Patterns ────────────────────────────────────────────────────

  {
    id: 'react-use-debounce',
    title: 'useDebounce Hook',
    description: 'Debounce a value for search inputs, avoiding excessive API calls.',
    tech: ['react', 'typescript'],
    tags: ['react', 'hook', 'performance', 'search'],
    code: `function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function useSearch<T>(endpoint: string) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }

    const controller = new AbortController();
    setLoading(true);

    fetch(\`\${endpoint}?q=\${encodeURIComponent(debouncedQuery)}\`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setResults(data.data ?? data); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') setLoading(false); });

    return () => controller.abort();
  }, [debouncedQuery, endpoint]);

  return { query, setQuery, results, loading, debouncedQuery };
}

// Usage:
// const { query, setQuery, results, loading } = useSearch<User>('/api/users/search');
// <input value={query} onChange={e => setQuery(e.target.value)} />
// {loading ? <Spinner /> : results.map(user => <UserCard key={user.id} user={user} />)}`,
  },

  {
    id: 'react-use-infinite-scroll',
    title: 'useInfiniteScroll Hook',
    description: 'Infinite scroll hook with intersection observer for cursor-based pagination.',
    tech: ['react', 'typescript'],
    tags: ['react', 'hook', 'infinite-scroll', 'pagination'],
    code: `function useInfiniteScroll<T>(endpoint: string, pageSize = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('limit', String(pageSize));
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString());
      const data = await res.json();

      setItems(prev => [...prev, ...data.data]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [endpoint, cursor, hasMore, loading, pageSize]);

  useEffect(() => { loadMore(); }, []); // Initial load

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadMore();
    }, { threshold: 0.1 });

    observerRef.current.observe(node);
  }, [hasMore, loading, loadMore]);

  return { items, loading, initialLoading, hasMore, sentinelRef, loadMore };
}

// Usage:
// const { items, loading, initialLoading, hasMore, sentinelRef } = useInfiniteScroll<Post>('/api/posts');
// {initialLoading ? <PostSkeleton /> : items.map(post => <PostCard key={post.id} post={post} />)}
// {hasMore && <div ref={sentinelRef} className="h-4" />}
// {loading && !initialLoading && <Spinner />}`,
  },

  {
    id: 'react-use-local-storage',
    title: 'useLocalStorage Hook (Type-Safe)',
    description: 'Persist state to localStorage with JSON serialization and type safety.',
    tech: ['react', 'typescript'],
    tags: ['react', 'hook', 'storage', 'persistence'],
    code: `function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch (err) {
        console.error(\`Failed to save "\${key}" to localStorage\`, err);
      }
      return newValue;
    });
  }, [key]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setStoredValue(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  return [storedValue, setValue];
}

// Usage:
// const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
// const [favorites, setFavorites] = useLocalStorage<number[]>('favorites', []);
// setFavorites(prev => [...prev, itemId]);`,
  },

  {
    id: 'react-use-media-query',
    title: 'useMediaQuery Hook',
    description: 'React hook that tracks a CSS media query match state for responsive behavior.',
    tech: ['react', 'typescript'],
    tags: ['react', 'hook', 'responsive', 'layout'],
    code: `function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return { isMobile, isTablet, isDesktop };
}

// Usage:
// const { isMobile, isDesktop } = useBreakpoint();
// {isMobile ? <MobileNav /> : <DesktopSidebar />}`,
  },

  // ── Notification Patterns ──────────────────────────────────────────────────

  {
    id: 'notification-toast-system',
    title: 'Toast Notification System',
    description: 'Full toast notification system with context provider, auto-dismiss, and multiple severity levels.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['react', 'notification', 'toast', 'component'],
    code: `type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);
    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id}
          className={\`border rounded-lg p-3 shadow-lg animate-in slide-in-from-right fade-in duration-200 \${TOAST_STYLES[toast.type]}\`}>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium mt-0.5">{TOAST_ICONS[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description && <p className="text-xs mt-0.5 opacity-80">{toast.description}</p>}
            </div>
            <button onClick={() => onRemove(toast.id)} className="text-sm opacity-50 hover:opacity-100" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

// Usage:
// const { addToast } = useToast();
// addToast({ type: 'success', title: 'Task created', description: 'Your task has been created successfully.' });
// addToast({ type: 'error', title: 'Failed to save', description: 'Please try again.' });`,
  },

  // ── Auth Patterns ──────────────────────────────────────────────────────────

  {
    id: 'auth-jwt-middleware',
    title: 'JWT Authentication Middleware',
    description: 'Express middleware for JWT token verification with user loading and role checking.',
    tech: ['express', 'typescript'],
    tags: ['auth', 'jwt', 'middleware', 'security'],
    code: `import jwt from 'jsonwebtoken';
import { db } from './db';
import { eq } from 'drizzle-orm';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; role: string; name: string };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = { id: payload.userId, email: payload.email, role: payload.role, name: '' };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function generateTokens(user: { id: number; email: string; role: string }) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

// Usage:
// app.get('/api/admin/users', authenticate, requireRole('admin'), async (req, res) => { ... });
// app.get('/api/profile', authenticate, async (req, res) => { res.json(req.user); });`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 2
// ============================================

export const EXPANDED_ANTI_PATTERNS_2: AntiPattern[] = [
  {
    id: 'n-plus-one-queries',
    name: 'N+1 Query Problem',
    description: 'Fetching related data in a loop instead of using JOINs or batch loading.',
    whyBad: 'If you have 100 posts and fetch each author individually, you execute 101 queries instead of 1-2. This crushes database performance and causes severe latency on list pages.',
    fix: 'Use JOINs to fetch related data in a single query. In Drizzle: use .leftJoin() or db.query with `with` relations. For batch loading: collect all IDs first, then IN query.',
    severity: 'critical',
    badExample: 'const posts = await db.select().from(posts); for (const post of posts) { post.author = await db.select().from(users).where(eq(users.id, post.authorId)); }',
    goodExample: 'const postsWithAuthors = await db.select().from(posts).leftJoin(users, eq(posts.authorId, users.id));',
    tags: ['database', 'performance', 'drizzle'],
  },
  {
    id: 'no-pagination',
    name: 'Fetching all records without pagination',
    description: 'Loading every record from a table without LIMIT, causing memory exhaustion and slow responses.',
    whyBad: 'With 100K records, this loads all data into memory, exhausts Node.js heap, and sends a massive JSON response. Even 1,000 records creates noticeable latency.',
    fix: 'Always paginate with LIMIT and OFFSET (or cursor). Default page size: 20. Max page size: 100. Return total count for UI pagination controls.',
    severity: 'high',
    badExample: 'const allUsers = await db.select().from(users);',
    goodExample: 'const page = Math.max(1, Number(req.query.page) || 1); const pageSize = Math.min(100, Number(req.query.pageSize) || 20); const data = await db.select().from(users).limit(pageSize).offset((page - 1) * pageSize);',
    tags: ['database', 'performance', 'api'],
  },
  {
    id: 'client-side-filtering',
    name: 'Filtering data on the client instead of the server',
    description: 'Fetching all records and filtering in JavaScript instead of using WHERE clauses.',
    whyBad: 'Transfers unnecessary data over the network, wastes client memory, and misses database index benefits. A WHERE clause on an indexed column is orders of magnitude faster than client-side .filter().',
    fix: 'Always filter on the server with WHERE clauses. Pass filter parameters as query strings. Build dynamic WHERE conditions from query params.',
    severity: 'high',
    badExample: 'const allTasks = await fetch("/api/tasks").then(r => r.json()); const activeTasks = allTasks.filter(t => t.status === "active");',
    goodExample: 'const activeTasks = await fetch("/api/tasks?status=active").then(r => r.json());',
    tags: ['performance', 'api', 'react'],
  },
  {
    id: 'storing-passwords-plain',
    name: 'Storing passwords in plain text',
    description: 'Saving user passwords without hashing, or using weak hashing like MD5/SHA1.',
    whyBad: 'If the database is breached, all passwords are immediately compromised. Users often reuse passwords across sites, amplifying the damage.',
    fix: 'Always hash passwords with bcrypt (cost factor 12+) or Argon2. Never use MD5, SHA1, or SHA256 for passwords — they are too fast. Use crypto.timingSafeEqual for comparison to prevent timing attacks.',
    severity: 'critical',
    badExample: 'await db.insert(users).values({ email, password: req.body.password }); // NEVER store plain text!',
    goodExample: 'import bcrypt from "bcrypt"; const hash = await bcrypt.hash(req.body.password, 12); await db.insert(users).values({ email, password: hash });',
    tags: ['security', 'database', 'auth'],
  },
  {
    id: 'no-input-validation',
    name: 'Accepting request body without validation',
    description: 'Using req.body directly without validating its structure and contents.',
    whyBad: 'Opens the door to SQL injection, XSS, type coercion bugs, and crashes from unexpected data shapes. An attacker can send any JSON shape.',
    fix: 'Validate EVERY request body with Zod before using it. Parse and transform — never trust raw input. Return 422 with field-level errors on validation failure.',
    severity: 'critical',
    badExample: 'app.post("/api/users", (req, res) => { db.insert(users).values(req.body); }); // Accepts ANYTHING!',
    goodExample: 'const schema = z.object({ name: z.string().min(1).max(100), email: z.string().email() }); app.post("/api/users", (req, res) => { const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(422).json({ errors: parsed.error.flatten().fieldErrors }); db.insert(users).values(parsed.data); });',
    tags: ['security', 'api', 'validation'],
  },
  {
    id: 'exposing-internal-errors',
    name: 'Exposing internal error details to API consumers',
    description: 'Returning stack traces, database errors, or internal error messages in API responses.',
    whyBad: 'Stack traces reveal file paths, library versions, and database structure — information attackers use to find vulnerabilities. Internal errors confuse end users.',
    fix: 'Catch all errors in a global error handler. Log the full error server-side. Return a generic user-friendly message. In development, optionally include the error message (never in production).',
    severity: 'high',
    badExample: 'app.use((err, req, res, next) => { res.status(500).json({ error: err.message, stack: err.stack }); });',
    goodExample: 'app.use((err: Error, req: Request, res: Response, _next: NextFunction) => { console.error(err); const isDev = process.env.NODE_ENV !== "production"; res.status(500).json({ error: "Internal server error", ...(isDev ? { message: err.message } : {}) }); });',
    tags: ['security', 'api', 'error-handling'],
  },
  {
    id: 'prop-drilling',
    name: 'Excessive prop drilling through many component layers',
    description: 'Passing data through 5+ component levels via props when only the leaf component needs it.',
    whyBad: 'Every intermediate component must accept and forward props it does not use. This makes refactoring painful, creates unnecessary re-renders, and obscures data flow.',
    fix: 'Use React Context for cross-cutting data (auth, theme, locale). Use Zustand/Jotai for shared client state. Use React Query for server state (it is the cache). Only pass props that a component directly uses.',
    severity: 'medium',
    badExample: '<App user={user}> → <Layout user={user}> → <Sidebar user={user}> → <Nav user={user}> → <UserMenu user={user} />',
    goodExample: 'const AuthContext = createContext<User | null>(null); <AuthProvider value={user}><App /></AuthProvider>; // Inside UserMenu: const user = useAuth();',
    tags: ['react', 'architecture', 'maintainability'],
  },
  {
    id: 'useeffect-fetching',
    name: 'Using useEffect + useState for data fetching',
    description: 'Writing manual fetch-in-useEffect patterns instead of using React Query.',
    whyBad: 'You must manually handle loading, error, caching, deduplication, refetching, and race conditions. React Query handles all of this in 2 lines. Manual fetch code has bugs (missing cleanup, stale closures, no retry).',
    fix: 'Use React Query (TanStack Query) for ALL server state. It provides caching, automatic refetching, loading/error states, and mutation handling out of the box.',
    severity: 'high',
    badExample: 'const [data, setData] = useState(null); const [loading, setLoading] = useState(true); useEffect(() => { fetch("/api/data").then(r => r.json()).then(d => { setData(d); setLoading(false); }); }, []);',
    goodExample: 'const { data, isLoading, error } = useQuery({ queryKey: ["data"], queryFn: () => fetch("/api/data").then(r => r.json()) });',
    tags: ['react', 'performance', 'hooks'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 2
// ============================================

export const EXPANDED_BEST_PRACTICES_2: BestPractice[] = [
  {
    id: 'component-architecture',
    title: 'React Component Architecture',
    category: 'react',
    description: 'Structure components for reusability, testability, and clear responsibility.',
    do: [
      'Follow the Single Responsibility Principle — one component = one job',
      'Extract reusable UI components (Button, Input, Card, Modal, Badge) into a shared components directory',
      'Separate container components (data fetching) from presentational components (rendering)',
      'Keep components under 200 lines — if longer, extract sub-components',
      'Use descriptive prop names: onItemClick, not handleClick',
      'Colocate component files: TaskCard.tsx, TaskCard.test.tsx, TaskCard.stories.tsx in one directory',
      'Type all props with interfaces, not inline object types',
    ],
    dont: [
      'Create "god components" that fetch data, manage state, AND render complex UI (>300 lines)',
      'Import deeply nested components from unrelated features',
      'Mix business logic with rendering logic in the same component',
      'Use generic names like Component1, Handler, Wrapper without context',
      'Export more than one main component per file (exceptions: small related components)',
    ],
    languages: ['typescript'],
  },
  {
    id: 'api-error-handling',
    title: 'API Error Handling Strategy',
    category: 'architecture',
    description: 'Consistent error responses, global error middleware, and client-side error handling.',
    do: [
      'Use a global Express error handler as the LAST middleware',
      'Return consistent error JSON shape: { error: string, code?: string, details?: object }',
      'Use appropriate HTTP status codes: 400 bad input, 401 not authenticated, 403 forbidden, 404 not found, 409 conflict, 422 validation, 429 rate limited, 500 server error',
      'Create custom error classes: NotFoundError, ValidationError, ConflictError, UnauthorizedError',
      'Log full error details server-side (stack trace, request body, user ID)',
      'Return generic error messages in production — never expose internal details',
      'Include a request ID in error responses for support debugging',
    ],
    dont: [
      'Use try-catch in every route handler — use asyncHandler wrapper + global error middleware',
      'Return 200 for errors with { success: false } — use proper HTTP status codes',
      'Expose stack traces, SQL errors, or file paths in API responses',
      'Swallow errors silently — always log and inform the client',
      'Use console.log for error logging in production — use structured logger (pino)',
    ],
    languages: ['typescript'],
  },
  {
    id: 'git-workflow',
    title: 'Git Workflow & Commit Conventions',
    category: 'devops',
    description: 'Clean git history with conventional commits, focused branches, and meaningful messages.',
    do: [
      'Use conventional commit format: type(scope): message — e.g., feat(auth): add login endpoint',
      'Types: feat (new feature), fix (bug fix), refactor, docs, test, chore, style, perf',
      'Keep commits atomic — one logical change per commit',
      'Write commit messages in imperative mood: "Add user endpoint" not "Added user endpoint"',
      'Use feature branches: feature/add-auth, fix/login-redirect, refactor/user-service',
      'Squash WIP commits before merging to main',
    ],
    dont: [
      'Use vague commit messages: "fix stuff", "wip", "updates", "misc changes"',
      'Commit unrelated changes together (fixing a bug AND adding a feature in one commit)',
      'Commit secrets, .env files, or node_modules',
      'Force push to shared branches',
      'Leave TODO/FIXME comments without a corresponding issue/ticket',
    ],
    languages: ['all'],
  },
  {
    id: 'database-design',
    title: 'Database Schema Design',
    category: 'database',
    description: 'Design schemas that are normalized, indexed, and future-proof.',
    do: [
      'Use serial/auto-increment for primary keys (unless UUIDs are needed for distributed systems)',
      'Add createdAt and updatedAt timestamps to every table',
      'Use soft deletes (deletedAt column) for user-facing entities',
      'Add indexes on all foreign key columns and commonly filtered columns',
      'Use composite indexes for multi-column queries: (status, createdAt DESC)',
      'Store monetary values as integers (cents) to avoid floating-point errors',
      'Use varchar with explicit length limits, not text, for constrained fields (email, status, slug)',
      'Add CHECK constraints for enum-like columns (status, role, type)',
      'Use timestamptz (with timezone) not timestamp for all date/time columns',
    ],
    dont: [
      'Use floating-point (real, double precision) for monetary values',
      'Create tables without primary keys',
      'Skip indexes on foreign key columns — JOINs will be slow',
      'Use stringly-typed foreign keys (store "user_123" instead of integer FK)',
      'Store arrays of IDs as comma-separated strings — use array columns or join tables',
      'Use reserved SQL words as column names (user, order, group, select)',
    ],
    languages: ['sql', 'typescript'],
  },
  {
    id: 'project-structure',
    title: 'Full-Stack Project Structure',
    category: 'architecture',
    description: 'Organize a full-stack TypeScript project for clarity, scalability, and team collaboration.',
    do: [
      'Separate client (React) and server (Express) into distinct directories or packages',
      'Group server code by feature/module, not by type: /modules/tasks/{routes,service,schema}.ts',
      'Keep shared types in a shared package: @workspace/shared or shared/types.ts',
      'Use barrel exports (index.ts) sparingly — only for public API of a module',
      'Put database schema definitions together: db/schema.ts or db/schema/*.ts',
      'Keep configuration in one place: config/app.ts, config/database.ts',
      'Place middleware in a dedicated directory: middleware/auth.ts, middleware/validate.ts',
    ],
    dont: [
      'Mix client and server code in the same directory',
      'Create deeply nested directories (>4 levels) — flat is better than nested',
      'Put all components in a single components/ directory (group by feature instead)',
      'Import server-only code from client code (Node.js APIs do not exist in the browser)',
      'Scatter environment variable access across many files — centralize in config',
    ],
    languages: ['typescript'],
  },
  {
    id: 'security-checklist',
    title: 'Web Application Security Checklist',
    category: 'security',
    description: 'Essential security measures for every web application.',
    do: [
      'Validate ALL user input with Zod — never trust req.body, req.params, or req.query',
      'Hash passwords with bcrypt (cost 12+) — never store plain text',
      'Use parameterized queries (Drizzle ORM does this) — never concatenate SQL strings',
      'Set HttpOnly, Secure, SameSite=Strict on authentication cookies',
      'Implement rate limiting on all endpoints, especially auth and form submissions',
      'Use HTTPS everywhere — redirect HTTP to HTTPS',
      'Set security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options',
      'Sanitize HTML output to prevent XSS (DOMPurify, sanitize-html)',
      'Scope all database queries to the authenticated user/tenant (prevent IDOR)',
      'Log security events: failed logins, permission denials, rate limit hits',
    ],
    dont: [
      'Store secrets in code or git — use environment variables',
      'Use MD5 or SHA1 for password hashing — they are too fast',
      'Trust client-side validation alone — always validate server-side',
      'Expose internal error details (stack traces, SQL errors) in API responses',
      'Use wildcard CORS (*) in production — whitelist specific origins',
      'Store JWTs in localStorage — use HttpOnly cookies for sensitive tokens',
    ],
    languages: ['typescript'],
  },
];
