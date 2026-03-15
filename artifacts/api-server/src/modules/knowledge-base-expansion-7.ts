import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 7
// WebSocket, OAuth, Role-Based Access Control (RBAC),
// Data Validation Patterns, Error Handling Strategies,
// Database Indexing, Soft Deletes, Cursor Pagination
// ============================================

export const EXPANDED_CONCEPTS_7: Record<string, Concept> = {

  websocket_patterns: {
    id: 'websocket-patterns',
    name: 'WebSocket Communication Patterns',
    category: 'architecture',
    description: 'Bidirectional real-time communication for chat, collaboration, and live updates.',
    explanation: 'WebSockets maintain a persistent connection between client and server for bidirectional communication. Use cases: chat, collaborative editing, multiplayer games, live dashboards. For simpler one-way streaming (notifications, live feeds), prefer Server-Sent Events (SSE). WebSocket setup: (1) HTTP upgrade handshake. (2) Persistent bidirectional connection. (3) Message-based protocol (JSON or binary). (4) Heartbeat/ping to detect stale connections. Libraries: ws (Node.js server), native WebSocket API (browser).',
    examples: [
      `import { WebSocketServer, WebSocket } from 'ws';

interface WSClient {
  ws: WebSocket;
  userId: number;
  rooms: Set<string>;
}

const clients = new Map<number, WSClient>();

function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const token = new URL(req.url!, 'http://localhost').searchParams.get('token');
    const user = await verifyToken(token);
    if (!user) { ws.close(4001, 'Unauthorized'); return; }

    const client: WSClient = { ws, userId: user.id, rooms: new Set() };
    clients.set(user.id, client);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(client, msg);
      } catch { ws.send(JSON.stringify({ error: 'Invalid message format' })); }
    });

    ws.on('close', () => {
      clients.delete(user.id);
    });

    // Heartbeat
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30000);

    ws.on('close', () => clearInterval(pingInterval));

    ws.send(JSON.stringify({ type: 'connected', userId: user.id }));
  });
}

function handleMessage(client: WSClient, msg: { type: string; [key: string]: unknown }) {
  switch (msg.type) {
    case 'join_room':
      client.rooms.add(msg.room as string);
      break;
    case 'leave_room':
      client.rooms.delete(msg.room as string);
      break;
    case 'chat_message':
      broadcastToRoom(msg.room as string, {
        type: 'chat_message',
        senderId: client.userId,
        content: msg.content,
        timestamp: Date.now(),
      }, client.userId);
      break;
    case 'typing':
      broadcastToRoom(msg.room as string, {
        type: 'typing',
        userId: client.userId,
      }, client.userId);
      break;
  }
}

function broadcastToRoom(room: string, message: unknown, excludeUserId?: number) {
  const payload = JSON.stringify(message);
  for (const [userId, client] of clients) {
    if (userId === excludeUserId) continue;
    if (client.rooms.has(room) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function sendToUser(userId: number, message: unknown) {
  const client = clients.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

// React WebSocket hook
function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Map<string, Set<(data: unknown) => void>>());

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(() => { /* reconnect logic */ }, 3000);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const handlers = listenersRef.current.get(msg.type);
      if (handlers) handlers.forEach(h => h(msg));
    };

    return () => ws.close();
  }, [url]);

  const send = useCallback((type: string, data?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  const on = useCallback((type: string, handler: (data: unknown) => void) => {
    if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set());
    listenersRef.current.get(type)!.add(handler);
    return () => { listenersRef.current.get(type)?.delete(handler); };
  }, []);

  return { isConnected, send, on };
}`,
    ],
    relatedConcepts: ['server-sent-events', 'event-driven', 'rate-limiting'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  oauth_implementation: {
    id: 'oauth-implementation',
    name: 'OAuth 2.0 / Social Login',
    category: 'security',
    description: 'Implement social login (Google, GitHub) with OAuth 2.0 authorization code flow.',
    explanation: 'OAuth 2.0 Authorization Code Flow: (1) User clicks "Login with Google". (2) Redirect to Google with client_id, redirect_uri, scope. (3) User authorizes → Google redirects back with an authorization code. (4) Server exchanges code for access token (server-to-server). (5) Server uses access token to fetch user profile from Google. (6) Create or link local user account. (7) Set session/JWT for the user. Important: NEVER expose client_secret to the frontend. Use PKCE for mobile/SPA apps.',
    examples: [
      `// Google OAuth 2.0 implementation
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = \`\${process.env.APP_URL}/api/auth/google/callback\`;

// Step 1: Redirect to Google
app.get('/api/auth/google', (req, res) => {
  const state = crypto.randomUUID();
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  res.redirect(\`https://accounts.google.com/o/oauth2/v2/auth?\${params}\`);
});

// Step 2: Handle callback
app.get('/api/auth/google/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  delete req.session.oauthState;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code as string,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) return res.status(400).json({ error: 'Token exchange failed' });

  // Fetch user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: \`Bearer \${tokens.access_token}\` },
  });
  const profile = await profileRes.json();

  // Find or create user
  let [user] = await db.select().from(users)
    .where(eq(users.googleId, profile.id)).limit(1);

  if (!user) {
    [user] = await db.insert(users).values({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      googleId: profile.id,
      emailVerified: true,
    }).returning();
  }

  // Set session
  req.session.userId = user.id;

  res.redirect('/dashboard');
}));`,
    ],
    relatedConcepts: ['auth-jwt', 'middleware-pattern', 'environment-config'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  rbac: {
    id: 'rbac',
    name: 'Role-Based Access Control (RBAC)',
    category: 'security',
    description: 'Control access to resources based on user roles and permissions.',
    explanation: 'RBAC assigns roles to users, and roles define what actions are allowed. Levels: (1) Simple — user has one role (admin, member, viewer). (2) Permission-based — roles map to granular permissions (tasks:create, tasks:delete, users:manage). (3) Resource-level — permissions scoped to specific resources (can edit only own tasks). Implementation: middleware that checks the user role/permissions before allowing the request through. Store roles in the database for flexibility.',
    examples: [
      `// Simple role checking
type Role = 'admin' | 'member' | 'viewer';

function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage:
app.delete('/api/users/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  await deleteUser(Number(req.params.id));
  res.status(204).send();
}));

// Permission-based RBAC
type Permission = 'tasks:read' | 'tasks:create' | 'tasks:update' | 'tasks:delete' |
                  'users:read' | 'users:manage' | 'billing:manage' | 'settings:manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'users:read', 'users:manage', 'billing:manage', 'settings:manage'],
  manager: ['tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'users:read'],
  member: ['tasks:read', 'tasks:create', 'tasks:update'],
  viewer: ['tasks:read', 'users:read'],
};

function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const userPermissions = ROLE_PERMISSIONS[req.user.role] ?? [];
    const hasAll = permissions.every(p => userPermissions.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions,
      });
    }
    next();
  };
}

// Usage:
app.post('/api/tasks', authenticate, requirePermission('tasks:create'), asyncHandler(async (req, res) => {
  const task = await createTask(req.body, req.user!.id);
  res.status(201).json(task);
}));

app.delete('/api/tasks/:id', authenticate, requirePermission('tasks:delete'), asyncHandler(async (req, res) => {
  await deleteTask(Number(req.params.id));
  res.status(204).send();
}));

// React: permission-based UI rendering
function usePermissions(): Permission[] {
  const { user } = useAuth();
  return useMemo(() => ROLE_PERMISSIONS[user?.role ?? ''] ?? [], [user?.role]);
}

function Can({ permission, children, fallback }: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const permissions = usePermissions();
  return permissions.includes(permission) ? <>{children}</> : <>{fallback}</>;
}

// Usage:
// <Can permission="tasks:delete">
//   <button onClick={handleDelete}>Delete</button>
// </Can>`,
    ],
    relatedConcepts: ['middleware-pattern', 'auth-jwt', 'multi-tenancy'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  soft_deletes: {
    id: 'soft-deletes',
    name: 'Soft Delete Pattern',
    category: 'database',
    description: 'Mark records as deleted instead of physically removing them from the database.',
    explanation: 'Soft deletes add a deletedAt timestamp column. Instead of DELETE, set deletedAt = now(). Benefits: (1) Undo/restore functionality. (2) Audit trail. (3) Referential integrity (no broken FK references). (4) Data recovery. Drawbacks: (1) Every query must filter WHERE deletedAt IS NULL. (2) Unique constraints need to include deletedAt. (3) Data grows indefinitely. Best practice: use a helper function that automatically adds the soft delete filter to all queries.',
    examples: [
      `// Schema with soft delete
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  ownerId: integer('owner_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete column
}, (t) => ({
  activeIdx: index('projects_active_idx').on(t.ownerId, t.deletedAt),
}));

// Helper: always filter out soft-deleted records
function notDeleted() {
  return isNull(projects.deletedAt);
}

// List (excludes deleted)
async function getProjects(userId: number) {
  return db.select().from(projects)
    .where(and(eq(projects.ownerId, userId), notDeleted()))
    .orderBy(desc(projects.createdAt));
}

// Soft delete
async function softDeleteProject(projectId: number, userId: number) {
  const [result] = await db.update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId), notDeleted()))
    .returning();
  if (!result) throw new NotFoundError('Project');
  return result;
}

// Restore
async function restoreProject(projectId: number, userId: number) {
  const [result] = await db.update(projects)
    .set({ deletedAt: null })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .returning();
  if (!result) throw new NotFoundError('Project');
  return result;
}

// Hard delete (admin only, after grace period)
async function hardDeleteProject(projectId: number) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

// API routes
app.delete('/api/projects/:id', authenticate, asyncHandler(async (req, res) => {
  await softDeleteProject(Number(req.params.id), req.user!.id);
  res.status(204).send();
}));

app.post('/api/projects/:id/restore', authenticate, asyncHandler(async (req, res) => {
  const project = await restoreProject(Number(req.params.id), req.user!.id);
  res.json(project);
}));`,
    ],
    relatedConcepts: ['database-transactions-advanced', 'audit-logging', 'cursor-pagination'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  database_indexing: {
    id: 'database-indexing',
    name: 'Database Indexing Strategies',
    category: 'database',
    description: 'Create effective indexes for fast queries without over-indexing.',
    explanation: 'Indexes speed up reads but slow down writes. Rules: (1) Index columns in WHERE, JOIN ON, and ORDER BY clauses. (2) Create composite indexes for multi-column queries (leftmost prefix rule). (3) Index foreign key columns (Drizzle doesn\'t auto-create FK indexes). (4) Use partial indexes for filtered queries (WHERE status = "active"). (5) Use GIN indexes for JSONB and array columns. (6) Use GiST for geographic/range queries. (7) Don\'t over-index — each index adds write overhead and storage.',
    examples: [
      `// Common indexing patterns with Drizzle
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  assigneeId: integer('assignee_id'),
  title: varchar('title', { length: 300 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('todo'),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  dueDate: varchar('due_date', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  // FK indexes (always index FK columns)
  projectIdx: index('tasks_project_idx').on(t.projectId),
  assigneeIdx: index('tasks_assignee_idx').on(t.assigneeId),

  // Composite index for the most common query:
  // SELECT * FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
  projectActiveIdx: index('tasks_project_active_idx').on(t.projectId, t.deletedAt, t.createdAt),

  // Composite index for filtering by status within a project:
  // SELECT * FROM tasks WHERE project_id = ? AND status = ? AND deleted_at IS NULL
  projectStatusIdx: index('tasks_project_status_idx').on(t.projectId, t.status, t.deletedAt),

  // Index for "my tasks" query:
  // SELECT * FROM tasks WHERE assignee_id = ? AND status != 'done' ORDER BY priority, due_date
  assigneeActiveIdx: index('tasks_assignee_active_idx').on(t.assigneeId, t.status),

  // Index for due date reminders:
  // SELECT * FROM tasks WHERE due_date = '2024-01-15' AND status != 'done'
  dueDateIdx: index('tasks_due_date_idx').on(t.dueDate, t.status),
}));

// When to create an index:
// 1. The query is slow (>100ms for <100K rows)
// 2. The column is used in WHERE, JOIN, or ORDER BY
// 3. The column has high cardinality (many unique values)

// When NOT to create an index:
// 1. Small tables (<1000 rows) — full table scan is fast enough
// 2. Columns with low cardinality (boolean, status with 3 values)
//    Exception: composite indexes that include low-cardinality columns
// 3. Write-heavy tables where read speed is less important
// 4. Columns that are rarely queried

// Check if index is being used:
// EXPLAIN ANALYZE SELECT * FROM tasks WHERE project_id = 1 AND deleted_at IS NULL;`,
    ],
    relatedConcepts: ['cursor-pagination', 'full-text-search', 'soft-deletes'],
    difficulty: 'advanced',
    languages: ['typescript', 'sql'],
  },

  cursor_pagination_advanced: {
    id: 'cursor-pagination-advanced',
    name: 'Advanced Cursor-Based Pagination',
    category: 'database',
    description: 'Efficient, stable pagination using cursor keys instead of offset — handles insertions/deletions gracefully.',
    explanation: 'Offset pagination (LIMIT 20 OFFSET 40) has problems: (1) Skips/duplicates when data is inserted or deleted between pages. (2) Slower on deep pages (OFFSET 10000 scans 10000 rows). Cursor pagination uses a pointer (usually the last seen ID or timestamp) to fetch the next page. Benefits: consistent results, O(1) for any page depth (with proper index). Downside: no "jump to page 5" — only next/previous.',
    examples: [
      `// Cursor-based pagination implementation
interface CursorPaginationParams {
  cursor?: string; // Encoded cursor
  limit?: number;
  direction?: 'forward' | 'backward';
}

interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

function encodeCursor(id: number, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, ts: createdAt.toISOString() })).toString('base64url');
}

function decodeCursor(cursor: string): { id: number; ts: string } {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}

async function paginateTasks(
  projectId: number,
  params: CursorPaginationParams,
): Promise<CursorPaginatedResult<Task>> {
  const limit = Math.min(params.limit ?? 20, 100);

  let query = db.select().from(tasks)
    .where(and(
      eq(tasks.projectId, projectId),
      isNull(tasks.deletedAt),
    ));

  if (params.cursor) {
    const { id, ts } = decodeCursor(params.cursor);
    const cursorDate = new Date(ts);

    if (params.direction === 'backward') {
      query = query.where(and(
        eq(tasks.projectId, projectId),
        isNull(tasks.deletedAt),
        or(
          gt(tasks.createdAt, cursorDate),
          and(eq(tasks.createdAt, cursorDate), gt(tasks.id, id)),
        ),
      ));
    } else {
      query = query.where(and(
        eq(tasks.projectId, projectId),
        isNull(tasks.deletedAt),
        or(
          lt(tasks.createdAt, cursorDate),
          and(eq(tasks.createdAt, cursorDate), lt(tasks.id, id)),
        ),
      ));
    }
  }

  const results = await query
    .orderBy(desc(tasks.createdAt), desc(tasks.id))
    .limit(limit + 1); // Fetch one extra to check hasMore

  const hasMore = results.length > limit;
  const data = results.slice(0, limit);

  return {
    data,
    nextCursor: data.length > 0
      ? encodeCursor(data[data.length - 1].id, data[data.length - 1].createdAt)
      : null,
    prevCursor: params.cursor
      ? encodeCursor(data[0]?.id ?? 0, data[0]?.createdAt ?? new Date())
      : null,
    hasMore,
  };
}

// API endpoint
app.get('/api/projects/:id/tasks', authenticate, asyncHandler(async (req, res) => {
  const result = await paginateTasks(
    Number(req.params.id),
    {
      cursor: req.query.cursor as string,
      limit: Number(req.query.limit) || 20,
      direction: (req.query.direction as 'forward' | 'backward') ?? 'forward',
    },
  );
  res.json(result);
}));

// React: infinite scroll with cursor pagination
function useInfiniteTaskList(projectId: number) {
  return useInfiniteQuery({
    queryKey: ['tasks', projectId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      const res = await fetch(\`/api/projects/\${projectId}/tasks?\${params}\`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json() as Promise<CursorPaginatedResult<Task>>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}`,
    ],
    relatedConcepts: ['database-indexing', 'rest-api-design', 'react-use-infinite-scroll'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  environment_config: {
    id: 'environment-config',
    name: 'Environment Configuration with Zod',
    category: 'deployment',
    description: 'Validate and type environment variables at startup using Zod for type safety and fail-fast behavior.',
    explanation: 'Environment variables are the primary way to configure applications across environments. Problems without validation: (1) Missing vars cause runtime crashes, not startup failures. (2) No type safety — everything is string | undefined. (3) No documentation of what env vars are needed. Solution: validate all env vars at startup with Zod. If any required var is missing, the app crashes immediately with a clear error message.',
    examples: [
      `import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email (optional in dev)
  RESEND_API_KEY: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // Feature flags
  ENABLE_REGISTRATION: z.coerce.boolean().default(true),
  ENABLE_SOCIAL_LOGIN: z.coerce.boolean().default(false),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    for (const issue of result.error.issues) {
      console.error(\`  \${issue.path.join('.')}: \${issue.message}\`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

// Usage:
// import { env } from './config';
// const server = app.listen(env.PORT, () => console.log(\`Server on port \${env.PORT}\`));
// const isProduction = env.NODE_ENV === 'production';`,
    ],
    relatedConcepts: ['graceful-shutdown', 'structured-logging', 'health-checks'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 7
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_7: Record<string, EntityArchetype> = {

  blog_post: {
    id: 'blog-post',
    name: 'Blog Post / Article',
    aliases: ['article', 'post', 'content', 'page'],
    domain: 'content',
    description: 'A blog post with title, content, author, categories, and SEO metadata.',
    traits: ['searchable', 'pageable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Post title' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'excerpt', type: 'varchar(500)', nullable: true, description: 'Short summary for previews' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Post body (HTML or Markdown)' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Featured image URL' },
      { name: 'authorId', type: 'integer not null references users(id)', nullable: false, description: 'Author' },
      { name: 'categoryId', type: 'integer references categories(id)', nullable: true, description: 'Post category' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Tag list' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|published|archived' },
      { name: 'readingTime', type: 'integer', nullable: true, description: 'Estimated reading time in minutes' },
      { name: 'viewCount', type: 'integer not null default 0', nullable: false, description: 'View counter' },
      { name: 'metaTitle', type: 'varchar(70)', nullable: true, description: 'SEO meta title' },
      { name: 'metaDescription', type: 'varchar(160)', nullable: true, description: 'SEO meta description' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publication date' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'comment', 'category', 'tag'],
    suggestedIndexes: ['slug (unique)', '(status, publishedAt DESC)', 'authorId', 'categoryId', 'Full-text on (title, content)'],
    typicalEndpoints: [
      'GET /posts?status=published&category=tech&page=1',
      'GET /posts/:slug',
      'POST /posts',
      'PATCH /posts/:id',
      'DELETE /posts/:id',
      'POST /posts/:id/publish',
    ],
  },

  team_member: {
    id: 'team-member',
    name: 'Team Member / Membership',
    aliases: ['member', 'org-member', 'workspace-member'],
    domain: 'saas',
    description: 'Join table linking users to organizations/workspaces with a role.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'organizationId', type: 'integer not null', nullable: false, description: 'Organization FK' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'User FK' },
      { name: 'role', type: "varchar(20) not null default 'member'", nullable: false, description: 'owner|admin|member|viewer' },
      { name: 'joinedAt', type: 'timestamptz not null default now()', nullable: false, description: 'When joined' },
      { name: 'invitedBy', type: 'integer references users(id)', nullable: true, description: 'Who invited this member' },
    ],
    relatedEntities: ['user', 'workspace'],
    suggestedIndexes: ['(organizationId, userId) unique', 'userId'],
    typicalEndpoints: [
      'GET /organizations/:id/members',
      'POST /organizations/:id/members',
      'PATCH /organizations/:id/members/:userId',
      'DELETE /organizations/:id/members/:userId',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 7
// ============================================

export const EXPANDED_DOMAIN_MODELS_7: Record<string, DomainModel> = {

  'fitness-wellness': {
    id: 'fitness-wellness',
    name: 'Fitness & Wellness Tracker',
    description: 'Personal fitness tracking with workouts, nutrition, goals, and progress analytics.',
    coreEntities: ['workout', 'exercise', 'workout_exercise', 'user'],
    optionalEntities: ['nutrition_log', 'goal', 'body_measurement', 'routine', 'achievement'],
    keyRelationships: [
      'workout belongs to user',
      'workout_exercise links workout to exercise with sets/reps/weight',
      'nutrition_log belongs to user with date',
      'goal belongs to user with target and current values',
      'routine belongs to user, contains ordered exercises',
    ],
    typicalFeatures: [
      'Workout logging with exercises, sets, reps, and weight',
      'Exercise library with categories (strength, cardio, flexibility)',
      'Pre-built workout routines',
      'Progress charts (weight lifted over time, personal records)',
      'Nutrition logging (calories, macros)',
      'Goal setting and tracking',
      'Body measurements over time',
      'Workout history and calendar view',
      'Rest timer between sets',
      'Achievement/badge system',
      'Export workout data',
    ],
    securityConsiderations: [
      'Health data is sensitive — strong access controls',
      'Users can only see their own data',
      'Data export for GDPR compliance',
    ],
    suggestedIndexStrategy: [
      'workouts: (userId, date DESC)',
      'workout_exercises: (workoutId)',
      'nutrition_logs: (userId, date)',
      'goals: (userId, status)',
    ],
  },

  'inventory-management': {
    id: 'inventory-management',
    name: 'Inventory / Warehouse Management',
    description: 'Track products, stock levels, suppliers, purchase orders, and warehouse locations.',
    coreEntities: ['product', 'stock_movement', 'warehouse', 'supplier'],
    optionalEntities: ['purchase_order', 'stock_alert', 'batch', 'category'],
    keyRelationships: [
      'product has stock quantities per warehouse',
      'stock_movement records every in/out movement with quantity and reason',
      'purchase_order belongs to supplier and contains order items',
      'stock_alert triggers when quantity falls below threshold',
    ],
    typicalFeatures: [
      'Product catalog with SKU, barcode, and categories',
      'Real-time stock levels per warehouse/location',
      'Stock movement history (received, sold, adjusted, transferred)',
      'Low stock alerts and reorder points',
      'Purchase order creation and tracking',
      'Supplier management',
      'Barcode/QR scanning for stock operations',
      'Multi-warehouse support with transfers',
      'Batch/lot tracking with expiry dates',
      'Inventory reports and analytics',
      'Stock take/audit functionality',
      'CSV import/export',
    ],
    securityConsiderations: [
      'Audit log for all stock movements',
      'Role-based access (warehouse staff, manager, admin)',
      'Prevent negative stock (enforce at database level)',
    ],
    suggestedIndexStrategy: [
      'products: sku (unique)',
      'products: (categoryId, status)',
      'stock_movements: (productId, createdAt DESC)',
      'stock_movements: (warehouseId, createdAt DESC)',
      'purchase_orders: (supplierId, status)',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 7
// ============================================

export const EXPANDED_CODE_SNIPPETS_7: CodeSnippet[] = [

  {
    id: 'drizzle-schema-fitness',
    title: 'Drizzle Schema: Fitness Tracker (Workouts, Exercises)',
    description: 'Schema for a fitness tracking app with workouts, exercises, sets, and progress.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'fitness', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, index } from 'drizzle-orm/pg-core';

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  category: varchar('category', { length: 30 }).notNull(),
  muscleGroup: varchar('muscle_group', { length: 50 }).notNull(),
  equipment: varchar('equipment', { length: 50 }),
  description: text('description'),
  instructions: text('instructions'),
  imageUrl: text('image_url'),
  isCustom: boolean('is_custom').notNull().default(false),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index('exercises_category_idx').on(t.category),
  muscleIdx: index('exercises_muscle_idx').on(t.muscleGroup),
}));

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  duration: integer('duration'),
  notes: text('notes'),
  caloriesBurned: integer('calories_burned'),
  status: varchar('status', { length: 20 }).notNull().default('completed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userDateIdx: index('workouts_user_date_idx').on(t.userId, t.date),
}));

export const workoutSets = pgTable('workout_sets', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id').notNull().references(() => exercises.id),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  weight: numeric('weight', { precision: 6, scale: 2 }),
  duration: integer('duration'),
  distance: numeric('distance', { precision: 8, scale: 2 }),
  isPersonalRecord: boolean('is_personal_record').notNull().default(false),
  notes: varchar('notes', { length: 200 }),
}, (t) => ({
  workoutIdx: index('workout_sets_workout_idx').on(t.workoutId, t.setNumber),
  exerciseIdx: index('workout_sets_exercise_idx').on(t.exerciseId),
}));

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }).notNull(),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }).notNull().default('0'),
  unit: varchar('unit', { length: 20 }).notNull(),
  deadline: varchar('deadline', { length: 10 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userStatusIdx: index('goals_user_status_idx').on(t.userId, t.status),
}));`,
  },

  {
    id: 'react-data-table',
    title: 'Data Table with Sorting, Filtering, and Pagination',
    description: 'Full-featured data table component with column sorting, search filtering, and pagination controls.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['table', 'data', 'component', 'reusable'],
    code: `interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  hideOnMobile?: boolean;
  width?: string;
}

interface DataTableProps<T extends { id: number | string }> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
}

function DataTable<T extends { id: number | string }>({
  columns, data, isLoading, emptyMessage = 'No data', pagination, onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {columns.map(col => (
                <th key={String(col.key)}
                  className={\`text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap \${
                    col.hideOnMobile ? 'hidden md:table-cell' : ''
                  } \${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}\`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}>
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={String(col.key)} className={\`px-4 py-3 \${col.hideOnMobile ? 'hidden md:table-cell' : ''}\`}>
                      <div className="h-4 bg-muted rounded animate-pulse" style={{ width: \`\${60 + Math.random() * 40}%\` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map(row => (
                <tr key={row.id}
                  className={\`hover:bg-muted/30 transition-colors \${onRowClick ? 'cursor-pointer' : ''}\`}
                  onClick={() => onRowClick?.(row)}>
                  {columns.map(col => (
                    <td key={String(col.key)} className={\`px-4 py-3 \${col.hideOnMobile ? 'hidden md:table-cell' : ''}\`}>
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-1">
            <button disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`,
  },

  {
    id: 'toast-notification-system',
    title: 'Toast Notification System',
    description: 'Global toast notification system with multiple types, auto-dismiss, and stack management.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['toast', 'notification', 'component', 'global'],
    code: `type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

const toastListeners = new Set<(toast: Toast) => void>();

export function toast(type: ToastType, title: string, description?: string, duration = 5000) {
  const t: Toast = { id: crypto.randomUUID(), type, title, description, duration };
  toastListeners.forEach(fn => fn(t));
  return t.id;
}

toast.success = (title: string, description?: string) => toast('success', title, description);
toast.error = (title: string, description?: string) => toast('error', title, description, 8000);
toast.warning = (title: string, description?: string) => toast('warning', title, description);
toast.info = (title: string, description?: string) => toast('info', title, description);

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts(prev => [...prev.slice(-4), t]);
      if (t.duration && t.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(x => x.id !== t.id));
        }, t.duration);
      }
    };
    toastListeners.add(handler);
    return () => { toastListeners.delete(handler); };
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const styles: Record<ToastType, string> = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={\`pointer-events-auto border rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-right-5 fade-in duration-200 \${styles[t.type]}\`}
          role="alert">
          <div className="flex items-start gap-3">
            <span className="text-sm font-bold mt-0.5">{icons[t.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-current opacity-50 hover:opacity-100 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Usage:
// import { toast, ToastContainer } from './toast';
// toast.success('Task created', 'Your task has been saved.');
// toast.error('Delete failed', 'Please try again.');
// In App: <ToastContainer />`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 7
// ============================================

export const EXPANDED_ANTI_PATTERNS_7: AntiPattern[] = [
  {
    id: 'n-plus-one-queries',
    name: 'N+1 Query Problem',
    description: 'Fetching related data in a loop: 1 query for the list, then N queries for each item\'s relations.',
    whyBad: 'For a list of 100 items, you make 101 database queries instead of 2. Each query has network round-trip overhead. This is the #1 database performance problem in web applications.',
    fix: 'Use JOINs or batch queries. Fetch all related data in one query: SELECT tasks.*, users.name FROM tasks JOIN users ON tasks.assignee_id = users.id. Or fetch IDs first, then batch: WHERE id IN (1, 2, 3, ...).',
    severity: 'critical',
    badExample: 'const tasks = await db.select().from(tasks); for (const task of tasks) { task.assignee = await db.select().from(users).where(eq(users.id, task.assigneeId)); }',
    goodExample: 'const tasksWithAssignees = await db.select().from(tasks).leftJoin(users, eq(tasks.assigneeId, users.id));',
    tags: ['database', 'performance', 'orm'],
  },
  {
    id: 'storing-passwords-plain',
    name: 'Storing Passwords in Plain Text',
    description: 'Storing user passwords without hashing, or using weak hashing algorithms (MD5, SHA1).',
    whyBad: 'If the database is breached, all passwords are immediately compromised. Users often reuse passwords, so a breach affects their accounts on other services too.',
    fix: 'Always hash passwords with bcrypt (cost factor 12+) or Argon2. Never use MD5, SHA1, or SHA256 for passwords — they are too fast to brute-force. Add a unique salt (bcrypt does this automatically).',
    severity: 'critical',
    badExample: 'await db.insert(users).values({ email, password: req.body.password }); // Plain text!',
    goodExample: 'const hash = await bcrypt.hash(req.body.password, 12); await db.insert(users).values({ email, password: hash });',
    tags: ['security', 'authentication', 'database'],
  },
  {
    id: 'exposing-internal-ids',
    name: 'Exposing Sequential Internal IDs',
    description: 'Using auto-increment IDs in URLs and API responses, allowing enumeration of all resources.',
    whyBad: 'Attackers can enumerate all resources by incrementing the ID (/api/users/1, /api/users/2, ...). Reveals the total number of users/orders/etc. Makes IDOR (Insecure Direct Object Reference) attacks trivial.',
    fix: 'Use UUIDs or slugs in URLs. Keep sequential IDs as internal-only. Always check authorization: "Can this user access resource X?" regardless of ID format.',
    severity: 'medium',
    badExample: 'GET /api/invoices/42 // Attacker tries /api/invoices/43, /api/invoices/44...',
    goodExample: 'GET /api/invoices/inv_a1b2c3d4 // UUID-based, plus authorization check',
    tags: ['security', 'api', 'privacy'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 7
// ============================================

export const EXPANDED_BEST_PRACTICES_7: BestPractice[] = [
  {
    id: 'api-design-conventions',
    title: 'RESTful API Design Conventions',
    category: 'api',
    description: 'Design clean, predictable REST APIs that are easy to use and maintain.',
    do: [
      'Use plural nouns for resources: /api/tasks, /api/users (not /api/task)',
      'Use HTTP methods correctly: GET (read), POST (create), PATCH (partial update), PUT (full replace), DELETE',
      'Use kebab-case for URLs: /api/user-profiles (not /api/userProfiles)',
      'Nest routes for relationships: /api/projects/1/tasks (tasks belonging to project 1)',
      'Use query parameters for filtering, sorting, pagination: /api/tasks?status=todo&sort=-createdAt&page=1',
      'Return the created/updated resource in the response body',
      'Use 204 No Content for successful DELETE',
      'Use 202 Accepted for async operations (background jobs)',
      'Version your API when making breaking changes: /api/v1/tasks → /api/v2/tasks',
    ],
    dont: [
      'Use verbs in URLs: /api/getTasks, /api/deleteUser/1 (use HTTP methods instead)',
      'Return 200 for everything and embed status in body: { success: false, error: "..." }',
      'Return unbounded lists — always paginate',
      'Use POST for reads or GET for writes',
      'Change the API response shape without versioning',
    ],
    languages: ['typescript'],
  },
  {
    id: 'error-handling-patterns',
    title: 'Error Handling Best Practices',
    category: 'architecture',
    description: 'Handle errors consistently across the full stack: API, services, and UI.',
    do: [
      'Create custom error classes for different error types (NotFoundError, ValidationError, ForbiddenError)',
      'Use a centralized error handler middleware in Express (app.use(errorHandler))',
      'Wrap all async route handlers with asyncHandler to catch promise rejections',
      'Return structured error responses: { error: "message", code: "ERROR_CODE", details: {...} }',
      'Log all server errors with request context (requestId, userId, endpoint)',
      'Use React Error Boundaries to catch render errors and show fallback UI',
      'Show user-friendly error messages, not raw server errors',
      'Provide recovery actions: retry button, edit link, contact support',
    ],
    dont: [
      'Swallow errors silently with empty catch blocks: catch(e) {} ',
      'Show stack traces to users in production',
      'Use generic "Something went wrong" without recovery options',
      'Throw strings: throw "error" (always throw Error objects)',
      'Forget to handle error states in React components — always handle loading, error, empty, and success',
    ],
    languages: ['typescript'],
  },
  {
    id: 'mobile-first-design',
    title: 'Mobile-First Design Principles',
    category: 'ux',
    description: 'Design and build for mobile screens first, then enhance for larger screens.',
    do: [
      'Start with mobile layout, add breakpoints for larger screens (sm: → md: → lg:)',
      'Use touch-friendly tap targets: minimum 44x44px for interactive elements',
      'Use bottom sheets instead of modals on mobile — easier to reach with one hand',
      'Implement pull-to-refresh for list views',
      'Use swipe gestures for common actions (swipe to delete/archive)',
      'Test on real mobile devices, not just browser dev tools',
      'Use viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
      'Optimize for slow connections: show skeletons, use progressive loading',
    ],
    dont: [
      'Design for desktop first and squeeze it onto mobile',
      'Use hover-only interactions — mobile has no hover state',
      'Use tiny text (<14px) or small tap targets (<44px)',
      'Rely on horizontal scrolling for primary content',
      'Use fixed positioning for elements that block content on small screens',
    ],
    languages: ['typescript', 'css'],
  },
];
