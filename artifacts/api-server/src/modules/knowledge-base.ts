/**
 * Knowledge Base Module — The brain behind better code generation
 *
 * Provides: concepts, best practices, anti-patterns, code snippets,
 * and getContextForGeneration() — the key function that injects relevant
 * knowledge into LLM prompts to dramatically improve output quality.
 */

// ============================================
// Concepts
// ============================================

export interface Concept {
  id: string;
  name: string;
  category:
    | 'paradigm'
    | 'pattern'
    | 'principle'
    | 'data-structure'
    | 'algorithm'
    | 'architecture'
    | 'testing'
    | 'security'
    | 'performance'
    | 'typescript'
    | 'react'
    | 'database'
    | 'devops';
  description: string;
  explanation: string;
  examples: string[];
  relatedConcepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  languages: string[];
}

const CONCEPTS: Record<string, Concept> = {
  // ── Paradigms ────────────────────────────────────────────────────────────
  oop: {
    id: 'oop',
    name: 'Object-Oriented Programming',
    category: 'paradigm',
    description: 'A programming paradigm based on objects containing data and methods.',
    explanation: 'OOP organizes code into reusable "objects". The four pillars: Encapsulation (hiding internals), Inheritance (sharing code between classes), Polymorphism (same interface, different implementations), Abstraction (hiding complexity).',
    examples: ['class User { name: string; login() {} }', 'class AdminUser extends User { deleteUser() {} }'],
    relatedConcepts: ['solid', 'design-patterns', 'clean-architecture'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript', 'python', 'java'],
  },
  functional: {
    id: 'functional',
    name: 'Functional Programming',
    category: 'paradigm',
    description: 'Treats computation as evaluation of mathematical functions; avoids mutable state.',
    explanation: 'FP emphasizes pure functions (no side effects), immutability, and declarative code. Functions are first-class. Common techniques: map, filter, reduce, function composition, currying.',
    examples: ['const double = (x: number) => x * 2', 'const result = [1,2,3].map(double).filter(x => x > 2)'],
    relatedConcepts: ['pure-functions', 'immutability', 'higher-order-functions'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript', 'python', 'haskell'],
  },
  async: {
    id: 'async',
    name: 'Asynchronous Programming',
    category: 'paradigm',
    description: 'Writing code that can start operations without blocking the main thread.',
    explanation: 'Async code handles time-consuming operations (network, file I/O) without freezing the app. Use async/await in TypeScript. Always handle errors with try/catch around await expressions. Never mix .then() chains with await in the same function.',
    examples: [
      'async function getData(): Promise<User> { try { const res = await fetch(url); return res.json(); } catch (err) { throw new Error(`Fetch failed: ${err}`); } }',
    ],
    relatedConcepts: ['promises', 'error-handling', 'event-loop'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript', 'python'],
  },

  // ── SOLID & Principles ───────────────────────────────────────────────────
  solid: {
    id: 'solid',
    name: 'SOLID Principles',
    category: 'principle',
    description: 'Five design principles for maintainable object-oriented code.',
    explanation: 'S: Single Responsibility — one reason to change. O: Open/Closed — open for extension, closed for modification. L: Liskov Substitution — subtypes must be substitutable. I: Interface Segregation — many specific interfaces over one general. D: Dependency Inversion — depend on abstractions, not concretions.',
    examples: [
      'class UserEmailer { sendWelcome(user: User) {} } // Single responsibility — does not also handle user creation',
      'interface Readable { read(): string } // Interface segregation — not Readable + Writeable + Closeable all at once',
    ],
    relatedConcepts: ['oop', 'clean-architecture', 'design-patterns'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript', 'java'],
  },
  dry: {
    id: 'dry',
    name: "DRY (Don't Repeat Yourself)",
    category: 'principle',
    description: 'Every piece of knowledge should have a single, authoritative representation.',
    explanation: 'Extract repeated logic into reusable functions or components. If you find yourself copy-pasting, refactor. In React: shared components. In API: shared validation schemas. In DB: shared query helpers.',
    examples: ['// Extract: function validateEmail(email: string) { return /^[^@]+@[^@]+$/.test(email); }'],
    relatedConcepts: ['kiss', 'refactoring', 'clean-code'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  kiss: {
    id: 'kiss',
    name: 'KISS (Keep It Simple)',
    category: 'principle',
    description: 'Systems work best when kept simple rather than made complex.',
    explanation: 'Write the simplest code that solves the problem. Avoid over-engineering, premature abstraction, and speculative generality. Complexity is a bug multiplier.',
    examples: ['// Simple: users.find(u => u.id === id)', '// Over-engineered: UserRepositoryFactoryBuilder.createInstance().getUserById(id)'],
    relatedConcepts: ['dry', 'yagni', 'clean-code'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  yagni: {
    id: 'yagni',
    name: "YAGNI (You Aren't Gonna Need It)",
    category: 'principle',
    description: "Don't add functionality until it is actually necessary.",
    explanation: 'Resist building features just in case. Add abstraction when the second use case appears, not speculatively. Unused code increases maintenance burden without value.',
    examples: ['// Bad: plugin system for the one plugin you have', '// Good: direct implementation, refactor when the 2nd case arrives'],
    relatedConcepts: ['kiss', 'refactoring'],
    difficulty: 'beginner',
    languages: ['all'],
  },

  // ── Design Patterns ──────────────────────────────────────────────────────
  observer: {
    id: 'observer',
    name: 'Observer Pattern',
    category: 'pattern',
    description: 'Defines a one-to-many dependency so that when one object changes state, all dependents are notified.',
    explanation: 'Publishers (subjects) maintain a list of subscribers (observers) and notify them of state changes. Foundation of event systems, React state updates, and reactive programming. In React this is useEffect + state; in Node.js it is EventEmitter.',
    examples: [
      'eventBus.on("user:created", handler)',
      'const [count, setCount] = useState(0); // React component subscribes to count changes',
    ],
    relatedConcepts: ['pub-sub', 'event-sourcing', 'react-hooks'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },
  factory: {
    id: 'factory',
    name: 'Factory Pattern',
    category: 'pattern',
    description: 'Creates objects without specifying the exact class, using a factory function or method.',
    explanation: 'Instead of `new ConcreteClass()` scattered throughout code, centralise creation. Makes it easy to swap implementations, add construction logic, or inject dependencies. Common in dependency injection containers.',
    examples: [
      'function createNotifier(type: "email" | "sms"): Notifier { return type === "email" ? new EmailNotifier() : new SmsNotifier(); }',
    ],
    relatedConcepts: ['strategy', 'dependency-injection', 'solid'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },
  strategy: {
    id: 'strategy',
    name: 'Strategy Pattern',
    category: 'pattern',
    description: 'Defines a family of algorithms, encapsulates each one, and makes them interchangeable.',
    explanation: 'Extract varying behaviour into separate strategy objects. The context delegates to whichever strategy is injected. Great for sorting, payment processing, export formats, and auth methods.',
    examples: [
      'interface SortStrategy { sort(data: number[]): number[] }',
      'class Sorter { constructor(private strategy: SortStrategy) {} sort(d: number[]) { return this.strategy.sort(d); } }',
    ],
    relatedConcepts: ['factory', 'solid', 'dependency-injection'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },
  repository: {
    id: 'repository',
    name: 'Repository Pattern',
    category: 'pattern',
    description: 'Abstracts data access behind a clean interface, decoupling business logic from storage.',
    explanation: 'Define a repository interface with CRUD methods. The business logic calls the interface; the concrete implementation talks to Drizzle/Postgres. Enables unit testing with mock repos and easy storage swaps.',
    examples: [
      'interface UserRepository { findById(id: string): Promise<User | null>; save(user: User): Promise<User>; delete(id: string): Promise<void>; }',
      'class DrizzleUserRepository implements UserRepository { async findById(id: string) { return db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0] ?? null); } }',
    ],
    relatedConcepts: ['solid', 'dependency-injection', 'database'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  decorator: {
    id: 'decorator',
    name: 'Decorator Pattern',
    category: 'pattern',
    description: 'Attaches additional responsibilities to an object dynamically.',
    explanation: 'Wrap an object in another object that adds behaviour before/after delegating. In TypeScript this is also a language feature (@decorator). In Express it is middleware. In React it is Higher-Order Components (though hooks are preferred now).',
    examples: [
      'function withLogging<T extends object>(service: T): T { return new Proxy(service, { get(t, p) { return typeof t[p] === "function" ? (...a: any[]) => { console.log(p); return (t[p] as any)(...a); } : t[p]; } }); }',
    ],
    relatedConcepts: ['hoc', 'middleware', 'proxy-pattern'],
    difficulty: 'advanced',
    languages: ['typescript', 'javascript'],
  },
  pub_sub: {
    id: 'pub-sub',
    name: 'Pub/Sub Pattern',
    category: 'pattern',
    description: 'Decouples message senders (publishers) from message receivers (subscribers) via a broker.',
    explanation: 'Unlike Observer, publishers and subscribers do not know about each other — they communicate via an event channel or message broker. Used in WebSockets, Redis pub/sub, and event-driven microservices.',
    examples: [
      'class EventBus { private handlers = new Map<string, Set<Function>>(); on(event: string, h: Function) { ... } emit(event: string, data: any) { ... } }',
    ],
    relatedConcepts: ['observer', 'event-sourcing', 'microservices'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },
  command: {
    id: 'command',
    name: 'Command Pattern',
    category: 'pattern',
    description: 'Encapsulates a request as an object, enabling undo/redo, queuing, and logging.',
    explanation: 'Each operation becomes a Command object with an execute() and optionally undo() method. Commands can be queued, serialised, replayed, or reversed. Foundation of undo history in editors and transactional systems.',
    examples: [
      'interface Command { execute(): void; undo(): void; }',
      'class DeleteUserCommand implements Command { constructor(private repo: UserRepo, private userId: string, private backup?: User) {} async execute() { this.backup = await this.repo.findById(this.userId); await this.repo.delete(this.userId); } async undo() { if (this.backup) await this.repo.save(this.backup); } }',
    ],
    relatedConcepts: ['event-sourcing', 'cqrs', 'repository'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  // ── Architecture ─────────────────────────────────────────────────────────
  mvc: {
    id: 'mvc',
    name: 'MVC (Model-View-Controller)',
    category: 'architecture',
    description: 'Separates application concerns into Model (data), View (UI), and Controller (logic).',
    explanation: 'Model handles data and business logic. View displays UI. Controller receives input and coordinates them. In Express+React: routes are controllers, React components are views, Drizzle schemas are models.',
    examples: ['// Model: users Drizzle table', '// View: UsersTable React component', '// Controller: GET /api/users route'],
    relatedConcepts: ['clean-architecture', 'repository', 'rest'],
    difficulty: 'intermediate',
    languages: ['all'],
  },
  clean_architecture: {
    id: 'clean-architecture',
    name: 'Clean Architecture',
    category: 'architecture',
    description: 'Organises code into concentric layers: Entities, Use Cases, Interface Adapters, Frameworks.',
    explanation: 'Dependencies always point inward. Domain entities at the centre know nothing about databases or HTTP. Use cases orchestrate entities. Adapters translate between use cases and frameworks. Frameworks (Express, Drizzle) live at the outermost ring.',
    examples: ['Domain: User entity with business rules', 'Use Case: CreateUserUseCase', 'Adapter: ExpressCreateUserController', 'Framework: Express router, Drizzle ORM'],
    relatedConcepts: ['solid', 'repository', 'dependency-injection'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },
  rest: {
    id: 'rest',
    name: 'REST API',
    category: 'architecture',
    description: 'An architectural style using HTTP methods to perform CRUD on resources identified by URLs.',
    explanation: 'Resources are nouns (/users, /orders). Use GET (read), POST (create), PUT/PATCH (update), DELETE (remove). Return correct HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error, 500 Server Error. Stateless: no session on the server.',
    examples: ['GET /users — list', 'POST /users — create', 'PATCH /users/:id — partial update', 'DELETE /users/:id — delete'],
    relatedConcepts: ['http-status-codes', 'authentication', 'api-design'],
    difficulty: 'intermediate',
    languages: ['all'],
  },
  event_sourcing: {
    id: 'event-sourcing',
    name: 'Event Sourcing',
    category: 'architecture',
    description: 'Store state as a sequence of events rather than the current snapshot.',
    explanation: 'Instead of storing current values, store the events that led to them. Enables full audit logs, time-travel debugging, and event replays. Pairs well with CQRS. Complexity cost is high; use only when audit trail or temporal queries are a core requirement.',
    examples: ['OrderCreated { orderId, items, timestamp }', 'OrderShipped { orderId, trackingNo, timestamp }', 'State = events.reduce(applyEvent, initialState)'],
    relatedConcepts: ['cqrs', 'command', 'pub-sub'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },
  cqrs: {
    id: 'cqrs',
    name: 'CQRS (Command Query Responsibility Segregation)',
    category: 'architecture',
    description: 'Separates the model for reading data from the model for writing data.',
    explanation: 'Commands change state (CreateOrder, UpdateUser). Queries read state (GetUserById, ListOrders). Separate handlers, separate models, can use separate databases. Enables independent scaling of read/write paths. Overkill for simple CRUD; useful when read/write complexity diverges significantly.',
    examples: ['POST /orders (Command) → OrderCommandHandler', 'GET /orders (Query) → OrderQueryHandler with read-optimised view'],
    relatedConcepts: ['event-sourcing', 'command', 'repository'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },
  microservices: {
    id: 'microservices',
    name: 'Microservices',
    category: 'architecture',
    description: 'Splits an application into small, independently deployable services.',
    explanation: 'Each service owns its data and exposes an API. Benefits: independent deployment, technology choice per service, fault isolation. Costs: network latency, distributed transactions, operational complexity. Do not start with microservices — extract them from a monolith when specific services need independent scaling.',
    examples: ['UserService', 'OrderService', 'PaymentService', 'NotificationService'],
    relatedConcepts: ['rest', 'api-gateway', 'event-sourcing'],
    difficulty: 'advanced',
    languages: ['all'],
  },

  // ── TypeScript ───────────────────────────────────────────────────────────
  ts_generics: {
    id: 'ts-generics',
    name: 'TypeScript Generics',
    category: 'typescript',
    description: 'Type parameters that allow writing reusable, type-safe code for any type.',
    explanation: 'Generics avoid `any` while keeping code reusable. Use <T> to parameterise functions, classes, and interfaces. Add constraints with `extends`. Use default types with `= DefaultType`.',
    examples: [
      'function first<T>(arr: T[]): T | undefined { return arr[0]; }',
      'interface ApiResponse<T> { data: T; status: number; error?: string; }',
      'function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> { ... }',
    ],
    relatedConcepts: ['ts-utility-types', 'ts-type-guards'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  ts_utility_types: {
    id: 'ts-utility-types',
    name: 'TypeScript Utility Types',
    category: 'typescript',
    description: 'Built-in generic types for common type transformations.',
    explanation: 'Partial<T> makes all properties optional. Required<T> makes them required. Readonly<T> prevents mutation. Pick<T, K> selects keys. Omit<T, K> excludes keys. Record<K, V> maps keys to values. Exclude<T, U> removes union members. ReturnType<F> extracts return type. Parameters<F> extracts parameter types.',
    examples: [
      'type CreateUser = Omit<User, "id" | "createdAt">',
      'type UpdateUser = Partial<Pick<User, "name" | "email">>',
      'type UserRecord = Record<string, User>',
    ],
    relatedConcepts: ['ts-generics', 'ts-type-guards'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  ts_type_guards: {
    id: 'ts-type-guards',
    name: 'TypeScript Type Guards',
    category: 'typescript',
    description: 'Runtime checks that narrow a type within a conditional block.',
    explanation: 'Use `typeof`, `instanceof`, `in`, or custom type predicates to narrow union types. TypeScript narrows the type automatically in the true branch. Custom guards use `value is Type` return type.',
    examples: [
      'function isUser(x: unknown): x is User { return typeof x === "object" && x !== null && "id" in x && "email" in x; }',
      'if (error instanceof AppError) { res.status(error.statusCode).json({ error: error.message }); }',
    ],
    relatedConcepts: ['ts-generics', 'ts-discriminated-unions'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  ts_discriminated_unions: {
    id: 'ts-discriminated-unions',
    name: 'Discriminated Unions',
    category: 'typescript',
    description: 'Union types sharing a common literal property that TypeScript uses to narrow.',
    explanation: 'Add a discriminant property (type, kind, status) with a literal type to each union member. TypeScript exhaustively narrows in switch/if statements. This is the pattern for state machines, result types, and event types.',
    examples: [
      'type Result<T> = { ok: true; data: T } | { ok: false; error: string }',
      'type Action = { type: "increment" } | { type: "decrement" } | { type: "reset"; value: number }',
      'switch (action.type) { case "increment": ... case "reset": action.value; ... }',
    ],
    relatedConcepts: ['ts-type-guards', 'ts-generics'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── React ────────────────────────────────────────────────────────────────
  react_custom_hooks: {
    id: 'react-custom-hooks',
    name: 'React Custom Hooks',
    category: 'react',
    description: 'Functions starting with "use" that encapsulate stateful logic for reuse across components.',
    explanation: 'Extract logic that uses useState/useEffect/useRef into a custom hook. The hook returns state and actions — components only need the interface, not the implementation. Always start with "use" so React lint rules apply.',
    examples: [
      `function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: Error }>({ loading: false });
  const run = useCallback(async () => {
    setState({ loading: true });
    try { setState({ data: await fn(), loading: false }); }
    catch (error) { setState({ loading: false, error: error as Error }); }
  }, [fn]);
  return { ...state, run };
}`,
    ],
    relatedConcepts: ['react-context', 'react-memo', 'custom-hooks'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  react_context: {
    id: 'react-context',
    name: 'React Context API',
    category: 'react',
    description: 'Provides a way to pass data through the component tree without prop drilling.',
    explanation: 'Create a context with createContext, wrap your tree with a Provider, consume with useContext. Always create a custom hook (useMyContext) that includes a null check instead of calling useContext directly — this prevents incorrect usage outside the provider.',
    examples: [
      `const AuthContext = createContext<AuthContextType | null>(null);
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}`,
    ],
    relatedConcepts: ['react-custom-hooks', 'react-reducer'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  react_memo: {
    id: 'react-memo',
    name: 'React Memoisation (memo, useMemo, useCallback)',
    category: 'react',
    description: 'Prevents unnecessary re-renders and recalculations.',
    explanation: 'React.memo wraps a component to skip re-renders when props are unchanged. useMemo caches expensive computed values. useCallback caches function references. Only optimise when you have a measured performance problem — memoisation has a cost too.',
    examples: [
      'const ExpensiveList = React.memo(({ items }: { items: Item[] }) => <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>)',
      'const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items])',
      'const handleDelete = useCallback((id: string) => deleteItem(id), [deleteItem])',
    ],
    relatedConcepts: ['react-custom-hooks', 'memoization', 'performance'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  react_reducer: {
    id: 'react-reducer',
    name: 'useReducer Pattern',
    category: 'react',
    description: 'Manages complex state transitions with explicit action types instead of multiple useState calls.',
    explanation: 'Prefer useReducer over useState when state has multiple sub-values that change together, when next state depends on previous state, or when state updates are triggered by multiple events. Pair with discriminated union Action types for full type safety.',
    examples: [
      `type State = { count: number; loading: boolean; error?: string };
type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'reset' };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + 1 };
    case 'decrement': return { ...state, count: state.count - 1 };
    case 'reset': return { count: 0, loading: false };
  }
}`,
    ],
    relatedConcepts: ['ts-discriminated-unions', 'react-context', 'immutability'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  react_error_boundaries: {
    id: 'react-error-boundaries',
    name: 'Error Boundaries',
    category: 'react',
    description: 'React components that catch JavaScript errors in the subtree and render a fallback UI.',
    explanation: 'Error boundaries catch errors during render, in lifecycle methods, and in constructors of child components. They must be class components (no hook equivalent yet). Wrap major sections of your UI. The ErrorBoundary component receives the error and componentStack and can log to your error tracking service.',
    examples: [
      `class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error(error, info); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}`,
    ],
    relatedConcepts: ['react-custom-hooks', 'error-handling'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Security ─────────────────────────────────────────────────────────────
  jwt: {
    id: 'jwt',
    name: 'JSON Web Tokens (JWT)',
    category: 'security',
    description: 'Compact, URL-safe token for transmitting claims between parties.',
    explanation: 'JWT has three base64-encoded parts: header (algorithm), payload (claims), signature. Verify the signature on every request — never trust the payload without verifying. Store in HttpOnly cookies (not localStorage) to prevent XSS. Use short expiry (15 min) with refresh tokens. Algorithm must be RS256 or HS256 — NEVER "none".',
    examples: [
      'const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "15m" })',
      'const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload',
    ],
    relatedConcepts: ['authentication', 'cors', 'xss'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },
  xss: {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    category: 'security',
    description: 'Attack injecting malicious scripts into trusted websites.',
    explanation: 'XSS allows attackers to run JavaScript in the victim\'s browser to steal cookies, tokens, and perform actions. Prevent: use textContent not innerHTML with user data; sanitize with DOMPurify if HTML is required; set Content-Security-Policy header; use HttpOnly cookies for tokens.',
    examples: [
      '// Vulnerable: element.innerHTML = userInput',
      '// Safe: element.textContent = userInput',
      '// Safe HTML: element.innerHTML = DOMPurify.sanitize(userInput)',
    ],
    relatedConcepts: ['csrf', 'sql-injection', 'csp', 'jwt'],
    difficulty: 'intermediate',
    languages: ['javascript', 'html'],
  },
  sql_injection: {
    id: 'sql-injection',
    name: 'SQL Injection',
    category: 'security',
    description: 'Attack inserting malicious SQL via user input to manipulate database queries.',
    explanation: 'Never concatenate user input into SQL strings. Always use parameterised queries or an ORM (Drizzle/Prisma). With Drizzle: use .where(eq(table.col, userInput)) — Drizzle parameterises automatically. Validate and sanitise all inputs before they reach the database layer.',
    examples: [
      '// Vulnerable: db.execute(`SELECT * FROM users WHERE email = \'${email}\'`)',
      '// Safe (Drizzle): db.select().from(users).where(eq(users.email, email))',
      '// Safe (raw): db.execute("SELECT * FROM users WHERE email = $1", [email])',
    ],
    relatedConcepts: ['xss', 'input-validation', 'orm'],
    difficulty: 'intermediate',
    languages: ['sql', 'typescript'],
  },
  csrf: {
    id: 'csrf',
    name: 'CSRF (Cross-Site Request Forgery)',
    category: 'security',
    description: 'Attack tricks authenticated users into performing unwanted actions.',
    explanation: 'CSRF exploits the fact that browsers automatically send cookies. Defence: use SameSite=Strict/Lax cookie attribute; implement CSRF tokens for state-changing operations; validate Origin/Referer headers. REST APIs using JWT in Authorization header are naturally protected (no auto-browser-send).',
    examples: [
      'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" })',
    ],
    relatedConcepts: ['xss', 'jwt', 'cors'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },
  input_validation: {
    id: 'input-validation',
    name: 'Input Validation & Sanitisation',
    category: 'security',
    description: 'Validating and cleaning all external data before use.',
    explanation: 'Validate at the API boundary using Zod or Joi. Check types, lengths, formats, and ranges. Sanitise to remove dangerous characters. Never trust client-side validation alone — always validate on the server. For Drizzle schemas, also validate before inserting.',
    examples: [
      `const createUserSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).trim(),
});
const parsed = createUserSchema.safeParse(req.body);
if (!parsed.success) return res.status(422).json({ errors: parsed.error.flatten() });`,
    ],
    relatedConcepts: ['sql-injection', 'xss', 'zod'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },
  rate_limiting: {
    id: 'rate-limiting',
    name: 'Rate Limiting',
    category: 'security',
    description: 'Throttles the number of requests a client can make in a time window.',
    explanation: 'Prevents brute-force attacks, DoS, and API abuse. Apply globally and per-route (login and register need stricter limits). Use express-rate-limit with a sliding window. Return 429 Too Many Requests. Include Retry-After header. Track by IP and by user ID for authenticated routes.',
    examples: [
      `import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } });
app.post('/api/auth/login', loginLimiter, loginHandler);`,
    ],
    relatedConcepts: ['xss', 'csrf', 'input-validation'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Database ─────────────────────────────────────────────────────────────
  n_plus_one: {
    id: 'n-plus-one',
    name: 'N+1 Query Problem',
    category: 'database',
    description: 'Fetching a list of N items then making N individual queries to fetch related data.',
    explanation: 'Classic ORM mistake: load 100 users, then for each user load their profile = 101 queries. Fix with eager loading (JOIN), batch loading (WHERE id IN (...)), or Drizzle `with` for relations. Always look at the query count, not just query time.',
    examples: [
      '// Bad: users.map(u => db.select().from(profiles).where(eq(profiles.userId, u.id)))',
      '// Good (Drizzle): db.query.users.findMany({ with: { profile: true } })',
      '// Good (JOIN): db.select().from(users).leftJoin(profiles, eq(users.id, profiles.userId))',
    ],
    relatedConcepts: ['database-indexing', 'caching', 'orm'],
    difficulty: 'intermediate',
    languages: ['typescript', 'sql'],
  },
  database_indexing: {
    id: 'database-indexing',
    name: 'Database Indexing',
    category: 'database',
    description: 'Data structures that speed up data retrieval at the cost of write performance and storage.',
    explanation: 'Index columns used in WHERE, JOIN, and ORDER BY. Composite indexes match column order — index (a, b) helps queries on a and (a, b) but not just b. Avoid indexing low-cardinality columns (boolean, enum). Too many indexes slow writes. Use EXPLAIN ANALYZE to identify missing indexes.',
    examples: [
      '// Drizzle index: export const emailIdx = index("email_idx").on(users.email)',
      '// Composite: export const companyUserIdx = index().on(users.companyId, users.createdAt)',
    ],
    relatedConcepts: ['n-plus-one', 'database-transactions', 'performance'],
    difficulty: 'intermediate',
    languages: ['sql', 'typescript'],
  },
  database_transactions: {
    id: 'database-transactions',
    name: 'Database Transactions',
    category: 'database',
    description: 'Groups multiple operations into an atomic unit that either all succeed or all fail.',
    explanation: 'ACID: Atomicity (all or nothing), Consistency (rules always valid), Isolation (concurrent transactions do not interfere), Durability (committed data persists). Use transactions whenever multiple tables must stay in sync. In Drizzle: db.transaction(async (tx) => { ... }). On error in the callback, the transaction auto-rolls back.',
    examples: [
      `await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({ userId, total }).returning();
  await tx.insert(orderItems).values(items.map(i => ({ orderId: order.id, ...i })));
  await tx.update(inventory).set({ stock: sql\`stock - 1\` }).where(eq(inventory.productId, productId));
});`,
    ],
    relatedConcepts: ['database-indexing', 'n-plus-one', 'acid'],
    difficulty: 'intermediate',
    languages: ['typescript', 'sql'],
  },
  connection_pooling: {
    id: 'connection-pooling',
    name: 'Connection Pooling',
    category: 'database',
    description: 'Maintaining a pool of reusable database connections to reduce connection overhead.',
    explanation: 'Opening a new DB connection for every request is expensive (100–300 ms). A pool pre-opens N connections and reuses them. Configure max pool size based on DB limits (Postgres default: 100 connections). For serverless, use a pool-mode proxy (PgBouncer, Neon). Never call db.end() in request handlers.',
    examples: [
      'const pool = new Pool({ host, database, user, password, max: 10, idleTimeoutMillis: 30000 })',
    ],
    relatedConcepts: ['database-transactions', 'performance'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Testing ──────────────────────────────────────────────────────────────
  unit_testing: {
    id: 'unit-testing',
    name: 'Unit Testing',
    category: 'testing',
    description: 'Testing individual units of code in isolation with mocked dependencies.',
    explanation: 'Unit tests verify that small pieces of code work correctly in isolation. Mock all external dependencies (DB, API calls, file system). Should be fast (< 100 ms per test) and deterministic. Use AAA: Arrange (setup), Act (execute), Assert (verify).',
    examples: [
      `test('createUser hashes password', async () => {
  const mockRepo = { save: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com' }) };
  const user = await createUser({ email: 'a@b.com', password: 'secret' }, mockRepo);
  expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com' }));
  expect(mockRepo.save.mock.calls[0][0].password).not.toBe('secret');
});`,
    ],
    relatedConcepts: ['tdd', 'integration-testing', 'mocking'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },
  tdd: {
    id: 'tdd',
    name: 'Test-Driven Development',
    category: 'testing',
    description: 'Write a failing test first, then write minimum code to make it pass, then refactor.',
    explanation: 'Red → Green → Refactor cycle. Forces you to think about the interface before implementation. Results in high coverage naturally. Small cycles: add one test, make it pass, clean up, repeat.',
    examples: [
      '// 1. Red: test("sanitizeHtml removes scripts", () => { expect(sanitizeHtml("<script>")).toBe(""); })',
      '// 2. Green: function sanitizeHtml(html: string) { return html.replace(/<script[^>]*>.*?<\\/script>/gi, ""); }',
      '// 3. Refactor: use DOMPurify for robustness',
    ],
    relatedConcepts: ['unit-testing', 'bdd'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Performance ──────────────────────────────────────────────────────────
  caching: {
    id: 'caching',
    name: 'Caching',
    category: 'performance',
    description: 'Storing computed results to serve repeated requests faster.',
    explanation: 'Cache at the right level: in-memory (Map, LRU) for hot data, Redis for shared cache across instances, CDN for static assets, browser cache for immutable resources. Plan invalidation strategy upfront — stale cache is worse than no cache. Cache-aside pattern: check cache → miss → fetch → populate cache.',
    examples: [
      `const cache = new Map<string, { data: any; expiresAt: number }>();
function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.data);
  return fn().then(data => { cache.set(key, { data, expiresAt: Date.now() + ttlMs }); return data; });
}`,
    ],
    relatedConcepts: ['memoization', 'cdn', 'redis'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  memoization: {
    id: 'memoization',
    name: 'Memoization',
    category: 'performance',
    description: 'Caching function return values keyed on their arguments.',
    explanation: 'For pure functions (same input → same output): cache the result and return it on repeated calls. In React: useMemo for computed values, useCallback for function references. Do not memoize functions with side effects or when arguments change frequently.',
    examples: [
      'const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items])',
      'const memoize = <T>(fn: (...args: any[]) => T) => { const cache = new Map(); return (...args: any[]) => { const k = JSON.stringify(args); if (cache.has(k)) return cache.get(k); const v = fn(...args); cache.set(k, v); return v; }; };',
    ],
    relatedConcepts: ['caching', 'react-memo', 'pure-functions'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  lazy_loading: {
    id: 'lazy-loading',
    name: 'Lazy Loading & Code Splitting',
    category: 'performance',
    description: 'Deferring loading of resources until they are actually needed.',
    explanation: 'In React: use React.lazy() + Suspense to split code at route or component level. Vite does automatic code splitting at dynamic import() boundaries. Images: use loading="lazy". Routes are the primary split point — each page should be its own chunk.',
    examples: [
      `const Dashboard = React.lazy(() => import('./pages/Dashboard'));
<Suspense fallback={<PageSpinner />}><Dashboard /></Suspense>`,
      'const { default: heavyLib } = await import("./heavy-lib"); // Dynamic import',
    ],
    relatedConcepts: ['code-splitting', 'caching', 'performance'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
  debounce_throttle: {
    id: 'debounce-throttle',
    name: 'Debounce & Throttle',
    category: 'performance',
    description: 'Controlling the rate at which a function is called.',
    explanation: 'Debounce: delay execution until N ms after the last call. Use for search inputs, window resize, and form autosave. Throttle: allow at most one call per N ms. Use for scroll handlers, mouse move, and API polling. Both prevent excessive function calls from fast events.',
    examples: [
      `function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}`,
    ],
    relatedConcepts: ['performance', 'react-custom-hooks'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Data Structures ──────────────────────────────────────────────────────
  array: {
    id: 'array',
    name: 'Array',
    category: 'data-structure',
    description: 'Ordered collection of elements accessible by index.',
    explanation: 'O(1) access by index, O(n) search, O(1) push/pop at end, O(n) insert/remove at front or middle. In TypeScript, always type as T[] or readonly T[]. Prefer immutable array operations (map, filter, reduce) over mutation (push, splice) in React state.',
    examples: ['const arr: number[] = [1, 2, 3]; arr[0]; // O(1)', 'const next = [...arr, 4]; // immutable add'],
    relatedConcepts: ['stack', 'queue', 'hashmap'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  hashmap: {
    id: 'hashmap',
    name: 'Hash Map / Map / Record',
    category: 'data-structure',
    description: 'Key-value pairs with O(1) average lookup, insert, and delete.',
    explanation: 'Use Map for dynamic key-value pairs with non-string keys or order matters. Use plain objects / Record<K, V> for static typed shapes. Use WeakMap to hold metadata without preventing GC of keys. Iteration order is insertion order in modern JS.',
    examples: [
      'const byId = new Map(users.map(u => [u.id, u])); byId.get("123"); // O(1)',
      'const lookup: Record<string, User> = Object.fromEntries(users.map(u => [u.id, u]))',
    ],
    relatedConcepts: ['array', 'set'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  stack: {
    id: 'stack',
    name: 'Stack (LIFO)',
    category: 'data-structure',
    description: 'Last In, First Out — push and pop from the same end.',
    explanation: 'Used for undo/redo, call stacks, expression parsing, and DFS. JS arrays implement stacks via push() and pop(). In TypeScript, wrap in a typed class to make intent explicit.',
    examples: ['const stack: number[] = []; stack.push(1); stack.push(2); stack.pop(); // 2'],
    relatedConcepts: ['queue', 'array', 'dfs'],
    difficulty: 'beginner',
    languages: ['all'],
  },
  queue: {
    id: 'queue',
    name: 'Queue (FIFO)',
    category: 'data-structure',
    description: 'First In, First Out — enqueue at back, dequeue from front.',
    explanation: 'Used for task queues, BFS, and rate limiting. JS arrays implement naive queues via push() and shift() — but shift() is O(n). For high-throughput queues, use a linked-list or ring-buffer implementation.',
    examples: ['const q: number[] = []; q.push(1); q.push(2); q.shift(); // 1'],
    relatedConcepts: ['stack', 'array', 'bfs'],
    difficulty: 'beginner',
    languages: ['all'],
  },
};

// ============================================
// Anti-Pattern Registry — LLM bad habits
// ============================================

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  whyBad: string;
  fix: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  badExample: string;
  goodExample: string;
  tags: string[];
}

const ANTI_PATTERNS: AntiPattern[] = [
  {
    id: 'any-type',
    name: 'Using `any` type in TypeScript',
    description: 'Annotating variables, parameters, or return types with `any`.',
    whyBad: '`any` disables all type checking for that value. Errors that TypeScript would catch at compile time become runtime surprises. It defeats the entire purpose of TypeScript.',
    fix: 'Use `unknown` when the type is genuinely unknown, then narrow with type guards. Use generics to stay typed. Use `Record<string, unknown>` for arbitrary objects.',
    severity: 'high',
    badExample: 'function processData(data: any) { return data.name.toUpperCase(); }',
    goodExample: 'function processData(data: unknown): string { if (typeof data === "object" && data !== null && "name" in data) { return String((data as { name: unknown }).name).toUpperCase(); } throw new Error("Invalid data"); }',
    tags: ['typescript', 'types'],
  },
  {
    id: 'empty-catch',
    name: 'Empty catch blocks (swallowing errors)',
    description: 'catch blocks that do nothing, silently hiding errors.',
    whyBad: 'Errors disappear without trace. Bugs become impossible to diagnose. Users see broken UI with no indication of what went wrong.',
    fix: 'Always log the error at minimum. Rethrow if you cannot handle it. Update UI state to show the error. Use a monitoring service.',
    severity: 'critical',
    badExample: 'try { await saveUser(user); } catch (e) {}',
    goodExample: 'try { await saveUser(user); } catch (err) { console.error("[saveUser]", err); setError("Failed to save user. Please try again."); throw err; }',
    tags: ['error-handling', 'typescript'],
  },
  {
    id: 'array-index-key',
    name: 'Using array index as React key',
    description: 'Using the list index as the `key` prop when rendering React lists.',
    whyBad: 'When items are reordered, inserted, or deleted, index keys cause React to mis-identify elements, leading to wrong state, broken animations, and subtle rendering bugs.',
    fix: 'Use a stable, unique identifier from the data (e.g. item.id). If no ID exists, generate one once on creation and store it.',
    severity: 'high',
    badExample: '{items.map((item, index) => <ItemCard key={index} item={item} />)}',
    goodExample: '{items.map(item => <ItemCard key={item.id} item={item} />)}',
    tags: ['react', 'performance', 'rendering'],
  },
  {
    id: 'missing-loading-state',
    name: 'Missing loading and error states',
    description: 'Showing nothing, crashing, or displaying stale data while async operations are in progress or failed.',
    whyBad: 'Users see blank screens, unresponsive UIs, or data that is actually an error. Poor UX that signals broken software.',
    fix: 'Every async data fetch needs three states: loading (show skeleton/spinner), success (show data), error (show message with retry option). Use a custom useAsync hook to standardise this.',
    severity: 'high',
    badExample: 'function UserList() { const [users, setUsers] = useState([]); useEffect(() => { fetch("/api/users").then(r => r.json()).then(setUsers); }, []); return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>; }',
    goodExample: 'function UserList() { const { data: users, loading, error } = useQuery("/api/users"); if (loading) return <Skeleton />; if (error) return <ErrorMessage error={error} />; return <ul>{users!.map(u => <li key={u.id}>{u.name}</li>)}</ul>; }',
    tags: ['react', 'ux', 'async'],
  },
  {
    id: 'n-plus-one',
    name: 'N+1 Database Queries',
    description: 'Fetching N rows then making N individual queries to fetch related data.',
    whyBad: 'A list of 100 items becomes 101 DB round-trips. With each round-trip costing ~1 ms, a simple list page now takes 100+ ms from DB alone.',
    fix: 'Use JOIN queries or ORM eager loading. In Drizzle: use `with` in findMany. For heterogeneous loads: batch with WHERE id IN (...).',
    severity: 'critical',
    badExample: 'const orders = await db.select().from(ordersTable); for (const order of orders) { order.user = await db.select().from(users).where(eq(users.id, order.userId)); }',
    goodExample: 'const orders = await db.query.orders.findMany({ with: { user: true } });',
    tags: ['database', 'performance', 'drizzle'],
  },
  {
    id: 'console-log-production',
    name: 'console.log in production code',
    description: 'Leaving debug console.log statements in production code.',
    whyBad: 'Logs sensitive data (passwords, tokens, PII) to browser dev tools. Slows performance on hot paths. Pollutes logs. Creates accidental information disclosure.',
    fix: 'Use a proper logger (pino, winston) that respects LOG_LEVEL. Remove debug logs before commit. Use conditional logging: if (process.env.NODE_ENV !== "production") console.log(...).',
    severity: 'medium',
    badExample: 'console.log("user data:", user, "token:", token);',
    goodExample: 'logger.debug({ userId: user.id }, "User authenticated"); // pino structured logging',
    tags: ['security', 'logging', 'production'],
  },
  {
    id: 'hardcoded-secrets',
    name: 'Hardcoded credentials or secrets',
    description: 'Embedding API keys, passwords, or tokens directly in source code.',
    whyBad: 'Anyone with code access gets the secret. Git history exposes it forever. Rotation requires code changes.',
    fix: 'Store secrets in environment variables. Use process.env.SECRET_NAME. Never commit .env files. Validate required env vars at startup.',
    severity: 'critical',
    badExample: 'const apiKey = "sk-1234567890abcdef"; const dbPassword = "mysecretpassword";',
    goodExample: 'const apiKey = process.env.API_KEY; if (!apiKey) throw new Error("API_KEY env var is required");',
    tags: ['security', 'environment'],
  },
  {
    id: 'prop-drilling',
    name: 'Excessive prop drilling',
    description: 'Passing props through many component layers that do not use them.',
    whyBad: 'Every intermediate component becomes coupled to the data, making refactoring painful. Adding a new field requires touching every layer.',
    fix: 'Use React Context for truly global state (auth, theme, user). Use composition (children/render props) for localized concerns. Consider Zustand or Jotai for complex global state.',
    severity: 'medium',
    badExample: '<App user={user}><Layout user={user}><Sidebar user={user}><UserMenu user={user} /></Sidebar></Layout></App>',
    goodExample: '<AuthProvider initialUser={user}><App /></AuthProvider> // components use useAuth() hook',
    tags: ['react', 'architecture', 'context'],
  },
  {
    id: 'missing-error-boundary',
    name: 'No error boundaries in React tree',
    description: 'React component trees with no error boundaries to catch render errors.',
    whyBad: 'A single component throwing during render unmounts the ENTIRE app, showing users a blank white screen.',
    fix: 'Wrap major sections (routes, modals, sidebars) with ErrorBoundary. At minimum, wrap the root app.',
    severity: 'high',
    badExample: '<App /> // No error handling — one bad component kills everything',
    goodExample: '<ErrorBoundary fallback={<ErrorPage />}><App /></ErrorBoundary>',
    tags: ['react', 'error-handling', 'resilience'],
  },
  {
    id: 'massive-useeffect',
    name: 'Overloaded useEffect',
    description: 'A single useEffect doing multiple unrelated things with a long dependency array.',
    whyBad: 'Hard to reason about, has hidden re-run triggers, causes unexpected side effects when any dependency changes. Often masks missing cleanup.',
    fix: 'Split into multiple useEffects, one per concern. Add a comment stating what each effect is responsible for. Always return a cleanup function for subscriptions and timers.',
    severity: 'medium',
    badExample: 'useEffect(() => { fetchUser(); subscribeToWebSocket(); startTimer(); document.title = title; }, [userId, wsUrl, interval, title])',
    goodExample: 'useEffect(() => { fetchUser(); }, [userId]); useEffect(() => { const sub = subscribeToWebSocket(wsUrl); return () => sub.unsubscribe(); }, [wsUrl]);',
    tags: ['react', 'hooks', 'side-effects'],
  },
  {
    id: 'select-star',
    name: 'SELECT * in production queries',
    description: 'Selecting all columns when only a subset is needed.',
    whyBad: 'Fetches more data than needed. Breaks when columns are renamed/removed. Prevents query optimiser from using index-only scans.',
    fix: 'Always select specific columns with Drizzle: .select({ id: users.id, email: users.email }). Or use .select() without arguments only when you genuinely need all columns.',
    severity: 'medium',
    badExample: 'const users = await db.select().from(usersTable); // includes passwordHash, refreshToken, etc.',
    goodExample: 'const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable);',
    tags: ['database', 'performance', 'security'],
  },
  {
    id: 'missing-input-validation',
    name: 'Not validating API input',
    description: 'Using req.body directly without validating shape, types, and constraints.',
    whyBad: 'Any caller can send malformed data, causing crashes, data corruption, or SQL injection. req.body is typed as `any` — it could be anything.',
    fix: 'Validate every request body and query param with Zod at the start of every route handler. Fail fast with 422 before any business logic executes.',
    severity: 'critical',
    badExample: 'app.post("/users", async (req, res) => { const user = await createUser(req.body); res.json(user); });',
    goodExample: 'app.post("/users", async (req, res) => { const parsed = createUserSchema.safeParse(req.body); if (!parsed.success) return res.status(422).json({ errors: parsed.error.flatten() }); const user = await createUser(parsed.data); res.status(201).json(user); });',
    tags: ['security', 'validation', 'express'],
  },
  {
    id: 'no-pagination',
    name: 'Fetching unlimited rows',
    description: 'Querying tables without LIMIT, returning potentially thousands of rows.',
    whyBad: 'A table with 100k rows returns all rows on every page load, causing OOM errors, slow queries, and massive JSON payloads.',
    fix: 'Always add .limit() and .offset() to list queries. Use cursor-based pagination for large tables. Return pagination metadata (total, page, pageSize) in the response.',
    severity: 'high',
    badExample: 'const allUsers = await db.select().from(users); // Could return 1M rows',
    goodExample: 'const page = Number(req.query.page) || 1; const pageSize = 20; const users = await db.select().from(usersTable).limit(pageSize).offset((page - 1) * pageSize);',
    tags: ['database', 'performance', 'api'],
  },
  {
    id: 'synchronous-blocking',
    name: 'Synchronous blocking operations in Node.js',
    description: 'Using sync file I/O, crypto, or CPU-heavy operations on the main event loop.',
    whyBad: 'Node.js is single-threaded. A 100ms sync operation blocks ALL other requests for 100ms. Under load, this brings the server to a halt.',
    fix: 'Use async fs.promises, bcrypt.hash (async), and worker_threads for CPU work. Never use fs.readFileSync, crypto.pbkdf2Sync, or JSON.parse on large payloads in request handlers.',
    severity: 'high',
    badExample: 'app.post("/hash", (req, res) => { const hash = crypto.pbkdf2Sync(req.body.password, salt, 100000, 64, "sha512"); res.json({ hash }); });',
    goodExample: 'app.post("/hash", async (req, res) => { const hash = await bcrypt.hash(req.body.password, 12); res.json({ hash }); });',
    tags: ['nodejs', 'performance', 'async'],
  },
  {
    id: 'magic-numbers',
    name: 'Magic numbers and strings',
    description: 'Using unexplained literal values directly in code.',
    whyBad: 'Nobody knows what `86400000` or `status === 3` means without context. Changes require hunting down every occurrence. ',
    fix: 'Extract into named constants. Use TypeScript enums or const objects for sets of related values.',
    severity: 'low',
    badExample: 'if (user.status === 3) { setTimeout(cleanup, 86400000); }',
    goodExample: 'const UserStatus = { ACTIVE: 1, SUSPENDED: 2, DELETED: 3 } as const; const ONE_DAY_MS = 24 * 60 * 60 * 1000; if (user.status === UserStatus.DELETED) { setTimeout(cleanup, ONE_DAY_MS); }',
    tags: ['code-quality', 'maintainability'],
  },
];

// ============================================
// Tech Stack Code Snippets
// ============================================

export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  tech: string[];
  tags: string[];
  code: string;
}

const CODE_SNIPPETS: CodeSnippet[] = [
  // ── React Patterns ───────────────────────────────────────────────────────
  {
    id: 'react-async-hook',
    title: 'useAsync — universal async state hook',
    description: 'Wraps any async function with loading/error/data state. Reusable for all data fetching.',
    tech: ['react', 'typescript'],
    tags: ['hooks', 'async', 'loading'],
    code: `function useAsync<T>(asyncFn: () => Promise<T>, deps: React.DependencyList = []) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: false, error: null });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error });
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, execute };
}`,
  },
  {
    id: 'react-debounce-hook',
    title: 'useDebounce — debounced value hook',
    description: 'Returns a debounced version of a value, ideal for search inputs.',
    tech: ['react', 'typescript'],
    tags: ['hooks', 'performance', 'search'],
    code: `function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debouncedValue;
}`,
  },
  {
    id: 'react-local-storage-hook',
    title: 'useLocalStorage — persisted state hook',
    description: 'useState but synced to localStorage, with SSR safety.',
    tech: ['react', 'typescript'],
    tags: ['hooks', 'persistence'],
    code: `function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    const next = value instanceof Function ? value(storedValue) : value;
    setStoredValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };

  return [storedValue, setValue] as const;
}`,
  },
  {
    id: 'react-modal-pattern',
    title: 'Modal — accessible dialog pattern',
    description: 'A Tailwind modal with focus trap, escape key, backdrop click, and ARIA attributes.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['component', 'accessibility', 'modal'],
    code: `interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 id="modal-title" className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}`,
  },
  {
    id: 'react-data-table',
    title: 'DataTable — sortable, filterable table',
    description: 'A reusable generic table component with client-side sort and search.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['component', 'table', 'data'],
    code: `interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
}

function DataTable<T extends { id: string | number }>({ data, columns, searchKeys, emptyMessage = 'No results' }: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let rows = data;
    if (search && searchKeys) {
      const q = search.toLowerCase();
      rows = rows.filter(row => searchKeys.some(k => String(row[k]).toLowerCase().includes(q)));
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const v1 = String(a[sortKey]), v2 = String(b[sortKey]);
        return sortDir === 'asc' ? v1.localeCompare(v2) : v2.localeCompare(v1);
      });
    }
    return rows;
  }, [data, search, searchKeys, sortKey, sortDir]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="space-y-4">
      {searchKeys && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs" />}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>{columns.map(col => (
              <th key={String(col.key)} className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => col.sortable && toggleSort(col.key)}>
                {col.header}{col.sortable && sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">{emptyMessage}</td></tr>
            ) : filtered.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {columns.map(col => <td key={String(col.key)} className="px-4 py-3">{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'react-form-zod',
    title: 'Form with Zod validation',
    description: 'Controlled form component using Zod for validation, no external form library needed.',
    tech: ['react', 'typescript', 'zod', 'tailwind'],
    tags: ['form', 'validation', 'zod'],
    code: `const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

function LoginForm({ onSubmit }: { onSubmit: (values: FormValues) => Promise<void> }) {
  const [values, setValues] = useState<FormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.errors.map(e => [e.path[0], e.message])));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try { await onSubmit(result.data); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} className={\`border rounded-lg px-3 py-2 w-full \${errors.email ? 'border-red-500' : ''}\`} />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input type="password" value={values.password} onChange={e => setValues(v => ({ ...v, password: e.target.value }))} className={\`border rounded-lg px-3 py-2 w-full \${errors.password ? 'border-red-500' : ''}\`} />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>
      <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
        {submitting ? 'Loading...' : 'Sign In'}
      </button>
    </form>
  );
}`,
  },
  {
    id: 'react-toast-hook',
    title: 'useToast — notification system',
    description: 'Simple in-app toast/notification system without external dependencies.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['hooks', 'notifications', 'ux'],
    code: `interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

const ToastContext = createContext<((toast: Omit<Toast, 'id'>) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { ...toast, id }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={\`px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm \${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}\`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}`,
  },
  {
    id: 'react-error-boundary',
    title: 'ErrorBoundary — catch render errors',
    description: 'Wraps subtrees to show a fallback UI instead of crashing the whole app.',
    tech: ['react', 'typescript'],
    tags: ['error-handling', 'resilience'],
    code: `interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-500 font-medium">Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-3 text-sm underline">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}`,
  },
  {
    id: 'react-status-badge',
    title: 'StatusBadge — colour-coded status indicator',
    description: 'Reusable badge/pill with configurable status-to-colour mapping.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['component', 'ui'],
    code: `const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
  informational: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${colorClass}\`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}`,
  },
  // ── Drizzle Patterns ─────────────────────────────────────────────────────
  {
    id: 'drizzle-crud',
    title: 'Drizzle ORM — CRUD pattern',
    description: 'Complete type-safe CRUD operations with Drizzle ORM and Postgres.',
    tech: ['drizzle', 'typescript', 'postgres'],
    tags: ['database', 'crud', 'drizzle'],
    code: `// schema.ts
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

// repository.ts
export async function findItems(userId: number, page = 1, pageSize = 20) {
  return db.select().from(items)
    .where(eq(items.userId, userId))
    .orderBy(desc(items.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function findItemById(id: number, userId: number): Promise<Item | null> {
  const [item] = await db.select().from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));
  return item ?? null;
}

export async function createItem(data: Omit<NewItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
  const [item] = await db.insert(items).values(data).returning();
  return item;
}

export async function updateItem(id: number, userId: number, data: Partial<Pick<Item, 'name' | 'status'>>): Promise<Item | null> {
  const [item] = await db.update(items)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.userId, userId)))
    .returning();
  return item ?? null;
}

export async function deleteItem(id: number, userId: number): Promise<boolean> {
  const result = await db.delete(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));
  return (result.rowCount ?? 0) > 0;
}`,
  },
  {
    id: 'drizzle-transaction',
    title: 'Drizzle — transaction pattern',
    description: 'Atomic multi-table operation using Drizzle transactions.',
    tech: ['drizzle', 'typescript'],
    tags: ['database', 'transactions', 'atomic'],
    code: `export async function createOrderWithItems(
  userId: number,
  orderData: { total: number },
  orderItems: { productId: number; quantity: number; price: number }[]
): Promise<{ order: Order; items: OrderItem[] }> {
  return db.transaction(async (tx) => {
    const [order] = await tx.insert(orders)
      .values({ userId, total: orderData.total, status: 'pending' })
      .returning();

    const items = await tx.insert(orderItemsTable)
      .values(orderItems.map(item => ({ orderId: order.id, ...item })))
      .returning();

    // Decrement inventory for each product atomically
    for (const item of orderItems) {
      await tx.update(inventory)
        .set({ stock: sql\`stock - \${item.quantity}\` })
        .where(and(eq(inventory.productId, item.productId), gte(inventory.stock, item.quantity)));
    }

    return { order, items };
  });
}`,
  },
  {
    id: 'drizzle-pagination',
    title: 'Drizzle — cursor-based pagination',
    description: 'Efficient cursor-based pagination for large datasets.',
    tech: ['drizzle', 'typescript'],
    tags: ['database', 'pagination', 'performance'],
    code: `interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function paginateItems(cursor: string | null, limit = 20): Promise<PaginatedResult<Item>> {
  const query = db.select().from(items).orderBy(desc(items.createdAt), desc(items.id)).limit(limit + 1);

  if (cursor) {
    const [cursorCreatedAt, cursorId] = cursor.split('_');
    query.where(
      or(
        lt(items.createdAt, new Date(cursorCreatedAt)),
        and(eq(items.createdAt, new Date(cursorCreatedAt)), lt(items.id, Number(cursorId)))
      )
    );
  }

  const rows = await query;
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  const nextCursor = hasMore && last ? \`\${last.createdAt.toISOString()}_\${last.id}\` : null;

  return { data, nextCursor, hasMore };
}`,
  },
  // ── Express Patterns ─────────────────────────────────────────────────────
  {
    id: 'express-route-handler',
    title: 'Express — typed route handler with Zod validation',
    description: 'Full Express route handler pattern: validate input, handle errors, return typed response.',
    tech: ['express', 'typescript', 'zod'],
    tags: ['api', 'validation', 'error-handling'],
    code: `const createItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

app.post('/api/items', authenticate, async (req: AuthRequest, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const item = await createItem({ ...parsed.data, userId: req.user!.id });
    return res.status(201).json(item);
  } catch (err) {
    console.error('[POST /api/items]', err);
    return res.status(500).json({ error: 'Failed to create item' });
  }
});`,
  },
  {
    id: 'express-auth-middleware',
    title: 'Express — JWT authentication middleware',
    description: 'Middleware that verifies a JWT and attaches the user to the request.',
    tech: ['express', 'typescript', 'jwt'],
    tags: ['auth', 'middleware', 'security'],
    code: `import jwt from 'jsonwebtoken';

interface JwtPayload { userId: number; email: string; role: string; }

export interface AuthRequest extends express.Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== role) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}`,
  },
  {
    id: 'express-async-wrapper',
    title: 'Express — async error wrapper',
    description: 'Wraps async route handlers so thrown errors are forwarded to Express error middleware.',
    tech: ['express', 'typescript'],
    tags: ['error-handling', 'async', 'middleware'],
    code: `type AsyncHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncHandler): express.RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler — place at the end of middleware chain
export function errorHandler(err: any, req: express.Request, res: express.Response, _next: express.NextFunction) {
  const statusCode = err.statusCode ?? err.status ?? 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';

  console.error(\`[\${req.method} \${req.path}]\`, err);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

// Usage:
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await findUserById(req.params.id);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  res.json(user);
}));`,
  },
  // ── TypeScript Utilities ──────────────────────────────────────────────────
  {
    id: 'ts-result-type',
    title: 'Result type — type-safe error handling',
    description: 'Go-style Result<T, E> type for functions that can fail without throwing.',
    tech: ['typescript'],
    tags: ['error-handling', 'types', 'functional'],
    code: `type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function ok<T>(value: T): Result<T> { return { ok: true, value }; }
function err<E = Error>(error: E): Result<never, E> { return { ok: false, error }; }

async function tryParseUser(raw: unknown): Promise<Result<User>> {
  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) return err(new Error(parsed.error.message));
  return ok(parsed.data);
}

// Consumer — forced to handle both cases
const result = await tryParseUser(data);
if (!result.ok) {
  console.error('Parse failed:', result.error.message);
  return;
}
doSomethingWith(result.value); // TypeScript knows this is User`,
  },
  {
    id: 'ts-type-safe-env',
    title: 'Type-safe environment variables',
    description: 'Validates and types all env vars at startup — fails fast if required vars are missing.',
    tech: ['typescript', 'zod'],
    tags: ['configuration', 'environment', 'zod'],
    code: `import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CORS_ORIGIN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌  Invalid environment variables:');
    result.error.errors.forEach(e => console.error(\`  \${e.path.join('.')}: \${e.message}\`));
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv(); // Call once at startup`,
  },
];

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
      'Use descriptive names: getUserById, isValidEmail, handleFormSubmit',
      'camelCase for variables and functions in TypeScript',
      'PascalCase for React components, classes, interfaces, and type aliases',
      'SCREAMING_SNAKE_CASE for module-level constants: MAX_RETRY_COUNT',
      'Boolean names should be questions: isActive, hasPermission, shouldRender',
      'Event handlers: onSubmit, handleChange, onUserCreated',
    ],
    dont: [
      'Use single letters except loop counters (i, j) or math variables (x, y)',
      "Abbreviate unless universally known (btn, usr, cfg — confusing; id, url, css — fine)",
      'Name functions after implementation details (doSqlQuery vs getUser)',
      'Use generic names like data, info, item when more specific terms exist',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'error-handling',
    title: 'Error Handling',
    category: 'reliability',
    description: 'Errors should be caught, logged with context, and surfaced usefully to users and developers.',
    do: [
      'Always use try-catch around await expressions that can fail',
      'Log the error with context: method name, input params, user ID',
      'Use typed custom error classes: class NotFoundError extends Error { statusCode = 404 }',
      'Return appropriate HTTP status codes: 422 for validation, 404 for not found, 403 for auth',
      'Show user-friendly messages; log the technical details',
      'Use the Result<T> pattern for functions where failure is expected',
    ],
    dont: [
      'Use empty catch blocks that swallow errors silently',
      "Show raw database errors or stack traces to end users",
      'Use generic "Something went wrong" without logging the actual error',
      'Throw strings instead of Error objects (loses stack trace)',
      'Re-throw the same error after catching without adding context',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'typescript-strict',
    title: 'TypeScript Strict Mode',
    category: 'typescript',
    description: 'Leverage TypeScript\'s full power for catching bugs at compile time.',
    do: [
      'Enable strict: true in tsconfig.json (includes strictNullChecks, noImplicitAny)',
      'Use unknown instead of any for values of unknown type, then narrow',
      'Explicitly type all function parameters and return types for public APIs',
      'Use readonly for props and data that should not be mutated',
      'Use type or interface — be consistent within a file',
      'Use const assertions (as const) for literal tuple and object types',
    ],
    dont: [
      'Use any — ever. If you think you need any, use unknown with a type guard',
      'Suppress TypeScript errors with // @ts-ignore without a comment explaining why',
      'Use non-null assertion (!) on untrusted values — check first',
      'Mix type and interface randomly — pick one style per codebase',
    ],
    languages: ['typescript'],
  },
  {
    id: 'react-patterns',
    title: 'React Best Practices',
    category: 'react',
    description: 'Write maintainable, performant React applications.',
    do: [
      'Keep components small and focused on a single responsibility',
      'Use custom hooks to extract and share complex stateful logic',
      'Lift state only as high as it needs to go; co-locate state with the component that owns it',
      'Use useCallback and useMemo only when you have a measured performance issue',
      'Always handle loading, error, and empty states in components that fetch data',
      'Wrap major sections with ErrorBoundary components',
    ],
    dont: [
      'Mutate state directly — always use set functions: setState(prev => ({ ...prev, name }))',
      'Use array index as key for dynamic lists that can be reordered',
      'Create new objects/arrays/functions inline as props to memoised components',
      'Put everything in a single god component',
      'Use useEffect for state derivation — compute it during render instead',
    ],
    languages: ['typescript'],
  },
  {
    id: 'api-design',
    title: 'REST API Design',
    category: 'architecture',
    description: 'Design consistent, predictable REST APIs.',
    do: [
      'Use nouns for resources: GET /users, not GET /getUsers',
      'Return consistent JSON shapes: { data: T } or { data: T[]; meta: { total, page } }',
      'Return 201 Created for POST, 200 OK for GET/PATCH, 204 No Content for DELETE',
      'Validate all inputs with Zod and return 422 with field-level errors',
      'Version your API: /api/v1/users',
      'Paginate all list endpoints with page+pageSize or cursor+limit',
    ],
    dont: [
      'Use verbs in URLs: POST /createUser — use POST /users instead',
      'Return 200 for errors — use the correct HTTP status code',
      'Return different response shapes for success vs error in the same endpoint',
      'Return all fields including sensitive ones (passwordHash, internalNotes)',
      'Allow unbounded list endpoints without pagination',
    ],
    languages: ['typescript'],
  },
  {
    id: 'database',
    title: 'Database Best Practices',
    category: 'data',
    description: 'Efficient, safe, and maintainable database usage.',
    do: [
      'Index columns used in WHERE, JOIN ON, and ORDER BY clauses',
      'Use transactions for operations that must succeed or fail together',
      'Use parameterised queries always — Drizzle does this automatically',
      'Select only the columns you need, not SELECT *',
      'Add .limit() to every list query',
      'Add createdAt and updatedAt to every table for audit trail',
    ],
    dont: [
      'Concatenate user input into SQL strings',
      'Store passwords in plain text — use bcrypt with cost factor ≥ 12',
      'Run list queries without LIMIT',
      'Use SELECT * in production — over-fetches, including sensitive columns',
      'Do N+1 queries — use JOINs or eager loading with Drizzle `with`',
      'Ignore transactions for multi-table writes',
    ],
    languages: ['typescript', 'sql'],
  },
  {
    id: 'security',
    title: 'Security Best Practices',
    category: 'security',
    description: 'Protect your application and user data by default.',
    do: [
      'Validate and sanitize all user input on the server with Zod',
      'Use parameterised queries (Drizzle does this automatically)',
      'Hash passwords with bcrypt (cost ≥ 12) or argon2',
      'Store JWT tokens in HttpOnly, Secure, SameSite=Strict cookies',
      'Apply rate limiting to all auth endpoints (login, register, password reset)',
      'Set security headers: CSP, X-Frame-Options, X-Content-Type-Options',
    ],
    dont: [
      'Store passwords in plain text or reversible encryption',
      'Store JWTs in localStorage — XSS can steal them',
      'Trust client-side validation alone',
      'Expose internal error details (stack traces, SQL errors) to API consumers',
      'Store secrets in code — use environment variables',
      'Use eval() or innerHTML with any user-supplied data',
    ],
    languages: ['typescript'],
  },
  {
    id: 'state-management',
    title: 'React State Management',
    category: 'react',
    description: 'Choose the right state tool for the right scope.',
    do: [
      'Use useState for simple, local component state',
      'Use useReducer when state has multiple sub-values or complex transitions',
      'Use Context only for truly cross-cutting concerns (auth, theme, locale)',
      'Co-locate state: put it in the lowest common ancestor that needs it',
      'Use a library (Zustand, Jotai) only when Context performance becomes a problem',
      'Keep server state (fetched data) separate from UI state (modal open, filter value)',
    ],
    dont: [
      'Put everything in a single global store',
      'Use Context for high-frequency updates (it re-renders all consumers)',
      'Derive state from other state with useEffect — compute it during render',
      'Mix server state and UI state in the same useState call',
    ],
    languages: ['typescript'],
  },
  {
    id: 'performance-react',
    title: 'React Performance',
    category: 'performance',
    description: 'Optimise React apps based on measurements, not assumptions.',
    do: [
      'Profile first with React DevTools Profiler before optimising',
      'Use React.lazy() + Suspense to code-split at route boundaries',
      'Virtualize long lists (react-window, react-virtual)',
      'Use loading="lazy" on images below the fold',
      'Cache expensive API responses on the server (Redis, CDN)',
      'Debounce search inputs with useDebounce hook',
    ],
    dont: [
      'Wrap every component in React.memo without profiling first',
      'Add useMemo/useCallback everywhere speculatively',
      'Load all page data on initial mount — use pagination and deferred loading',
      'Inline new object/array creation as props to memoised components',
      'Store derived data in state — compute it in the render instead',
    ],
    languages: ['typescript'],
  },
  {
    id: 'testing-strategy',
    title: 'Testing Strategy (Testing Pyramid)',
    category: 'testing',
    description: 'Balance speed and confidence across the testing pyramid.',
    do: [
      'Write many fast unit tests for business logic and utilities',
      'Write integration tests for API routes (real DB, no mocks)',
      'Write a small number of E2E tests for critical user journeys',
      'Use Vitest for unit and integration tests in this stack',
      'Use Playwright or Cypress for E2E',
      'Aim for 80%+ coverage on business logic — 100% is rarely worth it',
    ],
    dont: [
      'Mock everything in integration tests — defeats the purpose',
      'Write E2E tests for every UI detail — use snapshots or unit tests',
      'Skip error path testing — they are often the most important paths',
      'Test implementation details — test behaviour and outcomes',
      'Let tests become unmaintainable by testing too many things per test',
    ],
    languages: ['typescript'],
  },
];

// ============================================
// Learning Paths
// ============================================

export interface LearningPath {
  title: string;
  description: string;
  concepts: string[];
  estimatedHours: number;
}

const LEARNING_PATHS: Record<string, LearningPath> = {
  'web-development': {
    title: 'Web Development Fundamentals',
    description: 'Core concepts for modern web development with TypeScript and React',
    concepts: ['array', 'hashmap', 'oop', 'functional', 'async', 'rest', 'mvc', 'input-validation'],
    estimatedHours: 40,
  },
  'react': {
    title: 'React Mastery',
    description: 'Become proficient in React development with TypeScript',
    concepts: ['functional', 'oop', 'async', 'react-custom-hooks', 'react-context', 'react-memo', 'react-reducer', 'react-error-boundaries', 'memoization'],
    estimatedHours: 30,
  },
  'backend': {
    title: 'Backend Development',
    description: 'Build robust server-side applications with Express and Drizzle',
    concepts: ['rest', 'async', 'repository', 'database-transactions', 'database-indexing', 'n-plus-one', 'connection-pooling', 'caching', 'rate-limiting', 'input-validation'],
    estimatedHours: 50,
  },
  'security': {
    title: 'Application Security',
    description: 'Secure web applications against the OWASP Top 10 and beyond',
    concepts: ['xss', 'sql-injection', 'csrf', 'jwt', 'input-validation', 'rate-limiting'],
    estimatedHours: 20,
  },
  'typescript': {
    title: 'TypeScript Deep Dive',
    description: 'Master TypeScript for safer, more maintainable code',
    concepts: ['ts-generics', 'ts-utility-types', 'ts-type-guards', 'ts-discriminated-unions', 'solid', 'functional'],
    estimatedHours: 25,
  },
  'architecture': {
    title: 'Software Architecture Patterns',
    description: 'Design systems that scale and remain maintainable',
    concepts: ['solid', 'clean-architecture', 'repository', 'factory', 'strategy', 'observer', 'command', 'event-sourcing', 'cqrs', 'microservices'],
    estimatedHours: 35,
  },
  'performance': {
    title: 'Performance Engineering',
    description: 'Optimise frontend and backend performance systematically',
    concepts: ['caching', 'memoization', 'lazy-loading', 'debounce-throttle', 'n-plus-one', 'database-indexing', 'connection-pooling', 'react-memo'],
    estimatedHours: 20,
  },
};

// ============================================
// Context for Generation — The key function
// ============================================

export interface GenerationContext {
  appType?: string;
  domain?: string;
  features?: string[];
  entities?: string[];
  fileExtension?: 'ts' | 'tsx' | 'js' | 'jsx';
  fileRole?: 'component' | 'route' | 'hook' | 'schema' | 'util' | 'middleware' | 'service';
  techStack?: string[];
  isAuthRequired?: boolean;
  hasDatabaseAccess?: boolean;
}

/**
 * Returns a rich knowledge context block for injection into LLM system prompts.
 * Call before generating each file or stage to give the LLM relevant guidance.
 */
export function getContextForGeneration(ctx: GenerationContext): string {
  const lines: string[] = [];
  lines.push('## Knowledge Base: Relevant Guidance for This Generation');
  lines.push('');

  // ── Anti-patterns relevant to this file type ─────────────────────────────
  const relevantAntiPatterns: AntiPattern[] = [];

  if (ctx.fileExtension === 'tsx' || ctx.fileRole === 'component' || ctx.fileRole === 'hook') {
    relevantAntiPatterns.push(
      ...ANTI_PATTERNS.filter(ap => ap.tags.some(t => ['react', 'hooks', 'ux', 'rendering'].includes(t)))
    );
  }
  if (ctx.hasDatabaseAccess || ctx.fileRole === 'route' || ctx.fileRole === 'service') {
    relevantAntiPatterns.push(
      ...ANTI_PATTERNS.filter(ap => ap.tags.some(t => ['database', 'drizzle', 'performance'].includes(t)))
    );
  }
  if (ctx.fileRole === 'route' || ctx.fileRole === 'middleware') {
    relevantAntiPatterns.push(
      ...ANTI_PATTERNS.filter(ap => ap.tags.some(t => ['api', 'validation', 'security', 'express'].includes(t)))
    );
  }
  // Always add these universal anti-patterns
  relevantAntiPatterns.push(
    ...ANTI_PATTERNS.filter(ap => ['any-type', 'empty-catch', 'hardcoded-secrets', 'console-log-production'].includes(ap.id))
  );

  const uniqueAntiPatterns = Array.from(new Map(relevantAntiPatterns.map(ap => [ap.id, ap])).values()).slice(0, 8);

  if (uniqueAntiPatterns.length > 0) {
    lines.push('### Anti-Patterns to AVOID in This File');
    for (const ap of uniqueAntiPatterns) {
      lines.push(`\n**❌ ${ap.name}** (${ap.severity})`);
      lines.push(`Why bad: ${ap.whyBad}`);
      lines.push(`Fix: ${ap.fix}`);
      lines.push(`Bad:  \`${ap.badExample}\``);
      lines.push(`Good: \`${ap.goodExample}\``);
    }
    lines.push('');
  }

  // ── Code snippets relevant to this file ──────────────────────────────────
  const relevantSnippets: CodeSnippet[] = [];

  if (ctx.fileExtension === 'tsx' || ctx.fileRole === 'component') {
    if (ctx.features?.some(f => /table|list|grid/.test(f.toLowerCase()))) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-data-table')!);
    if (ctx.features?.some(f => /modal|dialog|popup/.test(f.toLowerCase()))) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-modal-pattern')!);
    if (ctx.features?.some(f => /form|create|edit|update/.test(f.toLowerCase()))) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-form-zod')!);
    if (ctx.features?.some(f => /status|badge|tag/.test(f.toLowerCase()))) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-status-badge')!);
    if (ctx.features?.some(f => /toast|notif|alert/.test(f.toLowerCase()))) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-toast-hook')!);
    if (ctx.features?.some(f => /search|filter|debounce/.test(f.toLowerCase()))) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-debounce-hook')!);
  }
  if (ctx.fileRole === 'hook') {
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-async-hook')!);
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'react-local-storage-hook')!);
  }
  if (ctx.hasDatabaseAccess && ctx.fileRole === 'service') {
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'drizzle-crud')!);
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'drizzle-transaction')!);
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'drizzle-pagination')!);
  }
  if (ctx.fileRole === 'route') {
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'express-route-handler')!);
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'express-async-wrapper')!);
    if (ctx.isAuthRequired) relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'express-auth-middleware')!);
  }
  if (ctx.fileRole === 'schema') {
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'drizzle-crud')!);
    relevantSnippets.push(CODE_SNIPPETS.find(s => s.id === 'ts-type-safe-env')!);
  }

  const uniqueSnippets = Array.from(new Map(relevantSnippets.filter(Boolean).map(s => [s.id, s])).values()).slice(0, 4);

  if (uniqueSnippets.length > 0) {
    lines.push('### Reference Code Patterns');
    lines.push('Use these as the basis for your implementation in this file:');
    for (const snippet of uniqueSnippets) {
      lines.push(`\n#### ${snippet.title}`);
      lines.push(snippet.description);
      lines.push('```typescript');
      lines.push(snippet.code);
      lines.push('```');
    }
    lines.push('');
  }

  // ── Relevant best practices ───────────────────────────────────────────────
  const practiceIds: string[] = [];
  if (ctx.fileExtension === 'tsx' || ctx.fileRole === 'component') practiceIds.push('react-patterns', 'state-management', 'performance-react');
  if (ctx.fileRole === 'route') practiceIds.push('api-design', 'security', 'error-handling');
  if (ctx.hasDatabaseAccess) practiceIds.push('database');
  practiceIds.push('naming', 'typescript-strict');

  const relevantPractices = Array.from(new Set(practiceIds)).map(id => BEST_PRACTICES.find(bp => bp.id === id)).filter(Boolean) as BestPractice[];

  if (relevantPractices.length > 0) {
    lines.push('### Best Practices to Apply');
    for (const bp of relevantPractices.slice(0, 4)) {
      lines.push(`\n**${bp.title}**: ${bp.description}`);
      lines.push(`Do: ${bp.do.slice(0, 3).join(' | ')}`);
      lines.push(`Don't: ${bp.dont.slice(0, 2).join(' | ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Returns a compact anti-pattern checklist for inclusion in stage system prompts.
 * Shorter than getContextForGeneration — suitable for every stage.
 */
export function getAntiPatternChecklist(tags: string[] = []): string {
  const all = tags.length > 0
    ? ANTI_PATTERNS.filter(ap => ap.tags.some(t => tags.includes(t)))
    : ANTI_PATTERNS.filter(ap => ap.severity === 'critical' || ap.severity === 'high');

  const critical = all.filter(ap => ap.severity === 'critical');
  const high = all.filter(ap => ap.severity === 'high').slice(0, 5);

  const lines = ['## Critical Anti-Patterns to Avoid'];
  for (const ap of [...critical, ...high].slice(0, 8)) {
    lines.push(`- ❌ ${ap.name}: ${ap.fix}`);
  }
  return lines.join('\n');
}

// ============================================
// API Functions
// ============================================

export function getConcept(id: string): Concept | null {
  return CONCEPTS[id] ?? null;
}

export function searchConcepts(query: string): Concept[] {
  const lower = query.toLowerCase();
  return Object.values(CONCEPTS).filter(c =>
    c.name.toLowerCase().includes(lower) ||
    c.description.toLowerCase().includes(lower) ||
    c.category.toLowerCase().includes(lower) ||
    c.relatedConcepts.some(r => r.includes(lower))
  );
}

export function getConceptsByCategory(category: Concept['category']): Concept[] {
  return Object.values(CONCEPTS).filter(c => c.category === category);
}

export function getConceptsByDifficulty(difficulty: Concept['difficulty']): Concept[] {
  return Object.values(CONCEPTS).filter(c => c.difficulty === difficulty);
}

export function getAllAntiPatterns(): AntiPattern[] {
  return ANTI_PATTERNS;
}

export function getAntiPatternsByTag(tag: string): AntiPattern[] {
  return ANTI_PATTERNS.filter(ap => ap.tags.includes(tag));
}

export function getAntiPatternsBySeverity(severity: AntiPattern['severity']): AntiPattern[] {
  return ANTI_PATTERNS.filter(ap => ap.severity === severity);
}

export function getAllCodeSnippets(): CodeSnippet[] {
  return CODE_SNIPPETS;
}

export function getSnippetsByTech(tech: string): CodeSnippet[] {
  return CODE_SNIPPETS.filter(s => s.tech.includes(tech.toLowerCase()));
}

export function getSnippetsByTag(tag: string): CodeSnippet[] {
  return CODE_SNIPPETS.filter(s => s.tags.includes(tag.toLowerCase()));
}

export function getBestPractices(category?: string): BestPractice[] {
  if (category) return BEST_PRACTICES.filter(bp => bp.category === category);
  return BEST_PRACTICES;
}

export function getBestPractice(id: string): BestPractice | null {
  return BEST_PRACTICES.find(bp => bp.id === id) ?? null;
}

export function getRelatedConcepts(conceptId: string): Concept[] {
  const concept = CONCEPTS[conceptId];
  if (!concept) return [];
  return concept.relatedConcepts.map(id => CONCEPTS[id]).filter(Boolean);
}

export function getLearningPath(topic: string): LearningPath | null {
  return LEARNING_PATHS[topic] ?? null;
}

export function getAllLearningPaths(): LearningPath[] {
  return Object.values(LEARNING_PATHS);
}

export function formatConceptAsMarkdown(concept: Concept): string {
  return `## ${concept.name}

**Category**: ${concept.category} | **Difficulty**: ${concept.difficulty} | **Languages**: ${concept.languages.join(', ')}

${concept.description}

### Explanation
${concept.explanation}

### Examples
${concept.examples.map(e => `\`\`\`typescript\n${e}\n\`\`\``).join('\n')}

### Related Concepts
${concept.relatedConcepts.map(r => `- ${r}`).join('\n')}
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

export function formatAntiPatternAsMarkdown(ap: AntiPattern): string {
  return `## ❌ ${ap.name} (${ap.severity.toUpperCase()})

${ap.description}

**Why bad**: ${ap.whyBad}

**Fix**: ${ap.fix}

### Bad Example
\`\`\`typescript
${ap.badExample}
\`\`\`

### Good Example
\`\`\`typescript
${ap.goodExample}
\`\`\`

**Tags**: ${ap.tags.join(', ')}
`;
}
