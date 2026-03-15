import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 3
// Full-Stack Architecture, DevOps, Advanced DB, UI/UX, Testing
// ============================================

export const EXPANDED_CONCEPTS_3: Record<string, Concept> = {

  // ── Full-Stack Architecture ────────────────────────────────────────────────

  monorepo_architecture: {
    id: 'monorepo-architecture',
    name: 'Monorepo Architecture',
    category: 'architecture',
    description: 'Manage multiple packages (frontend, backend, shared libs) in a single repository with tools like pnpm workspaces, Turborepo, or Nx.',
    explanation: 'A monorepo keeps all related projects in one repository. Benefits: shared types between frontend and backend, atomic commits across packages, unified CI/CD, easier dependency management. Use pnpm workspaces for package management and Turborepo for build orchestration. Structure: packages/ for shared libraries, apps/ or artifacts/ for deployable services. Shared types go in a shared package imported by both client and server.',
    examples: [
      `// pnpm-workspace.yaml
packages:
  - "packages/*"
  - "artifacts/*"

// packages/shared/src/types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// artifacts/api-server/src/routes/users.ts
import type { User, ApiResponse } from '@workspace/shared';

app.get('/api/users', async (req, res) => {
  const users: User[] = await getUsers();
  const response: ApiResponse<User[]> = { data: users };
  res.json(response);
});

// artifacts/web-client/src/hooks/useUsers.ts
import type { User, ApiResponse } from '@workspace/shared';

function useUsers() {
  return useQuery<ApiResponse<User[]>>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  });
}`,
    ],
    relatedConcepts: ['dependency-injection', 'microservices'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  service_layer_pattern: {
    id: 'service-layer',
    name: 'Service Layer Pattern',
    category: 'architecture',
    description: 'Encapsulate business logic in service functions separate from route handlers.',
    explanation: 'Route handlers should only: (1) parse/validate input, (2) call service functions, (3) format the response. ALL business logic lives in service functions. Services are framework-agnostic (no req/res), making them testable and reusable. Services call the database layer (repositories/DAL). This separation allows: testing services without HTTP, reusing logic across routes, and swapping frameworks without rewriting business logic.',
    examples: [
      `// services/task-service.ts — Pure business logic, no Express
export class TaskService {
  async create(userId: number, data: CreateTaskInput): Promise<Task> {
    const project = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    if (!project[0]) throw new NotFoundError('Project');

    const isMember = await this.isProjectMember(userId, data.projectId);
    if (!isMember) throw new ForbiddenError('Not a project member');

    const [task] = await db.insert(tasks).values({
      ...data,
      createdBy: userId,
      status: 'todo',
      position: await this.getNextPosition(data.projectId),
    }).returning();

    await this.createActivity(task.id, userId, 'created');
    return task;
  }

  async updateStatus(taskId: number, userId: number, newStatus: string): Promise<Task> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) throw new NotFoundError('Task');

    const validTransitions: Record<string, string[]> = {
      'todo': ['in-progress'],
      'in-progress': ['todo', 'review', 'done'],
      'review': ['in-progress', 'done'],
      'done': ['todo'],
    };

    const allowed = validTransitions[task.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(\`Cannot transition from \${task.status} to \${newStatus}\`);
    }

    const [updated] = await db.update(tasks)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    await this.createActivity(taskId, userId, \`status_changed_to_\${newStatus}\`);
    return updated;
  }

  private async getNextPosition(projectId: number): Promise<number> {
    const result = await db.select({ max: sql<number>\`COALESCE(MAX(position), 0)\` })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    return (result[0]?.max ?? 0) + 1;
  }

  private async isProjectMember(userId: number, projectId: number): Promise<boolean> {
    const [member] = await db.select()
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)));
    return !!member;
  }

  private async createActivity(taskId: number, userId: number, action: string) {
    await db.insert(activities).values({ taskId, userId, action, createdAt: new Date() });
  }
}

// routes/tasks.ts — Thin route handler
const taskService = new TaskService();

app.post('/api/tasks', authenticate, async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  const task = await taskService.create(req.user!.id, parsed.data);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id/status', authenticate, async (req, res) => {
  const parsed = z.object({ status: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Invalid status' });
  const task = await taskService.updateStatus(Number(req.params.id), req.user!.id, parsed.data.status);
  res.json(task);
});`,
    ],
    relatedConcepts: ['dependency-injection', 'repository-pattern', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  repository_pattern: {
    id: 'repository-pattern',
    name: 'Repository Pattern',
    category: 'architecture',
    description: 'Abstract database access behind a repository interface for cleaner service code.',
    explanation: 'The repository pattern separates data access logic from business logic. Each entity gets a repository with standard methods: findById, findAll, create, update, delete. Services call repositories instead of raw database queries. Benefits: (1) Swap databases without changing services. (2) Centralize query logic (filtering, sorting, pagination). (3) Easy to mock in tests. In TypeScript with Drizzle: create repository classes that encapsulate Drizzle queries.',
    examples: [
      `// repositories/base-repository.ts
export abstract class BaseRepository<T> {
  constructor(
    protected db: typeof import('./db').db,
    protected table: any,
  ) {}

  async findById(id: number): Promise<T | null> {
    const [row] = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    return (row as T) ?? null;
  }

  async findAll(opts: { page?: number; pageSize?: number; orderBy?: string; orderDir?: 'asc' | 'desc' } = {}): Promise<{ data: T[]; total: number }> {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    const [data, countResult] = await Promise.all([
      this.db.select().from(this.table).limit(pageSize).offset(offset).orderBy(desc(this.table.createdAt)),
      this.db.select({ count: sql<number>\`count(*)::int\` }).from(this.table),
    ]);

    return { data: data as T[], total: countResult[0]?.count ?? 0 };
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const [row] = await this.db.insert(this.table).values(data as any).returning();
    return row as T;
  }

  async update(id: number, data: Partial<T>): Promise<T | null> {
    const [row] = await this.db.update(this.table)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(this.table.id, id))
      .returning();
    return (row as T) ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.delete(this.table).where(eq(this.table.id, id));
    return (result?.rowCount ?? 0) > 0;
  }
}

// repositories/user-repository.ts
export class UserRepository extends BaseRepository<User> {
  constructor(db: any) { super(db, users); }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async findByRole(role: string): Promise<User[]> {
    return this.db.select().from(users).where(eq(users.role, role));
  }
}`,
    ],
    relatedConcepts: ['service-layer', 'dependency-injection', 'database-transactions-advanced'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  middleware_composition: {
    id: 'middleware-composition',
    name: 'Express Middleware Composition',
    category: 'architecture',
    description: 'Compose reusable middleware for auth, validation, rate limiting, and logging.',
    explanation: 'Express middleware runs in sequence on each request. Compose small, focused middleware functions: authenticate (verify JWT), authorize (check role), validate (parse Zod schema), rateLimit (throttle), log (request logging). Chain them on routes: app.get("/admin", authenticate, authorize("admin"), handler). Create middleware factories for reusable patterns like validate(schema) that returns a middleware function.',
    examples: [
      `// middleware/validate.ts — Middleware factory for Zod validation
import { z, AnyZodObject } from 'zod';

export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    (req as any).validatedQuery = parsed.data;
    next();
  };
}

export function validateParams(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    next();
  };
}

// middleware/async-handler.ts — Wrap async route handlers to catch errors
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Usage — compose middleware on routes
const createUserSchema = z.object({ name: z.string().min(1), email: z.string().email() });
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
});

app.post('/api/users',
  authenticate,
  requireRole('admin'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  })
);

app.get('/api/users',
  authenticate,
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await userService.list((req as any).validatedQuery);
    res.json(result);
  })
);`,
    ],
    relatedConcepts: ['rest-api-design', 'input-validation', 'middleware-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  graceful_shutdown: {
    id: 'graceful-shutdown',
    name: 'Graceful Shutdown Pattern',
    category: 'deployment',
    description: 'Handle SIGTERM/SIGINT to cleanly shut down servers, close DB connections, and finish in-flight requests.',
    explanation: 'When deploying or restarting, the process receives SIGTERM. Without graceful shutdown, in-flight requests are dropped and database connections leak. A graceful shutdown: (1) Stops accepting new connections. (2) Waits for in-flight requests to complete (with timeout). (3) Closes database connection pools. (4) Closes other resources (Redis, WebSocket). (5) Exits cleanly. This prevents data corruption and connection leaks.',
    examples: [
      `import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

const server = app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

function gracefulShutdown(signal: string) {
  console.log(\`\${signal} received. Starting graceful shutdown...\`);

  server.close(async () => {
    console.log('HTTP server closed. No longer accepting new connections.');

    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch (err) {
      console.error('Error closing database pool:', err);
    }

    console.log('Graceful shutdown complete.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown — timeout exceeded');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));`,
    ],
    relatedConcepts: ['connection-pooling', 'health-check', 'deployment'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  health_check_pattern: {
    id: 'health-check',
    name: 'Health Check Endpoint Pattern',
    category: 'deployment',
    description: 'Expose /health and /ready endpoints for load balancers and Kubernetes probes.',
    explanation: 'Health checks let infrastructure know if your service is alive and ready. Liveness probe (/health): returns 200 if the process is running (lightweight, no DB call). Readiness probe (/ready): returns 200 if the service can handle requests (checks DB, Redis, external deps). Use liveness to detect hangs; use readiness to route traffic only to healthy instances. Return structured JSON with component status.',
    examples: [
      `app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION ?? 'unknown',
  });
});

app.get('/ready', async (_req, res) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await db.execute(sql\`SELECT 1\`);
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart };
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});`,
    ],
    relatedConcepts: ['graceful-shutdown', 'deployment'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  // ── Advanced React Patterns ────────────────────────────────────────────────

  react_suspense: {
    id: 'react-suspense-data',
    name: 'React Suspense for Data Fetching',
    category: 'react',
    description: 'Use Suspense boundaries to declaratively handle loading states in React.',
    explanation: 'React Suspense lets you show fallback UI while async content is loading. Instead of checking isLoading in every component, wrap the tree in <Suspense> with a fallback prop. Libraries like React Query and Next.js support Suspense mode. Benefits: cleaner components (no loading checks), composable loading states, streaming SSR. Use nested Suspense boundaries for fine-grained loading indicators.',
    examples: [
      `import { Suspense } from 'react';

function PostPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/4" />
      <div className="space-y-3 mt-8">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PostPage({ postId }: { postId: number }) {
  return (
    <Suspense fallback={<PostPageSkeleton />}>
      <PostContent postId={postId} />
      <Suspense fallback={<CommentsSkeleton />}>
        <PostComments postId={postId} />
      </Suspense>
    </Suspense>
  );
}

function PostContent({ postId }: { postId: number }) {
  const { data: post } = useSuspenseQuery({
    queryKey: ['posts', postId],
    queryFn: () => fetch(\`/api/posts/\${postId}\`).then(r => r.json()),
  });

  return (
    <article className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">{new Date(post.publishedAt).toLocaleDateString()}</p>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}`,
    ],
    relatedConcepts: ['react-error-boundaries', 'lazy-loading', 'react-custom-hooks'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  react_portal: {
    id: 'react-portal',
    name: 'React Portals',
    category: 'react',
    description: 'Render components outside the DOM hierarchy (modals, tooltips, dropdowns) while keeping React context.',
    explanation: 'React portals render children into a different DOM node than the parent component. Use for: modals (render to document.body to avoid overflow/z-index issues), tooltips (position relative to viewport), toast notifications, dropdown menus. The portal component maintains React context and event bubbling from the parent tree despite being in a different DOM location.',
    examples: [
      `import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={\`relative w-full \${SIZES[size]} bg-background rounded-xl shadow-xl p-6 mx-4 animate-in fade-in zoom-in-95 duration-200\`}
        role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Usage:
// const [isOpen, setIsOpen] = useState(false);
// <button onClick={() => setIsOpen(true)}>Open Modal</button>
// <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Edit Task">
//   <TaskForm task={task} onSave={handleSave} />
// </Modal>`,
    ],
    relatedConcepts: ['react-compound-components', 'react-error-boundaries'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  react_form_patterns: {
    id: 'react-form-patterns',
    name: 'React Form Patterns with React Hook Form',
    category: 'react',
    description: 'Build performant forms with React Hook Form and Zod validation.',
    explanation: 'React Hook Form uses uncontrolled components (refs) for performance — no re-render on every keystroke. Integrate with Zod via @hookform/resolvers for type-safe validation. Pattern: define Zod schema → infer TypeScript type → pass to useForm. Handle server errors by setting form errors from the API response. Use useFieldArray for dynamic form fields.',
    examples: [
      `import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  deadline: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    'Invalid date'
  ),
  tags: z.array(z.object({
    name: z.string().min(1, 'Tag name is required').max(30),
  })).max(5, 'Max 5 tags'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

function CreateProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { tags: [{ name: '' }], priority: 'medium' },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'tags' });

  const onSubmit = async (data: CreateProjectForm) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.details) {
          Object.entries(err.details).forEach(([field, messages]) => {
            setError(field as any, { message: (messages as string[])[0] });
          });
          return;
        }
        throw new Error(err.error);
      }
      onSuccess();
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Failed to create project' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Project Name *</label>
        <input id="name" {...register('name')}
          className={\`w-full border rounded-lg px-3 py-2 text-sm \${errors.name ? 'border-red-500' : ''}\`} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
        <textarea id="description" {...register('description')} rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority</label>
        <select id="priority" {...register('priority')} className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 mb-2">
            <input {...register(\`tags.\${index}.name\`)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Tag name" />
            <button type="button" onClick={() => remove(index)}
              className="text-sm text-red-500 hover:underline px-2">Remove</button>
          </div>
        ))}
        {fields.length < 5 && (
          <button type="button" onClick={() => append({ name: '' })}
            className="text-sm text-primary hover:underline">+ Add Tag</button>
        )}
      </div>

      {errors.root && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
        {isSubmitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}`,
    ],
    relatedConcepts: ['input-validation', 'react-custom-hooks', 'react-compound-components'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  react_optimistic_updates: {
    id: 'react-optimistic-updates',
    name: 'Optimistic Updates with React Query',
    category: 'react',
    description: 'Update the UI immediately on user action, then reconcile with the server response.',
    explanation: 'Optimistic updates make the UI feel instant by updating the local cache before the server responds. If the server request fails, roll back to the previous state. React Query supports this via the onMutate/onError/onSettled hooks in useMutation. Use for: toggling likes, marking tasks complete, updating settings — any action where the expected outcome is clear.',
    examples: [
      `function useToggleTaskDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) =>
      fetch(\`/api/tasks/\${taskId}/toggle\`, { method: 'PATCH' }).then(r => r.json()),

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map(t => t.id === taskId ? { ...t, done: !t.done } : t) ?? []
      );

      return { previousTasks };
    },

    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Usage in component:
function TaskItem({ task }: { task: Task }) {
  const toggleDone = useToggleTaskDone();

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <input type="checkbox" checked={task.done}
        onChange={() => toggleDone.mutate(task.id)}
        disabled={toggleDone.isPending} />
      <span className={task.done ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
    </div>
  );
}`,
    ],
    relatedConcepts: ['react-memo', 'zustand', 'rest-api-design'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  // ── Accessibility ──────────────────────────────────────────────────────────

  aria_patterns: {
    id: 'aria-patterns',
    name: 'ARIA Patterns for Web Accessibility',
    category: 'accessibility',
    description: 'Use ARIA roles, states, and properties to make interactive components accessible to screen readers.',
    explanation: 'ARIA (Accessible Rich Internet Applications) attributes communicate the purpose and state of interactive elements to assistive technologies. Key principles: (1) Use semantic HTML first (button, nav, main, dialog) — ARIA is a supplement, not a replacement. (2) Every interactive element needs an accessible name (aria-label, aria-labelledby, or visible text). (3) Dynamic content needs aria-live for announcements. (4) Focus management is critical for modals, dropdowns, and tabs.',
    examples: [
      `// Accessible dropdown menu
function DropdownMenu({ label, items }: { label: string; items: { label: string; onClick: () => void }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuId = useId();

  useEffect(() => {
    if (!isOpen) { setActiveIndex(-1); return; }
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)); break;
        case 'ArrowUp': e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); break;
        case 'Escape': setIsOpen(false); buttonRef.current?.focus(); break;
        case 'Enter': case ' ':
          if (activeIndex >= 0) { e.preventDefault(); items[activeIndex].onClick(); setIsOpen(false); }
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, items]);

  return (
    <div className="relative">
      <button ref={buttonRef} aria-haspopup="true" aria-expanded={isOpen} aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
        {label}
      </button>
      {isOpen && (
        <div ref={menuRef} id={menuId} role="menu" aria-label={label}
          className="absolute top-full left-0 mt-1 bg-background border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
          {items.map((item, i) => (
            <button key={i} role="menuitem" tabIndex={-1}
              className={\`w-full text-left px-3 py-2 text-sm \${activeIndex === i ? 'bg-muted' : 'hover:bg-muted'}\`}
              onClick={() => { item.onClick(); setIsOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}`,
    ],
    relatedConcepts: ['react-compound-components', 'react-portal'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  keyboard_navigation: {
    id: 'keyboard-navigation',
    name: 'Keyboard Navigation Patterns',
    category: 'accessibility',
    description: 'Implement keyboard navigation for interactive components (focus trap, roving tabindex, arrow keys).',
    explanation: 'All interactive functionality must be keyboard-accessible. Patterns: (1) Focus trap for modals — Tab cycles within the modal, Escape closes it. (2) Roving tabindex for lists — one item has tabIndex=0, others have tabIndex=-1, arrow keys move focus. (3) Skip links for page navigation. (4) Focus visible styles — never remove :focus-visible outlines. Test by navigating your entire app with just the keyboard.',
    examples: [
      `// Focus trap hook for modals
function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = container.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    firstFocusable?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [isActive]);

  return containerRef;
}

// Skip link component
function SkipLink() {
  return (
    <a href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium">
      Skip to main content
    </a>
  );
}`,
    ],
    relatedConcepts: ['aria-patterns', 'react-portal'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Animation / UX ─────────────────────────────────────────────────────────

  animation_patterns: {
    id: 'animation-patterns',
    name: 'CSS & Framer Motion Animation Patterns',
    category: 'ux',
    description: 'Implement smooth animations for page transitions, list changes, and micro-interactions.',
    explanation: 'Good animations provide feedback, guide attention, and make interactions feel natural. Rules: (1) Keep animations short (150-300ms). (2) Use ease-out for enter animations (starts fast, decelerates). (3) Use ease-in for exit animations. (4) Respect prefers-reduced-motion. (5) Never animate layout-triggering properties (width, height, top) — use transform and opacity. Use CSS transitions for simple state changes, Framer Motion for complex orchestrated animations.',
    examples: [
      `// Tailwind CSS animation classes (use with tailwindcss-animate plugin)
// <div className="animate-in fade-in slide-in-from-bottom-4 duration-300" />
// <div className="animate-out fade-out slide-out-to-top-2 duration-200" />

// Framer Motion list animation
import { motion, AnimatePresence } from 'framer-motion';

function AnimatedList({ items }: { items: Task[] }) {
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <TaskCard task={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Page transition wrapper
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 0.2, ease: 'easeOut' };`,
    ],
    relatedConcepts: ['react-memo', 'lazy-loading'],
    difficulty: 'intermediate',
    languages: ['typescript', 'css'],
  },

  skeleton_loading: {
    id: 'skeleton-loading',
    name: 'Skeleton Loading Pattern',
    category: 'ux',
    description: 'Show placeholder shapes that match the content layout while data is loading.',
    explanation: 'Skeleton screens are better than spinners because they: (1) Set expectations about the content structure. (2) Feel faster (perceived performance). (3) Reduce layout shift when content loads. Build skeleton components that mirror the shape and size of the real content. Use a subtle pulse animation. Create skeleton variants for each content type (card, list item, table row, profile).',
    examples: [
      `function CardSkeleton() {
  return (
    <div className="bg-card border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <div className="w-6 h-6 bg-muted rounded-full" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  );
}

function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <div className={\`h-4 bg-muted rounded \${i === 0 ? 'w-32' : i === columns - 1 ? 'w-16' : 'w-24'}\`} />
        </td>
      ))}
    </tr>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      <div className="w-16 h-16 bg-muted rounded-full" />
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded w-36" />
        <div className="h-3 bg-muted rounded w-48" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    </div>
  );
}

function DataGrid({ isLoading, data, columns }: { isLoading: boolean; data: any[]; columns: number }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map(item => <DataCard key={item.id} item={item} />)}
    </div>
  );
}`,
    ],
    relatedConcepts: ['react-suspense-data', 'animation-patterns', 'lazy-loading'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  // ── Data Fetching ──────────────────────────────────────────────────────────

  react_query_patterns: {
    id: 'react-query-patterns',
    name: 'React Query (TanStack Query) Patterns',
    category: 'react',
    description: 'Server state management with caching, automatic refetching, and mutations.',
    explanation: 'React Query manages server state — data that comes from an API and lives on the server. It handles: caching (avoid redundant requests), automatic background refetching (stale-while-revalidate), loading/error states, pagination, infinite scroll, optimistic updates, and request deduplication. Use useQuery for reads, useMutation for writes. Structure query keys as arrays: ["users", { page, search }]. Invalidate related queries after mutations.',
    examples: [
      `import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

// Custom hook for fetching tasks with filters
function useTasks(filters: { status?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(filters.page ?? 1));

      const res = await fetch(\`/api/tasks?\${params}\`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json() as Promise<{ data: Task[]; meta: PaginationMeta }>;
    },
    placeholderData: (prev) => prev,
  });
}

// Custom mutation hook
function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create task');
      }
      return res.json() as Promise<Task>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Usage in a component
function TasksPage() {
  const [filters, setFilters] = useState({ page: 1, status: '', search: '' });
  const { data, isLoading, error } = useTasks(filters);
  const createTask = useCreateTask();

  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <SearchBar value={filters.search} onChange={search => setFilters(f => ({ ...f, search, page: 1 }))} />
      <StatusFilter value={filters.status} onChange={status => setFilters(f => ({ ...f, status, page: 1 }))} />

      {isLoading ? <TaskListSkeleton /> : (
        <>
          {data?.data.map(task => <TaskCard key={task.id} task={task} />)}
          <Pagination meta={data?.meta} onPageChange={page => setFilters(f => ({ ...f, page }))} />
        </>
      )}
    </div>
  );
}`,
    ],
    relatedConcepts: ['react-optimistic-updates', 'rest-api-design', 'cursor-pagination'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Caching ────────────────────────────────────────────────────────────────

  caching_strategies: {
    id: 'caching-strategies',
    name: 'Caching Strategies',
    category: 'performance',
    description: 'In-memory and Redis-based caching for API responses, database queries, and computed data.',
    explanation: 'Caching reduces database load and speeds up responses. Strategies: (1) In-memory cache (Map) for single-instance, small datasets. (2) Redis for distributed, multi-instance caching. (3) HTTP cache headers (Cache-Control, ETag) for client-side caching. Patterns: cache-aside (check cache → miss → fetch → store), write-through (write to cache + DB together), TTL-based expiration. Always invalidate cache on mutation. Never cache user-specific data in shared caches without proper keying.',
    examples: [
      `// Simple in-memory cache with TTL
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) this.cache.delete(key);
    }
  }

  clear(): void { this.cache.clear(); }
}

const cache = new MemoryCache<any>();

// Cache-aside pattern in a service
async function getProductBySlug(slug: string): Promise<Product | null> {
  const cacheKey = \`product:\${slug}\`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (product) cache.set(cacheKey, product, 10 * 60 * 1000);
  return product ?? null;
}

// Invalidate on mutation
async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
  cache.invalidate(\`product:\`);
  return updated;
}

// HTTP caching middleware
function httpCache(seconds: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Cache-Control', \`public, max-age=\${seconds}, s-maxage=\${seconds}\`);
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  };
}

// Usage:
app.get('/api/products/:slug', httpCache(60), asyncHandler(async (req, res) => {
  const product = await getProductBySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}));`,
    ],
    relatedConcepts: ['connection-pooling', 'database-indexing'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  // ── Logging & Observability ────────────────────────────────────────────────

  structured_logging: {
    id: 'structured-logging',
    name: 'Structured Logging with Pino',
    category: 'deployment',
    description: 'Use structured JSON logging for machine-parseable logs with context and correlation IDs.',
    explanation: 'Console.log is fine for development but useless in production. Structured logging with Pino produces JSON logs that can be parsed, filtered, and aggregated by log management tools (Datadog, Grafana, CloudWatch). Key practices: (1) Use log levels (trace, debug, info, warn, error, fatal). (2) Add context (userId, requestId, endpoint). (3) Log request/response for API debugging. (4) Never log sensitive data (passwords, tokens, PII). (5) Use correlation IDs to trace requests across services.',
    examples: [
      `import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Request logging middleware
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const start = Date.now();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const reqLogger = logger.child({ requestId, method: req.method, url: req.url });
  req.log = reqLogger;

  reqLogger.info({ ip: req.ip, userAgent: req.get('user-agent') }, 'Request started');

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    reqLogger[level]({ statusCode: res.statusCode, duration }, 'Request completed');
  });

  next();
}

// Usage in services
async function createOrder(userId: number, items: CartItem[]) {
  const log = logger.child({ userId, service: 'order' });

  log.info({ itemCount: items.length }, 'Creating order');

  try {
    const order = await processOrder(userId, items);
    log.info({ orderId: order.id, total: order.total }, 'Order created successfully');
    return order;
  } catch (err) {
    log.error({ err, items }, 'Order creation failed');
    throw err;
  }
}`,
    ],
    relatedConcepts: ['graceful-shutdown', 'health-check'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  environment_config: {
    id: 'environment-config',
    name: 'Environment Configuration Pattern',
    category: 'deployment',
    description: 'Centralized, validated configuration from environment variables.',
    explanation: 'Scattered process.env access throughout the codebase leads to typos, missing values, and type issues. Centralize ALL configuration in a single config module that: (1) Validates all required env vars at startup (fail fast). (2) Provides typed access. (3) Sets defaults for optional values. (4) Documents what each variable does. Use Zod to validate the env schema on startup.',
    examples: [
      `import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CORS_ORIGINS: z.string().transform(s => s.split(',').map(o => o.trim())).default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(5),
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
});

type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    for (const issue of result.error.issues) {
      console.error(\`  \${issue.path.join('.')}: \${issue.message}\`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

// Usage:
// import { config } from './config';
// const pool = new Pool({ connectionString: config.DATABASE_URL });
// app.listen(config.PORT, () => console.log(\`Server running on port \${config.PORT}\`));`,
    ],
    relatedConcepts: ['input-validation', 'graceful-shutdown'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 3
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_3: Record<string, EntityArchetype> = {

  // ── Project Management Domain ──────────────────────────────────────────────

  project: {
    id: 'project',
    name: 'Project',
    aliases: ['workspace', 'board', 'initiative'],
    domain: 'project-management',
    description: 'A project container for tasks, team members, and milestones.',
    traits: ['pageable', 'auditable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Project name' },
      { name: 'slug', type: 'varchar(200) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Project description' },
      { name: 'ownerId', type: 'integer not null references users(id)', nullable: false, description: 'Project owner' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|archived|completed' },
      { name: 'color', type: 'varchar(7)', nullable: true, description: 'Project color (hex)' },
      { name: 'icon', type: 'varchar(50)', nullable: true, description: 'Project icon identifier' },
      { name: 'visibility', type: "varchar(20) not null default 'private'", nullable: false, description: 'private|team|public' },
      { name: 'startDate', type: 'date', nullable: true, description: 'Project start date' },
      { name: 'targetDate', type: 'date', nullable: true, description: 'Target completion date' },
      { name: 'completedAt', type: 'timestamptz', nullable: true, description: 'Actual completion time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['task', 'project_member', 'milestone', 'label', 'user'],
    suggestedIndexes: ['slug (unique)', 'ownerId', 'status', '(status, ownerId)'],
    typicalEndpoints: [
      'GET /projects',
      'GET /projects/:slug',
      'POST /projects',
      'PATCH /projects/:id',
      'DELETE /projects/:id',
      'POST /projects/:id/members',
      'DELETE /projects/:id/members/:userId',
    ],
  },

  task: {
    id: 'task-pm',
    name: 'Task / Issue',
    aliases: ['issue', 'ticket', 'to-do', 'work item', 'story', 'bug'],
    domain: 'project-management',
    description: 'A work item in a project with status, assignee, priority, and due date.',
    traits: ['pageable', 'auditable', 'searchable', 'taggable', 'soft-deletable', 'workflowable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'projectId', type: 'integer not null references projects(id)', nullable: false, description: 'Parent project' },
      { name: 'title', type: 'varchar(500) not null', nullable: false, description: 'Task title' },
      { name: 'description', type: 'text', nullable: true, description: 'Detailed description (Markdown)' },
      { name: 'status', type: "varchar(20) not null default 'todo'", nullable: false, description: 'todo|in-progress|review|done|cancelled' },
      { name: 'priority', type: "varchar(10) not null default 'medium'", nullable: false, description: 'low|medium|high|urgent' },
      { name: 'assigneeId', type: 'integer references users(id)', nullable: true, description: 'Assigned user' },
      { name: 'createdBy', type: 'integer not null references users(id)', nullable: false, description: 'Task creator' },
      { name: 'parentId', type: 'integer references tasks(id)', nullable: true, description: 'Parent task (subtask support)' },
      { name: 'labelIds', type: 'integer[]', nullable: true, description: 'Label IDs for categorization' },
      { name: 'dueDate', type: 'date', nullable: true, description: 'Due date' },
      { name: 'estimatedHours', type: 'numeric(5,1)', nullable: true, description: 'Estimated effort' },
      { name: 'position', type: 'integer not null default 0', nullable: false, description: 'Sort order in list' },
      { name: 'completedAt', type: 'timestamptz', nullable: true, description: 'Completion time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['project', 'user', 'comment', 'label', 'attachment', 'activity'],
    suggestedIndexes: ['projectId', 'assigneeId', 'status', 'priority', '(projectId, status)', '(projectId, assigneeId)', '(projectId, position)', 'dueDate'],
    defaultWorkflow: {
      states: ['todo', 'in-progress', 'review', 'done', 'cancelled'],
      transitions: [
        { from: 'todo', to: 'in-progress', action: 'start' },
        { from: 'in-progress', to: 'review', action: 'submit_for_review' },
        { from: 'in-progress', to: 'todo', action: 'unstart' },
        { from: 'review', to: 'done', action: 'approve' },
        { from: 'review', to: 'in-progress', action: 'request_changes' },
        { from: 'todo', to: 'cancelled', action: 'cancel' },
        { from: 'in-progress', to: 'cancelled', action: 'cancel' },
        { from: 'done', to: 'todo', action: 'reopen' },
      ],
    },
    typicalEndpoints: [
      'GET /projects/:projectId/tasks?status=todo&assignee=me&priority=high&page=1',
      'GET /tasks/:id',
      'POST /projects/:projectId/tasks',
      'PATCH /tasks/:id',
      'PATCH /tasks/:id/status',
      'PATCH /tasks/:id/position (reorder)',
      'DELETE /tasks/:id',
    ],
  },

  comment: {
    id: 'comment',
    name: 'Comment',
    aliases: ['reply', 'note', 'discussion', 'response'],
    domain: 'general',
    description: 'A comment on a resource (task, post, ticket) with optional threading.',
    traits: ['pageable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'resourceType', type: 'varchar(50) not null', nullable: false, description: 'task|post|ticket' },
      { name: 'resourceId', type: 'integer not null', nullable: false, description: 'ID of the resource' },
      { name: 'authorId', type: 'integer not null references users(id)', nullable: false, description: 'Comment author' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Comment text (Markdown)' },
      { name: 'parentId', type: 'integer references comments(id)', nullable: true, description: 'Parent comment (threading)' },
      { name: 'editedAt', type: 'timestamptz', nullable: true, description: 'Last edit time' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Post time' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['user', 'task', 'post', 'reaction'],
    suggestedIndexes: ['(resourceType, resourceId, createdAt)', 'authorId', 'parentId'],
    typicalEndpoints: [
      'GET /tasks/:taskId/comments',
      'POST /tasks/:taskId/comments',
      'PATCH /comments/:id',
      'DELETE /comments/:id',
    ],
  },

  // ── Education / LMS Domain ─────────────────────────────────────────────────

  course: {
    id: 'course',
    name: 'Course',
    aliases: ['class', 'training', 'program', 'curriculum'],
    domain: 'education',
    description: 'An educational course with lessons, quizzes, and enrollment tracking.',
    traits: ['pageable', 'searchable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Course title' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Course description' },
      { name: 'instructorId', type: 'integer not null references users(id)', nullable: false, description: 'Instructor' },
      { name: 'categoryId', type: 'integer', nullable: true, description: 'Course category' },
      { name: 'level', type: "varchar(20) not null default 'beginner'", nullable: false, description: 'beginner|intermediate|advanced' },
      { name: 'thumbnailUrl', type: 'text', nullable: true, description: 'Course thumbnail image' },
      { name: 'price', type: 'integer', nullable: true, description: 'Price in cents (null = free)' },
      { name: 'duration', type: 'integer', nullable: true, description: 'Total duration in minutes' },
      { name: 'lessonCount', type: 'integer not null default 0', nullable: false, description: 'Number of lessons' },
      { name: 'enrollmentCount', type: 'integer not null default 0', nullable: false, description: 'Total enrollments' },
      { name: 'rating', type: 'numeric(2,1)', nullable: true, description: 'Average rating' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|published|archived' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publish date' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Course tags' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['lesson', 'enrollment', 'quiz', 'user', 'review'],
    suggestedIndexes: ['slug (unique)', 'instructorId', 'status', 'categoryId', 'level', '(status, categoryId)', 'tags (GIN)'],
    typicalEndpoints: [
      'GET /courses?category=programming&level=beginner&sort=popular&page=1',
      'GET /courses/:slug',
      'POST /courses',
      'PATCH /courses/:id',
      'POST /courses/:id/enroll',
      'GET /courses/:id/progress',
    ],
  },

  // ── Social / Content Domain ────────────────────────────────────────────────

  post_social: {
    id: 'post-social',
    name: 'Social Post / Feed Item',
    aliases: ['status', 'update', 'tweet', 'publication', 'story'],
    domain: 'social',
    description: 'A user-generated content post in a social feed with likes, comments, and shares.',
    traits: ['pageable', 'searchable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'authorId', type: 'integer not null references users(id)', nullable: false, description: 'Post author' },
      { name: 'content', type: 'text not null', nullable: false, description: 'Post text content' },
      { name: 'images', type: 'jsonb', nullable: true, description: 'Array of image URLs' },
      { name: 'linkPreview', type: 'jsonb', nullable: true, description: '{ url, title, description, image }' },
      { name: 'likeCount', type: 'integer not null default 0', nullable: false, description: 'Total likes' },
      { name: 'commentCount', type: 'integer not null default 0', nullable: false, description: 'Total comments' },
      { name: 'shareCount', type: 'integer not null default 0', nullable: false, description: 'Total shares' },
      { name: 'visibility', type: "varchar(20) not null default 'public'", nullable: false, description: 'public|followers|private' },
      { name: 'isPinned', type: 'boolean not null default false', nullable: false, description: 'Pinned to profile' },
      { name: 'repostOfId', type: 'integer references posts(id)', nullable: true, description: 'Original post if repost' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Post time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last edit' },
      { name: 'deletedAt', type: 'timestamptz', nullable: true, description: 'Soft delete' },
    ],
    relatedEntities: ['user', 'like', 'comment', 'share', 'hashtag'],
    suggestedIndexes: ['authorId', '(authorId, createdAt DESC)', '(visibility, createdAt DESC)', 'createdAt DESC'],
    typicalEndpoints: [
      'GET /feed?cursor=abc&limit=20',
      'GET /users/:userId/posts',
      'GET /posts/:id',
      'POST /posts',
      'PATCH /posts/:id',
      'DELETE /posts/:id',
      'POST /posts/:id/like',
      'DELETE /posts/:id/like',
    ],
  },

  // ── Booking / Scheduling Domain ────────────────────────────────────────────

  appointment: {
    id: 'appointment-detail',
    name: 'Appointment / Booking',
    aliases: ['reservation', 'session', 'meeting', 'slot'],
    domain: 'booking',
    description: 'A scheduled appointment with service, provider, customer, and time slot.',
    traits: ['pageable', 'auditable', 'workflowable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'serviceId', type: 'integer not null references services(id)', nullable: false, description: 'Booked service' },
      { name: 'providerId', type: 'integer not null references providers(id)', nullable: false, description: 'Service provider/staff' },
      { name: 'customerName', type: 'varchar(200) not null', nullable: false, description: 'Customer name' },
      { name: 'customerEmail', type: 'varchar(254) not null', nullable: false, description: 'Customer email' },
      { name: 'customerPhone', type: 'varchar(30)', nullable: true, description: 'Customer phone' },
      { name: 'startTime', type: 'timestamptz not null', nullable: false, description: 'Appointment start' },
      { name: 'endTime', type: 'timestamptz not null', nullable: false, description: 'Appointment end' },
      { name: 'status', type: "varchar(20) not null default 'confirmed'", nullable: false, description: 'confirmed|completed|cancelled|no-show' },
      { name: 'notes', type: 'text', nullable: true, description: 'Customer notes' },
      { name: 'price', type: 'integer', nullable: true, description: 'Price in cents' },
      { name: 'reminderSentAt', type: 'timestamptz', nullable: true, description: 'Reminder email sent time' },
      { name: 'cancelledAt', type: 'timestamptz', nullable: true, description: 'Cancellation time' },
      { name: 'cancelReason', type: 'text', nullable: true, description: 'Cancellation reason' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['service', 'provider', 'user', 'payment'],
    suggestedIndexes: ['(providerId, startTime)', '(status, startTime)', 'customerEmail', 'serviceId'],
    defaultWorkflow: {
      states: ['confirmed', 'completed', 'cancelled', 'no-show'],
      transitions: [
        { from: 'confirmed', to: 'completed', action: 'complete' },
        { from: 'confirmed', to: 'cancelled', action: 'cancel' },
        { from: 'confirmed', to: 'no-show', action: 'mark_no_show' },
      ],
    },
    typicalEndpoints: [
      'GET /appointments?providerId=1&date=2024-03-15',
      'GET /appointments/:id',
      'POST /appointments',
      'PATCH /appointments/:id/status',
      'DELETE /appointments/:id (cancel)',
      'GET /availability?serviceId=1&date=2024-03-15',
    ],
  },

  // ── Event Management Domain ────────────────────────────────────────────────

  event: {
    id: 'event-detail',
    name: 'Event',
    aliases: ['meetup', 'conference', 'gathering', 'workshop', 'webinar'],
    domain: 'event-management',
    description: 'An event with date, venue, tickets, speakers, and attendee management.',
    traits: ['pageable', 'searchable', 'taggable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'title', type: 'varchar(300) not null', nullable: false, description: 'Event title' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Event description' },
      { name: 'organizerId', type: 'integer not null references users(id)', nullable: false, description: 'Organizer' },
      { name: 'type', type: "varchar(30) not null default 'in-person'", nullable: false, description: 'in-person|online|hybrid' },
      { name: 'startDate', type: 'timestamptz not null', nullable: false, description: 'Event start' },
      { name: 'endDate', type: 'timestamptz not null', nullable: false, description: 'Event end' },
      { name: 'timezone', type: 'varchar(50) not null', nullable: false, description: 'Event timezone' },
      { name: 'venueName', type: 'varchar(200)', nullable: true, description: 'Venue name' },
      { name: 'venueAddress', type: 'text', nullable: true, description: 'Venue address' },
      { name: 'onlineUrl', type: 'text', nullable: true, description: 'Online meeting URL' },
      { name: 'coverImageUrl', type: 'text', nullable: true, description: 'Cover image' },
      { name: 'maxAttendees', type: 'integer', nullable: true, description: 'Capacity limit' },
      { name: 'registeredCount', type: 'integer not null default 0', nullable: false, description: 'Current registrations' },
      { name: 'ticketPrice', type: 'integer', nullable: true, description: 'Ticket price in cents (null = free)' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Event tags' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|published|cancelled|completed' },
      { name: 'publishedAt', type: 'timestamptz', nullable: true, description: 'Publish date' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Record creation' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['registration', 'speaker', 'sponsor', 'session', 'user'],
    suggestedIndexes: ['slug (unique)', 'organizerId', 'status', '(status, startDate)', 'tags (GIN)', '(type, status)'],
    typicalEndpoints: [
      'GET /events?type=in-person&dateFrom=2024-03-01&sort=startDate&page=1',
      'GET /events/:slug',
      'POST /events',
      'PATCH /events/:id',
      'POST /events/:id/register',
      'GET /events/:id/attendees',
    ],
  },

  // ── Newsletter / Email Marketing ───────────────────────────────────────────

  newsletter_subscriber: {
    id: 'newsletter-subscriber',
    name: 'Newsletter Subscriber',
    aliases: ['email subscriber', 'mailing list member', 'subscriber'],
    domain: 'marketing',
    description: 'An email subscriber with double opt-in, segments, and unsubscribe support.',
    traits: ['pageable', 'searchable', 'taggable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'email', type: 'varchar(254) not null unique', nullable: false, description: 'Subscriber email' },
      { name: 'name', type: 'varchar(100)', nullable: true, description: 'Subscriber name' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|active|unsubscribed|bounced' },
      { name: 'source', type: 'varchar(50)', nullable: true, description: 'Signup source (website, popup, api)' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Segment tags' },
      { name: 'confirmToken', type: 'varchar(100)', nullable: true, description: 'Double opt-in token' },
      { name: 'unsubscribeToken', type: 'varchar(100) not null', nullable: false, description: 'One-click unsubscribe token' },
      { name: 'confirmedAt', type: 'timestamptz', nullable: true, description: 'Confirmation time' },
      { name: 'unsubscribedAt', type: 'timestamptz', nullable: true, description: 'Unsubscribe time' },
      { name: 'subscribedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Signup time' },
    ],
    relatedEntities: ['campaign', 'email_log'],
    suggestedIndexes: ['email (unique)', 'status', 'tags (GIN)', '(status, subscribedAt DESC)'],
    typicalEndpoints: [
      'POST /subscribe',
      'GET /confirm/:token',
      'GET /unsubscribe/:token',
      'GET /admin/subscribers?status=active&page=1',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 3
// ============================================

export const EXPANDED_DOMAIN_MODELS_3: Record<string, DomainModel> = {

  'project-management': {
    id: 'project-management',
    name: 'Project Management / Task Tracker',
    description: 'Kanban-style project management with tasks, boards, labels, and team collaboration.',
    coreEntities: ['project', 'task', 'user', 'label'],
    optionalEntities: ['comment', 'attachment', 'activity', 'milestone', 'project_member', 'notification'],
    keyRelationships: [
      'project belongs to owner (ownerId FK)',
      'project has many members through project_members (userId, projectId)',
      'task belongs to project (projectId FK)',
      'task optionally assigned to user (assigneeId FK)',
      'task can have parent task (parentId FK for subtasks)',
      'comment belongs to task (polymorphic: resourceType + resourceId)',
      'activity logs changes on tasks (taskId FK)',
    ],
    typicalFeatures: [
      'Project dashboard with task counts by status',
      'Kanban board with drag-and-drop between columns',
      'Task list view with filtering (status, assignee, priority, label)',
      'Task detail with description, comments, and activity timeline',
      'Subtask support (nested tasks)',
      'Label/tag management for categorization',
      'Due date tracking with overdue indicators',
      'Team member management (invite, remove, roles)',
      'Notification system for assignments and mentions',
      'Activity feed showing recent changes',
      'Search across all tasks',
      'Bulk actions (assign, change status, delete)',
    ],
    securityConsiderations: [
      'All task operations scoped to project membership',
      'Role-based access within projects (owner, admin, member, viewer)',
      'Audit trail for all task changes',
    ],
    suggestedIndexStrategy: [
      'tasks: (projectId, status, position) for Kanban columns',
      'tasks: (assigneeId, status) for "my tasks"',
      'tasks: (projectId, dueDate) for due date views',
      'comments: (resourceType, resourceId, createdAt) for comment threads',
      'activities: (taskId, createdAt DESC) for activity feed',
      'project_members: (userId, projectId) unique for membership',
    ],
  },

  'education': {
    id: 'education',
    name: 'Education / Learning Management System (LMS)',
    description: 'Online learning platform with courses, lessons, quizzes, and progress tracking.',
    coreEntities: ['course', 'lesson', 'enrollment', 'user'],
    optionalEntities: ['quiz', 'quiz_attempt', 'certificate', 'review', 'discussion', 'assignment'],
    keyRelationships: [
      'course belongs to instructor (instructorId FK)',
      'lesson belongs to course (courseId FK)',
      'enrollment links user to course (userId + courseId)',
      'quiz belongs to lesson or course',
      'quiz_attempt belongs to user and quiz',
      'certificate issued to enrollment on completion',
    ],
    typicalFeatures: [
      'Course catalog with search, filter by category/level/price',
      'Course detail page with syllabus, reviews, and instructor info',
      'Lesson viewer (video + text + downloadable resources)',
      'Progress tracking (% complete, current lesson)',
      'Quiz/assessment with multiple choice and free text',
      'Certificate generation on course completion',
      'Student dashboard with enrolled courses and progress',
      'Instructor dashboard with enrollment stats and revenue',
      'Discussion forum per course',
      'Note-taking per lesson',
      'Course reviews and ratings',
    ],
    securityConsiderations: [
      'Lesson content gated behind enrollment',
      'Quiz answers hidden until attempt submitted',
      'Certificate verification system (unique codes)',
      'Instructor can only manage their own courses',
    ],
    suggestedIndexStrategy: [
      'courses: (status, categoryId) for catalog',
      'courses: slug (unique) for course pages',
      'lessons: (courseId, sortOrder) for course content',
      'enrollments: (userId, courseId) unique for enrollment',
      'enrollments: (userId, status) for student dashboard',
      'quiz_attempts: (userId, quizId, createdAt DESC) for history',
    ],
  },

  'social-network': {
    id: 'social-network',
    name: 'Social Network / Community',
    description: 'Social platform with profiles, posts, follows, likes, and direct messaging.',
    coreEntities: ['user', 'post', 'follow', 'like'],
    optionalEntities: ['comment', 'message', 'notification', 'hashtag', 'block', 'report', 'story'],
    keyRelationships: [
      'post belongs to author (authorId FK)',
      'follow links follower to followed (followerId + followedId)',
      'like links user to post (userId + postId)',
      'comment belongs to post and author',
      'message sent from user to user',
      'notification targets user about activity',
    ],
    typicalFeatures: [
      'User profiles with bio, avatar, follow counts',
      'Feed of posts from followed users (chronological or algorithmic)',
      'Post creation with text, images, and links',
      'Like and comment on posts',
      'Follow/unfollow users',
      'User search and discovery (suggested follows)',
      'Direct messaging between users',
      'Notifications for likes, comments, follows, mentions',
      'Hashtag system for topic discovery',
      'User blocking and content reporting',
      'Trending topics/hashtags',
    ],
    securityConsiderations: [
      'Private profiles: only followers see posts',
      'Block system: blocked users cannot view profile or interact',
      'Content moderation: report and review flow',
      'Rate limit posting to prevent spam',
      'Sanitize all user-generated content (XSS prevention)',
    ],
    suggestedIndexStrategy: [
      'posts: (authorId, createdAt DESC) for profile page',
      'follows: (followerId, followedId) unique',
      'follows: (followedId) for follower count',
      'likes: (userId, postId) unique',
      'likes: (postId) for like count',
      'messages: (senderId, receiverId, createdAt) for conversations',
      'notifications: (userId, read, createdAt DESC) for notification feed',
    ],
  },

  'portfolio': {
    id: 'portfolio',
    name: 'Portfolio / Personal Website',
    description: 'Personal portfolio showcasing projects, skills, experience, and contact information.',
    coreEntities: ['user_profile', 'project_showcase', 'skill'],
    optionalEntities: ['experience', 'education_entry', 'testimonial', 'blog_post', 'contact_submission'],
    keyRelationships: [
      'project_showcase belongs to user profile',
      'skill belongs to user profile',
      'experience belongs to user profile',
      'contact_submission references the portfolio owner',
    ],
    typicalFeatures: [
      'Hero section with name, title, tagline, and CTA',
      'Projects grid with images, descriptions, tech stack, and links',
      'Skills section with categories (frontend, backend, tools)',
      'Work experience timeline',
      'Education section',
      'Testimonials/recommendations carousel',
      'Contact form with email notification',
      'Resume/CV download',
      'Blog/articles section (optional)',
      'Smooth scroll navigation',
      'Dark/light mode toggle',
      'SEO optimization (meta tags, Open Graph)',
    ],
    securityConsiderations: [
      'Rate limit contact form submissions',
      'Honeypot field for spam prevention',
      'Sanitize contact form input',
      'No sensitive data exposed in public pages',
    ],
    suggestedIndexStrategy: [
      'projects: (userId, sortOrder) for portfolio page',
      'skills: (userId, category) for skills section',
      'contact_submissions: (createdAt DESC) for admin view',
    ],
  },

  'blog': {
    id: 'blog',
    name: 'Blog / Content Platform',
    description: 'Content management system with posts, categories, tags, comments, and subscribers.',
    coreEntities: ['blog_post', 'category', 'user'],
    optionalEntities: ['comment', 'subscriber', 'tag', 'media', 'page'],
    keyRelationships: [
      'blog_post belongs to author (authorId FK)',
      'blog_post belongs to category (categoryId FK)',
      'blog_post has many tags (many-to-many)',
      'comment belongs to post and author',
    ],
    typicalFeatures: [
      'Post listing with pagination, category filter, and search',
      'Post detail page with Markdown/rich text rendering',
      'Category and tag taxonomy',
      'Comment system with moderation',
      'Newsletter subscription with double opt-in',
      'Author profiles with post counts',
      'RSS feed generation',
      'Related posts suggestions',
      'Reading time estimation',
      'Social sharing buttons',
      'Admin: post editor with preview, draft/publish workflow',
      'SEO: meta tags, Open Graph, structured data',
    ],
    securityConsiderations: [
      'Sanitize all Markdown/HTML output',
      'Moderate comments before publishing (or after with report)',
      'Rate limit comment submissions',
      'CSRF protection on comment forms',
    ],
    suggestedIndexStrategy: [
      'posts: slug (unique)',
      'posts: (status, publishedAt DESC) for published listing',
      'posts: (authorId, status) for author pages',
      'posts: (categoryId, status) for category pages',
      'comments: (postId, status, createdAt) for post comments',
      'subscribers: email (unique)',
    ],
  },

  'landing-page': {
    id: 'landing-page',
    name: 'Landing Page / Marketing Site',
    description: 'Marketing landing page with hero, features, pricing, testimonials, and CTA.',
    coreEntities: ['lead', 'pricing_plan'],
    optionalEntities: ['testimonial', 'faq_item', 'feature', 'newsletter_subscriber'],
    keyRelationships: [
      'lead captured from signup/CTA form',
      'pricing_plan linked to product/service tiers',
    ],
    typicalFeatures: [
      'Hero section with headline, subheadline, CTA button',
      'Feature highlights with icons and descriptions',
      'Pricing table with plan comparison',
      'Testimonial carousel or grid',
      'FAQ accordion',
      'Social proof (logos, stats, badges)',
      'Lead capture form (email, name)',
      'Animated scroll reveals',
      'Mobile-responsive design',
      'Fast loading (static content, optimized images)',
    ],
    securityConsiderations: [
      'Rate limit lead capture form',
      'Validate email format server-side',
      'Honeypot field for spam prevention',
    ],
    suggestedIndexStrategy: [
      'leads: email',
      'leads: (source, createdAt DESC)',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 3
// ============================================

export const EXPANDED_CODE_SNIPPETS_3: CodeSnippet[] = [

  // ── Express Route Handlers ─────────────────────────────────────────────────

  {
    id: 'express-crud-routes',
    title: 'Express CRUD Route Template',
    description: 'Full CRUD route handler with validation, pagination, search, and error handling.',
    tech: ['express', 'typescript', 'drizzle', 'zod'],
    tags: ['express', 'crud', 'api', 'route'],
    code: `import { Router } from 'express';
import { z } from 'zod';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(200).transform(s => s.trim()),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'title', 'priority']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const conditions = [eq(items.userId, req.user!.id)];

  if (query.status) conditions.push(eq(items.status, query.status));
  if (query.search) conditions.push(ilike(items.title, \`%\${query.search}%\`));

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [data, [{ total }]] = await Promise.all([
    db.select().from(items)
      .where(where)
      .orderBy(query.sortDir === 'desc' ? desc(items[query.sortBy]) : items[query.sortBy])
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: sql<number>\`count(*)::int\` }).from(items).where(where),
  ]);

  res.json({
    data,
    meta: {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const [item] = await db.select().from(items)
    .where(and(eq(items.id, id), eq(items.userId, req.user!.id)))
    .limit(1);

  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

  const [item] = await db.insert(items).values({ ...parsed.data, userId: req.user!.id }).returning();
  res.status(201).json(item);
}));

router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

  const [item] = await db.update(items)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.userId, req.user!.id)))
    .returning();

  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const result = await db.delete(items)
    .where(and(eq(items.id, id), eq(items.userId, req.user!.id)));

  if ((result?.rowCount ?? 0) === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

export default router;`,
  },

  {
    id: 'express-error-handling',
    title: 'Express Global Error Handler + Custom Errors',
    description: 'Custom error classes and global error handling middleware for consistent API responses.',
    tech: ['express', 'typescript'],
    tags: ['express', 'error-handling', 'middleware'],
    code: `export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(\`\${resource} not found\`, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super('Validation failed', 422, 'VALIDATION_ERROR', details);
  }
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function globalErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error('Unhandled error:', err);

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev ? { message: err.message } : {}),
  });
}

// Register as the LAST middleware:
// app.use(globalErrorHandler);`,
  },

  // ── Dashboard Components ───────────────────────────────────────────────────

  {
    id: 'dashboard-stats-cards',
    title: 'Dashboard Statistics Cards',
    description: 'KPI cards with value, trend indicator, and comparison to previous period.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['dashboard', 'stats', 'component', 'analytics'],
    code: `interface StatCard {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}

function StatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
            {stat.icon && <div className="text-muted-foreground">{stat.icon}</div>}
          </div>
          <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
          {stat.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span className={\`text-xs font-medium \${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}\`}>
                {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
              </span>
              <span className="text-xs text-muted-foreground">{stat.changeLabel ?? 'vs last period'}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Usage:
// <StatCards stats={[
//   { label: 'Total Revenue', value: '$12,489', change: 12.5, icon: <DollarIcon /> },
//   { label: 'New Users', value: '342', change: -3.2, icon: <UsersIcon /> },
//   { label: 'Active Projects', value: '18', change: 0, icon: <FolderIcon /> },
//   { label: 'Completion Rate', value: '87%', change: 5.1, icon: <CheckIcon /> },
// ]} />`,
  },

  {
    id: 'dashboard-sidebar-layout',
    title: 'Dashboard Layout with Sidebar Navigation',
    description: 'Responsive dashboard layout with collapsible sidebar, header, and main content area.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['dashboard', 'layout', 'sidebar', 'navigation'],
    code: `interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

function DashboardLayout({ children, navItems, currentPath }: {
  children: React.ReactNode;
  navItems: NavItem[];
  currentPath: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={\`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform lg:translate-x-0 \${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }\`}>
        <div className="flex items-center gap-2 h-16 px-4 border-b">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold">A</div>
          <span className="font-semibold">AppName</span>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const isActive = currentPath === item.href;
            return (
              <a key={item.href} href={item.href}
                className={\`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors \${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }\`}>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={\`text-xs px-1.5 py-0.5 rounded-full \${
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                  }\`}>{item.badge}</span>
                )}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-background flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-muted rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <button className="p-2 hover:bg-muted rounded-lg relative" aria-label="Notifications">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="w-8 h-8 bg-muted rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}`,
  },

  {
    id: 'data-table-sortable',
    title: 'Sortable Data Table with Column Headers',
    description: 'Reusable data table with sortable columns, row selection, and responsive design.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['table', 'data', 'component', 'sortable'],
    code: `interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: number | string }> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  selectedIds?: Set<number | string>;
  onSelect?: (id: number | string) => void;
  onSelectAll?: () => void;
  isLoading?: boolean;
}

function DataTable<T extends { id: number | string }>({
  columns, data, sortBy, sortDir, onSort, selectedIds, onSelect, onSelectAll, isLoading,
}: DataTableProps<T>) {
  const hasSelection = onSelect !== undefined;
  const allSelected = data.length > 0 && selectedIds?.size === data.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {hasSelection && (
                <th className="w-10 p-3">
                  <input type="checkbox" checked={allSelected} onChange={onSelectAll}
                    className="rounded border-muted-foreground/30" />
                </th>
              )}
              {columns.map(col => (
                <th key={String(col.key)} className={\`text-left p-3 font-medium text-muted-foreground \${col.className ?? ''}\`}>
                  {col.sortable && onSort ? (
                    <button onClick={() => onSort(String(col.key))}
                      className="flex items-center gap-1 hover:text-foreground transition-colors">
                      {col.label}
                      <span className="text-xs">
                        {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {hasSelection && <td className="p-3"><div className="w-4 h-4 bg-muted rounded" /></td>}
                  {columns.map((col, ci) => (
                    <td key={ci} className="p-3">
                      <div className={\`h-4 bg-muted rounded \${ci === 0 ? 'w-32' : 'w-20'}\`} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="p-8 text-center text-muted-foreground">
                  No results found
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row.id} className={\`hover:bg-muted/30 transition-colors \${
                  selectedIds?.has(row.id) ? 'bg-primary/5' : ''
                }\`}>
                  {hasSelection && (
                    <td className="p-3">
                      <input type="checkbox" checked={selectedIds?.has(row.id) ?? false}
                        onChange={() => onSelect!(row.id)} className="rounded border-muted-foreground/30" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={String(col.key)} className={\`p-3 \${col.className ?? ''}\`}>
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,
  },

  // ── Full-Stack Auth Flow ───────────────────────────────────────────────────

  {
    id: 'auth-login-register',
    title: 'Complete Auth Login/Register Flow',
    description: 'Full auth implementation: register, login, token refresh, and protected routes.',
    tech: ['express', 'typescript', 'drizzle', 'bcrypt', 'jwt', 'zod'],
    tags: ['auth', 'login', 'register', 'api', 'full-stack'],
    code: `import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET!;
const BCRYPT_ROUNDS = 12;

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateTokens(userId: number, email: string, role: string) {
  const accessToken = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

  const { name, email, password } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db.insert(users).values({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'user',
  }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  const tokens = generateTokens(user.id, user.email, user.role);

  res.status(201).json({ user, ...tokens });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials' });

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

  const tokens = generateTokens(user.id, user.email, user.role);

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { userId: number; type: string };
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = generateTokens(user.id, user.email, user.role);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const [user] = await db.select({
    id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt,
  }).from(users).where(eq(users.id, req.user!.id)).limit(1);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}));`,
  },

  {
    id: 'auth-react-context',
    title: 'React Auth Context with Token Management',
    description: 'Client-side auth context with login, logout, token storage, and automatic refresh.',
    tech: ['react', 'typescript'],
    tags: ['auth', 'react', 'context', 'client'],
    code: `interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = () => localStorage.getItem('accessToken');
  const setTokens = (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  };
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: \`Bearer \${token}\` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        const refreshed = await tryRefresh();
        if (!refreshed) clearTokens();
      }
    } catch {
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tryRefresh = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const { accessToken, refreshToken: newRefresh } = await res.json();
      setTokens(accessToken, newRefresh);
      await fetchUser();
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const { user: userData, accessToken, refreshToken } = await res.json();
    setTokens(accessToken, refreshToken);
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const { user: userData, accessToken, refreshToken } = await res.json();
    setTokens(accessToken, refreshToken);
    setUser(userData);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}`,
  },

  // ── Landing Page Components ────────────────────────────────────────────────

  {
    id: 'landing-hero',
    title: 'Landing Page Hero Section',
    description: 'Hero section with headline, subheadline, CTA buttons, and optional illustration.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'hero', 'component', 'marketing'],
    code: `function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28 lg:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Now available for early access
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Build better products{' '}
            <span className="text-primary">faster than ever</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform that helps teams ship high-quality software.
            From planning to deployment, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/signup"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Get Started Free
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="/demo"
              className="inline-flex items-center justify-center border px-6 py-3 rounded-lg font-medium text-sm hover:bg-muted transition-colors">
              Watch Demo
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">No credit card required. Free for up to 3 team members.</p>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
    </section>
  );
}`,
  },

  {
    id: 'landing-features-grid',
    title: 'Features Grid Section',
    description: 'Feature showcase with icon cards in a responsive grid layout.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'features', 'component', 'marketing'],
    code: `interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeaturesSection({ features, title, subtitle }: {
  features: Feature[];
  title: string;
  subtitle: string;
}) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-background border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  {
    id: 'landing-pricing-cards',
    title: 'Pricing Cards Section',
    description: 'Pricing comparison cards with feature lists, popular badge, and CTA buttons.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'pricing', 'component', 'marketing'],
    code: `interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  isPopular?: boolean;
}

function PricingSection({ plans }: { plans: PricingPlan[] }) {
  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground">Choose the plan that fits your needs. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div key={i} className={\`relative bg-background border rounded-xl p-6 flex flex-col \${
              plan.isPopular ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary' : ''
            }\`}>
              {plan.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">\${plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className={\`w-full py-2.5 rounded-lg font-medium text-sm transition-colors \${
                plan.isPopular
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border hover:bg-muted'
              }\`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  {
    id: 'landing-testimonials',
    title: 'Testimonials Section',
    description: 'Customer testimonials grid with avatar, name, role, and quote.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'testimonials', 'component', 'marketing'],
    code: `interface Testimonial {
  content: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}

function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Loved by teams worldwide</h2>
          <p className="text-lg text-muted-foreground">Here's what our customers have to say.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-background border rounded-xl p-6">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, si) => (
                  <svg key={si} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground mb-4">"{t.content}"</p>
              <div className="flex items-center gap-3">
                {t.avatarUrl ? (
                  <img src={t.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {t.author.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  {
    id: 'landing-faq',
    title: 'FAQ Accordion Section',
    description: 'Frequently asked questions with expandable accordion items.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['landing-page', 'faq', 'accordion', 'component'],
    code: `interface FAQItem {
  question: string;
  answer: string;
}

function FAQSection({ items, title }: { items: FAQItem[]; title?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-12">
          {title ?? 'Frequently Asked Questions'}
        </h2>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                aria-expanded={openIndex === i}>
                <span className="text-sm font-medium pr-4">{item.question}</span>
                <svg className={\`w-4 h-4 shrink-0 transition-transform duration-200 \${openIndex === i ? 'rotate-180' : ''}\`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // ── Drizzle Schema Patterns (Part 3) ───────────────────────────────────────

  {
    id: 'drizzle-schema-project-management',
    title: 'Drizzle Schema: Project Management (Projects, Tasks, Members)',
    description: 'Complete Drizzle schema for a project management app with projects, tasks, labels, and members.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'project-management', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  description: text('description'),
  ownerId: integer('owner_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  color: varchar('color', { length: 7 }),
  icon: varchar('icon', { length: 50 }),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
  startDate: date('start_date'),
  targetDate: date('target_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  slugIdx: uniqueIndex('projects_slug_idx').on(t.slug),
  ownerIdx: index('projects_owner_idx').on(t.ownerId),
  statusIdx: index('projects_status_idx').on(t.status),
}));

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueMember: uniqueIndex('project_members_unique_idx').on(t.projectId, t.userId),
}));

export const labels = pgTable('labels', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index('labels_project_idx').on(t.projectId),
}));

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('todo'),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  assigneeId: integer('assignee_id'),
  createdBy: integer('created_by').notNull(),
  parentId: integer('parent_id').references((): any => tasks.id),
  labelIds: integer('label_ids').array(),
  dueDate: date('due_date'),
  estimatedHours: numeric('estimated_hours', { precision: 5, scale: 1 }),
  position: integer('position').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectStatusIdx: index('tasks_project_status_idx').on(t.projectId, t.status),
  assigneeIdx: index('tasks_assignee_idx').on(t.assigneeId),
  projectPositionIdx: index('tasks_project_position_idx').on(t.projectId, t.position),
  dueDateIdx: index('tasks_due_date_idx').on(t.dueDate),
}));

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  taskIdx: index('activities_task_idx').on(t.taskId, t.createdAt),
}));`,
  },

  {
    id: 'drizzle-schema-social',
    title: 'Drizzle Schema: Social Network (Profiles, Posts, Follows, Likes)',
    description: 'Complete Drizzle schema for a social platform with posts, follows, likes, and messaging.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'social', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  bio: varchar('bio', { length: 500 }),
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  website: varchar('website', { length: 200 }),
  location: varchar('location', { length: 100 }),
  followerCount: integer('follower_count').notNull().default(0),
  followingCount: integer('following_count').notNull().default(0),
  postCount: integer('post_count').notNull().default(0),
  isVerified: boolean('is_verified').notNull().default(false),
  isPrivate: boolean('is_private').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  usernameIdx: uniqueIndex('profiles_username_idx').on(t.username),
  userIdIdx: uniqueIndex('profiles_user_id_idx').on(t.userId),
}));

export const socialPosts = pgTable('social_posts', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id').notNull(),
  content: text('content').notNull(),
  images: jsonb('images').$type<string[]>(),
  linkPreview: jsonb('link_preview').$type<{ url: string; title: string; description: string; image?: string }>(),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
  isPinned: boolean('is_pinned').notNull().default(false),
  repostOfId: integer('repost_of_id').references((): any => socialPosts.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  authorIdx: index('social_posts_author_idx').on(t.authorId, t.createdAt),
  createdIdx: index('social_posts_created_idx').on(t.createdAt),
}));

export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').notNull(),
  followedId: integer('followed_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueFollow: uniqueIndex('follows_unique_idx').on(t.followerId, t.followedId),
  followerIdx: index('follows_follower_idx').on(t.followerId),
  followedIdx: index('follows_followed_idx').on(t.followedId),
}));

export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  postId: integer('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueLike: uniqueIndex('likes_unique_idx').on(t.userId, t.postId),
  postIdx: index('likes_post_idx').on(t.postId),
}));

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').notNull(),
  receiverId: integer('receiver_id').notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  conversationIdx: index('messages_conversation_idx').on(t.senderId, t.receiverId, t.createdAt),
  receiverIdx: index('messages_receiver_idx').on(t.receiverId, t.isRead),
}));

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  actorId: integer('actor_id'),
  resourceType: varchar('resource_type', { length: 30 }),
  resourceId: integer('resource_id'),
  message: varchar('message', { length: 500 }).notNull(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('notifications_user_idx').on(t.userId, t.isRead, t.createdAt),
}));`,
  },

  // ── Form Components ────────────────────────────────────────────────────────

  {
    id: 'form-input-components',
    title: 'Reusable Form Input Components',
    description: 'Complete set of form input components: text, textarea, select, checkbox, radio, with labels and errors.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['form', 'input', 'component', 'reusable'],
    code: `interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, id, className, ...props }, ref) => {
  const inputId = id ?? label.toLowerCase().replace(/\\s+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
      <input ref={ref} id={inputId} {...props}
        className={\`w-full border rounded-lg px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary \${error ? 'border-red-500' : 'border-input'} \${className ?? ''}\`}
        aria-invalid={!!error} aria-describedby={error ? \`\${inputId}-error\` : undefined} />
      {error && <p id={\`\${inputId}-error\`} className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, id, ...props }, ref) => {
  const inputId = id ?? label.toLowerCase().replace(/\\s+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
      <textarea ref={ref} id={inputId} {...props}
        className={\`w-full border rounded-lg px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px] \${error ? 'border-red-500' : 'border-input'}\`}
        aria-invalid={!!error} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, options, placeholder, id, ...props }, ref) => {
  const inputId = id ?? label.toLowerCase().replace(/\\s+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
      <select ref={ref} id={inputId} {...props}
        className={\`w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary \${error ? 'border-red-500' : 'border-input'}\`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, description, id, ...props }, ref) => {
  const inputId = id ?? label.toLowerCase().replace(/\\s+/g, '-');
  return (
    <div className="flex items-start gap-3">
      <input ref={ref} id={inputId} type="checkbox" {...props}
        className="mt-0.5 rounded border-input text-primary focus:ring-primary/20" />
      <div>
        <label htmlFor={inputId} className="text-sm font-medium cursor-pointer">{label}</label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
});`,
  },

  // ── Pagination Component ───────────────────────────────────────────────────

  {
    id: 'pagination-component',
    title: 'Pagination Component',
    description: 'Full pagination with page numbers, previous/next, and showing current range.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['pagination', 'component', 'reusable'],
    code: `interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    const leftBound = Math.max(2, page - 1);
    const rightBound = Math.min(totalPages - 1, page + 1);

    if (leftBound > 2) pages.push('...');
    for (let i = leftBound; i <= rightBound; i++) pages.push(i);
    if (rightBound < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
          Previous
        </button>
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={\`ellipsis-\${i}\`} className="px-2 py-1.5 text-sm text-muted-foreground">...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p as number)}
              className={\`w-9 h-9 text-sm rounded-lg font-medium \${
                page === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }\`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
          Next
        </button>
      </div>
    </div>
  );
}`,
  },

  // ── Search / Filter Bar ────────────────────────────────────────────────────

  {
    id: 'search-filter-bar',
    title: 'Search & Filter Bar Component',
    description: 'Combined search input with filter dropdowns and clear all button.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['search', 'filter', 'component', 'reusable'],
    code: `interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

function SearchFilterBar({ search, onSearchChange, filters, activeFilters, onFilterChange, onClearAll }: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
}) {
  const hasActiveFilters = search.length > 0 || Object.values(activeFilters).some(v => v !== '');

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="search" value={search} onChange={e => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        {filters.map(filter => (
          <select key={filter.key} value={activeFilters[filter.key] ?? ''}
            onChange={e => onFilterChange(filter.key, e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">{filter.label}</option>
            {filter.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}
      </div>
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs">
              Search: {search}
              <button onClick={() => onSearchChange('')} className="hover:text-red-500">x</button>
            </span>
          )}
          {Object.entries(activeFilters).filter(([, v]) => v).map(([key, value]) => {
            const filter = filters.find(f => f.key === key);
            const option = filter?.options.find(o => o.value === value);
            return (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs">
                {filter?.label}: {option?.label ?? value}
                <button onClick={() => onFilterChange(key, '')} className="hover:text-red-500">x</button>
              </span>
            );
          })}
          <button onClick={onClearAll} className="text-xs text-primary hover:underline ml-1">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}`,
  },

  // ── Empty State Component ──────────────────────────────────────────────────

  {
    id: 'empty-state-component',
    title: 'Empty State Component',
    description: 'Reusable empty state with icon, title, description, and CTA.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['empty-state', 'component', 'reusable', 'ux'],
    code: `interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={\`flex flex-col items-center justify-center py-12 px-4 text-center \${className ?? ''}\`}>
      {icon ? (
        <div className="text-muted-foreground mb-4">{icon}</div>
      ) : (
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <button onClick={action.onClick}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}

// Usage:
// <EmptyState
//   title="No tasks yet"
//   description="Create your first task to get started tracking your work."
//   action={{ label: 'Create Task', onClick: () => setShowCreateModal(true) }}
// />`,
  },

  // ── Confirmation Dialog ────────────────────────────────────────────────────

  {
    id: 'confirm-dialog',
    title: 'Confirmation Dialog Component',
    description: 'Reusable confirmation dialog for destructive actions like delete, with customizable title and message.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['dialog', 'modal', 'component', 'reusable'],
    code: `interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel, variant = 'default', isLoading }: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isLoading}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50">
            {cancelLabel ?? 'Cancel'}
          </button>
          <button onClick={handleConfirm} disabled={isLoading}
            className={\`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 \${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
            }\`}>
            {isLoading ? 'Processing...' : (confirmLabel ?? 'Confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Usage:
// <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)}
//   onConfirm={() => deleteTask(taskId)} title="Delete Task"
//   message="Are you sure you want to delete this task? This action cannot be undone."
//   confirmLabel="Delete" variant="danger" />`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 3
// ============================================

export const EXPANDED_ANTI_PATTERNS_3: AntiPattern[] = [
  {
    id: 'god-component',
    name: 'God Component / Mega Component',
    description: 'A single React component that handles data fetching, state management, business logic, and complex rendering (500+ lines).',
    whyBad: 'Impossible to test, reuse, or understand. Any change risks breaking unrelated functionality. Multiple developers cannot work on it simultaneously.',
    fix: 'Break into: (1) Container component (data fetching). (2) Presentational components (rendering). (3) Custom hooks (state/logic). (4) Service layer (API calls). Each piece should have a single responsibility.',
    severity: 'high',
    badExample: 'function UserDashboard() { /* 600 lines: fetches data, manages 8 state variables, renders sidebar + main content + modals + charts */ }',
    goodExample: 'function UserDashboard() { const { data } = useUserDashboard(); return <><Sidebar /><MainContent data={data} /><StatsCharts data={data.stats} /></>; }',
    tags: ['react', 'architecture', 'maintainability'],
  },
  {
    id: 'hardcoded-values',
    name: 'Hardcoded Configuration Values',
    description: 'Embedding URLs, credentials, limits, and feature flags directly in source code.',
    whyBad: 'Cannot change without redeploying. Secrets end up in git. Different environments (dev/staging/prod) need different values. Makes configuration invisible and scattered.',
    fix: 'Centralize ALL configuration in environment variables validated at startup with Zod. Use a config module that exports typed values.',
    severity: 'high',
    badExample: 'const API_URL = "https://api.prod.example.com"; const MAX_UPLOAD = 5242880;',
    goodExample: 'const config = { apiUrl: process.env.API_URL!, maxUpload: Number(process.env.MAX_UPLOAD_BYTES) || 5_242_880 };',
    tags: ['configuration', 'security', 'maintainability'],
  },
  {
    id: 'no-error-boundaries',
    name: 'No Error Boundaries in React',
    description: 'Running a React app without any error boundaries, causing white screen on any render error.',
    whyBad: 'A single error in any component crashes the entire app. Users see a blank white page with no way to recover. No error information is logged.',
    fix: 'Add error boundaries at: (1) App root (last resort). (2) Each route. (3) Each major section (sidebar, content, modals). Show fallback UI with retry button.',
    severity: 'high',
    badExample: '<App><Routes><Route path="/" element={<Dashboard />} /></Routes></App> // One error = white screen',
    goodExample: '<ErrorBoundary FallbackComponent={ErrorFallback}><App><Routes><Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} /></Routes></App></ErrorBoundary>',
    tags: ['react', 'error-handling', 'ux'],
  },
  {
    id: 'missing-loading-states',
    name: 'Missing Loading and Error States',
    description: 'Components that only handle the happy path — no loading indicator, no error message, no empty state.',
    whyBad: 'Users see blank areas while data loads, have no idea something failed, and see confusing empty layouts when there is no data. The app feels broken and unresponsive.',
    fix: 'Every data-driven component must handle 4 states: (1) Loading → skeleton/spinner. (2) Error → error message + retry. (3) Empty → empty state + CTA. (4) Data → normal render.',
    severity: 'medium',
    badExample: 'function TaskList() { const { data } = useQuery(...); return data.map(t => <TaskCard task={t} />); }',
    goodExample: 'function TaskList() { const { data, isLoading, error } = useQuery(...); if (isLoading) return <TaskSkeleton />; if (error) return <ErrorMessage retry={refetch} />; if (!data?.length) return <EmptyState />; return data.map(t => <TaskCard key={t.id} task={t} />); }',
    tags: ['react', 'ux', 'data-fetching'],
  },
  {
    id: 'no-index-on-fk',
    name: 'Missing Indexes on Foreign Key Columns',
    description: 'Creating foreign key constraints without matching indexes, causing slow JOINs and lookups.',
    whyBad: 'Every JOIN, WHERE clause, and ON DELETE CASCADE on an unindexed FK triggers a full table scan. With 100K+ rows, queries take seconds instead of milliseconds.',
    fix: 'Add an index on EVERY foreign key column. For composite queries, use composite indexes. For text search, use GIN indexes.',
    severity: 'high',
    badExample: 'tasks: { projectId: integer("project_id").references(() => projects.id) } // No index!',
    goodExample: 'tasks: { projectId: integer("project_id").references(() => projects.id) } + index("tasks_project_idx").on(tasks.projectId)',
    tags: ['database', 'performance', 'drizzle'],
  },
  {
    id: 'sync-file-operations',
    name: 'Synchronous File System Operations in Request Handlers',
    description: 'Using fs.readFileSync, fs.writeFileSync, etc. in Express route handlers.',
    whyBad: 'Synchronous file operations block the entire Node.js event loop. While one request reads a file, ALL other requests are blocked. This destroys server throughput under load.',
    fix: 'Use async file operations: fs.promises.readFile, fs.promises.writeFile. Or better: use streams for large files. Only use sync operations at startup (reading config).',
    severity: 'critical',
    badExample: 'app.get("/file", (req, res) => { const data = fs.readFileSync("./data.json", "utf-8"); res.json(JSON.parse(data)); });',
    goodExample: 'app.get("/file", async (req, res) => { const data = await fs.promises.readFile("./data.json", "utf-8"); res.json(JSON.parse(data)); });',
    tags: ['node', 'performance', 'api'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 3
// ============================================

export const EXPANDED_BEST_PRACTICES_3: BestPractice[] = [
  {
    id: 'react-query-patterns-bp',
    title: 'React Query Best Practices',
    category: 'react',
    description: 'Use React Query effectively for server state with proper caching, invalidation, and error handling.',
    do: [
      'Use useQuery for ALL data fetching — never useEffect + useState for API calls',
      'Structure query keys as arrays: ["entity", filters] — e.g., ["tasks", { status, page }]',
      'Invalidate related queries after mutations: queryClient.invalidateQueries({ queryKey: ["tasks"] })',
      'Set appropriate staleTime (5min for rarely-changing data, 0 for real-time)',
      'Use placeholderData: (prev) => prev to keep old data visible while refetching',
      'Use useSuspenseQuery with Suspense boundaries for cleaner loading states',
      'Create custom hooks per entity: useTasks(), useCreateTask(), useUpdateTask()',
    ],
    dont: [
      'Fetch data in useEffect — React Query handles loading, error, caching, and refetching',
      'Use generic query keys: ["data"] — be specific: ["users", userId, "tasks"]',
      'Forget to invalidate queries after mutations — stale data confuses users',
      'Set staleTime: Infinity unless data truly never changes',
      'Store server data in useState or Zustand — React Query IS the cache',
    ],
    languages: ['typescript'],
  },
  {
    id: 'tailwind-best-practices',
    title: 'Tailwind CSS Best Practices',
    category: 'react',
    description: 'Write maintainable Tailwind CSS with consistent patterns and reusable components.',
    do: [
      'Use semantic color tokens: bg-primary, text-muted-foreground, border-input (not raw colors like bg-blue-500)',
      'Extract repeated class patterns into components, not @apply rules',
      'Use consistent spacing scale: gap-2, gap-3, gap-4 (not arbitrary values)',
      'Use responsive prefixes consistently: sm:, md:, lg: — mobile-first approach',
      'Use dark: prefix for dark mode when using class-based dark mode strategy',
      'Group classes logically: layout → spacing → sizing → typography → colors → effects',
      'Use cn() utility (clsx + twMerge) for conditional and merging classes',
    ],
    dont: [
      'Use raw hex/rgb colors — use theme tokens for consistency',
      'Create long className strings without breaking into readable chunks or components',
      'Use @apply extensively — it defeats the purpose of utility-first CSS',
      'Mix Tailwind with custom CSS classes — pick one approach per component',
      'Use !important with Tailwind — if you need it, your specificity is wrong',
    ],
    languages: ['typescript', 'css'],
  },
  {
    id: 'express-route-organization',
    title: 'Express Route Organization',
    category: 'architecture',
    description: 'Structure Express routes for clarity, testability, and maintainability.',
    do: [
      'Group routes by resource: /routes/users.ts, /routes/tasks.ts, /routes/auth.ts',
      'Use Router() for each resource group and mount on app: app.use("/api/users", userRoutes)',
      'Keep route handlers thin — validate input, call service, return response',
      'Use middleware factories: validate(schema), requireRole("admin"), rateLimit(5)',
      'Use asyncHandler wrapper — never write try-catch in every route handler',
      'Register global error handler as the LAST middleware',
      'Use consistent response format: { data } for success, { error, details } for errors',
    ],
    dont: [
      'Put all routes in a single file — split by resource/feature',
      'Write business logic in route handlers — extract to service layer',
      'Use try-catch in every handler — use asyncHandler + global error middleware',
      'Return 200 for errors with { success: false } — use proper HTTP status codes',
      'Forget to validate req.params (route params are always strings)',
    ],
    languages: ['typescript'],
  },
  {
    id: 'drizzle-orm-practices',
    title: 'Drizzle ORM Best Practices',
    category: 'database',
    description: 'Use Drizzle ORM effectively for type-safe, performant database queries.',
    do: [
      'Define schema in a single schema.ts file (or schema/ directory for large apps)',
      'Use serial("id").primaryKey() for auto-increment IDs',
      'Add .notNull() on required columns — nullable should be explicit',
      'Use .default() for columns with defaults: .default("draft"), .defaultNow()',
      'Define indexes in the table function: (t) => ({ nameIdx: index(...).on(t.name) })',
      'Use .returning() on INSERT/UPDATE to get the result without a second query',
      'Use db.transaction(async (tx) => { ... }) for multi-table operations',
      'Use eq(), and(), or(), ilike() from drizzle-orm for type-safe conditions',
      'Run db:push for development, db:generate + db:migrate for production',
    ],
    dont: [
      'Use raw SQL strings — Drizzle provides type-safe query builders',
      'Forget indexes on foreign key columns',
      'Use floating-point for monetary values — use integer (cents)',
      'Skip .returning() and do a separate SELECT after INSERT',
      'Use timestamp without "withTimezone: true" — always use timestamptz',
    ],
    languages: ['typescript', 'sql'],
  },
  {
    id: 'responsive-design-practices',
    title: 'Responsive Design Best Practices',
    category: 'ux',
    description: 'Build responsive layouts that work well on all screen sizes.',
    do: [
      'Design mobile-first: write base styles for mobile, add sm:/md:/lg: for larger screens',
      'Use Tailwind responsive grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      'Test on actual mobile devices, not just browser resize (touch targets, scroll behavior)',
      'Use min-h-screen for full-page layouts, not h-screen (avoids mobile viewport issues)',
      'Make touch targets at least 44x44px (py-3 px-4 on buttons)',
      'Use flex-wrap to prevent horizontal overflow on small screens',
      'Hide non-essential elements on mobile: hidden sm:block, sm:hidden',
      'Use relative units (rem, %) over absolute units (px) for typography and spacing',
    ],
    dont: [
      'Use fixed widths that break on small screens — prefer max-w-* and w-full',
      'Hide important content on mobile — adapt layout, do not remove functionality',
      'Use hover-only interactions without tap alternatives for mobile',
      'Forget to set viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
      'Test only at standard breakpoints — test at every width from 320px to 1920px',
    ],
    languages: ['css', 'typescript'],
  },
  {
    id: 'accessibility-practices',
    title: 'Web Accessibility (a11y) Best Practices',
    category: 'accessibility',
    description: 'Make web applications accessible to all users, including those using assistive technologies.',
    do: [
      'Use semantic HTML: button for actions, a for navigation, h1-h6 for headings, nav/main/aside for landmarks',
      'Add alt text to all images — descriptive for content images, empty alt="" for decorative images',
      'Ensure all interactive elements are keyboard-accessible (Tab, Enter, Space, Escape)',
      'Use aria-label or aria-labelledby on icon-only buttons and interactive elements',
      'Maintain visible focus indicators (:focus-visible) — never remove outlines without replacement',
      'Use aria-live regions to announce dynamic content changes to screen readers',
      'Ensure sufficient color contrast: 4.5:1 for normal text, 3:1 for large text (WCAG AA)',
      'Add skip navigation links for keyboard users',
      'Use role="dialog" and aria-modal="true" on modals, with focus trapping',
    ],
    dont: [
      'Use div with onClick instead of button — divs are not interactive elements',
      'Remove focus outlines without providing an alternative visible indicator',
      'Rely on color alone to convey information (error = red + icon + text)',
      'Use tabindex > 0 — it disrupts natural tab order. Only use 0 or -1',
      'Forget to test with keyboard navigation — many users cannot use a mouse',
      'Use placeholder as the only label for form inputs',
    ],
    languages: ['typescript', 'css'],
  },
];
