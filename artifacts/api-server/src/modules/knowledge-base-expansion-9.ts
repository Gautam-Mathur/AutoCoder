import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 9
// Personal Finance, HR Management, API Gateway,
// Microservice Communication, GraphQL, Testing Strategies,
// CI/CD Patterns, Content Management, Subscription Billing,
// Multi-tenancy, Rate Limiting, Caching Strategies
// ============================================

export const EXPANDED_CONCEPTS_9: Record<string, Concept> = {

  api_gateway_pattern: {
    id: 'api-gateway-pattern',
    name: 'API Gateway Pattern',
    category: 'architecture',
    description: 'A single entry point for routing, aggregating, and managing API requests across microservices.',
    explanation: 'An API Gateway sits between clients and backend services, handling cross-cutting concerns like authentication, rate limiting, request transformation, and response aggregation. Benefits: (1) Unified entry point simplifies client integration. (2) Centralized auth, logging, and monitoring. (3) Request routing and load balancing. (4) Response caching and compression. (5) Protocol translation (REST/GraphQL/gRPC). Common implementations: Kong, AWS API Gateway, Express middleware chain. Anti-pattern: putting business logic in the gateway — keep it thin.',
    examples: [
      `import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
}));

app.use('/api/users', createProxyMiddleware({
  target: 'http://user-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '' },
}));

app.use('/api/products', createProxyMiddleware({
  target: 'http://product-service:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/products': '' },
}));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`[\${req.method}] \${req.originalUrl} \${res.statusCode} \${duration}ms\`);
  });
  next();
});

app.listen(8080, () => console.log('API Gateway running on :8080'));`,
    ],
    relatedConcepts: ['microservices', 'load-balancing', 'rate-limiting'],
    difficulty: 'advanced',
    languages: ['typescript', 'javascript'],
  },

  graphql_schema_design: {
    id: 'graphql-schema-design',
    name: 'GraphQL Schema Design',
    category: 'architecture',
    description: 'Type-safe API design using GraphQL schemas, resolvers, and query optimization.',
    explanation: 'GraphQL provides a strongly-typed query language where clients request exactly the data they need. Key concepts: (1) Schema-first vs code-first approach. (2) Types, queries, mutations, subscriptions. (3) Resolver patterns and data loaders for N+1 prevention. (4) Input validation with custom scalars. (5) Pagination with cursor-based connections. (6) Error handling with union types. Best practices: keep resolvers thin, use DataLoader for batching, implement query depth limiting.',
    examples: [
      `import { makeExecutableSchema } from '@graphql-tools/schema';

const typeDefs = \`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    createdAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    comments: [Comment!]!
    publishedAt: String
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
    post: Post!
    createdAt: String!
  }

  type Query {
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!
    post(id: ID!): Post
    posts(authorId: ID, limit: Int, offset: Int): [Post!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    createPost(input: CreatePostInput!): Post!
    addComment(input: AddCommentInput!): Comment!
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  input CreatePostInput {
    title: String!
    content: String!
    authorId: ID!
  }

  input AddCommentInput {
    text: String!
    authorId: ID!
    postId: ID!
  }
\`;

const resolvers = {
  Query: {
    user: (_: unknown, { id }: { id: string }) => getUserById(id),
    users: (_: unknown, args: { limit?: number; offset?: number }) =>
      getUsers(args.limit ?? 20, args.offset ?? 0),
    post: (_: unknown, { id }: { id: string }) => getPostById(id),
    posts: (_: unknown, args: { authorId?: string; limit?: number; offset?: number }) =>
      getPosts(args),
  },
  User: {
    posts: (parent: { id: string }) => getPostsByAuthor(parent.id),
  },
  Post: {
    author: (parent: { authorId: string }) => getUserById(parent.authorId),
    comments: (parent: { id: string }) => getCommentsByPost(parent.id),
  },
};`,
    ],
    relatedConcepts: ['api-design', 'type-safety', 'data-fetching'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  multi_tenancy: {
    id: 'multi-tenancy',
    name: 'Multi-Tenancy Architecture',
    category: 'architecture',
    description: 'Designing applications that serve multiple tenants (organizations) from a shared infrastructure.',
    explanation: 'Multi-tenancy enables a single application instance to serve multiple organizations securely. Strategies: (1) Shared database with tenant_id column (simplest, least isolation). (2) Separate schemas per tenant (moderate isolation). (3) Separate databases per tenant (strongest isolation). Implementation: middleware extracts tenant from subdomain/header/JWT, injects tenant context into all queries. Critical: ensure every query filters by tenant_id, use row-level security in PostgreSQL, separate tenant data in caches. Testing: verify tenant isolation with cross-tenant access attempts.',
    examples: [
      `import { Request, Response, NextFunction } from 'express';

interface TenantContext {
  tenantId: string;
  tenantName: string;
  plan: 'free' | 'pro' | 'enterprise';
}

declare global {
  namespace Express {
    interface Request {
      tenant: TenantContext;
    }
  }
}

async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const subdomain = req.hostname.split('.')[0];
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, subdomain),
  });

  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  req.tenant = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    plan: tenant.plan,
  };

  next();
}

function scopedQuery<T>(baseQuery: any, tenantId: string) {
  return baseQuery.where(eq(schema.tenantId, tenantId));
}

app.get('/api/projects', async (req, res) => {
  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.tenantId, req.tenant.tenantId),
    orderBy: desc(schema.projects.createdAt),
  });
  res.json(projects);
});`,
    ],
    relatedConcepts: ['saas-architecture', 'database-design', 'row-level-security'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  rate_limiting_patterns: {
    id: 'rate-limiting-patterns',
    name: 'Rate Limiting Patterns',
    category: 'security',
    description: 'Protecting APIs from abuse through request rate throttling strategies.',
    explanation: 'Rate limiting prevents API abuse and ensures fair usage. Algorithms: (1) Fixed Window — count requests per time window, simple but burst-prone at boundaries. (2) Sliding Window Log — track each request timestamp, accurate but memory-intensive. (3) Token Bucket — tokens replenish at fixed rate, allows controlled bursts. (4) Leaky Bucket — constant drain rate, smooths traffic. Implementation: use Redis for distributed rate limiting, return 429 status with Retry-After header, apply different limits per user tier, exempt health checks and internal services.',
    examples: [
      `import { Redis } from 'ioredis';

const redis = new Redis();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now.toString(), \`\${now}-\${Math.random()}\`);
  pipeline.zcard(key);
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: now + windowMs,
  };
}

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const identifier = req.user?.id || req.ip;
  const result = await slidingWindowRateLimit(\`ratelimit:\${identifier}\`, 100, 60000);

  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', result.resetAt.toString());

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
  }
  next();
}`,
    ],
    relatedConcepts: ['api-security', 'redis', 'middleware-patterns'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  caching_strategies: {
    id: 'caching-strategies',
    name: 'Caching Strategies',
    category: 'performance',
    description: 'Patterns for storing frequently accessed data to reduce latency and database load.',
    explanation: 'Caching improves performance by storing computed results. Strategies: (1) Cache-Aside (Lazy Loading) — check cache first, load from DB on miss, write to cache. (2) Write-Through — write to cache and DB simultaneously. (3) Write-Behind (Write-Back) — write to cache, async flush to DB. (4) Read-Through — cache loads data transparently on miss. Invalidation strategies: TTL (time-based expiry), event-driven invalidation, cache-aside with stale-while-revalidate. Layers: browser cache, CDN, application cache (Redis/Memcached), query cache. Anti-pattern: caching without invalidation strategy leads to stale data.',
    examples: [
      `import { Redis } from 'ioredis';

const redis = new Redis();

interface CacheOptions {
  ttl?: number;
  prefix?: string;
  staleWhileRevalidate?: number;
}

class CacheService {
  private prefix: string;

  constructor(prefix = 'cache') {
    this.prefix = prefix;
  }

  private key(id: string): string {
    return \`\${this.prefix}:\${id}\`;
  }

  async get<T>(id: string): Promise<T | null> {
    const raw = await redis.get(this.key(id));
    if (!raw) return null;
    try {
      const { data, expiresAt, staleUntil } = JSON.parse(raw);
      if (Date.now() > staleUntil) {
        await redis.del(this.key(id));
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  }

  async set<T>(id: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl ?? 300;
    const staleWindow = options.staleWhileRevalidate ?? 60;
    const now = Date.now();
    const payload = JSON.stringify({
      data,
      expiresAt: now + ttl * 1000,
      staleUntil: now + (ttl + staleWindow) * 1000,
      cachedAt: now,
    });
    await redis.setex(this.key(id), ttl + staleWindow, payload);
  }

  async invalidate(id: string): Promise<void> {
    await redis.del(this.key(id));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(\`\${this.prefix}:\${pattern}\`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cache = new CacheService();
  const cached = await cache.get<T>(cacheKey);
  if (cached) return cached;

  const result = await queryFn();
  await cache.set(cacheKey, result, { ttl });
  return result;
}`,
    ],
    relatedConcepts: ['redis', 'performance-optimization', 'database-optimization'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  subscription_billing: {
    id: 'subscription-billing',
    name: 'Subscription Billing Patterns',
    category: 'architecture',
    description: 'Implementing recurring payment models with trials, upgrades, downgrades, and proration.',
    explanation: 'Subscription billing is core to SaaS. Key concepts: (1) Plans with tiered pricing (free/basic/pro/enterprise). (2) Billing cycles (monthly/yearly with discount). (3) Trial periods with automatic conversion. (4) Proration on mid-cycle plan changes. (5) Usage-based billing with metering. (6) Dunning management for failed payments. (7) Webhooks for payment events. Integration pattern: use Stripe/Paddle as billing provider, sync subscription state via webhooks, gate features based on plan in middleware. Never trust client-side plan checks.',
    examples: [
      `import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface PlanConfig {
  name: string;
  stripePriceId: string;
  features: string[];
  limits: { users: number; storage: number; apiCalls: number };
}

const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    stripePriceId: '',
    features: ['basic-features'],
    limits: { users: 1, storage: 100, apiCalls: 1000 },
  },
  pro: {
    name: 'Pro',
    stripePriceId: 'price_pro_monthly',
    features: ['basic-features', 'advanced-analytics', 'api-access'],
    limits: { users: 10, storage: 10000, apiCalls: 50000 },
  },
  enterprise: {
    name: 'Enterprise',
    stripePriceId: 'price_enterprise_monthly',
    features: ['basic-features', 'advanced-analytics', 'api-access', 'sso', 'audit-log', 'custom-branding'],
    limits: { users: -1, storage: -1, apiCalls: -1 },
  },
};

async function createSubscription(customerId: string, planId: string) {
  const plan = PLANS[planId];
  if (!plan || !plan.stripePriceId) {
    throw new Error(\`Invalid plan: \${planId}\`);
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
    trial_period_days: 14,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  return subscription;
}

async function changePlan(subscriptionId: string, newPlanId: string) {
  const plan = PLANS[newPlanId];
  if (!plan) throw new Error(\`Invalid plan: \${newPlanId}\`);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: plan.stripePriceId,
    }],
    proration_behavior: 'create_prorations',
  });

  return updated;
}

function checkFeatureAccess(userPlan: string, feature: string): boolean {
  const plan = PLANS[userPlan];
  if (!plan) return false;
  return plan.features.includes(feature);
}

function checkLimit(userPlan: string, resource: keyof PlanConfig['limits'], currentUsage: number): boolean {
  const plan = PLANS[userPlan];
  if (!plan) return false;
  const limit = plan.limits[resource];
  return limit === -1 || currentUsage < limit;
}`,
    ],
    relatedConcepts: ['stripe-integration', 'saas-architecture', 'webhook-patterns'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  content_management_patterns: {
    id: 'content-management-patterns',
    name: 'Content Management Patterns',
    category: 'architecture',
    description: 'Building flexible content management with versioning, publishing workflows, and rich media.',
    explanation: 'CMS patterns enable structured content creation and management. Key patterns: (1) Content types with flexible schemas (headless CMS approach). (2) Draft/published/archived lifecycle with preview. (3) Content versioning and rollback. (4) Rich text with sanitization (HTML/Markdown). (5) Media library with image optimization. (6) SEO metadata management. (7) Content scheduling (publish at future date). (8) Multi-language content with locale fallbacks. Implementation: separate content model from presentation, use slug-based routing, implement full-text search.',
    examples: [
      `import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const contentTypes = pgTable('content_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  fields: jsonb('fields').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contents = pgTable('contents', {
  id: serial('id').primaryKey(),
  contentTypeId: integer('content_type_id').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull(),
  body: text('body'),
  excerpt: text('excerpt'),
  featuredImage: varchar('featured_image', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  authorId: integer('author_id').notNull(),
  publishedAt: timestamp('published_at'),
  scheduledAt: timestamp('scheduled_at'),
  version: integer('version').notNull().default(1),
  metadata: jsonb('metadata'),
  locale: varchar('locale', { length: 10 }).default('en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').notNull(),
  version: integer('version').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  body: text('body'),
  metadata: jsonb('metadata'),
  changedBy: integer('changed_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mediaLibrary = pgTable('media_library', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  alt: varchar('alt', { length: 300 }),
  width: integer('width'),
  height: integer('height'),
  uploadedBy: integer('uploaded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

async function publishContent(contentId: number, userId: number) {
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });
  if (!content) throw new Error('Content not found');

  await db.insert(contentVersions).values({
    contentId: content.id,
    version: content.version,
    title: content.title,
    body: content.body,
    metadata: content.metadata,
    changedBy: userId,
  });

  await db.update(contents)
    .set({
      status: 'published',
      publishedAt: new Date(),
      version: content.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(contents.id, contentId));
}`,
    ],
    relatedConcepts: ['headless-cms', 'content-versioning', 'rich-text-editing'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  testing_strategy_patterns: {
    id: 'testing-strategy-patterns',
    name: 'Testing Strategy Patterns',
    category: 'testing',
    description: 'Comprehensive testing approaches including unit, integration, and end-to-end testing.',
    explanation: 'A robust testing strategy follows the testing pyramid: many unit tests (fast, isolated), fewer integration tests (test component interactions), minimal E2E tests (slow, brittle but verify real flows). Key patterns: (1) Arrange-Act-Assert (AAA) structure. (2) Test doubles: mocks, stubs, spies, fakes. (3) Test data builders for complex objects. (4) Database testing with transactions (rollback after each test). (5) API testing with supertest. (6) Component testing with Testing Library. (7) Snapshot testing for UI regression. (8) Property-based testing for edge cases. Anti-pattern: testing implementation details instead of behavior.',
    examples: [
      `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../db';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('User API', () => {
  beforeEach(async () => {
    await db.execute('BEGIN');
  });

  afterEach(async () => {
    await db.execute('ROLLBACK');
  });

  describe('POST /api/users', () => {
    it('creates a user with valid data', async () => {
      const userData = { name: 'Alice', email: 'alice@test.com' };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Alice',
        email: 'alice@test.com',
        role: 'user',
      });
      expect(response.body.id).toBeDefined();
    });

    it('rejects duplicate email', async () => {
      const userData = { name: 'Alice', email: 'alice@test.com' };
      await request(app).post('/api/users').send(userData);

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({})
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const created = await request(app)
        .post('/api/users')
        .send({ name: 'Bob', email: 'bob@test.com' });

      const response = await request(app)
        .get(\`/api/users/\${created.body.id}\`)
        .expect(200);

      expect(response.body.name).toBe('Bob');
    });

    it('returns 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/99999')
        .expect(404);
    });
  });
});

describe('UserService', () => {
  it('hashes password before saving', async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      findByEmail: vi.fn().mockResolvedValue(null),
    };

    const service = new UserService(mockRepo);
    await service.register({ name: 'Test', email: 'test@t.com', password: 'secret123' });

    const savedUser = mockRepo.create.mock.calls[0][0];
    expect(savedUser.password).not.toBe('secret123');
    expect(savedUser.password).toMatch(/^\\$2[aby]\\$/);
  });
});`,
    ],
    relatedConcepts: ['test-driven-development', 'mocking', 'integration-testing'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  event_driven_architecture: {
    id: 'event-driven-architecture',
    name: 'Event-Driven Architecture',
    category: 'architecture',
    description: 'Decoupled systems communicating through events for scalability and loose coupling.',
    explanation: 'Event-driven architecture enables loose coupling between components through asynchronous event publishing and subscription. Patterns: (1) Event Sourcing — store state changes as immutable events. (2) CQRS — separate read and write models. (3) Pub/Sub — publishers emit events, subscribers react independently. (4) Event Bus — central broker for routing events. (5) Saga Pattern — coordinate distributed transactions through events. Benefits: decoupled services, replay capability, audit trail. Challenges: eventual consistency, event ordering, debugging distributed flows. Tools: Redis Pub/Sub, RabbitMQ, Kafka, AWS SNS/SQS.',
    examples: [
      `type EventHandler<T = unknown> = (payload: T) => Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on<T>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventName, existing);
  }

  async emit<T>(eventName: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(eventName) || [];
    const results = await Promise.allSettled(
      handlers.map(handler => handler(payload))
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(\`Event handler failed for \${eventName}:\`, result.reason);
      }
    }
  }
}

const eventBus = new EventBus();

interface UserRegisteredEvent {
  userId: number;
  email: string;
  name: string;
  registeredAt: Date;
}

eventBus.on<UserRegisteredEvent>('user.registered', async (event) => {
  await sendWelcomeEmail(event.email, event.name);
});

eventBus.on<UserRegisteredEvent>('user.registered', async (event) => {
  await createDefaultWorkspace(event.userId);
});

eventBus.on<UserRegisteredEvent>('user.registered', async (event) => {
  await trackAnalytics('signup', { userId: event.userId });
});

interface OrderPlacedEvent {
  orderId: number;
  userId: number;
  items: Array<{ productId: number; quantity: number; price: number }>;
  total: number;
}

eventBus.on<OrderPlacedEvent>('order.placed', async (event) => {
  await updateInventory(event.items);
});

eventBus.on<OrderPlacedEvent>('order.placed', async (event) => {
  await sendOrderConfirmation(event.userId, event.orderId);
});

eventBus.on<OrderPlacedEvent>('order.placed', async (event) => {
  if (event.total > 1000) {
    await flagForManualReview(event.orderId);
  }
});`,
    ],
    relatedConcepts: ['event-sourcing', 'cqrs', 'message-queues'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  form_validation_patterns: {
    id: 'form-validation-patterns',
    name: 'Form Validation Patterns',
    category: 'react',
    description: 'Client and server-side validation using Zod schemas with React Hook Form.',
    explanation: 'Robust form validation requires both client-side (UX) and server-side (security). Pattern: (1) Define Zod schema as single source of truth. (2) Use React Hook Form with zodResolver for client validation. (3) Reuse same schema on server for API validation. (4) Display field-level errors inline. (5) Validate on blur for individual fields, on submit for form. (6) Handle async validation (email uniqueness). (7) Show loading state during async validation. Anti-pattern: client-only validation — always validate server-side.',
    examples: [
      `import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const createProjectSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be at most 1000 characters'),
  budget: z.number()
    .min(0, 'Budget cannot be negative')
    .max(1000000, 'Budget too high'),
  startDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
  endDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  teamMembers: z.array(z.number()).min(1, 'At least one team member required'),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags'),
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

type CreateProjectInput = z.infer<typeof createProjectSchema>;

function CreateProjectForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      priority: 'medium',
      teamMembers: [],
      tags: [],
    },
  });

  const onSubmit = async (data: CreateProjectInput) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Project Name</label>
        <input id="name" {...register('name')} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" {...register('description')} />
        {errors.description && <span className="error">{errors.description.message}</span>}
      </div>
      <div>
        <label htmlFor="budget">Budget</label>
        <input id="budget" type="number" {...register('budget', { valueAsNumber: true })} />
        {errors.budget && <span className="error">{errors.budget.message}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}`,
    ],
    relatedConcepts: ['zod-validation', 'react-hook-form', 'input-sanitization'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  database_migration_patterns: {
    id: 'database-migration-patterns',
    name: 'Database Migration Patterns',
    category: 'database',
    description: 'Safe, reversible database schema evolution strategies for production systems.',
    explanation: 'Database migrations enable controlled schema evolution. Key principles: (1) Every migration must be reversible (up/down). (2) Never modify a deployed migration — create a new one. (3) Use non-destructive changes: add columns as nullable, rename via alias first. (4) Large table migrations: add column nullable → backfill → add NOT NULL constraint. (5) Zero-downtime patterns: expand-contract for column renames, dual-write for table splits. (6) Test migrations against production-like data volume. (7) Keep migrations small and focused. Anti-pattern: manual schema changes in production.',
    examples: [
      `import { sql } from 'drizzle-orm';

async function addUserProfileFields(db: any) {
  await db.execute(sql\`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
  \`);
}

async function rollbackUserProfileFields(db: any) {
  await db.execute(sql\`
    ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
    ALTER TABLE users DROP COLUMN IF EXISTS bio;
    ALTER TABLE users DROP COLUMN IF EXISTS timezone;
    ALTER TABLE users DROP COLUMN IF EXISTS preferences;
  \`);
}

async function safeColumnRename(db: any) {
  await db.execute(sql\`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(200);
    UPDATE users SET display_name = name WHERE display_name IS NULL;
    CREATE OR REPLACE VIEW users_compat AS
      SELECT *, display_name AS name FROM users;
  \`);
}

async function addIndexSafely(db: any) {
  await db.execute(sql\`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
      ON users (email);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_created
      ON posts (author_id, created_at DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_date
      ON orders (status, created_at DESC)
      WHERE status IN ('pending', 'processing');
  \`);
}`,
    ],
    relatedConcepts: ['database-design', 'schema-evolution', 'zero-downtime-deployment'],
    difficulty: 'advanced',
    languages: ['typescript', 'sql'],
  },

  accessibility_patterns: {
    id: 'accessibility-patterns',
    name: 'Web Accessibility Patterns (WCAG)',
    category: 'accessibility',
    description: 'Building inclusive web applications following WCAG 2.1 guidelines.',
    explanation: 'Web accessibility ensures people with disabilities can use your application. Core principles (POUR): Perceivable, Operable, Understandable, Robust. Key patterns: (1) Semantic HTML — use correct elements (button, nav, main, article). (2) ARIA attributes — only when semantic HTML is insufficient. (3) Keyboard navigation — all interactive elements focusable and operable. (4) Focus management — trap focus in modals, restore on close. (5) Color contrast — minimum 4.5:1 for text, 3:1 for large text. (6) Screen reader testing — use aria-label, aria-live for dynamic content. (7) Form accessibility — labels, error messages, fieldsets. Anti-pattern: divs with onClick instead of buttons.',
    examples: [
      `import { useRef, useEffect, useCallback } from 'react';

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(focusableElements);
        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
        previousFocus.current?.focus();
      };
    }
  }, [isOpen]);

  return containerRef;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function AccessibleModal({ isOpen, onClose, title, children }: ModalProps) {
  const containerRef = useFocusTrap(isOpen);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
        className="modal-content"
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="Close dialog">
          Close
        </button>
      </div>
    </div>
  );
}

function AccessibleForm() {
  return (
    <form aria-labelledby="form-heading">
      <h2 id="form-heading">Create Account</h2>
      <fieldset>
        <legend>Personal Information</legend>
        <div>
          <label htmlFor="fullName">Full Name <span aria-hidden="true">*</span></label>
          <input
            id="fullName"
            type="text"
            required
            aria-required="true"
            aria-describedby="name-hint"
          />
          <span id="name-hint" className="hint">Enter your first and last name</span>
        </div>
        <div>
          <label htmlFor="userEmail">Email <span aria-hidden="true">*</span></label>
          <input
            id="userEmail"
            type="email"
            required
            aria-required="true"
            aria-invalid={false}
          />
        </div>
      </fieldset>
      <button type="submit">Create Account</button>
    </form>
  );
}`,
    ],
    relatedConcepts: ['semantic-html', 'aria', 'keyboard-navigation'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 9
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_9: Record<string, EntityArchetype> = {

  transaction: {
    id: 'transaction',
    name: 'Transaction',
    aliases: ['payment', 'transfer', 'bank transaction', 'financial transaction'],
    domain: 'finance',
    description: 'Financial transaction record with amount, parties, and status tracking.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'amount', type: 'integer not null', nullable: false, description: 'Amount in smallest currency unit (cents)' },
      { name: 'currency', type: "varchar(3) not null default 'USD'", nullable: false, description: 'ISO 4217 currency code' },
      { name: 'type', type: "varchar(20) not null", nullable: false, description: 'income|expense|transfer' },
      { name: 'description', type: 'varchar(300)', nullable: true, description: 'Transaction description/memo' },
      { name: 'fromAccountId', type: 'integer references accounts(id)', nullable: true, description: 'Source account' },
      { name: 'toAccountId', type: 'integer references accounts(id)', nullable: true, description: 'Destination account' },
      { name: 'categoryId', type: 'integer references categories(id)', nullable: true, description: 'Spending category' },
      { name: 'status', type: "varchar(20) not null default 'completed'", nullable: false, description: 'pending|completed|failed|cancelled' },
      { name: 'reference', type: 'varchar(100)', nullable: true, description: 'External reference/confirmation number' },
      { name: 'date', type: 'timestamptz not null', nullable: false, description: 'Transaction date' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['account', 'category', 'user', 'budget'],
    suggestedIndexes: ['(fromAccountId, date)', '(toAccountId, date)', 'categoryId', 'status', 'date'],
    defaultWorkflow: {
      states: ['pending', 'completed', 'failed', 'cancelled'],
      transitions: [
        { from: 'pending', to: 'completed', action: 'complete' },
        { from: 'pending', to: 'failed', action: 'fail' },
        { from: 'pending', to: 'cancelled', action: 'cancel' },
      ],
    },
    typicalEndpoints: ['GET /transactions', 'GET /transactions/:id', 'POST /transactions', 'DELETE /transactions/:id'],
  },

  account: {
    id: 'account',
    name: 'Account',
    aliases: ['bank account', 'financial account', 'wallet'],
    domain: 'finance',
    description: 'Financial account with balance tracking and transaction history.',
    traits: ['pageable', 'auditable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Account display name' },
      { name: 'type', type: "varchar(20) not null", nullable: false, description: 'checking|savings|credit|investment|cash' },
      { name: 'institution', type: 'varchar(100)', nullable: true, description: 'Bank or financial institution name' },
      { name: 'balance', type: 'integer not null default 0', nullable: false, description: 'Current balance in cents' },
      { name: 'currency', type: "varchar(3) not null default 'USD'", nullable: false, description: 'ISO 4217 currency code' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Account owner' },
      { name: 'color', type: 'varchar(7)', nullable: true, description: 'UI display color hex' },
      { name: 'icon', type: 'varchar(50)', nullable: true, description: 'Icon identifier' },
      { name: 'isActive', type: 'boolean not null default true', nullable: false, description: 'Account active flag' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'transaction', 'budget'],
    suggestedIndexes: ['userId', '(userId, type)', 'isActive'],
    typicalEndpoints: ['GET /accounts', 'GET /accounts/:id', 'POST /accounts', 'PUT /accounts/:id', 'DELETE /accounts/:id'],
  },

  budget: {
    id: 'budget',
    name: 'Budget',
    aliases: ['spending plan', 'budget category', 'expense budget'],
    domain: 'finance',
    description: 'Spending plan with category allocations and progress tracking.',
    traits: ['pageable', 'auditable', 'searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(100) not null', nullable: false, description: 'Budget name' },
      { name: 'amount', type: 'integer not null', nullable: false, description: 'Budgeted amount in cents' },
      { name: 'spent', type: 'integer not null default 0', nullable: false, description: 'Amount spent so far' },
      { name: 'period', type: "varchar(10) not null default 'monthly'", nullable: false, description: 'monthly|weekly|yearly' },
      { name: 'categoryId', type: 'integer not null references categories(id)', nullable: false, description: 'Spending category' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Budget owner' },
      { name: 'startDate', type: 'date not null', nullable: false, description: 'Budget period start' },
      { name: 'endDate', type: 'date not null', nullable: false, description: 'Budget period end' },
      { name: 'alertThreshold', type: 'integer default 80', nullable: true, description: 'Alert percentage threshold' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['user', 'category', 'transaction'],
    suggestedIndexes: ['(userId, period)', 'categoryId', '(startDate, endDate)'],
    typicalEndpoints: ['GET /budgets', 'GET /budgets/:id', 'POST /budgets', 'PUT /budgets/:id', 'DELETE /budgets/:id'],
  },

  employee: {
    id: 'employee',
    name: 'Employee',
    aliases: ['staff', 'team member', 'worker', 'personnel'],
    domain: 'hr',
    description: 'Staff member with HR details, department assignment, and payroll info.',
    traits: ['pageable', 'auditable', 'searchable', 'soft-deletable', 'hierarchical'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'firstName', type: 'varchar(100) not null', nullable: false, description: 'First name' },
      { name: 'lastName', type: 'varchar(100) not null', nullable: false, description: 'Last name' },
      { name: 'email', type: 'varchar(255) not null unique', nullable: false, description: 'Work email' },
      { name: 'phone', type: 'varchar(20)', nullable: true, description: 'Phone number' },
      { name: 'departmentId', type: 'integer not null references departments(id)', nullable: false, description: 'Department' },
      { name: 'position', type: 'varchar(100) not null', nullable: false, description: 'Job title' },
      { name: 'managerId', type: 'integer references employees(id)', nullable: true, description: 'Direct manager (self-ref)' },
      { name: 'employmentType', type: "varchar(20) not null", nullable: false, description: 'full-time|part-time|contract|intern' },
      { name: 'hireDate', type: 'date not null', nullable: false, description: 'Start date' },
      { name: 'salary', type: 'integer', nullable: true, description: 'Annual salary in cents' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|on-leave|terminated' },
      { name: 'avatar', type: 'varchar(500)', nullable: true, description: 'Profile photo URL' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['department', 'leave-request', 'attendance', 'performance-review'],
    suggestedIndexes: ['email', 'departmentId', 'managerId', 'status', '(lastName, firstName)'],
    typicalEndpoints: ['GET /employees', 'GET /employees/:id', 'POST /employees', 'PUT /employees/:id', 'DELETE /employees/:id'],
  },

  listing: {
    id: 'listing',
    name: 'Listing',
    aliases: ['product listing', 'classified ad', 'for sale item', 'marketplace item'],
    domain: 'marketplace',
    description: 'Product or service listing in a marketplace with pricing and images.',
    traits: ['pageable', 'auditable', 'searchable', 'workflowable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(200) not null', nullable: false, description: 'Listing title' },
      { name: 'description', type: 'text not null', nullable: false, description: 'Detailed description' },
      { name: 'price', type: 'integer not null', nullable: false, description: 'Price in cents' },
      { name: 'sellerId', type: 'integer not null references users(id)', nullable: false, description: 'Seller user' },
      { name: 'categoryId', type: 'integer not null references categories(id)', nullable: false, description: 'Category' },
      { name: 'condition', type: 'varchar(20)', nullable: true, description: 'new|like-new|good|fair|poor' },
      { name: 'images', type: 'text[]', nullable: true, description: 'Array of image URLs' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|active|sold|archived' },
      { name: 'location', type: 'varchar(100)', nullable: true, description: 'Item location' },
      { name: 'quantity', type: 'integer not null default 1', nullable: false, description: 'Available quantity' },
      { name: 'views', type: 'integer not null default 0', nullable: false, description: 'View count' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Searchable tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'category', 'order', 'review', 'favorite'],
    suggestedIndexes: ['sellerId', 'categoryId', 'status', '(status, createdAt)', 'price'],
    defaultWorkflow: {
      states: ['draft', 'active', 'sold', 'archived'],
      transitions: [
        { from: 'draft', to: 'active', action: 'publish' },
        { from: 'active', to: 'sold', action: 'mark_sold' },
        { from: 'active', to: 'archived', action: 'archive' },
        { from: 'archived', to: 'active', action: 'relist' },
      ],
    },
    typicalEndpoints: ['GET /listings', 'GET /listings/:id', 'POST /listings', 'PUT /listings/:id', 'DELETE /listings/:id'],
  },

  subscription_entity: {
    id: 'subscription-entity',
    name: 'Subscription',
    aliases: ['plan subscription', 'recurring billing', 'membership'],
    domain: 'saas',
    description: 'Recurring billing subscription with plan, status, and payment tracking.',
    traits: ['pageable', 'auditable', 'workflowable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Subscriber' },
      { name: 'planId', type: 'varchar(50) not null', nullable: false, description: 'Plan identifier' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|trialing|past_due|canceled|expired' },
      { name: 'currentPeriodStart', type: 'timestamptz not null', nullable: false, description: 'Current billing period start' },
      { name: 'currentPeriodEnd', type: 'timestamptz not null', nullable: false, description: 'Current billing period end' },
      { name: 'trialEndsAt', type: 'timestamptz', nullable: true, description: 'Trial expiration date' },
      { name: 'canceledAt', type: 'timestamptz', nullable: true, description: 'When subscription was canceled' },
      { name: 'externalId', type: 'varchar(100)', nullable: true, description: 'Stripe/external subscription ID' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
    ],
    relatedEntities: ['user', 'plan', 'invoice', 'payment-method'],
    suggestedIndexes: ['userId', 'status', 'externalId', '(status, currentPeriodEnd)'],
    defaultWorkflow: {
      states: ['trialing', 'active', 'past_due', 'canceled', 'expired'],
      transitions: [
        { from: 'trialing', to: 'active', action: 'activate' },
        { from: 'trialing', to: 'canceled', action: 'cancel' },
        { from: 'active', to: 'past_due', action: 'payment_failed' },
        { from: 'active', to: 'canceled', action: 'cancel' },
        { from: 'past_due', to: 'active', action: 'payment_succeeded' },
        { from: 'past_due', to: 'canceled', action: 'cancel' },
        { from: 'canceled', to: 'expired', action: 'expire' },
      ],
    },
    typicalEndpoints: ['GET /subscriptions', 'GET /subscriptions/:id', 'POST /subscriptions', 'PUT /subscriptions/:id/cancel'],
  },

  audit_log: {
    id: 'audit-log',
    name: 'AuditLog',
    aliases: ['activity log', 'change log', 'event log', 'audit trail'],
    domain: 'system',
    description: 'Immutable record of system actions for compliance and debugging.',
    traits: ['pageable', 'searchable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'action', type: 'varchar(50) not null', nullable: false, description: 'Action performed (user.login, project.created, etc.)' },
      { name: 'entityType', type: 'varchar(50) not null', nullable: false, description: 'Entity type affected' },
      { name: 'entityId', type: 'varchar(50) not null', nullable: false, description: 'Entity ID affected' },
      { name: 'userId', type: 'integer references users(id)', nullable: true, description: 'User who performed action (null for system)' },
      { name: 'previousValues', type: 'jsonb', nullable: true, description: 'State before change' },
      { name: 'newValues', type: 'jsonb', nullable: true, description: 'State after change' },
      { name: 'ipAddress', type: 'varchar(45)', nullable: true, description: 'Client IP address' },
      { name: 'userAgent', type: 'text', nullable: true, description: 'Browser user agent' },
      { name: 'timestamp', type: 'timestamptz not null default now()', nullable: false, description: 'When action occurred' },
    ],
    relatedEntities: ['user'],
    suggestedIndexes: ['(entityType, entityId)', 'userId', 'action', 'timestamp', '(action, timestamp)'],
    typicalEndpoints: ['GET /audit-logs', 'GET /audit-logs/:id'],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 9
// ============================================

export const EXPANDED_DOMAIN_MODELS_9: Record<string, DomainModel> = {

  'personal-finance-app': {
    id: 'personal-finance-app',
    name: 'Personal Finance Application',
    description: 'Track income, expenses, budgets, and financial goals.',
    coreEntities: ['User', 'Account', 'Transaction', 'Category', 'Budget'],
    optionalEntities: ['Goal', 'RecurringTransaction', 'Tag', 'Report'],
    keyRelationships: [
      'User has many Accounts',
      'Account has many Transactions',
      'Transaction belongs to Category',
      'Budget belongs to Category and User',
      'Goal belongs to User',
    ],
    typicalFeatures: [
      'Dashboard with net worth, monthly spending, and budget progress',
      'Transaction categorization (auto-suggest based on description)',
      'Budget alerts when spending exceeds threshold',
      'Recurring transaction scheduling',
      'Income vs expense reports by month/category',
      'Financial goal tracking with progress visualization',
      'Export transactions as CSV',
      'Multi-currency support with exchange rates',
    ],
    securityConsiderations: [
      'Financial data encryption at rest',
      'Transaction amount validation (prevent negative/overflow)',
      'User can only access own accounts and transactions',
      'Rate limit transaction creation',
    ],
    suggestedIndexStrategy: [
      'transactions(account_id, date DESC)',
      'transactions(category_id)',
      'budgets(user_id, period)',
      'accounts(user_id)',
    ],
  },

  'hr-management-system': {
    id: 'hr-management-system',
    name: 'HR Management System',
    description: 'Manage employees, departments, leave, attendance, and performance.',
    coreEntities: ['Employee', 'Department', 'LeaveRequest', 'Attendance', 'PerformanceReview'],
    optionalEntities: ['PayrollRecord', 'Benefit', 'Training', 'Document', 'OnboardingTask'],
    keyRelationships: [
      'Employee belongs to Department',
      'Employee has one Manager (Employee)',
      'Employee has many LeaveRequests',
      'Employee has many Attendance records',
      'Employee has many PerformanceReviews',
      'Department has one Head (Employee)',
    ],
    typicalFeatures: [
      'Employee directory with search and department filtering',
      'Org chart visualization',
      'Leave request submission and approval workflow',
      'Attendance tracking (check-in/check-out)',
      'Performance review cycles with 360 feedback',
      'Employee onboarding checklist',
    ],
    securityConsiderations: [
      'Salary and personal data restricted to HR/managers',
      'Leave approval restricted to direct managers',
      'Audit logging for all employee data changes',
      'GDPR compliance for personal information',
    ],
    suggestedIndexStrategy: [
      'employees(department_id)',
      'employees(manager_id)',
      'leave_requests(employee_id, status)',
      'attendance(employee_id, date)',
    ],
  },

  'marketplace-platform': {
    id: 'marketplace-platform',
    name: 'Marketplace Platform',
    description: 'Multi-vendor marketplace for buying and selling products or services.',
    coreEntities: ['User', 'Listing', 'Category', 'Order', 'Review'],
    optionalEntities: ['OrderItem', 'Favorite', 'Message', 'Dispute', 'Payout', 'SellerProfile'],
    keyRelationships: [
      'User has many Listings (as seller)',
      'User has many Orders (as buyer)',
      'Listing belongs to Category',
      'Listing has many Reviews',
      'Order has many OrderItems',
      'Dispute belongs to Order',
    ],
    typicalFeatures: [
      'Listing creation with multi-image upload',
      'Search with filters (price, location, condition, category)',
      'Shopping cart and secure checkout',
      'Buyer-seller messaging',
      'Review and rating system',
      'Order tracking with status updates',
      'Seller dashboard with analytics',
    ],
    securityConsiderations: [
      'Payment processing through trusted provider (Stripe)',
      'Sellers cannot access buyer payment details',
      'Rate limit listing creation to prevent spam',
      'Image upload validation (type, size, malware scan)',
      'Dispute evidence handling with audit trail',
    ],
    suggestedIndexStrategy: [
      'listings(seller_id)',
      'listings(category_id, status)',
      'listings(status, created_at DESC)',
      'orders(buyer_id, created_at DESC)',
      'reviews(listing_id)',
    ],
  },

  'subscription-saas-platform': {
    id: 'subscription-saas-platform',
    name: 'Subscription SaaS Platform',
    description: 'Multi-tenant SaaS with subscription billing, team management, and feature gating.',
    coreEntities: ['Organization', 'User', 'Subscription', 'Plan', 'Invoice'],
    optionalEntities: ['Feature', 'ApiKey', 'UsageRecord', 'Webhook', 'AuditLog'],
    keyRelationships: [
      'Organization has many Users',
      'Organization has one Subscription',
      'Subscription belongs to Plan',
      'Plan has many Features',
      'Organization has many Invoices',
    ],
    typicalFeatures: [
      'Multi-tenant with subdomain routing',
      'Plan selection with feature comparison',
      'Stripe-integrated billing with invoices',
      'Team member invitation and role management',
      'API key generation and management',
      'Feature flags based on plan tier',
      'Admin dashboard with MRR/churn metrics',
      'Trial period with automatic conversion',
    ],
    securityConsiderations: [
      'Tenant data isolation (every query scoped by org_id)',
      'Row-level security in PostgreSQL',
      'API key hashing (only show once at creation)',
      'Webhook signature verification',
      'Rate limiting per tenant based on plan',
    ],
    suggestedIndexStrategy: [
      'users(organization_id)',
      'subscriptions(organization_id)',
      'invoices(organization_id, issued_at DESC)',
      'usage_records(organization_id, period)',
    ],
  },

  'content-management-system': {
    id: 'content-management-system',
    name: 'Content Management System',
    description: 'Headless CMS with content types, versioning, and publishing workflow.',
    coreEntities: ['ContentType', 'Content', 'ContentVersion', 'Media', 'Author'],
    optionalEntities: ['Tag', 'Comment', 'SEOMetadata', 'Category', 'Locale'],
    keyRelationships: [
      'Content belongs to ContentType',
      'Content has many ContentVersions',
      'Content has many Tags',
      'Content belongs to Author',
      'Content has one SEOMetadata',
    ],
    typicalFeatures: [
      'Rich text editor with media embedding',
      'Draft/published/archived content lifecycle',
      'Content versioning with diff view and rollback',
      'Media library with image optimization',
      'SEO metadata editor with preview',
      'Content scheduling (future publish dates)',
      'Full-text search across all content',
      'Content localization (multi-language)',
    ],
    securityConsiderations: [
      'HTML sanitization for rich text content',
      'File upload validation and virus scanning',
      'Role-based content editing permissions',
      'Published content caching with invalidation',
    ],
    suggestedIndexStrategy: [
      'contents(content_type_id, status)',
      'contents(author_id, created_at DESC)',
      'contents(slug)',
      'content_versions(content_id, version)',
      'GIN index on contents for full-text search',
    ],
  },

  'event-management-platform': {
    id: 'event-management-platform',
    name: 'Event Management Platform',
    description: 'Create, manage, and sell tickets for events.',
    coreEntities: ['Event', 'Venue', 'TicketType', 'Ticket', 'Registration'],
    optionalEntities: ['Attendee', 'Speaker', 'Sponsor', 'Session', 'CheckIn'],
    keyRelationships: [
      'Event belongs to Venue',
      'Event has many TicketTypes',
      'Event has many Sessions',
      'Registration belongs to Event and Attendee',
      'Registration has many Tickets',
      'Session has many Speakers',
    ],
    typicalFeatures: [
      'Event creation with date, venue, and description',
      'Ticket type management (early bird, VIP, general)',
      'Online registration and checkout',
      'Attendee management and check-in',
      'Session/agenda builder with speaker assignments',
      'QR code tickets for check-in',
      'Waitlist management for sold-out events',
      'Post-event analytics (attendance, revenue)',
    ],
    securityConsiderations: [
      'Ticket purchase rate limiting',
      'QR code validation to prevent duplicates',
      'Payment processing via Stripe',
      'Attendee data privacy compliance',
    ],
    suggestedIndexStrategy: [
      'events(start_date)',
      'tickets(registration_id)',
      'registrations(event_id, attendee_id)',
      'sessions(event_id, start_time)',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 9
// ============================================

export const EXPANDED_CODE_SNIPPETS_9: Record<string, CodeSnippet> = {

  'drizzle-schema-personal-finance': {
    id: 'drizzle-schema-personal-finance',
    title: 'Drizzle Schema — Personal Finance',
    tech: ['typescript'],
    description: 'Complete database schema for a personal finance application.',
    code: `import { pgTable, serial, varchar, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings', 'credit', 'investment', 'cash', 'loan']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'transfer']);

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: accountTypeEnum('type').notNull(),
  institution: varchar('institution', { length: 100 }),
  balance: integer('balance').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  color: varchar('color', { length: 7 }),
  icon: varchar('icon', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  parentId: integer('parent_id'),
  type: varchar('type', { length: 10 }).notNull().default('expense'),
  isDefault: boolean('is_default').notNull().default(false),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  accountId: integer('account_id').notNull(),
  categoryId: integer('category_id'),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),
  description: varchar('description', { length: 300 }),
  date: timestamp('date').notNull(),
  toAccountId: integer('to_account_id'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringId: integer('recurring_id'),
  tags: text('tags'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  categoryId: integer('category_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  amount: integer('amount').notNull(),
  period: varchar('period', { length: 10 }).notNull().default('monthly'),
  spent: integer('spent').notNull().default(0),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  alertThreshold: integer('alert_threshold').default(80),
  rollover: boolean('rollover').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  deadline: timestamp('deadline'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recurringTransactions = pgTable('recurring_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  accountId: integer('account_id').notNull(),
  categoryId: integer('category_id'),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),
  description: varchar('description', { length: 300 }),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  nextDate: timestamp('next_date').notNull(),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});`,
    tags: ['drizzle', 'postgresql', 'finance', 'schema'],
  },

  'drizzle-schema-hr-management': {
    id: 'drizzle-schema-hr-management',
    title: 'Drizzle Schema — HR Management',
    tech: ['typescript'],
    description: 'Complete database schema for an HR management system.',
    code: `import { pgTable, serial, varchar, text, integer, timestamp, boolean, date, pgEnum } from 'drizzle-orm/pg-core';

export const employmentTypeEnum = pgEnum('employment_type', ['full-time', 'part-time', 'contract', 'intern']);
export const leaveTypeEnum = pgEnum('leave_type', ['vacation', 'sick', 'personal', 'parental', 'bereavement', 'unpaid']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  description: text('description'),
  headId: integer('head_id'),
  parentId: integer('parent_id'),
  budget: integer('budget'),
  location: varchar('location', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  avatar: varchar('avatar', { length: 500 }),
  departmentId: integer('department_id').notNull(),
  position: varchar('position', { length: 100 }).notNull(),
  managerId: integer('manager_id'),
  employmentType: employmentTypeEnum('employment_type').notNull(),
  hireDate: date('hire_date').notNull(),
  terminationDate: date('termination_date'),
  salary: integer('salary'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  address: text('address'),
  emergencyContactName: varchar('emergency_contact_name', { length: 100 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  skills: text('skills'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  type: leaveTypeEnum('type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalDays: integer('total_days').notNull(),
  reason: text('reason').notNull(),
  status: leaveStatusEnum('status').notNull().default('pending'),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leaveBalances = pgTable('leave_balances', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  type: leaveTypeEnum('type').notNull(),
  year: integer('year').notNull(),
  total: integer('total').notNull(),
  used: integer('used').notNull().default(0),
  remaining: integer('remaining').notNull(),
});

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  date: date('date').notNull(),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  hoursWorked: integer('hours_worked'),
  status: varchar('status', { length: 20 }).notNull().default('present'),
  notes: text('notes'),
});

export const performanceReviews = pgTable('performance_reviews', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  reviewerId: integer('reviewer_id').notNull(),
  period: varchar('period', { length: 20 }).notNull(),
  rating: integer('rating').notNull(),
  strengths: text('strengths'),
  improvements: text('improvements'),
  goals: text('goals'),
  comments: text('comments'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
});

export const trainings = pgTable('trainings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  instructor: varchar('instructor', { length: 100 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  capacity: integer('capacity'),
  isRequired: boolean('is_required').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const employeeTrainings = pgTable('employee_trainings', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull(),
  trainingId: integer('training_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('enrolled'),
  completedAt: timestamp('completed_at'),
  score: integer('score'),
});`,
    tags: ['drizzle', 'postgresql', 'hr', 'schema'],
  },

  'drizzle-schema-marketplace': {
    id: 'drizzle-schema-marketplace',
    title: 'Drizzle Schema — Marketplace',
    tech: ['typescript'],
    description: 'Complete database schema for a multi-vendor marketplace.',
    code: `import { pgTable, serial, varchar, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'sold', 'archived', 'flagged']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed']);
export const conditionEnum = pgEnum('condition', ['new', 'like-new', 'good', 'fair', 'poor']);

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id'),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
  originalPrice: integer('original_price'),
  categoryId: integer('category_id').notNull(),
  condition: conditionEnum('condition'),
  location: varchar('location', { length: 100 }),
  images: text('images'),
  status: listingStatusEnum('status').notNull().default('draft'),
  quantity: integer('quantity').notNull().default(1),
  views: integer('views').notNull().default(0),
  tags: text('tags'),
  shippingCost: integer('shipping_cost').default(0),
  isFeatured: boolean('is_featured').notNull().default(false),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  buyerId: integer('buyer_id').notNull(),
  sellerId: integer('seller_id').notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  subtotal: integer('subtotal').notNull(),
  shippingCost: integer('shipping_cost').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull(),
  shippingAddress: text('shipping_address'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  notes: text('notes'),
  paidAt: timestamp('paid_at'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  listingId: integer('listing_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  total: integer('total').notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  reviewerId: integer('reviewer_id').notNull(),
  listingId: integer('listing_id').notNull(),
  orderId: integer('order_id'),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 200 }),
  comment: text('comment'),
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  listingId: integer('listing_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').notNull(),
  receiverId: integer('receiver_id').notNull(),
  listingId: integer('listing_id'),
  content: text('content').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const disputes = pgTable('disputes', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  reporterId: integer('reporter_id').notNull(),
  reason: varchar('reason', { length: 50 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  resolution: text('resolution'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sellerProfiles = pgTable('seller_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  storeName: varchar('store_name', { length: 100 }).notNull(),
  description: text('description'),
  logo: varchar('logo', { length: 500 }),
  rating: integer('rating').default(0),
  totalSales: integer('total_sales').default(0),
  totalRevenue: integer('total_revenue').default(0),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});`,
    tags: ['drizzle', 'postgresql', 'marketplace', 'schema', 'multi-vendor'],
  },

  'react-data-table': {
    id: 'react-data-table',
    title: 'React Data Table Component',
    tech: ['typescript'],
    description: 'Reusable data table with sorting, filtering, pagination, and row selection.',
    code: `import { useState, useMemo, useCallback } from 'react';

interface Column<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id: number | string }> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: (number | string)[]) => void;
  searchable?: boolean;
  searchFields?: (keyof T & string)[];
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

function DataTable<T extends { id: number | string }>({
  data,
  columns,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  searchable = false,
  searchFields,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const handleSort = useCallback((key: keyof T) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortKey, sortDir]);

  const filteredData = useMemo(() => {
    if (!search || !searchFields) return data;
    const lower = search.toLowerCase();
    return data.filter(row =>
      searchFields.some(field => {
        const val = row[field];
        return val != null && String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, search, searchFields]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = useCallback((id: number | string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  }, [onSelectionChange]);

  const toggleAll = useCallback(() => {
    const allIds = pagedData.map(r => r.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      allIds.forEach(id => next.delete(id));
    } else {
      allIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  }, [pagedData, selectedIds, onSelectionChange]);

  return (
    <div className="data-table-container">
      {searchable && (
        <div className="data-table-search">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="search-input"
          />
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            {selectable && (
              <th className="checkbox-col">
                <input type="checkbox" onChange={toggleAll}
                  checked={pagedData.length > 0 && pagedData.every(r => selectedIds.has(r.id))} />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                onClick={() => col.sortable && handleSort(col.key)}
                className={col.sortable ? 'sortable' : ''}
              >
                {col.label}
                {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : sortDir === 'desc' ? ' ↓' : '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedData.length === 0 ? (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="empty">{emptyMessage}</td></tr>
          ) : (
            pagedData.map(row => (
              <tr key={row.id} className={selectedIds.has(row.id) ? 'selected' : ''}>
                {selectable && (
                  <td className="checkbox-col">
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}`,
    tags: ['react', 'table', 'sorting', 'pagination', 'component'],
  },

  'api-error-handling': {
    id: 'api-error-handling',
    title: 'API Error Handling Pattern',
    tech: ['typescript'],
    description: 'Structured error handling with custom error classes, middleware, and consistent responses.',
    code: `class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400, 'VALIDATION_ERROR', { errors });
  }
}

class NotFoundError extends AppError {
  constructor(entity: string, id?: string | number) {
    super(
      id ? \`\${entity} with id \${id} not found\` : \`\${entity} not found\`,
      404,
      'NOT_FOUND'
    );
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'RATE_LIMITED', { retryAfter });
  }
}

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  if (err.name === 'ZodError') {
    const zodErr = err as any;
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: {
          errors: zodErr.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      },
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(req.params.id)),
  });
  if (!user) throw new NotFoundError('User', req.params.id);
  res.json(user);
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, req.body.email),
  });
  if (existing) throw new ConflictError('User with this email already exists');

  const [user] = await db.insert(users).values(req.body).returning();
  res.status(201).json(user);
}));

app.use(errorHandler);`,
    tags: ['express', 'error-handling', 'api', 'middleware'],
  },

  'react-infinite-scroll': {
    id: 'react-infinite-scroll',
    title: 'React Infinite Scroll Hook',
    tech: ['typescript'],
    description: 'Custom hook for infinite scrolling with intersection observer.',
    code: `import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialPage?: number;
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
  reset: () => void;
}

function useInfiniteScroll<T>({
  fetchFn,
  initialPage = 1,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null!);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn(page);
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFn, page, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return { items, isLoading, error, hasMore, sentinelRef, reset };
}

function ProductList() {
  const fetchProducts = useCallback(async (page: number) => {
    const res = await fetch(\`/api/products?page=\${page}&limit=20\`);
    const data = await res.json();
    return { data: data.products, hasMore: data.hasMore };
  }, []);

  const { items, isLoading, error, hasMore, sentinelRef } = useInfiniteScroll({
    fetchFn: fetchProducts,
  });

  return (
    <div className="product-grid">
      {items.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      {isLoading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}
      {hasMore && <div ref={sentinelRef} className="scroll-sentinel" />}
      {!hasMore && items.length > 0 && <div className="end-message">No more products</div>}
    </div>
  );
}`,
    tags: ['react', 'infinite-scroll', 'intersection-observer', 'hook'],
  },

  'express-middleware-chain': {
    id: 'express-middleware-chain',
    title: 'Express Middleware Chain Pattern',
    tech: ['typescript'],
    description: 'Composable middleware chain for authentication, authorization, validation, and rate limiting.',
    code: `import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodSchema } from 'zod';

function authenticate(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const payload = verifyToken(token);
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function authorize(...roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function validate(schema: { body?: ZodSchema; params?: ZodSchema; query?: ZodSchema }): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ location: string; errors: any[] }> = [];

    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        errors.push({ location: 'body', errors: result.error.errors });
      } else {
        req.body = result.data;
      }
    }

    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        errors.push({ location: 'params', errors: result.error.errors });
      }
    }

    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        errors.push({ location: 'query', errors: result.error.errors });
      } else {
        req.query = result.data as any;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

function rateLimit(options: { windowMs: number; max: number }): RequestHandler {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.user?.id?.toString() || req.ip || 'unknown';
    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }

    record.count++;
    next();
  };
}

const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

app.post('/api/projects',
  authenticate(),
  authorize('admin', 'manager'),
  validate({ body: createProjectSchema }),
  rateLimit({ windowMs: 60000, max: 30 }),
  asyncHandler(async (req, res) => {
    const project = await createProject(req.body, req.user!.id);
    res.status(201).json(project);
  })
);`,
    tags: ['express', 'middleware', 'authentication', 'authorization', 'validation'],
  },
};

// ============================================
// EXPANDED ANTI-PATTERNS — PART 9
// ============================================

export const EXPANDED_ANTI_PATTERNS_9: AntiPattern[] = [
  {
    id: 'god-component',
    name: 'God Component',
    description: 'A single React component handling too many responsibilities — data fetching, state management, business logic, and rendering.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'high',
    badExample: `function DashboardPage() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    Promise.all([fetchUsers(), fetchProjects(), fetchAnalytics(), fetchNotifications()])
      .then(([u, p, a, n]) => { setUsers(u); setProjects(p); setAnalytics(a); setNotifications(n); })
      .finally(() => setIsLoading(false));
  }, []);

  // ... 500+ lines of rendering logic, event handlers, computed values
}`,
    goodExample: `function DashboardPage() {
  return (
    <DashboardLayout>
      <AnalyticsOverview />
      <UserList />
      <ProjectsSummary />
      <NotificationFeed />
    </DashboardLayout>
  );
}

function UserList() {
  const { users, isLoading } = useUsers();
  const { filtered, search, setSearch, sort, setSort } = useFilterSort(users);
  if (isLoading) return <Skeleton />;
  return <DataTable data={filtered} ... />;
}`,
    fix: 'Break into focused sub-components. Extract data fetching into custom hooks. Separate concerns: fetching, filtering, rendering.',
    tags: ["code-quality"],
  },
  {
    id: 'uncontrolled-side-effects',
    name: 'Uncontrolled Side Effects',
    description: 'Firing side effects without proper cleanup or dependency tracking in useEffect.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'high',
    badExample: `useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000);
  // Missing cleanup — interval runs forever on unmount
});

useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers);
  // Missing dependency array — runs on every render
});

useEffect(() => {
  const ws = new WebSocket('wss://example.com');
  ws.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
  // Missing cleanup — WebSocket stays open on unmount
}, []);`,
    goodExample: `useEffect(() => {
  const interval = setInterval(() => fetchData(), 5000);
  return () => clearInterval(interval);
}, [fetchData]);

useEffect(() => {
  let cancelled = false;
  fetch('/api/users')
    .then(r => r.json())
    .then(data => { if (!cancelled) setUsers(data); });
  return () => { cancelled = true; };
}, []);

useEffect(() => {
  const ws = new WebSocket('wss://example.com');
  ws.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
  return () => ws.close();
}, []);`,
    fix: 'Always return cleanup functions. Use dependency arrays. Cancel in-flight requests on unmount. Track mounted state.',
    tags: ["code-quality"],
  },
  {
    id: 'n-plus-one-queries',
    name: 'N+1 Query Problem',
    description: 'Executing N additional queries inside a loop to fetch related data, causing severe performance degradation.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'critical',
    badExample: `const posts = await db.query.posts.findMany({ limit: 50 });

// BAD: 50 additional queries for authors
for (const post of posts) {
  post.author = await db.query.users.findFirst({
    where: eq(users.id, post.authorId),
  });
}

// BAD: 50 more queries for comments
for (const post of posts) {
  post.comments = await db.query.comments.findMany({
    where: eq(comments.postId, post.id),
  });
}
// Total: 1 + 50 + 50 = 101 queries for 50 posts`,
    goodExample: `const posts = await db.query.posts.findMany({
  limit: 50,
  with: {
    author: true,
    comments: {
      with: { author: true },
      orderBy: [desc(comments.createdAt)],
      limit: 10,
    },
  },
});
// Total: 1 query with JOINs

// Alternative with DataLoader for GraphQL
const authorLoader = new DataLoader(async (ids: number[]) => {
  const authors = await db.query.users.findMany({
    where: inArray(users.id, ids),
  });
  return ids.map(id => authors.find(a => a.id === id));
});`,
    fix: 'Use eager loading (with/include), batch queries with IN clauses, or DataLoader for GraphQL. Monitor query counts in development.',
    tags: ["code-quality"],
  },
  {
    id: 'inconsistent-error-responses',
    name: 'Inconsistent API Error Responses',
    description: 'Returning different error shapes from different endpoints makes client-side error handling unreliable.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'medium',
    badExample: `// Endpoint A
res.status(400).json({ message: 'Invalid email' });

// Endpoint B
res.status(400).json({ error: 'Bad request', details: ['email required'] });

// Endpoint C
res.status(400).send('Validation failed');

// Endpoint D
res.status(400).json({ success: false, errors: [{ field: 'email', msg: 'required' }] });`,
    goodExample: `// Consistent error shape everywhere
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// All endpoints use the same format
res.status(400).json({
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    details: {
      errors: [{ field: 'email', message: 'Email is required' }],
    },
  },
});`,
    fix: 'Define a standard error response interface. Use centralized error handling middleware. Create custom error classes. Document the error format in API docs.',
    tags: ["code-quality"],
  },
  {
    id: 'storing-secrets-in-code',
    name: 'Hardcoded Secrets',
    description: 'Embedding API keys, passwords, or tokens directly in source code instead of environment variables.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'critical',
    badExample: `const stripe = new Stripe('sk_live_abc123def456');
const dbUrl = 'postgresql://admin:password123@prod-db.example.com:5432/myapp';
const jwtSecret = 'super-secret-key-do-not-share';
const apiKey = 'AIzaSyB1234567890abcdefg';`,
    goodExample: `const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const dbUrl = process.env.DATABASE_URL!;
const jwtSecret = process.env.JWT_SECRET!;
const apiKey = process.env.GOOGLE_API_KEY!;

// Validate at startup
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(\`Missing required environment variable: \${envVar}\`);
  }
}`,
    fix: 'Use environment variables for all secrets. Validate required vars at startup. Add .env to .gitignore. Use secret management services in production.',
    tags: ["code-quality"],
  },
  {
    id: 'prop-drilling',
    name: 'Excessive Prop Drilling',
    description: 'Passing props through many intermediate components that do not use them, creating tight coupling.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'medium',
    badExample: `function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  return <Layout user={user} theme={theme} setTheme={setTheme}>
    <Sidebar user={user} theme={theme}>
      <Navigation user={user} theme={theme}>
        <NavItem user={user} theme={theme} />
      </Navigation>
    </Sidebar>
  </Layout>;
}`,
    goodExample: `const UserContext = createContext<User | null>(null);
const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <Layout>
          <Sidebar>
            <Navigation />
          </Sidebar>
        </Layout>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

function NavItem() {
  const user = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  // Direct access without drilling
}`,
    fix: 'Use React Context for cross-cutting concerns. Consider Zustand or Jotai for complex state. Component composition can also help.',
    tags: ["code-quality"],
  },
  {
    id: 'missing-loading-error-states',
    name: 'Missing Loading and Error States',
    description: 'Showing blank screens or broken layouts when data is loading or API calls fail.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'medium',
    badExample: `function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(\`/api/users/\${userId}\`).then(r => r.json()).then(setUser);
  }, [userId]);

  // Crashes if user is null, no loading indicator, no error handling
  return <div><h1>{user.name}</h1><p>{user.email}</p></div>;
}`,
    goodExample: `function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch(\`/api/users/\${userId}\`)
      .then(r => {
        if (!r.ok) throw new Error(\`Failed to load user (\${r.status})\`);
        return r.json();
      })
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) return <ProfileSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  if (!user) return <NotFound message="User not found" />;

  return <div><h1>{user.name}</h1><p>{user.email}</p></div>;
}`,
    fix: 'Always handle loading, error, and empty states. Use skeleton loaders. Provide retry actions. Show meaningful error messages.',
    tags: ["code-quality"],
  },
  {
    id: 'sql-injection-via-string-concat',
    name: 'SQL Injection via String Concatenation',
    description: 'Building SQL queries by concatenating user input instead of using parameterized queries.',
    whyBad: "Leads to bugs, poor maintainability, and security vulnerabilities.",
    severity: 'critical',
    badExample: `app.get('/api/users', async (req, res) => {
  const search = req.query.search;
  const results = await db.execute(
    \`SELECT * FROM users WHERE name LIKE '%\${search}%'\`
  );
  // Input: ' OR 1=1; DROP TABLE users; --
  // Executes: SELECT * FROM users WHERE name LIKE '%' OR 1=1; DROP TABLE users; --%'
  res.json(results);
});`,
    goodExample: `app.get('/api/users', async (req, res) => {
  const search = req.query.search;
  const results = await db.execute(
    sql\`SELECT * FROM users WHERE name LIKE \${'%' + search + '%'}\`
  );
  res.json(results);
});

// Or with Drizzle ORM (always safe)
const results = await db.query.users.findMany({
  where: like(users.name, \`%\${search}%\`),
});`,
    fix: 'Always use parameterized queries or ORM methods. Never concatenate user input into SQL strings. Use prepared statements.',
    tags: ["code-quality"],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 9
// ============================================

export const EXPANDED_BEST_PRACTICES_9: BestPractice[] = [
  {
    id: 'api-versioning',
    title: 'API Versioning Strategy',
    category: 'api',
    description: 'Version your API to allow backward-compatible evolution without breaking existing clients.',
    do: [
      'Use URL path versioning (/api/v1/users) for public APIs',
      'Maintain at most 2 active API versions',
      'Document breaking changes with migration guide',
      'Use deprecation headers before removing endpoints',
      'Version data models separately from API routes',
      'Run integration tests against all active versions',
    ],
    dont: [
      'Change existing endpoint behavior without versioning',
      'Remove fields from responses without deprecation period',
      'Maintain more than 2 active versions simultaneously',
    ],
    languages: ['typescript'],
  },
  {
    id: 'environment-configuration',
    title: 'Environment Configuration',
    category: 'deployment',
    description: 'Manage configuration across environments safely with validation and type safety.',
    do: [
      'Use .env files for local development only — never commit them',
      'Validate all environment variables at startup with fail-fast behavior',
      'Use typed configuration objects instead of raw process.env access',
      'Separate secrets from configuration (use secret managers in production)',
      'Provide sensible defaults for non-sensitive config',
      'Document all required environment variables in .env.example',
      'Use different .env files per environment (.env.development, .env.test)',
    ],
    dont: [
      'Commit .env files to version control',
      'Use process.env directly throughout the codebase',
      'Fail silently when a required variable is missing',
      'Store secrets as plain config values',
    ],
    languages: ['typescript'],
  },
  {
    id: 'database-indexing-strategy',
    title: 'Database Indexing Strategy',
    category: 'database',
    description: 'Create effective indexes based on query patterns to optimize read performance.',
    do: [
      'Index columns used in WHERE, JOIN, and ORDER BY clauses',
      'Create composite indexes matching common query patterns (leftmost prefix rule)',
      'Add partial indexes for filtered queries (WHERE status = active)',
      'Use CONCURRENTLY for creating indexes in production to avoid locks',
      'Monitor slow queries and missing indexes with EXPLAIN ANALYZE',
      'Remove unused indexes — they slow down writes',
      'Consider covering indexes for read-heavy queries',
      'Index foreign keys to speed up JOINs and cascading deletes',
    ],
    dont: [
      'Add indexes on every column blindly',
      'Create indexes during peak traffic without CONCURRENTLY',
      'Keep unused indexes — they slow writes with no read benefit',
      'Ignore composite index column ordering',
    ],
    languages: ['sql', 'typescript'],
  },
  {
    id: 'react-component-composition',
    title: 'React Component Composition',
    category: 'react',
    description: 'Build flexible, reusable UI through composition patterns instead of prop explosion.',
    do: [
      'Prefer composition over configuration (children > 10 boolean props)',
      'Use the compound component pattern for related component groups',
      'Implement render props for cross-cutting behavior sharing',
      'Use the slot pattern for layout components with named insertion points',
      'Keep components single-responsibility',
      'Use forwardRef for DOM-wrapping components',
      'Export sub-components as properties of the main component (Card.Header, Card.Body)',
    ],
    dont: [
      'Create components with more than 10 boolean configuration props',
      'Deeply nest prop drilling through many layers',
      'Mix layout logic with business logic in one component',
      'Use inheritance instead of composition for component reuse',
    ],
    languages: ['typescript', 'react'],
  },
  {
    id: 'secure-authentication-flow',
    title: 'Secure Authentication Flow',
    category: 'security',
    description: 'Implement authentication with proper token management, refresh flows, and session security.',
    do: [
      'Use httpOnly, secure, sameSite cookies for tokens in web apps',
      'Implement short-lived access tokens (15 min) with longer refresh tokens (7 days)',
      'Store refresh tokens in database for revocation capability',
      'Hash passwords with bcrypt (cost factor >= 10)',
      'Rate limit login attempts per IP and per account',
      'Implement account lockout after N failed attempts',
      'Log all authentication events for audit trail',
      'Use CSRF tokens for cookie-based auth',
      'Invalidate all sessions on password change',
    ],
    dont: [
      'Store tokens in localStorage (XSS vulnerable)',
      'Use long-lived access tokens without refresh flow',
      'Store passwords in plain text or with weak hashing (MD5/SHA1)',
      'Expose detailed error messages (user not found vs wrong password)',
    ],
    languages: ['typescript'],
  },
  {
    id: 'responsive-design-patterns',
    title: 'Responsive Design Patterns',
    category: 'ux',
    description: 'Build layouts that adapt gracefully across mobile, tablet, and desktop viewports.',
    do: [
      'Design mobile-first, then enhance for larger screens',
      'Use CSS Grid for page layouts and Flexbox for component layouts',
      'Define breakpoints based on content, not device sizes',
      'Use container queries for component-level responsiveness',
      'Avoid fixed pixel widths — use relative units (rem, %, vw)',
      'Test on real devices and screen sizes, not just browser resize',
      'Use responsive images with srcset and sizes attributes',
      'Consider touch targets (min 44x44px) for mobile',
    ],
    dont: [
      'Use fixed pixel widths for layout containers',
      'Hide critical content on mobile — restructure instead',
      'Use device-specific breakpoints (iPhone 12, Galaxy S21)',
      'Rely solely on browser resize for responsive testing',
    ],
    languages: ['css', 'html', 'react'],
  },
  {
    id: 'error-boundary-patterns',
    title: 'React Error Boundaries',
    category: 'react',
    description: 'Gracefully handle runtime errors in React component trees without crashing the entire application.',
    do: [
      'Wrap major page sections in error boundaries',
      'Show user-friendly fallback UI, not stack traces',
      'Log errors to monitoring service (Sentry, LogRocket)',
      'Provide retry/refresh actions in fallback UI',
      'Use granular boundaries — one per route section, not one for entire app',
      'Reset error boundary state on navigation',
      'Test error boundaries by simulating component failures',
    ],
    dont: [
      'Wrap the entire app in a single error boundary',
      'Show raw stack traces to end users',
      'Silently swallow errors without logging',
      'Forget to reset error boundary state on route changes',
    ],
    languages: ['typescript', 'react'],
  },
  {
    id: 'data-fetching-patterns',
    title: 'Data Fetching Patterns',
    category: 'react',
    description: 'Efficient data fetching with loading states, caching, error handling, and optimistic updates.',
    do: [
      'Use React Query or SWR for server state management',
      'Implement optimistic updates for instant-feeling mutations',
      'Cache responses with proper invalidation strategies',
      'Handle loading, error, and empty states for every data fetch',
      'Use abort controllers to cancel stale requests',
      'Implement request deduplication for concurrent identical requests',
      'Prefetch data on hover for navigation links',
      'Show stale data while revalidating in the background',
    ],
    dont: [
      'Fetch data in useEffect without cleanup/abort controller',
      'Store server state in Redux or local state',
      'Ignore loading and error states',
      'Make identical parallel requests without deduplication',
    ],
    languages: ['typescript', 'react'],
  },
];
