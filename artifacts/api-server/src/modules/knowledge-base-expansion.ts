import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS
// ============================================

export const EXPANDED_CONCEPTS: Record<string, Concept> = {

  // ── Advanced TypeScript ────────────────────────────────────────────────────

  ts_branded_types: {
    id: 'ts-branded-types',
    name: 'Branded / Nominal Types',
    category: 'typescript',
    description: 'Create distinct types from primitives so that a UserId cannot accidentally be used where a PostId is expected.',
    explanation: 'TypeScript uses structural typing by default, so two type aliases for `number` are interchangeable. Branded types add a phantom property (the "brand") that exists only at the type level, preventing accidental misuse. Declare a brand with `& { readonly __brand: unique symbol }` or the `Brand<Base, Tag>` utility. This catches bugs at compile time without any runtime cost.',
    examples: [
      `type Brand<Base, Tag extends string> = Base & { readonly __brand: Tag };
type UserId = Brand<number, 'UserId'>;
type PostId = Brand<number, 'PostId'>;

function getUser(id: UserId) { /* ... */ }
function getPost(id: PostId) { /* ... */ }

const userId = 42 as UserId;
const postId = 99 as PostId;
getUser(userId); // OK
// getUser(postId); // Compile error — PostId is not assignable to UserId`,
      `type Email = Brand<string, 'Email'>;
function parseEmail(raw: string): Email {
  if (!raw.includes('@')) throw new Error('Invalid email');
  return raw as Email;
}`,
    ],
    relatedConcepts: ['ts-generics', 'ts-utility-types', 'ts-type-guards'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  ts_template_literals: {
    id: 'ts-template-literals',
    name: 'Template Literal Types',
    category: 'typescript',
    description: 'Build string-literal union types from other types using template literal syntax.',
    explanation: 'TypeScript template literal types let you construct string types dynamically. Combine with mapped types and conditional types for powerful type-level string manipulation. Useful for typed route paths, event names, and CSS property generation. Syntax: `type Greeting = \\`hello_\\${string}\\``.',
    examples: [
      `type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type APIRoute = '/users' | '/posts' | '/comments';
type Endpoint = \`\${HTTPMethod} \${APIRoute}\`;
// "GET /users" | "GET /posts" | "GET /comments" | "POST /users" | ...`,
      `type EventName<T extends string> = \`on\${Capitalize<T>}\`;
type ClickEvent = EventName<'click'>; // "onClick"
type SubmitEvent = EventName<'submit'>; // "onSubmit"`,
      `type CSSProperty = 'margin' | 'padding';
type Direction = 'Top' | 'Right' | 'Bottom' | 'Left';
type SpacingProp = \`\${CSSProperty}\${Direction}\`;
// "marginTop" | "marginRight" | ... | "paddingLeft"`,
    ],
    relatedConcepts: ['ts-generics', 'ts-utility-types', 'ts-discriminated-unions'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  ts_mapped_types: {
    id: 'ts-mapped-types',
    name: 'Mapped Types',
    category: 'typescript',
    description: 'Create new types by transforming each property of an existing type.',
    explanation: 'Mapped types iterate over keys of another type to produce a new type. Combined with key remapping (`as`), conditional types, and template literals, they enable powerful type transformations. Built-in examples: Partial<T>, Required<T>, Readonly<T>, Pick<T, K>, Omit<T, K>.',
    examples: [
      `type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }`,
      `type Nullable<T> = { [K in keyof T]: T[K] | null };
type FormValues<T> = { [K in keyof T]: string }; // All fields as strings for form inputs`,
      `type EventHandlers<Events extends Record<string, unknown>> = {
  [K in keyof Events as \`on\${Capitalize<string & K>}\`]: (event: Events[K]) => void;
};
type AppEvents = { click: MouseEvent; submit: FormData; };
type Handlers = EventHandlers<AppEvents>;
// { onClick: (event: MouseEvent) => void; onSubmit: (event: FormData) => void; }`,
    ],
    relatedConcepts: ['ts-generics', 'ts-utility-types', 'ts-template-literals'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  ts_conditional_types: {
    id: 'ts-conditional-types',
    name: 'Conditional Types',
    category: 'typescript',
    description: 'Select types based on a condition using extends and ternary syntax at the type level.',
    explanation: 'Conditional types follow the pattern `T extends U ? X : Y`. When T is a union, the condition distributes over each member. Combined with `infer`, you can extract types from complex structures. Common patterns: extracting return types, unwrapping Promises, filtering union members.',
    examples: [
      `type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<42>;      // false`,
      `type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type Result = UnwrapPromise<Promise<string>>; // string`,
      `type ExtractByStatus<T, S> = T extends { status: S } ? T : never;
type Item = { status: 'active'; name: string } | { status: 'deleted'; deletedAt: Date };
type ActiveItem = ExtractByStatus<Item, 'active'>;
// { status: 'active'; name: string }`,
      `type FunctionReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Ret = FunctionReturnType<(x: number) => string>; // string`,
    ],
    relatedConcepts: ['ts-generics', 'ts-discriminated-unions', 'ts-mapped-types'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  ts_satisfies: {
    id: 'ts-satisfies',
    name: 'The satisfies Operator',
    category: 'typescript',
    description: 'Validate that a value conforms to a type while preserving its narrow literal type.',
    explanation: 'The `satisfies` operator (TS 4.9+) checks that an expression matches a type without widening the inferred type. Unlike `as const` which preserves literals but does not type-check, `satisfies` does both. Use it for configuration objects, route maps, and theme definitions where you want autocompletion AND type safety.',
    examples: [
      `const routes = {
  home: '/',
  about: '/about',
  users: '/users',
} satisfies Record<string, string>;
// routes.home is typed as '/' (literal), not string
// Adding a non-string value would be a compile error`,
      `type Theme = { primary: string; secondary: string; };
const darkTheme = {
  primary: '#1a1a2e',
  secondary: '#16213e',
} satisfies Theme;
// Still narrowly typed as { primary: '#1a1a2e'; secondary: '#16213e' }`,
    ],
    relatedConcepts: ['ts-utility-types', 'ts-type-guards'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  ts_builder_pattern: {
    id: 'ts-builder-pattern',
    name: 'Type-Safe Builder Pattern',
    category: 'typescript',
    description: 'Fluent API that tracks which properties have been set at the type level, preventing incomplete builds.',
    explanation: 'Combine generics with intersection types to create a builder where each method adds a property to the accumulated type. The build() method is only callable when all required properties are present. This prevents runtime errors from incomplete construction.',
    examples: [
      `class QueryBuilder<T extends Record<string, unknown> = {}> {
  private params: Record<string, unknown> = {};

  where<K extends string, V>(key: K, value: V): QueryBuilder<T & Record<K, V>> {
    this.params[key] = value;
    return this as any;
  }

  orderBy(column: string, dir: 'asc' | 'desc' = 'asc'): this {
    this.params._orderBy = { column, dir };
    return this;
  }

  limit(n: number): this {
    this.params._limit = n;
    return this;
  }

  build(): T & { _orderBy?: { column: string; dir: string }; _limit?: number } {
    return this.params as any;
  }
}

const query = new QueryBuilder()
  .where('status', 'active')
  .where('role', 'admin')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .build();
// Typed as { status: string; role: string; _orderBy?: ...; _limit?: number }`,
    ],
    relatedConcepts: ['ts-generics', 'factory', 'ts-mapped-types'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  // ── React Advanced Patterns ────────────────────────────────────────────────

  react_render_props: {
    id: 'react-render-props',
    name: 'Render Props Pattern',
    category: 'react',
    description: 'Share behavior between components by passing a function as a prop that returns JSX.',
    explanation: 'Render props allow a component to share its internal state or behavior with any child via a function prop. The parent controls what is rendered, while the render-prop component controls the logic. Largely replaced by hooks, but still useful for components that need to share behavior across different rendering contexts (e.g., headless UI libraries).',
    examples: [
      `interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {render(pos)}
    </div>
  );
}

// Usage:
<MouseTracker render={({ x, y }) => <p>Mouse at ({x}, {y})</p>} />`,
    ],
    relatedConcepts: ['react-custom-hooks', 'react-context', 'react-compound-components'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  react_hoc: {
    id: 'react-hoc',
    name: 'Higher-Order Components (HOC)',
    category: 'react',
    description: 'A function that takes a component and returns an enhanced component with additional props or behavior.',
    explanation: 'HOCs are the original React pattern for reusing component logic. A HOC wraps a component, injecting props, adding lifecycle behavior, or providing context. While hooks have replaced most HOC use cases, HOCs remain useful for cross-cutting concerns like auth guards, feature flags, and error boundaries that need to wrap entire component trees.',
    examples: [
      `function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & { user: User }>
): React.FC<P> {
  return function AuthGuard(props: P) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}

// Usage:
const ProtectedDashboard = withAuth(Dashboard);`,
    ],
    relatedConcepts: ['react-custom-hooks', 'react-render-props', 'react-context'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  react_suspense: {
    id: 'react-suspense',
    name: 'React Suspense & Lazy Loading',
    category: 'react',
    description: 'Declaratively show fallback content while lazy-loaded components or data are loading.',
    explanation: 'React.Suspense wraps lazy-loaded components and displays a fallback UI while they load. Combined with React.lazy() for code splitting at route boundaries, it reduces initial bundle size. Future React versions extend Suspense to data fetching. Always wrap Suspense around route switches and heavy components.',
    examples: [
      `const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}`,
    ],
    relatedConcepts: ['lazy-loading', 'react-error-boundaries', 'code-splitting'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  react_portal: {
    id: 'react-portal',
    name: 'React Portals',
    category: 'react',
    description: 'Render children into a DOM node outside the parent component hierarchy.',
    explanation: 'Portals allow rendering modals, tooltips, toasts, and overlays outside the parent DOM tree while maintaining React event bubbling and context. Use createPortal(children, domNode) to render to document.body or a dedicated modal root. This prevents z-index conflicts and overflow clipping issues.',
    examples: [
      `import { createPortal } from 'react-dom';

function Modal({ children, isOpen, onClose }: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}`,
    ],
    relatedConcepts: ['react-custom-hooks', 'react-context'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Architecture Patterns ──────────────────────────────────────────────────

  dependency_injection: {
    id: 'dependency-injection',
    name: 'Dependency Injection (DI)',
    category: 'architecture',
    description: 'Provide dependencies to a function or class from the outside rather than creating them internally.',
    explanation: 'DI decouples components from their dependencies, making code testable and modular. In TypeScript: pass dependencies as constructor arguments or function parameters. For React: use Context for cross-cutting concerns. For Express: create factory functions that accept a database instance. Avoid service locators — prefer constructor injection for explicit dependencies.',
    examples: [
      `interface UserRepository {
  findById(id: number): Promise<User | null>;
  create(data: NewUser): Promise<User>;
}

class UserService {
  constructor(private repo: UserRepository, private emailService: EmailService) {}

  async register(data: NewUser): Promise<User> {
    const user = await this.repo.create(data);
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}

// Production: new UserService(new DrizzleUserRepo(db), new SendGridEmailService())
// Testing:   new UserService(mockRepo, mockEmailService)`,
    ],
    relatedConcepts: ['solid', 'repository', 'factory', 'clean-architecture'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  hexagonal_architecture: {
    id: 'hexagonal-architecture',
    name: 'Hexagonal Architecture (Ports & Adapters)',
    category: 'architecture',
    description: 'Organize code so business logic is at the center, with adapters for external concerns (DB, HTTP, email).',
    explanation: 'The hexagonal architecture separates your application into three layers: (1) Domain — pure business logic with no framework dependencies, (2) Ports — interfaces that define how the domain interacts with the outside world, (3) Adapters — implementations of ports for specific technologies (Drizzle, Express, SendGrid). Benefits: testable domain logic, swappable infrastructure, clear boundaries.',
    examples: [
      `// Port (interface)
interface OrderRepository {
  findById(id: number): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

// Domain (pure business logic)
class OrderService {
  constructor(private orders: OrderRepository, private payments: PaymentGateway) {}
  async checkout(orderId: number): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Order');
    order.status = 'paid';
    await this.payments.charge(order.total, order.userId);
    await this.orders.save(order);
  }
}

// Adapter (infrastructure)
class DrizzleOrderRepository implements OrderRepository {
  constructor(private db: DrizzleDB) {}
  async findById(id: number) { return this.db.query.orders.findFirst({ where: eq(orders.id, id) }); }
  async save(order: Order) { /* ... */ }
}`,
    ],
    relatedConcepts: ['clean-architecture', 'dependency-injection', 'repository', 'solid'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  middleware_pattern: {
    id: 'middleware-pattern',
    name: 'Middleware Pattern',
    category: 'architecture',
    description: 'Chain functions that each process a request/response and optionally pass control to the next middleware.',
    explanation: 'Middleware is a pipeline pattern where each function can inspect, modify, or short-circuit the request/response cycle. Express uses this pattern natively. Middleware functions have the signature (req, res, next). Call next() to continue the chain, or send a response to stop. Order matters — auth before routes, error handler last.',
    examples: [
      `// Logging middleware
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`\${req.method} \${req.path} \${res.statusCode} \${duration}ms\`);
  });
  next();
}

// CORS middleware
function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// Middleware chain order:
app.use(requestLogger);
app.use(corsMiddleware);
app.use(authenticate); // Auth check
app.use('/api', apiRouter); // Routes
app.use(errorHandler); // Error handler LAST`,
    ],
    relatedConcepts: ['strategy', 'observer', 'dependency-injection'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  event_driven: {
    id: 'event-driven',
    name: 'Event-Driven Architecture',
    category: 'architecture',
    description: 'Components communicate by emitting and listening to events rather than direct method calls.',
    explanation: 'Event-driven architecture decouples producers from consumers. The emitter does not need to know who listens. In Node.js, use EventEmitter for in-process events. For distributed systems, use message queues (Redis Pub/Sub, RabbitMQ, Kafka). Common pattern: domain events (OrderPlaced, UserRegistered) trigger side effects (send email, update analytics, sync CRM) without coupling the core logic to those concerns.',
    examples: [
      `import { EventEmitter } from 'events';

const appEvents = new EventEmitter();

// Registration handler — only creates the user
async function registerUser(data: NewUser): Promise<User> {
  const user = await userRepo.create(data);
  appEvents.emit('user.registered', { userId: user.id, email: user.email });
  return user;
}

// Side effects listen independently — easy to add/remove
appEvents.on('user.registered', async ({ userId, email }) => {
  await emailService.sendWelcome(email);
});
appEvents.on('user.registered', async ({ userId }) => {
  await analyticsService.trackSignup(userId);
});`,
    ],
    relatedConcepts: ['observer', 'command', 'event-sourcing', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Database Advanced ──────────────────────────────────────────────────────

  database_migrations: {
    id: 'database-migrations',
    name: 'Database Migrations',
    category: 'database',
    description: 'Version-controlled changes to database schema, applied incrementally and reversibly.',
    explanation: 'Migrations track every schema change as a numbered file. Apply them in order to evolve the database from any version to the latest. In Drizzle: use `drizzle-kit generate` to create migration files from schema changes, then `drizzle-kit migrate` to apply. Never edit production schemas manually — always use migrations. Each migration should be idempotent and reversible.',
    examples: [
      `// Drizzle migration workflow:
// 1. Edit schema.ts (add column, table, index)
// 2. npx drizzle-kit generate — creates SQL migration file
// 3. npx drizzle-kit migrate — applies to database
// 4. Commit both schema.ts and migration file

// For development: npx drizzle-kit push — syncs schema directly (skip migration files)`,
    ],
    relatedConcepts: ['database-indexing', 'database-transactions'],
    difficulty: 'intermediate',
    languages: ['typescript', 'sql'],
  },

  optimistic_locking: {
    id: 'optimistic-locking',
    name: 'Optimistic Locking',
    category: 'database',
    description: 'Detect concurrent edits by checking a version number before committing an update.',
    explanation: 'Optimistic locking adds a `version` or `updatedAt` column to every row. When updating, include the current version in the WHERE clause: UPDATE ... WHERE id = ? AND version = ?. If 0 rows are affected, another process modified the row — throw a conflict error. This avoids database-level locks while preventing lost updates. Especially important for multi-user editing scenarios.',
    examples: [
      `export async function updateWithOptimisticLock(
  id: number,
  currentVersion: number,
  data: Partial<Item>
): Promise<Item> {
  const [updated] = await db
    .update(items)
    .set({ ...data, version: currentVersion + 1, updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.version, currentVersion)))
    .returning();

  if (!updated) {
    throw new ConflictError('This record was modified by another user. Please refresh and try again.');
  }
  return updated;
}`,
    ],
    relatedConcepts: ['database-transactions', 'database-indexing', 'caching'],
    difficulty: 'advanced',
    languages: ['typescript', 'sql'],
  },

  row_level_security: {
    id: 'row-level-security',
    name: 'Row-Level Security (Application Layer)',
    category: 'database',
    description: 'Ensure users can only access their own data by filtering every query on the authenticated user ID.',
    explanation: 'Application-level RLS means every query includes a WHERE clause scoping data to the current user, team, or organization. In a multi-tenant SaaS, every table should have a tenantId column, and every query must filter by it. Never rely on frontend filtering alone — always enforce server-side. Create helper functions that automatically scope queries.',
    examples: [
      `function scopedQuery(userId: number) {
  return {
    findTasks: () =>
      db.select().from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
        .orderBy(desc(tasks.createdAt)),

    findTask: (id: number) =>
      db.select().from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
        .then(rows => rows[0] ?? null),

    createTask: (data: NewTask) =>
      db.insert(tasks).values({ ...data, userId }).returning().then(r => r[0]),
  };
}

// In route handler:
app.get('/api/tasks', authenticate, async (req, res) => {
  const query = scopedQuery(req.user!.id);
  const userTasks = await query.findTasks();
  res.json(userTasks);
});`,
    ],
    relatedConcepts: ['database-indexing', 'jwt', 'input-validation'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Performance Advanced ───────────────────────────────────────────────────

  virtual_scrolling: {
    id: 'virtual-scrolling',
    name: 'Virtual Scrolling / Windowing',
    category: 'performance',
    description: 'Render only the visible items in a long list, recycling DOM nodes as the user scrolls.',
    explanation: 'Rendering 10,000 items creates 10,000 DOM nodes, causing jank and memory pressure. Virtual scrolling renders only the ~20 items visible in the viewport, plus a small overscan buffer. As the user scrolls, items outside the viewport are removed and new ones are added. Use react-virtual (TanStack Virtual) or react-window. Each item must have a known or estimated height.',
    examples: [
      `import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // estimated row height in px
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.key}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%',
              height: virtualRow.size, transform: \`translateY(\${virtualRow.start}px)\` }}>
            <ItemRow item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}`,
    ],
    relatedConcepts: ['lazy-loading', 'memoization', 'debounce-throttle'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  web_workers: {
    id: 'web-workers',
    name: 'Web Workers',
    category: 'performance',
    description: 'Run CPU-intensive code in a background thread to keep the UI responsive.',
    explanation: 'JavaScript is single-threaded. CPU-intensive operations (large data processing, complex calculations, CSV parsing) block the main thread and freeze the UI. Web Workers run code in a separate thread and communicate via postMessage. Use for: data transformation > 50ms, image processing, search indexing. Transfer large data with Transferable objects to avoid copying.',
    examples: [
      `// worker.ts
self.onmessage = (e: MessageEvent<{ data: any[]; sortKey: string }>) => {
  const sorted = [...e.data].sort((a, b) => a[e.data.sortKey] - b[e.data.sortKey]);
  self.postMessage(sorted);
};

// Component
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
worker.onmessage = (e) => setSortedData(e.data);
worker.postMessage({ data: largeArray, sortKey: 'price' });`,
    ],
    relatedConcepts: ['debounce-throttle', 'virtual-scrolling', 'lazy-loading'],
    difficulty: 'advanced',
    languages: ['typescript', 'javascript'],
  },

  image_optimization: {
    id: 'image-optimization',
    name: 'Image Optimization',
    category: 'performance',
    description: 'Reduce image payload sizes and improve load times with modern formats, lazy loading, and responsive images.',
    explanation: 'Images are often the largest assets on a page. Optimize with: (1) Modern formats — WebP is 25-35% smaller than JPEG, AVIF is 50% smaller. (2) Responsive images — serve different sizes for different viewports using srcset. (3) Lazy loading — defer off-screen images with loading="lazy". (4) Compression — use sharp or imagemin to compress during build. (5) CDN — serve from edge locations with automatic format negotiation.',
    examples: [
      `<img
  src="/images/hero-800.webp"
  srcSet="/images/hero-400.webp 400w, /images/hero-800.webp 800w, /images/hero-1200.webp 1200w"
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  loading="lazy"
  decoding="async"
  alt="Hero image"
  width={1200}
  height={600}
/>`,
      `function OptimizedImage({ src, alt, width, height, className }: ImageProps) {
  return (
    <picture>
      <source srcSet={src.replace(/\\.(jpg|png)$/, '.avif')} type="image/avif" />
      <source srcSet={src.replace(/\\.(jpg|png)$/, '.webp')} type="image/webp" />
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={className} />
    </picture>
  );
}`,
    ],
    relatedConcepts: ['lazy-loading', 'caching'],
    difficulty: 'intermediate',
    languages: ['html', 'typescript'],
  },

  // ── Accessibility ──────────────────────────────────────────────────────────

  accessibility_fundamentals: {
    id: 'accessibility',
    name: 'Web Accessibility (a11y)',
    category: 'accessibility',
    description: 'Building web applications usable by everyone, including people using assistive technologies.',
    explanation: 'Accessibility (a11y) ensures your app works for users with visual, motor, auditory, or cognitive disabilities. Key principles: (1) Semantic HTML — use button, nav, main, aside, not div for everything. (2) ARIA attributes — add roles and states when semantic HTML is insufficient. (3) Keyboard navigation — all interactive elements must be keyboard-reachable. (4) Color contrast — WCAG AA requires 4.5:1 for text. (5) Focus management — trap focus in modals, return focus on close.',
    examples: [
      `// Semantic HTML structure
<main>
  <h1>Dashboard</h1>
  <nav aria-label="Main navigation">
    <ul role="menubar">
      <li role="menuitem"><a href="/dashboard">Dashboard</a></li>
      <li role="menuitem"><a href="/settings">Settings</a></li>
    </ul>
  </nav>
  <section aria-labelledby="tasks-heading">
    <h2 id="tasks-heading">Recent Tasks</h2>
    <ul role="list">
      <li role="listitem">Task 1</li>
    </ul>
  </section>
</main>`,
      `// Accessible button with loading state
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  aria-busy={isSubmitting}
  aria-label={isSubmitting ? 'Submitting form' : 'Submit form'}
>
  {isSubmitting ? <Spinner aria-hidden="true" /> : null}
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>`,
    ],
    relatedConcepts: ['react-custom-hooks'],
    difficulty: 'intermediate',
    languages: ['html', 'typescript'],
  },

  focus_management: {
    id: 'focus-management',
    name: 'Focus Management',
    category: 'accessibility',
    description: 'Programmatically managing keyboard focus for modals, navigation, and dynamic content.',
    explanation: 'Focus management is critical for keyboard and screen reader users. Key patterns: (1) Focus trap in modals — Tab cycles only within the modal. (2) Return focus — when a modal closes, focus returns to the trigger button. (3) Skip links — allow keyboard users to jump to main content. (4) Auto-focus — focus the first input when a form opens. (5) Live regions — announce dynamic content changes to screen readers with aria-live.',
    examples: [
      `function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    el.addEventListener('keydown', handleKeyDown);
    first?.focus();
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [ref]);
}`,
    ],
    relatedConcepts: ['accessibility', 'react-portal'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Animation / UX ─────────────────────────────────────────────────────────

  css_animations: {
    id: 'css-animations',
    name: 'CSS Animations & Transitions',
    category: 'ux',
    description: 'Smooth visual feedback using CSS transitions and keyframe animations.',
    explanation: 'CSS animations are more performant than JS animations because they can be hardware-accelerated. Use transition for simple state changes (hover, focus, open/close). Use @keyframes for complex multi-step animations. Animate only transform and opacity — these are compositor-only properties that skip layout and paint. For Tailwind: use the animate-* utilities or add custom keyframes in tailwind.config.',
    examples: [
      `// Tailwind fade-in animation
<div className="animate-in fade-in duration-300">Content</div>

// Custom keyframes in tailwind.config.ts
animation: {
  'slide-in': 'slideIn 0.3s ease-out',
  'fade-up': 'fadeUp 0.4s ease-out',
},
keyframes: {
  slideIn: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
  fadeUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
}`,
      `// Transition for accordion/collapse
.accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out;
}
.accordion-content[data-open="true"] {
  grid-template-rows: 1fr;
}
.accordion-content > div {
  overflow: hidden;
}`,
    ],
    relatedConcepts: ['performance', 'accessibility'],
    difficulty: 'intermediate',
    languages: ['css', 'typescript'],
  },

  skeleton_loading: {
    id: 'skeleton-loading',
    name: 'Skeleton Loading States',
    category: 'ux',
    description: 'Show placeholder shapes that mirror the content layout while data loads.',
    explanation: 'Skeleton screens reduce perceived loading time by showing the shape of the content before data arrives. They are better than spinners because they set expectations about what will appear. Build skeletons that match the exact layout of the loaded content — same heights, widths, and spacing. Use CSS animation (shimmer effect) to indicate activity.',
    examples: [
      `function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4 border rounded-lg">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-20 bg-gray-200 rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
        <div className="h-6 w-12 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

function TaskList() {
  const { data, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
  return <div className="space-y-3">{data!.map(task => <TaskCard key={task.id} task={task} />)}</div>;
}`,
    ],
    relatedConcepts: ['react-suspense', 'accessibility'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  empty_states: {
    id: 'empty-states',
    name: 'Empty States & Zero Data',
    category: 'ux',
    description: 'Informative, actionable placeholders when there is no data to display.',
    explanation: 'Empty states are the first thing new users see. They should explain what the page is for and guide users to take their first action. Include: (1) an illustration or icon, (2) a clear heading ("No tasks yet"), (3) a brief description ("Create your first task to get started"), (4) a primary action button ("Create Task"). Never show a blank page or just "No data found".',
    examples: [
      `function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Usage:
{tasks.length === 0 ? (
  <EmptyState
    icon={<ClipboardIcon className="h-12 w-12" />}
    title="No tasks yet"
    description="Create your first task to start organizing your work."
    actionLabel="Create Task"
    onAction={() => setIsCreateOpen(true)}
  />
) : (
  <TaskList tasks={tasks} />
)}`,
    ],
    relatedConcepts: ['skeleton-loading', 'accessibility'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  // ── Testing ────────────────────────────────────────────────────────────────

  integration_testing: {
    id: 'integration-testing',
    name: 'Integration Testing (API Routes)',
    category: 'testing',
    description: 'Test API endpoints with a real database and HTTP calls, verifying the full request-response cycle.',
    explanation: 'Integration tests verify that your API routes, middleware, validation, database queries, and response formatting all work together. Use supertest to make HTTP requests to your Express app without starting a server. Use a real test database (not mocks). Run each test in a transaction that rolls back to keep tests isolated. Test: success paths, validation errors (422), not found (404), unauthorized (401), and server errors.',
    examples: [
      `import request from 'supertest';
import { app } from '../app';
import { db } from '../db';

describe('POST /api/tasks', () => {
  it('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', \`Bearer \${testToken}\`)
      .send({ title: 'Test task', status: 'active' })
      .expect(201);

    expect(res.body).toMatchObject({ title: 'Test task', status: 'active' });
    expect(res.body.id).toBeDefined();
  });

  it('returns 422 for invalid data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', \`Bearer \${testToken}\`)
      .send({ title: '' }) // Too short
      .expect(422);

    expect(res.body.errors).toBeDefined();
  });

  it('returns 401 without auth token', async () => {
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Test' })
      .expect(401);
  });
});`,
    ],
    relatedConcepts: ['unit-testing', 'tdd'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  component_testing: {
    id: 'component-testing',
    name: 'React Component Testing',
    category: 'testing',
    description: 'Test React components by rendering them and asserting on the DOM output and user interactions.',
    explanation: 'Use @testing-library/react to test components the way users interact with them. Query by role, label, and text — not by CSS class or data-testid. Test user interactions with fireEvent or userEvent. Mock API calls at the fetch/network level, not at the component level. Test: rendering, user interactions, loading/error states, and accessibility (roles, labels).',
    examples: [
      `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskForm } from './TaskForm';

test('submits form with valid data', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<TaskForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New task' } });
  fireEvent.click(screen.getByRole('button', { name: /create/i }));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New task' }));
  });
});

test('shows validation error for empty title', async () => {
  render(<TaskForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /create/i }));

  expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
});`,
    ],
    relatedConcepts: ['unit-testing', 'integration-testing', 'tdd'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Deployment / DevOps ────────────────────────────────────────────────────

  health_check: {
    id: 'health-check',
    name: 'Health Check Endpoint',
    category: 'deployment',
    description: 'An endpoint that reports the application status for load balancers and monitoring.',
    explanation: 'Health checks are used by load balancers, container orchestrators (Kubernetes), and monitoring systems to determine if your app is ready to serve traffic. Implement two endpoints: (1) /health/live — returns 200 if the process is running (liveness). (2) /health/ready — returns 200 only if all dependencies (DB, cache, external APIs) are reachable (readiness). If the DB is down, readiness fails and the load balancer stops sending traffic.',
    examples: [
      `app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/health/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await db.execute(sql\`SELECT 1\`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ready' : 'degraded', checks });
});`,
    ],
    relatedConcepts: ['middleware-pattern'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  structured_logging: {
    id: 'structured-logging',
    name: 'Structured Logging',
    category: 'deployment',
    description: 'Emit log entries as structured JSON objects instead of plain text for easier querying and analysis.',
    explanation: 'Structured logging outputs JSON lines that log aggregation tools (Datadog, Loki, CloudWatch) can parse, index, and query. Use pino (fastest Node.js logger) or winston. Include: timestamp, level, message, request ID, user ID, duration, and error details. Never log sensitive data (passwords, tokens, PII). Use log levels: error > warn > info > debug > trace.',
    examples: [
      `import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Request logging middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.log = logger.child({ requestId, method: req.method, path: req.path });
  const start = Date.now();
  res.on('finish', () => {
    req.log.info({ statusCode: res.statusCode, duration: Date.now() - start }, 'request completed');
  });
  next();
});

// Usage in route handlers:
req.log.info({ userId: req.user.id }, 'User fetched dashboard');
req.log.error({ err, orderId }, 'Failed to process order');`,
    ],
    relatedConcepts: ['health-check', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  graceful_shutdown: {
    id: 'graceful-shutdown',
    name: 'Graceful Shutdown',
    category: 'deployment',
    description: 'Close server connections and finish in-flight requests before the process exits.',
    explanation: 'When a container orchestrator sends SIGTERM, the app should: (1) Stop accepting new connections. (2) Wait for in-flight requests to complete (with a timeout). (3) Close database connections. (4) Then exit. Without graceful shutdown, active requests get dropped and database connections leak. Set a shutdown timeout (e.g., 30 seconds) to prevent hanging indefinitely.',
    examples: [
      `const server = app.listen(PORT, () => logger.info(\`Listening on :\${PORT}\`));

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database pool
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error({ err }, 'Error closing database pool');
  }

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));`,
    ],
    relatedConcepts: ['health-check', 'structured-logging', 'connection-pooling'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES: Record<string, EntityArchetype> = {

  // ── Portfolio Domain ───────────────────────────────────────────────────────

  project_showcase: {
    id: 'project-showcase',
    name: 'Portfolio Project',
    aliases: ['portfolio project', 'showcase', 'case study', 'work sample', 'portfolio item'],
    domain: 'portfolio',
    description: 'A project displayed in a portfolio to showcase skills and experience.',
    traits: ['pageable', 'searchable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(200) not null', nullable: false, description: 'Project title' },
      { name: 'slug', type: 'varchar(200) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Short description' },
      { name: 'longDescription', type: 'text', nullable: true, description: 'Full case study content' },
      { name: 'imageUrl', type: 'text', nullable: true, description: 'Cover image URL' },
      { name: 'images', type: 'jsonb', nullable: true, description: 'Gallery image URLs array' },
      { name: 'liveUrl', type: 'text', nullable: true, description: 'Live demo URL' },
      { name: 'githubUrl', type: 'text', nullable: true, description: 'Source code URL' },
      { name: 'techStack', type: 'text[]', nullable: true, description: 'Technologies used' },
      { name: 'category', type: 'varchar(50)', nullable: true, description: 'Project category' },
      { name: 'featured', type: 'boolean not null default false', nullable: false, description: 'Show on homepage' },
      { name: 'sortOrder', type: 'integer not null default 0', nullable: false, description: 'Display order' },
      { name: 'status', type: "varchar(20) not null default 'published'", nullable: false, description: 'published|draft' },
      { name: 'startDate', type: 'date', nullable: true, description: 'When the project started' },
      { name: 'endDate', type: 'date', nullable: true, description: 'When the project ended' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['skill', 'contact_message'],
    suggestedIndexes: ['slug (unique)', 'status', 'featured', '(status, sortOrder)', 'category'],
    typicalEndpoints: [
      'GET /projects?status=published&category=web',
      'GET /projects/:slug',
      'POST /projects',
      'PATCH /projects/:id',
      'DELETE /projects/:id',
    ],
  },

  skill: {
    id: 'skill',
    name: 'Skill',
    aliases: ['ability', 'competency', 'technology', 'expertise', 'proficiency'],
    domain: 'portfolio',
    description: 'A skill or technology proficiency displayed on a portfolio or resume.',
    traits: ['pageable', 'searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Skill name' },
      { name: 'category', type: 'varchar(50) not null', nullable: false, description: 'frontend|backend|database|devops|design|other' },
      { name: 'proficiency', type: 'integer', nullable: true, description: 'Proficiency level 1-100' },
      { name: 'iconUrl', type: 'text', nullable: true, description: 'Technology logo URL' },
      { name: 'sortOrder', type: 'integer not null default 0', nullable: false, description: 'Display order' },
      { name: 'yearsExperience', type: 'integer', nullable: true, description: 'Years of experience' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['project_showcase'],
    suggestedIndexes: ['category', 'sortOrder'],
    typicalEndpoints: [
      'GET /skills?category=frontend',
      'POST /skills',
      'PATCH /skills/:id',
      'DELETE /skills/:id',
    ],
  },

  contact_message: {
    id: 'contact-message',
    name: 'Contact Message',
    aliases: ['contact form', 'inquiry', 'message', 'contact submission'],
    domain: 'portfolio',
    description: 'A message submitted through a portfolio contact form.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Sender name' },
      { name: 'email', type: 'varchar(254) not null', nullable: false, description: 'Sender email' },
      { name: 'subject', type: 'varchar(200)', nullable: true, description: 'Message subject' },
      { name: 'message', type: 'text not null', nullable: false, description: 'Message body' },
      { name: 'read', type: 'boolean not null default false', nullable: false, description: 'Read status' },
      { name: 'repliedAt', type: 'timestamptz', nullable: true, description: 'When replied' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Received at' },
    ],
    relatedEntities: [],
    suggestedIndexes: ['read', 'createdAt'],
    typicalEndpoints: [
      'GET /messages?read=false',
      'POST /messages (public — no auth)',
      'PATCH /messages/:id/read',
      'DELETE /messages/:id',
    ],
  },

  // ── Blog Domain ────────────────────────────────────────────────────────────

  blog_post: {
    id: 'blog-post',
    name: 'Blog Post / Article',
    aliases: ['post', 'article', 'entry', 'content', 'blog entry', 'story'],
    domain: 'blog',
    description: 'A published article or blog post with rich content, categories, and comments.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'commentable', 'soft-deletable', 'versioned'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Post title' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Markdown or HTML content' },
      { name: 'excerpt', type: 'text', nullable: true, description: 'Short summary for listings' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Hero image' },
      { name: 'authorId', type: 'integer not null references users(id)', nullable: false, description: 'Post author' },
      { name: 'categoryId', type: 'integer references categories(id)', nullable: true, description: 'Primary category' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Tag array' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|published|archived' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publication date' },
      { name: 'readTimeMinutes', type: 'integer', nullable: true, description: 'Estimated read time' },
      { name: 'viewCount', type: 'integer not null default 0', nullable: false, description: 'Page views' },
      { name: 'metaTitle', type: 'varchar(100)', nullable: true, description: 'SEO title' },
      { name: 'metaDescription', type: 'varchar(300)', nullable: true, description: 'SEO description' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['user', 'category', 'tag', 'comment', 'subscriber'],
    suggestedIndexes: ['slug (unique)', 'status', 'authorId', 'categoryId', 'publishedAt', '(status, publishedAt DESC)', 'Full-text on (title, content)'],
    defaultWorkflow: {
      states: ['draft', 'review', 'published', 'archived'],
      transitions: [
        { from: 'draft', to: 'review', action: 'submit_for_review' },
        { from: 'review', to: 'published', action: 'publish' },
        { from: 'review', to: 'draft', action: 'request_changes' },
        { from: 'published', to: 'archived', action: 'archive' },
        { from: 'published', to: 'draft', action: 'unpublish' },
      ],
    },
    typicalEndpoints: [
      'GET /posts?status=published&page=1&category=tech',
      'GET /posts/:slug',
      'POST /posts',
      'PATCH /posts/:id',
      'PATCH /posts/:id/status',
      'DELETE /posts/:id',
    ],
  },

  // ── Booking Domain ─────────────────────────────────────────────────────────

  appointment: {
    id: 'appointment',
    name: 'Appointment / Booking',
    aliases: ['booking', 'reservation', 'slot', 'scheduled appointment', 'meeting'],
    domain: 'booking',
    description: 'A scheduled appointment between a service provider and customer.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'schedulable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'serviceId', type: 'integer not null references services(id)', nullable: false, description: 'Service being booked' },
      { name: 'staffId', type: 'integer not null references staff(id)', nullable: false, description: 'Staff providing service' },
      { name: 'customerId', type: 'integer references users(id)', nullable: true, description: 'Registered customer' },
      { name: 'customerName', type: 'varchar(200) not null', nullable: false, description: 'Customer name' },
      { name: 'customerEmail', type: 'varchar(254) not null', nullable: false, description: 'Customer email' },
      { name: 'customerPhone', type: 'varchar(30)', nullable: true, description: 'Customer phone' },
      { name: 'startTime', type: 'timestamptz not null', nullable: false, description: 'Appointment start' },
      { name: 'endTime', type: 'timestamptz not null', nullable: false, description: 'Appointment end' },
      { name: 'duration', type: 'integer not null', nullable: false, description: 'Duration in minutes' },
      { name: 'status', type: "varchar(20) not null default 'booked'", nullable: false, description: 'booked|confirmed|in-progress|completed|cancelled|no-show' },
      { name: 'notes', type: 'text', nullable: true, description: 'Customer notes' },
      { name: 'internalNotes', type: 'text', nullable: true, description: 'Staff-only notes' },
      { name: 'price', type: 'integer', nullable: true, description: 'Price in cents' },
      { name: 'cancelledAt', type: 'timestamptz', nullable: true, description: 'When cancelled' },
      { name: 'cancelReason', type: 'text', nullable: true, description: 'Cancellation reason' },
      { name: 'reminderSentAt', type: 'timestamptz', nullable: true, description: 'Reminder email timestamp' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['service', 'staff', 'user', 'availability'],
    suggestedIndexes: ['staffId', 'serviceId', 'customerId', 'status', 'startTime', '(staffId, startTime)', '(status, startTime)'],
    defaultWorkflow: {
      states: ['booked', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      transitions: [
        { from: 'booked', to: 'confirmed', action: 'confirm' },
        { from: 'confirmed', to: 'in-progress', action: 'start_service' },
        { from: 'in-progress', to: 'completed', action: 'complete' },
        { from: 'booked', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'no-show', action: 'mark_no_show' },
      ],
    },
    typicalEndpoints: [
      'GET /appointments?staffId=1&date=2024-01-15&status=booked',
      'GET /appointments/:id',
      'POST /appointments',
      'PATCH /appointments/:id',
      'PATCH /appointments/:id/status',
      'POST /appointments/:id/cancel',
      'GET /availability?staffId=1&date=2024-01-15',
    ],
  },

  service: {
    id: 'service',
    name: 'Service',
    aliases: ['service offering', 'service type', 'treatment', 'session type', 'package'],
    domain: 'booking',
    description: 'A bookable service offered by a business with duration and pricing.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Service name' },
      { name: 'description', type: 'text', nullable: true, description: 'Description' },
      { name: 'duration', type: 'integer not null', nullable: false, description: 'Duration in minutes' },
      { name: 'price', type: 'integer not null', nullable: false, description: 'Price in cents' },
      { name: 'categoryId', type: 'integer', nullable: true, description: 'Service category' },
      { name: 'imageUrl', type: 'text', nullable: true, description: 'Service image' },
      { name: 'color', type: 'varchar(7)', nullable: true, description: 'Calendar color' },
      { name: 'bufferBefore', type: 'integer not null default 0', nullable: false, description: 'Buffer minutes before' },
      { name: 'bufferAfter', type: 'integer not null default 0', nullable: false, description: 'Buffer minutes after' },
      { name: 'maxAdvanceBookingDays', type: 'integer not null default 30', nullable: false, description: 'How far ahead bookable' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|inactive' },
      { name: 'sortOrder', type: 'integer not null default 0', nullable: false, description: 'Display order' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['appointment', 'staff', 'service_category'],
    suggestedIndexes: ['status', 'categoryId', '(status, sortOrder)'],
    typicalEndpoints: [
      'GET /services?status=active',
      'GET /services/:id',
      'POST /services',
      'PATCH /services/:id',
    ],
  },

  // ── Event Management Domain ────────────────────────────────────────────────

  event: {
    id: 'event',
    name: 'Event',
    aliases: ['conference', 'meetup', 'workshop', 'webinar', 'gathering', 'session'],
    domain: 'event-management',
    description: 'A scheduled event with venue, ticketing, and attendee management.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'soft-deletable', 'schedulable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Event title' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Event description' },
      { name: 'startDate', type: 'timestamptz not null', nullable: false, description: 'Event start' },
      { name: 'endDate', type: 'timestamptz not null', nullable: false, description: 'Event end' },
      { name: 'timezone', type: 'varchar(50)', nullable: true, description: 'Event timezone' },
      { name: 'venueId', type: 'integer references venues(id)', nullable: true, description: 'Event venue' },
      { name: 'isOnline', type: 'boolean not null default false', nullable: false, description: 'Virtual event flag' },
      { name: 'meetingUrl', type: 'text', nullable: true, description: 'Virtual meeting link' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Cover image' },
      { name: 'category', type: 'varchar(50)', nullable: true, description: 'Event category' },
      { name: 'capacity', type: 'integer', nullable: true, description: 'Max attendees' },
      { name: 'registeredCount', type: 'integer not null default 0', nullable: false, description: 'Current registrations' },
      { name: 'organizerId', type: 'integer not null references users(id)', nullable: false, description: 'Event organizer' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|published|cancelled|completed' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Event tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['venue', 'ticket_type', 'ticket', 'attendee', 'user', 'speaker'],
    suggestedIndexes: ['slug (unique)', 'status', 'organizerId', 'startDate', 'category', '(status, startDate)', 'Full-text on (title, description)'],
    defaultWorkflow: {
      states: ['draft', 'published', 'cancelled', 'completed'],
      transitions: [
        { from: 'draft', to: 'published', action: 'publish' },
        { from: 'published', to: 'cancelled', action: 'cancel' },
        { from: 'published', to: 'completed', action: 'mark_completed' },
      ],
    },
    typicalEndpoints: [
      'GET /events?status=published&category=tech&upcoming=true',
      'GET /events/:slug',
      'POST /events',
      'PATCH /events/:id',
      'PATCH /events/:id/status',
      'GET /events/:id/attendees',
    ],
  },

  ticket: {
    id: 'ticket-event',
    name: 'Event Ticket',
    aliases: ['event ticket', 'admission', 'pass', 'registration ticket'],
    domain: 'event-management',
    description: 'A purchased or reserved ticket for an event.',
    traits: ['pageable', 'searchable', 'workflowable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'ticketTypeId', type: 'integer not null references ticket_types(id)', nullable: false, description: 'Ticket type' },
      { name: 'attendeeId', type: 'integer not null references attendees(id)', nullable: false, description: 'Attendee' },
      { name: 'ticketNumber', type: 'varchar(50) not null unique', nullable: false, description: 'Unique ticket code' },
      { name: 'qrCode', type: 'text', nullable: true, description: 'QR code data' },
      { name: 'status', type: "varchar(20) not null default 'valid'", nullable: false, description: 'valid|used|cancelled|refunded' },
      { name: 'checkedInAt', type: 'timestamptz', nullable: true, description: 'Check-in timestamp' },
      { name: 'purchasedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Purchase time' },
    ],
    relatedEntities: ['ticket_type', 'attendee', 'event'],
    suggestedIndexes: ['ticketNumber (unique)', 'ticketTypeId', 'attendeeId', 'status'],
    defaultWorkflow: {
      states: ['valid', 'used', 'cancelled', 'refunded'],
      transitions: [
        { from: 'valid', to: 'used', action: 'check_in' },
        { from: 'valid', to: 'cancelled', action: 'cancel' },
        { from: 'valid', to: 'refunded', action: 'refund' },
      ],
    },
    typicalEndpoints: [
      'GET /events/:eventId/tickets',
      'POST /events/:eventId/tickets',
      'POST /tickets/:id/check-in',
      'POST /tickets/:id/cancel',
    ],
  },

  // ── Social Network Domain ──────────────────────────────────────────────────

  social_post: {
    id: 'social-post',
    name: 'Social Post / Status',
    aliases: ['status update', 'post', 'tweet', 'update', 'social update'],
    domain: 'social',
    description: 'A user-generated post in a social feed with likes and comments.',
    traits: ['pageable', 'searchable', 'commentable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'authorId', type: 'integer not null references users(id)', nullable: false, description: 'Post author' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Post content' },
      { name: 'imageUrl', type: 'text', nullable: true, description: 'Attached image' },
      { name: 'images', type: 'jsonb', nullable: true, description: 'Multiple attached images' },
      { name: 'likeCount', type: 'integer not null default 0', nullable: false, description: 'Like counter (denormalized)' },
      { name: 'commentCount', type: 'integer not null default 0', nullable: false, description: 'Comment counter' },
      { name: 'shareCount', type: 'integer not null default 0', nullable: false, description: 'Share/repost counter' },
      { name: 'hashtags', type: 'text[]', nullable: true, description: 'Extracted hashtags' },
      { name: 'visibility', type: "varchar(20) not null default 'public'", nullable: false, description: 'public|followers|private' },
      { name: 'parentId', type: 'integer references posts(id)', nullable: true, description: 'Repost/quote parent' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Post time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Edit time' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['user', 'like', 'comment', 'follow', 'notification'],
    suggestedIndexes: ['authorId', 'createdAt DESC', '(authorId, createdAt DESC)', 'visibility', 'hashtags (GIN)'],
    typicalEndpoints: [
      'GET /feed?cursor=xxx&limit=20',
      'GET /posts/:id',
      'POST /posts',
      'PATCH /posts/:id',
      'DELETE /posts/:id',
      'POST /posts/:id/like',
      'DELETE /posts/:id/like',
      'GET /posts/:id/comments',
    ],
  },

  user_profile: {
    id: 'user-profile',
    name: 'User Profile',
    aliases: ['profile', 'member profile', 'social profile', 'account'],
    domain: 'social',
    description: 'Extended user profile with bio, avatar, and social stats.',
    traits: ['searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null unique references users(id)', nullable: false, description: 'User account' },
      { name: 'username', type: 'varchar(30) not null unique', nullable: false, description: 'Unique handle' },
      { name: 'displayName', type: 'varchar(100) not null', nullable: false, description: 'Display name' },
      { name: 'bio', type: 'varchar(500)', nullable: true, description: 'Short bio' },
      { name: 'avatarUrl', type: 'text', nullable: true, description: 'Profile picture' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Cover/banner image' },
      { name: 'website', type: 'text', nullable: true, description: 'Personal website' },
      { name: 'location', type: 'varchar(100)', nullable: true, description: 'Location' },
      { name: 'followerCount', type: 'integer not null default 0', nullable: false, description: 'Denormalized follower count' },
      { name: 'followingCount', type: 'integer not null default 0', nullable: false, description: 'Denormalized following count' },
      { name: 'postCount', type: 'integer not null default 0', nullable: false, description: 'Denormalized post count' },
      { name: 'isVerified', type: 'boolean not null default false', nullable: false, description: 'Verified badge' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Profile creation' },
    ],
    relatedEntities: ['user', 'social_post', 'follow'],
    suggestedIndexes: ['userId (unique)', 'username (unique)', 'displayName'],
    typicalEndpoints: [
      'GET /profiles/:username',
      'PATCH /profiles/me',
      'GET /profiles/:username/followers',
      'GET /profiles/:username/following',
      'POST /profiles/:username/follow',
      'DELETE /profiles/:username/follow',
    ],
  },

  // ── Chat / Messaging Domain ────────────────────────────────────────────────

  conversation: {
    id: 'conversation',
    name: 'Conversation / Chat',
    aliases: ['chat', 'thread', 'direct message', 'dm', 'group chat', 'channel'],
    domain: 'chat',
    description: 'A conversation containing messages between two or more participants.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(200)', nullable: true, description: 'Group name (null for DMs)' },
      { name: 'type', type: "varchar(20) not null default 'direct'", nullable: false, description: 'direct|group|channel' },
      { name: 'avatarUrl', type: 'text', nullable: true, description: 'Group avatar' },
      { name: 'lastMessageId', type: 'integer', nullable: true, description: 'Last message reference' },
      { name: 'lastMessageAt', type: 'timestamptz', nullable: true, description: 'Time of last message' },
      { name: 'lastMessagePreview', type: 'varchar(200)', nullable: true, description: 'Preview text' },
      { name: 'memberCount', type: 'integer not null default 2', nullable: false, description: 'Number of participants' },
      { name: 'createdById', type: 'integer not null references users(id)', nullable: false, description: 'Creator' },
      { name: 'isArchived', type: 'boolean not null default false', nullable: false, description: 'Archived flag' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
    ],
    relatedEntities: ['message', 'participant', 'user'],
    suggestedIndexes: ['type', 'lastMessageAt DESC', 'createdById', 'isArchived'],
    typicalEndpoints: [
      'GET /conversations?type=direct',
      'GET /conversations/:id',
      'POST /conversations',
      'GET /conversations/:id/messages?cursor=xxx&limit=50',
      'POST /conversations/:id/messages',
    ],
  },

  chat_message: {
    id: 'chat-message',
    name: 'Chat Message',
    aliases: ['message', 'im', 'chat entry'],
    domain: 'chat',
    description: 'A single message in a conversation with optional attachments.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'conversationId', type: 'integer not null references conversations(id)', nullable: false, description: 'Parent conversation' },
      { name: 'senderId', type: 'integer not null references users(id)', nullable: false, description: 'Message sender' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Message text' },
      { name: 'type', type: "varchar(20) not null default 'text'", nullable: false, description: 'text|image|file|system' },
      { name: 'attachmentUrl', type: 'text', nullable: true, description: 'File attachment URL' },
      { name: 'attachmentName', type: 'varchar(200)', nullable: true, description: 'Original filename' },
      { name: 'replyToId', type: 'integer references messages(id)', nullable: true, description: 'Reply-to message' },
      { name: 'edited', type: 'boolean not null default false', nullable: false, description: 'Was edited' },
      { name: 'editedAt', type: 'timestamptz', nullable: true, description: 'Edit time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Send time' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['conversation', 'user', 'read_receipt'],
    suggestedIndexes: ['conversationId', '(conversationId, createdAt)', 'senderId', 'Full-text on content'],
    typicalEndpoints: [
      'GET /conversations/:id/messages?before=timestamp&limit=50',
      'POST /conversations/:id/messages',
      'PATCH /messages/:id',
      'DELETE /messages/:id',
    ],
  },

  // ── SaaS / Dashboard Domain ────────────────────────────────────────────────

  subscription: {
    id: 'subscription',
    name: 'Subscription',
    aliases: ['plan subscription', 'membership', 'license', 'billing subscription'],
    domain: 'saas',
    description: 'A user or team subscription to a SaaS plan with billing lifecycle.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Subscriber' },
      { name: 'planId', type: 'integer not null references plans(id)', nullable: false, description: 'Plan' },
      { name: 'status', type: "varchar(20) not null default 'trialing'", nullable: false, description: 'trialing|active|past-due|cancelled|expired' },
      { name: 'currentPeriodStart', type: 'timestamptz not null', nullable: false, description: 'Billing period start' },
      { name: 'currentPeriodEnd', type: 'timestamptz not null', nullable: false, description: 'Billing period end' },
      { name: 'cancelledAt', type: 'timestamptz', nullable: true, description: 'Cancellation time' },
      { name: 'cancelAtPeriodEnd', type: 'boolean not null default false', nullable: false, description: 'Cancel at end of period' },
      { name: 'trialEndsAt', type: 'timestamptz', nullable: true, description: 'Trial end date' },
      { name: 'externalId', type: 'varchar(100)', nullable: true, description: 'Stripe/Paddle subscription ID' },
      { name: 'metadata', type: 'jsonb', nullable: true, description: 'Additional metadata' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'plan', 'invoice', 'usage_event'],
    suggestedIndexes: ['userId', 'planId', 'status', 'externalId', '(userId, status)', 'currentPeriodEnd'],
    defaultWorkflow: {
      states: ['trialing', 'active', 'past-due', 'cancelled', 'expired'],
      transitions: [
        { from: 'trialing', to: 'active', action: 'activate' },
        { from: 'trialing', to: 'cancelled', action: 'cancel' },
        { from: 'active', to: 'past-due', action: 'payment_failed' },
        { from: 'past-due', to: 'active', action: 'payment_succeeded' },
        { from: 'active', to: 'cancelled', action: 'cancel' },
        { from: 'past-due', to: 'cancelled', action: 'cancel' },
        { from: 'cancelled', to: 'expired', action: 'period_ended' },
      ],
    },
    typicalEndpoints: [
      'GET /subscriptions?status=active',
      'GET /subscriptions/:id',
      'POST /subscriptions',
      'PATCH /subscriptions/:id',
      'POST /subscriptions/:id/cancel',
      'POST /subscriptions/:id/resume',
      'POST /billing/portal',
    ],
  },

  // ── Forum Domain ───────────────────────────────────────────────────────────

  forum_thread: {
    id: 'forum-thread',
    name: 'Forum Thread / Discussion',
    aliases: ['thread', 'topic', 'discussion', 'question', 'post'],
    domain: 'forum',
    description: 'A discussion thread in a forum with replies, voting, and moderation.',
    traits: ['pageable', 'auditable', 'searchable', 'commentable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Thread title' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Original post content' },
      { name: 'authorId', type: 'integer not null references users(id)', nullable: false, description: 'Thread author' },
      { name: 'categoryId', type: 'integer not null references categories(id)', nullable: false, description: 'Forum category' },
      { name: 'upvotes', type: 'integer not null default 0', nullable: false, description: 'Upvote count' },
      { name: 'downvotes', type: 'integer not null default 0', nullable: false, description: 'Downvote count' },
      { name: 'replyCount', type: 'integer not null default 0', nullable: false, description: 'Reply count' },
      { name: 'viewCount', type: 'integer not null default 0', nullable: false, description: 'View count' },
      { name: 'isPinned', type: 'boolean not null default false', nullable: false, description: 'Pinned to top' },
      { name: 'isLocked', type: 'boolean not null default false', nullable: false, description: 'Locked for replies' },
      { name: 'acceptedReplyId', type: 'integer', nullable: true, description: 'Accepted answer (Q&A)' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Thread tags' },
      { name: 'status', type: "varchar(20) not null default 'open'", nullable: false, description: 'open|closed|deleted' },
      { name: 'lastActivityAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last reply time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last edit' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['user', 'category', 'reply', 'vote'],
    suggestedIndexes: ['authorId', 'categoryId', 'status', 'lastActivityAt DESC', 'isPinned', '(categoryId, lastActivityAt DESC)', '(categoryId, isPinned, lastActivityAt DESC)', 'tags (GIN)', 'Full-text on (title, content)'],
    typicalEndpoints: [
      'GET /threads?category=general&sort=latest&page=1',
      'GET /threads/:id',
      'POST /threads',
      'PATCH /threads/:id',
      'POST /threads/:id/vote',
      'POST /threads/:id/pin',
      'POST /threads/:id/lock',
      'GET /threads/:id/replies',
    ],
  },

  // ── Job Board Domain ───────────────────────────────────────────────────────

  job_listing: {
    id: 'job-listing',
    name: 'Job Listing',
    aliases: ['job', 'position', 'vacancy', 'opening', 'job post', 'career opportunity'],
    domain: 'job-board',
    description: 'A job opening posted by a company on a job board.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Job title' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Full job description' },
      { name: 'requirements', type: 'text', nullable: true, description: 'Requirements' },
      { name: 'responsibilities', type: 'text', nullable: true, description: 'Responsibilities' },
      { name: 'benefits', type: 'text', nullable: true, description: 'Benefits/perks' },
      { name: 'companyId', type: 'integer not null references companies(id)', nullable: false, description: 'Hiring company' },
      { name: 'location', type: 'varchar(200)', nullable: true, description: 'Job location' },
      { name: 'isRemote', type: 'boolean not null default false', nullable: false, description: 'Remote position' },
      { name: 'type', type: "varchar(30) not null default 'full-time'", nullable: false, description: 'full-time|part-time|contract|internship' },
      { name: 'experienceLevel', type: 'varchar(30)', nullable: true, description: 'entry|mid|senior|lead' },
      { name: 'salaryMin', type: 'integer', nullable: true, description: 'Salary minimum (annual, cents)' },
      { name: 'salaryMax', type: 'integer', nullable: true, description: 'Salary maximum (annual, cents)' },
      { name: 'salaryCurrency', type: "varchar(3) default 'USD'", nullable: true, description: 'Currency code' },
      { name: 'skills', type: 'text[]', nullable: true, description: 'Required skills' },
      { name: 'category', type: 'varchar(50)', nullable: true, description: 'Job category' },
      { name: 'applicationCount', type: 'integer not null default 0', nullable: false, description: 'Applications received' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|active|closed|expired' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publication date' },
      { name: 'expiresAt', type: 'timestamptz', nullable: true, description: 'Listing expiry' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['company', 'job_application', 'user'],
    suggestedIndexes: ['slug (unique)', 'companyId', 'status', 'location', 'type', 'isRemote', 'category', '(status, publishedAt DESC)', '(status, isRemote, type)', 'skills (GIN)', 'Full-text on (title, description)'],
    defaultWorkflow: {
      states: ['draft', 'active', 'closed', 'expired'],
      transitions: [
        { from: 'draft', to: 'active', action: 'publish' },
        { from: 'active', to: 'closed', action: 'close' },
        { from: 'active', to: 'expired', action: 'expire' },
        { from: 'closed', to: 'active', action: 'reopen' },
      ],
    },
    typicalEndpoints: [
      'GET /jobs?status=active&location=remote&type=full-time&page=1',
      'GET /jobs/:slug',
      'POST /jobs',
      'PATCH /jobs/:id',
      'PATCH /jobs/:id/status',
      'GET /jobs/:id/applications',
    ],
  },

  job_application: {
    id: 'job-application',
    name: 'Job Application',
    aliases: ['application', 'applicant', 'candidate', 'resume submission'],
    domain: 'job-board',
    description: 'An application submitted by a candidate for a specific job listing.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'attachable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'jobId', type: 'integer not null references jobs(id)', nullable: false, description: 'Applied job' },
      { name: 'applicantId', type: 'integer references users(id)', nullable: true, description: 'Registered applicant' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Applicant name' },
      { name: 'email', type: 'varchar(254) not null', nullable: false, description: 'Applicant email' },
      { name: 'phone', type: 'varchar(30)', nullable: true, description: 'Phone number' },
      { name: 'resumeUrl', type: 'text', nullable: true, description: 'Resume/CV file' },
      { name: 'coverLetter', type: 'text', nullable: true, description: 'Cover letter text' },
      { name: 'linkedinUrl', type: 'text', nullable: true, description: 'LinkedIn profile' },
      { name: 'portfolioUrl', type: 'text', nullable: true, description: 'Portfolio URL' },
      { name: 'status', type: "varchar(30) not null default 'submitted'", nullable: false, description: 'submitted|reviewing|shortlisted|interview|offered|hired|rejected|withdrawn' },
      { name: 'rating', type: 'integer', nullable: true, description: 'Internal rating 1-5' },
      { name: 'notes', type: 'text', nullable: true, description: 'Internal recruiter notes' },
      { name: 'interviewDate', type: 'timestamptz', nullable: true, description: 'Scheduled interview' },
      { name: 'rejectedAt', type: 'timestamptz', nullable: true, description: 'Rejection time' },
      { name: 'rejectionReason', type: 'text', nullable: true, description: 'Rejection reason' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Applied at' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['job_listing', 'user', 'interview'],
    suggestedIndexes: ['jobId', 'applicantId', 'email', 'status', '(jobId, status)', '(jobId, createdAt DESC)'],
    defaultWorkflow: {
      states: ['submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'],
      transitions: [
        { from: 'submitted', to: 'reviewing', action: 'start_review' },
        { from: 'reviewing', to: 'shortlisted', action: 'shortlist' },
        { from: 'shortlisted', to: 'interview', action: 'schedule_interview' },
        { from: 'interview', to: 'offered', action: 'make_offer' },
        { from: 'offered', to: 'hired', action: 'accept_offer' },
        { from: 'reviewing', to: 'rejected', action: 'reject' },
        { from: 'shortlisted', to: 'rejected', action: 'reject' },
        { from: 'interview', to: 'rejected', action: 'reject' },
      ],
    },
    typicalEndpoints: [
      'GET /jobs/:jobId/applications?status=submitted&page=1',
      'GET /applications/:id',
      'POST /jobs/:jobId/apply',
      'PATCH /applications/:id/status',
      'GET /applications/me',
    ],
  },

  // ── Recipe Domain ──────────────────────────────────────────────────────────

  recipe: {
    id: 'recipe',
    name: 'Recipe',
    aliases: ['dish', 'meal', 'food recipe', 'cooking recipe', 'cookbook entry'],
    domain: 'recipe',
    description: 'A cooking recipe with ingredients, instructions, and nutritional information.',
    traits: ['pageable', 'searchable', 'taggable', 'commentable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(200) not null', nullable: false, description: 'Recipe title' },
      { name: 'slug', type: 'varchar(200) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Short description' },
      { name: 'instructions', type: 'text not null', nullable: false, description: 'Step-by-step instructions (markdown)' },
      { name: 'prepTime', type: 'integer', nullable: true, description: 'Prep time in minutes' },
      { name: 'cookTime', type: 'integer', nullable: true, description: 'Cook time in minutes' },
      { name: 'totalTime', type: 'integer', nullable: true, description: 'Total time in minutes' },
      { name: 'servings', type: 'integer not null', nullable: false, description: 'Number of servings' },
      { name: 'difficulty', type: "varchar(20) not null default 'medium'", nullable: false, description: 'easy|medium|hard' },
      { name: 'cuisine', type: 'varchar(50)', nullable: true, description: 'Cuisine type' },
      { name: 'course', type: 'varchar(50)', nullable: true, description: 'appetizer|main|dessert|snack|drink' },
      { name: 'imageUrl', type: 'text', nullable: true, description: 'Recipe photo' },
      { name: 'calories', type: 'integer', nullable: true, description: 'Calories per serving' },
      { name: 'protein', type: 'numeric(6,1)', nullable: true, description: 'Protein per serving (g)' },
      { name: 'carbs', type: 'numeric(6,1)', nullable: true, description: 'Carbs per serving (g)' },
      { name: 'fat', type: 'numeric(6,1)', nullable: true, description: 'Fat per serving (g)' },
      { name: 'dietaryTags', type: 'text[]', nullable: true, description: 'vegetarian|vegan|gluten-free|dairy-free|keto|paleo' },
      { name: 'authorId', type: 'integer references users(id)', nullable: true, description: 'Recipe author' },
      { name: 'rating', type: 'numeric(3,2)', nullable: true, description: 'Average rating 1.00-5.00' },
      { name: 'ratingCount', type: 'integer not null default 0', nullable: false, description: 'Number of ratings' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Tags' },
      { name: 'status', type: "varchar(20) not null default 'published'", nullable: false, description: 'published|draft' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['ingredient', 'comment', 'meal_plan', 'user'],
    suggestedIndexes: ['slug (unique)', 'status', 'authorId', 'cuisine', 'difficulty', 'dietaryTags (GIN)', 'tags (GIN)', '(status, rating DESC)', 'Full-text on (title, description)'],
    typicalEndpoints: [
      'GET /recipes?cuisine=italian&difficulty=easy&dietary=vegetarian&page=1',
      'GET /recipes/:slug',
      'POST /recipes',
      'PATCH /recipes/:id',
      'POST /recipes/:id/rate',
      'GET /recipes/:id/ingredients',
    ],
  },

  // ── Analytics Domain ───────────────────────────────────────────────────────

  dashboard_widget: {
    id: 'dashboard-widget',
    name: 'Dashboard Widget',
    aliases: ['widget', 'chart', 'metric card', 'dashboard component', 'visualization'],
    domain: 'analytics',
    description: 'A configurable widget on a dashboard displaying data through charts, KPIs, or tables.',
    traits: ['pageable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'dashboardId', type: 'integer not null references dashboards(id)', nullable: false, description: 'Parent dashboard' },
      { name: 'type', type: "varchar(30) not null default 'kpi-card'", nullable: false, description: 'kpi-card|line-chart|bar-chart|pie-chart|table|area-chart|donut-chart|number' },
      { name: 'title', type: 'varchar(200) not null', nullable: false, description: 'Widget title' },
      { name: 'dataSourceId', type: 'integer', nullable: true, description: 'Data source reference' },
      { name: 'config', type: 'jsonb not null', nullable: false, description: 'Chart configuration (metrics, dimensions, filters)' },
      { name: 'position', type: 'jsonb not null', nullable: false, description: '{ x, y, w, h } grid position' },
      { name: 'refreshInterval', type: 'integer', nullable: true, description: 'Auto-refresh interval in seconds' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['dashboard', 'data_source'],
    suggestedIndexes: ['dashboardId', '(dashboardId, position)'],
    typicalEndpoints: [
      'GET /dashboards/:id/widgets',
      'POST /dashboards/:id/widgets',
      'PATCH /widgets/:id',
      'PATCH /widgets/:id/position',
      'DELETE /widgets/:id',
    ],
  },

  // ── Gaming Domain ──────────────────────────────────────────────────────────

  player: {
    id: 'player',
    name: 'Player / Gamer',
    aliases: ['gamer', 'user player', 'game user', 'competitor'],
    domain: 'gaming',
    description: 'A player profile in a gaming platform with stats, achievements, and score history.',
    traits: ['pageable', 'searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null unique references users(id)', nullable: false, description: 'User account' },
      { name: 'username', type: 'varchar(30) not null unique', nullable: false, description: 'In-game name' },
      { name: 'displayName', type: 'varchar(100)', nullable: true, description: 'Display name' },
      { name: 'avatarUrl', type: 'text', nullable: true, description: 'Player avatar' },
      { name: 'level', type: 'integer not null default 1', nullable: false, description: 'Player level' },
      { name: 'experience', type: 'integer not null default 0', nullable: false, description: 'Total XP' },
      { name: 'totalScore', type: 'integer not null default 0', nullable: false, description: 'Lifetime score' },
      { name: 'highScore', type: 'integer not null default 0', nullable: false, description: 'Best single-game score' },
      { name: 'gamesPlayed', type: 'integer not null default 0', nullable: false, description: 'Games played' },
      { name: 'gamesWon', type: 'integer not null default 0', nullable: false, description: 'Games won' },
      { name: 'rank', type: 'varchar(30)', nullable: true, description: 'Rank title (Bronze, Silver, Gold)' },
      { name: 'achievementCount', type: 'integer not null default 0', nullable: false, description: 'Achievements earned' },
      { name: 'lastPlayedAt', type: 'timestamptz', nullable: true, description: 'Last game time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Profile creation' },
    ],
    relatedEntities: ['user', 'score', 'achievement', 'player_achievement'],
    suggestedIndexes: ['userId (unique)', 'username (unique)', 'totalScore DESC', 'level', 'rank', 'highScore DESC'],
    typicalEndpoints: [
      'GET /players/:username',
      'GET /leaderboard?sort=highScore&limit=100',
      'GET /players/:id/scores',
      'GET /players/:id/achievements',
    ],
  },

  // ── Documentation Domain ───────────────────────────────────────────────────

  doc_page: {
    id: 'doc-page',
    name: 'Documentation Page',
    aliases: ['doc', 'wiki page', 'help article', 'knowledge base article', 'guide'],
    domain: 'documentation',
    description: 'A page in a documentation site or wiki with markdown content and hierarchical navigation.',
    traits: ['pageable', 'searchable', 'versioned', 'hierarchical', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Page title' },
      { name: 'slug', type: 'varchar(300) not null', nullable: false, description: 'URL path slug' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Markdown content' },
      { name: 'sectionId', type: 'integer references doc_sections(id)', nullable: true, description: 'Parent section' },
      { name: 'parentId', type: 'integer references doc_pages(id)', nullable: true, description: 'Parent page (for nesting)' },
      { name: 'sortOrder', type: 'integer not null default 0', nullable: false, description: 'Order within section' },
      { name: 'version', type: 'varchar(20)', nullable: true, description: 'Documentation version' },
      { name: 'status', type: "varchar(20) not null default 'published'", nullable: false, description: 'published|draft|archived' },
      { name: 'lastEditedBy', type: 'varchar(100)', nullable: true, description: 'Last editor' },
      { name: 'viewCount', type: 'integer not null default 0', nullable: false, description: 'Page views' },
      { name: 'helpfulYes', type: 'integer not null default 0', nullable: false, description: 'Helpful votes' },
      { name: 'helpfulNo', type: 'integer not null default 0', nullable: false, description: 'Not helpful votes' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['doc_section', 'doc_page'],
    suggestedIndexes: ['slug', 'sectionId', 'parentId', 'status', '(sectionId, sortOrder)', 'version', 'Full-text on (title, content)'],
    typicalEndpoints: [
      'GET /docs?section=getting-started&version=v2',
      'GET /docs/:slug',
      'POST /docs',
      'PATCH /docs/:id',
      'GET /docs/search?q=authentication',
      'POST /docs/:id/helpful',
    ],
  },

  // ── Landing Page Domain ────────────────────────────────────────────────────

  lead: {
    id: 'lead',
    name: 'Lead / Signup',
    aliases: ['prospect', 'signup', 'waitlist entry', 'interested party', 'subscriber'],
    domain: 'landing-page',
    description: 'A lead captured from a landing page form, waitlist, or newsletter signup.',
    traits: ['pageable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'email', type: 'varchar(254) not null', nullable: false, description: 'Lead email' },
      { name: 'name', type: 'varchar(200)', nullable: true, description: 'Lead name' },
      { name: 'company', type: 'varchar(200)', nullable: true, description: 'Company name' },
      { name: 'phone', type: 'varchar(30)', nullable: true, description: 'Phone number' },
      { name: 'source', type: 'varchar(50)', nullable: true, description: 'Acquisition source (organic, paid, referral)' },
      { name: 'utmSource', type: 'varchar(100)', nullable: true, description: 'UTM source' },
      { name: 'utmMedium', type: 'varchar(100)', nullable: true, description: 'UTM medium' },
      { name: 'utmCampaign', type: 'varchar(100)', nullable: true, description: 'UTM campaign' },
      { name: 'status', type: "varchar(20) not null default 'new'", nullable: false, description: 'new|contacted|qualified|converted|lost' },
      { name: 'notes', type: 'text', nullable: true, description: 'Internal notes' },
      { name: 'convertedAt', type: 'timestamptz', nullable: true, description: 'Conversion time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Capture time' },
    ],
    relatedEntities: [],
    suggestedIndexes: ['email', 'status', 'source', 'createdAt DESC', '(status, createdAt DESC)'],
    defaultWorkflow: {
      states: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      transitions: [
        { from: 'new', to: 'contacted', action: 'contact' },
        { from: 'contacted', to: 'qualified', action: 'qualify' },
        { from: 'qualified', to: 'converted', action: 'convert' },
        { from: 'contacted', to: 'lost', action: 'mark_lost' },
        { from: 'qualified', to: 'lost', action: 'mark_lost' },
      ],
    },
    typicalEndpoints: [
      'GET /leads?status=new&page=1',
      'POST /leads (public — no auth, rate limited)',
      'PATCH /leads/:id',
      'PATCH /leads/:id/status',
      'GET /leads/export?format=csv',
    ],
  },

  // ── News / Media Domain ────────────────────────────────────────────────────

  news_article: {
    id: 'news-article',
    name: 'News Article',
    aliases: ['article', 'news story', 'piece', 'report', 'news post', 'press release'],
    domain: 'news',
    description: 'A news article with editorial workflow, byline, and breaking news support.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'commentable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Headline' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'subheadline', type: 'varchar(300)', nullable: true, description: 'Sub-headline' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Article body' },
      { name: 'excerpt', type: 'text', nullable: true, description: 'Summary' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Hero image' },
      { name: 'imageCaption', type: 'varchar(300)', nullable: true, description: 'Image caption' },
      { name: 'authorId', type: 'integer not null references authors(id)', nullable: false, description: 'Reporter/writer' },
      { name: 'categoryId', type: 'integer references categories(id)', nullable: true, description: 'News section' },
      { name: 'isBreaking', type: 'boolean not null default false', nullable: false, description: 'Breaking news flag' },
      { name: 'isFeatured', type: 'boolean not null default false', nullable: false, description: 'Featured on homepage' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Article tags' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|review|published|archived' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publication date' },
      { name: 'viewCount', type: 'integer not null default 0', nullable: false, description: 'Page views' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['author', 'category', 'comment', 'tag'],
    suggestedIndexes: ['slug (unique)', 'authorId', 'categoryId', 'status', 'isBreaking', 'isFeatured', 'publishedAt DESC', '(status, publishedAt DESC)', 'tags (GIN)', 'Full-text on (title, content)'],
    defaultWorkflow: {
      states: ['draft', 'review', 'published', 'archived'],
      transitions: [
        { from: 'draft', to: 'review', action: 'submit_for_review' },
        { from: 'review', to: 'published', action: 'publish' },
        { from: 'review', to: 'draft', action: 'request_changes' },
        { from: 'published', to: 'archived', action: 'archive' },
      ],
    },
    typicalEndpoints: [
      'GET /articles?status=published&category=technology&page=1',
      'GET /articles/:slug',
      'POST /articles',
      'PATCH /articles/:id',
      'PATCH /articles/:id/status',
      'GET /articles/breaking',
      'GET /articles/featured',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS
// ============================================

export const EXPANDED_DOMAIN_MODELS: Record<string, DomainModel> = {

  'portfolio': {
    id: 'portfolio',
    name: 'Portfolio / Personal Website',
    description: 'Personal portfolio to showcase projects, skills, experience, and contact information.',
    coreEntities: ['project_showcase', 'skill', 'experience', 'contact_message'],
    optionalEntities: ['blog_post', 'testimonial', 'education'],
    keyRelationships: [
      'project has many tech-stack skills (via tag array or join table)',
      'experience has many projects (optional link)',
      'contact_message is standalone (no FK to other entities)',
    ],
    typicalFeatures: [
      'Hero section with name, title, and CTA',
      'Project gallery with filter by category/tech',
      'Project detail page with case study format',
      'Skills grid grouped by category with proficiency bars',
      'Experience timeline (reverse chronological)',
      'Contact form with email validation and rate limiting',
      'Dark/light theme toggle',
      'Responsive design (mobile-first)',
      'SEO-optimized meta tags per page',
      'Smooth scroll and scroll-triggered animations',
    ],
    securityConsiderations: [
      'Rate limit the contact form (5 req/hour per IP)',
      'Sanitize contact form messages to prevent stored XSS',
      'No authentication needed for the public site',
      'Admin panel (if any) behind auth for managing content',
    ],
    suggestedIndexStrategy: [
      'projects: (status, sortOrder) for homepage display',
      'projects: slug (unique) for detail pages',
      'skills: (category, sortOrder) for grouped display',
      'contact_messages: (read, createdAt DESC) for inbox',
    ],
  },

  'blog': {
    id: 'blog',
    name: 'Blog / Content Platform',
    description: 'Content publishing with articles, categories, comments, and newsletter subscriptions.',
    coreEntities: ['blog_post', 'category', 'tag', 'user'],
    optionalEntities: ['comment', 'subscriber', 'newsletter', 'image', 'revision'],
    keyRelationships: [
      'post belongs to author (user_id FK)',
      'post belongs to category (category_id FK, nullable)',
      'post has many tags (via post_tags join table or text[] array)',
      'post has many comments (post_id FK with nested replies via parent_id)',
      'subscriber is standalone (email-based)',
    ],
    typicalFeatures: [
      'Rich text/markdown editor with image upload',
      'Draft/publish workflow with scheduled publishing',
      'Category and tag-based navigation',
      'Full-text search across posts',
      'Comment system with moderation queue',
      'Newsletter signup and subscriber management',
      'SEO: meta title, description, Open Graph tags',
      'RSS feed generation',
      'Related posts based on tags/category',
      'Reading time estimation',
      'Social sharing buttons',
      'Syntax highlighting for code blocks',
    ],
    securityConsiderations: [
      'Sanitize markdown/HTML content to prevent XSS',
      'Rate limit comment submissions',
      'Validate and sanitize subscriber emails',
      'Auth required for create/edit/publish — public read access',
      'Moderate comments before displaying (or require auth)',
    ],
    suggestedIndexStrategy: [
      'posts: (status, publishedAt DESC) for listing pages',
      'posts: slug (unique) for permalinks',
      'posts: authorId for author pages',
      'posts: categoryId for category pages',
      'posts: Full-text index on (title, content) for search',
      'comments: (postId, status, createdAt) for threaded display',
      'subscribers: email (unique)',
    ],
  },

  'booking': {
    id: 'booking',
    name: 'Booking / Scheduling Platform',
    description: 'Appointment scheduling with services, staff availability, and customer bookings.',
    coreEntities: ['appointment', 'service', 'staff', 'availability', 'user'],
    optionalEntities: ['service_category', 'review', 'payment', 'notification', 'waitlist'],
    keyRelationships: [
      'appointment belongs to service (service_id FK)',
      'appointment belongs to staff member (staff_id FK)',
      'appointment optionally belongs to customer user (customer_id FK, nullable for guest bookings)',
      'staff has many availability slots (staff_id FK)',
      'staff can provide many services (join table: staff_services)',
      'service belongs to category (category_id FK, nullable)',
    ],
    typicalFeatures: [
      'Multi-step booking flow: select service → staff → date → time → confirm',
      'Calendar view for staff schedules',
      'Availability management (recurring weekly slots + overrides)',
      'Automatic conflict detection (no double-booking)',
      'Email confirmation and reminder notifications',
      'Cancellation and rescheduling with policy enforcement',
      'Customer booking history (upcoming + past)',
      'Admin dashboard with daily/weekly schedule view',
      'Revenue and utilization reports',
      'Buffer time between appointments',
      'Timezone-aware booking',
    ],
    securityConsiderations: [
      'Rate limit booking endpoint to prevent abuse',
      'Validate time slot is actually available before confirming',
      'Require email verification for guest bookings',
      'Staff can only see their own schedule + appointments',
      'Admin can view all schedules',
      'Protect customer PII (phone, email)',
    ],
    suggestedIndexStrategy: [
      'appointments: (staffId, startTime) for schedule views',
      'appointments: (status, startTime) for upcoming/past filtering',
      'appointments: customerEmail for guest lookup',
      'availability: (staffId, dayOfWeek) for slot calculation',
      'services: (status, sortOrder) for service listing',
    ],
  },

  'event-management': {
    id: 'event-management',
    name: 'Event Management Platform',
    description: 'Event creation, ticketing, RSVP, attendee tracking, and check-in.',
    coreEntities: ['event', 'ticket_type', 'ticket', 'attendee', 'venue', 'user'],
    optionalEntities: ['speaker', 'schedule_item', 'sponsor', 'promo_code', 'waitlist', 'feedback'],
    keyRelationships: [
      'event belongs to organizer (user_id FK)',
      'event has optional venue (venue_id FK, nullable for online events)',
      'event has many ticket types (event_id FK)',
      'ticket belongs to ticket_type and attendee',
      'attendee has many tickets (for multi-day events)',
      'event has many schedule items (event_id FK)',
    ],
    typicalFeatures: [
      'Event creation with date/time, venue, and cover image',
      'Multiple ticket tiers (free, general, VIP)',
      'Registration form with custom questions',
      'QR code generation for tickets',
      'Check-in via QR scan or manual search',
      'Attendee management with export',
      'Email notifications (confirmation, reminders)',
      'Event schedule/agenda builder',
      'Speaker profiles',
      'Promo codes and early-bird pricing',
      'Capacity tracking with waitlist',
      'Post-event feedback surveys',
    ],
    securityConsiderations: [
      'Prevent ticket overselling with database constraints',
      'Validate promo codes server-side',
      'Secure check-in — verify ticket authenticity',
      'Rate limit registration endpoint',
      'Protect attendee PII',
      'Organizer can only manage their own events',
    ],
    suggestedIndexStrategy: [
      'events: (status, startDate) for upcoming events',
      'events: slug (unique) for detail pages',
      'events: organizerId for organizer dashboard',
      'tickets: ticketNumber (unique) for check-in lookup',
      'tickets: (ticketTypeId, status) for availability count',
      'attendees: (eventId, email) for registration lookup',
    ],
  },

  'social-network': {
    id: 'social-network',
    name: 'Social Network / Community',
    description: 'Social platform with profiles, posts, follows, likes, and real-time feed.',
    coreEntities: ['user_profile', 'social_post', 'follow', 'like', 'comment', 'notification'],
    optionalEntities: ['hashtag', 'bookmark', 'report', 'block', 'direct_message', 'media'],
    keyRelationships: [
      'user has one profile (userId FK, unique)',
      'post belongs to author (authorId FK)',
      'follow links follower to following (two user FKs, unique pair)',
      'like links user to post (unique pair)',
      'comment belongs to post and author',
      'notification links to actor, target, and type',
    ],
    typicalFeatures: [
      'Home feed — posts from followed users (reverse chronological)',
      'Explore/discover — trending and suggested content',
      'User profiles with follower/following counts',
      'Post creation with text and image attachment',
      'Like, comment, and share actions',
      'Follow/unfollow with follower list',
      'Real-time notifications (likes, comments, follows)',
      'Search users and posts',
      'Hashtag discovery and trending',
      'Bookmark/save posts',
      'Content moderation and reporting',
      'Profile settings and privacy controls',
    ],
    securityConsiderations: [
      'Rate limit follow/unfollow to prevent spam',
      'Rate limit post creation',
      'Content moderation — flag and review reported content',
      'Privacy settings — private accounts, post visibility',
      'Block users — prevent interaction',
      'Sanitize post content to prevent XSS',
      'Denormalized counts must be eventually consistent',
    ],
    suggestedIndexStrategy: [
      'posts: (authorId, createdAt DESC) for profile feed',
      'follows: (followerId, followingId) unique pair',
      'follows: followingId for "who follows me"',
      'likes: (postId, userId) unique pair',
      'comments: (postId, createdAt) for threaded display',
      'notifications: (userId, read, createdAt DESC)',
      'profiles: username (unique, case-insensitive)',
    ],
  },

  'chat-messaging': {
    id: 'chat-messaging',
    name: 'Chat / Messaging Platform',
    description: 'Real-time messaging with conversations, presence, and read receipts.',
    coreEntities: ['conversation', 'chat_message', 'participant', 'user'],
    optionalEntities: ['channel', 'user_presence', 'read_receipt', 'attachment', 'reaction', 'notification'],
    keyRelationships: [
      'conversation has many messages (conversationId FK)',
      'conversation has many participants (conversationId FK)',
      'message belongs to conversation and sender',
      'participant links user to conversation (unique pair)',
      'read_receipt tracks last-read message per participant',
    ],
    typicalFeatures: [
      'Real-time message delivery (WebSocket)',
      'Direct messages (1:1) and group chats',
      'Channel-based conversations (public/private)',
      'Typing indicators',
      'Read receipts (last seen message)',
      'Online/offline presence',
      'File and image sharing',
      'Reply to specific messages',
      'Edit and delete messages',
      'Message search',
      'Push notifications for new messages',
      'Unread message count badges',
      'Emoji reactions',
    ],
    securityConsiderations: [
      'Verify WebSocket connections with JWT',
      'Enforce conversation membership — only participants can read/send',
      'Rate limit message sending',
      'Sanitize message content',
      'Scan file attachments for malware',
      'End-to-end encryption for sensitive chats (optional)',
      'Prevent information leakage across conversations',
    ],
    suggestedIndexStrategy: [
      'messages: (conversationId, createdAt DESC) for message history',
      'participants: (conversationId, userId) unique pair',
      'participants: userId for "my conversations"',
      'conversations: lastMessageAt DESC for conversation list ordering',
      'read_receipts: (participantId, conversationId) for unread count',
    ],
  },

  'landing-page': {
    id: 'landing-page',
    name: 'Landing Page / Marketing Site',
    description: 'Promotional page with hero, features, pricing, testimonials, and lead capture.',
    coreEntities: ['lead', 'testimonial', 'pricing_plan', 'faq'],
    optionalEntities: ['analytics_event', 'newsletter_subscriber'],
    keyRelationships: [
      'lead is standalone (captured from form)',
      'testimonial is standalone (managed by admin)',
      'pricing_plan is standalone',
      'faq is standalone with category grouping',
    ],
    typicalFeatures: [
      'Hero section with headline, subhead, and CTA',
      'Feature showcase with icons and descriptions',
      'Pricing table with plan comparison',
      'Testimonial carousel or grid',
      'FAQ accordion',
      'Lead capture form (email, name, company)',
      'Newsletter signup',
      'Social proof (logos, stats, badges)',
      'Mobile-responsive design',
      'Smooth scroll navigation',
      'Animation on scroll',
      'A/B testing support',
    ],
    securityConsiderations: [
      'Rate limit lead capture form heavily (5 req/hour per IP)',
      'Validate and sanitize all form inputs',
      'CAPTCHA or honeypot for bot prevention',
      'No auth needed for public page',
      'Admin panel behind auth for managing content',
    ],
    suggestedIndexStrategy: [
      'leads: (status, createdAt DESC) for lead management',
      'leads: email for duplicate detection',
      'testimonials: (featured, sortOrder) for display',
      'pricing_plans: sortOrder for display order',
      'faqs: (category, sortOrder) for grouped display',
    ],
  },

  'saas-dashboard': {
    id: 'saas-dashboard',
    name: 'SaaS / Dashboard Platform',
    description: 'Multi-tenant SaaS with subscription management, user analytics, and admin dashboard.',
    coreEntities: ['subscription', 'plan', 'invoice', 'user', 'team'],
    optionalEntities: ['usage_event', 'feature_flag', 'api_key', 'webhook_endpoint', 'audit_log', 'notification'],
    keyRelationships: [
      'subscription links user/team to plan',
      'user belongs to team (teamId FK, nullable)',
      'invoice belongs to subscription',
      'usage_event tracks feature usage per user',
      'api_key belongs to team',
    ],
    typicalFeatures: [
      'Subscription lifecycle: trial → active → cancelled',
      'Plan comparison and upgrade/downgrade flow',
      'Billing portal with invoice history',
      'Usage metering and limits',
      'Team management with roles',
      'Admin dashboard with MRR, churn, growth charts',
      'User analytics (DAU, MAU, feature adoption)',
      'API key management',
      'Webhook configuration',
      'Feature flags for gradual rollout',
      'Email onboarding sequence',
      'In-app notifications',
    ],
    securityConsiderations: [
      'Multi-tenant data isolation — every query scoped by teamId',
      'Subscription status check on every protected action',
      'API key hashing (store hash, not plain text)',
      'Rate limiting per API key / subscription tier',
      'Webhook signature verification for Stripe/Paddle callbacks',
      'Audit log for all billing and admin actions',
    ],
    suggestedIndexStrategy: [
      'subscriptions: (userId, status) for current plan lookup',
      'subscriptions: externalId for Stripe webhook processing',
      'invoices: (subscriptionId, issueDate DESC)',
      'usage_events: (userId, eventType, createdAt) for metering',
      'api_keys: tokenHash (unique) for auth lookup',
      'teams: slug (unique) for team URLs',
    ],
  },

  'documentation': {
    id: 'documentation',
    name: 'Documentation / Wiki Site',
    description: 'Knowledge base with hierarchical pages, search, and version management.',
    coreEntities: ['doc_page', 'doc_section', 'user'],
    optionalEntities: ['doc_revision', 'search_query_log', 'feedback', 'redirect'],
    keyRelationships: [
      'doc_page belongs to section (sectionId FK)',
      'doc_page has optional parent page (parentId FK, self-reference for nesting)',
      'doc_revision belongs to doc_page (page_id FK, append-only)',
    ],
    typicalFeatures: [
      'Hierarchical sidebar navigation',
      'Markdown content with syntax highlighting',
      'Full-text search with highlighted results',
      'Version selector (v1, v2, latest)',
      'Table of contents (auto-generated from headings)',
      'Breadcrumb navigation',
      '"Was this helpful?" feedback widget',
      'Previous/Next page navigation',
      'Edit on GitHub link',
      'API reference documentation',
      'Copy-to-clipboard code blocks',
      'Responsive design with collapsible sidebar',
    ],
    securityConsiderations: [
      'Public read access, auth required for editing',
      'Sanitize markdown output to prevent XSS',
      'Version access control (some versions may be private)',
      'Rate limit search queries',
    ],
    suggestedIndexStrategy: [
      'doc_pages: (sectionId, sortOrder) for sidebar navigation',
      'doc_pages: slug for URL resolution',
      'doc_pages: Full-text index on (title, content) for search',
      'doc_pages: (version, sectionId, sortOrder) for versioned navigation',
      'doc_sections: sortOrder for section ordering',
    ],
  },

  'forum': {
    id: 'forum',
    name: 'Forum / Discussion Board',
    description: 'Community discussion with threads, categories, voting, and moderation.',
    coreEntities: ['forum_thread', 'reply', 'category', 'user', 'vote'],
    optionalEntities: ['tag', 'report', 'badge', 'user_reputation', 'notification'],
    keyRelationships: [
      'thread belongs to category and author',
      'reply belongs to thread and author (nested via parentId)',
      'vote links user to thread or reply (polymorphic)',
      'user_reputation tracks points and badges',
    ],
    typicalFeatures: [
      'Category-based organization',
      'Thread creation with markdown content',
      'Threaded replies with nesting',
      'Upvote/downvote on threads and replies',
      'Mark answer as accepted (Q&A mode)',
      'Pin and lock threads (moderator)',
      'User reputation and badges',
      'Search across threads and replies',
      'Recent activity and trending threads',
      'Notification on reply/mention',
      'User profiles with activity history',
      'Moderation tools (delete, ban, report queue)',
    ],
    securityConsiderations: [
      'Rate limit thread and reply creation',
      'Sanitize markdown content',
      'Prevent vote manipulation (one vote per user per entity)',
      'Moderation queue for flagged content',
      'User banning and shadow-banning',
      'Prevent spam with CAPTCHA for new accounts',
    ],
    suggestedIndexStrategy: [
      'threads: (categoryId, lastActivityAt DESC) for category pages',
      'threads: (categoryId, isPinned, lastActivityAt DESC) for pinned-first ordering',
      'threads: authorId for user profile',
      'threads: Full-text on (title, content) for search',
      'replies: (threadId, createdAt) for threaded display',
      'votes: (entityType, entityId, userId) unique for one-vote-per-user',
    ],
  },

  'job-board': {
    id: 'job-board',
    name: 'Job Board / Recruitment',
    description: 'Job listing platform with applications, company profiles, and candidate pipeline.',
    coreEntities: ['job_listing', 'job_application', 'company', 'user'],
    optionalEntities: ['interview', 'skill_assessment', 'saved_job', 'notification', 'company_review'],
    keyRelationships: [
      'job belongs to company (companyId FK)',
      'application belongs to job and applicant',
      'company has many jobs',
      'user can save jobs (join table)',
      'interview belongs to application',
    ],
    typicalFeatures: [
      'Job listing with search, location, type, and salary filters',
      'Job detail page with apply button',
      'Multi-step application form with resume upload',
      'Company profiles with open positions',
      'Application tracking pipeline (Kanban)',
      'Email notifications (applied, status change, interview scheduled)',
      'Saved jobs / job alerts',
      'Salary range display',
      'Remote-friendly filter',
      'Company directory/browse',
      'Admin analytics (applications per job, conversion rate)',
    ],
    securityConsiderations: [
      'Rate limit application submissions',
      'Scan resume uploads for malware',
      'Protect applicant PII — only visible to hiring company',
      'Company admins can only see their own job applications',
      'Validate salary ranges and prevent negative values',
      'Prevent duplicate applications (unique constraint on job_id + email)',
    ],
    suggestedIndexStrategy: [
      'jobs: slug (unique) for detail pages',
      'jobs: (status, publishedAt DESC) for listing',
      'jobs: (status, isRemote, type) for filtered search',
      'jobs: companyId for company pages',
      'jobs: Full-text on (title, description) for search',
      'jobs: skills (GIN) for skill-based search',
      'applications: (jobId, status) for pipeline view',
      'applications: (jobId, email) unique for duplicate prevention',
    ],
  },

  'analytics': {
    id: 'analytics',
    name: 'Analytics / Reporting Tool',
    description: 'Data analytics dashboard with customizable charts, reports, and data sources.',
    coreEntities: ['dashboard_widget', 'dashboard', 'data_source', 'report', 'user'],
    optionalEntities: ['alert', 'scheduled_report', 'query_log', 'team'],
    keyRelationships: [
      'dashboard has many widgets (dashboardId FK)',
      'dashboard belongs to owner (userId FK)',
      'widget references data source (dataSourceId FK)',
      'report belongs to owner',
    ],
    typicalFeatures: [
      'Customizable dashboard with drag-and-drop widgets',
      'Multiple chart types (line, bar, pie, area, donut, table)',
      'Date range picker with presets (7d, 30d, 90d, custom)',
      'KPI cards with trend indicators',
      'Data source management (connect DB, API, CSV)',
      'Report generation and scheduling',
      'Export to PDF, CSV, PNG',
      'Shareable dashboards (public link)',
      'Real-time data refresh',
      'Comparison mode (current vs previous period)',
    ],
    securityConsiderations: [
      'Encrypt data source credentials at rest',
      'Row-level access control on dashboards',
      'Sanitize SQL queries from data sources',
      'Rate limit report generation (heavy operations)',
      'Audit log data source access',
    ],
    suggestedIndexStrategy: [
      'dashboards: (ownerId, createdAt DESC)',
      'widgets: (dashboardId, position) for layout rendering',
      'reports: (ownerId, lastRunAt DESC)',
      'data_sources: (status, type)',
    ],
  },

  'recipe': {
    id: 'recipe',
    name: 'Recipe / Food Platform',
    description: 'Recipe sharing with ingredients, instructions, meal planning, and nutrition.',
    coreEntities: ['recipe', 'ingredient', 'user'],
    optionalEntities: ['meal_plan', 'shopping_item', 'comment', 'rating', 'collection', 'category'],
    keyRelationships: [
      'recipe has many ingredients (recipeId FK, ordered)',
      'recipe belongs to author (userId FK)',
      'meal_plan links user to recipe on a specific date/meal',
      'shopping_item derived from meal plan ingredients',
      'comment belongs to recipe and author',
    ],
    typicalFeatures: [
      'Recipe gallery with image cards',
      'Filter by cuisine, difficulty, dietary tags, prep time',
      'Full-text search',
      'Servings adjuster (scales ingredients)',
      'Step-by-step instructions',
      'Nutritional information per serving',
      'Rating and review system',
      'Save/bookmark recipes to collections',
      'Weekly meal planner with calendar',
      'Auto-generated shopping list from meal plan',
      'Print-friendly recipe view',
      'Share recipe on social media',
    ],
    securityConsiderations: [
      'Rate limit recipe creation and reviews',
      'Sanitize recipe content (markdown/HTML)',
      'Validate nutritional values (positive numbers)',
      'Auth required for create/edit/rate — public read',
    ],
    suggestedIndexStrategy: [
      'recipes: slug (unique)',
      'recipes: (status, rating DESC) for popular recipes',
      'recipes: cuisine for cuisine filter',
      'recipes: difficulty for difficulty filter',
      'recipes: dietaryTags (GIN) for dietary filter',
      'recipes: Full-text on (title, description)',
      'ingredients: (recipeId, sortOrder) for recipe display',
      'meal_plans: (userId, date) for weekly view',
    ],
  },

  'news-media': {
    id: 'news-media',
    name: 'News / Media Platform',
    description: 'News publishing with articles, editorial workflow, and breaking news.',
    coreEntities: ['news_article', 'author', 'category', 'user'],
    optionalEntities: ['comment', 'tag', 'newsletter', 'subscriber', 'ad_placement', 'media_asset'],
    keyRelationships: [
      'article belongs to author',
      'article belongs to category',
      'article has many comments',
      'article has many tags (via join table or array)',
    ],
    typicalFeatures: [
      'Editorial workflow (draft → review → published)',
      'Breaking news banner',
      'Category-based sections (Politics, Tech, Sports)',
      'Featured/hero article on homepage',
      'Author profiles and bylines',
      'Social media sharing',
      'Related articles',
      'Trending/popular articles',
      'Comment section with moderation',
      'Newsletter subscription',
      'RSS feed',
      'Search across articles',
    ],
    securityConsiderations: [
      'Editorial workflow — reporters cannot self-publish',
      'Comment moderation queue',
      'Rate limit comment submissions',
      'Sanitize article HTML content',
      'Role-based access (reporter, editor, admin)',
    ],
    suggestedIndexStrategy: [
      'articles: slug (unique)',
      'articles: (status, publishedAt DESC) for listings',
      'articles: (isBreaking, status) for breaking news banner',
      'articles: (isFeatured, status) for homepage',
      'articles: authorId for author pages',
      'articles: categoryId for section pages',
      'articles: Full-text on (title, content) for search',
    ],
  },

  'gaming': {
    id: 'gaming',
    name: 'Gaming / Entertainment',
    description: 'Gaming platform with leaderboards, player profiles, achievements, and scores.',
    coreEntities: ['player', 'score', 'achievement', 'player_achievement'],
    optionalEntities: ['game_session', 'match', 'team', 'reward', 'daily_challenge'],
    keyRelationships: [
      'player links to user account (userId FK)',
      'score belongs to player',
      'player_achievement links player to achievement (earned)',
      'game_session tracks individual play sessions',
    ],
    typicalFeatures: [
      'Main game interface (canvas, game loop)',
      'Global and category leaderboards',
      'Player profiles with stats and badges',
      'Achievement system with progress tracking',
      'Score history and personal best',
      'Level and XP progression',
      'Daily challenges and rewards',
      'Multiplayer matchmaking (if applicable)',
      'Sound effects and visual feedback',
      'Tutorial/onboarding flow',
      'Game over screen with stats and share',
    ],
    securityConsiderations: [
      'Validate scores server-side — never trust client-submitted scores',
      'Rate limit score submissions',
      'Anti-cheat: verify game session duration vs score',
      'Prevent achievement farming with rate limits',
    ],
    suggestedIndexStrategy: [
      'players: userId (unique)',
      'players: username (unique)',
      'players: highScore DESC for leaderboard',
      'scores: (playerId, createdAt DESC) for score history',
      'scores: score DESC for global leaderboard',
      'player_achievements: (playerId, achievementId) unique pair',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS
// ============================================

export const EXPANDED_CODE_SNIPPETS: CodeSnippet[] = [

  // ── Portfolio Domain Snippets ──────────────────────────────────────────────

  {
    id: 'portfolio-hero-section',
    title: 'Portfolio Hero Section Component',
    description: 'Responsive hero section with name, title, bio, social links, and CTA. Includes scroll animation.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['portfolio', 'hero', 'component', 'animation'],
    code: `interface HeroProps {
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  socialLinks?: { platform: string; url: string; icon: React.ReactNode }[];
  ctaLabel?: string;
  ctaHref?: string;
}

function Hero({ name, title, bio, avatarUrl, socialLinks, ctaLabel = 'View Projects', ctaHref = '#projects' }: HeroProps) {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        {avatarUrl && (
          <img src={avatarUrl} alt={name} className="w-28 h-28 rounded-full mx-auto ring-4 ring-primary/20 object-cover" />
        )}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">{name}</h1>
          <p className="text-xl sm:text-2xl text-muted-foreground">{title}</p>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">{bio}</p>
        {socialLinks && socialLinks.length > 0 && (
          <div className="flex items-center justify-center gap-4">
            {socialLinks.map(link => (
              <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors" aria-label={link.platform}>
                {link.icon}
              </a>
            ))}
          </div>
        )}
        <a href={ctaHref}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}`,
  },

  {
    id: 'portfolio-project-card',
    title: 'Portfolio Project Card Component',
    description: 'Card component for displaying a portfolio project with image, tech stack tags, and links.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['portfolio', 'card', 'component'],
    code: `interface ProjectCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  slug: string;
}

function ProjectCard({ title, description, imageUrl, techStack, liveUrl, githubUrl, slug }: ProjectCardProps) {
  return (
    <div className="group bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {imageUrl && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      )}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">
          <a href={\`/projects/\${slug}\`} className="hover:text-primary transition-colors">{title}</a>
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        <div className="flex flex-wrap gap-1.5">
          {techStack.slice(0, 5).map(tech => (
            <span key={tech} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">{tech}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
              Live Demo
            </a>
          )}
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}`,
  },

  {
    id: 'portfolio-skills-grid',
    title: 'Skills Grid Component',
    description: 'Responsive skills grid grouped by category with proficiency indicator bars.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['portfolio', 'skills', 'component'],
    code: `interface Skill {
  name: string;
  category: string;
  proficiency: number; // 0-100
  iconUrl?: string;
}

function SkillsGrid({ skills }: { skills: Skill[] }) {
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    (acc[skill.category] ??= []).push(skill);
    return acc;
  }, {});

  return (
    <section className="space-y-8">
      {Object.entries(grouped).map(([category, categorySkills]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySkills.map(skill => (
              <div key={skill.name} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                {skill.iconUrl && <img src={skill.iconUrl} alt="" className="w-8 h-8 object-contain" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{skill.name}</span>
                    <span className="text-xs text-muted-foreground">{skill.proficiency}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: \`\${skill.proficiency}%\` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}`,
  },

  {
    id: 'portfolio-contact-form',
    title: 'Contact Form with Validation',
    description: 'Accessible contact form with Zod validation, loading state, and toast feedback.',
    tech: ['react', 'typescript', 'tailwind', 'zod'],
    tags: ['portfolio', 'form', 'contact', 'validation'],
    code: `import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

type ContactValues = z.infer<typeof contactSchema>;

function ContactForm({ onSubmit }: { onSubmit: (values: ContactValues) => Promise<void> }) {
  const [values, setValues] = useState<ContactValues>({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactValues, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.errors.map(e => [e.path[0], e.message])));
      return;
    }
    setErrors({});
    setStatus('submitting');
    try {
      await onSubmit(result.data);
      setStatus('success');
      setValues({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const field = (name: keyof ContactValues, label: string, type = 'text', multiline = false) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1.5">{label}</label>
      {multiline ? (
        <textarea id={name} rows={5} value={values[name] ?? ''} onChange={e => setValues(v => ({ ...v, [name]: e.target.value }))}
          className={\`w-full border rounded-lg px-3 py-2 text-sm resize-none \${errors[name] ? 'border-red-500' : 'border-border'}\`}
          aria-invalid={!!errors[name]} aria-describedby={errors[name] ? \`\${name}-error\` : undefined} />
      ) : (
        <input id={name} type={type} value={values[name] ?? ''} onChange={e => setValues(v => ({ ...v, [name]: e.target.value }))}
          className={\`w-full border rounded-lg px-3 py-2 text-sm \${errors[name] ? 'border-red-500' : 'border-border'}\`}
          aria-invalid={!!errors[name]} aria-describedby={errors[name] ? \`\${name}-error\` : undefined} />
      )}
      {errors[name] && <p id={\`\${name}-error\`} className="text-red-500 text-xs mt-1" role="alert">{errors[name]}</p>}
    </div>
  );

  if (status === 'success') return (
    <div className="text-center py-8 space-y-2">
      <p className="text-lg font-medium text-green-600">Message sent!</p>
      <p className="text-muted-foreground text-sm">Thanks for reaching out. I'll get back to you soon.</p>
      <button onClick={() => setStatus('idle')} className="text-sm text-primary hover:underline mt-2">Send another</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      {field('name', 'Name')}
      {field('email', 'Email', 'email')}
      {field('subject', 'Subject (optional)')}
      {field('message', 'Message', 'text', true)}
      {status === 'error' && <p className="text-red-500 text-sm">Failed to send. Please try again.</p>}
      <button type="submit" disabled={status === 'submitting'}
        className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 font-medium disabled:opacity-50 transition-colors">
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}`,
  },

  // ── Blog Domain Snippets ───────────────────────────────────────────────────

  {
    id: 'blog-post-card',
    title: 'Blog Post Card Component',
    description: 'Card for displaying a blog post preview with image, category, read time, and excerpt.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['blog', 'card', 'component'],
    code: `interface PostCardProps {
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  authorName: string;
  authorAvatarUrl?: string;
  category?: string;
  publishedAt: string;
  readTimeMinutes?: number;
  tags?: string[];
}

function PostCard({
  title, slug, excerpt, coverImageUrl, authorName, authorAvatarUrl,
  category, publishedAt, readTimeMinutes, tags
}: PostCardProps) {
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <article className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {coverImageUrl && (
        <a href={\`/posts/\${slug}\`}>
          <div className="aspect-[16/9] overflow-hidden bg-muted">
            <img src={coverImageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
          </div>
        </a>
      )}
      <div className="p-5 space-y-3">
        {category && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{category}</span>
        )}
        <h2 className="text-lg font-semibold leading-snug">
          <a href={\`/posts/\${slug}\`} className="hover:text-primary transition-colors">{title}</a>
        </h2>
        <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-2">
            {authorAvatarUrl ? (
              <img src={authorAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {authorName[0]}
              </div>
            )}
            <span className="text-xs text-muted-foreground">{authorName}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          {readTimeMinutes && <span className="text-xs text-muted-foreground">{readTimeMinutes} min read</span>}
        </div>
      </div>
    </article>
  );
}`,
  },

  {
    id: 'blog-markdown-renderer',
    title: 'Markdown Content Renderer',
    description: 'Safe markdown renderer with syntax highlighting, table of contents generation, and sanitization.',
    tech: ['react', 'typescript'],
    tags: ['blog', 'markdown', 'content', 'documentation'],
    code: `import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={\`prose prose-lg dark:prose-invert max-w-none \${className ?? ''}\`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ''} loading="lazy" className="rounded-lg" />
          ),
          pre: ({ children }) => (
            <pre className="relative group">
              {children}
              <button
                onClick={() => {
                  const code = (children as any)?.props?.children;
                  if (typeof code === 'string') navigator.clipboard.writeText(code);
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 px-2 py-1 rounded text-xs"
              >
                Copy
              </button>
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function generateTableOfContents(markdown: string): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    toc.push({ id, text, level });
  }
  return toc;
}`,
  },

  // ── Booking Domain Snippets ────────────────────────────────────────────────

  {
    id: 'booking-availability-checker',
    title: 'Appointment Availability Checker',
    description: 'Server-side logic to calculate available time slots based on staff schedule and existing bookings.',
    tech: ['typescript', 'drizzle'],
    tags: ['booking', 'availability', 'scheduling', 'service'],
    code: `interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: number;
  available: boolean;
}

interface AvailabilityParams {
  serviceId: number;
  staffId: number;
  date: Date; // The day to check
}

export async function getAvailableSlots(params: AvailabilityParams): Promise<TimeSlot[]> {
  const { serviceId, staffId, date } = params;

  // 1. Get service duration
  const [svc] = await db.select({ duration: services.duration, bufferBefore: services.bufferBefore, bufferAfter: services.bufferAfter })
    .from(services).where(eq(services.id, serviceId));
  if (!svc) throw new Error('Service not found');

  // 2. Get staff availability for this day of week
  const dayOfWeek = date.getDay(); // 0=Sunday
  const availabilitySlots = await db.select()
    .from(availability)
    .where(and(eq(availability.staffId, staffId), eq(availability.dayOfWeek, dayOfWeek)));

  if (availabilitySlots.length === 0) return [];

  // 3. Get existing bookings for this day
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await db.select({ startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(and(
      eq(appointments.staffId, staffId),
      gte(appointments.startTime, dayStart),
      lte(appointments.startTime, dayEnd),
      not(inArray(appointments.status, ['cancelled', 'no-show']))
    ));

  // 4. Generate slots and check availability
  const totalDuration = svc.bufferBefore + svc.duration + svc.bufferAfter;
  const slots: TimeSlot[] = [];

  for (const avail of availabilitySlots) {
    const [startH, startM] = avail.startTime.split(':').map(Number);
    const [endH, endM] = avail.endTime.split(':').map(Number);

    let cursor = new Date(date);
    cursor.setHours(startH, startM, 0, 0);

    const windowEnd = new Date(date);
    windowEnd.setHours(endH, endM, 0, 0);

    while (cursor.getTime() + totalDuration * 60000 <= windowEnd.getTime()) {
      const slotStart = new Date(cursor.getTime() + svc.bufferBefore * 60000);
      const slotEnd = new Date(slotStart.getTime() + svc.duration * 60000);

      const hasConflict = existingBookings.some(booking =>
        slotStart < booking.endTime && slotEnd > booking.startTime
      );

      slots.push({ startTime: slotStart, endTime: slotEnd, staffId, available: !hasConflict });
      cursor = new Date(cursor.getTime() + 30 * 60000); // 30-min increments
    }
  }

  return slots.filter(s => s.available);
}`,
  },

  {
    id: 'booking-calendar-view',
    title: 'Calendar Week View Component',
    description: 'Weekly calendar grid showing appointments with color-coded status badges.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['booking', 'calendar', 'component', 'scheduling'],
    code: `interface CalendarAppointment {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  status: 'booked' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  customerName: string;
  serviceName: string;
}

const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  'in-progress': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  completed: 'bg-gray-100 border-gray-300 text-gray-600',
  cancelled: 'bg-red-100 border-red-300 text-red-600 line-through opacity-60',
};

function WeekCalendar({ appointments, weekStart }: { appointments: CalendarAppointment[]; weekStart: Date }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getAppointmentsForDay = (date: Date) =>
    appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate.toDateString() === date.toDateString();
    });

  return (
    <div className="overflow-auto border rounded-lg">
      <div className="grid grid-cols-8 min-w-[800px]">
        {/* Header */}
        <div className="p-2 border-b bg-muted" /> {/* Empty corner */}
        {days.map(day => (
          <div key={day.toISOString()} className="p-2 border-b border-l bg-muted text-center">
            <div className="text-xs text-muted-foreground">{day.toLocaleDateString('en', { weekday: 'short' })}</div>
            <div className="text-sm font-medium">{day.getDate()}</div>
          </div>
        ))}

        {/* Time grid */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="p-2 text-xs text-muted-foreground text-right border-b">
              {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
            </div>
            {days.map(day => {
              const dayApts = getAppointmentsForDay(day).filter(a => new Date(a.startTime).getHours() === hour);
              return (
                <div key={\`\${day.toISOString()}-\${hour}\`} className="border-b border-l p-1 min-h-[60px] relative">
                  {dayApts.map(apt => (
                    <div key={apt.id} className={\`text-xs p-1 rounded border mb-1 cursor-pointer \${STATUS_COLORS[apt.status] ?? ''}\`}>
                      <div className="font-medium truncate">{apt.customerName}</div>
                      <div className="truncate">{apt.serviceName}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}`,
  },

  // ── Event Management Snippets ──────────────────────────────────────────────

  {
    id: 'event-registration-flow',
    title: 'Event Registration Multi-Step Form',
    description: 'Multi-step registration: select tickets → enter details → confirm → payment.',
    tech: ['react', 'typescript', 'tailwind', 'zod'],
    tags: ['event', 'registration', 'form', 'multi-step'],
    code: `type Step = 'tickets' | 'details' | 'confirm' | 'done';

interface TicketType { id: number; name: string; price: number; available: number; description?: string; }
interface TicketSelection { ticketTypeId: number; quantity: number; }

function EventRegistration({ event, ticketTypes }: { event: { id: number; title: string }; ticketTypes: TicketType[] }) {
  const [step, setStep] = useState<Step>('tickets');
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [details, setDetails] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  const total = selections.reduce((sum, s) => {
    const tt = ticketTypes.find(t => t.id === s.ticketTypeId);
    return sum + (tt?.price ?? 0) * s.quantity;
  }, 0);

  const updateQuantity = (ticketTypeId: number, quantity: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.ticketTypeId === ticketTypeId);
      if (quantity === 0) return prev.filter(s => s.ticketTypeId !== ticketTypeId);
      if (existing) return prev.map(s => s.ticketTypeId === ticketTypeId ? { ...s, quantity } : s);
      return [...prev, { ticketTypeId, quantity }];
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(\`/api/events/\${event.id}/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: selections, attendee: details }),
      });
      setStep('done');
    } catch { /* handle error */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['tickets', 'details', 'confirm'] as const).map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <div className="h-px flex-1 bg-border" />}
            <div className={\`flex items-center gap-1 \${step === s ? 'text-primary font-medium' : 'text-muted-foreground'}\`}>
              <span className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs \${step === s ? 'bg-primary text-white' : 'bg-muted'}\`}>
                {i + 1}
              </span>
              <span className="capitalize">{s}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {step === 'tickets' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select Tickets</h2>
          {ticketTypes.map(tt => (
            <div key={tt.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{tt.name}</h3>
                {tt.description && <p className="text-sm text-muted-foreground">{tt.description}</p>}
                <p className="text-sm font-medium mt-1">{tt.price === 0 ? 'Free' : \`$\${(tt.price / 100).toFixed(2)}\`}</p>
              </div>
              <select value={selections.find(s => s.ticketTypeId === tt.id)?.quantity ?? 0}
                onChange={e => updateQuantity(tt.id, Number(e.target.value))}
                className="border rounded-lg px-3 py-2">
                {Array.from({ length: Math.min(tt.available + 1, 11) }, (_, i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex justify-between items-center pt-4">
            <span className="font-medium">Total: \${(total / 100).toFixed(2)}</span>
            <button onClick={() => setStep('details')} disabled={selections.length === 0}
              className="bg-primary text-white px-6 py-2 rounded-lg disabled:opacity-50">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Details</h2>
          <input placeholder="Full Name" value={details.name} onChange={e => setDetails(d => ({ ...d, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2" />
          <input placeholder="Email" type="email" value={details.email} onChange={e => setDetails(d => ({ ...d, email: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2" />
          <input placeholder="Phone (optional)" value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2" />
          <div className="flex gap-3">
            <button onClick={() => setStep('tickets')} className="border px-4 py-2 rounded-lg">Back</button>
            <button onClick={() => setStep('confirm')} disabled={!details.name || !details.email}
              className="bg-primary text-white px-6 py-2 rounded-lg disabled:opacity-50">Review</button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Confirm Registration</h2>
          <div className="border rounded-lg p-4 space-y-2">
            <p><strong>{details.name}</strong> — {details.email}</p>
            {selections.map(s => {
              const tt = ticketTypes.find(t => t.id === s.ticketTypeId);
              return <p key={s.ticketTypeId} className="text-sm">{s.quantity}× {tt?.name} — \${((tt?.price ?? 0) * s.quantity / 100).toFixed(2)}</p>;
            })}
            <hr />
            <p className="font-medium">Total: \${(total / 100).toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('details')} className="border px-4 py-2 rounded-lg">Back</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-primary text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">🎉</div>
          <h2 className="text-xl font-semibold">You're Registered!</h2>
          <p className="text-muted-foreground">Check your email for your ticket confirmation.</p>
        </div>
      )}
    </div>
  );
}`,
  },

  // ── Landing Page Snippets ──────────────────────────────────────────────────

  {
    id: 'landing-pricing-table',
    title: 'Pricing Table Component',
    description: 'Responsive pricing table with plan comparison, highlighted recommended plan, and CTA buttons.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'pricing', 'component', 'saas'],
    code: `interface PricingPlan {
  name: string;
  price: number; // monthly in cents
  yearlyPrice?: number;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
  description?: string;
}

function PricingTable({ plans, billingPeriod = 'monthly' }: { plans: PricingPlan[]; billingPeriod?: 'monthly' | 'yearly' }) {
  return (
    <div className={\`grid gap-6 \${plans.length === 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-4'} max-w-5xl mx-auto\`}>
      {plans.map(plan => {
        const price = billingPeriod === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
        return (
          <div key={plan.name}
            className={\`relative flex flex-col p-6 rounded-2xl border-2 \${
              plan.highlighted
                ? 'border-primary shadow-lg scale-105 bg-card'
                : 'border-border bg-card'
            }\`}>
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-medium">
                Most Popular
              </span>
            )}
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
              <div className="mt-4">
                <span className="text-4xl font-bold">\${(price / 100).toFixed(0)}</span>
                <span className="text-muted-foreground text-sm">/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
              {billingPeriod === 'yearly' && plan.yearlyPrice && plan.price && (
                <p className="text-xs text-green-600 mt-1">Save \${((plan.price * 12 - plan.yearlyPrice) / 100).toFixed(0)}/year</p>
              )}
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button className={\`w-full py-2.5 rounded-lg font-medium transition-colors \${
              plan.highlighted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border hover:bg-muted'
            }\`}>
              {plan.ctaLabel ?? 'Get Started'}
            </button>
          </div>
        );
      })}
    </div>
  );
}`,
  },

  {
    id: 'landing-testimonial-carousel',
    title: 'Testimonial Carousel Component',
    description: 'Auto-advancing testimonial carousel with avatar, quote, name, and title.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'testimonial', 'carousel', 'component'],
    code: `interface Testimonial {
  quote: string;
  authorName: string;
  authorTitle: string;
  authorAvatar?: string;
  rating?: number;
}

function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(i => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const t = testimonials[activeIndex];

  return (
    <div className="max-w-2xl mx-auto text-center px-4">
      <div className="min-h-[200px] flex flex-col items-center justify-center">
        {t.rating && (
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className={\`w-5 h-5 \${i < t.rating! ? 'text-yellow-400' : 'text-gray-300'}\`}
                fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        )}
        <blockquote className="text-lg text-foreground italic leading-relaxed mb-6">
          "{t.quote}"
        </blockquote>
        <div className="flex items-center gap-3">
          {t.authorAvatar ? (
            <img src={t.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {t.authorName[0]}
            </div>
          )}
          <div className="text-left">
            <p className="text-sm font-medium">{t.authorName}</p>
            <p className="text-xs text-muted-foreground">{t.authorTitle}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {testimonials.map((_, i) => (
          <button key={i} onClick={() => setActiveIndex(i)} aria-label={\`Go to testimonial \${i + 1}\`}
            className={\`w-2 h-2 rounded-full transition-colors \${i === activeIndex ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/30'}\`} />
        ))}
      </div>
    </div>
  );
}`,
  },

  {
    id: 'landing-faq-accordion',
    title: 'FAQ Accordion Component',
    description: 'Accessible FAQ accordion with smooth open/close animation and keyboard support.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'faq', 'accordion', 'component', 'accessibility'],
    code: `interface FAQItem { question: string; answer: string; }

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto divide-y border-y">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-base font-medium pr-4">{item.question}</span>
              <svg className={\`w-5 h-5 shrink-0 transition-transform duration-200 \${isOpen ? 'rotate-180' : ''}\`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={\`grid transition-all duration-200 \${isOpen ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'}\`}>
              <div className="overflow-hidden">
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}`,
  },

  // ── Social Network Snippets ────────────────────────────────────────────────

  {
    id: 'social-feed-component',
    title: 'Social Feed with Infinite Scroll',
    description: 'Social media feed with post cards, like/comment actions, and cursor-based infinite scrolling.',
    tech: ['react', 'typescript', 'tailwind', 'react-query'],
    tags: ['social', 'feed', 'infinite-scroll', 'component'],
    code: `interface FeedPost {
  id: number;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

function SocialFeed() {
  const { items, isLoading, loadMoreRef, isFetchingNextPage } = useCursorPagination<FeedPost>('feed', '/api/feed');

  if (isLoading) return <FeedSkeleton />;

  return (
    <div className="max-w-xl mx-auto space-y-4 py-4">
      {items.map(post => <FeedPostCard key={post.id} post={post} />)}
      <div ref={loadMoreRef} className="h-4" />
      {isFetchingNextPage && <PostSkeleton />}
    </div>
  );
}

function FeedPostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : c - 1);
    try {
      await fetch(\`/api/posts/\${post.id}/like\`, { method: newLiked ? 'POST' : 'DELETE' });
    } catch {
      setLiked(!newLiked);
      setLikeCount(c => newLiked ? c - 1 : c + 1);
    }
  };

  const timeAgo = formatTimeAgo(new Date(post.createdAt));

  return (
    <article className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        {post.authorAvatarUrl ? (
          <img src={post.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">{post.authorName[0]}</div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm">{post.authorName}</span>
            <span className="text-muted-foreground text-sm">@{post.authorUsername}</span>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="w-full rounded-lg object-cover max-h-[400px]" loading="lazy" />
      )}
      <div className="flex items-center gap-6 pt-1">
        <button onClick={toggleLike} className={\`flex items-center gap-1.5 text-sm \${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}\`}>
          <HeartIcon filled={liked} className="w-5 h-5" />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <CommentIcon className="w-5 h-5" />
          {post.commentCount > 0 && <span>{post.commentCount}</span>}
        </button>
      </div>
    </article>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return \`\${minutes}m\`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return \`\${hours}h\`;
  const days = Math.floor(hours / 24);
  if (days < 7) return \`\${days}d\`;
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}`,
  },

  // ── SaaS Dashboard Snippets ────────────────────────────────────────────────

  {
    id: 'saas-kpi-cards',
    title: 'KPI Dashboard Cards',
    description: 'KPI metric cards with trend indicators, sparklines, and comparison to previous period.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['saas', 'dashboard', 'kpi', 'analytics', 'component'],
    code: `interface KPICard {
  label: string;
  value: string | number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent';
  icon?: React.ReactNode;
}

function formatKPI(value: number, format: KPICard['format'] = 'number'): string {
  switch (format) {
    case 'currency': return \`$\${(value / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}\`;
    case 'percent': return \`\${value.toFixed(1)}%\`;
    default: return value.toLocaleString();
  }
}

function KPIGrid({ cards }: { cards: KPICard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const currentNum = typeof card.value === 'number' ? card.value : parseFloat(String(card.value));
        const change = card.previousValue ? ((currentNum - card.previousValue) / card.previousValue) * 100 : null;
        const isPositive = change !== null && change >= 0;

        return (
          <div key={card.label} className="bg-card border rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              {card.icon && <span className="text-muted-foreground">{card.icon}</span>}
            </div>
            <div className="text-2xl font-bold">
              {typeof card.value === 'number' ? formatKPI(card.value, card.format) : card.value}
            </div>
            {change !== null && (
              <div className={\`flex items-center gap-1 text-xs \${isPositive ? 'text-green-600' : 'text-red-600'}\`}>
                <svg className={\`w-3 h-3 \${isPositive ? '' : 'rotate-180'}\`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" />
                </svg>
                <span>{Math.abs(change).toFixed(1)}% vs last period</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}`,
  },

  // ── Chat / Messaging Snippets ──────────────────────────────────────────────

  {
    id: 'chat-message-list',
    title: 'Chat Message List Component',
    description: 'Real-time chat message list with auto-scroll, message grouping, and typing indicator.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['chat', 'messaging', 'component', 'real-time'],
    code: `interface ChatMessage {
  id: number;
  senderId: number;
  content: string;
  type: 'text' | 'image' | 'system';
  createdAt: string;
  senderName: string;
  senderAvatarUrl?: string;
}

function ChatMessageList({ messages, currentUserId }: { messages: ChatMessage[]; currentUserId: number }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const grouped = groupMessagesByDateAndSender(messages);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
      {grouped.map((group, gi) => (
        <div key={gi}>
          {group.isDateSeparator && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{group.dateLabel}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          {group.messages.map((msg, mi) => {
            const isMe = msg.senderId === currentUserId;
            const isFirst = mi === 0;

            if (msg.type === 'system') {
              return <p key={msg.id} className="text-center text-xs text-muted-foreground py-1">{msg.content}</p>;
            }

            return (
              <div key={msg.id} className={\`flex gap-2 \${isMe ? 'flex-row-reverse' : ''}\`}>
                {!isMe && isFirst && (
                  msg.senderAvatarUrl ? (
                    <img src={msg.senderAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover mt-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium mt-1">
                      {msg.senderName[0]}
                    </div>
                  )
                )}
                {!isMe && !isFirst && <div className="w-8" />}
                <div className={\`max-w-[70%] \${isMe ? 'items-end' : 'items-start'}\`}>
                  {!isMe && isFirst && (
                    <span className="text-xs text-muted-foreground mb-0.5 block">{msg.senderName}</span>
                  )}
                  <div className={\`px-3 py-2 rounded-2xl text-sm \${
                    isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
                  }\`}>
                    {msg.type === 'image' ? (
                      <img src={msg.content} alt="Shared image" className="rounded-lg max-w-[240px]" />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {new Date(msg.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function groupMessagesByDateAndSender(messages: ChatMessage[]) {
  // Implementation: group consecutive messages from same sender, insert date separators
  const groups: { isDateSeparator?: boolean; dateLabel?: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toLocaleDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ isDateSeparator: true, dateLabel: msgDate, messages: [] });
    }

    const lastGroup = groups[groups.length - 1];
    if (!lastGroup.isDateSeparator && lastGroup.messages.length > 0 && lastGroup.messages[0].senderId === msg.senderId) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ messages: [msg] });
    }
  }

  return groups;
}`,
  },

  // ── Forum Snippets ─────────────────────────────────────────────────────────

  {
    id: 'forum-thread-list',
    title: 'Forum Thread List Component',
    description: 'Thread list with vote buttons, reply count, category badge, and time display.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['forum', 'thread', 'list', 'component'],
    code: `interface ForumThread {
  id: number;
  title: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  categoryName: string;
  categoryColor?: string;
  upvotes: number;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  hasAcceptedAnswer: boolean;
  createdAt: string;
  lastActivityAt: string;
}

function ThreadList({ threads }: { threads: ForumThread[] }) {
  return (
    <div className="divide-y border rounded-xl overflow-hidden">
      {threads.map(thread => (
        <div key={thread.id} className={\`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors \${thread.isPinned ? 'bg-muted/30' : ''}\`}>
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 min-w-[48px]">
            <button className="text-muted-foreground hover:text-primary p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-sm font-medium">{thread.upvotes}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {thread.isPinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Pinned</span>}
              {thread.isLocked && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Locked</span>}
              {thread.hasAcceptedAnswer && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Solved</span>}
              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                backgroundColor: thread.categoryColor ? \`\${thread.categoryColor}20\` : undefined,
                color: thread.categoryColor ?? undefined,
              }}>{thread.categoryName}</span>
            </div>
            <h3 className="font-medium">
              <a href={\`/t/\${thread.id}\`} className="hover:text-primary transition-colors">{thread.title}</a>
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{thread.authorUsername}</span>
              <span>{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
              <span>{thread.viewCount} views</span>
              <span>last activity {formatTimeAgo(new Date(thread.lastActivityAt))}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return \`\${minutes}m ago\`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return \`\${hours}h ago\`;
  const days = Math.floor(hours / 24);
  if (days < 7) return \`\${days}d ago\`;
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}`,
  },

  // ── Drizzle Advanced Patterns ──────────────────────────────────────────────

  {
    id: 'drizzle-multi-tenant',
    title: 'Drizzle Multi-Tenant Query Scope',
    description: 'Helper that automatically scopes all queries to the current tenant/organization.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'multi-tenant', 'security', 'saas'],
    code: `import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { db } from './db';

type TenantTable = PgTable & { tenantId: any; deletedAt?: any };

export function tenantScope<T extends TenantTable>(table: T, tenantId: number) {
  const baseFilter = eq(table.tenantId, tenantId);
  const activeFilter = table.deletedAt
    ? and(baseFilter, isNull(table.deletedAt))
    : baseFilter;

  return {
    findMany: (options?: { limit?: number; offset?: number; orderBy?: any }) =>
      db.select().from(table)
        .where(activeFilter!)
        .orderBy(options?.orderBy ?? desc((table as any).createdAt))
        .limit(options?.limit ?? 50)
        .offset(options?.offset ?? 0),

    findById: (id: number) =>
      db.select().from(table)
        .where(and(activeFilter!, eq((table as any).id, id)))
        .then(rows => rows[0] ?? null),

    create: (data: any) =>
      db.insert(table).values({ ...data, tenantId }).returning().then(r => r[0]),

    update: (id: number, data: any) =>
      db.update(table)
        .set({ ...data, updatedAt: new Date() })
        .where(and(activeFilter!, eq((table as any).id, id)))
        .returning()
        .then(r => r[0] ?? null),

    softDelete: (id: number) =>
      db.update(table)
        .set({ deletedAt: new Date() } as any)
        .where(and(baseFilter, eq((table as any).id, id)))
        .returning({ id: (table as any).id })
        .then(r => r.length > 0),

    count: () =>
      db.select({ count: sql<number>\`count(*)\` }).from(table)
        .where(activeFilter!)
        .then(r => r[0]?.count ?? 0),
  };
}

// Usage in route handlers:
// const tasks = tenantScope(tasksTable, req.user.tenantId);
// const allTasks = await tasks.findMany({ limit: 20 });
// const task = await tasks.findById(42);
// const newTask = await tasks.create({ title: 'New task', status: 'active' });`,
  },

  {
    id: 'drizzle-search-filter-sort',
    title: 'Drizzle Dynamic Search, Filter, Sort',
    description: 'Build dynamic Drizzle queries from URL query params with search, filters, and sorting.',
    tech: ['drizzle', 'typescript', 'express'],
    tags: ['database', 'search', 'filter', 'sort', 'api'],
    code: `import { and, eq, ilike, or, desc, asc, sql, isNull, SQL } from 'drizzle-orm';

interface ListParams {
  search?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

function parseListParams(query: Record<string, string | undefined>): ListParams {
  return {
    search: query.search?.trim(),
    status: query.status,
    category: query.category,
    sortBy: query.sortBy || 'createdAt',
    sortDir: query.sortDir === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, Number(query.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(query.pageSize) || 20)),
  };
}

export async function listItems(params: ListParams, tenantId: number) {
  const conditions: SQL[] = [eq(items.tenantId, tenantId), isNull(items.deletedAt)];

  if (params.search) {
    conditions.push(or(
      ilike(items.title, \`%\${params.search}%\`),
      ilike(items.description, \`%\${params.search}%\`)
    )!);
  }

  if (params.status) conditions.push(eq(items.status, params.status));
  if (params.category) conditions.push(eq(items.category, params.category));

  const sortColumn = {
    createdAt: items.createdAt,
    title: items.title,
    status: items.status,
    updatedAt: items.updatedAt,
  }[params.sortBy!] ?? items.createdAt;

  const orderFn = params.sortDir === 'asc' ? asc : desc;
  const offset = ((params.page ?? 1) - 1) * (params.pageSize ?? 20);

  const [data, [{ total }]] = await Promise.all([
    db.select().from(items)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(params.pageSize ?? 20)
      .offset(offset),
    db.select({ total: sql<number>\`count(*)\` }).from(items)
      .where(and(...conditions)),
  ]);

  return {
    data,
    meta: {
      total: Number(total),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      totalPages: Math.ceil(Number(total) / (params.pageSize ?? 20)),
    },
  };
}

// Route handler:
// app.get('/api/items', authenticate, async (req, res) => {
//   const params = parseListParams(req.query as any);
//   const result = await listItems(params, req.user!.tenantId);
//   res.json(result);
// });`,
  },

  // ── Express Advanced Patterns ──────────────────────────────────────────────

  {
    id: 'express-rest-resource',
    title: 'Express RESTful Resource Router Factory',
    description: 'Factory function that generates a complete CRUD router for any Drizzle table with Zod validation.',
    tech: ['express', 'typescript', 'drizzle', 'zod'],
    tags: ['api', 'crud', 'factory', 'express', 'drizzle'],
    code: `import { Router } from 'express';
import { z, ZodObject, ZodRawShape } from 'zod';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { db } from './db';

interface ResourceOptions<T extends ZodRawShape> {
  table: PgTable & { id: any; createdAt: any; updatedAt?: any; deletedAt?: any };
  createSchema: ZodObject<T>;
  updateSchema: ZodObject<T>;
  resourceName: string;
}

export function createResourceRouter<T extends ZodRawShape>(options: ResourceOptions<T>): Router {
  const router = Router();
  const { table, createSchema, updateSchema, resourceName } = options;

  // LIST
  router.get('/', async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
      const conditions = table.deletedAt ? [isNull(table.deletedAt)] : [];

      const [data, [{ total }]] = await Promise.all([
        db.select().from(table).where(and(...conditions)).orderBy(desc(table.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
        db.select({ total: sql<number>\`count(*)\` }).from(table).where(and(...conditions)),
      ]);

      res.json({ data, meta: { total: Number(total), page, pageSize } });
    } catch (err) {
      console.error(\`[GET /\${resourceName}]\`, err);
      res.status(500).json({ error: \`Failed to list \${resourceName}\` });
    }
  });

  // GET BY ID
  router.get('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const conditions = [eq(table.id, id)];
      if (table.deletedAt) conditions.push(isNull(table.deletedAt));
      const [item] = await db.select().from(table).where(and(...conditions));
      if (!item) return res.status(404).json({ error: \`\${resourceName} not found\` });
      res.json(item);
    } catch (err) {
      console.error(\`[GET /\${resourceName}/:id]\`, err);
      res.status(500).json({ error: \`Failed to get \${resourceName}\` });
    }
  });

  // CREATE
  router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    try {
      const [item] = await db.insert(table).values(parsed.data as any).returning();
      res.status(201).json(item);
    } catch (err) {
      console.error(\`[POST /\${resourceName}]\`, err);
      res.status(500).json({ error: \`Failed to create \${resourceName}\` });
    }
  });

  // UPDATE
  router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const parsed = updateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    try {
      const updateData = { ...parsed.data, ...(table.updatedAt ? { updatedAt: new Date() } : {}) };
      const [item] = await db.update(table).set(updateData as any).where(eq(table.id, id)).returning();
      if (!item) return res.status(404).json({ error: \`\${resourceName} not found\` });
      res.json(item);
    } catch (err) {
      console.error(\`[PATCH /\${resourceName}/:id]\`, err);
      res.status(500).json({ error: \`Failed to update \${resourceName}\` });
    }
  });

  // DELETE (soft delete if table has deletedAt, hard delete otherwise)
  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    try {
      if (table.deletedAt) {
        const [item] = await db.update(table).set({ deletedAt: new Date() } as any).where(eq(table.id, id)).returning({ id: table.id });
        if (!item) return res.status(404).json({ error: \`\${resourceName} not found\` });
      } else {
        const result = await db.delete(table).where(eq(table.id, id));
      }
      res.sendStatus(204);
    } catch (err) {
      console.error(\`[DELETE /\${resourceName}/:id]\`, err);
      res.status(500).json({ error: \`Failed to delete \${resourceName}\` });
    }
  });

  return router;
}

// Usage:
// const taskRouter = createResourceRouter({
//   table: tasks,
//   createSchema: z.object({ title: z.string().min(1).max(200), status: z.enum(['active', 'done']).default('active') }),
//   updateSchema: z.object({ title: z.string().min(1).max(200), status: z.enum(['active', 'done']) }),
//   resourceName: 'tasks',
// });
// app.use('/api/tasks', authenticate, taskRouter);`,
  },

  // ── React Responsive Layout ────────────────────────────────────────────────

  {
    id: 'react-responsive-sidebar',
    title: 'Responsive Sidebar Layout',
    description: 'Dashboard layout with collapsible sidebar, mobile drawer, and persistent navigation.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['layout', 'sidebar', 'responsive', 'dashboard'],
    code: `interface NavItem { label: string; href: string; icon: React.ReactNode; badge?: number; }

function DashboardLayout({ children, navItems, title }: {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = window.location.pathname;

  const Sidebar = ({ mobile }: { mobile?: boolean }) => (
    <nav className={\`flex flex-col h-full \${mobile ? 'w-64' : 'w-60'}\`}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <a key={item.href} href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={\`flex items-center gap-3 px-4 py-2.5 text-sm mx-2 rounded-lg transition-colors \${
                isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }\`}>
              <span className="w-5 h-5">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex border-r bg-card">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative bg-card shadow-xl z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center gap-4 px-4 bg-card shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-muted rounded-lg" aria-label="Open menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS
// ============================================

export const EXPANDED_ANTI_PATTERNS: AntiPattern[] = [
  {
    id: 'no-loading-skeleton',
    name: 'Spinner instead of skeleton loading',
    description: 'Using a generic spinner for every loading state instead of skeleton screens that match the content layout.',
    whyBad: 'Spinners provide no information about what will appear. Users perceive skeleton screens as faster because they show the content structure. CLS (Cumulative Layout Shift) is high because the page jumps from spinner to content.',
    fix: 'Use skeleton screens that match the exact layout of the loaded content. Show shimmer animation for activity. Match heights, widths, and spacing of the actual content.',
    severity: 'medium',
    badExample: 'if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>',
    goodExample: 'if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}</div>',
    tags: ['react', 'ux', 'loading'],
  },
  {
    id: 'no-empty-state',
    name: 'Blank page for empty data',
    description: 'Showing a blank page or just "No results" when there is no data.',
    whyBad: 'New users see a blank page with no guidance. They do not know what the page is for or how to get started. Causes confusion and abandonment.',
    fix: 'Always show an empty state with: (1) an illustration/icon, (2) a clear heading, (3) a brief description, (4) a primary action button to create the first item.',
    severity: 'medium',
    badExample: '{items.length === 0 && <p>No items found</p>}',
    goodExample: '{items.length === 0 ? <EmptyState icon={<FolderIcon />} title="No projects yet" description="Create your first project to get started" actionLabel="New Project" onAction={handleCreate} /> : <ItemList items={items} />}',
    tags: ['react', 'ux'],
  },
  {
    id: 'unscoped-queries',
    name: 'Database queries not scoped to user/tenant',
    description: 'Fetching data without filtering by the authenticated user or tenant ID.',
    whyBad: 'Any user can access any other user\'s data by guessing IDs (IDOR — Insecure Direct Object Reference). This is the #1 access control vulnerability in web applications.',
    fix: 'EVERY query must include WHERE userId = $currentUserId or tenantId = $currentTenantId. Use a helper function like scopedQuery(req.user.id) that automatically adds the scope.',
    severity: 'critical',
    badExample: 'app.get("/api/tasks/:id", async (req, res) => { const task = await db.select().from(tasks).where(eq(tasks.id, req.params.id)); res.json(task); });',
    goodExample: 'app.get("/api/tasks/:id", authenticate, async (req, res) => { const [task] = await db.select().from(tasks).where(and(eq(tasks.id, Number(req.params.id)), eq(tasks.userId, req.user!.id))); if (!task) return res.status(404).json({ error: "Not found" }); res.json(task); });',
    tags: ['security', 'database', 'api'],
  },
  {
    id: 'missing-optimistic-ui',
    name: 'Waiting for server before updating UI',
    description: 'Disabling buttons and showing spinners for simple actions like toggling a checkbox or liking a post.',
    whyBad: 'Makes the app feel slow and unresponsive. Users expect instant feedback for simple actions. Network latency (100-500ms) creates a noticeable delay.',
    fix: 'Use optimistic updates: update the UI immediately, then sync with the server. Roll back on error. React Query onMutate → snapshot → update → onError → rollback → onSettled → invalidate.',
    severity: 'medium',
    badExample: 'const [isLoading, setIsLoading] = useState(false); const toggle = async () => { setIsLoading(true); await api.toggleTask(id); await refetch(); setIsLoading(false); }; <button disabled={isLoading}>{isLoading ? "..." : "✓"}</button>',
    goodExample: 'const toggle = useMutation({ mutationFn: () => api.toggleTask(id), onMutate: async () => { queryClient.setQueryData(["tasks"], old => old.map(t => t.id === id ? { ...t, done: !t.done } : t)); }, onSettled: () => queryClient.invalidateQueries(["tasks"]) });',
    tags: ['react', 'ux', 'performance'],
  },
  {
    id: 'no-accessibility',
    name: 'Missing accessibility attributes',
    description: 'Interactive elements without proper ARIA labels, roles, or keyboard support.',
    whyBad: 'Screen reader users cannot interact with your app. Keyboard-only users cannot navigate. Legal liability under ADA/EAA. Excludes 15% of users globally.',
    fix: 'Use semantic HTML (button, nav, main, aside). Add aria-label to icon-only buttons. Ensure all interactive elements are keyboard-focusable. Add aria-expanded to toggles. Use role="dialog" for modals with focus trap.',
    severity: 'high',
    badExample: '<div onClick={toggle} className="cursor-pointer"><svg /></div>',
    goodExample: '<button onClick={toggle} aria-label="Toggle menu" aria-expanded={isOpen}><svg aria-hidden="true" /></button>',
    tags: ['accessibility', 'react', 'html'],
  },
  {
    id: 'inline-styles-tailwind',
    name: 'Inconsistent styling (mixing inline, CSS modules, and Tailwind)',
    description: 'Using inline styles, CSS modules, and Tailwind utility classes randomly in the same component.',
    whyBad: 'Impossible to maintain consistent design. No design system enforcement. Three places to look for styles. Specificity wars between approaches.',
    fix: 'Pick ONE approach for the project and stick with it. In this stack: Tailwind utility classes for all styling. For dynamic values: use style prop only for truly dynamic CSS properties (e.g., width from data).',
    severity: 'medium',
    badExample: '<div style={{ padding: "16px" }} className="bg-white"><p className={styles.text}>Mixed approaches</p></div>',
    goodExample: '<div className="p-4 bg-white"><p className="text-sm text-muted-foreground">Consistent Tailwind</p></div>',
    tags: ['css', 'tailwind', 'maintainability'],
  },
  {
    id: 'no-error-recovery',
    name: 'No recovery path from errors',
    description: 'Showing error messages without a way for users to retry or recover.',
    whyBad: 'Users are stuck with an error and no next step. They have to manually refresh the page. Transient errors (network blip) permanently break the UI until refresh.',
    fix: 'Always include a retry button with error messages. For API errors: show a toast with "Retry" action. For page-level errors: show a full error page with "Try Again" button that re-fetches data.',
    severity: 'high',
    badExample: 'if (error) return <p className="text-red-500">Something went wrong</p>',
    goodExample: 'if (error) return <div className="text-center py-8"><p className="text-red-500 mb-3">{error.message}</p><button onClick={() => refetch()} className="text-sm text-primary underline">Try again</button></div>',
    tags: ['react', 'ux', 'error-handling'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES
// ============================================

export const EXPANDED_BEST_PRACTICES: BestPractice[] = [
  {
    id: 'accessibility-web',
    title: 'Web Accessibility (a11y)',
    category: 'accessibility',
    description: 'Build apps usable by everyone, including people using screen readers, keyboards, and assistive tech.',
    do: [
      'Use semantic HTML: button for actions, a for navigation, main/nav/aside for page structure',
      'Add aria-label to icon-only buttons and links',
      'Ensure all interactive elements have visible focus indicators',
      'Maintain 4.5:1 color contrast ratio for normal text (WCAG AA)',
      'Trap focus inside modals and return focus on close',
      'Add aria-live="polite" regions for dynamic content updates (toasts, counters)',
      'Use heading hierarchy (h1 → h2 → h3) without skipping levels',
      'Test with keyboard-only navigation — Tab, Enter, Escape, Arrow keys',
    ],
    dont: [
      'Use div/span with onClick instead of button for interactive elements',
      'Remove outline/focus styles for "aesthetics"',
      'Use color alone to convey information (add icons/text labels too)',
      'Auto-play audio or video without user consent',
      'Create custom interactive elements without proper ARIA roles and keyboard handlers',
    ],
    languages: ['html', 'typescript'],
  },
  {
    id: 'responsive-design',
    title: 'Responsive Design',
    category: 'ux',
    description: 'Build layouts that work across all screen sizes, from mobile (320px) to desktop (1920px+).',
    do: [
      'Design mobile-first: start with the smallest layout, then add complexity for larger screens',
      'Use Tailwind responsive prefixes: sm: md: lg: xl: for breakpoint-based styles',
      'Use CSS Grid for page-level layouts and Flexbox for component-level alignment',
      'Set max-width on content containers (max-w-7xl mx-auto) to prevent ultra-wide reading',
      'Use relative units (rem, %, vh/vw) instead of fixed pixels for major dimensions',
      'Test at 320px (small phone), 768px (tablet), 1024px (laptop), 1440px (desktop)',
      'Make touch targets at least 44x44px on mobile',
    ],
    dont: [
      'Use fixed pixel widths for containers (width: 1200px)',
      'Hide critical content on mobile — restructure instead',
      'Use horizontal scrolling for primary content',
      'Assume all users have a mouse — support touch and keyboard',
      'Set viewport width in meta tag to anything other than device-width',
    ],
    languages: ['css', 'html', 'typescript'],
  },
  {
    id: 'form-ux',
    title: 'Form UX Best Practices',
    category: 'ux',
    description: 'Design forms that are easy to use, validate clearly, and prevent errors.',
    do: [
      'Show inline validation errors below each field, not at the top of the form',
      'Validate on blur (field loss of focus), not on every keystroke',
      'Disable the submit button while submitting and show loading state',
      'Show success feedback after submission (toast, success page, or message)',
      'Use appropriate input types (email, tel, url, number) for mobile keyboard hints',
      'Mark required fields clearly — use asterisk (*) or "(required)" text',
      'Preserve form data if submission fails — never clear the form on error',
      'Use autocomplete attributes (name, email, tel) for browser autofill',
    ],
    dont: [
      'Clear the form on validation error — users lose their input',
      'Use alert() for form errors — use inline messages',
      'Validate only on submit — give real-time feedback as users type',
      'Show generic "Form is invalid" without identifying which fields need attention',
      'Use dropdown selects for fewer than 5 options — use radio buttons instead',
    ],
    languages: ['typescript', 'html'],
  },
  {
    id: 'animation-ux',
    title: 'Animation & Motion Design',
    category: 'ux',
    description: 'Use animation to improve UX with smooth transitions, meaningful feedback, and spatial awareness.',
    do: [
      'Use 200-300ms for most UI transitions (fast enough to feel instant, slow enough to see)',
      'Animate only transform and opacity — these are GPU-accelerated and skip layout/paint',
      'Add enter/exit animations to modals, toasts, and dropdown menus',
      'Use spring easing (ease-out) for natural-feeling motion',
      'Respect prefers-reduced-motion: disable animations for users who prefer reduced motion',
      'Use animation to show cause-and-effect (button press → modal appears from button)',
      'Stagger list item animations for visual appeal (each item delays 50ms more)',
    ],
    dont: [
      'Animate layout properties (width, height, top, left) — causes reflow and jank',
      'Use animations longer than 500ms for UI transitions — they feel sluggish',
      'Auto-play flashy animations that distract from content',
      'Block user interaction during animations',
      'Ignore prefers-reduced-motion media query',
    ],
    languages: ['css', 'typescript'],
  },
  {
    id: 'deployment-checklist',
    title: 'Production Deployment Checklist',
    category: 'deployment',
    description: 'Essential checks before shipping to production.',
    do: [
      'Set NODE_ENV=production for all production deployments',
      'Enable HTTPS and redirect HTTP → HTTPS',
      'Set security headers: CSP, X-Frame-Options, Strict-Transport-Security',
      'Configure CORS to allow only your frontend domain',
      'Implement health check endpoints (/health/live and /health/ready)',
      'Set up structured logging with pino — JSON output, no console.log',
      'Configure graceful shutdown (handle SIGTERM, finish in-flight requests)',
      'Run database migrations as part of deployment, not at app startup',
      'Set appropriate rate limits on all endpoints',
      'Remove all debug console.log statements',
    ],
    dont: [
      'Deploy without testing the production build locally first',
      'Use console.log in production — use a structured logger',
      'Expose stack traces or internal error details to API consumers',
      'Hard-code environment-specific values (URLs, secrets, ports)',
      'Deploy database migrations manually — automate them in CI/CD',
      'Skip the health check — load balancers need it to route traffic correctly',
    ],
    languages: ['typescript'],
  },
  {
    id: 'data-fetching-react',
    title: 'Data Fetching in React',
    category: 'react',
    description: 'Fetch, cache, and synchronize server data in React applications efficiently.',
    do: [
      'Use React Query (TanStack Query) for ALL server state — it handles caching, refetching, and deduplication',
      'Set staleTime based on data freshness needs (5 min for dashboard, 0 for real-time data)',
      'Use queryClient.invalidateQueries after mutations to keep data fresh',
      'Handle all three states: loading (skeleton), error (message + retry), success (data)',
      'Use select option in useQuery to transform data before it reaches the component',
      'Prefetch data for likely next pages (queryClient.prefetchQuery on hover)',
      'Use enabled option to conditionally fetch (e.g., only when a filter is selected)',
    ],
    dont: [
      'Use useState + useEffect for server data fetching — React Query replaces this pattern',
      'Store fetched data in useState/context — React Query is the cache',
      'Forget to handle loading and error states — every query needs all three',
      'Refetch on every render — set appropriate staleTime and cacheTime',
      'Fetch data in event handlers without using mutations — use useMutation for write operations',
    ],
    languages: ['typescript'],
  },
  {
    id: 'error-boundaries-strategy',
    title: 'Error Boundary Strategy',
    category: 'react',
    description: 'Strategically place error boundaries to prevent one component crash from taking down the entire app.',
    do: [
      'Wrap the root app with a top-level error boundary (last resort — shows error page)',
      'Wrap each major section (sidebar, main content, modal) with its own error boundary',
      'Wrap each route with an error boundary so navigation errors are isolated',
      'Show a meaningful fallback UI with a retry button, not a blank page',
      'Log the error and component stack to your error tracking service',
      'Reset the error boundary state when the user clicks "Try Again"',
    ],
    dont: [
      'Rely on a single root error boundary for the entire app',
      'Show generic "Something went wrong" without a way to recover',
      'Forget that error boundaries only catch render errors — not event handler errors',
      'Use error boundaries as a substitute for try-catch in async code',
    ],
    languages: ['typescript'],
  },
];
