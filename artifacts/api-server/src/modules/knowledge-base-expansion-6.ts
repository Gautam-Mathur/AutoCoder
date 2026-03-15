import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 6
// Performance, Caching, State Management, Animation,
// Responsive Design, Dark Mode, Form Handling, Data Tables
// ============================================

export const EXPANDED_CONCEPTS_6: Record<string, Concept> = {

  caching_strategies: {
    id: 'caching-strategies',
    name: 'Caching Strategies',
    category: 'performance',
    description: 'Speed up applications with in-memory, HTTP, and distributed caching.',
    explanation: 'Caching reduces database load and response times. Layers: (1) Browser cache — HTTP Cache-Control headers for static assets. (2) CDN cache — edge caching for static files and API responses. (3) Application cache — in-memory (Map/LRU) or Redis for frequently accessed data. (4) Query cache — React Query caches API responses on the client. Cache invalidation strategies: time-based (TTL), event-based (invalidate on write), version-based (cache keys include version). The hardest problem: knowing when to invalidate.',
    examples: [
      `// In-memory cache with TTL
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new MemoryCache<unknown>();

// Cache middleware for GET endpoints
function cacheMiddleware(ttlMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = \`cache:\${req.originalUrl}\`;
    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      cache.set(key, body, ttlMs);
      return originalJson(body);
    };
    next();
  };
}

// Usage
app.get('/api/stats/dashboard', authenticate, cacheMiddleware(60_000), asyncHandler(async (req, res) => {
  const stats = await computeDashboardStats(req.user!.id);
  res.json(stats);
}));

// Invalidate cache when data changes
app.post('/api/tasks', authenticate, asyncHandler(async (req, res) => {
  const task = await createTask(req.body);
  cache.invalidatePattern('stats');
  cache.invalidatePattern('tasks');
  res.status(201).json(task);
}));

// HTTP cache headers for static assets
app.use('/assets', express.static('./dist/assets', {
  maxAge: '365d',
  immutable: true,
}));

// React Query client-side caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});`,
    ],
    relatedConcepts: ['rate-limiting', 'cursor-pagination', 'performance-patterns'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  form_handling: {
    id: 'form-handling',
    name: 'Advanced Form Handling with React Hook Form + Zod',
    category: 'ux',
    description: 'Build complex forms with validation, error handling, dynamic fields, and optimistic submission.',
    explanation: 'React Hook Form + Zod is the gold standard for forms in React. Benefits: (1) Minimal re-renders (uncontrolled inputs). (2) TypeScript type safety from Zod schema. (3) Built-in validation with field-level errors. (4) Easy integration with UI libraries. (5) Support for dynamic fields (useFieldArray). Best practices: validate on blur (not on change — too aggressive), show errors inline next to fields, maintain form data on submission error.',
    examples: [
      `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Please select a priority' }),
  }),
  dueDate: z.string().optional().refine(val => {
    if (!val) return true;
    return new Date(val) > new Date();
  }, 'Due date must be in the future'),
  assigneeId: z.number().optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').default([]),
});

type TaskFormData = z.infer<typeof taskSchema>;

function CreateTaskForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'medium',
      tags: [],
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.details) {
          for (const [field, message] of Object.entries(err.details)) {
            setError(field as keyof TaskFormData, { message: message as string });
          }
          return;
        }
        setError('root', { message: err.error ?? 'Failed to create task' });
        return;
      }

      reset();
      onSuccess();
    } catch {
      setError('root', { message: 'Network error. Please check your connection.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {errors.root && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3" role="alert">
          {errors.root.message}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          {...register('title')}
          className={\`w-full border rounded-lg px-3 py-2 text-sm \${errors.title ? 'border-red-500' : ''}\`}
          placeholder="Enter task title"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          className={\`w-full border rounded-lg px-3 py-2 text-sm resize-y \${errors.description ? 'border-red-500' : ''}\`}
          placeholder="Describe the task (optional)"
        />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-1">Priority</label>
          <select
            id="priority"
            {...register('priority')}
            className={\`w-full border rounded-lg px-3 py-2 text-sm bg-background \${errors.priority ? 'border-red-500' : ''}\`}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {errors.priority && (
            <p className="text-red-500 text-xs mt-1">{errors.priority.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium mb-1">Due Date</label>
          <input
            id="dueDate"
            type="date"
            {...register('dueDate')}
            className={\`w-full border rounded-lg px-3 py-2 text-sm \${errors.dueDate ? 'border-red-500' : ''}\`}
          />
          {errors.dueDate && (
            <p className="text-red-500 text-xs mt-1">{errors.dueDate.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => reset()}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
          Reset
        </button>
        <button type="submit" disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}`,
    ],
    relatedConcepts: ['zod-validation', 'rest-api-design', 'aria-patterns'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  dark_mode: {
    id: 'dark-mode',
    name: 'Dark Mode Implementation',
    category: 'ux',
    description: 'Implement dark mode with system preference detection, manual toggle, and persistent preference.',
    explanation: 'Dark mode is expected in modern web apps. Implementation: (1) Use CSS variables or Tailwind dark: modifier. (2) Detect system preference with prefers-color-scheme media query. (3) Allow manual override stored in localStorage. (4) Apply the theme class to <html> element. (5) Prevent flash of wrong theme (FOITH) with a blocking script in <head>.',
    examples: [
      `// Dark mode hook with system detection + manual override
function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') ?? 'system';
  });

  const resolvedTheme = useMemo(() => {
    if (theme !== 'system') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setThemeState('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return { theme, resolvedTheme, setTheme };
}

// Theme toggle component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {options.map(opt => (
        <button key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={\`px-2 py-1 rounded-md text-xs font-medium transition-colors \${
            theme === opt.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }\`}
          aria-label={\`Switch to \${opt.label} theme\`}>
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// Prevent FOITH: Add this script to <head> (before CSS loads)
// <script>
//   (function() {
//     var theme = localStorage.getItem('theme') || 'system';
//     if (theme === 'system') {
//       theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
//     }
//     document.documentElement.classList.add(theme);
//   })();
// </script>

// tailwind.config.ts:
// export default { darkMode: 'class', ... }`,
    ],
    relatedConcepts: ['react-context-pattern', 'internationalization'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  responsive_design: {
    id: 'responsive-design',
    name: 'Responsive Design Patterns with Tailwind',
    category: 'ux',
    description: 'Build mobile-first responsive layouts with Tailwind CSS breakpoints and utility patterns.',
    explanation: 'Tailwind uses mobile-first breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px). Design mobile first, then add larger breakpoints. Key patterns: (1) Stack on mobile, side-by-side on desktop (flex-col sm:flex-row). (2) Full-width on mobile, contained on desktop (max-w-sm mx-auto). (3) Hide/show elements per breakpoint (hidden md:block). (4) Responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3). (5) Responsive text (text-sm md:text-base). Always test on real mobile devices.',
    examples: [
      `// Responsive dashboard layout
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-muted rounded-lg"
          aria-label="Open menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold">Dashboard</span>
        <div className="w-8" />
      </header>

      <div className="flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-background border-r shadow-xl">
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 border-r min-h-screen sticky top-0">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Responsive card grid
function StatsGrid({ stats }: { stats: { label: string; value: string; change: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="bg-card border rounded-xl p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</p>
          <p className="text-xs text-green-600 mt-1">{stat.change}</p>
        </div>
      ))}
    </div>
  );
}

// Responsive table that scrolls horizontally on mobile
function ResponsiveTable<T extends Record<string, unknown>>({ columns, data }: {
  columns: { key: string; label: string; hideOnMobile?: boolean }[];
  data: T[];
}) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 sm:rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map(col => (
              <th key={col.key}
                className={\`text-left px-4 py-3 font-medium text-muted-foreground \${
                  col.hideOnMobile ? 'hidden md:table-cell' : ''
                }\`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30">
              {columns.map(col => (
                <td key={col.key}
                  className={\`px-4 py-3 \${col.hideOnMobile ? 'hidden md:table-cell' : ''}\`}>
                  {String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
    ],
    relatedConcepts: ['image-optimization', 'aria-patterns', 'dark-mode'],
    difficulty: 'beginner',
    languages: ['typescript'],
  },

  state_management_patterns: {
    id: 'state-management-patterns',
    name: 'React State Management Patterns',
    category: 'react',
    description: 'Choose the right state management approach: local state, context, React Query, or Zustand.',
    explanation: 'Not all state is equal. Categories: (1) UI state (modal open, active tab) → useState. (2) Form state → React Hook Form. (3) Server state (API data) → React Query (TanStack Query). (4) Global UI state (theme, sidebar) → Context or Zustand. (5) URL state (filters, pagination) → URL search params. Anti-pattern: putting everything in a global store (Redux). Most apps need: useState + React Query + maybe one Context for auth/theme.',
    examples: [
      `// 1. Local UI state — useState
function Accordion({ items }: { items: { title: string; content: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg">
          <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-4 text-left font-medium">
            {item.title}
            <span className={\`transform transition-transform \${openIndex === i ? 'rotate-180' : ''}\`}>▼</span>
          </button>
          {openIndex === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{item.content}</div>}
        </div>
      ))}
    </div>
  );
}

// 2. Server state — React Query
function useTasks(filters: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      const res = await fetch(\`/api/tasks?\${params}\`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json() as Promise<{ data: Task[]; pagination: Pagination }>;
    },
    staleTime: 30_000,
  });
}

function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// 3. URL state — search params
function useSearchParams() {
  const [searchParams, setSearchParams] = useSearchParamsHook();

  return {
    status: searchParams.get('status') ?? 'all',
    page: Number(searchParams.get('page')) || 1,
    search: searchParams.get('q') ?? '',
    setFilters: (filters: Partial<{ status: string; page: number; search: string }>) => {
      const next = new URLSearchParams(searchParams);
      if (filters.status !== undefined) {
        if (filters.status === 'all') next.delete('status');
        else next.set('status', filters.status);
      }
      if (filters.page !== undefined) {
        if (filters.page <= 1) next.delete('page');
        else next.set('page', String(filters.page));
      }
      if (filters.search !== undefined) {
        if (!filters.search) next.delete('q');
        else next.set('q', filters.search);
      }
      setSearchParams(next, { replace: true });
    },
  };
}`,
    ],
    relatedConcepts: ['react-context-pattern', 'form-handling', 'caching-strategies'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  animation_patterns: {
    id: 'animation-patterns',
    name: 'Web Animation Patterns',
    category: 'ux',
    description: 'Add polish with CSS transitions, keyframe animations, and Framer Motion.',
    explanation: 'Animations guide attention, provide feedback, and create delight. Rules: (1) Keep animations short (150-300ms). (2) Use ease-out for entrances, ease-in for exits. (3) Reduce motion for prefers-reduced-motion users. (4) Animate transforms and opacity (GPU-accelerated) — never animate width/height/top/left. (5) Use CSS transitions for simple state changes, Framer Motion for complex orchestration.',
    examples: [
      `// CSS transition classes (Tailwind)
// Fade in: transition-opacity duration-200 ease-out
// Slide up: transform transition-transform duration-200 translate-y-2 opacity-0 → translate-y-0 opacity-100
// Scale: transition-transform duration-150 scale-95 → scale-100

// Animated list with stagger
function AnimatedList({ items, renderItem }: { items: unknown[]; renderItem: (item: unknown, i: number) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: \`\${i * 50}ms\`, animationFillMode: 'both' }}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

// Skeleton loading with shimmer
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={\`bg-muted rounded animate-pulse \${className ?? ''}\`} />
  );
}

function TaskCardSkeleton() {
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

// Page transition wrapper
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-300 ease-out">
      {children}
    </div>
  );
}

// Respect prefers-reduced-motion
// In CSS/Tailwind:
// @media (prefers-reduced-motion: reduce) {
//   *, *::before, *::after {
//     animation-duration: 0.01ms !important;
//     transition-duration: 0.01ms !important;
//   }
// }

// Tooltip with animation
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-foreground text-background text-xs rounded-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
          role="tooltip">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  );
}`,
    ],
    relatedConcepts: ['skeleton-loading', 'responsive-design', 'aria-patterns'],
    difficulty: 'beginner',
    languages: ['typescript', 'css'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 6
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_6: Record<string, EntityArchetype> = {

  product: {
    id: 'product',
    name: 'Product',
    aliases: ['item', 'listing', 'goods', 'merchandise'],
    domain: 'ecommerce',
    description: 'A product listing with name, price, description, images, and inventory.',
    traits: ['searchable', 'pageable', 'soft-deletable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(300) not null', nullable: false, description: 'Product name' },
      { name: 'slug', type: 'varchar(300) not null unique', nullable: false, description: 'URL slug' },
      { name: 'description', type: 'text', nullable: true, description: 'Product description (HTML or markdown)' },
      { name: 'price', type: 'integer not null', nullable: false, description: 'Price in cents' },
      { name: 'compareAtPrice', type: 'integer', nullable: true, description: 'Original price for showing discount' },
      { name: 'currency', type: "varchar(3) not null default 'usd'", nullable: false, description: 'ISO 4217 currency code' },
      { name: 'images', type: 'jsonb not null default []', nullable: false, description: 'Array of { url, alt }' },
      { name: 'categoryId', type: 'integer references categories(id)', nullable: true, description: 'Category FK' },
      { name: 'stock', type: 'integer not null default 0', nullable: false, description: 'Available stock' },
      { name: 'sku', type: 'varchar(50)', nullable: true, description: 'Stock keeping unit' },
      { name: 'status', type: "varchar(20) not null default 'draft'", nullable: false, description: 'draft|active|archived' },
      { name: 'tags', type: 'text[]', nullable: true, description: 'Product tags for filtering' },
      { name: 'rating', type: 'numeric(2,1)', nullable: true, description: 'Average rating 1.0-5.0' },
      { name: 'reviewCount', type: 'integer not null default 0', nullable: false, description: 'Number of reviews' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['category', 'review', 'order-item'],
    suggestedIndexes: ['slug (unique)', 'categoryId', '(status, createdAt DESC)', 'Full-text on (name, description)'],
    typicalEndpoints: [
      'GET /products?category=1&minPrice=10&maxPrice=100&page=1',
      'GET /products/:slug',
      'POST /products',
      'PATCH /products/:id',
      'DELETE /products/:id',
    ],
  },

  order: {
    id: 'order',
    name: 'Order',
    aliases: ['purchase', 'checkout'],
    domain: 'ecommerce',
    description: 'A customer order with items, shipping address, payment status, and fulfillment tracking.',
    traits: ['pageable', 'auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'orderNumber', type: 'varchar(20) not null unique', nullable: false, description: 'Human-readable order number' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Customer' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|paid|shipped|delivered|canceled|refunded' },
      { name: 'subtotal', type: 'integer not null', nullable: false, description: 'Subtotal in cents' },
      { name: 'tax', type: 'integer not null default 0', nullable: false, description: 'Tax in cents' },
      { name: 'shipping', type: 'integer not null default 0', nullable: false, description: 'Shipping cost in cents' },
      { name: 'total', type: 'integer not null', nullable: false, description: 'Total in cents' },
      { name: 'currency', type: "varchar(3) not null default 'usd'", nullable: false, description: 'ISO 4217 currency code' },
      { name: 'shippingAddress', type: 'jsonb', nullable: true, description: 'Shipping address object' },
      { name: 'stripePaymentIntentId', type: 'varchar(100)', nullable: true, description: 'Stripe payment intent' },
      { name: 'paidAt', type: 'timestamptz', nullable: true, description: 'Payment confirmed time' },
      { name: 'shippedAt', type: 'timestamptz', nullable: true, description: 'Shipment time' },
      { name: 'deliveredAt', type: 'timestamptz', nullable: true, description: 'Delivery confirmation' },
      { name: 'canceledAt', type: 'timestamptz', nullable: true, description: 'Cancellation time' },
      { name: 'notes', type: 'text', nullable: true, description: 'Order notes' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Order creation time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'order-item', 'payment'],
    suggestedIndexes: ['orderNumber (unique)', '(userId, createdAt DESC)', 'status', 'stripePaymentIntentId'],
    typicalEndpoints: [
      'GET /orders?status=shipped&page=1',
      'GET /orders/:id',
      'POST /orders (checkout)',
      'PATCH /orders/:id/status',
      'POST /orders/:id/refund',
    ],
  },

  workspace: {
    id: 'workspace',
    name: 'Workspace / Organization',
    aliases: ['organization', 'company', 'team', 'tenant'],
    domain: 'saas',
    description: 'A workspace (tenant) containing team members, projects, and billing.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'name', type: 'varchar(200) not null', nullable: false, description: 'Workspace name' },
      { name: 'slug', type: 'varchar(200) not null unique', nullable: false, description: 'URL slug' },
      { name: 'logoUrl', type: 'text', nullable: true, description: 'Workspace logo URL' },
      { name: 'ownerId', type: 'integer not null references users(id)', nullable: false, description: 'Workspace creator/owner' },
      { name: 'plan', type: "varchar(20) not null default 'free'", nullable: false, description: 'free|pro|enterprise' },
      { name: 'maxMembers', type: 'integer not null default 5', nullable: false, description: 'Max team members' },
      { name: 'settings', type: 'jsonb not null default {}', nullable: false, description: 'Workspace settings' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'team-member', 'subscription', 'invitation'],
    suggestedIndexes: ['slug (unique)', 'ownerId'],
    typicalEndpoints: [
      'GET /workspaces',
      'POST /workspaces',
      'PATCH /workspaces/:id',
      'DELETE /workspaces/:id',
      'GET /workspaces/:id/members',
      'POST /workspaces/:id/invite',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 6
// ============================================

export const EXPANDED_DOMAIN_MODELS_6: Record<string, DomainModel> = {

  'analytics-dashboard': {
    id: 'analytics-dashboard',
    name: 'Analytics / Reporting Dashboard',
    description: 'Data analytics dashboard with charts, filters, date ranges, and exportable reports.',
    coreEntities: ['metric', 'report', 'dashboard_widget', 'data_source'],
    optionalEntities: ['saved_filter', 'scheduled_report', 'export'],
    keyRelationships: [
      'dashboard_widget references a metric or data_source',
      'report contains multiple widgets and filters',
      'saved_filter belongs to user',
      'scheduled_report references a report and delivery schedule',
    ],
    typicalFeatures: [
      'KPI cards (total users, revenue, conversion rate)',
      'Time series line/bar charts with date range picker',
      'Comparison charts (this period vs. last period)',
      'Filterable data tables with sorting and search',
      'Date range presets (Today, Last 7d, Last 30d, Custom)',
      'Export to CSV/PDF',
      'Scheduled email reports',
      'Responsive layout (mobile-friendly)',
      'Real-time updates for key metrics',
      'Drill-down from summary to detail',
    ],
    securityConsiderations: [
      'Role-based access to sensitive metrics',
      'Tenant isolation for SaaS analytics',
      'Rate limit export endpoints',
      'Sanitize filter inputs to prevent injection',
    ],
    suggestedIndexStrategy: [
      'events: (event_type, created_at) for time-series queries',
      'events: (user_id, event_type) for user-level analytics',
      'reports: (userId, createdAt DESC) for report listing',
    ],
  },

  'recipe-platform': {
    id: 'recipe-platform',
    name: 'Recipe / Cooking Platform',
    description: 'Recipe sharing platform with ingredients, instructions, ratings, and meal planning.',
    coreEntities: ['recipe', 'ingredient', 'instruction_step', 'user'],
    optionalEntities: ['review', 'collection', 'meal_plan', 'shopping_list', 'tag'],
    keyRelationships: [
      'recipe belongs to user (authorId FK)',
      'ingredient belongs to recipe',
      'instruction_step belongs to recipe with sortOrder',
      'review belongs to recipe and user',
      'collection (cookbook) belongs to user, contains many recipes',
      'meal_plan belongs to user, contains recipes for dates',
    ],
    typicalFeatures: [
      'Recipe creation with rich editor',
      'Ingredient list with quantities and units',
      'Step-by-step instructions with images',
      'Recipe search with filters (cuisine, diet, time)',
      'Star ratings and reviews',
      'Save to personal collections',
      'Meal planning (drag recipes to calendar)',
      'Auto-generated shopping list from meal plan',
      'Serving size adjustment (recalculate ingredients)',
      'Nutrition information',
      'Cooking timer per step',
      'Print-friendly recipe view',
    ],
    securityConsiderations: [
      'User-generated content moderation',
      'Image upload validation',
      'Rate limit recipe creation',
    ],
    suggestedIndexStrategy: [
      'recipes: Full-text on (title, description)',
      'recipes: (authorId, createdAt DESC)',
      'recipes: (cuisine, status, createdAt DESC)',
      'ingredients: (recipeId)',
      'reviews: (recipeId, createdAt DESC)',
    ],
  },

  'event-management': {
    id: 'event-management',
    name: 'Event Management Platform',
    description: 'Event creation, ticketing, RSVP management, and attendee tracking.',
    coreEntities: ['event', 'ticket_type', 'registration', 'user'],
    optionalEntities: ['venue', 'speaker', 'agenda_item', 'sponsor', 'check_in', 'payment'],
    keyRelationships: [
      'event belongs to organizer user',
      'ticket_type belongs to event',
      'registration belongs to event and user with ticket_type',
      'agenda_item belongs to event with time slot',
      'speaker belongs to event (many-to-many)',
      'check_in belongs to registration',
    ],
    typicalFeatures: [
      'Event creation with details, images, and venue',
      'Multiple ticket types with pricing and limits',
      'Registration form with custom fields',
      'QR code check-in for attendees',
      'Event discovery with filters (date, location, category)',
      'Agenda/schedule builder with sessions',
      'Speaker profiles',
      'Sponsor tiers',
      'Attendee list for organizers',
      'Email notifications (confirmation, reminder, follow-up)',
      'Event analytics (registrations, attendance, revenue)',
      'Waitlist for sold-out events',
    ],
    securityConsiderations: [
      'Prevent double-registration',
      'Validate ticket availability atomically',
      'QR code validation for check-in',
      'Rate limit registration endpoints',
    ],
    suggestedIndexStrategy: [
      'events: (status, startDate) for discovery',
      'events: (organizerId, createdAt DESC) for organizer dashboard',
      'registrations: (eventId, userId) unique',
      'registrations: (userId, createdAt DESC) for user history',
      'ticket_types: (eventId)',
    ],
  },

  'job-board': {
    id: 'job-board-platform',
    name: 'Job Board Platform',
    description: 'Job listings with applications, company profiles, and candidate management.',
    coreEntities: ['job_posting', 'company', 'application', 'user'],
    optionalEntities: ['resume', 'saved_job', 'interview', 'skill_tag'],
    keyRelationships: [
      'job_posting belongs to company',
      'application belongs to job_posting and user',
      'company belongs to user (employer)',
      'saved_job links user to job_posting (favorites)',
      'interview belongs to application',
    ],
    typicalFeatures: [
      'Job posting creation with rich description',
      'Job search with filters (location, type, salary, remote)',
      'Company profiles with reviews',
      'One-click apply with saved resume',
      'Application tracking (applied, reviewed, interviewed, offered, rejected)',
      'Saved jobs / favorites',
      'Job alerts (email notifications for matching criteria)',
      'Employer dashboard (view applications, schedule interviews)',
      'Resume parsing and storage',
      'Salary range display',
      'Remote/hybrid/onsite filter',
      'Featured job listings (paid)',
    ],
    securityConsiderations: [
      'Verify employer identity',
      'Protect applicant personal information',
      'Prevent spam job postings',
      'Rate limit applications',
    ],
    suggestedIndexStrategy: [
      'job_postings: Full-text on (title, description)',
      'job_postings: (companyId, status, createdAt DESC)',
      'job_postings: (location, type, status)',
      'applications: (jobId, userId) unique',
      'applications: (userId, createdAt DESC)',
      'saved_jobs: (userId, jobId) unique',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 6
// ============================================

export const EXPANDED_CODE_SNIPPETS_6: CodeSnippet[] = [

  {
    id: 'drizzle-schema-events',
    title: 'Drizzle Schema: Events / Ticketing',
    description: 'Complete schema for an event management platform with events, tickets, and registrations.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'events', 'drizzle'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  organizerId: integer('organizer_id').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 500 }),
  coverImageUrl: text('cover_image_url'),
  venue: varchar('venue', { length: 300 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 2 }),
  isOnline: boolean('is_online').notNull().default(false),
  onlineUrl: text('online_url'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  category: varchar('category', { length: 50 }),
  maxAttendees: integer('max_attendees'),
  registrationCount: integer('registration_count').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('events_slug_idx').on(t.slug),
  organizerIdx: index('events_organizer_idx').on(t.organizerId),
  dateIdx: index('events_date_idx').on(t.status, t.startDate),
  cityIdx: index('events_city_idx').on(t.city, t.startDate),
}));

export const ticketTypes = pgTable('ticket_types', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  quantity: integer('quantity'),
  sold: integer('sold').notNull().default(0),
  maxPerOrder: integer('max_per_order').notNull().default(10),
  salesStart: timestamp('sales_start', { withTimezone: true }),
  salesEnd: timestamp('sales_end', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventIdx: index('ticket_types_event_idx').on(t.eventId),
}));

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id),
  userId: integer('user_id').notNull(),
  ticketTypeId: integer('ticket_type_id').notNull().references(() => ticketTypes.id),
  quantity: integer('quantity').notNull().default(1),
  totalPaid: integer('total_paid').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: varchar('status', { length: 20 }).notNull().default('confirmed'),
  qrCode: varchar('qr_code', { length: 100 }).notNull().unique(),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventUserIdx: uniqueIndex('registrations_event_user_idx').on(t.eventId, t.userId),
  userIdx: index('registrations_user_idx').on(t.userId, t.createdAt),
  qrIdx: uniqueIndex('registrations_qr_idx').on(t.qrCode),
}));

export const agendaItems = pgTable('agenda_items', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  speakerName: varchar('speaker_name', { length: 200 }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  location: varchar('location', { length: 200 }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({
  eventIdx: index('agenda_items_event_idx').on(t.eventId, t.sortOrder),
}));`,
  },

  {
    id: 'react-use-debounce',
    title: 'useDebounce Hook',
    description: 'Custom hook for debouncing values and callbacks, useful for search inputs.',
    tech: ['react', 'typescript'],
    tags: ['hook', 'performance', 'search', 'react'],
    code: `function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]) as T;

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return debouncedFn;
}

// Usage:
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
      />
    </div>
  );
}`,
  },

  {
    id: 'react-use-local-storage',
    title: 'useLocalStorage Hook',
    description: 'Persist state in localStorage with SSR-safe initialization and type safety.',
    tech: ['react', 'typescript'],
    tags: ['hook', 'storage', 'react'],
    code: `function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const nextValue = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(nextValue));
      } catch (err) {
        console.warn(\`Failed to save to localStorage (key: \${key}):\`, err);
      }
      return nextValue;
    });
  }, [key]);

  return [storedValue, setValue];
}

// Usage:
// const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
// const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('recent-searches', []);`,
  },

  {
    id: 'react-use-click-outside',
    title: 'useClickOutside Hook',
    description: 'Detect clicks outside a ref element, useful for closing dropdowns and modals.',
    tech: ['react', 'typescript'],
    tags: ['hook', 'dropdown', 'modal', 'react'],
    code: `function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Usage:
function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setIsOpen(false));

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-background border rounded-xl shadow-lg z-50 min-w-[200px] py-1">
          {children}
        </div>
      )}
    </div>
  );
}`,
  },

  {
    id: 'kanban-board',
    title: 'Kanban Board Component',
    description: 'Kanban board with columns and draggable cards for task/project management.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['kanban', 'component', 'project-management', 'task'],
    code: `interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  items: KanbanItem[];
}

interface KanbanItem {
  id: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: { name: string; avatarUrl?: string };
  tags?: string[];
  dueDate?: string;
}

function KanbanBoard({ columns, onMoveItem }: {
  columns: KanbanColumn[];
  onMoveItem: (itemId: number, fromColumn: string, toColumn: string) => void;
}) {
  const [dragItem, setDragItem] = useState<{ itemId: number; fromColumn: string } | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {columns.map(col => (
        <div key={col.id}
          className="flex-shrink-0 w-72 bg-muted/30 rounded-xl flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragItem && dragItem.fromColumn !== col.id) {
              onMoveItem(dragItem.itemId, dragItem.fromColumn, col.id);
            }
            setDragItem(null);
          }}>
          <div className="flex items-center gap-2 p-3">
            <div className={\`w-2.5 h-2.5 rounded-full\`} style={{ backgroundColor: col.color }} />
            <h3 className="font-medium text-sm">{col.title}</h3>
            <span className="text-xs text-muted-foreground ml-auto">{col.items.length}</span>
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {col.items.map(item => (
              <div key={item.id}
                draggable
                onDragStart={() => setDragItem({ itemId: item.id, fromColumn: col.id })}
                onDragEnd={() => setDragItem(null)}
                className="bg-background border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors shadow-sm">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {item.priority && (
                    <span className={\`text-[10px] font-medium px-1.5 py-0.5 rounded \${
                      item.priority === 'urgent' ? 'bg-red-100 text-red-700'
                      : item.priority === 'high' ? 'bg-orange-100 text-orange-700'
                      : item.priority === 'medium' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                    }\`}>
                      {item.priority}
                    </span>
                  )}
                  {item.tags?.map(tag => (
                    <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  {item.assignee && (
                    <div className="flex items-center gap-1.5">
                      {item.assignee.avatarUrl ? (
                        <img src={item.assignee.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium">
                          {item.assignee.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">{item.assignee.name}</span>
                    </div>
                  )}
                  {item.dueDate && (
                    <span className="text-[10px] text-muted-foreground">{item.dueDate}</span>
                  )}
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
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 6
// ============================================

export const EXPANDED_ANTI_PATTERNS_6: AntiPattern[] = [
  {
    id: 'god-component',
    name: 'God Component (>500 Lines)',
    description: 'A single React component file that handles data fetching, state management, business logic, and rendering.',
    whyBad: 'Impossible to test individual concerns. Hard to understand and modify. Merge conflicts when multiple developers touch the same file. Slow re-renders because any state change re-renders the entire component.',
    fix: 'Split into: (1) Custom hook for data fetching (useTasks). (2) Container component for orchestration. (3) Presentational components for rendering. (4) Utility functions for business logic. Each file should have one clear responsibility.',
    severity: 'high',
    badExample: 'function TaskPage() { /* 600 lines: fetch, state, handlers, 20 JSX elements */ }',
    goodExample: 'function TaskPage() { const { tasks, isLoading } = useTasks(); return <TaskList tasks={tasks} isLoading={isLoading} />; }',
    tags: ['react', 'architecture', 'maintainability'],
  },
  {
    id: 'no-loading-skeleton',
    name: 'Spinner Instead of Skeleton Loading',
    description: 'Using a single centered spinner for all loading states instead of skeleton placeholders.',
    whyBad: 'Spinners cause layout shift when content loads. Users have no idea what content is coming. The page jumps around as content appears. Skeletons provide a better perceived performance and prevent Cumulative Layout Shift (CLS).',
    fix: 'Use skeleton placeholders that match the shape of the content. Use the same height, width, and layout as the real content. Animate with a subtle pulse/shimmer effect.',
    severity: 'medium',
    badExample: 'if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;',
    goodExample: 'if (isLoading) return <div className="space-y-4">{Array.from({ length: 5 }, (_, i) => <TaskCardSkeleton key={i} />)}</div>;',
    tags: ['ux', 'react', 'performance'],
  },
  {
    id: 'no-optimistic-update',
    name: 'Missing Optimistic Updates for Toggle Actions',
    description: 'Waiting for server response before updating the UI for simple toggle/like/complete actions.',
    whyBad: 'The UI feels laggy — user clicks a checkbox and nothing happens for 200-500ms until the server responds. For simple toggles, the user expects instant feedback.',
    fix: 'Use optimistic updates: immediately update the UI, then send the request. If the request fails, roll back the UI change and show an error toast. React Query has built-in optimistic update support with onMutate/onError/onSettled.',
    severity: 'medium',
    badExample: 'const handleToggle = async (id) => { await api.toggleTask(id); refetch(); }; // Slow: wait for server',
    goodExample: 'const handleToggle = (id) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)); api.toggleTask(id).catch(() => { refetch(); toast.error("Failed"); }); };',
    tags: ['ux', 'react', 'performance'],
  },
  {
    id: 'inconsistent-naming',
    name: 'Inconsistent Naming Conventions',
    description: 'Mixing camelCase, snake_case, and PascalCase randomly across the codebase.',
    whyBad: 'Makes the codebase harder to navigate and search. Causes bugs when developers guess wrong about the casing of a variable or function. Looks unprofessional.',
    fix: 'Establish and enforce conventions: (1) camelCase for variables, functions, and object keys. (2) PascalCase for React components, types, interfaces, and classes. (3) UPPER_SNAKE_CASE for constants. (4) kebab-case for file names and URLs. (5) snake_case for database column names. Use ESLint naming-convention rule.',
    severity: 'medium',
    badExample: 'const user_data = getUser(); function RenderCard() {}; const API_url = "/api";',
    goodExample: 'const userData = getUser(); function renderCard() {}; const API_URL = "/api";',
    tags: ['code-quality', 'maintainability'],
  },
  {
    id: 'excessive-rerenders',
    name: 'Excessive React Re-renders',
    description: 'Creating new objects/functions in render that cause unnecessary child re-renders.',
    whyBad: 'Every render creates a new reference for inline objects and callbacks. If passed as props, children re-render even when data has not changed. This compounds in lists and complex UIs.',
    fix: 'Use useMemo for computed objects and useCallback for event handlers that are passed to children. Move static objects outside the component. Use React DevTools Profiler to identify unnecessary re-renders.',
    severity: 'medium',
    badExample: '<List items={tasks.filter(t => t.done)} onSelect={(id) => selectTask(id)} style={{ padding: 10 }} /> // 3 new refs every render',
    goodExample: 'const doneTasks = useMemo(() => tasks.filter(t => t.done), [tasks]); const handleSelect = useCallback((id) => selectTask(id), [selectTask]); <List items={doneTasks} onSelect={handleSelect} />',
    tags: ['react', 'performance'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 6
// ============================================

export const EXPANDED_BEST_PRACTICES_6: BestPractice[] = [
  {
    id: 'project-structure',
    title: 'Full-Stack Project Structure',
    category: 'architecture',
    description: 'Organize a full-stack TypeScript project for maintainability and developer experience.',
    do: [
      'Organize by feature/domain, not by type: /features/tasks/ contains routes, components, hooks, types',
      'Keep API routes thin — delegate logic to service functions',
      'Separate concerns: routes → controllers → services → repositories',
      'Co-locate tests with source files: TaskCard.tsx and TaskCard.test.tsx in the same folder',
      'Use barrel exports (index.ts) sparingly — only for public API of a feature module',
      'Keep shared types in a central /types directory',
      'Use path aliases (@/ for src/) to avoid deep relative imports',
    ],
    dont: [
      'Mix business logic into route handlers — they should only parse input and format output',
      'Create a flat /components folder with 50+ files — organize by feature',
      'Put all types in a single types.ts file — co-locate types with the code that uses them',
      'Use default exports — named exports are easier to refactor and find',
    ],
    languages: ['typescript'],
  },
  {
    id: 'git-commit-practices',
    title: 'Git Commit Best Practices',
    category: 'workflow',
    description: 'Write clear, atomic commits that make the git history useful.',
    do: [
      'Write descriptive commit messages: "Add task filtering by status and priority"',
      'Make atomic commits — each commit should be one logical change that compiles',
      'Use conventional commits format: feat:, fix:, refactor:, docs:, test:, chore:',
      'Commit early and often — small commits are easier to review and revert',
      'Use feature branches — never commit directly to main',
      'Squash WIP commits before merging (git rebase -i)',
    ],
    dont: [
      'Write vague commit messages: "fix stuff", "WIP", "updates"',
      'Bundle unrelated changes in one commit',
      'Commit commented-out code, console.logs, or debug statements',
      'Force-push to shared branches',
    ],
    languages: ['all'],
  },
  {
    id: 'code-review-checklist',
    title: 'Code Review Checklist',
    category: 'workflow',
    description: 'Key items to check during code reviews for quality and correctness.',
    do: [
      'Check: Does the code handle edge cases? (empty arrays, null values, concurrent access)',
      'Check: Are there security issues? (SQL injection, XSS, missing auth checks, exposed secrets)',
      'Check: Is there proper error handling? (try/catch, error boundaries, user-facing messages)',
      'Check: Are there performance concerns? (N+1 queries, missing indexes, unbounded queries)',
      'Check: Is the code readable? (clear names, small functions, no magic numbers)',
      'Check: Are there tests for new functionality?',
      'Check: Does the API follow existing conventions? (response format, error codes, naming)',
      'Check: Are there accessibility issues? (missing labels, keyboard support, color contrast)',
    ],
    dont: [
      'Approve without reading every changed line',
      'Focus only on style issues — prioritize correctness, security, and performance',
      'Block PRs for subjective preferences — discuss, but don\'t block',
    ],
    languages: ['all'],
  },
  {
    id: 'performance-optimization',
    title: 'Web Performance Optimization',
    category: 'performance',
    description: 'Optimize web app performance for fast loading and smooth interactions.',
    do: [
      'Lazy load routes with React.lazy() and Suspense',
      'Use code splitting to reduce initial bundle size',
      'Optimize images: use WebP/AVIF, set explicit width/height, use loading="lazy"',
      'Set HTTP cache headers: immutable for hashed assets, short TTL for API responses',
      'Use a CDN for static assets',
      'Minimize main thread work: avoid blocking JavaScript, use Web Workers for CPU-heavy tasks',
      'Preload critical resources: <link rel="preload"> for fonts, hero images',
      'Use virtual scrolling for lists with 100+ items (react-window or @tanstack/react-virtual)',
      'Profile with Chrome DevTools Performance tab and Lighthouse',
    ],
    dont: [
      'Import entire libraries when you only need one function (import _ from "lodash" → import debounce from "lodash/debounce")',
      'Load all data upfront — paginate and lazy load',
      'Use synchronous operations in request handlers (fs.readFileSync, crypto.hashSync)',
      'Skip image optimization — images are usually the largest assets',
    ],
    languages: ['typescript'],
  },
];
