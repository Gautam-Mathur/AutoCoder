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
// Entity Archetype Registry
// Maps real-world entity names → structured field/relationship guidance
// Used by NLU, schema generation, and code-gen stages
// ============================================

export interface EntityArchetype {
  id: string;
  name: string;
  /** Other names this entity might be called */
  aliases: string[];
  domain: string;
  description: string;
  /** Canonical traits this entity has */
  traits: Array<'pageable' | 'auditable' | 'searchable' | 'workflowable' | 'taggable' | 'attachable' | 'commentable' | 'assignable' | 'schedulable' | 'hierarchical' | 'versioned' | 'soft-deletable'>;
  /** Suggested DB columns */
  suggestedFields: Array<{ name: string; type: string; nullable: boolean; description: string }>;
  /** Suggested FK relationships */
  relatedEntities: string[];
  /** Recommended DB indexes */
  suggestedIndexes: string[];
  /** State machine definition if applicable */
  defaultWorkflow?: { states: string[]; transitions: Array<{ from: string; to: string; action: string }> };
  /** Typical API endpoints for this entity */
  typicalEndpoints: string[];
}

const ENTITY_ARCHETYPES: Record<string, EntityArchetype> = {

  // ── Security Domain ──────────────────────────────────────────────────────

  vulnerability: {
    id: 'vulnerability',
    name: 'Vulnerability / CVE',
    aliases: ['cve', 'vuln', 'security finding', 'finding', 'weakness', 'flaw', 'advisory'],
    domain: 'security',
    description: 'A security vulnerability or CVE record tracked in a security program.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'assignable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'cveId', type: 'varchar(20)', nullable: true, description: 'CVE identifier e.g. CVE-2024-1234' },
      { name: 'title', type: 'text not null', nullable: false, description: 'Short vulnerability title' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Detailed description' },
      { name: 'severity', type: "varchar(10) not null default 'medium'", nullable: false, description: 'critical|high|medium|low|info' },
      { name: 'cvssScore', type: 'numeric(4,1)', nullable: true, description: 'CVSS v3 base score 0.0-10.0' },
      { name: 'cvssVector', type: 'varchar(100)', nullable: true, description: 'CVSS vector string' },
      { name: 'status', type: "varchar(20) not null default 'open'", nullable: false, description: 'open|in_progress|remediated|accepted|false_positive' },
      { name: 'affectedAsset', type: 'text', nullable: true, description: 'System/component affected' },
      { name: 'affectedVersion', type: 'varchar(50)', nullable: true, description: 'Version range affected' },
      { name: 'fixedVersion', type: 'varchar(50)', nullable: true, description: 'Version that fixes it' },
      { name: 'discoveredAt', type: 'timestamptz', nullable: true, description: 'When discovered' },
      { name: 'dueAt', type: 'timestamptz', nullable: true, description: 'Remediation deadline based on severity SLA' },
      { name: 'remediatedAt', type: 'timestamptz', nullable: true, description: 'When fixed' },
      { name: 'assigneeId', type: 'integer references users(id)', nullable: true, description: 'Assigned engineer' },
      { name: 'reporterId', type: 'integer references users(id)', nullable: true, description: 'Who reported/found it' },
      { name: 'source', type: "varchar(50) not null default 'manual'", nullable: false, description: 'scanner|manual|pen-test|bug-bounty' },
      { name: 'references', type: 'jsonb', nullable: true, description: 'Array of reference URLs' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'e.g. ["sqli","web","authentication"]' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'asset', 'remediation', 'comment', 'attachment'],
    suggestedIndexes: ['status', 'severity', 'cveId', 'assigneeId', 'dueAt', '(status, severity)', '(status, dueAt)'],
    defaultWorkflow: {
      states: ['open', 'in_progress', 'awaiting_verification', 'remediated', 'accepted', 'false_positive'],
      transitions: [
        { from: 'open', to: 'in_progress', action: 'assign' },
        { from: 'in_progress', to: 'awaiting_verification', action: 'submit_fix' },
        { from: 'awaiting_verification', to: 'remediated', action: 'verify' },
        { from: 'awaiting_verification', to: 'in_progress', action: 'reject_fix' },
        { from: 'open', to: 'accepted', action: 'accept_risk' },
        { from: 'open', to: 'false_positive', action: 'mark_false_positive' },
      ],
    },
    typicalEndpoints: [
      'GET /vulnerabilities?status=open&severity=critical&page=1',
      'GET /vulnerabilities/:id',
      'POST /vulnerabilities',
      'PATCH /vulnerabilities/:id',
      'PATCH /vulnerabilities/:id/status',
      'GET /vulnerabilities/stats (counts by severity/status)',
    ],
  },

  risk: {
    id: 'risk',
    name: 'Risk',
    aliases: ['risk', 'risk item', 'threat', 'exposure', 'hazard'],
    domain: 'risk-management',
    description: 'A tracked risk that could impact a project, system, or organization.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'assignable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'text not null', nullable: false, description: 'Risk title' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Detailed description' },
      { name: 'category', type: 'varchar(50)', nullable: true, description: 'technical|financial|operational|compliance|reputational' },
      { name: 'likelihood', type: "varchar(10) not null default 'medium'", nullable: false, description: 'low|medium|high' },
      { name: 'impact', type: "varchar(10) not null default 'medium'", nullable: false, description: 'low|medium|high|critical' },
      { name: 'riskScore', type: 'integer', nullable: true, description: 'Computed: likelihood * impact (1-9)' },
      { name: 'status', type: "varchar(20) not null default 'identified'", nullable: false, description: 'identified|assessing|mitigating|accepted|closed' },
      { name: 'mitigation', type: 'text', nullable: true, description: 'Mitigation plan' },
      { name: 'contingency', type: 'text', nullable: true, description: 'Contingency plan if risk materializes' },
      { name: 'ownerId', type: 'integer references users(id)', nullable: true, description: 'Risk owner' },
      { name: 'reviewDate', type: 'date', nullable: true, description: 'Next scheduled review' },
      { name: 'closedAt', type: 'timestamptz', nullable: true, description: 'When risk was closed' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'project', 'vulnerability', 'audit'],
    suggestedIndexes: ['status', 'category', 'ownerId', 'riskScore DESC', '(status, riskScore)'],
    defaultWorkflow: {
      states: ['identified', 'assessing', 'mitigating', 'accepted', 'closed'],
      transitions: [
        { from: 'identified', to: 'assessing', action: 'begin_assessment' },
        { from: 'assessing', to: 'mitigating', action: 'approve_mitigation' },
        { from: 'assessing', to: 'accepted', action: 'accept_risk' },
        { from: 'mitigating', to: 'closed', action: 'close' },
        { from: 'accepted', to: 'closed', action: 'close' },
      ],
    },
    typicalEndpoints: [
      'GET /risks?status=identified&category=technical',
      'GET /risks/:id',
      'POST /risks',
      'PATCH /risks/:id',
      'GET /risks/heatmap (matrix view)',
    ],
  },

  // ── Project Management Domain ────────────────────────────────────────────

  deadline: {
    id: 'deadline',
    name: 'Deadline / Milestone',
    aliases: ['deadline', 'milestone', 'due date', 'target date', 'delivery date', 'go-live'],
    domain: 'project-management',
    description: 'A time-bound project milestone or hard deadline.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'assignable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'text not null', nullable: false, description: 'Milestone title' },
      { name: 'description', type: 'text', nullable: true, description: 'Scope/deliverables description' },
      { name: 'type', type: "varchar(20) not null default 'milestone'", nullable: false, description: 'deadline|milestone|sprint|release|phase' },
      { name: 'dueAt', type: 'timestamptz not null', nullable: false, description: 'Deadline datetime' },
      { name: 'status', type: "varchar(20) not null default 'upcoming'", nullable: false, description: 'upcoming|at_risk|overdue|complete|cancelled' },
      { name: 'completedAt', type: 'timestamptz', nullable: true, description: 'Actual completion time' },
      { name: 'projectId', type: 'integer references projects(id) on delete cascade', nullable: true, description: 'Parent project' },
      { name: 'ownerId', type: 'integer references users(id)', nullable: true, description: 'Responsible person' },
      { name: 'progress', type: 'integer not null default 0', nullable: false, description: 'Completion percentage 0-100' },
      { name: 'isPublic', type: 'boolean not null default false', nullable: false, description: 'Visible to stakeholders' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['project', 'user', 'task', 'sprint'],
    suggestedIndexes: ['projectId', 'ownerId', 'dueAt', 'status', '(projectId, dueAt)', '(status, dueAt)'],
    defaultWorkflow: {
      states: ['upcoming', 'at_risk', 'overdue', 'complete', 'cancelled'],
      transitions: [
        { from: 'upcoming', to: 'at_risk', action: 'flag_at_risk' },
        { from: 'upcoming', to: 'complete', action: 'mark_complete' },
        { from: 'at_risk', to: 'overdue', action: 'pass_deadline' },
        { from: 'at_risk', to: 'complete', action: 'mark_complete' },
        { from: 'overdue', to: 'complete', action: 'mark_complete' },
        { from: 'upcoming', to: 'cancelled', action: 'cancel' },
      ],
    },
    typicalEndpoints: [
      'GET /milestones?projectId=:id&status=upcoming',
      'GET /milestones/:id',
      'POST /milestones',
      'PATCH /milestones/:id',
      'PATCH /milestones/:id/complete',
    ],
  },

  task: {
    id: 'task',
    name: 'Task / Ticket',
    aliases: ['task', 'ticket', 'issue', 'work item', 'story', 'to-do', 'todo', 'action item'],
    domain: 'project-management',
    description: 'A unit of work tracked in a project management system.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'assignable', 'commentable', 'attachable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'number', type: 'integer not null', nullable: false, description: 'Human-readable ticket number per project' },
      { name: 'title', type: 'text not null', nullable: false, description: 'Task title' },
      { name: 'description', type: 'text', nullable: true, description: 'Detailed description (markdown)' },
      { name: 'type', type: "varchar(20) not null default 'task'", nullable: false, description: 'task|bug|feature|story|epic|spike' },
      { name: 'status', type: "varchar(20) not null default 'todo'", nullable: false, description: 'todo|in_progress|in_review|done|cancelled' },
      { name: 'priority', type: "varchar(10) not null default 'medium'", nullable: false, description: 'low|medium|high|urgent' },
      { name: 'storyPoints', type: 'integer', nullable: true, description: 'Effort estimate in story points' },
      { name: 'dueAt', type: 'date', nullable: true, description: 'Due date' },
      { name: 'completedAt', type: 'timestamptz', nullable: true, description: 'Completion time' },
      { name: 'projectId', type: 'integer references projects(id) on delete cascade', nullable: false, description: 'Parent project' },
      { name: 'milestoneId', type: 'integer references milestones(id)', nullable: true, description: 'Linked milestone' },
      { name: 'sprintId', type: 'integer references sprints(id)', nullable: true, description: 'Current sprint' },
      { name: 'assigneeId', type: 'integer references users(id)', nullable: true, description: 'Assigned to' },
      { name: 'reporterId', type: 'integer references users(id)', nullable: false, description: 'Created by' },
      { name: 'parentId', type: 'integer references tasks(id)', nullable: true, description: 'Parent task (for subtasks)' },
      { name: 'labels', type: 'text[]', nullable: true, description: 'Labels/tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['project', 'user', 'milestone', 'sprint', 'comment', 'attachment'],
    suggestedIndexes: ['(projectId, number)', 'assigneeId', 'sprintId', 'milestoneId', 'status', '(projectId, status)', '(assigneeId, status)'],
    defaultWorkflow: {
      states: ['todo', 'in_progress', 'in_review', 'done', 'cancelled'],
      transitions: [
        { from: 'todo', to: 'in_progress', action: 'start' },
        { from: 'in_progress', to: 'in_review', action: 'submit_review' },
        { from: 'in_review', to: 'done', action: 'approve' },
        { from: 'in_review', to: 'in_progress', action: 'request_changes' },
        { from: 'todo', to: 'cancelled', action: 'cancel' },
        { from: 'in_progress', to: 'cancelled', action: 'cancel' },
      ],
    },
    typicalEndpoints: [
      'GET /projects/:id/tasks?status=in_progress&assigneeId=me',
      'POST /projects/:id/tasks',
      'PATCH /tasks/:id',
      'PATCH /tasks/:id/assign',
      'GET /tasks/:id/comments',
    ],
  },

  sprint: {
    id: 'sprint',
    name: 'Sprint / Iteration',
    aliases: ['sprint', 'iteration', 'cycle', 'period'],
    domain: 'project-management',
    description: 'A time-boxed development iteration (Scrum/Agile).',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Sprint name e.g. Sprint 12' },
      { name: 'goal', type: 'text', nullable: true, description: 'Sprint goal statement' },
      { name: 'startDate', type: 'date not null', nullable: false, description: 'Start date' },
      { name: 'endDate', type: 'date not null', nullable: false, description: 'End date' },
      { name: 'status', type: "varchar(20) not null default 'planning'", nullable: false, description: 'planning|active|completed|cancelled' },
      { name: 'velocity', type: 'integer', nullable: true, description: 'Story points completed' },
      { name: 'plannedPoints', type: 'integer', nullable: true, description: 'Story points planned' },
      { name: 'projectId', type: 'integer references projects(id) on delete cascade', nullable: false, description: 'Parent project' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
    ],
    relatedEntities: ['project', 'task'],
    suggestedIndexes: ['projectId', 'status', '(projectId, status)', 'startDate', 'endDate'],
    defaultWorkflow: {
      states: ['planning', 'active', 'completed', 'cancelled'],
      transitions: [
        { from: 'planning', to: 'active', action: 'start_sprint' },
        { from: 'active', to: 'completed', action: 'complete_sprint' },
        { from: 'planning', to: 'cancelled', action: 'cancel' },
      ],
    },
    typicalEndpoints: [
      'GET /projects/:id/sprints',
      'POST /projects/:id/sprints',
      'PATCH /sprints/:id/start',
      'PATCH /sprints/:id/complete',
    ],
  },

  // ── Finance Domain ───────────────────────────────────────────────────────

  invoice: {
    id: 'invoice',
    name: 'Invoice',
    aliases: ['invoice', 'bill', 'statement', 'receipt'],
    domain: 'finance',
    description: 'A financial invoice sent to a customer for goods or services.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'invoiceNumber', type: 'varchar(50) not null unique', nullable: false, description: 'Human-readable number e.g. INV-2024-0001' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|sent|viewed|paid|overdue|cancelled|refunded' },
      { name: 'customerId', type: 'integer references customers(id)', nullable: false, description: 'Bill-to customer' },
      { name: 'subtotalCents', type: 'integer not null default 0', nullable: false, description: 'Subtotal in smallest currency unit' },
      { name: 'taxCents', type: 'integer not null default 0', nullable: false, description: 'Tax amount' },
      { name: 'discountCents', type: 'integer not null default 0', nullable: false, description: 'Discount applied' },
      { name: 'totalCents', type: 'integer not null default 0', nullable: false, description: 'Final total' },
      { name: 'currency', type: "char(3) not null default 'USD'", nullable: false, description: 'ISO 4217 currency code' },
      { name: 'issuedAt', type: 'date not null', nullable: false, description: 'Invoice date' },
      { name: 'dueAt', type: 'date not null', nullable: false, description: 'Payment due date' },
      { name: 'paidAt', type: 'timestamptz', nullable: true, description: 'When payment was received' },
      { name: 'notes', type: 'text', nullable: true, description: 'Internal notes' },
      { name: 'terms', type: 'text', nullable: true, description: 'Payment terms' },
      { name: 'createdByUserId', type: 'integer references users(id)', nullable: true, description: 'Who created it' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['customer', 'user', 'payment', 'line_item'],
    suggestedIndexes: ['customerId', 'status', 'dueAt', '(status, dueAt)', 'invoiceNumber'],
    defaultWorkflow: {
      states: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'],
      transitions: [
        { from: 'draft', to: 'sent', action: 'send' },
        { from: 'sent', to: 'viewed', action: 'customer_viewed' },
        { from: 'viewed', to: 'paid', action: 'mark_paid' },
        { from: 'sent', to: 'paid', action: 'mark_paid' },
        { from: 'sent', to: 'overdue', action: 'pass_due_date' },
        { from: 'overdue', to: 'paid', action: 'mark_paid' },
        { from: 'paid', to: 'refunded', action: 'refund' },
        { from: 'draft', to: 'cancelled', action: 'cancel' },
        { from: 'sent', to: 'cancelled', action: 'cancel' },
      ],
    },
    typicalEndpoints: [
      'GET /invoices?status=overdue&customerId=:id',
      'GET /invoices/:id',
      'POST /invoices',
      'PATCH /invoices/:id',
      'POST /invoices/:id/send',
      'POST /invoices/:id/mark-paid',
    ],
  },

  payment: {
    id: 'payment',
    name: 'Payment / Transaction',
    aliases: ['payment', 'transaction', 'charge', 'transfer', 'payout'],
    domain: 'finance',
    description: 'A financial payment or transaction record.',
    traits: ['pageable', 'auditable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'type', type: "varchar(20) not null default 'payment'", nullable: false, description: 'payment|refund|adjustment|fee' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|processing|completed|failed|cancelled|refunded' },
      { name: 'amountCents', type: 'integer not null', nullable: false, description: 'Amount in smallest currency unit (avoid floats!)' },
      { name: 'currency', type: "char(3) not null default 'USD'", nullable: false, description: 'ISO 4217' },
      { name: 'method', type: "varchar(30) not null default 'card'", nullable: false, description: 'card|ach|wire|crypto|check' },
      { name: 'invoiceId', type: 'integer references invoices(id)', nullable: true, description: 'Associated invoice' },
      { name: 'customerId', type: 'integer references customers(id)', nullable: false, description: 'Payer' },
      { name: 'externalId', type: 'varchar(255)', nullable: true, description: 'Stripe/payment processor transaction ID' },
      { name: 'reference', type: 'varchar(255)', nullable: true, description: 'Bank reference / check number' },
      { name: 'processedAt', type: 'timestamptz', nullable: true, description: 'Processing completion time' },
      { name: 'failureReason', type: 'text', nullable: true, description: 'Error message if failed' },
      { name: 'metadata', type: 'jsonb', nullable: true, description: 'Processor-specific metadata' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['customer', 'invoice'],
    suggestedIndexes: ['customerId', 'invoiceId', 'status', 'externalId', 'processedAt DESC'],
    typicalEndpoints: [
      'GET /payments?customerId=:id&status=completed',
      'GET /payments/:id',
      'POST /payments',
      'POST /payments/:id/refund',
    ],
  },

  expense: {
    id: 'expense',
    name: 'Expense',
    aliases: ['expense', 'expenditure', 'cost', 'reimbursement'],
    domain: 'finance',
    description: 'An employee expense or reimbursement request.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'attachable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(200) not null', nullable: false, description: 'Expense title' },
      { name: 'category', type: 'varchar(50) not null', nullable: false, description: 'travel|meals|software|equipment|other' },
      { name: 'amountCents', type: 'integer not null', nullable: false, description: 'Amount in cents' },
      { name: 'currency', type: "char(3) not null default 'USD'", nullable: false, description: 'Currency' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|submitted|approved|rejected|reimbursed' },
      { name: 'expenseDate', type: 'date not null', nullable: false, description: 'When the expense occurred' },
      { name: 'merchant', type: 'varchar(200)', nullable: true, description: 'Vendor/merchant name' },
      { name: 'notes', type: 'text', nullable: true, description: 'Justification/notes' },
      { name: 'receiptUrl', type: 'text', nullable: true, description: 'Uploaded receipt file URL' },
      { name: 'submittedById', type: 'integer references users(id)', nullable: false, description: 'Employee submitting' },
      { name: 'reviewedById', type: 'integer references users(id)', nullable: true, description: 'Manager who approved/rejected' },
      { name: 'reviewedAt', type: 'timestamptz', nullable: true, description: 'Approval/rejection time' },
      { name: 'rejectionReason', type: 'text', nullable: true, description: 'Reason if rejected' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
    ],
    relatedEntities: ['user', 'attachment'],
    suggestedIndexes: ['submittedById', 'status', 'expenseDate', 'category', '(status, submittedById)'],
    defaultWorkflow: {
      states: ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'],
      transitions: [
        { from: 'draft', to: 'submitted', action: 'submit' },
        { from: 'submitted', to: 'approved', action: 'approve' },
        { from: 'submitted', to: 'rejected', action: 'reject' },
        { from: 'approved', to: 'reimbursed', action: 'mark_reimbursed' },
        { from: 'rejected', to: 'draft', action: 'revise' },
      ],
    },
    typicalEndpoints: [
      'GET /expenses?status=submitted&submittedById=:id',
      'POST /expenses',
      'PATCH /expenses/:id',
      'POST /expenses/:id/submit',
      'POST /expenses/:id/approve',
      'POST /expenses/:id/reject',
    ],
  },

  // ── HR Domain ────────────────────────────────────────────────────────────

  employee: {
    id: 'employee',
    name: 'Employee',
    aliases: ['employee', 'staff', 'worker', 'member', 'teammate', 'personnel', 'hr record'],
    domain: 'hr',
    description: 'An employee or staff member record in an HR system.',
    traits: ['pageable', 'auditable', 'searchable', 'hierarchical', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer references users(id)', nullable: true, description: 'Linked user account' },
      { name: 'employeeNumber', type: 'varchar(50) unique', nullable: true, description: 'HR employee ID/badge number' },
      { name: 'firstName', type: 'varchar(100) not null', nullable: false, description: 'First name' },
      { name: 'lastName', type: 'varchar(100) not null', nullable: false, description: 'Last name' },
      { name: 'email', type: 'varchar(255) not null unique', nullable: false, description: 'Work email' },
      { name: 'phone', type: 'varchar(30)', nullable: true, description: 'Work phone' },
      { name: 'jobTitle', type: 'varchar(200)', nullable: true, description: 'Job title' },
      { name: 'department', type: 'varchar(100)', nullable: true, description: 'Department' },
      { name: 'departmentId', type: 'integer references departments(id)', nullable: true, description: 'FK to department' },
      { name: 'managerId', type: 'integer references employees(id)', nullable: true, description: 'Direct manager (self-ref)' },
      { name: 'employmentType', type: "varchar(20) not null default 'full_time'", nullable: false, description: 'full_time|part_time|contractor|intern' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|on_leave|suspended|terminated' },
      { name: 'hireDate', type: 'date not null', nullable: false, description: 'Employment start date' },
      { name: 'terminationDate', type: 'date', nullable: true, description: 'End date if applicable' },
      { name: 'salary', type: 'integer', nullable: true, description: 'Annual salary in cents (encrypted at rest ideally)' },
      { name: 'avatarUrl', type: 'text', nullable: true, description: 'Profile photo URL' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'department', 'leave', 'expense'],
    suggestedIndexes: ['email', 'departmentId', 'managerId', 'status', 'employeeNumber', '(status, departmentId)'],
    typicalEndpoints: [
      'GET /employees?departmentId=:id&status=active',
      'GET /employees/:id',
      'POST /employees',
      'PATCH /employees/:id',
      'GET /employees/:id/direct-reports',
    ],
  },

  leave: {
    id: 'leave',
    name: 'Leave / Time Off',
    aliases: ['leave', 'time off', 'pto', 'vacation', 'sick leave', 'absence', 'holiday'],
    domain: 'hr',
    description: 'An employee leave or time-off request.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'employeeId', type: 'integer references employees(id)', nullable: false, description: 'Requesting employee' },
      { name: 'type', type: 'varchar(30) not null', nullable: false, description: 'annual|sick|maternity|paternity|unpaid|bereavement|other' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|approved|rejected|cancelled' },
      { name: 'startDate', type: 'date not null', nullable: false, description: 'Leave start date' },
      { name: 'endDate', type: 'date not null', nullable: false, description: 'Leave end date (inclusive)' },
      { name: 'daysCount', type: 'numeric(4,1) not null', nullable: false, description: 'Number of working days' },
      { name: 'reason', type: 'text', nullable: true, description: 'Reason/notes' },
      { name: 'approverId', type: 'integer references users(id)', nullable: true, description: 'Manager who acted on request' },
      { name: 'approvedAt', type: 'timestamptz', nullable: true, description: 'Approval/rejection timestamp' },
      { name: 'rejectionReason', type: 'text', nullable: true, description: 'Reason if rejected' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Request creation time' },
    ],
    relatedEntities: ['employee', 'user'],
    suggestedIndexes: ['employeeId', 'status', 'startDate', '(employeeId, startDate)', '(status, startDate)'],
    defaultWorkflow: {
      states: ['pending', 'approved', 'rejected', 'cancelled'],
      transitions: [
        { from: 'pending', to: 'approved', action: 'approve' },
        { from: 'pending', to: 'rejected', action: 'reject' },
        { from: 'pending', to: 'cancelled', action: 'cancel' },
        { from: 'approved', to: 'cancelled', action: 'cancel' },
      ],
    },
    typicalEndpoints: [
      'GET /leave-requests?employeeId=:id&status=pending',
      'POST /leave-requests',
      'PATCH /leave-requests/:id',
      'POST /leave-requests/:id/approve',
      'POST /leave-requests/:id/reject',
    ],
  },

  // ── Support / Ticketing Domain ───────────────────────────────────────────

  support_ticket: {
    id: 'support_ticket',
    name: 'Support Ticket',
    aliases: ['ticket', 'support ticket', 'support request', 'help desk ticket', 'service request', 'case'],
    domain: 'support',
    description: 'A customer support ticket or help desk request.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'assignable', 'commentable', 'attachable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'ticketNumber', type: 'varchar(20) not null unique', nullable: false, description: 'Human-readable e.g. TKT-10042' },
      { name: 'subject', type: 'text not null', nullable: false, description: 'Ticket subject' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Full description' },
      { name: 'status', type: "varchar(20) not null default 'open'", nullable: false, description: 'open|in_progress|waiting_customer|resolved|closed' },
      { name: 'priority', type: "varchar(10) not null default 'normal'", nullable: false, description: 'low|normal|high|urgent|critical' },
      { name: 'channel', type: "varchar(20) not null default 'web'", nullable: false, description: 'web|email|phone|chat|api' },
      { name: 'category', type: 'varchar(50)', nullable: true, description: 'billing|technical|account|other' },
      { name: 'customerId', type: 'integer references customers(id)', nullable: true, description: 'Customer who opened' },
      { name: 'contactEmail', type: 'varchar(255) not null', nullable: false, description: 'Requester email' },
      { name: 'assigneeId', type: 'integer references users(id)', nullable: true, description: 'Support agent assigned' },
      { name: 'teamId', type: 'integer references teams(id)', nullable: true, description: 'Support team assigned' },
      { name: 'firstResponseAt', type: 'timestamptz', nullable: true, description: 'Time of first agent reply' },
      { name: 'resolvedAt', type: 'timestamptz', nullable: true, description: 'Resolution time' },
      { name: 'satisfactionScore', type: 'integer', nullable: true, description: 'CSAT score 1-5' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Tags for routing/reporting' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Ticket creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['customer', 'user', 'comment', 'attachment'],
    suggestedIndexes: ['contactEmail', 'assigneeId', 'status', 'priority', '(status, priority)', '(status, assigneeId)', 'createdAt DESC'],
    defaultWorkflow: {
      states: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
      transitions: [
        { from: 'open', to: 'in_progress', action: 'assign' },
        { from: 'in_progress', to: 'waiting_customer', action: 'reply' },
        { from: 'waiting_customer', to: 'in_progress', action: 'customer_reply' },
        { from: 'in_progress', to: 'resolved', action: 'resolve' },
        { from: 'waiting_customer', to: 'resolved', action: 'auto_close' },
        { from: 'resolved', to: 'open', action: 'reopen' },
        { from: 'resolved', to: 'closed', action: 'close' },
      ],
    },
    typicalEndpoints: [
      'GET /tickets?status=open&assigneeId=me',
      'GET /tickets/:id',
      'POST /tickets',
      'PATCH /tickets/:id',
      'POST /tickets/:id/assign',
      'POST /tickets/:id/resolve',
      'POST /tickets/:id/reply',
    ],
  },

  // ── CRM Domain ───────────────────────────────────────────────────────────

  lead: {
    id: 'lead',
    name: 'Lead / Prospect',
    aliases: ['lead', 'prospect', 'opportunity', 'contact lead', 'sales lead'],
    domain: 'crm',
    description: 'A sales lead or prospect in a CRM pipeline.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'assignable', 'commentable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'firstName', type: 'varchar(100)', nullable: true, description: 'First name' },
      { name: 'lastName', type: 'varchar(100)', nullable: true, description: 'Last name' },
      { name: 'email', type: 'varchar(255)', nullable: true, description: 'Email address' },
      { name: 'phone', type: 'varchar(30)', nullable: true, description: 'Phone number' },
      { name: 'company', type: 'varchar(200)', nullable: true, description: 'Company name' },
      { name: 'jobTitle', type: 'varchar(200)', nullable: true, description: 'Job title' },
      { name: 'status', type: "varchar(20) not null default 'new'", nullable: false, description: 'new|contacted|qualified|unqualified|converted|lost' },
      { name: 'source', type: 'varchar(50)', nullable: true, description: 'organic|paid|referral|cold|event' },
      { name: 'score', type: 'integer not null default 0', nullable: false, description: 'Lead score 0-100' },
      { name: 'estimatedValue', type: 'integer', nullable: true, description: 'Estimated deal value in cents' },
      { name: 'notes', type: 'text', nullable: true, description: 'Notes about the lead' },
      { name: 'ownerId', type: 'integer references users(id)', nullable: true, description: 'Sales rep owner' },
      { name: 'convertedAt', type: 'timestamptz', nullable: true, description: 'When converted to customer' },
      { name: 'customerId', type: 'integer references customers(id)', nullable: true, description: 'Linked customer after conversion' },
      { name: 'lastContactedAt', type: 'timestamptz', nullable: true, description: 'Most recent outreach' },
      { name: 'nextFollowUpAt', type: 'timestamptz', nullable: true, description: 'Scheduled follow-up' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'customer', 'activity', 'campaign'],
    suggestedIndexes: ['email', 'status', 'ownerId', 'score DESC', '(status, ownerId)', 'nextFollowUpAt'],
    defaultWorkflow: {
      states: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'],
      transitions: [
        { from: 'new', to: 'contacted', action: 'reach_out' },
        { from: 'contacted', to: 'qualified', action: 'qualify' },
        { from: 'contacted', to: 'unqualified', action: 'disqualify' },
        { from: 'qualified', to: 'converted', action: 'convert' },
        { from: 'qualified', to: 'lost', action: 'mark_lost' },
      ],
    },
    typicalEndpoints: [
      'GET /leads?status=qualified&ownerId=me',
      'POST /leads',
      'PATCH /leads/:id',
      'POST /leads/:id/convert',
      'GET /leads/pipeline (grouped by status)',
    ],
  },

  // ── Healthcare Domain ────────────────────────────────────────────────────

  patient: {
    id: 'patient',
    name: 'Patient',
    aliases: ['patient', 'client', 'resident', 'beneficiary'],
    domain: 'healthcare',
    description: 'A patient record in a healthcare or clinical system.',
    traits: ['pageable', 'auditable', 'searchable', 'attachable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'mrn', type: 'varchar(50) unique', nullable: true, description: 'Medical Record Number' },
      { name: 'firstName', type: 'varchar(100) not null', nullable: false, description: 'First name' },
      { name: 'lastName', type: 'varchar(100) not null', nullable: false, description: 'Last name' },
      { name: 'dateOfBirth', type: 'date not null', nullable: false, description: 'Date of birth' },
      { name: 'sex', type: 'varchar(10)', nullable: true, description: 'male|female|other|unknown' },
      { name: 'bloodType', type: 'varchar(5)', nullable: true, description: 'A+|A-|B+|B-|O+|O-|AB+|AB-' },
      { name: 'email', type: 'varchar(255)', nullable: true, description: 'Contact email' },
      { name: 'phone', type: 'varchar(30)', nullable: true, description: 'Contact phone' },
      { name: 'address', type: 'text', nullable: true, description: 'Home address' },
      { name: 'emergencyContact', type: 'jsonb', nullable: true, description: '{ name, phone, relationship }' },
      { name: 'allergies', type: 'text[]', nullable: true, description: 'Known allergies' },
      { name: 'insuranceProvider', type: 'varchar(200)', nullable: true, description: 'Insurance company' },
      { name: 'insurancePolicyNumber', type: 'varchar(100)', nullable: true, description: 'Policy number' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|inactive|deceased' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['appointment', 'prescription', 'doctor'],
    suggestedIndexes: ['email', 'mrn', 'lastName', '(lastName, firstName)', 'dateOfBirth', 'status'],
    typicalEndpoints: [
      'GET /patients?search=:name',
      'GET /patients/:id',
      'POST /patients',
      'PATCH /patients/:id',
      'GET /patients/:id/appointments',
      'GET /patients/:id/prescriptions',
    ],
  },

  appointment: {
    id: 'appointment',
    name: 'Appointment',
    aliases: ['appointment', 'booking', 'visit', 'consultation', 'reservation', 'schedule slot'],
    domain: 'healthcare',
    description: 'A scheduled appointment or booking.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'schedulable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'patientId', type: 'integer references patients(id)', nullable: true, description: 'Patient or customer' },
      { name: 'providerId', type: 'integer references users(id)', nullable: true, description: 'Doctor/provider' },
      { name: 'type', type: 'varchar(50)', nullable: true, description: 'Appointment type/reason' },
      { name: 'status', type: "varchar(20) not null default 'scheduled'", nullable: false, description: 'scheduled|confirmed|in_progress|completed|cancelled|no_show' },
      { name: 'startAt', type: 'timestamptz not null', nullable: false, description: 'Start datetime' },
      { name: 'endAt', type: 'timestamptz not null', nullable: false, description: 'End datetime' },
      { name: 'durationMinutes', type: 'integer not null default 30', nullable: false, description: 'Duration in minutes' },
      { name: 'location', type: 'varchar(200)', nullable: true, description: 'Room/address/virtual link' },
      { name: 'notes', type: 'text', nullable: true, description: 'Pre-appointment notes' },
      { name: 'cancelledAt', type: 'timestamptz', nullable: true, description: 'Cancellation time' },
      { name: 'cancellationReason', type: 'text', nullable: true, description: 'Why cancelled' },
      { name: 'remindedAt', type: 'timestamptz', nullable: true, description: 'When reminder was sent' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
    ],
    relatedEntities: ['patient', 'user'],
    suggestedIndexes: ['patientId', 'providerId', 'startAt', 'status', '(providerId, startAt)', '(status, startAt)'],
    defaultWorkflow: {
      states: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      transitions: [
        { from: 'scheduled', to: 'confirmed', action: 'confirm' },
        { from: 'confirmed', to: 'in_progress', action: 'check_in' },
        { from: 'in_progress', to: 'completed', action: 'complete' },
        { from: 'scheduled', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'no_show', action: 'mark_no_show' },
      ],
    },
    typicalEndpoints: [
      'GET /appointments?providerId=:id&date=today',
      'POST /appointments',
      'PATCH /appointments/:id',
      'POST /appointments/:id/cancel',
      'GET /appointments/availability?providerId=:id&date=:date',
    ],
  },

  // ── E-Commerce Domain ────────────────────────────────────────────────────

  product: {
    id: 'product',
    name: 'Product',
    aliases: ['product', 'item', 'sku', 'good', 'article', 'listing'],
    domain: 'ecommerce',
    description: 'A product or SKU in an e-commerce catalog.',
    traits: ['pageable', 'auditable', 'searchable', 'taggable', 'versioned', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'sku', type: 'varchar(100) unique', nullable: true, description: 'Stock Keeping Unit identifier' },
      { name: 'name', type: 'varchar(255) not null', nullable: false, description: 'Product name' },
      { name: 'slug', type: 'varchar(255) not null unique', nullable: false, description: 'URL-safe slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Full description (markdown)' },
      { name: 'shortDescription', type: 'text', nullable: true, description: 'Brief description for listings' },
      { name: 'priceInCents', type: 'integer not null default 0', nullable: false, description: 'Price in cents (never use float for money!)' },
      { name: 'comparePriceInCents', type: 'integer', nullable: true, description: 'Original/compare-at price' },
      { name: 'costInCents', type: 'integer', nullable: true, description: 'Cost/COGS in cents' },
      { name: 'currency', type: "char(3) not null default 'USD'", nullable: false, description: 'ISO 4217' },
      { name: 'stockQuantity', type: 'integer not null default 0', nullable: false, description: 'Available stock' },
      { name: 'trackInventory', type: 'boolean not null default true', nullable: false, description: 'Whether to track stock' },
      { name: 'weight', type: 'numeric(8,2)', nullable: true, description: 'Weight for shipping' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|active|archived' },
      { name: 'categoryId', type: 'integer references product_categories(id)', nullable: true, description: 'Primary category' },
      { name: 'images', type: 'jsonb', nullable: true, description: 'Array of { url, alt, position }' },
      { name: 'attributes', type: 'jsonb', nullable: true, description: 'Flexible attributes (size, color, etc.)' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Search/filter tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['category', 'order_item', 'review'],
    suggestedIndexes: ['slug', 'sku', 'status', 'categoryId', 'priceInCents', '(status, categoryId)', 'tags GIN'],
    typicalEndpoints: [
      'GET /products?status=active&categoryId=:id&page=1',
      'GET /products/:idOrSlug',
      'POST /products',
      'PATCH /products/:id',
      'DELETE /products/:id',
    ],
  },

  order: {
    id: 'order',
    name: 'Order',
    aliases: ['order', 'purchase', 'purchase order', 'sales order', 'checkout'],
    domain: 'ecommerce',
    description: 'A customer purchase order in an e-commerce system.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'orderNumber', type: 'varchar(50) not null unique', nullable: false, description: 'Human-readable order number' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|confirmed|processing|shipped|delivered|cancelled|refunded' },
      { name: 'customerId', type: 'integer references customers(id)', nullable: false, description: 'Ordering customer' },
      { name: 'subtotalCents', type: 'integer not null', nullable: false, description: 'Items total' },
      { name: 'shippingCents', type: 'integer not null default 0', nullable: false, description: 'Shipping cost' },
      { name: 'taxCents', type: 'integer not null default 0', nullable: false, description: 'Tax' },
      { name: 'discountCents', type: 'integer not null default 0', nullable: false, description: 'Discount applied' },
      { name: 'totalCents', type: 'integer not null', nullable: false, description: 'Grand total' },
      { name: 'currency', type: "char(3) not null default 'USD'", nullable: false, description: 'Currency' },
      { name: 'shippingAddress', type: 'jsonb not null', nullable: false, description: '{ name, line1, line2, city, state, postalCode, country }' },
      { name: 'billingAddress', type: 'jsonb', nullable: true, description: 'Billing address if different' },
      { name: 'paymentMethod', type: 'varchar(30)', nullable: true, description: 'Payment method used' },
      { name: 'paymentIntentId', type: 'varchar(255)', nullable: true, description: 'Stripe PaymentIntent ID' },
      { name: 'trackingNumber', type: 'varchar(100)', nullable: true, description: 'Shipping tracking number' },
      { name: 'carrier', type: 'varchar(50)', nullable: true, description: 'Shipping carrier' },
      { name: 'shippedAt', type: 'timestamptz', nullable: true, description: 'When shipped' },
      { name: 'deliveredAt', type: 'timestamptz', nullable: true, description: 'When delivered' },
      { name: 'notes', type: 'text', nullable: true, description: 'Customer order notes' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Order placement time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['customer', 'order_item', 'payment', 'shipment'],
    suggestedIndexes: ['customerId', 'status', 'orderNumber', 'paymentIntentId', '(status, createdAt DESC)', 'createdAt DESC'],
    defaultWorkflow: {
      states: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      transitions: [
        { from: 'pending', to: 'confirmed', action: 'payment_received' },
        { from: 'confirmed', to: 'processing', action: 'start_fulfillment' },
        { from: 'processing', to: 'shipped', action: 'mark_shipped' },
        { from: 'shipped', to: 'delivered', action: 'mark_delivered' },
        { from: 'pending', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'cancelled', action: 'cancel' },
        { from: 'delivered', to: 'refunded', action: 'refund' },
      ],
    },
    typicalEndpoints: [
      'GET /orders?customerId=:id&status=processing',
      'GET /orders/:id',
      'POST /orders',
      'PATCH /orders/:id/status',
      'POST /orders/:id/cancel',
      'POST /orders/:id/refund',
    ],
  },

  // ── Notifications Domain ─────────────────────────────────────────────────

  notification: {
    id: 'notification',
    name: 'Notification',
    aliases: ['notification', 'alert', 'message', 'in-app notification', 'push notification', 'toast'],
    domain: 'platform',
    description: 'A user notification record (in-app, email, or push).',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer references users(id) on delete cascade', nullable: false, description: 'Recipient user' },
      { name: 'type', type: 'varchar(50) not null', nullable: false, description: 'Notification type/event name' },
      { name: 'channel', type: "varchar(20) not null default 'in_app'", nullable: false, description: 'in_app|email|push|sms' },
      { name: 'title', type: 'varchar(255) not null', nullable: false, description: 'Notification title' },
      { name: 'body', type: 'text', nullable: true, description: 'Full notification body' },
      { name: 'actionUrl', type: 'text', nullable: true, description: 'Deep link/action URL' },
      { name: 'isRead', type: 'boolean not null default false', nullable: false, description: 'Whether user has read it' },
      { name: 'readAt', type: 'timestamptz', nullable: true, description: 'When user marked as read' },
      { name: 'entityType', type: 'varchar(50)', nullable: true, description: 'Related entity type (polymorphic ref)' },
      { name: 'entityId', type: 'integer', nullable: true, description: 'Related entity ID' },
      { name: 'metadata', type: 'jsonb', nullable: true, description: 'Extra data for rendering' },
      { name: 'sentAt', type: 'timestamptz', nullable: true, description: 'External delivery time (for email/push)' },
      { name: 'failedAt', type: 'timestamptz', nullable: true, description: 'Delivery failure time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['userId', '(userId, isRead)', '(userId, createdAt DESC)', 'entityType', '(entityType, entityId)'],
    typicalEndpoints: [
      'GET /notifications?unreadOnly=true (paginated)',
      'PATCH /notifications/:id/read',
      'PATCH /notifications/read-all',
      'DELETE /notifications/:id',
      'GET /notifications/unread-count',
    ],
  },

  // ── Content / CMS Domain ─────────────────────────────────────────────────

  article: {
    id: 'article',
    name: 'Article / Post',
    aliases: ['article', 'post', 'blog post', 'content', 'document', 'page', 'entry'],
    domain: 'cms',
    description: 'A content article or blog post in a CMS.',
    traits: ['pageable', 'auditable', 'searchable', 'taggable', 'workflowable', 'versioned', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(500) not null', nullable: false, description: 'Article title' },
      { name: 'slug', type: 'varchar(500) not null unique', nullable: false, description: 'URL slug' },
      { name: 'excerpt', type: 'text', nullable: true, description: 'Short summary' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Full content (markdown or HTML)' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|review|scheduled|published|archived' },
      { name: 'authorId', type: 'integer references users(id)', nullable: false, description: 'Author user' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Cover image' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publication time' },
      { name: 'scheduledAt', type: 'timestamptz', nullable: true, description: 'Scheduled publish time' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Topic tags' },
      { name: 'categories', type: 'text[]', nullable: true, description: 'Categories' },
      { name: 'readTimeMinutes', type: 'integer', nullable: true, description: 'Estimated read time' },
      { name: 'viewCount', type: 'integer not null default 0', nullable: false, description: 'Page view counter' },
      { name: 'seoTitle', type: 'varchar(255)', nullable: true, description: 'SEO meta title' },
      { name: 'seoDescription', type: 'varchar(500)', nullable: true, description: 'SEO meta description' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'category'],
    suggestedIndexes: ['slug', 'authorId', 'status', 'publishedAt DESC', '(status, publishedAt)', 'tags GIN'],
    defaultWorkflow: {
      states: ['draft', 'review', 'scheduled', 'published', 'archived'],
      transitions: [
        { from: 'draft', to: 'review', action: 'submit_review' },
        { from: 'review', to: 'scheduled', action: 'schedule' },
        { from: 'review', to: 'published', action: 'publish' },
        { from: 'scheduled', to: 'published', action: 'auto_publish' },
        { from: 'published', to: 'archived', action: 'archive' },
        { from: 'review', to: 'draft', action: 'request_edits' },
      ],
    },
    typicalEndpoints: [
      'GET /articles?status=published&tag=:tag',
      'GET /articles/:slug',
      'POST /articles',
      'PATCH /articles/:id',
      'POST /articles/:id/publish',
    ],
  },

  // ── Audit / Platform Domain ──────────────────────────────────────────────

  audit_log: {
    id: 'audit_log',
    name: 'Audit Log',
    aliases: ['audit log', 'audit trail', 'activity log', 'history', 'event log', 'change log'],
    domain: 'platform',
    description: 'Immutable audit trail of all system actions (who did what and when).',
    traits: ['pageable', 'searchable'],
    suggestedFields: [
      { name: 'id', type: 'bigserial primary key', nullable: false, description: 'Immutable ID (bigserial for high volume)' },
      { name: 'action', type: 'varchar(100) not null', nullable: false, description: 'Action name: user.created, invoice.paid, settings.updated' },
      { name: 'actorId', type: 'integer references users(id) on delete set null', nullable: true, description: 'User who performed action (null for system)' },
      { name: 'actorEmail', type: 'varchar(255)', nullable: true, description: 'Snapshot of actor email at time of action' },
      { name: 'entityType', type: 'varchar(50) not null', nullable: false, description: 'Entity type: user|invoice|order|etc.' },
      { name: 'entityId', type: 'integer', nullable: true, description: 'Entity ID' },
      { name: 'changes', type: 'jsonb', nullable: true, description: '{ before: {...}, after: {...} }' },
      { name: 'metadata', type: 'jsonb', nullable: true, description: 'Extra context (IP, user agent, request ID)' },
      { name: 'ipAddress', type: 'inet', nullable: true, description: 'Actor IP address' },
      { name: 'userAgent', type: 'text', nullable: true, description: 'Browser/client info' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Immutable timestamp' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['actorId', 'entityType', '(entityType, entityId)', 'action', 'createdAt DESC', '(actorId, createdAt DESC)'],
    typicalEndpoints: [
      'GET /audit-logs?entityType=invoice&entityId=:id',
      'GET /audit-logs?actorId=:id',
      'GET /audit-logs (admin only, paginated)',
    ],
  },

  // ── Generic Platform Entities ────────────────────────────────────────────

  user: {
    id: 'user',
    name: 'User / Account',
    aliases: ['user', 'account', 'member', 'profile', 'person'],
    domain: 'platform',
    description: 'An authenticated user account.',
    traits: ['pageable', 'auditable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'email', type: 'varchar(255) not null unique', nullable: false, description: 'Unique email (lowercase)' },
      { name: 'username', type: 'varchar(50) unique', nullable: true, description: 'Optional username (lowercase)' },
      { name: 'passwordHash', type: 'varchar(255)', nullable: true, description: 'bcrypt hash (null for OAuth-only accounts)' },
      { name: 'role', type: "varchar(20) not null default 'user'", nullable: false, description: 'user|admin|moderator|etc.' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|suspended|pending_verification|deleted' },
      { name: 'firstName', type: 'varchar(100)', nullable: true, description: 'First name' },
      { name: 'lastName', type: 'varchar(100)', nullable: true, description: 'Last name' },
      { name: 'avatarUrl', type: 'text', nullable: true, description: 'Profile picture URL' },
      { name: 'emailVerified', type: 'boolean not null default false', nullable: false, description: 'Email verification status' },
      { name: 'emailVerifiedAt', type: 'timestamptz', nullable: true, description: 'When email was verified' },
      { name: 'lastLoginAt', type: 'timestamptz', nullable: true, description: 'Most recent login time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Account creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['session', 'audit_log', 'notification'],
    suggestedIndexes: ['email', 'username', 'status', 'role', '(status, role)'],
    typicalEndpoints: [
      'POST /auth/register',
      'POST /auth/login',
      'GET /users/me',
      'PATCH /users/me',
      'GET /users (admin)',
    ],
  },

  tag: {
    id: 'tag',
    name: 'Tag / Label',
    aliases: ['tag', 'label', 'category tag', 'keyword'],
    domain: 'platform',
    description: 'A user-defined tag for organizing and filtering content.',
    traits: ['pageable', 'searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Tag name' },
      { name: 'slug', type: 'varchar(100) not null unique', nullable: false, description: 'URL-safe slug' },
      { name: 'color', type: 'char(7)', nullable: true, description: 'Hex color e.g. #FF5733' },
      { name: 'description', type: 'text', nullable: true, description: 'Optional description' },
      { name: 'createdByUserId', type: 'integer references users(id)', nullable: true, description: 'Creator' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Creation time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['slug', 'name'],
    typicalEndpoints: [
      'GET /tags?search=:q',
      'POST /tags',
      'PATCH /tags/:id',
      'DELETE /tags/:id',
    ],
  },

  attachment: {
    id: 'attachment',
    name: 'Attachment / File',
    aliases: ['attachment', 'file', 'upload', 'document', 'asset', 'media'],
    domain: 'platform',
    description: 'A file attachment linked to any entity (polymorphic).',
    traits: ['pageable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'filename', type: 'varchar(255) not null', nullable: false, description: 'Original filename' },
      { name: 'storedKey', type: 'text not null', nullable: false, description: 'Object storage key/path' },
      { name: 'url', type: 'text not null', nullable: false, description: 'Public or signed access URL' },
      { name: 'mimeType', type: 'varchar(100) not null', nullable: false, description: 'MIME type e.g. application/pdf' },
      { name: 'sizeBytes', type: 'bigint not null', nullable: false, description: 'File size in bytes' },
      { name: 'entityType', type: 'varchar(50)', nullable: true, description: 'Polymorphic: ticket|expense|task|etc.' },
      { name: 'entityId', type: 'integer', nullable: true, description: 'Polymorphic entity ID' },
      { name: 'uploadedById', type: 'integer references users(id)', nullable: false, description: 'Uploader' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Upload time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['uploadedById', '(entityType, entityId)', 'createdAt DESC'],
    typicalEndpoints: [
      'POST /attachments (multipart upload)',
      'GET /attachments/:id/download',
      'DELETE /attachments/:id',
    ],
  },

  comment: {
    id: 'comment',
    name: 'Comment / Note',
    aliases: ['comment', 'note', 'reply', 'message', 'annotation', 'remark'],
    domain: 'platform',
    description: 'A comment or note on any entity (polymorphic).',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'body', type: 'text not null', nullable: false, description: 'Comment body (markdown)' },
      { name: 'entityType', type: 'varchar(50) not null', nullable: false, description: 'Polymorphic ref: task|ticket|lead|etc.' },
      { name: 'entityId', type: 'integer not null', nullable: false, description: 'Entity ID' },
      { name: 'authorId', type: 'integer references users(id)', nullable: false, description: 'Comment author' },
      { name: 'parentId', type: 'integer references comments(id)', nullable: true, description: 'Parent comment (for threads)' },
      { name: 'isInternal', type: 'boolean not null default false', nullable: false, description: 'Internal-only note (hidden from customer)' },
      { name: 'editedAt', type: 'timestamptz', nullable: true, description: 'When last edited' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Post time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['(entityType, entityId)', 'authorId', 'parentId', 'createdAt'],
    typicalEndpoints: [
      'GET /comments?entityType=task&entityId=:id',
      'POST /comments',
      'PATCH /comments/:id',
      'DELETE /comments/:id',
    ],
  },
};

// ============================================
// Domain Model Registry
// Pre-built schema blueprints for full application domains
// ============================================

export interface DomainModel {
  id: string;
  name: string;
  description: string;
  coreEntities: string[];
  optionalEntities: string[];
  keyRelationships: string[];
  typicalFeatures: string[];
  securityConsiderations: string[];
  suggestedIndexStrategy: string[];
}

const DOMAIN_MODELS: Record<string, DomainModel> = {
  'project-management': {
    id: 'project-management',
    name: 'Project Management',
    description: 'Task/ticket tracking, sprint planning, milestones — like Jira/Linear.',
    coreEntities: ['user', 'project', 'task', 'sprint', 'milestone', 'comment', 'attachment'],
    optionalEntities: ['team', 'label', 'notification', 'audit_log', 'time_entry'],
    keyRelationships: [
      'project has many tasks (with project_id FK + cascade delete)',
      'project has many sprints (with project_id FK)',
      'task belongs to sprint (nullable sprint_id)',
      'task has optional parent task (self-ref parent_id for subtasks)',
      'task has many comments (polymorphic entity_type=task)',
      'milestone has many tasks (nullable milestone_id on task)',
    ],
    typicalFeatures: [
      'Kanban board view (group tasks by status)',
      'Sprint planning with drag-and-drop assignment',
      'Burndown chart (story points remaining per day)',
      'Milestone progress tracking',
      'Notification on task assignment / comment mention',
      'Activity feed per task',
      'File attachments',
      'Due date reminders',
    ],
    securityConsiderations: [
      'Row-level security: users can only see projects they are members of',
      'Role-based project membership: owner|admin|member|viewer',
      'Audit log all task status changes',
      'Attachment scanning for malware before storage',
    ],
    suggestedIndexStrategy: [
      'tasks: (project_id, status) for board views',
      'tasks: (assignee_id, status) for "my tasks"',
      'tasks: (sprint_id) for sprint board',
      'tasks: (project_id, created_at DESC) for activity feed',
      'Full-text search index on tasks (title, description)',
    ],
  },

  'security-dashboard': {
    id: 'security-dashboard',
    name: 'Security Vulnerability Dashboard',
    description: 'Track CVEs, vulnerabilities, risks, and remediation — like Snyk/Tenable.',
    coreEntities: ['user', 'vulnerability', 'risk', 'asset', 'audit_log'],
    optionalEntities: ['team', 'scan', 'remediation', 'comment', 'attachment', 'notification'],
    keyRelationships: [
      'vulnerability belongs to asset (asset_id FK)',
      'vulnerability has one assignee (user_id FK)',
      'vulnerability has many comments (polymorphic)',
      'risk is associated with multiple vulnerabilities (join table)',
      'audit_log records all vulnerability status changes',
    ],
    typicalFeatures: [
      'Severity heatmap (critical/high/medium/low counts)',
      'SLA breach tracking (days overdue by severity)',
      'Remediation workflow (open → in_progress → verified → closed)',
      'CVE lookup integration',
      'Risk matrix (likelihood × impact)',
      'Executive summary dashboard',
      'Trend charts (new vs closed over time)',
      'Export to PDF/CSV',
    ],
    securityConsiderations: [
      'Role-based access: analyst|engineer|manager|admin',
      'Sensitive vulnerability data encrypted at rest',
      'Rate limit vulnerability API endpoints',
      'Audit every status change with actor + timestamp',
      'IP allowlist for admin operations',
    ],
    suggestedIndexStrategy: [
      'vulnerabilities: (status, severity) for dashboard counts',
      'vulnerabilities: (status, due_at) for SLA breach alerts',
      'vulnerabilities: (assignee_id, status) for team workload',
      'risks: (status, risk_score DESC) for risk register',
    ],
  },

  'crm': {
    id: 'crm',
    name: 'CRM / Sales Pipeline',
    description: 'Customer relationship management with leads, deals, contacts — like Salesforce/HubSpot.',
    coreEntities: ['user', 'lead', 'customer', 'deal', 'activity', 'contact'],
    optionalEntities: ['campaign', 'product', 'quote', 'task', 'email_thread', 'note'],
    keyRelationships: [
      'lead converts to customer (customer_id on lead)',
      'customer has many contacts (contacts are people at the company)',
      'customer has many deals (opportunities)',
      'deal belongs to pipeline stage (pipeline_id + stage FK)',
      'activity links to lead/customer/deal polymorphically',
    ],
    typicalFeatures: [
      'Pipeline view (Kanban by deal stage)',
      'Lead scoring based on activity',
      'Email integration (log sent/received emails)',
      'Activity timeline per lead/customer',
      'Sales forecast by close probability',
      'Contact import from CSV',
      'Duplicate detection on email',
    ],
    securityConsiderations: [
      'Data ownership: sales reps can only see their leads unless admin',
      'PII data (email, phone) stored with encryption consideration',
      'GDPR: soft-delete only, export/delete on request',
      'Audit log on deal value changes',
    ],
    suggestedIndexStrategy: [
      'leads: (status, owner_id) for pipeline',
      'leads: (email) unique for deduplication',
      'deals: (stage_id, close_date) for pipeline/forecast',
      'activities: (entity_type, entity_id, created_at DESC) for timeline',
    ],
  },

  'support-desk': {
    id: 'support-desk',
    name: 'Help Desk / Support',
    description: 'Customer support ticket management — like Zendesk/Freshdesk.',
    coreEntities: ['user', 'support_ticket', 'comment', 'customer', 'attachment'],
    optionalEntities: ['team', 'tag', 'canned_response', 'sla_policy', 'satisfaction_survey'],
    keyRelationships: [
      'ticket belongs to customer (customer_id)',
      'ticket has many comments (threaded)',
      'ticket assigned to agent (assignee_id)',
      'ticket tagged with multiple tags (join table)',
      'first_response_at and resolution_at tracked for SLA',
    ],
    typicalFeatures: [
      'Shared team inbox',
      'SLA tracking with breach alerts',
      'Canned responses library',
      'Customer satisfaction survey (CSAT)',
      'Ticket routing rules (by keyword, category, source)',
      'Agent workload view',
      'Reports: resolution time, CSAT, volume trends',
    ],
    securityConsiderations: [
      'Tickets visible to assigned agent + admins only',
      'Internal notes not sent to customer',
      'Customer portal access via email token (no password needed)',
    ],
    suggestedIndexStrategy: [
      'tickets: (status, assignee_id) for agent queue',
      'tickets: (status, priority) for triage view',
      'tickets: (customer_id, created_at DESC) for customer history',
      'tickets: (status, created_at) for SLA calculation',
    ],
  },

  'hr-system': {
    id: 'hr-system',
    name: 'HR Management System',
    description: 'Employee records, leave management, org chart — like BambooHR.',
    coreEntities: ['user', 'employee', 'department', 'leave', 'expense'],
    optionalEntities: ['payroll', 'performance_review', 'document', 'onboarding', 'training'],
    keyRelationships: [
      'employee links to user (user_id FK, 1:1)',
      'employee has manager (self-ref manager_id)',
      'employee belongs to department (department_id)',
      'leave request belongs to employee (employee_id)',
      'department has manager (manager_id → employee)',
    ],
    typicalFeatures: [
      'Org chart view (hierarchical tree)',
      'Leave calendar (team view showing who is out)',
      'Leave balance tracker by type',
      'Expense approval workflow',
      'Employee directory with search',
      'Headcount reporting by department',
    ],
    securityConsiderations: [
      'Salary data visible to HR admin + direct manager only',
      'Role hierarchy: employee can see own data, manager sees reports, HR sees all',
      'Audit log on salary/role changes',
      'PII fields encrypted at rest',
    ],
    suggestedIndexStrategy: [
      'employees: (department_id, status)',
      'employees: (manager_id) for org chart',
      'leave_requests: (employee_id, start_date)',
      'leave_requests: (status, start_date) for manager view',
    ],
  },

  'ecommerce': {
    id: 'ecommerce',
    name: 'E-Commerce Platform',
    description: 'Product catalog, cart, checkout, orders — like Shopify.',
    coreEntities: ['user', 'product', 'order', 'order_item', 'customer', 'payment'],
    optionalEntities: ['cart', 'discount', 'review', 'category', 'inventory_log', 'shipment', 'wishlist'],
    keyRelationships: [
      'order has many order_items (order_id FK)',
      'order_item references product (product_id FK, price snapshot)',
      'customer has many orders (customer_id FK)',
      'order has one payment (payment_id FK or payment records order_id)',
      'product belongs to category (category_id FK, nested categories possible)',
    ],
    typicalFeatures: [
      'Product catalog with search and filtering',
      'Shopping cart (guest + logged-in with merge)',
      'Checkout with Stripe integration',
      'Order history and tracking',
      'Inventory management with low-stock alerts',
      'Discount codes / promotions',
      'Product reviews and ratings',
    ],
    securityConsiderations: [
      'PCI DSS: never store raw card data — use Stripe tokens',
      'Order total always calculated server-side (never trust client)',
      'Rate limit checkout endpoint to prevent inventory reservation abuse',
      'Idempotency keys for payment requests',
    ],
    suggestedIndexStrategy: [
      'products: (status, category_id) for catalog pages',
      'products: slug unique for product detail',
      'orders: (customer_id, created_at DESC) for order history',
      'orders: (status, created_at) for fulfillment queue',
      'Full-text search on products (name, description)',
    ],
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
  {
    id: 'floating-promise',
    name: 'Unhandled floating promises',
    description: 'Calling an async function without awaiting or catching it, leaving the Promise floating.',
    whyBad: 'Errors in floating promises are swallowed silently in Node.js (unless you have unhandledRejection handlers). The operation may also run after the function returns, causing race conditions and unexpected state.',
    fix: 'Always await async calls or explicitly discard with void operator + a comment. Add process.on("unhandledRejection") for global coverage.',
    severity: 'critical',
    badExample: 'function processOrder(id: string) { sendConfirmationEmail(id); /* not awaited! */ return { success: true }; }',
    goodExample: 'async function processOrder(id: string) { await sendConfirmationEmail(id); return { success: true }; }\n// OR if intentionally fire-and-forget:\nvoid sendConfirmationEmail(id).catch(err => logger.error(err, "Email send failed"));',
    tags: ['async', 'error-handling', 'nodejs'],
  },
  {
    id: 'no-rate-limiting',
    name: 'No rate limiting on auth/sensitive endpoints',
    description: 'Login, registration, password-reset, and API endpoints lack rate limiting.',
    whyBad: 'Attackers can brute-force passwords, enumerate usernames, exhaust SMS credits (OTP), or DoS your server. Auth endpoints without rate limiting are the #1 cause of account takeover.',
    fix: 'Use express-rate-limit: strict limits on /auth/* (5 req/15min by IP+email), moderate limits on API endpoints (100 req/min per user). Return 429 with Retry-After header.',
    severity: 'critical',
    badExample: 'app.post("/auth/login", async (req, res) => { const user = await checkPassword(email, password); ... }); // No rate limit',
    goodExample: 'const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Too many login attempts", standardHeaders: true }); app.post("/auth/login", loginLimiter, async (req, res) => { ... });',
    tags: ['security', 'api', 'authentication'],
  },
  {
    id: 'plain-text-password',
    name: 'Storing or logging plain-text passwords',
    description: 'Passwords stored as plain text in DB, included in logs, or returned in API responses.',
    whyBad: 'A single DB breach exposes every user\'s password. Users often reuse passwords — so your breach becomes a breach everywhere. Logging passwords violates compliance (PCI, GDPR).',
    fix: 'Always hash with bcrypt (cost 12+) or argon2 before storing. Never log request bodies on auth routes. Always exclude passwordHash from SELECT and API responses.',
    severity: 'critical',
    badExample: 'await db.insert(users).values({ email, password: req.body.password }); // Plain text!',
    goodExample: 'const passwordHash = await bcrypt.hash(req.body.password, 12); await db.insert(users).values({ email, passwordHash }); // Never return passwordHash in responses',
    tags: ['security', 'authentication', 'database'],
  },
  {
    id: 'overfetching',
    name: 'Overfetching — returning more data than needed',
    description: 'API returns entire DB rows including sensitive fields, or sends large nested objects when only IDs are needed.',
    whyBad: 'Exposes sensitive fields (passwordHash, internalNotes, costPrice). Wastes bandwidth. Leaks internal data model. One slip includes a secret field in a public endpoint.',
    fix: 'Always use explicit .select({ id, name, email }) in Drizzle — never db.select().from(table) on user-facing endpoints. Create separate DTO types for public vs internal representation.',
    severity: 'high',
    badExample: 'const users = await db.select().from(usersTable); // Returns passwordHash!',
    goodExample: 'const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable);',
    tags: ['security', 'api', 'database'],
  },
  {
    id: 'xss-dangerous-html',
    name: 'XSS via dangerouslySetInnerHTML or unsafe DOM injection',
    description: 'Rendering user-generated HTML directly into the DOM without sanitization.',
    whyBad: 'Any user-provided content rendered as HTML can execute scripts. An attacker stores `<script>document.cookie</script>` and it runs for every viewer. Leads to session hijacking and credential theft.',
    fix: 'Never use dangerouslySetInnerHTML with unsanitized input. Use DOMPurify.sanitize() if you must render HTML. For markdown, use a sanitizing markdown renderer. Prefer rendering as plain text.',
    severity: 'critical',
    badExample: '<div dangerouslySetInnerHTML={{ __html: userPost.content }} />',
    goodExample: 'import DOMPurify from "dompurify"; <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userPost.content) }} />\n// Or better: render as plain text or use react-markdown with rehype-sanitize',
    tags: ['security', 'react', 'xss'],
  },
  {
    id: 'missing-fk-index',
    name: 'Missing index on foreign key columns',
    description: 'Foreign key columns lack indexes, making JOIN and WHERE queries slow.',
    whyBad: 'Every JOIN and WHERE clause on a FK column does a full table scan without an index. A tasks table with 100k rows filtered by project_id takes 50ms+ instead of <1ms. Gets dramatically worse at scale.',
    fix: 'Always create an index on every FK column. In Drizzle: export const projectIdIdx = index("tasks_project_id_idx").on(tasks.projectId). Composite indexes for common multi-column queries.',
    severity: 'high',
    badExample: 'export const tasks = pgTable("tasks", { id: serial("id").primaryKey(), projectId: integer("project_id").references(() => projects.id) }); // No index!',
    goodExample: 'export const tasks = pgTable("tasks", { id: serial("id").primaryKey(), projectId: integer("project_id").notNull().references(() => projects.id) }, (t) => ({ projectIdIdx: index("tasks_project_id_idx").on(t.projectId), statusIdx: index("tasks_status_idx").on(t.status) }));',
    tags: ['database', 'performance', 'drizzle'],
  },
  {
    id: 'god-component',
    name: 'God component — one component doing everything',
    description: 'A single React component that fetches data, handles business logic, manages complex state, AND renders everything.',
    whyBad: 'Components with 500+ lines are impossible to test, reuse, or reason about. Adding a feature requires understanding the entire thing. State bugs cascade unpredictably.',
    fix: 'Split by responsibility: data-fetching hook, business logic hook, presentation component. A component over 150 lines is a signal to extract. Extract repeated JSX into sub-components.',
    severity: 'medium',
    badExample: 'function Dashboard() { const [users, setUsers] = useState([]); const [orders, setOrders] = useState([]); /* 8 more useState */ /* 5 useEffects */ /* 400 lines of JSX */ }',
    goodExample: 'function Dashboard() { return <DashboardLayout><UserStatsPanel /><RecentOrdersPanel /><RevenueChart /></DashboardLayout>; }\n// Each sub-component owns its own data fetching and state',
    tags: ['react', 'architecture', 'maintainability'],
  },
  {
    id: 'missing-zod-validation',
    name: 'No input validation on API routes',
    description: 'API route handlers use req.body values directly without parsing or validating them.',
    whyBad: 'Malformed input crashes handlers. Missing fields cause confusing "Cannot read property of undefined" errors. SQL injection if values are interpolated into queries. Type confusion when the frontend sends unexpected types.',
    fix: 'Parse and validate every request with Zod. On validation failure, return 422 with field-level error details. Use the same Zod schema for both validation and TypeScript types.',
    severity: 'critical',
    badExample: 'app.post("/users", async (req, res) => { await db.insert(users).values({ email: req.body.email, name: req.body.name }); res.json({ success: true }); });',
    goodExample: 'const createUserSchema = z.object({ email: z.string().email(), name: z.string().min(1).max(100) }); app.post("/users", async (req, res) => { const result = createUserSchema.safeParse(req.body); if (!result.success) return res.status(422).json({ errors: result.error.flatten() }); await db.insert(users).values(result.data); res.status(201).json({ success: true }); });',
    tags: ['api', 'validation', 'security', 'express'],
  },
  {
    id: 'money-float',
    name: 'Using floating point for money/currency',
    description: 'Storing money amounts as JavaScript floats (0.1 + 0.2 = 0.30000000000000004).',
    whyBad: 'Float arithmetic is imprecise for decimal values. Currency rounding errors compound across transactions. Users may see incorrect totals. Can lead to fraud and reconciliation failures.',
    fix: 'Store all monetary values as integers in the smallest unit (cents). 1234 = $12.34. Only convert to decimal for display. Never do: price * qty with floats.',
    severity: 'critical',
    badExample: 'const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0); // Float errors!',
    goodExample: 'const totalCents = order.items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0); const displayTotal = (totalCents / 100).toFixed(2); // $12.34',
    tags: ['finance', 'database', 'precision'],
  },
  {
    id: 'no-soft-delete',
    name: 'Hard deleting records that should be preserved',
    description: 'Using DELETE statements on records that have foreign key relationships or audit requirements.',
    whyBad: 'Hard deletes orphan related records, break audit trails, and lose data permanently. If an order references a deleted product, the order history becomes meaningless. Regulators (GDPR, SOX) often require data retention.',
    fix: 'Add deletedAt timestamptz column. Set it on "delete" instead of removing the row. Filter WHERE deletedAt IS NULL in all queries. Add a composite index on (active_column, deleted_at).',
    severity: 'high',
    badExample: 'await db.delete(users).where(eq(users.id, userId)); // Gone forever, breaks audit trails',
    goodExample: 'await db.update(users).set({ deletedAt: new Date(), status: "deleted" }).where(eq(users.id, userId)); // Soft delete — preserved for audit, can be restored',
    tags: ['database', 'data-integrity', 'audit'],
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

  {
    id: 'express-rate-limiter',
    title: 'Express Rate Limiting (Auth + API)',
    description: 'Strict rate limits on auth endpoints, moderate on API. Prevents brute-force and DoS.',
    tech: ['express', 'typescript'],
    tags: ['security', 'rate-limiting', 'authentication'],
    code: `import rateLimit from 'express-rate-limit';

// Strict: 5 attempts per 15 minutes per IP (auth endpoints)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

// Moderate: 100 req/min per authenticated user
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (req) => (req as any).userId?.toString() || req.ip || 'anonymous',
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Usage in routes:
// app.post('/auth/login', authLimiter, loginHandler);
// app.post('/auth/register', authLimiter, registerHandler);
// app.use('/api', apiLimiter);`,
  },

  {
    id: 'drizzle-soft-delete',
    title: 'Soft Delete Pattern (Drizzle)',
    description: 'Implement soft deletes with deletedAt column. All queries automatically filter soft-deleted rows.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'soft-delete', 'data-integrity'],
    code: `import { pgTable, serial, text, timestamptz, boolean } from 'drizzle-orm/pg-core';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db';

// Schema: add deletedAt to any table
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  deletedAt: timestamptz('deleted_at'), // null = active, set = soft-deleted
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

// Soft delete — never use db.delete() on these tables
export async function softDelete(id: number): Promise<boolean> {
  const result = await db
    .update(items)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(items.id, id), isNull(items.deletedAt)))
    .returning({ id: items.id });
  return result.length > 0;
}

// All queries MUST include this filter
export async function findActive(userId?: number) {
  return db
    .select()
    .from(items)
    .where(isNull(items.deletedAt)); // Always filter soft-deleted rows
}

// Restore a soft-deleted record
export async function restore(id: number): Promise<boolean> {
  const result = await db
    .update(items)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(items.id, id))
    .returning({ id: items.id });
  return result.length > 0;
}`,
  },

  {
    id: 'drizzle-audit-log',
    title: 'Audit Log Pattern (Drizzle)',
    description: 'Append-only audit trail recording who did what to which entity and when.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['audit', 'security', 'database', 'compliance'],
    code: `import { pgTable, bigserial, varchar, text, integer, timestamptz, jsonb, inet } from 'drizzle-orm/pg-core';
import { db } from './db';

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(), // bigserial for high volume
  action: varchar('action', { length: 100 }).notNull(),    // 'user.updated', 'invoice.paid'
  actorId: integer('actor_id'),                            // null for system actions
  actorEmail: varchar('actor_email', { length: 255 }),     // snapshot at time of action
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id'),
  changes: jsonb('changes'),    // { before: {...}, after: {...} }
  metadata: jsonb('metadata'),  // { ip, userAgent, requestId }
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export interface AuditContext {
  actorId?: number;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Call this helper whenever a significant action occurs
export async function logAudit(
  action: string,
  entityType: string,
  entityId: number | null,
  context: AuditContext,
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
): Promise<void> {
  await db.insert(auditLogs).values({
    action,
    actorId: context.actorId ?? null,
    actorEmail: context.actorEmail ?? null,
    entityType,
    entityId: entityId ?? null,
    changes: changes ?? null,
    metadata: { ip: context.ipAddress, userAgent: context.userAgent },
  });
}

// Usage:
// await logAudit('invoice.paid', 'invoice', invoice.id, { actorId: req.userId, actorEmail: req.userEmail },
//   { before: { status: 'sent' }, after: { status: 'paid' } });`,
  },

  {
    id: 'express-file-upload',
    title: 'File Upload Handler (multer + S3)',
    description: 'Secure multipart file upload with type/size validation and object storage.',
    tech: ['express', 'typescript', 'multer'],
    tags: ['file-upload', 'api', 'security'],
    code: `import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Memory storage — never write to disk in production
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(\`File type \${file.mimetype} not allowed\`));
    }
  },
});

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  prefix = 'uploads'
): Promise<{ key: string; url: string }> {
  const ext = path.extname(originalName).toLowerCase();
  const key = \`\${prefix}/\${randomUUID()}\${ext}\`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    // Never set ACL: 'public-read' — use signed URLs instead
  }));

  const url = \`https://\${process.env.S3_BUCKET}.s3.\${process.env.AWS_REGION}.amazonaws.com/\${key}\`;
  return { key, url };
}

// Route: POST /attachments
// app.post('/attachments', authenticate, upload.single('file'), async (req, res) => {
//   if (!req.file) return res.status(400).json({ error: 'No file provided' });
//   const { key, url } = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
//   const attachment = await db.insert(attachments).values({ filename: req.file.originalname, storedKey: key, url, mimeType: req.file.mimetype, sizeBytes: req.file.size, uploadedById: req.userId }).returning();
//   res.status(201).json({ attachment: attachment[0] });
// });`,
  },

  {
    id: 'react-infinite-scroll',
    title: 'Cursor-Based Infinite Scroll (React Query)',
    description: 'Infinite scroll with cursor pagination using useInfiniteQuery. Efficient for large lists.',
    tech: ['react', 'typescript', 'react-query'],
    tags: ['pagination', 'infinite-scroll', 'react', 'performance'],
    code: `import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface PageResult<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

function useCursorPagination<T>(
  queryKey: string,
  endpoint: string,
  pageSize = 20
) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery<PageResult<T>>({
      queryKey: [queryKey],
      queryFn: async ({ pageParam }) => {
        const cursor = pageParam as string | undefined;
        const url = cursor
          ? \`\${endpoint}?cursor=\${cursor}&limit=\${pageSize}\`
          : \`\${endpoint}?limit=\${pageSize}\`;
        const res = await apiRequest('GET', url);
        return res.json();
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  // Intersection Observer for auto-load
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    observerRef.current?.disconnect();
    if (node) {
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && hasNextPage) fetchNextPage();
      });
      observerRef.current.observe(node);
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const items = data?.pages.flatMap(p => p.data) ?? [];
  return { items, isLoading, error, isFetchingNextPage, hasNextPage, loadMoreRef };
}

// Usage:
// const { items, isLoading, loadMoreRef } = useCursorPagination<Task>('tasks', '/api/tasks');
// return (
//   <div>
//     {items.map(item => <TaskCard key={item.id} task={item} />)}
//     <div ref={loadMoreRef} className="h-4" /> {/* Sentinel element */}
//     {isFetchingNextPage && <Spinner />}
//   </div>
// );`,
  },

  {
    id: 'react-optimistic-update',
    title: 'Optimistic Updates (React Query)',
    description: 'Update UI instantly on user action, roll back if server rejects. Zero-latency UX.',
    tech: ['react', 'typescript', 'react-query'],
    tags: ['react', 'optimistic-ui', 'ux', 'react-query'],
    code: `import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Task { id: number; title: string; status: string; }

function useToggleTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', \`/api/tasks/\${id}\`, { status });
      return res.json() as Promise<Task>;
    },

    // 1. Snapshot current state before mutation
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // 2. Apply optimistic update immediately
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map(task => task.id === id ? { ...task, status } : task) ?? []
      );

      return { previousTasks }; // Return snapshot for rollback
    },

    // 3. On error: roll back to snapshot
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },

    // 4. After success or error: sync with server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}`,
  },

  {
    id: 'drizzle-full-text-search',
    title: 'Full-Text Search (PostgreSQL + Drizzle)',
    description: 'Efficient full-text search with tsvector, ranking, and pagination.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['search', 'database', 'postgresql', 'performance'],
    code: `import { sql, desc, and, isNull } from 'drizzle-orm';
import { db } from './db';
import { tasks } from './schema';

// In your schema, add a search vector column:
// searchVector: customType<{ data: string }>({ dataType: () => 'tsvector' })

// Create a GIN index on the vector column (run once):
// CREATE INDEX tasks_search_idx ON tasks USING GIN(search_vector);
// Keep it updated via trigger or manually on insert/update

export async function searchTasks(
  query: string,
  projectId: number,
  limit = 20,
  offset = 0
): Promise<{ results: typeof tasks.$inferSelect[]; total: number }> {
  if (!query.trim()) {
    return { results: [], total: 0 };
  }

  // Sanitize and build tsquery (prefix search with :*)
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .map(word => word.replace(/[^a-zA-Z0-9]/g, '') + ':*')
    .join(' & ');

  const [results, countResult] = await Promise.all([
    db.execute(sql\`
      SELECT *, ts_rank(search_vector, to_tsquery('english', \${tsQuery})) AS rank
      FROM tasks
      WHERE project_id = \${projectId}
        AND deleted_at IS NULL
        AND search_vector @@ to_tsquery('english', \${tsQuery})
      ORDER BY rank DESC, created_at DESC
      LIMIT \${limit} OFFSET \${offset}
    \`),
    db.execute(sql\`
      SELECT COUNT(*) as total
      FROM tasks
      WHERE project_id = \${projectId}
        AND deleted_at IS NULL
        AND search_vector @@ to_tsquery('english', \${tsQuery})
    \`),
  ]);

  return {
    results: results.rows as typeof tasks.$inferSelect[],
    total: Number((countResult.rows[0] as any).total),
  };
}

// For simple ILIKE search (no tsvector setup needed, good for <100k rows):
export async function simpleSearch(query: string, limit = 20) {
  return db
    .select()
    .from(tasks)
    .where(and(
      isNull(tasks.deletedAt),
      sql\`(title ILIKE \${'%' + query + '%'} OR description ILIKE \${'%' + query + '%'})\`
    ))
    .orderBy(desc(tasks.createdAt))
    .limit(limit);
}`,
  },

  {
    id: 'react-table-with-filter-sort',
    title: 'Data Table with Filter, Sort, and Pagination',
    description: 'Production-quality data table with server-side filtering, sorting, and URL-synced state.',
    tech: ['react', 'typescript', 'react-query'],
    tags: ['react', 'table', 'filtering', 'sorting', 'pagination'],
    code: `import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface TableState {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  search: string;
  filters: Record<string, string>;
}

function useTableState(defaultSortBy: string) {
  const [state, setState] = useState<TableState>({
    page: 1, pageSize: 20, sortBy: defaultSortBy, sortDir: 'desc', search: '', filters: {}
  });

  const setPage = useCallback((page: number) => setState(s => ({ ...s, page })), []);
  const setSearch = useCallback((search: string) => setState(s => ({ ...s, search, page: 1 })), []);
  const setFilter = useCallback((key: string, value: string) =>
    setState(s => ({ ...s, filters: { ...s.filters, [key]: value }, page: 1 })), []);
  const toggleSort = useCallback((column: string) =>
    setState(s => ({
      ...s,
      sortBy: column,
      sortDir: s.sortBy === column && s.sortDir === 'asc' ? 'desc' : 'asc',
      page: 1,
    })), []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({
      page: String(state.page),
      pageSize: String(state.pageSize),
      sortBy: state.sortBy,
      sortDir: state.sortDir,
    });
    if (state.search) params.set('search', state.search);
    Object.entries(state.filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    return params.toString();
  }, [state]);

  return { state, setPage, setSearch, setFilter, toggleSort, buildQuery };
}

// Usage:
// const { state, setPage, setSearch, setFilter, toggleSort, buildQuery } = useTableState('createdAt');
// const { data } = useQuery({ queryKey: ['tasks', buildQuery()], queryFn: () => apiRequest('GET', \`/api/tasks?\${buildQuery()}\`).then(r => r.json()) });`,
  },

  {
    id: 'nodejs-background-job',
    title: 'Background Job Queue (Node.js)',
    description: 'Simple in-process job queue with retries, delays, and error handling. Use BullMQ for production.',
    tech: ['typescript', 'nodejs'],
    tags: ['background-jobs', 'queue', 'async', 'nodejs'],
    code: `// Simple in-process queue for low-volume tasks
// For production, replace with BullMQ + Redis

interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
}

type JobHandler<T> = (data: T) => Promise<void>;

class SimpleJobQueue {
  private queue: Job[] = [];
  private handlers = new Map<string, JobHandler<any>>();
  private running = false;

  register<T>(type: string, handler: JobHandler<T>) {
    this.handlers.set(type, handler);
  }

  enqueue<T>(type: string, data: T, delayMs = 0): string {
    const id = \`\${type}-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
    this.queue.push({
      id, type, data, attempts: 0, maxAttempts: 3,
      nextRunAt: new Date(Date.now() + delayMs),
    });
    if (!this.running) this.process();
    return id;
  }

  private async process() {
    this.running = true;
    while (this.queue.length > 0) {
      const now = new Date();
      const idx = this.queue.findIndex(j => j.nextRunAt <= now);
      if (idx === -1) { await new Promise(r => setTimeout(r, 1000)); continue; }

      const [job] = this.queue.splice(idx, 1);
      const handler = this.handlers.get(job.type);
      if (!handler) continue;

      try {
        await handler(job.data);
      } catch (err) {
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          job.nextRunAt = new Date(Date.now() + Math.pow(2, job.attempts) * 1000); // Exponential backoff
          this.queue.push(job);
        } else {
          console.error(\`[JobQueue] Job \${job.id} failed after \${job.maxAttempts} attempts:\`, err);
        }
      }
    }
    this.running = false;
  }
}

export const jobQueue = new SimpleJobQueue();

// Register handlers:
// jobQueue.register('send-welcome-email', async (data: { userId: number }) => {
//   await emailService.sendWelcome(data.userId);
// });
// jobQueue.register('generate-pdf-report', async (data: { reportId: number }) => {
//   await pdfService.generate(data.reportId);
// });

// Enqueue:
// jobQueue.enqueue('send-welcome-email', { userId: newUser.id });
// jobQueue.enqueue('generate-pdf-report', { reportId }, 5000); // 5s delay`,
  },

  {
    id: 'react-compound-component',
    title: 'Compound Component Pattern',
    description: 'Build flexible, composable UI components using React context + static subcomponents.',
    tech: ['react', 'typescript'],
    tags: ['react', 'pattern', 'compound-component', 'context'],
    code: `import { createContext, useContext, useState } from 'react';

// Example: Accordion compound component
interface AccordionContext {
  openItems: Set<string>;
  toggle: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionCtx = createContext<AccordionContext | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error('Accordion subcomponents must be used inside <Accordion>');
  return ctx;
}

function Accordion({ children, allowMultiple = false }: { children: React.ReactNode; allowMultiple?: boolean }) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AccordionCtx.Provider value={{ openItems, toggle, allowMultiple }}>
      <div role="list">{children}</div>
    </AccordionCtx.Provider>
  );
}

function AccordionItem({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.has(id);
  return (
    <div role="listitem">
      <button onClick={() => toggle(id)} aria-expanded={isOpen}>{title}</button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

Accordion.Item = AccordionItem;

// Usage:
// <Accordion allowMultiple>
//   <Accordion.Item id="section-1" title="Section 1">Content 1</Accordion.Item>
//   <Accordion.Item id="section-2" title="Section 2">Content 2</Accordion.Item>
// </Accordion>`,
  },

  {
    id: 'express-jwt-auth',
    title: 'JWT Auth Flow (sign + verify + refresh)',
    description: 'Complete JWT authentication with short-lived access tokens and long-lived refresh tokens.',
    tech: ['express', 'typescript', 'jwt'],
    tags: ['authentication', 'jwt', 'security', 'express'],
    code: `import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, refreshTokens } from './schema';
import { eq, and, gt } from 'drizzle-orm';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenPayload { userId: number; email: string; role: string; }

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export async function createRefreshToken(userId: number): Promise<string> {
  const token = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRES });
  // Store in DB for revocation support
  await db.insert(refreshTokens).values({
    token: await hashToken(token), // Store hashed, not plain
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
  });
  return token;
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: number };
  const hashedToken = await hashToken(refreshToken);
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, hashedToken),
      eq(refreshTokens.userId, payload.userId),
      gt(refreshTokens.expiresAt, new Date()), // Not expired
    ),
    with: { user: { columns: { id: true, email: true, role: true } } },
  });
  if (!storedToken) throw new Error('Invalid or expired refresh token');
  return signAccessToken({ userId: storedToken.user.id, email: storedToken.user.email, role: storedToken.user.role });
}

async function hashToken(token: string): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(token).digest('hex');
}

// Express middleware
export function authenticate(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}`,
  },

  {
    id: 'react-data-chart',
    title: 'Analytics Chart Component (Recharts)',
    description: 'Responsive time-series chart with loading state, empty state, and tooltip.',
    tech: ['react', 'typescript', 'recharts'],
    tags: ['react', 'charts', 'analytics', 'visualization'],
    code: `import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DataPoint { date: string; value: number; }

interface Props {
  endpoint: string;
  title: string;
  color?: string;
  yAxisLabel?: string;
  dateRange?: { from: Date; to: Date };
}

export function TimeSeriesChart({ endpoint, title, color = '#6366f1', yAxisLabel = 'Count', dateRange }: Props) {
  const { data, isLoading, error } = useQuery<DataPoint[]>({
    queryKey: [endpoint, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set('from', dateRange.from.toISOString());
      if (dateRange?.to) params.set('to', dateRange.to.toISOString());
      return apiRequest('GET', \`\${endpoint}?\${params}\`).then(r => r.json());
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  if (isLoading) return (
    <div className="h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading chart...</span>
    </div>
  );

  if (error) return (
    <div className="h-64 bg-destructive/10 rounded-lg flex items-center justify-center">
      <span className="text-destructive text-sm">Failed to load chart data</span>
    </div>
  );

  if (!data?.length) return (
    <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
      <span className="text-muted-foreground text-sm">No data for selected period</span>
    </div>
  );

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
          <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}`,
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
  {
    id: 'security',
    title: 'Application Security',
    category: 'security',
    description: 'Prevent the most common web vulnerabilities (OWASP Top 10) in every application.',
    do: [
      'Hash passwords with bcrypt (cost 12) or argon2 — never store plain text',
      'Validate ALL input on the server with Zod — never trust client data',
      'Rate limit auth endpoints: 5 req/15min by IP',
      'Use HttpOnly, Secure, SameSite=Strict cookies for session tokens',
      'Store secrets in environment variables, never in code',
      'Set security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy',
      'Use parameterized queries / ORM (never string-concatenate SQL)',
      'Implement RBAC — check authorization on every request, not just the route',
    ],
    dont: [
      'Store passwords, tokens, or API keys in plaintext in DB or logs',
      'Return internal error messages or stack traces to clients',
      'Use MD5 or SHA1 for password hashing',
      'Trust user-supplied IDs without verifying ownership',
      'Use dangerouslySetInnerHTML with unsanitized input',
      'Allow unlimited login attempts without lockout/rate limiting',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'database',
    title: 'Database Design Principles',
    category: 'database',
    description: 'Design schemas that perform well, stay consistent, and scale cleanly.',
    do: [
      'Add indexes on every foreign key column',
      'Add composite indexes for the most common WHERE + ORDER BY combinations',
      'Store money as integers in cents — never floating point',
      'Use timestamptz (not timestamp) for all datetime columns — timezone-aware',
      'Add deletedAt nullable column for soft-delete instead of hard deletes',
      'Use NOT NULL constraints — nullable = optional, be explicit about intent',
      'Add createdAt and updatedAt to every mutable table',
      'Use CHECK constraints for enum-like columns: CHECK (status IN (...))',
    ],
    dont: [
      'Use varchar(MAX) or text for everything — choose appropriate limits',
      'Use stored procedures for business logic — keep it in application code',
      'Skip DB constraints thinking application code will handle it',
      'Store JSON blobs where relational columns would be clearer',
      'Index every column — only index what queries actually filter/sort on',
      'Use sequences for natural keys (phone, email) — always add a surrogate PK',
    ],
    languages: ['typescript', 'sql'],
  },
  {
    id: 'state-management',
    title: 'Frontend State Management',
    category: 'react',
    description: 'Choose the right state scope and avoid state synchronization hell.',
    do: [
      'Distinguish state types: server state (React Query), client/UI state (useState/useReducer), global UI (context/Zustand)',
      'Use React Query for ALL server data — it handles caching, loading, refetching automatically',
      'Co-locate state with the component that owns it — lift only when necessary',
      'Derive values during render instead of storing derived state in useState',
      'Use URL params for state that should be shareable/bookmarkable (filters, page)',
      'Reset form state after successful submission',
    ],
    dont: [
      'Mix server cache (React Query) with client state in the same useState',
      'Store copies of server data in useState — one source of truth',
      'Use Redux/Zustand for server cache — React Query replaces that use case',
      'Keep stale data in a context store when React Query would handle it',
      'Update UI optimistically without handling rollback on failure',
    ],
    languages: ['typescript'],
  },
  {
    id: 'performance-react',
    title: 'React Performance Optimization',
    category: 'performance',
    description: 'Prevent unnecessary re-renders and keep the UI responsive.',
    do: [
      'Profile with React DevTools Profiler before optimizing — measure first',
      'Use useMemo for expensive calculations that take >1ms',
      'Use useCallback when passing functions as props to memoized children',
      'Use React.memo on pure components that receive complex props',
      'Virtualize long lists (>100 items) with react-virtual or react-window',
      'Lazy-load heavy components with React.lazy + Suspense',
      'Use CSS transitions instead of JS animations when possible',
    ],
    dont: [
      'Add useMemo/useCallback everywhere preemptively — it has overhead too',
      'Put large objects or arrays inline in JSX props to memoized components',
      'Import entire icon libraries — use tree-shaking or individual imports',
      'Render 1000+ items without virtualization',
      'Run expensive operations on every keystroke without debouncing',
    ],
    languages: ['typescript'],
  },
  {
    id: 'file-organization',
    title: 'Project File Organization',
    category: 'architecture',
    description: 'Structure files for discoverability, team collaboration, and scalability.',
    do: [
      'Group by feature/domain, not by file type: src/features/invoices/ not src/components/InvoiceForm, src/hooks/useInvoices',
      'Keep shared utilities in src/lib/ or src/utils/',
      'Put API client code in src/lib/api.ts or per-resource files',
      'Use barrel exports (index.ts) only for stable public APIs — not for everything',
      'Name files after their default export: UserCard.tsx exports UserCard',
      'Separate business logic from UI: useTaskLogic hook + TaskCard component',
    ],
    dont: [
      'Put 20 components in a single components/ folder with no substructure',
      'Name files generic.ts, helpers.ts, utils.ts — be specific',
      'Import from deep paths that reveal implementation details',
      'Mix server code and client code in the same file without clear separation',
    ],
    languages: ['typescript'],
  },
  {
    id: 'async-patterns',
    title: 'Async Patterns & Concurrency',
    category: 'paradigm',
    description: 'Write correct, efficient async code in Node.js and React.',
    do: [
      'Use Promise.all() for independent parallel async operations',
      'Use Promise.allSettled() when you want all results even if some fail',
      'Add process.on("unhandledRejection") handler to catch floating promises',
      'Use AbortController to cancel fetches when components unmount',
      'Debounce user-triggered async operations (search, autocomplete)',
      'Use async generators for streaming/pagination',
    ],
    dont: [
      'Await inside loops when the operations are independent — use Promise.all',
      'Create new Promises unnecessarily when the API already returns Promises',
      'Mix callbacks and Promises in the same code path',
      'Forget to handle the case where Promise.all rejects (one failure = all fail)',
      'Start async operations in useEffect without cleanup/cancellation',
    ],
    languages: ['typescript', 'javascript'],
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
  /** Detected application domain: 'project-management' | 'security-dashboard' | 'crm' | 'hr-system' | 'ecommerce' | 'support-desk' */
  domain?: string;
  features?: string[];
  /** Entity names as detected by NLU (e.g. ['task', 'sprint', 'milestone', 'cve', 'risk', 'deadline']) */
  entities?: string[];
  fileExtension?: 'ts' | 'tsx' | 'js' | 'jsx';
  fileRole?: 'component' | 'route' | 'hook' | 'schema' | 'util' | 'middleware' | 'service';
  techStack?: string[];
  isAuthRequired?: boolean;
  hasDatabaseAccess?: boolean;
  /** Whether the entity being generated has a status/workflow field */
  hasWorkflow?: boolean;
  /** Specific entity name for this file (e.g. 'vulnerability', 'invoice') */
  primaryEntity?: string;
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
  if (ctx.isAuthRequired) practiceIds.push('security');
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

  // ── Domain model context ───────────────────────────────────────────────────
  if (ctx.domain) {
    const domainCtx = getDomainModelContext(ctx.domain);
    if (domainCtx) {
      lines.push(domainCtx);
      lines.push('');
    }
  }

  // ── Entity archetype resolution ────────────────────────────────────────────
  const entitiesToResolve: string[] = [];
  if (ctx.primaryEntity) entitiesToResolve.push(ctx.primaryEntity);
  if (ctx.entities && ctx.entities.length > 0) {
    for (const e of ctx.entities) {
      if (!entitiesToResolve.includes(e)) entitiesToResolve.push(e);
    }
  }
  if (entitiesToResolve.length > 0) {
    const archetypeCtx = resolveEntityArchetypes(entitiesToResolve);
    if (archetypeCtx) {
      lines.push(archetypeCtx);
      lines.push('');
    }
  }

  // ── Primary entity schema suggestions (for schema/route/service files) ──────
  if (ctx.primaryEntity && (ctx.fileRole === 'schema' || ctx.fileRole === 'route' || ctx.fileRole === 'service' || ctx.hasDatabaseAccess)) {
    const schemaSuggestions = getSchemaSuggestions(ctx.primaryEntity, ctx.domain);
    if (schemaSuggestions) {
      lines.push(schemaSuggestions);
      lines.push('');
    }
    if (ctx.hasWorkflow) {
      const arch = matchEntityToArchetype(ctx.primaryEntity);
      if (arch) {
        const wf = getWorkflowPattern(arch.id);
        if (wf) {
          lines.push(wf);
          lines.push('');
        }
      }
    }
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

// ============================================
// Entity Archetype Utility Functions
// ============================================

/**
 * Fuzzy-match an entity name to the best archetype.
 * Handles variations like "cve" → vulnerability, "deadline" → deadline, "pto" → leave
 */
export function matchEntityToArchetype(entityName: string): EntityArchetype | null {
  const lower = entityName.toLowerCase().trim();

  // 1. Direct ID match
  if (ENTITY_ARCHETYPES[lower]) return ENTITY_ARCHETYPES[lower];

  // 2. Alias match (exact)
  for (const arch of Object.values(ENTITY_ARCHETYPES)) {
    if (arch.aliases.some(alias => alias === lower)) return arch;
  }

  // 3. Alias partial match
  for (const arch of Object.values(ENTITY_ARCHETYPES)) {
    if (arch.aliases.some(alias => alias.includes(lower) || lower.includes(alias))) return arch;
  }

  // 4. Name partial match
  for (const arch of Object.values(ENTITY_ARCHETYPES)) {
    if (arch.name.toLowerCase().includes(lower) || lower.includes(arch.name.toLowerCase().split(' ')[0])) return arch;
  }

  return null;
}

/**
 * Get the suggested DB fields for a known entity archetype.
 */
export function getEntityFields(archetypeId: string): EntityArchetype['suggestedFields'] {
  return ENTITY_ARCHETYPES[archetypeId]?.suggestedFields ?? [];
}

/**
 * Get all entity archetypes, optionally filtered by domain.
 */
export function getAllEntityArchetypes(domain?: string): EntityArchetype[] {
  const all = Object.values(ENTITY_ARCHETYPES);
  if (domain) return all.filter(a => a.domain === domain);
  return all;
}

/**
 * Get all archetypes for a given domain.
 */
export function getArchetypesByDomain(domain: string): EntityArchetype[] {
  return Object.values(ENTITY_ARCHETYPES).filter(a => a.domain === domain);
}

/**
 * Get a domain model blueprint by domain key.
 */
export function getDomainModel(domain: string): DomainModel | null {
  return DOMAIN_MODELS[domain] ?? null;
}

/**
 * Get all domain models.
 */
export function getAllDomainModels(): DomainModel[] {
  return Object.values(DOMAIN_MODELS);
}

/**
 * Given an entity name and optional domain context, return a rich schema suggestion
 * that can be injected into LLM prompts for schema/code generation stages.
 */
export function getSchemaSuggestions(entityName: string, domain?: string): string {
  const arch = matchEntityToArchetype(entityName);
  if (!arch) {
    // Generic suggestion for unknown entities
    return `Entity "${entityName}": Consider standard fields: id (serial PK), name/title, status (varchar with CHECK constraint), createdAt/updatedAt (timestamptz). Add soft delete (deletedAt). Index FK columns and status.`;
  }

  const lines: string[] = [];
  lines.push(`## Schema Suggestions for "${entityName}" (archetype: ${arch.name})`);
  lines.push(`Domain: ${arch.domain} | Traits: ${arch.traits.join(', ')}`);
  lines.push('');
  lines.push('### Recommended Drizzle columns:');
  for (const field of arch.suggestedFields.slice(0, 12)) {
    lines.push(`- \`${field.name}\`: ${field.type}${field.nullable ? '' : ' — NOT NULL'} — ${field.description}`);
  }
  lines.push('');
  lines.push(`### Recommended indexes: ${arch.suggestedIndexes.join(', ')}`);
  lines.push('');
  lines.push(`### Related entities to model: ${arch.relatedEntities.join(', ')}`);
  if (arch.typicalEndpoints.length > 0) {
    lines.push('');
    lines.push(`### Typical API endpoints:\n${arch.typicalEndpoints.map(e => `- ${e}`).join('\n')}`);
  }
  if (arch.defaultWorkflow) {
    lines.push('');
    lines.push(`### Workflow states: ${arch.defaultWorkflow.states.join(' → ')}`);
  }
  return lines.join('\n');
}

/**
 * Get the state machine workflow for an entity archetype as a formatted string.
 */
export function getWorkflowPattern(archetypeId: string): string | null {
  const arch = ENTITY_ARCHETYPES[archetypeId] ?? matchEntityToArchetype(archetypeId);
  if (!arch?.defaultWorkflow) return null;

  const wf = arch.defaultWorkflow;
  const lines = [`## ${arch.name} Workflow`];
  lines.push(`States: ${wf.states.join(' | ')}`);
  lines.push('');
  lines.push('Transitions:');
  for (const t of wf.transitions) {
    lines.push(`  ${t.from} --[${t.action}]--> ${t.to}`);
  }
  lines.push('');
  lines.push('Implementation tip: Store status as varchar column with CHECK constraint. Create a dedicated PATCH /status endpoint that validates the transition is allowed before updating.');
  return lines.join('\n');
}

/**
 * Resolve a list of entity names to their archetypes and return a compact summary
 * for injection into LLM prompts. Used by understanding and plan stages.
 */
export function resolveEntityArchetypes(entityNames: string[]): string {
  const resolved: Array<{ name: string; arch: EntityArchetype }> = [];
  const unresolved: string[] = [];

  for (const name of entityNames) {
    const arch = matchEntityToArchetype(name);
    if (arch) {
      resolved.push({ name, arch });
    } else {
      unresolved.push(name);
    }
  }

  if (resolved.length === 0) return '';

  const lines = ['## Entity Archetypes Detected'];
  lines.push('These known patterns apply to your entities:');
  lines.push('');

  for (const { name, arch } of resolved) {
    lines.push(`### ${name} → ${arch.name} (${arch.domain} domain)`);
    lines.push(`Key fields: ${arch.suggestedFields.slice(0, 6).map(f => f.name).join(', ')}`);
    lines.push(`Traits: ${arch.traits.join(', ')}`);
    if (arch.defaultWorkflow) {
      lines.push(`Workflow: ${arch.defaultWorkflow.states.join(' → ')}`);
    }
    lines.push(`Related: ${arch.relatedEntities.join(', ')}`);
    lines.push('');
  }

  if (unresolved.length > 0) {
    lines.push(`Unknown entities (no archetype): ${unresolved.join(', ')} — define fields manually`);
  }

  return lines.join('\n');
}

/**
 * Get domain model context for a detected application domain.
 * Returns rich guidance about entities, relationships, and features.
 */
export function getDomainModelContext(domain: string): string {
  const model = getDomainModel(domain);
  if (!model) return '';

  const lines = [`## Domain Model: ${model.name}`];
  lines.push(model.description);
  lines.push('');
  lines.push(`Core entities: ${model.coreEntities.join(', ')}`);
  lines.push(`Optional entities: ${model.optionalEntities.join(', ')}`);
  lines.push('');
  lines.push('Key relationships:');
  for (const rel of model.keyRelationships) lines.push(`  - ${rel}`);
  lines.push('');
  lines.push('Typical features:');
  for (const feat of model.typicalFeatures) lines.push(`  - ${feat}`);
  lines.push('');
  lines.push('Security considerations:');
  for (const sec of model.securityConsiderations) lines.push(`  - ${sec}`);
  lines.push('');
  lines.push('Index strategy:');
  for (const idx of model.suggestedIndexStrategy) lines.push(`  - ${idx}`);

  return lines.join('\n');
}
