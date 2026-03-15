import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 4
// Advanced Patterns: Multi-Tenancy, Queuing, SSE, i18n, Image Processing,
// Feature Flags, Webhooks, Background Jobs, Search, Analytics
// ============================================

export const EXPANDED_CONCEPTS_4: Record<string, Concept> = {

  multi_tenancy: {
    id: 'multi-tenancy',
    name: 'Multi-Tenancy Architecture',
    category: 'architecture',
    description: 'Serve multiple customers (tenants) from a single application instance with data isolation.',
    explanation: 'Multi-tenancy strategies: (1) Shared database, shared schema — add tenantId column to every table. Simplest but requires careful query scoping. (2) Shared database, separate schema — each tenant gets their own PostgreSQL schema. Good isolation, moderate complexity. (3) Separate databases — strongest isolation, highest operational overhead. For most SaaS apps, option 1 with row-level security (RLS) is the best balance. Always scope every query to the current tenant.',
    examples: [
      `// Strategy 1: Shared schema with tenantId column
// Add tenantId to EVERY table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  // ...other fields...
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('projects_tenant_idx').on(t.tenantId),
  tenantNameIdx: index('projects_tenant_name_idx').on(t.tenantId, t.name),
}));

// Middleware to inject tenantId from auth
function injectTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  req.tenantId = req.user.tenantId;
  next();
}

// Service helper to scope all queries
function withTenant<T>(query: Promise<T[]>, tenantId: number): Promise<T[]> {
  // In practice, add where(eq(table.tenantId, tenantId)) to every query
  return query;
}

// Usage — EVERY query must include tenantId
async function getProjects(tenantId: number) {
  return db.select().from(projects).where(eq(projects.tenantId, tenantId));
}`,
    ],
    relatedConcepts: ['database-transactions-advanced', 'rest-api-design', 'service-layer'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  server_sent_events: {
    id: 'server-sent-events',
    name: 'Server-Sent Events (SSE)',
    category: 'architecture',
    description: 'One-way real-time streaming from server to client over HTTP — simpler than WebSockets for notifications and live feeds.',
    explanation: 'SSE uses a standard HTTP connection that the server keeps open to push events. Unlike WebSockets, SSE is: (1) Unidirectional (server → client only). (2) Built on standard HTTP (works through proxies, load balancers). (3) Auto-reconnects. (4) Text-based (JSON events). Use SSE for: live notifications, dashboard updates, log streaming, progress bars. Use WebSockets only when you need bidirectional communication (chat, collaborative editing).',
    examples: [
      `// Server: Express SSE endpoint
app.get('/api/events', authenticate, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const userId = req.user!.id;

  // Send initial connection event
  res.write(\`event: connected\\ndata: \${JSON.stringify({ userId })}\\n\\n\`);

  // Send keepalive every 30s to prevent timeout
  const keepalive = setInterval(() => {
    res.write(': keepalive\\n\\n');
  }, 30000);

  // Function to send events to this client
  const sendEvent = (type: string, data: unknown) => {
    res.write(\`event: \${type}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
  };

  // Register client
  sseClients.set(userId, sendEvent);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepalive);
    sseClients.delete(userId);
  });
});

// Send notification to user
function notifyUser(userId: number, event: string, data: unknown) {
  const send = sseClients.get(userId);
  if (send) send(event, data);
}

// Client: React hook for SSE
function useSSE(url: string) {
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const source = new EventSource(url);

    source.addEventListener('notification', (e) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [...prev.slice(-99), data]);
    });

    source.addEventListener('task_updated', (e) => {
      const data = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: ['tasks', data.taskId] });
    });

    source.onerror = () => {
      // EventSource auto-reconnects
      console.warn('SSE connection error, reconnecting...');
    };

    return () => source.close();
  }, [url]);

  return events;
}`,
    ],
    relatedConcepts: ['websocket-patterns', 'event-driven', 'caching-strategies'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  feature_flags: {
    id: 'feature-flags',
    name: 'Feature Flags / Feature Toggles',
    category: 'deployment',
    description: 'Toggle features on/off without deploying code — enable gradual rollouts, A/B tests, and kill switches.',
    explanation: 'Feature flags decouple deployment from release. Deploy code behind a flag, then enable it for specific users, percentages, or environments. Types: (1) Release flags — enable new features gradually. (2) Experiment flags — A/B testing. (3) Ops flags — kill switches for degraded services. (4) Permission flags — premium features. Implementation: simple (env vars), medium (database), advanced (LaunchDarkly, Unleash).',
    examples: [
      `// Simple feature flag system
interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  allowedUserIds?: number[];
  allowedRoles?: string[];
}

const FLAGS: Record<string, FeatureFlag> = {
  'new-dashboard': {
    key: 'new-dashboard',
    enabled: true,
    rolloutPercentage: 25,
  },
  'ai-suggestions': {
    key: 'ai-suggestions',
    enabled: true,
    allowedRoles: ['pro', 'enterprise'],
  },
  'beta-export': {
    key: 'beta-export',
    enabled: true,
    allowedUserIds: [1, 2, 3], // Beta testers
  },
};

function isFeatureEnabled(flagKey: string, user?: { id: number; role: string }): boolean {
  const flag = FLAGS[flagKey];
  if (!flag || !flag.enabled) return false;

  if (flag.allowedUserIds?.length && user) {
    return flag.allowedUserIds.includes(user.id);
  }

  if (flag.allowedRoles?.length && user) {
    return flag.allowedRoles.includes(user.role);
  }

  if (flag.rolloutPercentage !== undefined && user) {
    const hash = user.id % 100;
    return hash < flag.rolloutPercentage;
  }

  return flag.enabled;
}

// Usage in route:
app.get('/api/suggestions', authenticate, (req, res) => {
  if (!isFeatureEnabled('ai-suggestions', req.user)) {
    return res.status(404).json({ error: 'Not found' });
  }
  // ...feature logic
});

// Usage in React:
function useFeatureFlag(key: string): boolean {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user) return false;
    // Fetch flags from API or use embedded config
    return checkFlag(key, user);
  }, [key, user]);
}`,
    ],
    relatedConcepts: ['environment-config', 'deployment', 'caching-strategies'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  webhook_patterns: {
    id: 'webhook-patterns',
    name: 'Webhook Implementation Patterns',
    category: 'architecture',
    description: 'Receive and send webhooks with signature verification, retry logic, and idempotency.',
    explanation: 'Webhooks are HTTP callbacks — another service sends a POST request to your endpoint when an event occurs. Key practices: (1) Verify webhook signatures (HMAC-SHA256) to prevent spoofing. (2) Return 200 quickly, then process async (the sender may timeout). (3) Implement idempotency — the same event may be delivered multiple times. (4) Log all webhook events for debugging. (5) For outgoing webhooks: retry with exponential backoff on failure.',
    examples: [
      `import crypto from 'crypto';

// Receiving webhooks (e.g., from Stripe)
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  // Check idempotency — have we processed this event before?
  const [existing] = await db.select().from(webhookEvents)
    .where(eq(webhookEvents.eventId, event.id)).limit(1);
  if (existing) return res.json({ received: true }); // Already processed

  // Store event for idempotency and audit
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    payload: event,
    processedAt: new Date(),
  });

  // Return 200 immediately, process async
  res.json({ received: true });

  // Process the event asynchronously
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

// Sending webhooks to customers
async function sendWebhook(url: string, event: string, payload: unknown, secret: string): Promise<boolean> {
  const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); // Exponential backoff
    }
  }
  return false;
}`,
    ],
    relatedConcepts: ['event-driven', 'middleware-pattern', 'rest-api-design'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  background_jobs: {
    id: 'background-jobs',
    name: 'Background Job Processing',
    category: 'architecture',
    description: 'Process long-running tasks asynchronously using job queues (email, reports, image processing).',
    explanation: 'Never block HTTP requests with long-running work. Instead: (1) Accept the request. (2) Enqueue a job. (3) Return 202 Accepted with a job ID. (4) Process the job in a background worker. (5) Update status via polling or SSE. Use BullMQ (Redis-backed) for production job queues. For simple cases, use an in-memory queue with setTimeout. Handle failures with retries and dead letter queues.',
    examples: [
      `// Simple in-memory job queue for small-scale apps
type JobHandler = (payload: unknown) => Promise<void>;

class SimpleJobQueue {
  private handlers = new Map<string, JobHandler>();
  private processing = 0;
  private maxConcurrency = 5;
  private queue: { type: string; payload: unknown; retries: number }[] = [];

  register(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async enqueue(type: string, payload: unknown) {
    this.queue.push({ type, payload, retries: 0 });
    this.processNext();
  }

  private async processNext() {
    if (this.processing >= this.maxConcurrency || this.queue.length === 0) return;

    const job = this.queue.shift()!;
    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.error(\`No handler for job type: \${job.type}\`);
      return;
    }

    this.processing++;
    try {
      await handler(job.payload);
    } catch (err) {
      console.error(\`Job failed: \${job.type}\`, err);
      if (job.retries < 3) {
        job.retries++;
        const delay = 1000 * 2 ** job.retries;
        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, delay);
      }
    } finally {
      this.processing--;
      this.processNext();
    }
  }
}

const jobQueue = new SimpleJobQueue();

// Register handlers
jobQueue.register('send-welcome-email', async (payload: any) => {
  await emailService.send({
    to: payload.email,
    ...welcomeEmail(payload.name),
  });
});

jobQueue.register('generate-report', async (payload: any) => {
  const report = await generateReport(payload.reportId);
  await db.update(reports).set({ status: 'completed', fileUrl: report.url })
    .where(eq(reports.id, payload.reportId));
});

// Usage in route handlers
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  await jobQueue.enqueue('send-welcome-email', { email: user.email, name: user.name });
  res.status(201).json(user);
}));

app.post('/api/reports', authenticate, asyncHandler(async (req, res) => {
  const [report] = await db.insert(reports).values({
    userId: req.user!.id,
    status: 'processing',
  }).returning();
  await jobQueue.enqueue('generate-report', { reportId: report.id });
  res.status(202).json({ id: report.id, status: 'processing' });
}));`,
    ],
    relatedConcepts: ['event-driven', 'graceful-shutdown', 'webhook-patterns'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  full_text_search: {
    id: 'full-text-search',
    name: 'Full-Text Search with PostgreSQL',
    category: 'database',
    description: 'Implement search functionality using PostgreSQL built-in full-text search with tsvector and tsquery.',
    explanation: 'PostgreSQL full-text search is powerful enough for most applications without Elasticsearch. Features: word stemming, ranking, fuzzy matching, phrase search. Steps: (1) Add a tsvector column (or generate dynamically). (2) Create a GIN index on the tsvector column. (3) Use to_tsquery for search queries. (4) Use ts_rank for relevance sorting. For small datasets (<100K rows), ILIKE with trigram index (pg_trgm) is simpler.',
    examples: [
      `// PostgreSQL full-text search with Drizzle
import { sql } from 'drizzle-orm';

// Simple ILIKE search (good for <100K rows)
async function searchProducts(query: string, limit = 20) {
  const searchTerm = \`%\${query}%\`;
  return db.select().from(products)
    .where(or(
      ilike(products.name, searchTerm),
      ilike(products.description, searchTerm),
      ilike(products.sku, searchTerm),
    ))
    .limit(limit);
}

// Full-text search with ts_rank (good for large datasets)
async function fullTextSearch(query: string, limit = 20) {
  const tsQuery = query.split(/\\s+/).filter(Boolean).join(' & ');

  return db.execute(sql\`
    SELECT *,
      ts_rank(
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')),
        to_tsquery('english', \${tsQuery})
      ) as rank
    FROM products
    WHERE to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
      @@ to_tsquery('english', \${tsQuery})
    ORDER BY rank DESC
    LIMIT \${limit}
  \`);
}

// Fuzzy search with pg_trgm extension (handles typos)
async function fuzzySearch(query: string, limit = 20) {
  return db.execute(sql\`
    SELECT *, similarity(name, \${query}) as sim
    FROM products
    WHERE name % \${query} OR description % \${query}
    ORDER BY sim DESC
    LIMIT \${limit}
  \`);
}`,
    ],
    relatedConcepts: ['database-indexing', 'cursor-pagination', 'caching-strategies'],
    difficulty: 'advanced',
    languages: ['typescript', 'sql'],
  },

  internationalization: {
    id: 'internationalization',
    name: 'Internationalization (i18n)',
    category: 'ux',
    description: 'Support multiple languages and locales in a web application.',
    explanation: 'i18n (internationalization) is preparing your app for translation. l10n (localization) is the actual translation. Key practices: (1) Never hardcode user-facing strings — use translation keys. (2) Handle plural forms (English: 1 item, 2 items; Arabic has 6 plural forms). (3) Format dates, numbers, and currencies using Intl APIs (locale-aware). (4) Support RTL (right-to-left) languages. (5) Allow text expansion (German is 30% longer than English). Libraries: react-i18next, next-intl.',
    examples: [
      `import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

// Initialize i18n
i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        'nav.home': 'Home',
        'nav.about': 'About',
        'task.title': 'Tasks',
        'task.create': 'Create Task',
        'task.count': '{{count}} task',
        'task.count_plural': '{{count}} tasks',
        'task.empty': 'No tasks yet. Create one to get started.',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.confirm_delete': 'Are you sure you want to delete "{{name}}"?',
      },
    },
    es: {
      translation: {
        'nav.home': 'Inicio',
        'nav.about': 'Acerca de',
        'task.title': 'Tareas',
        'task.create': 'Crear Tarea',
        'task.count': '{{count}} tarea',
        'task.count_plural': '{{count}} tareas',
        'task.empty': 'No hay tareas. Crea una para empezar.',
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
        'common.confirm_delete': '¿Seguro que quieres eliminar "{{name}}"?',
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Usage in component
function TaskList({ tasks }: { tasks: Task[] }) {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('task.title')}</h1>
      <p>{t('task.count', { count: tasks.length })}</p>
      {tasks.length === 0 ? (
        <p>{t('task.empty')}</p>
      ) : (
        tasks.map(task => <TaskCard key={task.id} task={task} />)
      )}
      <button>{t('task.create')}</button>
    </div>
  );
}

// Locale-aware date/number formatting
function useFormatters() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return {
    formatDate: (date: string | Date) =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date)),
    formatCurrency: (cents: number, currency = 'USD') =>
      new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100),
    formatNumber: (n: number) =>
      new Intl.NumberFormat(locale).format(n),
    formatRelativeTime: (date: string | Date) => {
      const diff = Date.now() - new Date(date).getTime();
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      if (diff < 60000) return rtf.format(-Math.floor(diff / 1000), 'second');
      if (diff < 3600000) return rtf.format(-Math.floor(diff / 60000), 'minute');
      if (diff < 86400000) return rtf.format(-Math.floor(diff / 3600000), 'hour');
      return rtf.format(-Math.floor(diff / 86400000), 'day');
    },
  };
}`,
    ],
    relatedConcepts: ['aria-patterns', 'react-context-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  image_optimization: {
    id: 'image-optimization',
    name: 'Image Optimization Patterns',
    category: 'performance',
    description: 'Optimize images for web: lazy loading, responsive sizes, modern formats, and CDN delivery.',
    explanation: 'Images are the largest assets on most web pages. Optimize with: (1) Lazy loading — only load images when they enter the viewport (loading="lazy"). (2) Responsive sizes — serve smaller images to mobile devices using srcSet and sizes. (3) Modern formats — use WebP/AVIF (30-50% smaller than JPEG). (4) Proper dimensions — always set width and height to prevent layout shift. (5) CDN — serve images from a CDN for faster delivery. (6) Compression — optimize quality (80% JPEG is usually indistinguishable from 100%).',
    examples: [
      `// Responsive image component with lazy loading
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean; // Above-the-fold images
  sizes?: string;
}

function OptimizedImage({ src, alt, width, height, className, priority = false, sizes }: OptimizedImageProps) {
  const aspectRatio = (height / width) * 100;

  return (
    <div className="relative overflow-hidden" style={{ paddingBottom: \`\${aspectRatio}%\` }}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        className={\`absolute inset-0 w-full h-full object-cover \${className ?? ''}\`}
      />
    </div>
  );
}

// Avatar component with fallback
function Avatar({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-lg' };
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return src ? (
    <img src={src} alt={name} className={\`\${sizes[size]} rounded-full object-cover\`} loading="lazy" />
  ) : (
    <div className={\`\${sizes[size]} rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium\`}>
      {initials}
    </div>
  );
}`,
    ],
    relatedConcepts: ['lazy-loading', 'caching-strategies', 'skeleton-loading'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  optimistic_locking: {
    id: 'optimistic-locking',
    name: 'Optimistic Locking / Versioning',
    category: 'database',
    description: 'Prevent lost updates when multiple users edit the same record concurrently.',
    explanation: 'Without concurrency control, the last write wins and silently overwrites other users changes. Optimistic locking adds a version column to the table. On update: (1) Read the record including its version. (2) When updating, include WHERE version = $readVersion. (3) If the update affects 0 rows, another user modified it — return 409 Conflict. (4) Otherwise, increment the version. This is "optimistic" because it assumes conflicts are rare.',
    examples: [
      `// Schema: add version column
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content'),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Update with optimistic locking
async function updateDocument(id: number, data: { title?: string; content?: string }, expectedVersion: number) {
  const [updated] = await db.update(documents)
    .set({
      ...data,
      version: expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(and(
      eq(documents.id, id),
      eq(documents.version, expectedVersion), // Only update if version matches
    ))
    .returning();

  if (!updated) {
    // Check if the record exists
    const [existing] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Document');
    throw new ConflictError('Document was modified by another user. Please refresh and try again.');
  }

  return updated;
}

// Route handler
app.patch('/api/documents/:id', authenticate, asyncHandler(async (req, res) => {
  const { title, content, version } = req.body;
  if (typeof version !== 'number') {
    return res.status(400).json({ error: 'Version is required for updates' });
  }
  const doc = await updateDocument(Number(req.params.id), { title, content }, version);
  res.json(doc);
}));`,
    ],
    relatedConcepts: ['database-transactions-advanced', 'rest-api-design'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  audit_logging: {
    id: 'audit-logging',
    name: 'Audit Logging Pattern',
    category: 'security',
    description: 'Track all data changes with who, what, when, and before/after snapshots.',
    explanation: 'Audit logs are essential for: compliance (GDPR, SOC 2), debugging, accountability, and undo functionality. Log: (1) WHO — the user who made the change. (2) WHAT — the entity and field(s) changed. (3) WHEN — timestamp. (4) BEFORE/AFTER — the old and new values. Store audit logs in a separate table. Never delete audit logs. For GDPR, you may need to anonymize PII in old audit entries.',
    examples: [
      `export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // create, update, delete
  entityType: varchar('entity_type', { length: 50 }).notNull(), // user, task, order
  entityId: integer('entity_id').notNull(),
  changes: jsonb('changes'), // { field: { from: oldValue, to: newValue } }
  metadata: jsonb('metadata'), // IP, user agent, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entityIdx: index('audit_entity_idx').on(t.entityType, t.entityId, t.createdAt),
  userIdx: index('audit_user_idx').on(t.userId, t.createdAt),
}));

async function createAuditLog(
  userId: number,
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: number,
  changes?: Record<string, { from: unknown; to: unknown }>,
  metadata?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({
    userId,
    action,
    entityType,
    entityId,
    changes: changes ?? null,
    metadata: metadata ?? null,
  });
}

// Helper to compute changes between old and new records
function computeChanges<T extends Record<string, unknown>>(
  oldRecord: T,
  newRecord: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, newValue] of Object.entries(newRecord)) {
    const oldValue = oldRecord[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { from: oldValue, to: newValue };
    }
  }
  return changes;
}

// Usage in service layer
async function updateTask(taskId: number, userId: number, data: Partial<Task>) {
  const [oldTask] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!oldTask) throw new NotFoundError('Task');

  const [updated] = await db.update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  const changes = computeChanges(oldTask, data);
  if (Object.keys(changes).length > 0) {
    await createAuditLog(userId, 'update', 'task', taskId, changes);
  }

  return updated;
}`,
    ],
    relatedConcepts: ['database-transactions-advanced', 'structured-logging', 'optimistic-locking'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  database_seeding: {
    id: 'database-seeding',
    name: 'Database Seeding Pattern',
    category: 'database',
    description: 'Populate the database with realistic sample data for development and testing.',
    explanation: 'Seeds provide: (1) Consistent starting data for development. (2) Demo data for stakeholder reviews. (3) Test data for integration tests. Best practices: use factories (functions that generate random realistic data), make seeds idempotent (safe to run multiple times), separate development seeds from production seeds (admin user, default categories). Use faker.js for realistic names, emails, dates, etc.',
    examples: [
      `import { faker } from '@faker-js/faker';

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const [admin] = await db.insert(users).values({
    name: 'Admin User',
    email: 'admin@example.com',
    password: await bcrypt.hash('password123', 12),
    role: 'admin',
  }).returning().onConflictDoNothing();

  // Create test users
  const testUsers = Array.from({ length: 10 }, () => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: '$2b$12$placeholder', // Pre-hashed "password123"
    role: 'user',
  }));

  const createdUsers = await db.insert(users).values(testUsers).returning().onConflictDoNothing();

  // Create categories
  const categoryNames = ['Engineering', 'Design', 'Marketing', 'Sales', 'Support'];
  const categories = await db.insert(projectCategories).values(
    categoryNames.map((name, i) => ({ name, slug: name.toLowerCase(), sortOrder: i }))
  ).returning().onConflictDoNothing();

  // Create projects with tasks
  for (let i = 0; i < 5; i++) {
    const [project] = await db.insert(projects).values({
      name: faker.company.catchPhrase(),
      slug: faker.helpers.slugify(faker.company.catchPhrase()).toLowerCase(),
      description: faker.lorem.paragraph(),
      ownerId: createdUsers[i % createdUsers.length].id,
      status: faker.helpers.arrayElement(['active', 'active', 'active', 'archived']),
    }).returning();

    // Add tasks to each project
    const statuses = ['todo', 'in-progress', 'review', 'done'];
    const priorities = ['low', 'medium', 'medium', 'high', 'urgent'];

    for (let j = 0; j < 15; j++) {
      await db.insert(tasks).values({
        projectId: project.id,
        title: faker.hacker.phrase(),
        description: faker.lorem.paragraphs(2),
        status: faker.helpers.arrayElement(statuses),
        priority: faker.helpers.arrayElement(priorities),
        assigneeId: faker.helpers.arrayElement(createdUsers).id,
        createdBy: project.ownerId,
        position: j,
        dueDate: faker.date.future({ years: 0.5 }).toISOString().split('T')[0],
      });
    }
  }

  console.log('Seeding complete!');
}

seed().catch(console.error).finally(() => process.exit());`,
    ],
    relatedConcepts: ['database-transactions-advanced', 'tdd'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 4
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_4: Record<string, EntityArchetype> = {

  notification: {
    id: 'notification',
    name: 'Notification',
    aliases: ['alert', 'message', 'announcement'],
    domain: 'general',
    description: 'In-app notification with type, message, read status, and link to related resource.',
    traits: ['pageable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Recipient' },
      { name: 'type', type: 'varchar(30) not null', nullable: false, description: 'task_assigned|comment_added|mention|status_changed' },
      { name: 'title', type: 'varchar(200) not null', nullable: false, description: 'Notification title' },
      { name: 'message', type: 'varchar(500)', nullable: true, description: 'Notification body' },
      { name: 'actorId', type: 'integer references users(id)', nullable: true, description: 'Who triggered it' },
      { name: 'resourceType', type: 'varchar(50)', nullable: true, description: 'Related entity type' },
      { name: 'resourceId', type: 'integer', nullable: true, description: 'Related entity ID' },
      { name: 'link', type: 'varchar(500)', nullable: true, description: 'Deep link URL' },
      { name: 'isRead', type: 'boolean not null default false', nullable: false, description: 'Read status' },
      { name: 'readAt', type: 'timestamptz', nullable: true, description: 'When read' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['(userId, isRead, createdAt DESC)', 'userId'],
    typicalEndpoints: [
      'GET /notifications?unread=true',
      'GET /notifications/count',
      'PATCH /notifications/:id/read',
      'POST /notifications/read-all',
      'DELETE /notifications/:id',
    ],
  },

  file_attachment: {
    id: 'file-attachment',
    name: 'File Attachment',
    aliases: ['upload', 'media', 'document', 'asset'],
    domain: 'general',
    description: 'Uploaded file with metadata, linked to any resource (polymorphic).',
    traits: ['pageable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'filename', type: 'varchar(300) not null', nullable: false, description: 'Original filename' },
      { name: 'storedName', type: 'varchar(300) not null', nullable: false, description: 'UUID-based stored name' },
      { name: 'mimeType', type: 'varchar(100) not null', nullable: false, description: 'MIME type' },
      { name: 'size', type: 'integer not null', nullable: false, description: 'File size in bytes' },
      { name: 'url', type: 'text not null', nullable: false, description: 'Public URL' },
      { name: 'uploadedBy', type: 'integer not null references users(id)', nullable: false, description: 'Uploader' },
      { name: 'resourceType', type: 'varchar(50)', nullable: true, description: 'Attached to entity type' },
      { name: 'resourceId', type: 'integer', nullable: true, description: 'Attached to entity ID' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Upload time' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['(resourceType, resourceId)', 'uploadedBy'],
    typicalEndpoints: [
      'POST /upload',
      'GET /attachments?resourceType=task&resourceId=1',
      'DELETE /attachments/:id',
    ],
  },

  tag: {
    id: 'tag',
    name: 'Tag / Label',
    aliases: ['category', 'badge', 'marker'],
    domain: 'general',
    description: 'A tag for categorizing and filtering resources.',
    traits: ['searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(50) not null', nullable: false, description: 'Tag name' },
      { name: 'slug', type: 'varchar(50) not null unique', nullable: false, description: 'URL slug' },
      { name: 'color', type: 'varchar(7)', nullable: true, description: 'Display color (hex)' },
      { name: 'description', type: 'varchar(200)', nullable: true, description: 'Tag description' },
      { name: 'usageCount', type: 'integer not null default 0', nullable: false, description: 'How many items use this tag' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
    ],
    relatedEntities: [],
    suggestedIndexes: ['slug (unique)', 'name'],
    typicalEndpoints: [
      'GET /tags?search=react',
      'POST /tags',
      'PATCH /tags/:id',
      'DELETE /tags/:id',
    ],
  },

  setting: {
    id: 'user-setting',
    name: 'User Setting / Preference',
    aliases: ['preference', 'config', 'option'],
    domain: 'general',
    description: 'User-specific settings and preferences (theme, notifications, locale).',
    traits: [],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id) unique', nullable: false, description: 'User' },
      { name: 'theme', type: "varchar(10) not null default 'system'", nullable: false, description: 'light|dark|system' },
      { name: 'locale', type: "varchar(10) not null default 'en'", nullable: false, description: 'Preferred language' },
      { name: 'timezone', type: "varchar(50) not null default 'UTC'", nullable: false, description: 'User timezone' },
      { name: 'emailNotifications', type: 'boolean not null default true', nullable: false, description: 'Email notifications enabled' },
      { name: 'pushNotifications', type: 'boolean not null default true', nullable: false, description: 'Push notifications enabled' },
      { name: 'weeklyDigest', type: 'boolean not null default true', nullable: false, description: 'Weekly email digest' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['userId (unique)'],
    typicalEndpoints: [
      'GET /settings',
      'PATCH /settings',
    ],
  },

  api_key: {
    id: 'api-key',
    name: 'API Key',
    aliases: ['token', 'access key', 'secret key'],
    domain: 'general',
    description: 'API key for programmatic access with scopes and expiration.',
    traits: ['pageable', 'auditable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Key owner' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Key name/description' },
      { name: 'keyPrefix', type: 'varchar(8) not null', nullable: false, description: 'First 8 chars of key (for display)' },
      { name: 'keyHash', type: 'varchar(128) not null', nullable: false, description: 'SHA-256 hash of the full key' },
      { name: 'scopes', type: 'text[] not null', nullable: false, description: 'Allowed scopes: read, write, admin' },
      { name: 'lastUsedAt', type: 'timestamptz', nullable: true, description: 'Last API call with this key' },
      { name: 'expiresAt', type: 'timestamptz', nullable: true, description: 'Expiration date (null = no expiry)' },
      { name: 'revokedAt', type: 'timestamptz', nullable: true, description: 'Revocation time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['keyHash (unique)', 'userId', '(userId, revokedAt)'],
    typicalEndpoints: [
      'GET /api-keys',
      'POST /api-keys',
      'DELETE /api-keys/:id (revoke)',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 4
// ============================================

export const EXPANDED_DOMAIN_MODELS_4: Record<string, DomainModel> = {

  'chat-messaging': {
    id: 'chat-messaging',
    name: 'Chat / Messaging Application',
    description: 'Real-time messaging with conversations, direct messages, group chats, and media sharing.',
    coreEntities: ['conversation', 'message', 'participant', 'user'],
    optionalEntities: ['reaction', 'attachment', 'read_receipt', 'notification'],
    keyRelationships: [
      'conversation has many participants (conversationId FK)',
      'participant links user to conversation (userId + conversationId)',
      'message belongs to conversation and sender (conversationId + senderId)',
      'reaction belongs to message and user',
      'attachment belongs to message',
    ],
    typicalFeatures: [
      'Direct messaging (1:1 conversations)',
      'Group chats with admin roles',
      'Real-time message delivery (WebSocket/SSE)',
      'Message history with infinite scroll',
      'Read receipts and typing indicators',
      'File/image sharing',
      'Message reactions (emoji)',
      'Message search',
      'Online/offline status',
      'Push notifications for new messages',
      'Conversation list with last message preview',
    ],
    securityConsiderations: [
      'Only conversation participants can read/send messages',
      'Validate file uploads (type, size)',
      'Rate limit message sending (prevent spam)',
      'End-to-end encryption for sensitive conversations',
      'Content moderation for abuse prevention',
    ],
    suggestedIndexStrategy: [
      'messages: (conversationId, createdAt DESC) for message history',
      'participants: (userId, conversationId) unique for membership',
      'participants: (userId) for listing user conversations',
      'conversations: (updatedAt DESC) for ordering by last activity',
    ],
  },

  'saas-dashboard': {
    id: 'saas-dashboard',
    name: 'SaaS Dashboard / Admin Panel',
    description: 'Multi-tenant SaaS application with team management, billing, analytics, and admin features.',
    coreEntities: ['organization', 'user', 'team_member', 'subscription'],
    optionalEntities: ['invitation', 'api_key', 'audit_log', 'webhook', 'notification', 'setting'],
    keyRelationships: [
      'organization has many team members (organizationId FK)',
      'team_member links user to organization with a role',
      'subscription belongs to organization',
      'invitation belongs to organization',
      'api_key belongs to user within organization',
      'audit_log records all actions by team members',
    ],
    typicalFeatures: [
      'Multi-tenant data isolation',
      'Team management (invite, remove, change roles)',
      'Role-based access control (owner, admin, member, viewer)',
      'Subscription/billing management (Stripe integration)',
      'Usage analytics dashboard with KPIs',
      'API key management for programmatic access',
      'Webhook configuration for integrations',
      'Audit log of all actions',
      'Organization settings (name, logo, billing)',
      'User profile and preferences',
      'Onboarding flow for new organizations',
      'Email notifications (customizable)',
    ],
    securityConsiderations: [
      'Strict tenant isolation — every query scoped to organization',
      'Role-based permissions on all endpoints',
      'Audit log for compliance',
      'API key hashing (store hash, not the key)',
      'Rate limiting per organization',
      'SSO/SAML for enterprise customers',
    ],
    suggestedIndexStrategy: [
      'team_members: (organizationId, userId) unique',
      'team_members: (userId) for finding user organizations',
      'subscriptions: (organizationId) for billing',
      'audit_logs: (organizationId, createdAt DESC) for audit',
      'api_keys: keyHash (unique) for authentication',
      'invitations: (email, organizationId) for deduplication',
    ],
  },

  'documentation': {
    id: 'documentation',
    name: 'Documentation / Knowledge Base Site',
    description: 'Technical documentation with versioned pages, search, navigation, and code examples.',
    coreEntities: ['doc_page', 'doc_section', 'doc_version'],
    optionalEntities: ['search_index', 'feedback', 'redirect'],
    keyRelationships: [
      'doc_page belongs to doc_section (sectionId FK)',
      'doc_page belongs to doc_version',
      'doc_section has sortable order',
    ],
    typicalFeatures: [
      'Hierarchical navigation (sections → pages)',
      'Markdown/MDX rendering with syntax highlighting',
      'Full-text search with relevance ranking',
      'Version selector (v1, v2, latest)',
      'Table of contents (auto-generated from headings)',
      'Previous/next page navigation',
      'Code examples with copy button',
      'Dark/light mode',
      'Breadcrumb navigation',
      '"Was this page helpful?" feedback',
      'Edit on GitHub link',
      'SEO optimization (meta tags, sitemap)',
    ],
    securityConsiderations: [
      'Public docs — no auth required for reading',
      'Admin auth for editing/publishing',
      'Rate limit search API',
    ],
    suggestedIndexStrategy: [
      'doc_pages: (sectionId, sortOrder) for navigation',
      'doc_pages: slug (unique per version)',
      'doc_pages: Full-text on (title, content) for search',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 4
// ============================================

export const EXPANDED_CODE_SNIPPETS_4: CodeSnippet[] = [

  {
    id: 'settings-page',
    title: 'Settings Page with Tabs',
    description: 'User settings page with tabbed navigation for profile, notifications, and security settings.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['settings', 'profile', 'component', 'page'],
    code: `function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        <nav className="sm:w-48 shrink-0">
          <ul className="space-y-1">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button onClick={() => setActiveTab(tab.id)}
                  className={\`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \${
                    activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }\`}>
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-2xl font-medium">JD</div>
            <button className="text-sm text-primary hover:underline">Change photo</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First name</label>
              <input type="text" defaultValue="John" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last name</label>
              <input type="text" defaultValue="Doe" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" defaultValue="john@example.com" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tell us about yourself" />
          </div>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Notifications</h2>
      <div className="space-y-4">
        {[
          { label: 'Email notifications', description: 'Receive email for task assignments and mentions', value: emailNotifs, onChange: setEmailNotifs },
          { label: 'Push notifications', description: 'Receive push notifications in your browser', value: pushNotifs, onChange: setPushNotifs },
          { label: 'Weekly digest', description: 'Receive a weekly summary email of your activity', value: weeklyDigest, onChange: setWeeklyDigest },
        ].map(item => (
          <div key={item.label} className="flex items-start justify-between gap-4 p-4 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <button onClick={() => item.onChange(!item.value)}
              className={\`relative w-10 h-6 rounded-full transition-colors \${item.value ? 'bg-primary' : 'bg-muted'}\`}>
              <span className={\`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform \${
                item.value ? 'translate-x-4' : ''
              }\`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}`,
  },

  {
    id: 'notification-dropdown',
    title: 'Notification Dropdown Component',
    description: 'Header notification bell with dropdown showing recent notifications and unread count.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['notification', 'dropdown', 'component', 'header'],
    code: `interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string;
  actorName?: string;
  actorAvatar?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationDropdown({ notifications, unreadCount, onMarkRead, onMarkAllRead }: {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 hover:bg-muted rounded-lg" aria-label="Notifications">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-medium text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id}
                    className={\`p-3 hover:bg-muted/50 cursor-pointer transition-colors \${!notif.isRead ? 'bg-primary/5' : ''}\`}
                    onClick={() => { onMarkRead(notif.id); if (notif.link) window.location.href = notif.link; }}>
                    <div className="flex gap-2">
                      {notif.actorAvatar ? (
                        <img src={notif.actorAvatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-medium">
                          {notif.actorName?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{notif.title}</p>
                        {notif.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t">
              <a href="/notifications" className="block text-center text-xs text-primary hover:underline py-1">View all</a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return \`\${Math.floor(diff / 60000)}m ago\`;
  if (diff < 86400000) return \`\${Math.floor(diff / 3600000)}h ago\`;
  if (diff < 604800000) return \`\${Math.floor(diff / 86400000)}d ago\`;
  return new Date(dateStr).toLocaleDateString();
}`,
  },

  {
    id: 'breadcrumb-component',
    title: 'Breadcrumb Navigation Component',
    description: 'Breadcrumb navigation with home link, separator, and current page indicator.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['navigation', 'breadcrumb', 'component', 'reusable'],
    code: `interface BreadcrumbItem {
  label: string;
  href?: string;
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </a>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {i === items.length - 1 ? (
            <span className="font-medium text-foreground" aria-current="page">{item.label}</span>
          ) : (
            <a href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}

// Usage:
// <Breadcrumbs items={[
//   { label: 'Projects', href: '/projects' },
//   { label: 'Website Redesign', href: '/projects/website-redesign' },
//   { label: 'Tasks' },
// ]} />`,
  },

  {
    id: 'avatar-group',
    title: 'Avatar Group / Stack Component',
    description: 'Overlapping avatar circles for showing team members or assignees, with overflow count.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['avatar', 'component', 'reusable', 'team'],
    code: `interface AvatarUser {
  id: number;
  name: string;
  avatarUrl?: string;
}

function AvatarGroup({ users, max = 4, size = 'md' }: {
  users: AvatarUser[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const displayed = users.slice(0, max);
  const overflow = users.length - max;
  const sizes = {
    sm: { container: 'w-6 h-6 text-[10px]', offset: '-ml-1.5' },
    md: { container: 'w-8 h-8 text-xs', offset: '-ml-2' },
    lg: { container: 'w-10 h-10 text-sm', offset: '-ml-2.5' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center">
      {displayed.map((user, i) => (
        <div key={user.id} className={\`\${s.container} rounded-full border-2 border-background \${i > 0 ? s.offset : ''}\`}
          title={user.name} style={{ zIndex: displayed.length - i }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className={\`\${s.container} rounded-full border-2 border-background bg-muted flex items-center justify-center font-medium text-muted-foreground \${s.offset}\`}
          style={{ zIndex: 0 }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

// Usage:
// <AvatarGroup users={teamMembers} max={3} size="md" />`,
  },

  {
    id: 'status-badge',
    title: 'Status Badge Component',
    description: 'Reusable status badge with configurable colors for different status values.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['badge', 'status', 'component', 'reusable'],
    code: `type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

function StatusBadge({ label, variant = 'default', dot = false }: {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
}) {
  return (
    <span className={\`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium \${VARIANT_STYLES[variant]}\`}>
      {dot && <span className={\`w-1.5 h-1.5 rounded-full bg-current\`} />}
      {label}
    </span>
  );
}

// Status variant mapping helper
function getTaskStatusVariant(status: string): StatusVariant {
  switch (status) {
    case 'todo': return 'default';
    case 'in-progress': return 'info';
    case 'review': return 'warning';
    case 'done': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

function getPriorityVariant(priority: string): StatusVariant {
  switch (priority) {
    case 'urgent': return 'error';
    case 'high': return 'warning';
    case 'medium': return 'info';
    case 'low': return 'default';
    default: return 'default';
  }
}

// Usage:
// <StatusBadge label="In Progress" variant={getTaskStatusVariant('in-progress')} dot />
// <StatusBadge label="High" variant={getPriorityVariant('high')} />`,
  },

  {
    id: 'drizzle-schema-chat',
    title: 'Drizzle Schema: Chat / Messaging',
    description: 'Complete Drizzle schema for a chat application with conversations, messages, and participants.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'chat', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 20 }).notNull().default('direct'),
  name: varchar('name', { length: 200 }),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  createdBy: integer('created_by').notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  lastMessagePreview: varchar('last_message_preview', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  lastMessageIdx: index('conversations_last_message_idx').on(t.lastMessageAt),
}));

export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  isMuted: boolean('is_muted').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueParticipant: uniqueIndex('conv_participants_unique_idx').on(t.conversationId, t.userId),
  userIdx: index('conv_participants_user_idx').on(t.userId),
}));

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').notNull(),
  content: text('content'),
  type: varchar('type', { length: 20 }).notNull().default('text'),
  attachments: jsonb('attachments').$type<{ url: string; name: string; size: number; type: string }[]>(),
  replyToId: integer('reply_to_id').references((): any => chatMessages.id),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  conversationIdx: index('chat_messages_conversation_idx').on(t.conversationId, t.createdAt),
  senderIdx: index('chat_messages_sender_idx').on(t.senderId),
}));

export const messageReactions = pgTable('message_reactions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull().references(() => chatMessages.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueReaction: uniqueIndex('message_reactions_unique_idx').on(t.messageId, t.userId, t.emoji),
  messageIdx: index('message_reactions_message_idx').on(t.messageId),
}));`,
  },

  {
    id: 'drizzle-schema-education',
    title: 'Drizzle Schema: Education / LMS (Courses, Lessons, Enrollments)',
    description: 'Complete Drizzle schema for a learning management system with courses, lessons, quizzes, and progress.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'education', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  description: text('description'),
  instructorId: integer('instructor_id').notNull(),
  categoryId: integer('category_id'),
  level: varchar('level', { length: 20 }).notNull().default('beginner'),
  thumbnailUrl: text('thumbnail_url'),
  price: integer('price'),
  duration: integer('duration'),
  lessonCount: integer('lesson_count').notNull().default(0),
  enrollmentCount: integer('enrollment_count').notNull().default(0),
  rating: numeric('rating', { precision: 2, scale: 1 }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('courses_slug_idx').on(t.slug),
  instructorIdx: index('courses_instructor_idx').on(t.instructorId),
  statusIdx: index('courses_status_idx').on(t.status),
  categoryIdx: index('courses_category_idx').on(t.categoryId),
}));

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull(),
  content: text('content'),
  videoUrl: text('video_url'),
  duration: integer('duration'),
  sortOrder: integer('sort_order').notNull().default(0),
  isFree: boolean('is_free').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseOrderIdx: index('lessons_course_order_idx').on(t.courseId, t.sortOrder),
}));

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  progress: integer('progress').notNull().default(0),
  currentLessonId: integer('current_lesson_id'),
  completedLessons: integer('completed_lessons').array(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  uniqueEnrollment: uniqueIndex('enrollments_unique_idx').on(t.userId, t.courseId),
  userIdx: index('enrollments_user_idx').on(t.userId, t.status),
}));

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  passingScore: integer('passing_score').notNull().default(70),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: text('options').array().notNull(),
  correctAnswer: integer('correct_answer').notNull(),
  explanation: text('explanation'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id),
  userId: integer('user_id').notNull(),
  score: integer('score').notNull(),
  passed: boolean('passed').notNull(),
  answers: integer('answers').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userQuizIdx: index('quiz_attempts_user_quiz_idx').on(t.userId, t.quizId, t.createdAt),
}));`,
  },

  {
    id: 'date-range-picker',
    title: 'Date Range Picker Component',
    description: 'Simple date range picker with preset ranges (Today, Last 7 days, Last 30 days, Custom).',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['date-picker', 'component', 'reusable', 'filter'],
    code: `interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
}

const PRESETS = [
  { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { from: d, to: d }; } },
  { label: 'Last 7 days', getValue: () => {
    const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 7);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }},
  { label: 'Last 30 days', getValue: () => {
    const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 30);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }},
  { label: 'This month', getValue: () => {
    const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  }},
  { label: 'Last month', getValue: () => {
    const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }},
];

function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');

  const formatDisplay = (range: DateRange) => {
    const preset = PRESETS.find(p => {
      const v = p.getValue();
      return v.from === range.from && v.to === range.to;
    });
    if (preset) return preset.label;
    return \`\${range.from} – \${range.to}\`;
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {formatDisplay(value)}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-background border rounded-xl shadow-lg z-50 p-3 min-w-[240px]">
            <div className="space-y-1">
              {PRESETS.map(preset => (
                <button key={preset.label}
                  onClick={() => { onChange(preset.getValue()); setIsOpen(false); }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-muted transition-colors">
                  {preset.label}
                </button>
              ))}
            </div>
            <hr className="my-2" />
            <div className="space-y-2 px-3">
              <p className="text-xs font-medium text-muted-foreground">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={value.from}
                  onChange={e => onChange({ ...value, from: e.target.value })}
                  className="border rounded px-2 py-1 text-xs" />
                <input type="date" value={value.to}
                  onChange={e => onChange({ ...value, to: e.target.value })}
                  className="border rounded px-2 py-1 text-xs" />
              </div>
              <button onClick={() => setIsOpen(false)}
                className="w-full bg-primary text-primary-foreground text-xs py-1.5 rounded-lg font-medium">
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}`,
  },

  {
    id: 'progress-bar',
    title: 'Progress Bar Components',
    description: 'Linear and circular progress bars with labels, colors, and animations.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['progress', 'component', 'reusable', 'visualization'],
    code: `function ProgressBar({ value, max = 100, label, showValue = true, size = 'md', color = 'primary' }: {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'green' | 'yellow' | 'red';
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const colors = {
    primary: 'bg-primary',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showValue && <span className="text-sm font-medium">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={\`w-full bg-muted rounded-full overflow-hidden \${heights[size]}\`}>
        <div className={\`\${colors[color]} rounded-full transition-all duration-500 ease-out \${heights[size]}\`}
          style={{ width: \`\${percentage}%\` }}
          role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} />
      </div>
    </div>
  );
}

function StepProgress({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 \${
              i < currentStep ? 'bg-primary border-primary text-primary-foreground'
                : i === currentStep ? 'border-primary text-primary'
                : 'border-muted text-muted-foreground'
            }\`}>
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={\`text-xs mt-1 \${i <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}\`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={\`w-12 sm:w-20 h-0.5 mx-2 \${i < currentStep ? 'bg-primary' : 'bg-muted'}\`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Usage:
// <ProgressBar value={65} label="Upload Progress" color="green" />
// <StepProgress steps={['Details', 'Payment', 'Confirmation']} currentStep={1} />`,
  },

  {
    id: 'command-palette',
    title: 'Command Palette / Search Modal (Cmd+K)',
    description: 'Keyboard-driven command palette for quick navigation and actions, activated with Cmd+K.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['command-palette', 'search', 'component', 'navigation'],
    code: `interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group?: string;
}

function CommandPalette({ items, isOpen, onClose }: {
  items: CommandItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.keywords?.some(k => k.toLowerCase().includes(q))
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const group = item.group ?? 'Actions';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(item);
    }
    return groups;
  }, [filtered]);

  useEffect(() => {
    if (isOpen) { setQuery(''); setActiveIndex(0); inputRef.current?.focus(); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[activeIndex]) { filtered[activeIndex].action(); onClose(); }
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, filtered, activeIndex, onClose]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b">
          <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Type a command or search..."
            className="w-full py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          <kbd className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
          ) : (
            Array.from(grouped.entries()).map(([group, groupItems]) => (
              <div key={group}>
                <p className="text-xs text-muted-foreground font-medium px-2 py-1.5">{group}</p>
                {groupItems.map(item => {
                  const idx = flatIndex++;
                  return (
                    <button key={item.id}
                      onClick={() => { item.action(); onClose(); }}
                      className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors \${
                        idx === activeIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }\`}>
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.label}</p>
                        {item.description && <p className={\`text-xs truncate \${idx === activeIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'}\`}>{item.description}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Global keyboard shortcut
function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 4
// ============================================

export const EXPANDED_ANTI_PATTERNS_4: AntiPattern[] = [
  {
    id: 'wildcard-cors',
    name: 'Wildcard CORS in Production',
    description: 'Setting Access-Control-Allow-Origin: * on API responses in production.',
    whyBad: 'Allows any website to make requests to your API with user credentials. Attackers can build a site that makes API calls on behalf of your users. This is a serious security vulnerability for any authenticated API.',
    fix: 'Whitelist specific origins. In Express: cors({ origin: ["https://yourdomain.com", "https://app.yourdomain.com"], credentials: true }). In development, you can use * but never in production.',
    severity: 'critical',
    badExample: 'app.use(cors({ origin: "*" })); // Accepts requests from ANY website',
    goodExample: 'app.use(cors({ origin: config.CORS_ORIGINS, credentials: true })); // config.CORS_ORIGINS = ["https://yourdomain.com"]',
    tags: ['security', 'api', 'cors'],
  },
  {
    id: 'blocking-event-loop',
    name: 'Blocking the Event Loop',
    description: 'Running CPU-intensive operations (large JSON parse, crypto, regex) synchronously in request handlers.',
    whyBad: 'Node.js runs on a single thread. CPU-intensive work blocks ALL concurrent requests. A 100ms computation blocks 100ms of processing for every user.',
    fix: 'Move CPU-intensive work to: (1) Worker threads (worker_threads module). (2) Background jobs (BullMQ). (3) Separate microservice. For crypto: use async versions (crypto.pbkdf2, not crypto.pbkdf2Sync).',
    severity: 'critical',
    badExample: 'app.get("/report", (req, res) => { const data = processMillionRows(rows); res.json(data); }); // Blocks all requests',
    goodExample: 'app.post("/report", (req, res) => { const jobId = await jobQueue.enqueue("generate-report", req.body); res.status(202).json({ jobId }); });',
    tags: ['node', 'performance', 'architecture'],
  },
  {
    id: 'state-in-module-scope',
    name: 'Mutable State in Module Scope',
    description: 'Storing request-scoped data in module-level variables instead of request/context scope.',
    whyBad: 'Module-level variables are shared across ALL requests. Two concurrent requests can overwrite each other\'s data, causing data leaks between users.',
    fix: 'Store request-scoped data in: (1) req object (req.user, req.tenantId). (2) AsyncLocalStorage for cross-function context. (3) Function parameters. Module scope is only for static configuration and singletons (db pool, config).',
    severity: 'critical',
    badExample: 'let currentUser: User; // Module scope — SHARED between requests! app.use((req) => { currentUser = req.user; });',
    goodExample: 'app.use((req, res, next) => { req.user = verifyToken(req); next(); }); // Request-scoped',
    tags: ['node', 'security', 'concurrency'],
  },
  {
    id: 'no-request-id',
    name: 'No Request ID / Correlation ID',
    description: 'Not attaching unique IDs to requests for tracing through logs and services.',
    whyBad: 'Without request IDs, you cannot correlate log entries for the same request. Debugging production issues requires manually matching timestamps across log lines.',
    fix: 'Generate a UUID for each request. Attach it to req, logs, and response headers. Pass it to downstream services. Use structured logging with the request ID as context.',
    severity: 'medium',
    badExample: 'console.log("User created"); console.log("Email sent"); // Which request? Which user? No way to tell.',
    goodExample: 'req.requestId = crypto.randomUUID(); logger.info({ requestId: req.requestId, userId }, "User created");',
    tags: ['logging', 'debugging', 'observability'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 4
// ============================================

export const EXPANDED_BEST_PRACTICES_4: BestPractice[] = [
  {
    id: 'error-recovery-ux',
    title: 'Error Recovery UX Patterns',
    category: 'ux',
    description: 'Handle errors gracefully with clear messages, recovery options, and inline feedback.',
    do: [
      'Show specific error messages that help users fix the issue: "Email already registered" not "Error 409"',
      'Provide recovery actions: retry buttons, edit links, contact support links',
      'Show inline validation errors next to the relevant field, not in a toast',
      'Maintain form data on error — never clear the form after a failed submission',
      'Show server validation errors inline on the relevant field (setError in React Hook Form)',
      'Use optimistic updates with rollback for toggle actions (like, complete, archive)',
      'Log errors to a monitoring service (Sentry) with context for debugging',
    ],
    dont: [
      'Show generic "Something went wrong" without actionable recovery steps',
      'Clear form data after a failed submission — the user has to re-enter everything',
      'Show raw API error messages to users ("Error: UNIQUE constraint failed")',
      'Use alert() for errors — use inline messages or toasts',
      'Show errors only in toasts for form validation — inline errors are more discoverable',
    ],
    languages: ['typescript'],
  },
  {
    id: 'typescript-best-practices',
    title: 'TypeScript Best Practices',
    category: 'architecture',
    description: 'Write type-safe, maintainable TypeScript with proper types, generics, and error handling.',
    do: [
      'Use strict TypeScript config: strict: true, noUncheckedIndexedAccess: true',
      'Define interfaces for all data shapes — especially API responses and database rows',
      'Use discriminated unions for state: { status: "loading" } | { status: "error"; error: string } | { status: "success"; data: T }',
      'Use Zod for runtime validation + TypeScript type inference: z.infer<typeof schema>',
      'Use generics for reusable utility functions and components: function paginate<T>(items: T[], page: number): T[]',
      'Prefer type inference over explicit types when the type is obvious: const name = "John" not const name: string = "John"',
      'Use satisfies operator for type checking without widening: const config = { ... } satisfies Config',
    ],
    dont: [
      'Use "any" — use "unknown" if the type is genuinely unknown, then narrow with type guards',
      'Use type assertions (as) unless you truly know more than the compiler',
      'Use enums — use const objects or union types instead: type Status = "active" | "archived"',
      'Ignore TypeScript errors with @ts-ignore — fix the underlying type issue',
      'Use {} as a type — it matches any non-null value. Use Record<string, unknown> or a specific interface',
    ],
    languages: ['typescript'],
  },
  {
    id: 'environment-management',
    title: 'Environment & Deployment Best Practices',
    category: 'deployment',
    description: 'Manage environments, secrets, and deployments safely.',
    do: [
      'Validate ALL environment variables at startup with Zod — fail fast if config is missing',
      'Use different .env files per environment: .env.development, .env.production',
      'Set NODE_ENV=production in production — libraries optimize based on this',
      'Implement health check endpoints (/health, /ready) for load balancers',
      'Implement graceful shutdown — close DB connections on SIGTERM',
      'Use structured JSON logging in production (not console.log)',
      'Set appropriate HTTP cache headers (Cache-Control) per endpoint',
      'Use HTTPS everywhere — redirect HTTP to HTTPS',
    ],
    dont: [
      'Store secrets in source code or .env files committed to git',
      'Use console.log in production — use a structured logger (pino)',
      'Skip health checks — load balancers need them for routing decisions',
      'Deploy without graceful shutdown — in-flight requests will be dropped',
      'Use the same JWT secret across environments',
    ],
    languages: ['typescript'],
  },
  {
    id: 'data-fetching-client',
    title: 'Client-Side Data Fetching Best Practices',
    category: 'react',
    description: 'Fetch, cache, and display data in React applications with React Query.',
    do: [
      'Create a typed API client: const api = { getUsers: () => fetch("/api/users").then(handleResponse) }',
      'Wrap fetch calls in a handleResponse function that checks res.ok and throws on error',
      'Use React Query for all server state (caching, loading, error, refetch)',
      'Show loading skeletons (not spinners) that match the content layout',
      'Handle 3 states minimum: loading, error, empty — plus the happy path',
      'Use AbortController in custom hooks to cancel in-flight requests on unmount',
      'Debounce search inputs (300ms) to avoid excessive API calls',
      'Use cursor-based pagination for infinite scroll, offset pagination for numbered pages',
    ],
    dont: [
      'Use useEffect + useState for data fetching — React Query handles this better',
      'Forget to handle errors — always show an error message with a retry option',
      'Fetch all data upfront — paginate and lazy-load for large datasets',
      'Make API calls on every keystroke — debounce search inputs',
      'Trust client-side data for important operations — always validate server-side',
    ],
    languages: ['typescript'],
  },
];
