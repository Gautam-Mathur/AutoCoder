import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 5
// Advanced Patterns: Rate Limiting, Caching, Logging, Monitoring,
// CI/CD, Database Migrations, Testing Strategies, API Versioning,
// File Uploads, Email Sending, PDF Generation, CSV Export
// ============================================

export const EXPANDED_CONCEPTS_5: Record<string, Concept> = {

  rate_limiting: {
    id: 'rate-limiting',
    name: 'API Rate Limiting',
    category: 'security',
    description: 'Protect APIs from abuse by limiting request frequency per user, IP, or API key.',
    explanation: 'Rate limiting prevents abuse, DDoS, and runaway scripts from overwhelming your API. Strategies: (1) Fixed window — count requests in fixed time windows (e.g., 100 requests per minute). Simple but allows bursts at window boundaries. (2) Sliding window — smoother rate limiting using a rolling time window. (3) Token bucket — tokens are added at a fixed rate; each request consumes a token. Allows short bursts but maintains average rate. Use Redis for distributed rate limiting across multiple server instances. Return 429 Too Many Requests with Retry-After header.',
    examples: [
      `import rateLimit from 'express-rate-limit';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.user?.id?.toString() ?? req.ip,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 min
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: { error: 'Upload limit reached. Try again later.' },
  keyGenerator: (req) => req.user?.id?.toString() ?? req.ip,
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

// Custom rate limiter with Redis for distributed systems
import { Redis } from 'ioredis';

class RedisRateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async isAllowed(key: string, maxRequests: number, windowSec: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = \`ratelimit:\${key}:\${Math.floor(now / windowSec)}\`;

    const count = await this.redis.incr(windowKey);
    if (count === 1) {
      await this.redis.expire(windowKey, windowSec);
    }

    const remaining = Math.max(0, maxRequests - count);
    const resetAt = (Math.floor(now / windowSec) + 1) * windowSec;

    return { allowed: count <= maxRequests, remaining, resetAt };
  }
}

function rateLimitMiddleware(limiter: RedisRateLimiter, maxRequests: number, windowSec: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.id?.toString() ?? req.ip;
    const result = await limiter.isAllowed(key, maxRequests, windowSec);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.resetAt - Math.floor(Date.now() / 1000));
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    next();
  };
}`,
    ],
    relatedConcepts: ['middleware-pattern', 'rest-api-design', 'webhook-patterns'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  structured_logging: {
    id: 'structured-logging',
    name: 'Structured Logging with Pino',
    category: 'devops',
    description: 'Production-grade logging with JSON output, log levels, request context, and child loggers.',
    explanation: 'Structured logging outputs JSON instead of plain text, making logs machine-parseable for log aggregation tools (Datadog, ELK, CloudWatch). Key practices: (1) Use log levels: fatal > error > warn > info > debug > trace. (2) Include context: requestId, userId, operation, duration. (3) Use child loggers to add context automatically. (4) Never log sensitive data (passwords, tokens, PII). (5) Log at the right level — info for business events, error for failures, debug for development.',
    examples: [
      `import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined, // JSON in production
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
    censor: '[REDACTED]',
  },
});

// Request logging middleware
function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  req.log = logger.child({
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  const startTime = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      statusCode: _res.statusCode,
      duration,
      userId: (req as any).user?.id,
    };

    if (_res.statusCode >= 500) {
      req.log.error(logData, 'Request completed with server error');
    } else if (_res.statusCode >= 400) {
      req.log.warn(logData, 'Request completed with client error');
    } else {
      req.log.info(logData, 'Request completed');
    }
  });

  next();
}

// Usage in services
async function createUser(data: CreateUserInput, requestLog: pino.Logger) {
  const log = requestLog.child({ operation: 'createUser', email: data.email });

  log.info('Creating user');

  try {
    const user = await db.insert(users).values(data).returning();
    log.info({ userId: user[0].id }, 'User created successfully');
    return user[0];
  } catch (err) {
    log.error({ err }, 'Failed to create user');
    throw err;
  }
}`,
    ],
    relatedConcepts: ['audit-logging', 'graceful-shutdown', 'environment-config'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  file_upload_patterns: {
    id: 'file-upload-patterns',
    name: 'File Upload Handling',
    category: 'architecture',
    description: 'Handle file uploads with validation, size limits, type checking, and storage (local or S3).',
    explanation: 'File uploads are a common security risk. Always: (1) Validate file type by checking magic bytes, not just the extension. (2) Enforce size limits (multer maxFileSize). (3) Generate unique filenames (UUID) — never use the original filename. (4) Scan for malware if accepting from untrusted users. (5) Store outside the web root or use object storage (S3, R2). (6) Serve through a CDN with proper Cache-Control headers.',
    examples: [
      `import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error(\`File type \${file.mimetype} is not allowed\`));
    }
    cb(null, true);
  },
});

// Single file upload
app.post('/api/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const [attachment] = await db.insert(attachments).values({
    filename: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: \`/uploads/\${req.file.filename}\`,
    uploadedBy: req.user!.id,
  }).returning();

  res.status(201).json(attachment);
}));

// Multiple file upload
app.post('/api/upload/multiple', authenticate, upload.array('files', 5), asyncHandler(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) return res.status(400).json({ error: 'No files provided' });

  const results = await db.insert(attachments).values(
    files.map(f => ({
      filename: f.originalname,
      storedName: f.filename,
      mimeType: f.mimetype,
      size: f.size,
      url: \`/uploads/\${f.filename}\`,
      uploadedBy: req.user!.id,
    }))
  ).returning();

  res.status(201).json(results);
}));

// Delete file
app.delete('/api/attachments/:id', authenticate, asyncHandler(async (req, res) => {
  const [attachment] = await db.select().from(attachments)
    .where(and(eq(attachments.id, Number(req.params.id)), eq(attachments.uploadedBy, req.user!.id)))
    .limit(1);

  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  await fs.unlink(path.join('./uploads', attachment.storedName)).catch(() => {});
  await db.delete(attachments).where(eq(attachments.id, attachment.id));

  res.json({ message: 'Deleted' });
}));

// Serve uploads with caching
app.use('/uploads', express.static('./uploads', {
  maxAge: '30d',
  immutable: true,
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));`,
    ],
    relatedConcepts: ['rest-api-design', 'image-optimization', 'webhook-patterns'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  email_sending: {
    id: 'email-sending',
    name: 'Transactional Email Sending',
    category: 'architecture',
    description: 'Send transactional emails (welcome, reset password, notifications) with templates and queue.',
    explanation: 'Never send emails synchronously in request handlers — it blocks the response and can fail silently. Instead: (1) Enqueue email jobs. (2) Process in background workers. (3) Use templates for consistent branding. (4) Track delivery (sent, opened, bounced). Services: Resend, SendGrid, AWS SES, Postmark. For development, use Ethereal (free fake SMTP) or MailHog.',
    examples: [
      `import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'noreply@yourapp.com';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function welcomeEmail(name: string): EmailTemplate {
  return {
    subject: \`Welcome to YourApp, \${name}!\`,
    html: \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; font-size: 24px;">Welcome, \${name}!</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Thanks for signing up. Here are a few things you can do to get started:
        </p>
        <ul style="color: #666; font-size: 16px; line-height: 1.8;">
          <li>Complete your profile</li>
          <li>Create your first project</li>
          <li>Invite your team</li>
        </ul>
        <a href="\${process.env.APP_URL}/dashboard"
          style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Go to Dashboard
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          If you didn't create this account, you can ignore this email.
        </p>
      </div>
    \`,
    text: \`Welcome, \${name}! Thanks for signing up. Visit \${process.env.APP_URL}/dashboard to get started.\`,
  };
}

function resetPasswordEmail(name: string, resetUrl: string): EmailTemplate {
  return {
    subject: 'Reset your password',
    html: \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; font-size: 24px;">Reset your password</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Hi \${name}, we received a request to reset your password. Click the button below:
        </p>
        <a href="\${resetUrl}"
          style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 14px; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    \`,
    text: \`Hi \${name}, reset your password here: \${resetUrl}. This link expires in 1 hour.\`,
  };
}

async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

// Usage with background jobs
jobQueue.register('send-email', async (payload: { to: string; template: string; data: Record<string, string> }) => {
  let template: EmailTemplate;
  switch (payload.template) {
    case 'welcome': template = welcomeEmail(payload.data.name); break;
    case 'reset-password': template = resetPasswordEmail(payload.data.name, payload.data.resetUrl); break;
    default: throw new Error(\`Unknown email template: \${payload.template}\`);
  }
  await sendEmail(payload.to, template);
});`,
    ],
    relatedConcepts: ['background-jobs', 'webhook-patterns', 'environment-config'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  csv_export: {
    id: 'csv-export',
    name: 'CSV / Data Export Patterns',
    category: 'ux',
    description: 'Export data as CSV or Excel files with proper encoding, streaming, and download handling.',
    explanation: 'Data export is essential for business users. Best practices: (1) Stream large exports — don\'t load everything into memory. (2) Use proper CSV encoding (UTF-8 BOM for Excel compatibility). (3) Format dates and numbers for the user\'s locale. (4) Include column headers. (5) For large datasets, generate the file in a background job and send a download link.',
    examples: [
      `// Simple CSV export endpoint
app.get('/api/export/tasks', authenticate, asyncHandler(async (req, res) => {
  const userTasks = await db.select({
    id: tasks.id,
    title: tasks.title,
    status: tasks.status,
    priority: tasks.priority,
    assignee: users.name,
    dueDate: tasks.dueDate,
    createdAt: tasks.createdAt,
  })
  .from(tasks)
  .leftJoin(users, eq(tasks.assigneeId, users.id))
  .where(eq(tasks.createdBy, req.user!.id))
  .orderBy(desc(tasks.createdAt));

  const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created'];
  const rows = userTasks.map(t => [
    t.id,
    escapeCsvField(t.title),
    t.status,
    t.priority,
    t.assignee ?? '',
    t.dueDate ?? '',
    new Date(t.createdAt).toLocaleDateString(),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\\n');

  // UTF-8 BOM for Excel compatibility
  const bom = '\\uFEFF';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', \`attachment; filename="tasks-\${new Date().toISOString().split('T')[0]}.csv"\`);
  res.send(bom + csv);
}));

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
    return \`"\${value.replace(/"/g, '""')}"\`;
  }
  return value;
}

// JSON export endpoint
app.get('/api/export/tasks.json', authenticate, asyncHandler(async (req, res) => {
  const data = await db.select().from(tasks)
    .where(eq(tasks.createdBy, req.user!.id))
    .orderBy(desc(tasks.createdAt));

  res.setHeader('Content-Disposition', \`attachment; filename="tasks-\${new Date().toISOString().split('T')[0]}.json"\`);
  res.json({ exportedAt: new Date().toISOString(), count: data.length, data });
}));

// React: trigger download from button
function ExportButton({ endpoint, filename }: { endpoint: string; filename: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={isExporting}
      className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted disabled:opacity-50">
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}`,
    ],
    relatedConcepts: ['rest-api-design', 'background-jobs', 'cursor-pagination'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  api_versioning: {
    id: 'api-versioning',
    name: 'API Versioning Strategies',
    category: 'architecture',
    description: 'Version your API to introduce breaking changes without disrupting existing clients.',
    explanation: 'When your API evolves, you need versioning to avoid breaking existing clients. Strategies: (1) URL path versioning (/api/v1/users, /api/v2/users) — most common, easiest to understand. (2) Header versioning (Accept: application/vnd.api+json;version=2) — cleaner URLs but harder to test. (3) Query parameter (?version=2) — easy but not RESTful. For most apps, use URL path versioning. When to version: adding required fields, changing response structure, removing endpoints, changing behavior.',
    examples: [
      `// URL path versioning with Express
import { Router } from 'express';

// V1 routes
const v1Router = Router();

v1Router.get('/users', asyncHandler(async (req, res) => {
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(users);
  res.json(allUsers); // V1: flat array
}));

// V2 routes — breaking changes
const v2Router = Router();

v2Router.get('/users', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) ?? 1;
  const limit = Math.min(Number(req.query.limit) ?? 20, 100);
  const offset = (page - 1) * limit;

  const [allUsers, [{ count }]] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    }).from(users).limit(limit).offset(offset),
    db.select({ count: sql<number>\`count(*)\` }).from(users),
  ]);

  res.json({
    data: allUsers,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  }); // V2: paginated envelope
}));

// Mount versioned routes
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Redirect /api/users to latest version
app.use('/api/users', (_req, res) => {
  res.redirect(301, '/api/v2/users');
});`,
    ],
    relatedConcepts: ['rest-api-design', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  database_migrations: {
    id: 'database-migrations',
    name: 'Database Migration Best Practices',
    category: 'database',
    description: 'Manage database schema changes safely with versioned, reversible migrations.',
    explanation: 'Migrations are versioned scripts that change your database schema over time. Best practices: (1) Never edit existing migrations — always create new ones. (2) Make migrations reversible (up/down). (3) Test migrations on a copy of production data before deploying. (4) Never drop columns in the same deploy that removes the code using them — deploy in two phases. (5) Add columns as nullable first, then backfill, then add NOT NULL constraint. (6) Use Drizzle push for development, migrations for production.',
    examples: [
      `// Drizzle migration workflow
// Development: Use db:push for quick schema sync
// npx drizzle-kit push

// Production: Generate and run migrations
// npx drizzle-kit generate
// npx drizzle-kit migrate

// Safe column addition pattern (2-phase):
// Phase 1: Add nullable column + deploy code that writes to it
// ALTER TABLE users ADD COLUMN bio TEXT; -- nullable

// Phase 2: Backfill + make NOT NULL (if needed)
// UPDATE users SET bio = '' WHERE bio IS NULL;
// ALTER TABLE users ALTER COLUMN bio SET NOT NULL;

// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

// Safe index creation (non-blocking)
// CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
// Note: CONCURRENTLY prevents table locks but cannot run in a transaction`,
    ],
    relatedConcepts: ['database-transactions-advanced', 'environment-config', 'optimistic-locking'],
    difficulty: 'intermediate',
    languages: ['typescript', 'sql'],
  },

  graceful_shutdown: {
    id: 'graceful-shutdown',
    name: 'Graceful Shutdown Pattern',
    category: 'deployment',
    description: 'Handle process termination gracefully by finishing in-flight requests and closing connections.',
    explanation: 'When your server receives SIGTERM (from a deploy, restart, or scale-down), it should: (1) Stop accepting new connections. (2) Wait for in-flight requests to complete (with a timeout). (3) Close database pools and other connections. (4) Exit cleanly. Without graceful shutdown, users get connection reset errors during deployments.',
    examples: [
      `import { Server } from 'http';

function setupGracefulShutdown(server: Server, cleanups: Array<() => Promise<void>>) {
  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(\`Received \${signal}. Starting graceful shutdown...\`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('HTTP server closed');

      // Run cleanup tasks (close DB, Redis, etc.)
      for (const cleanup of cleanups) {
        try {
          await cleanup();
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }

      console.log('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Middleware to reject new requests during shutdown
  return (req: Request, res: Response, next: NextFunction) => {
    if (isShuttingDown) {
      res.setHeader('Connection', 'close');
      return res.status(503).json({ error: 'Server is shutting down' });
    }
    next();
  };
}

// Usage
const server = app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));

const shutdownMiddleware = setupGracefulShutdown(server, [
  async () => { await db.$client.end(); console.log('Database pool closed'); },
  async () => { await redis.quit(); console.log('Redis connection closed'); },
]);

app.use(shutdownMiddleware);`,
    ],
    relatedConcepts: ['structured-logging', 'environment-config', 'background-jobs'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  health_checks: {
    id: 'health-checks',
    name: 'Health Check Endpoints',
    category: 'deployment',
    description: 'Expose health check endpoints for load balancers, monitoring, and container orchestration.',
    explanation: 'Health checks tell infrastructure whether your service is ready to accept traffic. Two types: (1) Liveness — "is the process alive?" Simple 200 response. Used by Kubernetes to restart crashed containers. (2) Readiness — "can this instance handle requests?" Checks DB, Redis, and other dependencies. Used by load balancers to route traffic. Keep health checks fast (<1s) and don\'t cache them.',
    examples: [
      `app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/health/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // Check database
  try {
    await db.execute(sql\`SELECT 1\`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Check Redis (if used)
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
    uptime: process.uptime(),
    version: process.env.APP_VERSION ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});`,
    ],
    relatedConcepts: ['graceful-shutdown', 'structured-logging'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  testing_strategies: {
    id: 'testing-strategies',
    name: 'Testing Strategy for Full-Stack Apps',
    category: 'testing',
    description: 'Test pyramid: unit tests for logic, integration tests for APIs, e2e tests for critical flows.',
    explanation: 'The test pyramid: (1) Unit tests (many, fast) — test pure functions, utilities, validation logic. (2) Integration tests (medium) — test API endpoints with a real database. (3) E2E tests (few, slow) — test critical user flows through the browser. Write tests for: business logic, API endpoints (happy path + error cases), authentication flows, payment flows. Skip tests for: simple getters/setters, framework code, trivial components.',
    examples: [
      `// Unit test: pure function
import { describe, it, expect } from 'vitest';
import { validateEmail, slugify, calculateDiscount } from '../utils';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@example.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('slugify', () => {
  it('converts to lowercase kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    expect(slugify('Special Ch@r$!')).toBe('special-chr');
  });
});

// Integration test: API endpoint
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('POST /api/tasks', () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = res.body.token;
  });

  it('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', \`Bearer \${authToken}\`)
      .send({ title: 'Test Task', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Test Task',
      priority: 'high',
      status: 'todo',
    });
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', \`Bearer \${authToken}\`)
      .send({ priority: 'high' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('title');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test' });

    expect(res.status).toBe(401);
  });
});`,
    ],
    relatedConcepts: ['tdd', 'rest-api-design'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 5
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_5: Record<string, EntityArchetype> = {

  payment: {
    id: 'payment',
    name: 'Payment / Transaction',
    aliases: ['transaction', 'charge', 'invoice-payment'],
    domain: 'billing',
    description: 'A financial transaction with amount, currency, status, and payment method.',
    traits: ['auditable', 'pageable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Payer' },
      { name: 'amount', type: 'integer not null', nullable: false, description: 'Amount in cents' },
      { name: 'currency', type: "varchar(3) not null default 'usd'", nullable: false, description: 'ISO 4217 currency code' },
      { name: 'status', type: 'varchar(20) not null', nullable: false, description: 'pending|succeeded|failed|refunded' },
      { name: 'paymentMethod', type: 'varchar(30)', nullable: true, description: 'card|bank_transfer|paypal' },
      { name: 'stripePaymentIntentId', type: 'varchar(100)', nullable: true, description: 'Stripe payment intent ID' },
      { name: 'description', type: 'varchar(300)', nullable: true, description: 'Payment description' },
      { name: 'metadata', type: 'jsonb', nullable: true, description: 'Additional metadata' },
      { name: 'refundedAt', type: 'timestamptz', nullable: true, description: 'Refund timestamp' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Payment time' },
    ],
    relatedEntities: ['user', 'subscription', 'invoice'],
    suggestedIndexes: ['userId', 'stripePaymentIntentId', '(userId, status, createdAt DESC)'],
    typicalEndpoints: [
      'GET /payments?status=succeeded&page=1',
      'GET /payments/:id',
      'POST /payments/create-intent',
      'POST /payments/:id/refund',
    ],
  },

  subscription: {
    id: 'subscription',
    name: 'Subscription',
    aliases: ['plan', 'membership', 'tier'],
    domain: 'billing',
    description: 'Recurring subscription with plan, billing cycle, and status.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Subscriber' },
      { name: 'planId', type: 'varchar(50) not null', nullable: false, description: 'Plan identifier (free, pro, enterprise)' },
      { name: 'status', type: 'varchar(20) not null', nullable: false, description: 'active|past_due|canceled|trialing' },
      { name: 'stripeSubscriptionId', type: 'varchar(100)', nullable: true, description: 'Stripe subscription ID' },
      { name: 'currentPeriodStart', type: 'timestamptz not null', nullable: false, description: 'Current billing period start' },
      { name: 'currentPeriodEnd', type: 'timestamptz not null', nullable: false, description: 'Current billing period end' },
      { name: 'canceledAt', type: 'timestamptz', nullable: true, description: 'When the user canceled' },
      { name: 'cancelAtPeriodEnd', type: 'boolean not null default false', nullable: false, description: 'Cancel at end of billing period' },
      { name: 'trialEnd', type: 'timestamptz', nullable: true, description: 'Trial expiration' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'payment'],
    suggestedIndexes: ['userId (unique for single-sub)', 'stripeSubscriptionId', '(status, currentPeriodEnd)'],
    typicalEndpoints: [
      'GET /subscription',
      'POST /subscription/create',
      'POST /subscription/cancel',
      'POST /subscription/resume',
      'PATCH /subscription/plan',
    ],
  },

  review: {
    id: 'review',
    name: 'Review / Rating',
    aliases: ['testimonial', 'feedback', 'rating'],
    domain: 'general',
    description: 'User review with rating, comment, and moderation status.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Reviewer' },
      { name: 'targetType', type: 'varchar(50) not null', nullable: false, description: 'What is being reviewed (product, course, etc.)' },
      { name: 'targetId', type: 'integer not null', nullable: false, description: 'ID of the reviewed entity' },
      { name: 'rating', type: 'integer not null', nullable: false, description: 'Rating 1-5' },
      { name: 'title', type: 'varchar(200)', nullable: true, description: 'Review title' },
      { name: 'comment', type: 'text', nullable: true, description: 'Review body' },
      { name: 'isVerified', type: 'boolean not null default false', nullable: false, description: 'Verified purchase/enrollment' },
      { name: 'helpfulCount', type: 'integer not null default 0', nullable: false, description: 'Helpful votes' },
      { name: 'status', type: "varchar(20) not null default 'published'", nullable: false, description: 'published|pending|flagged|removed' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Review time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['(targetType, targetId, createdAt DESC)', '(userId, targetType, targetId) unique'],
    typicalEndpoints: [
      'GET /reviews?targetType=product&targetId=1',
      'POST /reviews',
      'PATCH /reviews/:id',
      'DELETE /reviews/:id',
      'POST /reviews/:id/helpful',
    ],
  },

  invitation: {
    id: 'invitation',
    name: 'Invitation',
    aliases: ['invite', 'team-invite'],
    domain: 'general',
    description: 'Team or organization invitation with token, role, and expiration.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'organizationId', type: 'integer not null', nullable: false, description: 'Target organization' },
      { name: 'email', type: 'varchar(255) not null', nullable: false, description: 'Invitee email' },
      { name: 'role', type: "varchar(20) not null default 'member'", nullable: false, description: 'Invited role' },
      { name: 'token', type: 'varchar(100) not null unique', nullable: false, description: 'Unique invitation token' },
      { name: 'invitedBy', type: 'integer not null references users(id)', nullable: false, description: 'Who sent the invite' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|accepted|expired|revoked' },
      { name: 'acceptedAt', type: 'timestamptz', nullable: true, description: 'When accepted' },
      { name: 'expiresAt', type: 'timestamptz not null', nullable: false, description: 'Expiration time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['token (unique)', '(email, organizationId)', '(organizationId, status)'],
    typicalEndpoints: [
      'GET /invitations',
      'POST /invitations',
      'POST /invitations/:token/accept',
      'DELETE /invitations/:id (revoke)',
    ],
  },

  activity_log: {
    id: 'activity-log',
    name: 'Activity Feed Item',
    aliases: ['activity', 'event', 'timeline-entry'],
    domain: 'general',
    description: 'Activity feed entry showing user actions (created, updated, commented, assigned).',
    traits: ['pageable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'actorId', type: 'integer not null references users(id)', nullable: false, description: 'Who performed the action' },
      { name: 'action', type: 'varchar(50) not null', nullable: false, description: 'created|updated|deleted|assigned|commented|completed' },
      { name: 'targetType', type: 'varchar(50) not null', nullable: false, description: 'Entity type (task, project, document)' },
      { name: 'targetId', type: 'integer not null', nullable: false, description: 'Entity ID' },
      { name: 'targetTitle', type: 'varchar(300)', nullable: true, description: 'Snapshot of entity title (for display when entity is deleted)' },
      { name: 'metadata', type: 'jsonb', nullable: true, description: 'Additional context (field changes, assignee name, etc.)' },
      { name: 'projectId', type: 'integer', nullable: true, description: 'Scoping to a project for filtered feeds' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'When the action occurred' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['(projectId, createdAt DESC)', '(actorId, createdAt DESC)', '(targetType, targetId, createdAt DESC)'],
    typicalEndpoints: [
      'GET /activity?projectId=1&page=1',
      'GET /activity/me',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 5
// ============================================

export const EXPANDED_DOMAIN_MODELS_5: Record<string, DomainModel> = {

  'marketplace': {
    id: 'marketplace',
    name: 'Marketplace / Multi-Vendor Platform',
    description: 'Two-sided marketplace where sellers list products and buyers purchase, with reviews and order management.',
    coreEntities: ['user', 'seller_profile', 'product', 'order', 'order_item'],
    optionalEntities: ['review', 'category', 'wishlist', 'message', 'payout', 'dispute'],
    keyRelationships: [
      'seller_profile belongs to user (userId FK)',
      'product belongs to seller_profile (sellerId FK)',
      'product belongs to category (categoryId FK)',
      'order belongs to buyer user (userId FK)',
      'order_item belongs to order and product',
      'review belongs to user and product',
    ],
    typicalFeatures: [
      'Seller registration and verification',
      'Product listing with images, pricing, and inventory',
      'Category browsing and search with filters',
      'Shopping cart and checkout',
      'Order management for buyers and sellers',
      'Review and rating system',
      'Seller dashboard with sales analytics',
      'Buyer-seller messaging',
      'Payout management for sellers',
      'Dispute resolution',
      'Wishlist / favorites',
    ],
    securityConsiderations: [
      'Seller identity verification',
      'Payment escrow until delivery confirmed',
      'Review authenticity (only verified buyers can review)',
      'Product listing moderation',
      'Rate limiting on listing creation',
      'Prevent sellers from buying their own products',
    ],
    suggestedIndexStrategy: [
      'products: (sellerId, status) for seller dashboard',
      'products: (categoryId, status, createdAt DESC) for browsing',
      'products: Full-text on (name, description) for search',
      'orders: (userId, createdAt DESC) for buyer order history',
      'orders: (sellerId, status) for seller order management',
      'reviews: (productId, createdAt DESC) for product reviews',
    ],
  },

  'booking': {
    id: 'booking-platform',
    name: 'Booking / Reservation Platform',
    description: 'Service booking with availability calendars, time slots, confirmations, and reminders.',
    coreEntities: ['provider', 'service', 'availability', 'booking', 'user'],
    optionalEntities: ['review', 'payment', 'notification', 'cancellation'],
    keyRelationships: [
      'provider is a user with provider profile',
      'service belongs to provider',
      'availability belongs to provider (weekly schedule + exceptions)',
      'booking references service, provider, and customer user',
      'payment belongs to booking',
    ],
    typicalFeatures: [
      'Provider profiles with services and pricing',
      'Availability calendar with weekly schedule',
      'Time slot selection with conflict prevention',
      'Booking confirmation and cancellation',
      'Email/SMS reminders before appointments',
      'Online payment at booking time',
      'Review and rating after appointment',
      'Provider dashboard with calendar view',
      'Customer booking history',
      'Cancellation policies and refunds',
      'Buffer time between appointments',
      'Multi-service bookings',
    ],
    securityConsiderations: [
      'Prevent double-booking (database-level constraints)',
      'Cancellation window enforcement',
      'Payment hold and release patterns',
      'Provider verification',
    ],
    suggestedIndexStrategy: [
      'bookings: (providerId, date, startTime) for calendar views',
      'bookings: (userId, createdAt DESC) for customer history',
      'bookings: (status, date) for upcoming bookings',
      'availability: (providerId, dayOfWeek) for schedule lookup',
    ],
  },

  'real-estate': {
    id: 'real-estate',
    name: 'Real Estate / Property Listing',
    description: 'Property listing and search with filters, maps, favorites, and inquiry management.',
    coreEntities: ['property', 'user', 'inquiry', 'favorite'],
    optionalEntities: ['property_image', 'agent', 'viewing', 'neighborhood'],
    keyRelationships: [
      'property belongs to agent/user (listedBy FK)',
      'property_image belongs to property',
      'inquiry belongs to property and user',
      'favorite links user to property',
      'viewing belongs to property, user, and agent',
    ],
    typicalFeatures: [
      'Property search with advanced filters (price, bedrooms, location, type)',
      'Map-based browsing with clustering',
      'Property detail pages with photo gallery',
      'Save to favorites / watchlist',
      'Inquiry / contact form per property',
      'Agent profiles',
      'Schedule viewing appointments',
      'Price history and comparisons',
      'Neighborhood information',
      'Similar property recommendations',
      'Recently viewed properties',
    ],
    securityConsiderations: [
      'Rate limit inquiries to prevent spam',
      'Agent verification',
      'Prevent scraping of contact information',
    ],
    suggestedIndexStrategy: [
      'properties: (status, city, price) for filtered search',
      'properties: (listedBy, status) for agent dashboard',
      'properties: geo index for map-based search',
      'favorites: (userId, propertyId) unique',
      'inquiries: (propertyId, createdAt DESC)',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 5
// ============================================

export const EXPANDED_CODE_SNIPPETS_5: CodeSnippet[] = [

  {
    id: 'drizzle-schema-marketplace',
    title: 'Drizzle Schema: Marketplace (Products, Orders, Reviews)',
    description: 'Complete schema for a multi-vendor marketplace with products, orders, and reviews.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'marketplace', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const sellerProfiles = pgTable('seller_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  storeName: varchar('store_name', { length: 200 }).notNull(),
  storeSlug: varchar('store_slug', { length: 200 }).notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  isVerified: boolean('is_verified').notNull().default(false),
  rating: numeric('rating', { precision: 2, scale: 1 }),
  totalSales: integer('total_sales').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').notNull().references(() => sellerProfiles.id),
  name: varchar('name', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  compareAtPrice: integer('compare_at_price'),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  categoryId: integer('category_id'),
  images: jsonb('images').$type<{ url: string; alt: string }[]>().notNull().default([]),
  stock: integer('stock').notNull().default(0),
  sku: varchar('sku', { length: 50 }),
  weight: integer('weight'),
  tags: text('tags').array(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  rating: numeric('rating', { precision: 2, scale: 1 }),
  reviewCount: integer('review_count').notNull().default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sellerIdx: index('products_seller_idx').on(t.sellerId, t.status),
  categoryIdx: index('products_category_idx').on(t.categoryId, t.status),
  slugIdx: uniqueIndex('products_slug_idx').on(t.sellerId, t.slug),
  priceIdx: index('products_price_idx').on(t.price),
}));

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  userId: integer('user_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  subtotal: integer('subtotal').notNull(),
  tax: integer('tax').notNull().default(0),
  shipping: integer('shipping').notNull().default(0),
  total: integer('total').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  shippingAddress: jsonb('shipping_address').$type<{
    name: string; line1: string; line2?: string; city: string; state: string; zip: string; country: string;
  }>(),
  notes: text('notes'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('orders_user_idx').on(t.userId, t.createdAt),
  statusIdx: index('orders_status_idx').on(t.status, t.createdAt),
}));

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  sellerId: integer('seller_id').notNull().references(() => sellerProfiles.id),
  productName: varchar('product_name', { length: 300 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  total: integer('total').notNull(),
}, (t) => ({
  orderIdx: index('order_items_order_idx').on(t.orderId),
  sellerIdx: index('order_items_seller_idx').on(t.sellerId),
}));

export const productReviews = pgTable('product_reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  orderId: integer('order_id'),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 200 }),
  comment: text('comment'),
  isVerified: boolean('is_verified').notNull().default(false),
  helpfulCount: integer('helpful_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productIdx: index('product_reviews_product_idx').on(t.productId, t.createdAt),
  userProductIdx: uniqueIndex('product_reviews_user_product_idx').on(t.userId, t.productId),
}));`,
  },

  {
    id: 'drizzle-schema-booking',
    title: 'Drizzle Schema: Booking / Reservation System',
    description: 'Schema for a service booking platform with providers, services, availability, and bookings.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'booking', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, time, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const providers = pgTable('providers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  businessName: varchar('business_name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  location: varchar('location', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: text('avatar_url'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  isVerified: boolean('is_verified').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => providers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  bufferTime: integer('buffer_time').notNull().default(0),
  maxAdvanceBooking: integer('max_advance_booking').notNull().default(30),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  providerIdx: index('services_provider_idx').on(t.providerId, t.isActive),
}));

export const availability = pgTable('availability', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => providers.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isActive: boolean('is_active').notNull().default(true),
}, (t) => ({
  providerDayIdx: index('availability_provider_day_idx').on(t.providerId, t.dayOfWeek),
}));

export const availabilityOverrides = pgTable('availability_overrides', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => providers.id, { onDelete: 'cascade' }),
  date: varchar('date', { length: 10 }).notNull(),
  isAvailable: boolean('is_available').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  reason: varchar('reason', { length: 200 }),
}, (t) => ({
  providerDateIdx: uniqueIndex('avail_overrides_provider_date_idx').on(t.providerId, t.date),
}));

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => providers.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  userId: integer('user_id').notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('confirmed'),
  notes: text('notes'),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  cancelReason: varchar('cancel_reason', { length: 300 }),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  providerDateIdx: index('bookings_provider_date_idx').on(t.providerId, t.date, t.startTime),
  userIdx: index('bookings_user_idx').on(t.userId, t.createdAt),
  statusDateIdx: index('bookings_status_date_idx').on(t.status, t.date),
}));`,
  },

  {
    id: 'react-auth-context',
    title: 'React Auth Context with Protected Routes',
    description: 'Complete auth context with login, logout, registration, and route protection.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['auth', 'context', 'routing', 'react'],
    code: `import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Login failed');
    }
    const data = await res.json();
    setUser(data.user);
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Registration failed');
    }
    const result = await res.json();
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-muted-foreground mt-1">Enter your credentials to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account? <a href="/register" className="text-primary hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}`,
  },

  {
    id: 'empty-state-components',
    title: 'Empty State Components',
    description: 'Reusable empty state components for when there is no data to display.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['empty-state', 'component', 'reusable', 'ux'],
    code: `interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-muted-foreground mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && (
        <button onClick={action.onClick}
          className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          {action.label}
        </button>
      )}
    </div>
  );
}

function NoTasksEmpty({ onCreateTask }: { onCreateTask: () => void }) {
  return (
    <EmptyState
      icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>}
      title="No tasks yet"
      description="Create your first task to start organizing your work."
      action={{ label: 'Create Task', onClick: onCreateTask }}
    />
  );
}

function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>}
      title="No results found"
      description={\`No items match "\${query}". Try a different search term.\`}
    />
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>}
      title="Something went wrong"
      description={error}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
}`,
  },

  {
    id: 'sidebar-navigation',
    title: 'Collapsible Sidebar Navigation',
    description: 'Application sidebar with collapsible sections, active state, and responsive behavior.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['navigation', 'sidebar', 'component', 'layout'],
    code: `interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

function AppSidebar({ sections, currentPath, onNavigate }: {
  sections: NavSection[];
  currentPath: string;
  onNavigate: (href: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={\`flex flex-col bg-background border-r transition-all duration-200 \${isCollapsed ? 'w-16' : 'w-60'}\`}>
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && <span className="font-semibold text-sm">YourApp</span>}
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
          <svg className={\`w-4 h-4 transition-transform \${isCollapsed ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section, si) => (
          <div key={si} className="mb-2">
            {section.title && !isCollapsed && (
              <p className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map(item => {
                const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <button onClick={() => onNavigate(item.href)}
                      className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors \${
                        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }\`}
                      title={isCollapsed ? item.label : undefined}>
                      <span className="shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <button className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted\`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">JD</div>
          {!isCollapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">John Doe</p>
              <p className="text-xs text-muted-foreground truncate">john@example.com</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}`,
  },

  {
    id: 'confirmation-dialog',
    title: 'Confirmation Dialog Component',
    description: 'Reusable confirmation dialog for destructive actions (delete, archive, etc.).',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['dialog', 'modal', 'component', 'reusable'],
    code: `interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-xl max-w-md w-full p-6" role="alertdialog">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={isLoading}
            className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className={\`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 \${confirmStyles[variant]}\`}>
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', description: '', variant: 'default', onConfirm: () => {} });

  const confirm = (options: { title: string; description: string; variant?: 'danger' | 'warning' | 'default' }) =>
    new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        ...options,
        variant: options.variant ?? 'default',
        onConfirm: () => { setState(s => ({ ...s, isOpen: false })); resolve(true); },
      });
    });

  const dialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={() => setState(s => ({ ...s, isOpen: false }))}
      onConfirm={state.onConfirm}
      title={state.title}
      description={state.description}
      variant={state.variant}
      confirmLabel={state.variant === 'danger' ? 'Delete' : 'Confirm'}
    />
  );

  return { confirm, dialog };
}

// Usage:
// const { confirm, dialog } = useConfirmDialog();
// const handleDelete = async () => {
//   const ok = await confirm({ title: 'Delete task?', description: 'This action cannot be undone.', variant: 'danger' });
//   if (ok) await deleteTask(id);
// };
// return <>{dialog}<button onClick={handleDelete}>Delete</button></>;`,
  },

  {
    id: 'express-error-handler',
    title: 'Express Error Handling Middleware',
    description: 'Centralized error handling with custom error classes, validation errors, and structured responses.',
    tech: ['express', 'typescript'],
    tags: ['error-handling', 'middleware', 'express', 'api'],
    code: `class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, \`\${resource} not found\`, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  if (err.name === 'ZodError') {
    const zodErr = err as any;
    const details: Record<string, string> = {};
    for (const issue of zodErr.issues) {
      const field = issue.path.join('.');
      details[field] = issue.message;
    }
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    code: 'INTERNAL_ERROR',
  });
}

app.use(errorHandler);

// Usage:
// app.get('/api/tasks/:id', asyncHandler(async (req, res) => {
//   const task = await getTask(Number(req.params.id));
//   if (!task) throw new NotFoundError('Task');
//   res.json(task);
// }));`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 5
// ============================================

export const EXPANDED_ANTI_PATTERNS_5: AntiPattern[] = [
  {
    id: 'no-input-validation',
    name: 'Missing Input Validation',
    description: 'Accepting user input without validation and passing it directly to database queries or business logic.',
    whyBad: 'Leads to: (1) SQL injection if using raw queries. (2) XSS if rendering user input as HTML. (3) Type errors and crashes from unexpected data shapes. (4) Data corruption from invalid values (negative prices, empty names).',
    fix: 'Validate ALL user input at the API boundary using Zod. Define schemas for every endpoint body, query, and params. Return 400 with field-level error messages for invalid input.',
    severity: 'critical',
    badExample: 'app.post("/api/tasks", (req, res) => { db.insert(tasks).values(req.body); }); // No validation!',
    goodExample: 'const schema = z.object({ title: z.string().min(1).max(200), priority: z.enum(["low","medium","high"]) }); app.post("/api/tasks", (req, res) => { const data = schema.parse(req.body); ... });',
    tags: ['security', 'validation', 'api'],
  },
  {
    id: 'hardcoded-secrets',
    name: 'Hardcoded Secrets in Source Code',
    description: 'Embedding API keys, database passwords, or JWT secrets directly in source code.',
    whyBad: 'Anyone with access to the repo can see your secrets. Secrets in git history persist even after deletion. Leaked secrets can lead to data breaches, unauthorized charges, and account takeover.',
    fix: 'Use environment variables for ALL secrets. Validate them at startup with Zod. Use .env files locally (never commit .env to git). Use secret managers (AWS Secrets Manager, Vault) in production.',
    severity: 'critical',
    badExample: 'const JWT_SECRET = "super-secret-key-123"; const DB_URL = "postgres://admin:password@db.example.com/prod";',
    goodExample: 'const JWT_SECRET = process.env.JWT_SECRET!; // Validated at startup with Zod',
    tags: ['security', 'config', 'deployment'],
  },
  {
    id: 'no-error-boundaries',
    name: 'No React Error Boundaries',
    description: 'Not wrapping component trees in error boundaries, causing the entire app to crash on render errors.',
    whyBad: 'A single component error crashes the entire page. Users see a blank white screen with no way to recover. In production, this is a complete loss of functionality.',
    fix: 'Wrap major UI sections in error boundaries. Show a friendly error message with a retry button. Log errors to a monitoring service (Sentry). At minimum: wrap the entire app, each page/route, and each independent widget.',
    severity: 'high',
    badExample: '<App><Dashboard /><Sidebar /></App> // One error in Sidebar crashes Dashboard too',
    goodExample: '<App><ErrorBoundary><Dashboard /></ErrorBoundary><ErrorBoundary><Sidebar /></ErrorBoundary></App>',
    tags: ['react', 'error-handling', 'ux'],
  },
  {
    id: 'prop-drilling-deep',
    name: 'Deep Prop Drilling (>3 Levels)',
    description: 'Passing props through 4+ component layers to reach a deeply nested child.',
    whyBad: 'Makes components tightly coupled and hard to refactor. Every intermediate component must accept and forward props it does not use. Changes to the prop shape require updating every layer.',
    fix: 'Use React Context for shared state (auth, theme, locale). Use React Query for server state (data fetching). Use composition pattern — pass components as children instead of data as props. Only drill props 1-2 levels.',
    severity: 'medium',
    badExample: '<App user={user}><Layout user={user}><Sidebar user={user}><UserMenu user={user} /></Sidebar></Layout></App>',
    goodExample: 'const { user } = useAuth(); // Access user anywhere without prop drilling',
    tags: ['react', 'architecture', 'maintainability'],
  },
  {
    id: 'sync-file-operations',
    name: 'Synchronous File System Operations',
    description: 'Using fs.readFileSync, fs.writeFileSync in request handlers.',
    whyBad: 'Synchronous file operations block the event loop. During the I/O wait, no other requests can be processed. This creates a bottleneck that degrades performance under load.',
    fix: 'Use async versions: fs.promises.readFile, fs.promises.writeFile. Or use streaming for large files: fs.createReadStream. Only use sync versions at startup (reading config files before the server starts listening).',
    severity: 'high',
    badExample: 'app.get("/file", (req, res) => { const data = fs.readFileSync("large.json", "utf-8"); res.json(JSON.parse(data)); });',
    goodExample: 'app.get("/file", async (req, res) => { const data = await fs.promises.readFile("large.json", "utf-8"); res.json(JSON.parse(data)); });',
    tags: ['node', 'performance', 'async'],
  },
  {
    id: 'missing-loading-states',
    name: 'Missing Loading States',
    description: 'Not showing loading indicators during async operations (data fetching, form submission, file upload).',
    whyBad: 'Users think the app is frozen. They click buttons multiple times (causing duplicate submissions). They navigate away and lose their action. Poor perceived performance.',
    fix: 'Show loading state for every async operation: (1) Page loads — show skeleton placeholders. (2) Button actions — show spinner and disable button. (3) Form submissions — disable form and show progress. (4) Navigation — show top progress bar.',
    severity: 'medium',
    badExample: '<button onClick={handleSubmit}>Save</button> // No loading state, no disabled during submit',
    goodExample: '<button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>',
    tags: ['ux', 'react', 'accessibility'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 5
// ============================================

export const EXPANDED_BEST_PRACTICES_5: BestPractice[] = [
  {
    id: 'api-response-consistency',
    title: 'Consistent API Response Format',
    category: 'api',
    description: 'Use a consistent response format across all API endpoints for predictable client-side handling.',
    do: [
      'Return the same shape for all endpoints: { data, error, pagination }',
      'Use HTTP status codes correctly: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable), 429 (Rate Limited), 500 (Server Error)',
      'Return created resources with 201 and the created object',
      'Return field-level validation errors: { error: "Validation failed", details: { email: "Invalid format" } }',
      'Use consistent date format (ISO 8601): "2024-01-15T10:30:00Z"',
      'Use consistent ID format across all resources (integer or UUID, not mixed)',
      'Include pagination metadata: { data: [...], pagination: { page, limit, total, totalPages } }',
    ],
    dont: [
      'Return different shapes from different endpoints (sometimes array, sometimes { data: array })',
      'Use 200 for everything and put the actual status in the response body',
      'Return raw database errors to the client',
      'Use different date formats across endpoints',
      'Return 500 for client errors (bad input should be 400, not 500)',
    ],
    languages: ['typescript'],
  },
  {
    id: 'database-query-patterns',
    title: 'Database Query Best Practices',
    category: 'database',
    description: 'Write efficient, safe database queries that scale with data growth.',
    do: [
      'Always paginate list endpoints — never return unbounded result sets',
      'Create indexes for columns used in WHERE, JOIN, and ORDER BY clauses',
      'Use select() to specify columns — avoid SELECT * in production queries',
      'Use database transactions for multi-table writes that must be atomic',
      'Add LIMIT to all queries, even internal ones, to prevent runaway queries',
      'Use connection pooling (Drizzle does this by default with node-postgres)',
      'Use parameterized queries (Drizzle ORM handles this) — never interpolate user input into SQL',
      'Monitor slow queries with pg_stat_statements in production',
    ],
    dont: [
      'Use SELECT * — it fetches unnecessary columns and breaks when schema changes',
      'Write queries in loops (N+1 problem) — use JOINs or batch queries',
      'Forget indexes on foreign key columns — JOINs without indexes are catastrophically slow',
      'Use OFFSET-based pagination for large datasets — use cursor-based pagination instead',
      'Store denormalized counts without a strategy to keep them in sync',
    ],
    languages: ['typescript', 'sql'],
  },
  {
    id: 'component-architecture',
    title: 'React Component Architecture',
    category: 'react',
    description: 'Structure React components for maintainability, reusability, and testability.',
    do: [
      'Separate smart (container) and dumb (presentational) components',
      'Keep components small — if a component is >200 lines, split it',
      'Use custom hooks to extract data fetching and business logic from components',
      'Co-locate related files: TaskCard.tsx, TaskCard.test.tsx, useTaskActions.ts in the same directory',
      'Use composition over prop explosion: <Card><Card.Header /><Card.Body /></Card>',
      'Memoize expensive computations with useMemo, not every computation',
      'Use React.lazy + Suspense for code-splitting large pages',
      'Define prop interfaces for all components — never use "any" for props',
    ],
    dont: [
      'Put all components in a single "components" folder — organize by feature/domain',
      'Create "god components" that handle multiple concerns (data fetching + rendering + state)',
      'Use useEffect for derived state — use useMemo instead',
      'Wrap every component in React.memo — only memoize when profiling shows re-render issues',
      'Use index as key in lists — use stable IDs',
    ],
    languages: ['typescript'],
  },
  {
    id: 'accessibility-fundamentals',
    title: 'Web Accessibility Fundamentals',
    category: 'ux',
    description: 'Build accessible web applications that work for all users, including those using assistive technology.',
    do: [
      'Use semantic HTML: <button> for actions, <a> for navigation, <nav> for nav, <main> for content',
      'Add alt text to all images — decorative images get alt="" (empty, not missing)',
      'Ensure all interactive elements are keyboard accessible (Tab, Enter, Escape, Arrow keys)',
      'Use ARIA labels for icon-only buttons: <button aria-label="Close">{closeIcon}</button>',
      'Maintain sufficient color contrast (4.5:1 for normal text, 3:1 for large text)',
      'Manage focus: move focus to modal on open, return to trigger on close',
      'Add role="alert" for dynamic error messages so screen readers announce them',
      'Test with keyboard navigation and a screen reader (VoiceOver, NVDA)',
    ],
    dont: [
      'Use <div onClick> for clickable elements — use <button> or <a>',
      'Rely solely on color to convey information — add icons or text labels',
      'Remove focus outlines without providing an alternative',
      'Use placeholder text as the only label for form inputs',
      'Auto-play audio or video without user consent',
    ],
    languages: ['typescript'],
  },
  {
    id: 'security-checklist',
    title: 'Web Application Security Checklist',
    category: 'security',
    description: 'Essential security measures for production web applications.',
    do: [
      'Validate and sanitize ALL user input (Zod on server, never trust the client)',
      'Use parameterized queries (Drizzle ORM) — never interpolate user input into SQL',
      'Hash passwords with bcrypt (cost factor 12+) — never store plain text',
      'Use HTTPS everywhere — redirect HTTP to HTTPS',
      'Set secure cookie flags: httpOnly, secure, sameSite, path',
      'Implement CSRF protection for state-changing requests',
      'Set security headers: X-Content-Type-Options, X-Frame-Options, CSP',
      'Rate limit authentication endpoints (5 attempts per 15 minutes)',
      'Log security events (failed logins, permission denials) for monitoring',
      'Rotate JWT secrets periodically and use short expiration times (15min access, 7d refresh)',
    ],
    dont: [
      'Store passwords in plain text or with weak hashing (MD5, SHA1)',
      'Expose stack traces or internal error details in production API responses',
      'Use wildcard CORS (Access-Control-Allow-Origin: *) in production',
      'Store sensitive data in localStorage — use httpOnly cookies',
      'Trust client-side validation as the only validation',
    ],
    languages: ['typescript'],
  },
];
