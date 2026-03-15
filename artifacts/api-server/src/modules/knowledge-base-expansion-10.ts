import type { Concept, CodeSnippet, BestPractice, AntiPattern, EntityArchetype, DomainModel } from './knowledge-base';

// ============================================
// EXPANSION 10 — Additional Patterns & Content
// ============================================

// ── EXPANDED CONCEPTS — PART 10 ─────────────────────────────────────────

export const EXPANDED_CONCEPTS_10: Record<string, Concept> = {

  'web-sockets': {
    id: 'web-sockets',
    name: 'WebSockets',
    category: 'architecture',
    description: 'Full-duplex communication protocol for real-time bidirectional data exchange.',
    explanation: 'WebSockets maintain a persistent connection between client and server, enabling real-time updates without polling. Unlike HTTP request/response, data flows in both directions simultaneously over a single TCP connection. Ideal for chat, live dashboards, collaborative editing, gaming, and notifications.',
    examples: [
      'Chat applications with instant message delivery',
      'Live collaborative document editing (Google Docs style)',
      'Real-time stock ticker and trading platforms',
      'Multiplayer game state synchronization',
      'Live notification feeds and activity streams',
    ],
    relatedConcepts: ['server-sent-events', 'long-polling', 'pub-sub', 'event-driven-architecture'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'server-sent-events': {
    id: 'server-sent-events',
    name: 'Server-Sent Events (SSE)',
    category: 'architecture',
    description: 'Unidirectional server-to-client streaming over HTTP for real-time updates.',
    explanation: 'SSE provides a simple, HTTP-based mechanism for servers to push updates to clients. Unlike WebSockets, SSE is unidirectional (server to client only) and works over standard HTTP. It features automatic reconnection, event IDs for resuming missed events, and is simpler to implement than WebSockets for one-way data flows.',
    examples: [
      'Live feed updates (news, social media)',
      'Build/deployment progress streaming',
      'Server-side AI response streaming (ChatGPT style)',
      'Real-time analytics dashboard updates',
      'Notification delivery without polling',
    ],
    relatedConcepts: ['web-sockets', 'long-polling', 'event-driven-architecture'],
    languages: ['typescript'],
    difficulty: 'beginner',
  },

  'database-transactions': {
    id: 'database-transactions',
    name: 'Database Transactions',
    category: 'database',
    description: 'ACID-compliant atomic operations ensuring data consistency across multiple queries.',
    explanation: 'Transactions group multiple database operations into a single atomic unit. Either all operations succeed (commit) or none take effect (rollback). ACID properties — Atomicity, Consistency, Isolation, Durability — guarantee reliable data modifications even during concurrent access or system failures. Isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) trade consistency for performance.',
    examples: [
      'Transferring money between accounts (debit + credit atomically)',
      'Creating an order with line items and inventory deduction',
      'User registration with profile, settings, and welcome email record',
      'Cascading deletes with referential integrity checks',
    ],
    relatedConcepts: ['database-indexing', 'optimistic-locking', 'connection-pooling'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'optimistic-locking': {
    id: 'optimistic-locking',
    name: 'Optimistic Locking',
    category: 'database',
    description: 'Concurrency control using version numbers to detect conflicting modifications.',
    explanation: 'Optimistic locking assumes conflicts are rare and allows concurrent reads without blocking. Each record has a version number or timestamp. Before updating, the application checks that the version has not changed since the read. If it has, the update is rejected and the client must re-read and retry. This avoids database-level locks that block other transactions.',
    examples: [
      'Editing a shared document — detect if another user changed it',
      'Inventory management — prevent overselling when concurrent orders arrive',
      'CMS content editing with conflict detection',
      'Configuration updates in multi-admin systems',
    ],
    relatedConcepts: ['database-transactions', 'pessimistic-locking', 'conflict-resolution'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'connection-pooling': {
    id: 'connection-pooling',
    name: 'Connection Pooling',
    category: 'database',
    description: 'Reuse database connections across requests to reduce overhead and improve performance.',
    explanation: 'Creating a new database connection for each request is expensive (TCP handshake, authentication, SSL negotiation). Connection pooling maintains a set of idle connections that are reused across requests. This dramatically reduces latency and resource consumption. Pool configuration includes min/max connections, idle timeout, and connection lifetime limits.',
    examples: [
      'Node.js pg pool with 10-20 connections per application instance',
      'PgBouncer as an external connection pooler for PostgreSQL',
      'Drizzle ORM with connection pool configuration',
      'Serverless connection pooling with tools like Neon or Supabase pooler',
    ],
    relatedConcepts: ['database-transactions', 'query-optimization', 'serverless-architecture'],
    languages: ['typescript'],
    difficulty: 'beginner',
  },

  'middleware-pattern': {
    id: 'middleware-pattern',
    name: 'Middleware Pattern',
    category: 'pattern',
    description: 'Chain of functions that process requests/responses in sequence, each able to modify or short-circuit the flow.',
    explanation: 'Middleware creates a pipeline where each function receives the request, optionally modifies it, then passes it to the next function in the chain. Any middleware can short-circuit by sending a response directly (e.g., auth rejection). This pattern enables clean separation of cross-cutting concerns like logging, authentication, validation, error handling, and CORS.',
    examples: [
      'Express.js middleware chain: cors() → helmet() → auth() → handler',
      'Request logging middleware that records timing and status codes',
      'Authentication middleware that validates JWT and attaches user context',
      'Rate limiting middleware that tracks request counts per IP/API key',
      'Error handling middleware that catches and formats all unhandled errors',
    ],
    relatedConcepts: ['chain-of-responsibility', 'decorator-pattern', 'aspect-oriented-programming'],
    languages: ['typescript'],
    difficulty: 'beginner',
  },

  'repository-pattern': {
    id: 'repository-pattern',
    name: 'Repository Pattern',
    category: 'pattern',
    description: 'Abstract data access behind an interface to decouple business logic from database implementation.',
    explanation: 'The repository pattern provides a collection-like interface for accessing domain objects. It encapsulates the logic for querying, creating, updating, and deleting records behind methods like findById(), findAll(), create(), update(). Business logic works with repositories instead of directly with the ORM/database, making it easier to test (mock the repository) and switch data sources.',
    examples: [
      'UserRepository with findByEmail(), create(), updateProfile() methods',
      'OrderRepository abstracting complex JOIN queries behind simple methods',
      'In-memory repository implementation for unit tests',
      'Caching repository decorator that wraps a database repository',
    ],
    relatedConcepts: ['dependency-injection', 'unit-of-work', 'data-mapper', 'active-record'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'feature-flags': {
    id: 'feature-flags',
    name: 'Feature Flags / Feature Toggles',
    category: 'architecture',
    description: 'Runtime toggles that enable or disable features without deploying new code.',
    explanation: 'Feature flags decouple deployment from feature release. Code for new features is deployed but hidden behind flags that can be toggled per user, percentage, or environment. This enables trunk-based development, A/B testing, gradual rollouts, and instant rollback. Flags can be simple booleans or complex rules based on user attributes, geography, or subscription tier.',
    examples: [
      'Gradual rollout: new checkout flow to 10% of users, then 50%, then 100%',
      'Beta features available only to opted-in users',
      'Kill switch for a feature causing production issues',
      'A/B testing different UI variations',
      'Subscription tier gating (premium features behind flags)',
    ],
    relatedConcepts: ['trunk-based-development', 'canary-deployment', 'ab-testing', 'progressive-delivery'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'dto-pattern': {
    id: 'dto-pattern',
    name: 'Data Transfer Object (DTO)',
    category: 'pattern',
    description: 'Typed objects that define the shape of data crossing boundaries (API requests/responses, service calls).',
    explanation: 'DTOs define explicit contracts for data that crosses architectural boundaries. Instead of passing raw database entities to API responses (which leaks internal structure), DTOs shape what the consumer sees. Combined with validation (Zod, class-validator), DTOs also enforce input validation. They prevent over-fetching, under-fetching, and accidental data exposure.',
    examples: [
      'CreateUserDTO with validated email, name, password fields',
      'UserResponseDTO that excludes passwordHash and internal flags',
      'PaginatedResponseDTO<T> with items, total, page, pageSize',
      'Zod schemas as runtime-validated DTOs in TypeScript',
    ],
    relatedConcepts: ['validation', 'serialization', 'api-design', 'domain-model'],
    languages: ['typescript'],
    difficulty: 'beginner',
  },

  'circuit-breaker': {
    id: 'circuit-breaker',
    name: 'Circuit Breaker Pattern',
    category: 'architecture',
    description: 'Prevent cascading failures by automatically stopping calls to a failing service.',
    explanation: 'The circuit breaker monitors calls to an external service. When failures exceed a threshold, it "opens" the circuit and immediately returns errors without calling the service (fast fail). After a timeout, it enters "half-open" state and allows a test request. If it succeeds, the circuit closes; if it fails, it opens again. This prevents cascade failures when downstream services are unhealthy.',
    examples: [
      'Payment gateway circuit breaker that falls back to queuing',
      'Third-party API calls with fallback to cached data',
      'Microservice communication with circuit breaker and retry',
      'Database connection circuit breaker during outages',
    ],
    relatedConcepts: ['retry-pattern', 'bulkhead-pattern', 'timeout-pattern', 'fallback-pattern'],
    languages: ['typescript'],
    difficulty: 'advanced',
  },

  'cqrs': {
    id: 'cqrs',
    name: 'CQRS — Command Query Responsibility Segregation',
    category: 'architecture',
    description: 'Separate read and write models to optimize each independently.',
    explanation: 'CQRS separates the write model (commands that change state) from the read model (queries that return data). Each can use different data stores, schemas, and scaling strategies. Write operations go through a command handler with validation and business rules. Read operations use denormalized views optimized for query patterns. This is especially powerful with event sourcing.',
    examples: [
      'E-commerce: writes to normalized PostgreSQL, reads from denormalized materialized views',
      'Event-sourced system with event store for writes and projections for reads',
      'Separate read replicas for queries, primary for writes',
      'API with distinct command endpoints (POST/PUT/DELETE) and query endpoints (GET)',
    ],
    relatedConcepts: ['event-sourcing', 'domain-driven-design', 'eventual-consistency', 'materialized-views'],
    languages: ['typescript'],
    difficulty: 'advanced',
  },

  'dependency-injection': {
    id: 'dependency-injection',
    name: 'Dependency Injection',
    category: 'pattern',
    description: 'Provide dependencies from outside rather than creating them internally, enabling testability and flexibility.',
    explanation: 'Dependency injection inverts the control of creating dependencies. Instead of a class creating its database connection or logger, these are provided (injected) from outside — typically through constructor parameters. This makes code testable (inject mocks), configurable (swap implementations), and loosely coupled. In TypeScript, DI can be manual (constructor injection) or framework-driven (tsyringe, InversifyJS).',
    examples: [
      'Constructor injection: UserService receives UserRepository as constructor param',
      'Manual DI container that wires up all dependencies at app startup',
      'Test setup that injects mock repositories into services',
      'NestJS-style decorators for automatic DI container resolution',
    ],
    relatedConcepts: ['inversion-of-control', 'repository-pattern', 'service-layer', 'solid-principles'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'rate-limiting-strategies': {
    id: 'rate-limiting-strategies',
    name: 'Rate Limiting Strategies',
    category: 'security',
    description: 'Control request frequency to protect APIs from abuse, DDoS, and resource exhaustion.',
    explanation: 'Rate limiting restricts how many requests a client can make in a given time window. Common algorithms include fixed window (simple counter per time window), sliding window (smoother distribution), token bucket (allows bursts), and leaky bucket (constant rate). Rate limits can be applied per IP, per API key, per user, or per endpoint. Responses include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset).',
    examples: [
      'Login endpoint: 5 attempts per minute per IP',
      'API tier: Free = 100 req/hour, Pro = 1000 req/hour, Enterprise = 10000 req/hour',
      'File upload: 10 uploads per hour per user',
      'Search endpoint: 30 requests per minute with sliding window',
    ],
    relatedConcepts: ['api-security', 'throttling', 'ddos-protection', 'token-bucket'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'database-migration-strategies': {
    id: 'database-migration-strategies',
    name: 'Database Migration Strategies',
    category: 'database',
    description: 'Evolve database schemas safely with versioned, reversible migration scripts.',
    explanation: 'Database migrations are versioned scripts that modify schema (tables, columns, indexes) in a controlled, repeatable way. Each migration has an up (apply) and down (rollback) function. Migrations run in sequence and their state is tracked in a migrations table. Modern ORMs (Drizzle, Prisma, TypeORM) generate migrations from schema diffs. Zero-downtime migrations require careful ordering: add column → backfill → add constraint → update code → remove old column.',
    examples: [
      'Adding a new nullable column with default value (no lock)',
      'Renaming a column with a view-based migration for backward compatibility',
      'Adding an index CONCURRENTLY to avoid table locks',
      'Data backfill migration for populating new computed columns',
    ],
    relatedConcepts: ['schema-evolution', 'zero-downtime-deployment', 'blue-green-deployment'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'api-pagination': {
    id: 'api-pagination',
    name: 'API Pagination Patterns',
    category: 'architecture',
    description: 'Efficiently return large datasets in manageable chunks with cursor or offset-based pagination.',
    explanation: 'Pagination prevents returning unbounded result sets that consume excessive memory and bandwidth. Offset-based pagination (page + pageSize) is simple but becomes slow on large datasets (OFFSET scans rows). Cursor-based pagination (after + limit) uses an indexed column as a cursor, providing consistent performance regardless of dataset size. Keyset pagination is the most performant for large datasets.',
    examples: [
      'Offset: GET /users?page=3&pageSize=25 → OFFSET 50 LIMIT 25',
      'Cursor: GET /users?after=abc123&limit=25 → WHERE id > cursor LIMIT 25',
      'Relay-style: { edges: [], pageInfo: { hasNextPage, endCursor } }',
      'Infinite scroll with cursor-based pagination and React Query',
    ],
    relatedConcepts: ['database-indexing', 'query-optimization', 'graphql-connections'],
    languages: ['typescript'],
    difficulty: 'beginner',
  },

  'state-management-patterns': {
    id: 'state-management-patterns',
    name: 'State Management Patterns',
    category: 'react',
    description: 'Organize and manage application state at different scopes (local, global, server, URL).',
    explanation: 'Modern React apps distinguish four types of state: UI state (local component state with useState), global client state (shared across components — Zustand, Jotai), server state (cached API data — React Query, SWR), and URL state (search params, route params). Each type has different tools and patterns. Mixing these (e.g., storing server data in Redux) creates complexity and bugs.',
    examples: [
      'Local: useState for form fields, modals, toggles',
      'Global: Zustand store for theme, sidebar collapsed, user preferences',
      'Server: React Query for API data with caching and revalidation',
      'URL: useSearchParams for filters, sorting, pagination state',
    ],
    relatedConcepts: ['react-hooks', 'flux-architecture', 'redux', 'context-api'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'error-handling-strategies': {
    id: 'error-handling-strategies',
    name: 'Error Handling Strategies',
    category: 'architecture',
    description: 'Structured approach to catching, classifying, reporting, and recovering from errors.',
    explanation: 'Effective error handling classifies errors (validation, authentication, authorization, not found, server error), formats them consistently for API consumers, logs them with context for debugging, and reports critical ones to monitoring services. Custom error classes enable typed error handling. Global error middleware catches unhandled errors. Client-side error boundaries prevent UI crashes.',
    examples: [
      'Custom error hierarchy: AppError → ValidationError, NotFoundError, AuthError',
      'Express global error handler that formats errors as { code, message, details }',
      'React error boundary with fallback UI and Sentry reporting',
      'Retry logic with exponential backoff for transient errors',
    ],
    relatedConcepts: ['circuit-breaker', 'retry-pattern', 'logging', 'monitoring'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'file-upload-handling': {
    id: 'file-upload-handling',
    name: 'File Upload Handling',
    category: 'architecture',
    description: 'Secure, scalable file upload with validation, storage, and processing pipelines.',
    explanation: 'File upload involves client-side validation (type, size), server-side validation (MIME type verification, virus scanning), storage (local filesystem, S3, Cloudflare R2), and optional processing (image resizing, thumbnail generation). Direct-to-S3 uploads with presigned URLs offload bandwidth from the server. Multipart uploads handle large files. File metadata (name, size, type, URL) is stored in the database.',
    examples: [
      'Avatar upload with client-side preview and server-side resize',
      'Document upload with type validation and virus scanning',
      'Presigned URL upload direct to S3 bypassing the server',
      'Multi-file upload with progress tracking and drag-and-drop',
    ],
    relatedConcepts: ['object-storage', 'image-processing', 'presigned-urls', 'multipart-upload'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'webhook-design': {
    id: 'webhook-design',
    name: 'Webhook Design',
    category: 'architecture',
    description: 'Push-based integration pattern where your system notifies external services of events.',
    explanation: 'Webhooks send HTTP POST requests to registered callback URLs when events occur. Good webhook design includes: payload signing (HMAC) for verification, retry with exponential backoff on failure, event type filtering, idempotency keys to prevent duplicate processing, and a delivery log for debugging. Receiving webhooks requires signature verification, idempotent processing, and fast acknowledgment (return 200, process async).',
    examples: [
      'Stripe webhook for payment.succeeded, invoice.paid events',
      'GitHub webhook for push, pull_request events triggering CI/CD',
      'Custom webhook system with registration, delivery, and retry',
      'Webhook signature verification with HMAC-SHA256',
    ],
    relatedConcepts: ['event-driven-architecture', 'pub-sub', 'api-design', 'idempotency'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },

  'search-implementation': {
    id: 'search-implementation',
    name: 'Search Implementation',
    category: 'architecture',
    description: 'Full-text search, filtering, and autocomplete for application data.',
    explanation: 'Search ranges from simple SQL LIKE queries to full-text search with PostgreSQL tsvector/tsquery or dedicated engines (Elasticsearch, Meilisearch, Typesense). Implementation includes: text indexing, relevance ranking, typo tolerance, faceted filtering, highlighting, and autocomplete/suggestions. For most applications, PostgreSQL full-text search is sufficient and avoids adding another service.',
    examples: [
      'PostgreSQL full-text search with tsvector and GIN index',
      'Autocomplete with debounced input and fuzzy matching',
      'Faceted search with category counts and price ranges',
      'Search-as-you-type with Meilisearch or Typesense',
    ],
    relatedConcepts: ['database-indexing', 'fuzzy-matching', 'elasticsearch', 'inverted-index'],
    languages: ['typescript'],
    difficulty: 'intermediate',
  },
};

// ── EXPANDED CODE SNIPPETS — PART 10 ────────────────────────────────────

export const EXPANDED_CODE_SNIPPETS_10: Record<string, CodeSnippet> = {

  'websocket-server': {
    id: 'websocket-server',
    title: 'WebSocket Server with Room Management',
    description: 'Production-ready WebSocket server using ws library with room support, heartbeat, and reconnection handling.',
    tech: ['typescript', 'ws', 'node'],
    tags: ['websocket', 'real-time', 'rooms', 'heartbeat'],
    code: `import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuid } from 'uuid';

interface Client {
  id: string;
  ws: WebSocket;
  rooms: Set<string>;
  isAlive: boolean;
  userId?: string;
}

class WsServer {
  private wss: WebSocketServer;
  private clients = new Map<string, Client>();
  private rooms = new Map<string, Set<string>>();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', this.handleConnection.bind(this));

    setInterval(() => this.heartbeat(), 30_000);
    console.log(\`WebSocket server running on port \${port}\`);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const clientId = uuid();
    const client: Client = { id: clientId, ws, rooms: new Set(), isAlive: true };
    this.clients.set(clientId, client);

    ws.on('pong', () => { client.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(client, msg);
      } catch (e) {
        this.send(client, { type: 'error', message: 'Invalid JSON' });
      }
    });

    ws.on('close', () => {
      client.rooms.forEach(room => this.leaveRoom(client, room));
      this.clients.delete(clientId);
    });

    this.send(client, { type: 'connected', clientId });
  }

  private handleMessage(client: Client, msg: any) {
    switch (msg.type) {
      case 'join':
        this.joinRoom(client, msg.room);
        break;
      case 'leave':
        this.leaveRoom(client, msg.room);
        break;
      case 'broadcast':
        this.broadcastToRoom(msg.room, { type: 'message', from: client.id, data: msg.data }, client.id);
        break;
    }
  }

  private joinRoom(client: Client, room: string) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(client.id);
    client.rooms.add(room);
    this.broadcastToRoom(room, { type: 'user-joined', clientId: client.id, room });
  }

  private leaveRoom(client: Client, room: string) {
    this.rooms.get(room)?.delete(client.id);
    client.rooms.delete(room);
    if (this.rooms.get(room)?.size === 0) this.rooms.delete(room);
    this.broadcastToRoom(room, { type: 'user-left', clientId: client.id, room });
  }

  private broadcastToRoom(room: string, data: any, excludeId?: string) {
    const members = this.rooms.get(room);
    if (!members) return;
    const payload = JSON.stringify(data);
    for (const id of members) {
      if (id === excludeId) continue;
      const client = this.clients.get(id);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  private send(client: Client, data: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  private heartbeat() {
    for (const [id, client] of this.clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        this.clients.delete(id);
        continue;
      }
      client.isAlive = false;
      client.ws.ping();
    }
  }
}`,
  },

  'zod-validation-middleware': {
    id: 'zod-validation-middleware',
    title: 'Zod Validation Middleware for Express',
    description: 'Type-safe request validation middleware using Zod schemas for body, query, and params.',
    tech: ['typescript', 'express', 'zod'],
    tags: ['validation', 'middleware', 'type-safety', 'api'],
    code: `import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> extends Request {
  validatedBody: TBody;
  validatedQuery: TQuery;
  validatedParams: TParams;
}

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ location: string; issues: z.ZodIssue[] }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) errors.push({ location: 'body', issues: result.error.issues });
      else (req as any).validatedBody = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) errors.push({ location: 'query', issues: result.error.issues });
      else (req as any).validatedQuery = result.data;
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) errors.push({ location: 'params', issues: result.error.issues });
      else (req as any).validatedParams = result.data;
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.map(e => ({
          location: e.location,
          issues: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
        })),
      });
    }

    next();
  };
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  role: z.enum(['user', 'admin']).default('user'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Usage:
// router.post('/users', validate({ body: createUserSchema }), createUser);
// router.get('/users', validate({ query: paginationSchema }), listUsers);
// router.get('/users/:id', validate({ params: idParamSchema }), getUser);`,
  },

  'react-optimistic-updates': {
    id: 'react-optimistic-updates',
    title: 'React Query Optimistic Updates Pattern',
    description: 'Instant UI updates with automatic rollback on server failure using React Query mutations.',
    tech: ['typescript', 'react', 'react-query'],
    tags: ['optimistic-update', 'react-query', 'mutation', 'ux'],
    code: `import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: async (): Promise<Todo[]> => {
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
}

function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todo: Todo) => {
      const res = await fetch(\`/api/todos/\${todo.id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },

    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueryData<Todo[]>(['todos']);

      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t) ?? []
      );

      return { previous };
    },

    onError: (_err, _todo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(\`/api/todos/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueryData<Todo[]>(['todos']);

      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.filter(t => t.id !== id) ?? []
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}`,
  },

  'presigned-url-upload': {
    id: 'presigned-url-upload',
    title: 'S3 Presigned URL File Upload',
    description: 'Secure direct-to-S3 file upload using presigned URLs to avoid server bandwidth bottleneck.',
    tech: ['typescript', 'aws-sdk', 'express'],
    tags: ['file-upload', 's3', 'presigned-url', 'cloud-storage'],
    code: `import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const router = Router();

router.post('/upload-url', async (req, res) => {
  const { fileName, contentType, fileSize } = req.body;

  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'File type not allowed' });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File too large (max 10MB)' });
  }

  const key = \`uploads/\${uuid()}/\${fileName}\`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  const downloadCommand = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const downloadUrl = await getSignedUrl(s3, downloadCommand, { expiresIn: 3600 });

  res.json({ uploadUrl, downloadUrl, key });
});

// Client-side usage:
// 1. POST /upload-url with file metadata
// 2. PUT to the returned uploadUrl with the file binary
// 3. Store the key in your database

export default router;`,
  },

  'drizzle-pagination-helper': {
    id: 'drizzle-pagination-helper',
    title: 'Drizzle ORM Pagination Helper',
    description: 'Reusable pagination utility for Drizzle ORM with offset and cursor-based options.',
    tech: ['typescript', 'drizzle-orm'],
    tags: ['pagination', 'drizzle', 'database', 'utility'],
    code: `import { SQL, sql, and, gt, lt, asc, desc } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';

interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string | number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CursorResult<T> {
  items: T[];
  nextCursor: string | number | null;
  hasMore: boolean;
}

async function paginateOffset<T>(
  db: any,
  table: PgTable,
  params: PaginationParams,
  where?: SQL,
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const [items, countResult] = await Promise.all([
    db.select().from(table).where(where).limit(pageSize).offset(offset),
    db.select({ count: sql<number>\`count(*)\` }).from(table).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  return {
    items: items as T[],
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

async function paginateCursor<T>(
  db: any,
  table: PgTable,
  idColumn: PgColumn,
  params: { cursor?: string | number; limit?: number; direction?: 'forward' | 'backward' },
  where?: SQL,
): Promise<CursorResult<T>> {
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const conditions: SQL[] = where ? [where] : [];

  if (params.cursor) {
    conditions.push(
      params.direction === 'backward'
        ? lt(idColumn, params.cursor)
        : gt(idColumn, params.cursor)
    );
  }

  const items = await db
    .select()
    .from(table)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(params.direction === 'backward' ? desc(idColumn) : asc(idColumn))
    .limit(limit + 1);

  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems as T[],
    nextCursor: hasMore && lastItem ? (lastItem as any)[idColumn.name] : null,
    hasMore,
  };
}

export { paginateOffset, paginateCursor };`,
  },

  'react-form-hook-pattern': {
    id: 'react-form-hook-pattern',
    title: 'React Hook Form with Zod Validation',
    description: 'Type-safe form handling with React Hook Form and Zod schema validation.',
    tech: ['typescript', 'react', 'react-hook-form', 'zod'],
    tags: ['form', 'validation', 'react-hook-form', 'zod', 'ui'],
    code: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.enum(['general', 'support', 'sales', 'feedback'], {
    errorMap: () => ({ message: 'Please select a subject' }),
  }),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
  newsletter: z.boolean().default(false),
});

type ContactFormData = z.infer<typeof contactSchema>;

function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { newsletter: false },
  });

  const onSubmit = async (data: ContactFormData) => {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Submit failed');
    reset();
  };

  if (isSubmitSuccessful) {
    return <div className="text-green-600">Thank you! We will get back to you soon.</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        {errors.name && <span className="text-red-500">{errors.name.message}</span>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <span className="text-red-500">{errors.email.message}</span>}
      </div>
      <div>
        <label htmlFor="subject">Subject</label>
        <select id="subject" {...register('subject')}>
          <option value="">Select...</option>
          <option value="general">General</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="feedback">Feedback</option>
        </select>
        {errors.subject && <span className="text-red-500">{errors.subject.message}</span>}
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" rows={5} {...register('message')} />
        {errors.message && <span className="text-red-500">{errors.message.message}</span>}
      </div>
      <div>
        <label>
          <input type="checkbox" {...register('newsletter')} />
          Subscribe to newsletter
        </label>
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}`,
  },
};

// ── EXPANDED ENTITY ARCHETYPES — PART 10 ────────────────────────────────

export const EXPANDED_ENTITY_ARCHETYPES_10: Record<string, EntityArchetype> = {

  webhook: {
    id: 'webhook',
    name: 'Webhook',
    aliases: ['callback url', 'webhook endpoint', 'event subscription'],
    domain: 'system',
    description: 'Registered callback URL that receives event notifications via HTTP POST.',
    traits: ['pageable', 'auditable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'url', type: 'varchar(500) not null', nullable: false, description: 'Callback URL' },
      { name: 'events', type: 'text[] not null', nullable: false, description: 'Event types to receive' },
      { name: 'secret', type: 'varchar(100) not null', nullable: false, description: 'HMAC signing secret' },
      { name: 'isActive', type: 'boolean not null default true', nullable: false, description: 'Enabled flag' },
      { name: 'organizationId', type: 'integer not null references organizations(id)', nullable: false, description: 'Owner org' },
      { name: 'description', type: 'varchar(200)', nullable: true, description: 'User description' },
      { name: 'lastDeliveredAt', type: 'timestamptz', nullable: true, description: 'Last successful delivery' },
      { name: 'failureCount', type: 'integer not null default 0', nullable: false, description: 'Consecutive failures' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['organization', 'webhook-delivery', 'event'],
    suggestedIndexes: ['organizationId', 'isActive', '(organizationId, isActive)'],
    typicalEndpoints: ['GET /webhooks', 'GET /webhooks/:id', 'POST /webhooks', 'PUT /webhooks/:id', 'DELETE /webhooks/:id'],
  },

  api_key: {
    id: 'api-key',
    name: 'ApiKey',
    aliases: ['access key', 'developer key', 'api token'],
    domain: 'system',
    description: 'API key for programmatic access with scope restrictions and usage tracking.',
    traits: ['pageable', 'auditable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Key display name' },
      { name: 'keyHash', type: 'varchar(128) not null', nullable: false, description: 'SHA-256 hash of the key' },
      { name: 'keyPrefix', type: 'varchar(10) not null', nullable: false, description: 'First chars for identification' },
      { name: 'scopes', type: 'text[] not null', nullable: false, description: 'Permitted API scopes' },
      { name: 'organizationId', type: 'integer not null references organizations(id)', nullable: false, description: 'Owner org' },
      { name: 'createdById', type: 'integer not null references users(id)', nullable: false, description: 'Creator' },
      { name: 'lastUsedAt', type: 'timestamptz', nullable: true, description: 'Last API call' },
      { name: 'expiresAt', type: 'timestamptz', nullable: true, description: 'Expiration date' },
      { name: 'isActive', type: 'boolean not null default true', nullable: false, description: 'Active flag' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['organization', 'user'],
    suggestedIndexes: ['keyHash', 'organizationId', '(organizationId, isActive)'],
    typicalEndpoints: ['GET /api-keys', 'POST /api-keys', 'DELETE /api-keys/:id'],
  },

  media_asset: {
    id: 'media-asset',
    name: 'MediaAsset',
    aliases: ['file', 'attachment', 'upload', 'media file', 'image'],
    domain: 'system',
    description: 'Uploaded file with metadata, storage URL, and optional processing variants.',
    traits: ['pageable', 'searchable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'fileName', type: 'varchar(255) not null', nullable: false, description: 'Original file name' },
      { name: 'mimeType', type: 'varchar(100) not null', nullable: false, description: 'MIME type' },
      { name: 'fileSize', type: 'integer not null', nullable: false, description: 'Size in bytes' },
      { name: 'storageKey', type: 'varchar(500) not null', nullable: false, description: 'S3/storage key' },
      { name: 'url', type: 'varchar(500) not null', nullable: false, description: 'Public access URL' },
      { name: 'thumbnailUrl', type: 'varchar(500)', nullable: true, description: 'Thumbnail variant URL' },
      { name: 'altText', type: 'varchar(300)', nullable: true, description: 'Accessibility alt text' },
      { name: 'uploadedById', type: 'integer not null references users(id)', nullable: false, description: 'Uploader' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Searchable tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Upload timestamp' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['uploadedById', 'mimeType', 'createdAt'],
    typicalEndpoints: ['GET /media', 'GET /media/:id', 'POST /media/upload', 'DELETE /media/:id'],
  },
};

// ── EXPANDED ANTI-PATTERNS — PART 10 ────────────────────────────────────

export const EXPANDED_ANTI_PATTERNS_10: AntiPattern[] = [
  {
    id: 'god-component',
    name: 'God Component',
    description: 'A single React component that handles too many responsibilities — data fetching, business logic, and rendering.',
    whyBad: 'Becomes impossible to test, reuse, or modify without breaking unrelated functionality. Violates Single Responsibility Principle.',
    severity: 'high',
    badExample: `function DashboardPage() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  // 500+ lines of data fetching, event handlers, and JSX
}`,
    goodExample: `function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatsOverview />
      <RecentOrders limit={10} />
      <ActiveUsers />
    </div>
  );
}`,
    fix: 'Break into focused components, each with a single responsibility. Extract data fetching into custom hooks. Use composition.',
    tags: ['react', 'architecture', 'srp'],
  },
  {
    id: 'unvalidated-env-vars',
    name: 'Unvalidated Environment Variables',
    description: 'Reading process.env values without validation, leading to runtime crashes when variables are missing.',
    whyBad: 'Missing or malformed env vars cause cryptic runtime errors deep in the application instead of clear startup failures.',
    severity: 'high',
    badExample: `const db = new Pool({
  connectionString: process.env.DATABASE_URL, // crashes later if undefined
});
const port = parseInt(process.env.PORT); // NaN if missing`,
    goodExample: `import { z } from 'zod';
const env = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
}).parse(process.env); // Fails immediately with clear error`,
    fix: 'Validate all environment variables at application startup using Zod or similar. Fail fast with descriptive error messages.',
    tags: ['configuration', 'validation', 'reliability'],
  },
  {
    id: 'sequential-independent-queries',
    name: 'Sequential Independent Queries',
    description: 'Running independent database queries one after another instead of in parallel.',
    whyBad: 'Total latency is the sum of all query times instead of the maximum. A page with 5 independent 50ms queries takes 250ms instead of 50ms.',
    severity: 'medium',
    badExample: `const users = await db.query.users.findMany();
const orders = await db.query.orders.findMany();
const stats = await db.select().from(statsView);
// Total: ~150ms (50 + 50 + 50)`,
    goodExample: `const [users, orders, stats] = await Promise.all([
  db.query.users.findMany(),
  db.query.orders.findMany(),
  db.select().from(statsView),
]);
// Total: ~50ms (parallel)`,
    fix: 'Use Promise.all() for independent async operations. Only use sequential execution when queries depend on each other.',
    tags: ['performance', 'database', 'async'],
  },
];

// ── EXPANDED BEST PRACTICES — PART 10 ───────────────────────────────────

export const EXPANDED_BEST_PRACTICES_10: BestPractice[] = [
  {
    id: 'logging-strategy',
    title: 'Structured Logging Strategy',
    category: 'devops',
    description: 'Structured JSON logging with levels, context, and correlation IDs for production debugging.',
    do: [
      'Use structured JSON logs (not console.log strings)',
      'Include request ID / correlation ID in all log entries',
      'Use appropriate log levels: error, warn, info, debug',
      'Log at service boundaries: incoming requests, outgoing calls, responses',
      'Include relevant context: userId, requestId, endpoint, duration',
      'Avoid logging sensitive data: passwords, tokens, PII',
      'Use a logging library (pino, winston) instead of console.log',
    ],
    dont: [
      'Use console.log in production code',
      'Log sensitive data (passwords, tokens, credit cards)',
      'Log at incorrect levels (ERROR for expected conditions)',
      'Skip request correlation IDs in distributed systems',
    ],
    languages: ['typescript'],
  },
  {
    id: 'api-response-format',
    title: 'Consistent API Response Format',
    category: 'api',
    description: 'Standardize all API responses with consistent envelope format for success and error cases.',
    do: [
      'Use consistent envelope: { data, error, meta } for all responses',
      'Include pagination metadata in list responses',
      'Use standard HTTP status codes correctly',
      'Return meaningful error messages with error codes',
      'Include request ID in all responses for debugging',
      'Document response format in API specification',
    ],
    dont: [
      'Mix response formats across endpoints',
      'Return 200 for error conditions with error in body',
      'Expose internal error details or stack traces to clients',
      'Use non-standard status codes',
    ],
    languages: ['typescript'],
  },
  {
    id: 'testing-strategy',
    title: 'Testing Pyramid Strategy',
    category: 'testing',
    description: 'Balance unit, integration, and E2E tests for comprehensive coverage with fast feedback.',
    do: [
      'Follow the testing pyramid: many unit tests, fewer integration, fewest E2E',
      'Test behavior, not implementation details',
      'Use factory functions for test data instead of hardcoded fixtures',
      'Run unit tests on every commit, integration tests in CI',
      'Test error paths and edge cases, not just happy paths',
      'Keep tests independent — no shared mutable state between tests',
      'Use meaningful test names that describe the expected behavior',
    ],
    dont: [
      'Write tests that depend on execution order',
      'Mock everything in integration tests',
      'Skip error case testing',
      'Write tests that pass even when the feature is broken',
    ],
    languages: ['typescript'],
  },
  {
    id: 'graceful-shutdown',
    title: 'Graceful Server Shutdown',
    category: 'devops',
    description: 'Handle process termination signals to cleanly close connections and finish in-flight requests.',
    do: [
      'Listen for SIGTERM and SIGINT signals',
      'Stop accepting new connections on signal',
      'Wait for in-flight requests to complete (with timeout)',
      'Close database connection pools gracefully',
      'Close WebSocket connections with close frame',
      'Flush logs and metrics before exit',
      'Set a maximum shutdown timeout to prevent hanging',
    ],
    dont: [
      'Call process.exit() immediately on signal',
      'Leave database connections open on shutdown',
      'Ignore in-flight requests during shutdown',
      'Set no timeout — risk hanging forever',
    ],
    languages: ['typescript'],
  },
  {
    id: 'database-connection-management',
    title: 'Database Connection Management',
    category: 'database',
    description: 'Configure and manage database connection pools for reliable, performant data access.',
    do: [
      'Use connection pooling (pg Pool, Drizzle pool mode)',
      'Set appropriate pool size (2-4x CPU cores for Node.js)',
      'Configure idle timeout to release unused connections',
      'Set connection timeout to fail fast on overload',
      'Monitor pool stats (active, idle, waiting connections)',
      'Use SSL/TLS for database connections in production',
      'Implement health check queries for connection validation',
    ],
    dont: [
      'Create a new connection per request without pooling',
      'Set pool size too high (causes database connection exhaustion)',
      'Leave connections open indefinitely without idle timeout',
      'Skip SSL for production database connections',
    ],
    languages: ['typescript', 'sql'],
  },
  {
    id: 'typescript-strict-mode',
    title: 'TypeScript Strict Mode Configuration',
    category: 'typescript',
    description: 'Enable and configure TypeScript strict mode for maximum type safety and fewer runtime errors.',
    do: [
      'Enable strict: true in tsconfig.json for all new projects',
      'Use strictNullChecks to catch null/undefined errors at compile time',
      'Enable noUncheckedIndexedAccess for safe array/object access',
      'Use unknown instead of any for truly unknown types',
      'Define explicit return types for public API functions',
      'Use branded types for domain-specific values (UserId, Email)',
    ],
    dont: [
      'Disable strict mode to fix compilation errors',
      'Use any to bypass type checking',
      'Use non-null assertion (!) without genuine certainty',
      'Suppress TypeScript errors with @ts-ignore without explanation',
    ],
    languages: ['typescript'],
  },
];
