import type {
  EntityArchetype,
  Concept,
  AntiPattern,
  CodeSnippet,
  BestPractice,
  DomainModel,
} from './knowledge-base';

// ============================================
// EXPANDED CONCEPTS — PART 8
// Multi-step Wizards, File Upload, Search Autocomplete,
// Data Export, Notification System, Activity Feed,
// Dashboard Analytics, Drag & Drop
// ============================================

export const EXPANDED_CONCEPTS_8: Record<string, Concept> = {

  multi_step_wizard: {
    id: 'multi-step-wizard',
    name: 'Multi-Step Form Wizard',
    category: 'ux',
    description: 'Guide users through complex forms by breaking them into sequential steps with validation and progress tracking.',
    explanation: 'Multi-step wizards reduce cognitive load by showing one section at a time. Key patterns: (1) Step indicator showing progress. (2) Per-step validation before advancing. (3) State persistence across steps (React state or URL params). (4) Back/forward navigation. (5) Summary/review step before submission. (6) Save draft for long forms. Implementation: store all form data in a parent component or context, validate on step change, submit on final step.',
    examples: [
      `// Multi-step form wizard pattern
interface WizardStep {
  id: string;
  title: string;
  component: React.ComponentType<StepProps>;
  validate?: (data: FormData) => Record<string, string>;
}

interface StepProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

function useWizard(steps: WizardStep[]) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  function onChange(field: string, value: unknown) {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  }

  function next() {
    if (step.validate) {
      const validationErrors = step.validate(data as FormData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return false;
      }
    }
    setErrors({});
    if (!isLast) setCurrentStep(s => s + 1);
    return true;
  }

  function back() {
    if (!isFirst) {
      setErrors({});
      setCurrentStep(s => s - 1);
    }
  }

  function goToStep(index: number) {
    if (index >= 0 && index < steps.length && index <= currentStep) {
      setErrors({});
      setCurrentStep(index);
    }
  }

  return { step, currentStep, data, errors, isFirst, isLast, progress, onChange, next, back, goToStep };
}

// Step indicator component
function StepIndicator({ steps, currentStep, onStepClick }: {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          {i > 0 && (
            <div className={\`flex-1 h-0.5 mx-2 \${i <= currentStep ? 'bg-primary' : 'bg-muted'}\`} />
          )}
          <button
            onClick={() => onStepClick(i)}
            disabled={i > currentStep}
            className={\`flex items-center gap-2 text-sm font-medium transition-colors \${
              i === currentStep ? 'text-primary' :
              i < currentStep ? 'text-primary/70 cursor-pointer' :
              'text-muted-foreground cursor-not-allowed'
            }\`}>
            <span className={\`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 \${
              i === currentStep ? 'border-primary bg-primary text-primary-foreground' :
              i < currentStep ? 'border-primary bg-primary/10 text-primary' :
              'border-muted text-muted-foreground'
            }\`}>
              {i < currentStep ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{step.title}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

// Usage:
// const steps: WizardStep[] = [
//   { id: 'basic', title: 'Basic Info', component: BasicInfoStep, validate: validateBasicInfo },
//   { id: 'details', title: 'Details', component: DetailsStep, validate: validateDetails },
//   { id: 'review', title: 'Review', component: ReviewStep },
// ];
// function CreateProjectWizard() {
//   const wizard = useWizard(steps);
//   const StepComponent = wizard.step.component;
//   return (
//     <div>
//       <StepIndicator steps={steps} currentStep={wizard.currentStep} onStepClick={wizard.goToStep} />
//       <StepComponent data={wizard.data} onChange={wizard.onChange} errors={wizard.errors} />
//       <div className="flex justify-between mt-6">
//         {!wizard.isFirst && <button onClick={wizard.back}>Back</button>}
//         <button onClick={wizard.isLast ? () => handleSubmit(wizard.data) : wizard.next}>
//           {wizard.isLast ? 'Submit' : 'Next'}
//         </button>
//       </div>
//     </div>
//   );
// }`,
    ],
    relatedConcepts: ['form-handling', 'validation', 'state-management'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  file_upload_patterns: {
    id: 'file-upload-patterns',
    name: 'File Upload with Drag & Drop',
    category: 'ux',
    description: 'Handle file uploads with drag-and-drop zone, preview, progress, and validation.',
    explanation: 'File upload flow: (1) User selects file via click or drag-and-drop. (2) Client-side validation (type, size). (3) Preview for images. (4) Upload to server with progress tracking. (5) Server validates and stores file. (6) Return file URL/metadata. For large files: use presigned URLs to upload directly to S3/cloud storage, bypassing the server. For multiple files: use a queue with individual progress bars.',
    examples: [
      `function FileUploadZone({ onUpload, accept, maxSize = 5 * 1024 * 1024, multiple = false }: {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<{ file: File; preview?: string; progress: number; error?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (maxSize && file.size > maxSize) {
      return \`File too large. Max size: \${(maxSize / 1024 / 1024).toFixed(0)}MB\`;
    }
    if (accept) {
      const allowed = accept.split(',').map(s => s.trim());
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const matches = allowed.some(a =>
        a.startsWith('.') ? ext === a : file.type.match(new RegExp(a.replace('*', '.*')))
      );
      if (!matches) return \`File type not allowed. Accepted: \${accept}\`;
    }
    return null;
  }

  function addFiles(fileList: FileList | File[]) {
    const newFiles = Array.from(fileList).map(file => {
      const error = validateFile(file);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      return { file, preview, progress: 0, error: error ?? undefined };
    });
    setFiles(prev => multiple ? [...prev, ...newFiles] : newFiles);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(index: number) {
    setFiles(prev => {
      const f = prev[index];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload() {
    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) return;
    await onUpload(validFiles.map(f => f.file));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={\`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors \${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }\`}>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <div className="text-muted-foreground">
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs mt-1">
            {accept && \`Accepted: \${accept}\`}
            {maxSize && \` | Max: \${(maxSize / 1024 / 1024).toFixed(0)}MB\`}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={i} className={\`flex items-center gap-3 p-3 border rounded-lg \${f.error ? 'border-red-200 bg-red-50' : ''}\`}>
              {f.preview && <img src={f.preview} alt="" className="w-10 h-10 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</p>
                {f.error && <p className="text-xs text-red-600 mt-0.5">{f.error}</p>}
              </div>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground shrink-0">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && files.some(f => !f.error) && (
        <button onClick={handleUpload}
          className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          Upload {files.filter(f => !f.error).length} file(s)
        </button>
      )}
    </div>
  );
}`,
    ],
    relatedConcepts: ['file-uploads', 'image-optimization', 'object-storage'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  search_autocomplete: {
    id: 'search-autocomplete',
    name: 'Search Autocomplete / Typeahead',
    category: 'ux',
    description: 'Real-time search suggestions with debouncing, keyboard navigation, and result highlighting.',
    explanation: 'Autocomplete provides instant search results as the user types. Key features: (1) Debounce input to avoid excessive API calls (250-400ms). (2) Highlight matching text in results. (3) Keyboard navigation (up/down arrows, Enter to select, Escape to close). (4) Show recent searches when input is empty. (5) Loading state during fetch. (6) Click-outside to close.',
    examples: [
      `function SearchAutocomplete<T extends { id: number | string }>({
  onSearch,
  onSelect,
  renderItem,
  placeholder = 'Search...',
  debounceMs = 300,
}: {
  onSearch: (query: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  renderItem: (item: T, query: string) => React.ReactNode;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setIsOpen(false); return; }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await onSearch(query);
        setResults(data);
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, onSearch, debounceMs]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          onSelect(results[activeIndex]);
          setIsOpen(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((item, i) => (
            <button key={item.id}
              className={\`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors \${
                i === activeIndex ? 'bg-muted/70' : ''
              }\`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => { onSelect(item); setIsOpen(false); setQuery(''); }}>
              {renderItem(item, query)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Highlight matching text
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(\`(\${query.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')})\`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> : part
      )}
    </>
  );
}`,
    ],
    relatedConcepts: ['debounce', 'full-text-search', 'command-palette'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  notification_system: {
    id: 'notification-system',
    name: 'In-App Notification System',
    category: 'architecture',
    description: 'A full notification system with database storage, real-time delivery, and a notification center UI.',
    explanation: 'In-app notifications inform users about events (new comments, task assignments, system alerts). Architecture: (1) Store notifications in DB with userId, type, title, body, readAt, metadata. (2) Trigger notifications from backend events. (3) Deliver in real-time via SSE or WebSocket. (4) Show notification bell with unread count badge. (5) Notification center dropdown with mark-as-read. (6) Optional email/push for important notifications.',
    examples: [
      `// Notification schema
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body'),
  link: varchar('link', { length: 500 }),
  metadata: jsonb('metadata'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userUnreadIdx: index('notifications_user_unread_idx').on(t.userId, t.readAt, t.createdAt),
}));

// Service
async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const [notification] = await db.insert(notifications).values(data).returning();
  // Real-time delivery via SSE
  sendSSEEvent(data.userId, 'notification', notification);
  return notification;
}

async function getUnreadCount(userId: number): Promise<number> {
  const [result] = await db.select({ count: sql<number>\`count(*)\` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return result?.count ?? 0;
}

async function markAsRead(notificationId: number, userId: number) {
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

async function markAllAsRead(userId: number) {
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

// API routes
app.get('/api/notifications', authenticate, asyncHandler(async (req, res) => {
  const items = await db.select().from(notifications)
    .where(eq(notifications.userId, req.user!.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  const unreadCount = await getUnreadCount(req.user!.id);
  res.json({ items, unreadCount });
}));

app.patch('/api/notifications/:id/read', authenticate, asyncHandler(async (req, res) => {
  await markAsRead(Number(req.params.id), req.user!.id);
  res.status(204).send();
}));

app.post('/api/notifications/read-all', authenticate, asyncHandler(async (req, res) => {
  await markAllAsRead(req.user!.id);
  res.status(204).send();
}));

// Trigger examples
// When someone comments on your task:
await createNotification({
  userId: taskOwner.id,
  type: 'comment',
  title: \`\${commenter.name} commented on "\${task.title}"\`,
  body: comment.content.slice(0, 100),
  link: \`/tasks/\${task.id}\`,
  metadata: { taskId: task.id, commentId: comment.id },
});

// When you are assigned a task:
await createNotification({
  userId: assigneeId,
  type: 'assignment',
  title: \`You were assigned to "\${task.title}"\`,
  link: \`/tasks/\${task.id}\`,
});`,
    ],
    relatedConcepts: ['server-sent-events', 'websocket-patterns', 'toast-notification-system'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  activity_feed: {
    id: 'activity-feed',
    name: 'Activity Feed / Audit Trail',
    category: 'architecture',
    description: 'Track and display user actions as a chronological feed for transparency and debugging.',
    explanation: 'An activity feed logs actions (created, updated, deleted, commented, assigned) with who, what, when, and context. Uses: (1) Show recent activity in a project/team. (2) Audit trail for compliance. (3) "What changed?" debugging. (4) Social feed of team updates. Schema: actor (who), action (what verb), target (what entity), metadata (details), timestamp.',
    examples: [
      `// Activity schema
export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: integer('target_id').notNull(),
  targetTitle: varchar('target_title', { length: 300 }),
  metadata: jsonb('metadata'),
  projectId: integer('project_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index('activities_project_idx').on(t.projectId, t.createdAt),
  actorIdx: index('activities_actor_idx').on(t.actorId, t.createdAt),
}));

type ActivityAction = 'created' | 'updated' | 'deleted' | 'completed' | 'assigned' |
                      'commented' | 'moved' | 'archived' | 'restored' | 'invited';

async function logActivity(data: {
  actorId: number;
  action: ActivityAction;
  targetType: string;
  targetId: number;
  targetTitle?: string;
  metadata?: Record<string, unknown>;
  projectId?: number;
}) {
  await db.insert(activities).values(data);
}

// Usage in service functions:
async function completeTask(taskId: number, userId: number) {
  const [task] = await db.update(tasks)
    .set({ status: 'done', completedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  await logActivity({
    actorId: userId,
    action: 'completed',
    targetType: 'task',
    targetId: task.id,
    targetTitle: task.title,
    projectId: task.projectId,
  });

  return task;
}

// Activity feed API
app.get('/api/projects/:id/activity', authenticate, asyncHandler(async (req, res) => {
  const items = await db.select({
    activity: activities,
    actorName: users.name,
    actorAvatar: users.avatarUrl,
  })
  .from(activities)
  .leftJoin(users, eq(activities.actorId, users.id))
  .where(eq(activities.projectId, Number(req.params.id)))
  .orderBy(desc(activities.createdAt))
  .limit(50);

  res.json(items);
}));

// React activity feed component
function ActivityFeed({ items }: { items: Activity[] }) {
  const actionLabels: Record<string, string> = {
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    completed: 'completed',
    assigned: 'assigned',
    commented: 'commented on',
    archived: 'archived',
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
            {item.actorName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{item.actorName}</span>
              {' '}{actionLabels[item.action] ?? item.action}{' '}
              <span className="font-medium">{item.targetTitle ?? item.targetType}</span>
            </p>
            <time className="text-xs text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </time>
          </div>
        </div>
      ))}
    </div>
  );
}`,
    ],
    relatedConcepts: ['audit-logging', 'notification-system', 'database-indexing'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },

  dashboard_charts: {
    id: 'dashboard-charts',
    name: 'Dashboard Analytics with Charts',
    category: 'ux',
    description: 'Build analytics dashboards with metric cards, time-series charts, and data aggregation queries.',
    explanation: 'Analytics dashboards transform raw data into insights. Key components: (1) Metric/KPI cards (today vs yesterday, this month vs last month). (2) Time-series charts (line/bar) with period selectors (7d, 30d, 90d). (3) Distribution charts (pie/donut for status breakdown). (4) Tables for top items. Backend: use SQL aggregation (COUNT, SUM, GROUP BY date). Frontend: use Recharts or Chart.js. Cache expensive queries.',
    examples: [
      `// Dashboard stats query
async function getDashboardStats(userId: number, period: '7d' | '30d' | '90d') {
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [taskStats] = await db.select({
    total: sql<number>\`count(*)\`,
    completed: sql<number>\`count(*) filter (where status = 'done')\`,
    overdue: sql<number>\`count(*) filter (where due_date < current_date and status != 'done')\`,
  }).from(tasks)
    .where(and(
      eq(tasks.assigneeId, userId),
      isNull(tasks.deletedAt),
    ));

  const dailyCounts = await db.select({
    date: sql<string>\`date_trunc('day', completed_at)::date\`,
    count: sql<number>\`count(*)\`,
  }).from(tasks)
    .where(and(
      eq(tasks.assigneeId, userId),
      eq(tasks.status, 'done'),
      gte(tasks.completedAt, startDate),
    ))
    .groupBy(sql\`date_trunc('day', completed_at)::date\`)
    .orderBy(sql\`date_trunc('day', completed_at)::date\`);

  const statusDistribution = await db.select({
    status: tasks.status,
    count: sql<number>\`count(*)\`,
  }).from(tasks)
    .where(and(eq(tasks.assigneeId, userId), isNull(tasks.deletedAt)))
    .groupBy(tasks.status);

  return {
    metrics: taskStats,
    completionTimeline: dailyCounts,
    statusDistribution,
  };
}

// API endpoint
app.get('/api/dashboard', authenticate, asyncHandler(async (req, res) => {
  const period = (req.query.period as string) || '30d';
  const stats = await getDashboardStats(req.user!.id, period as '7d' | '30d' | '90d');
  res.json(stats);
}));

// React: Dashboard with Recharts
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Dashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => fetch(\`/api/dashboard?period=\${period}\`, { credentials: 'include' }).then(r => r.json()),
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 p-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={\`px-3 py-1 text-sm rounded-lg \${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}\`}>
            {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Tasks" value={data.metrics.total} />
        <MetricCard label="Completed" value={data.metrics.completed} color="text-green-600" />
        <MetricCard label="Overdue" value={data.metrics.overdue} color="text-red-600" />
      </div>

      {/* Completion chart */}
      <div className="border rounded-xl p-4">
        <h3 className="font-medium mb-4">Tasks Completed Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.completionTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={\`text-2xl font-bold mt-1 \${color ?? ''}\`}>{value.toLocaleString()}</p>
    </div>
  );
}`,
    ],
    relatedConcepts: ['caching', 'database-indexing', 'data-visualization'],
    difficulty: 'advanced',
    languages: ['typescript'],
  },

  drag_and_drop: {
    id: 'drag-and-drop',
    name: 'Drag & Drop Reordering',
    category: 'ux',
    description: 'Enable drag-and-drop reordering of lists with optimistic updates and persistent order.',
    explanation: 'Drag & drop reordering uses: task boards (Kanban), list ordering, file organization. Implementation: (1) HTML5 drag events (dragstart, dragover, drop). (2) Optimistic reorder on client. (3) Persist new order to server. (4) Use a sortOrder/position column (integers with gaps for easier reordering). Position strategy: use gaps of 1000 (1000, 2000, 3000) so items can be inserted between without shifting all rows. When gaps run out, re-normalize all positions.',
    examples: [
      `function useDragReorder<T extends { id: number | string }>(
  items: T[],
  onReorder: (reorderedIds: (number | string)[]) => Promise<void>,
) {
  const [localItems, setLocalItems] = useState(items);
  const [draggedId, setDraggedId] = useState<number | string | null>(null);

  useEffect(() => { setLocalItems(items); }, [items]);

  function handleDragStart(id: number | string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, targetId: number | string) {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    setLocalItems(prev => {
      const fromIdx = prev.findIndex(i => i.id === draggedId);
      const toIdx = prev.findIndex(i => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
  }

  async function handleDragEnd() {
    if (draggedId === null) return;
    setDraggedId(null);
    await onReorder(localItems.map(i => i.id));
  }

  return {
    items: localItems,
    draggedId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getDragProps: (id: number | string) => ({
      draggable: true,
      onDragStart: () => handleDragStart(id),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, id),
      onDragEnd: handleDragEnd,
      className: draggedId === id ? 'opacity-50' : '',
    }),
  };
}

// Usage:
// function TaskList({ tasks, onReorder }: { tasks: Task[]; onReorder: (ids: number[]) => Promise<void> }) {
//   const { items, getDragProps } = useDragReorder(tasks, onReorder);
//   return (
//     <ul className="space-y-1">
//       {items.map(task => (
//         <li key={task.id} {...getDragProps(task.id)}
//           className={\`p-3 border rounded-lg cursor-grab active:cursor-grabbing \${getDragProps(task.id).className}\`}>
//           {task.title}
//         </li>
//       ))}
//     </ul>
//   );
// }

// Server: update positions
app.patch('/api/tasks/reorder', authenticate, asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: number[] };

  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(tasks)
        .set({ sortOrder: (i + 1) * 1000 })
        .where(eq(tasks.id, ids[i]));
    }
  });

  res.status(204).send();
}));`,
    ],
    relatedConcepts: ['optimistic-locking', 'database-transactions-advanced', 'state-management'],
    difficulty: 'intermediate',
    languages: ['typescript'],
  },
};

// ============================================
// EXPANDED ENTITY ARCHETYPES — PART 8
// ============================================

export const EXPANDED_ENTITY_ARCHETYPES_8: Record<string, EntityArchetype> = {

  subscription: {
    id: 'subscription',
    name: 'Subscription / Plan',
    aliases: ['plan', 'billing', 'membership-plan'],
    domain: 'saas',
    description: 'SaaS subscription with plan tier, billing cycle, and payment status.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Subscriber' },
      { name: 'planId', type: 'varchar(50) not null', nullable: false, description: 'Plan identifier (free, pro, enterprise)' },
      { name: 'status', type: "varchar(20) not null default 'active'", nullable: false, description: 'active|trialing|past_due|canceled|expired' },
      { name: 'billingCycle', type: "varchar(10) not null default 'monthly'", nullable: false, description: 'monthly|yearly' },
      { name: 'currentPeriodStart', type: 'timestamptz not null', nullable: false, description: 'Current billing period start' },
      { name: 'currentPeriodEnd', type: 'timestamptz not null', nullable: false, description: 'Current billing period end' },
      { name: 'cancelAtPeriodEnd', type: 'boolean not null default false', nullable: false, description: 'Cancel at end of period' },
      { name: 'stripeCustomerId', type: 'varchar(100)', nullable: true, description: 'Stripe customer ID' },
      { name: 'stripeSubscriptionId', type: 'varchar(100)', nullable: true, description: 'Stripe subscription ID' },
      { name: 'trialEndDate', type: 'timestamptz', nullable: true, description: 'Trial end date' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'payment', 'invoice'],
    suggestedIndexes: ['userId (unique for active subscriptions)', 'stripeSubscriptionId', '(status, currentPeriodEnd)'],
    typicalEndpoints: [
      'GET /api/subscription',
      'POST /api/subscription/checkout',
      'POST /api/subscription/cancel',
      'POST /api/subscription/resume',
      'POST /api/subscription/change-plan',
      'POST /api/webhooks/stripe',
    ],
  },

  review_rating: {
    id: 'review-rating',
    name: 'Review / Rating',
    aliases: ['review', 'rating', 'feedback', 'testimonial'],
    domain: 'marketplace',
    description: 'User review with star rating, text, and moderation status.',
    traits: ['searchable', 'pageable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'userId', type: 'integer not null references users(id)', nullable: false, description: 'Reviewer' },
      { name: 'targetType', type: 'varchar(50) not null', nullable: false, description: 'Entity type being reviewed (product, course, place)' },
      { name: 'targetId', type: 'integer not null', nullable: false, description: 'Entity ID being reviewed' },
      { name: 'rating', type: 'integer not null', nullable: false, description: 'Rating 1-5' },
      { name: 'title', type: 'varchar(200)', nullable: true, description: 'Review title' },
      { name: 'body', type: 'text', nullable: true, description: 'Review body text' },
      { name: 'status', type: "varchar(20) not null default 'published'", nullable: false, description: 'published|pending|flagged|removed' },
      { name: 'helpfulCount', type: 'integer not null default 0', nullable: false, description: 'Number of helpful votes' },
      { name: 'verifiedPurchase', type: 'boolean not null default false', nullable: false, description: 'Verified purchase flag' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
      { name: 'updatedAt', type: 'timestamptz not null default now()', nullable: false, description: 'Last update' },
    ],
    relatedEntities: ['user', 'product'],
    suggestedIndexes: ['(targetType, targetId, rating)', '(userId, targetType, targetId) unique', '(status, createdAt DESC)'],
    typicalEndpoints: [
      'GET /api/reviews?targetType=product&targetId=5',
      'POST /api/reviews',
      'PATCH /api/reviews/:id',
      'DELETE /api/reviews/:id',
      'POST /api/reviews/:id/helpful',
    ],
  },

  invitation: {
    id: 'invitation',
    name: 'Invitation / Invite',
    aliases: ['invite', 'team-invite', 'org-invite'],
    domain: 'collaboration',
    description: 'Invite a user to join an organization or project via email with an expiring token.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'email', type: 'varchar(255) not null', nullable: false, description: 'Invitee email' },
      { name: 'organizationId', type: 'integer not null', nullable: false, description: 'Organization FK' },
      { name: 'role', type: "varchar(20) not null default 'member'", nullable: false, description: 'Invited role' },
      { name: 'token', type: 'varchar(100) not null unique', nullable: false, description: 'Unique invite token' },
      { name: 'invitedById', type: 'integer not null references users(id)', nullable: false, description: 'Who sent the invite' },
      { name: 'status', type: "varchar(20) not null default 'pending'", nullable: false, description: 'pending|accepted|expired|revoked' },
      { name: 'expiresAt', type: 'timestamptz not null', nullable: false, description: 'Expiry time (e.g. 7 days)' },
      { name: 'acceptedAt', type: 'timestamptz', nullable: true, description: 'When accepted' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Created time' },
    ],
    relatedEntities: ['user', 'organization', 'team-member'],
    suggestedIndexes: ['token (unique)', '(email, organizationId)', '(organizationId, status)'],
    typicalEndpoints: [
      'GET /api/organizations/:id/invitations',
      'POST /api/organizations/:id/invitations',
      'POST /api/invitations/:token/accept',
      'DELETE /api/invitations/:id',
    ],
  },

  webhook_event: {
    id: 'webhook-event',
    name: 'Webhook Event Log',
    aliases: ['webhook-log', 'event-log', 'integration-event'],
    domain: 'integration',
    description: 'Log of incoming webhook events for debugging and replay.',
    traits: ['auditable'],
    suggestedFields: [
      { name: 'id', type: 'serial primary key', nullable: false, description: 'Internal ID' },
      { name: 'source', type: 'varchar(50) not null', nullable: false, description: 'Event source (stripe, github, etc.)' },
      { name: 'eventType', type: 'varchar(100) not null', nullable: false, description: 'Event type (e.g. checkout.session.completed)' },
      { name: 'externalId', type: 'varchar(200)', nullable: true, description: 'External event ID for deduplication' },
      { name: 'payload', type: 'jsonb not null', nullable: false, description: 'Full event payload' },
      { name: 'status', type: "varchar(20) not null default 'received'", nullable: false, description: 'received|processed|failed|ignored' },
      { name: 'error', type: 'text', nullable: true, description: 'Error message if processing failed' },
      { name: 'processedAt', type: 'timestamptz', nullable: true, description: 'When processed' },
      { name: 'createdAt', type: 'timestamptz not null default now()', nullable: false, description: 'Received time' },
    ],
    relatedEntities: [],
    suggestedIndexes: ['(source, eventType, createdAt DESC)', 'externalId (unique)', '(status, createdAt DESC)'],
    typicalEndpoints: [
      'POST /api/webhooks/stripe',
      'POST /api/webhooks/github',
      'GET /api/admin/webhook-events',
      'POST /api/admin/webhook-events/:id/replay',
    ],
  },
};

// ============================================
// EXPANDED DOMAIN MODELS — PART 8
// ============================================

export const EXPANDED_DOMAIN_MODELS_8: Record<string, DomainModel> = {

  'knowledge-base-wiki': {
    id: 'knowledge-base-wiki',
    name: 'Knowledge Base / Wiki',
    description: 'Documentation platform with articles, categories, search, and version history.',
    coreEntities: ['article', 'category', 'user'],
    optionalEntities: ['article_version', 'tag', 'bookmark', 'feedback'],
    keyRelationships: [
      'article belongs to category',
      'article has many versions (edit history)',
      'article authored by user',
      'articles can link to other articles',
      'user can bookmark articles',
    ],
    typicalFeatures: [
      'Rich text editor with Markdown support',
      'Nested category tree',
      'Full-text search across all articles',
      'Version history with diff view',
      'Table of contents auto-generated from headings',
      'Slug-based URLs for SEO',
      'Related articles suggestions',
      'Feedback on articles (helpful/not helpful)',
      'Draft/published/archived status flow',
      'Export to PDF',
      'Role-based editing permissions',
    ],
    securityConsiderations: [
      'Public vs private articles',
      'Role-based editing (anyone vs editors only)',
      'Rate limit search API',
      'Sanitize HTML content to prevent XSS',
    ],
    suggestedIndexStrategy: [
      'articles: slug (unique)',
      'articles: (categoryId, status, createdAt DESC)',
      'articles: full-text on (title, content)',
      'article_versions: (articleId, createdAt DESC)',
    ],
  },

  'booking-reservation': {
    id: 'booking-reservation',
    name: 'Booking / Reservation System',
    description: 'Time-slot based booking for appointments, venues, or services.',
    coreEntities: ['booking', 'service', 'provider', 'user'],
    optionalEntities: ['time_slot', 'payment', 'review', 'cancellation', 'reminder'],
    keyRelationships: [
      'booking links user (customer) to provider and service',
      'booking has a date, start_time, end_time',
      'provider has available time slots',
      'booking can have a payment',
      'booking triggers reminders',
    ],
    typicalFeatures: [
      'Calendar view of available slots',
      'Service selection with duration and pricing',
      'Provider/staff selection',
      'Booking confirmation with email notification',
      'Cancellation and rescheduling with policies',
      'Payment at booking or at service',
      'SMS/email reminders before appointment',
      'Recurring appointments',
      'Buffer time between bookings',
      'Waitlist for fully booked slots',
      'Review after service completion',
      'Admin dashboard with booking overview',
    ],
    securityConsiderations: [
      'Prevent double-booking (database-level constraint)',
      'Cancellation policy enforcement',
      'Rate limit booking creation to prevent abuse',
      'Payment refund handling',
    ],
    suggestedIndexStrategy: [
      'bookings: (providerId, date, startTime)',
      'bookings: (userId, date DESC)',
      'bookings: (status, date)',
      'time_slots: (providerId, date, isAvailable)',
    ],
  },
};

// ============================================
// EXPANDED CODE SNIPPETS — PART 8
// ============================================

export const EXPANDED_CODE_SNIPPETS_8: CodeSnippet[] = [

  {
    id: 'drizzle-schema-blog',
    title: 'Drizzle Schema: Blog Platform (Posts, Categories, Comments)',
    description: 'Complete schema for a blog with posts, categories, tags, and threaded comments.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'blog', 'cms'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull(),
  excerpt: varchar('excerpt', { length: 500 }),
  content: text('content').notNull(),
  coverImageUrl: text('cover_image_url'),
  authorId: integer('author_id').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  readingTime: integer('reading_time'),
  viewCount: integer('view_count').notNull().default(0),
  metaTitle: varchar('meta_title', { length: 70 }),
  metaDescription: varchar('meta_description', { length: 160 }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  slugIdx: uniqueIndex('posts_slug_idx').on(t.slug),
  statusIdx: index('posts_status_idx').on(t.status, t.publishedAt),
  authorIdx: index('posts_author_idx').on(t.authorId),
  categoryIdx: index('posts_category_idx').on(t.categoryId),
}));

export const postTags = pgTable('post_tags', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 50 }).notNull(),
}, (t) => ({
  postTagIdx: uniqueIndex('post_tags_unique_idx').on(t.postId, t.tag),
  tagIdx: index('post_tags_tag_idx').on(t.tag),
}));

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull(),
  parentId: integer('parent_id'),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  postIdx: index('comments_post_idx').on(t.postId, t.createdAt),
  authorIdx: index('comments_author_idx').on(t.authorId),
  parentIdx: index('comments_parent_idx').on(t.parentId),
}));`,
  },

  {
    id: 'notification-bell-component',
    title: 'Notification Bell with Dropdown',
    description: 'Notification bell icon with unread count badge and dropdown panel for viewing and managing notifications.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['notification', 'component', 'dropdown', 'realtime'],
    code: `interface Notification {
  id: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = await res.json();
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAsRead(id: number) {
    await fetch(\`/api/notifications/\${id}/read\`, { method: 'PATCH', credentials: 'include' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button onClick={() => setIsOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-medium text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              notifications.map(n => (
                <div key={n.id}
                  className={\`flex gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer border-b last:border-0 \${
                    !n.readAt ? 'bg-primary/5' : ''
                  }\`}
                  onClick={() => { if (!n.readAt) markAsRead(n.id); if (n.link) window.location.href = n.link; }}>
                  <div className="flex-1 min-w-0">
                    <p className={\`text-sm \${!n.readAt ? 'font-medium' : ''}\`}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <time className="text-xs text-muted-foreground mt-1 block">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  {!n.readAt && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}`,
  },

  {
    id: 'react-confirmation-dialog',
    title: 'Confirmation Dialog Component',
    description: 'Reusable confirmation dialog for destructive actions (delete, archive, etc.) with customizable title, description, and button labels.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['dialog', 'modal', 'component', 'confirmation'],
    code: `interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
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
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsPending(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loading = isLoading || isPending;

  const confirmStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-muted disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className={\`px-4 py-2 text-sm rounded-lg disabled:opacity-50 \${confirmStyles[variant]}\`}>
            {loading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for easy usage
function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  function confirm(options: Omit<typeof state, 'isOpen'>): Promise<boolean> {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        onConfirm: async () => {
          await options.onConfirm();
          resolve(true);
        },
      });
    });
  }

  const dialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={() => setState(s => ({ ...s, isOpen: false }))}
      onConfirm={state.onConfirm}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
    />
  );

  return { confirm, dialog };
}

// Usage:
// const { confirm, dialog } = useConfirmDialog();
// async function handleDelete() {
//   await confirm({
//     title: 'Delete Project?',
//     description: 'This action cannot be undone. All tasks will be permanently deleted.',
//     confirmLabel: 'Delete',
//     variant: 'danger',
//     onConfirm: () => deleteProject(projectId),
//   });
// }
// return <>{dialog}</>`,
  },

  {
    id: 'infinite-scroll-hook',
    title: 'Infinite Scroll Hook with Intersection Observer',
    description: 'Custom hook for infinite scroll using IntersectionObserver and TanStack Query.',
    tech: ['react', 'typescript'],
    tags: ['infinite-scroll', 'hook', 'pagination', 'performance'],
    code: `function useInfiniteScroll(callback: () => void, hasMore: boolean) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!hasMore) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, { rootMargin: '200px' });

    if (node) observerRef.current.observe(node);
  }, [callback, hasMore]);

  return lastElementRef;
}

// Usage with TanStack Query:
function InfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      const res = await fetch(\`/api/items?\${params}\`, { credentials: 'include' });
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  const loadMoreRef = useInfiniteScroll(
    () => { if (!isFetchingNextPage) fetchNextPage(); },
    !!hasNextPage,
  );

  const allItems = data?.pages.flatMap(p => p.data) ?? [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      {allItems.map((item, i) => (
        <div key={item.id} ref={i === allItems.length - 1 ? loadMoreRef : undefined}
          className="p-4 border rounded-lg">
          {item.title}
        </div>
      ))}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {!hasNextPage && allItems.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">No more items</p>
      )}
    </div>
  );
}`,
  },
];

// ============================================
// EXPANDED ANTI-PATTERNS — PART 8
// ============================================

export const EXPANDED_ANTI_PATTERNS_8: AntiPattern[] = [
  {
    id: 'no-loading-states',
    name: 'Missing Loading & Error States',
    description: 'Rendering components without handling loading, error, and empty states — users see blank screens or raw errors.',
    whyBad: 'Users have no feedback that something is happening. If an API call fails, the UI shows nothing or crashes. Empty states without guidance leave users confused about what to do next.',
    fix: 'Every data-fetching component must handle 4 states: loading (skeleton/spinner), error (message + retry button), empty (helpful message + call-to-action), and success (actual content). Use React Query isLoading/isError/data pattern.',
    severity: 'high',
    badExample: 'function Tasks() { const { data } = useQuery(...); return data.map(t => <Task key={t.id} task={t} />); } // Crashes when data is undefined',
    goodExample: 'function Tasks() { const { data, isLoading, error } = useQuery(...); if (isLoading) return <Skeleton />; if (error) return <ErrorState retry={refetch} />; if (!data?.length) return <EmptyState />; return data.map(...); }',
    tags: ['ux', 'react', 'frontend'],
  },
  {
    id: 'god-component',
    name: 'God Component (1000+ Lines)',
    description: 'A single React component file with 1000+ lines doing everything: data fetching, business logic, and rendering.',
    whyBad: 'Impossible to test, debug, or modify without breaking other parts. Multiple developers cannot work on it simultaneously. Causes unnecessary re-renders because all state is in one place.',
    fix: 'Split into smaller components with single responsibility. Extract hooks for data fetching (useTaskList), logic (useTaskActions), and shared UI (TaskCard, TaskFilters). Each file should be < 300 lines.',
    severity: 'high',
    badExample: '// TaskBoard.tsx — 1200 lines with fetch, filter, sort, drag-drop, modals, forms, validation',
    goodExample: '// TaskBoard.tsx (50 lines) uses useTaskBoard hook, <TaskColumn>, <TaskCard>, <CreateTaskDialog>, <TaskFilters>',
    tags: ['react', 'architecture', 'maintainability'],
  },
  {
    id: 'unvalidated-api-input',
    name: 'No Server-Side Input Validation',
    description: 'Trusting that frontend form validation is sufficient and not validating inputs on the server.',
    whyBad: 'Attackers bypass frontend validation trivially (curl, Postman, browser devtools). Without server validation: SQL injection, XSS, type errors, business rule violations, and data corruption.',
    fix: 'Always validate ALL inputs on the server using Zod schemas. Validate at the API boundary (controller/route handler). Frontend validation is UX convenience only, never security.',
    severity: 'critical',
    badExample: 'app.post("/api/tasks", async (req, res) => { await db.insert(tasks).values(req.body); });',
    goodExample: 'const schema = z.object({ title: z.string().min(1).max(200), status: z.enum(["todo","in-progress","done"]) }); app.post("/api/tasks", async (req, res) => { const data = schema.parse(req.body); await db.insert(tasks).values(data); });',
    tags: ['security', 'validation', 'api'],
  },
  {
    id: 'client-side-auth',
    name: 'Client-Side Only Authorization',
    description: 'Checking permissions only in the React frontend (hiding buttons, conditional rendering) without server-side enforcement.',
    whyBad: 'Anyone can call your API directly with curl or Postman, bypassing all frontend permission checks. Hiding a "Delete" button does NOT prevent the delete from happening.',
    fix: 'Always enforce authorization on the server. Check user permissions in EVERY API route handler or middleware. Frontend permission checks are only for UI convenience (hiding buttons the user cannot use).',
    severity: 'critical',
    badExample: '{user.role === "admin" && <button onClick={deleteUser}>Delete</button>} // No server check!',
    goodExample: 'Server: requireRole("admin") middleware on DELETE /api/users/:id. Frontend: conditionally show button as UX hint.',
    tags: ['security', 'authorization', 'frontend'],
  },
];

// ============================================
// EXPANDED BEST PRACTICES — PART 8
// ============================================

export const EXPANDED_BEST_PRACTICES_8: BestPractice[] = [
  {
    id: 'component-composition',
    title: 'Component Composition Patterns',
    category: 'react',
    description: 'Build flexible, reusable components using composition over prop drilling.',
    do: [
      'Use children prop for layout components: <Card><Card.Header>Title</Card.Header><Card.Body>Content</Card.Body></Card>',
      'Use render props or slots for customizable sections: <DataTable renderRow={(item) => ...} />',
      'Create compound components for complex UI: <Select><Select.Option value="a">A</Select.Option></Select>',
      'Use React.cloneElement or context for implicit state sharing in compound components',
      'Keep components small (< 200 lines) with single responsibility',
      'Extract custom hooks for reusable logic: useDebounce, usePagination, useLocalStorage',
      'Use forwardRef for components that need to expose DOM refs',
    ],
    dont: [
      'Pass 15+ props to a single component (break it up or use composition)',
      'Use prop drilling more than 2 levels deep (use context or state management)',
      'Create wrapper components that just pass all props through unchanged',
      'Mix data fetching and rendering in the same component (separate concerns)',
    ],
    languages: ['typescript'],
  },
  {
    id: 'database-best-practices',
    title: 'Database Schema Design',
    category: 'database',
    description: 'Design database schemas that are performant, maintainable, and correct.',
    do: [
      'Always add createdAt and updatedAt timestamps to every table',
      'Use serial IDs internally, UUIDs/slugs in URLs',
      'Add indexes for all foreign key columns',
      'Add composite indexes for common multi-column queries',
      'Use varchar with length limits instead of unbounded text where appropriate',
      'Use enums via varchar + CHECK or application-level validation (not PostgreSQL ENUM type — hard to modify)',
      'Add NOT NULL constraints by default, make nullable only when truly optional',
      'Use database-level unique constraints, not just application-level checks',
      'Add ON DELETE CASCADE for child records (comments when post deleted)',
      'Use transactions for multi-table writes that must be atomic',
    ],
    dont: [
      'Store JSON blobs when structured columns would work (lose query ability)',
      'Use PostgreSQL ENUM type (impossible to remove values, hard to add)',
      'Skip indexes on foreign keys (causes slow JOINs on large tables)',
      'Use boolean columns for status (creates binary lock-in: add pending/archived later)',
      'Store money as float (use integer cents or NUMERIC/DECIMAL)',
    ],
    languages: ['typescript', 'sql'],
  },
  {
    id: 'accessibility-basics',
    title: 'Web Accessibility Basics (a11y)',
    category: 'ux',
    description: 'Make your web application usable by everyone including keyboard and screen reader users.',
    do: [
      'Use semantic HTML elements: <button> for actions, <a> for links, <nav> for navigation, <main> for content',
      'Add alt text to all images (decorative images: alt="")',
      'Ensure all interactive elements are keyboard accessible (Tab, Enter, Escape, Arrow keys)',
      'Use visible focus indicators (:focus-visible ring) — never outline: none without replacement',
      'Maintain 4.5:1 contrast ratio for text, 3:1 for large text',
      'Use aria-label for icon-only buttons: <button aria-label="Close dialog">X</button>',
      'Use role="alert" for toast/error messages so screen readers announce them',
      'Add aria-expanded for toggleable elements (dropdowns, accordions)',
      'Use prefers-reduced-motion to disable animations for users who request it',
      'Test with keyboard only: can you reach and use every feature?',
    ],
    dont: [
      'Use <div onClick> instead of <button> (not keyboard accessible, no semantics)',
      'Remove focus outlines without replacement (outline: none)',
      'Use color alone to convey information (colorblind users cannot distinguish)',
      'Auto-play video with sound',
      'Use placeholder text as the only label for form inputs',
    ],
    languages: ['typescript', 'html', 'css'],
  },
  {
    id: 'performance-optimization',
    title: 'Frontend Performance Optimization',
    category: 'performance',
    description: 'Optimize React app performance for fast load times and smooth interactions.',
    do: [
      'Code-split routes with React.lazy() and Suspense',
      'Use React.memo for expensive components that receive the same props frequently',
      'Use useMemo for expensive computations (sorting, filtering large lists)',
      'Use useCallback for event handlers passed to memoized children',
      'Virtualize long lists (>100 items) with react-virtual or react-window',
      'Compress and resize images — use WebP format and srcset for responsive images',
      'Debounce search inputs (300ms) and resize/scroll handlers',
      'Use skeleton loading states instead of spinners (reduces perceived latency)',
      'Prefetch data for likely next pages (React Query prefetchQuery)',
      'Keep bundle size under 200KB gzipped for initial load',
    ],
    dont: [
      'Optimize prematurely — profile first, optimize what is actually slow',
      'Use React.memo on every component (adds overhead if props change frequently)',
      'Render 1000+ DOM nodes in a list without virtualization',
      'Import entire libraries: import _ from "lodash" (use import debounce from "lodash/debounce")',
      'Store derived state (filteredItems) separately — compute with useMemo instead',
    ],
    languages: ['typescript'],
  },
];

// ============================================
// ADDITIONAL DOMAIN MODELS — PART 8b
// ============================================

export const EXPANDED_DOMAIN_MODELS_8b: Record<string, DomainModel> = {
  'social-platform': {
    id: 'social-platform',
    name: 'Social Platform / Community',
    description: 'Social networking platform with profiles, posts, followers, comments, and feeds.',
    coreEntities: ['user_profile', 'post', 'comment', 'follow'],
    optionalEntities: ['like', 'share', 'hashtag', 'direct_message', 'report', 'block', 'notification'],
    keyRelationships: [
      'user_profile extends user with bio, avatar, and social links',
      'post belongs to user, has content, media, and visibility',
      'follow links follower to followee (directional)',
      'comment belongs to post and user, supports threading',
      'like is polymorphic (post or comment)',
      'direct_message links sender to receiver with encryption',
    ],
    typicalFeatures: [
      'User profiles with bio, avatar, cover photo, and social links',
      'Post creation with text, images, videos, and links',
      'News feed with posts from followed users',
      'Like/react to posts and comments',
      'Threaded comments on posts',
      'Follow/unfollow users',
      'Direct messaging between users',
      'Hashtag discovery and trending topics',
      'Search for users and posts',
      'Content moderation and reporting',
      'Notification system for interactions',
      'Share/repost functionality',
      'User blocking and muting',
      'Profile privacy settings (public/private)',
      'Post analytics (views, engagement)',
    ],
    securityConsiderations: [
      'Content moderation pipeline (automated + manual)',
      'Rate limiting on post creation and messaging',
      'Privacy controls — who can see/message/follow',
      'Report and block system',
      'Media validation and virus scanning',
      'GDPR data export and deletion',
    ],
    suggestedIndexStrategy: [
      'posts: (userId, createdAt DESC)',
      'posts: (visibility, createdAt DESC) for feed',
      'follows: (followerId, followeeId) unique',
      'follows: (followeeId) for follower count',
      'comments: (postId, createdAt)',
      'likes: (userId, targetType, targetId) unique',
      'direct_messages: (senderId, receiverId, createdAt)',
      'hashtags: (name) unique with post count',
    ],
  },

  'learning-management': {
    id: 'learning-management',
    name: 'Learning Management System (LMS)',
    description: 'Online course platform with courses, lessons, quizzes, progress tracking, and certificates.',
    coreEntities: ['course', 'lesson', 'enrollment', 'user'],
    optionalEntities: ['quiz', 'quiz_attempt', 'progress', 'certificate', 'review', 'category', 'instructor_profile'],
    keyRelationships: [
      'course has many lessons in order',
      'enrollment links user to course with status',
      'progress tracks user completion per lesson',
      'quiz belongs to lesson with questions',
      'quiz_attempt records user answers and score',
      'certificate issued on course completion',
    ],
    typicalFeatures: [
      'Course catalog with categories and search',
      'Course detail page with curriculum, reviews, and pricing',
      'Video lessons with progress tracking',
      'Text/article lessons with markdown',
      'Quizzes with multiple choice, true/false, and free text',
      'Progress tracking (percent complete, last accessed)',
      'Course completion certificates (PDF generation)',
      'Instructor dashboard with analytics',
      'Student dashboard with enrolled courses',
      'Discussion forums per course',
      'Course reviews and ratings',
      'Prerequisite course requirements',
      'Free trial / preview lessons',
      'Payment integration for paid courses',
      'Bulk enrollment for organizations',
    ],
    securityConsiderations: [
      'Content access control (only enrolled users)',
      'Anti-cheating measures for quizzes',
      'Instructor verification',
      'Payment and refund handling',
      'Copyright protection for course materials',
    ],
    suggestedIndexStrategy: [
      'courses: (categoryId, status, createdAt DESC)',
      'courses: (instructorId)',
      'lessons: (courseId, sortOrder)',
      'enrollments: (userId, courseId) unique',
      'enrollments: (courseId, status)',
      'progress: (enrollmentId, lessonId) unique',
      'quiz_attempts: (userId, quizId, createdAt DESC)',
    ],
  },

  'project-management-tool': {
    id: 'project-management-tool',
    name: 'Project Management Tool',
    description: 'Kanban/agile project management with boards, tasks, sprints, and team collaboration.',
    coreEntities: ['project', 'task', 'column', 'user', 'team_member'],
    optionalEntities: ['sprint', 'label', 'comment', 'attachment', 'time_entry', 'milestone', 'template'],
    keyRelationships: [
      'project has many columns (board structure)',
      'task belongs to column and project',
      'task can be assigned to team member(s)',
      'task has labels, comments, attachments',
      'sprint groups tasks for time-boxed iteration',
      'time_entry logs work hours per task',
    ],
    typicalFeatures: [
      'Kanban board with drag-and-drop columns',
      'Task creation with title, description, priority, due date',
      'Task assignment and mentions',
      'Labels/tags for categorization',
      'Subtasks and checklists',
      'Sprint planning and backlog management',
      'Time tracking per task',
      'File attachments on tasks',
      'Threaded comments and activity feed',
      'Milestone tracking',
      'Calendar view of tasks by due date',
      'List view with sorting and filtering',
      'Team workload overview',
      'Notification system for updates',
      'Project templates for quick setup',
      'Keyboard shortcuts for power users',
      'CSV/PDF export of tasks',
      'Integrations (Slack, GitHub, email)',
    ],
    securityConsiderations: [
      'Project-level access control (owner, admin, member, viewer)',
      'Audit log for task changes',
      'Data isolation between projects/organizations',
      'Rate limiting on API endpoints',
    ],
    suggestedIndexStrategy: [
      'tasks: (projectId, columnId, sortOrder)',
      'tasks: (assigneeId, status)',
      'tasks: (projectId, status, dueDate)',
      'comments: (taskId, createdAt)',
      'team_members: (projectId, userId) unique',
      'labels: (projectId, name)',
      'time_entries: (taskId, userId, date)',
      'sprints: (projectId, status)',
    ],
  },
};

// ============================================
// ADDITIONAL CODE SNIPPETS — PART 8b
// More reusable patterns for common app features
// ============================================

export const EXPANDED_CODE_SNIPPETS_8b: CodeSnippet[] = [

  {
    id: 'drizzle-schema-saas-billing',
    title: 'Drizzle Schema: SaaS Billing (Subscriptions, Plans, Invoices)',
    description: 'Schema for a SaaS billing system with plans, subscriptions, invoices, and payment methods.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'saas', 'billing', 'subscription'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  monthlyPrice: integer('monthly_price').notNull(),
  yearlyPrice: integer('yearly_price').notNull(),
  features: jsonb('features').notNull().default('[]'),
  limits: jsonb('limits').notNull().default('{}'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  stripePriceIdMonthly: varchar('stripe_price_id_monthly', { length: 100 }),
  stripePriceIdYearly: varchar('stripe_price_id_yearly', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  planId: integer('plan_id').notNull().references(() => plans.id),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  billingCycle: varchar('billing_cycle', { length: 10 }).notNull().default('monthly'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialEndDate: timestamp('trial_end_date', { withTimezone: true }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('subscriptions_user_idx').on(t.userId),
  statusIdx: index('subscriptions_status_idx').on(t.status),
  stripeSubIdx: index('subscriptions_stripe_sub_idx').on(t.stripeSubscriptionId),
}));

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amountDue: integer('amount_due').notNull(),
  amountPaid: integer('amount_paid').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 100 }),
  pdfUrl: text('pdf_url'),
  lineItems: jsonb('line_items').notNull().default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('invoices_user_idx').on(t.userId, t.createdAt),
  statusIdx: index('invoices_status_idx').on(t.status),
}));

export const usageLimits = pgTable('usage_limits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  featureKey: varchar('feature_key', { length: 50 }).notNull(),
  currentUsage: integer('current_usage').notNull().default(0),
  maxUsage: integer('max_usage').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userFeatureIdx: uniqueIndex('usage_limits_user_feature_idx').on(t.userId, t.featureKey),
}));`,
  },

  {
    id: 'drizzle-schema-inventory',
    title: 'Drizzle Schema: Inventory Management (Products, Stock, Movements)',
    description: 'Schema for inventory tracking with products, warehouses, stock levels, and movement history.',
    tech: ['drizzle', 'typescript', 'postgresql'],
    tags: ['database', 'schema', 'inventory', 'warehouse'],
    code: `import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  address: text('address'),
  contactPerson: varchar('contact_person', { length: 150 }),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 50 }).notNull().unique(),
  barcode: varchar('barcode', { length: 50 }),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => productCategories.id),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  costPrice: integer('cost_price'),
  sellingPrice: integer('selling_price'),
  unit: varchar('unit', { length: 20 }).notNull().default('pcs'),
  minStockLevel: integer('min_stock_level').notNull().default(0),
  maxStockLevel: integer('max_stock_level'),
  weight: numeric('weight', { precision: 10, scale: 3 }),
  dimensions: varchar('dimensions', { length: 50 }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index('products_category_idx').on(t.categoryId),
  supplierIdx: index('products_supplier_idx').on(t.supplierId),
  barcodeIdx: index('products_barcode_idx').on(t.barcode),
}));

export const stockLevels = pgTable('stock_levels', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productWarehouseIdx: uniqueIndex('stock_levels_product_warehouse_idx').on(t.productId, t.warehouseId),
  lowStockIdx: index('stock_levels_low_stock_idx').on(t.quantity),
}));

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  type: varchar('type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  reason: varchar('reason', { length: 200 }),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: integer('reference_id'),
  performedBy: integer('performed_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productIdx: index('stock_movements_product_idx').on(t.productId, t.createdAt),
  warehouseIdx: index('stock_movements_warehouse_idx').on(t.warehouseId, t.createdAt),
  typeIdx: index('stock_movements_type_idx').on(t.type, t.createdAt),
}));

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  totalAmount: integer('total_amount').notNull().default(0),
  notes: text('notes'),
  expectedDelivery: timestamp('expected_delivery', { withTimezone: true }),
  orderedAt: timestamp('ordered_at', { withTimezone: true }),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  supplierIdx: index('purchase_orders_supplier_idx').on(t.supplierId),
  statusIdx: index('purchase_orders_status_idx').on(t.status, t.createdAt),
}));

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchaseOrderId: integer('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  receivedQuantity: integer('received_quantity').notNull().default(0),
}, (t) => ({
  orderIdx: index('purchase_order_items_order_idx').on(t.purchaseOrderId),
}));`,
  },

  {
    id: 'modal-dialog-component',
    title: 'Reusable Modal/Dialog Component',
    description: 'Accessible modal dialog with focus trapping, backdrop click, and escape key support.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['modal', 'dialog', 'component', 'a11y'],
    code: `interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

function Modal({ isOpen, onClose, title, description, children, size = 'md', showCloseButton = true }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div ref={modalRef} className={\`relative bg-white rounded-2xl shadow-xl w-full \${sizeClasses[size]} max-h-[90vh] flex flex-col animate-in zoom-in-95 fade-in duration-200\`}>
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div>
              {title && <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {showCloseButton && (
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors -mt-1 -mr-1" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// Usage:
// const [isOpen, setIsOpen] = useState(false);
// <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Task">
//   <TaskForm onSubmit={handleCreate} />
// </Modal>`,
  },

  {
    id: 'tabs-component',
    title: 'Tabs Component with Keyboard Navigation',
    description: 'Accessible tab component with keyboard arrow navigation and ARIA roles.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['tabs', 'component', 'navigation', 'a11y'],
    code: `interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'enclosed';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

function Tabs({ tabs, activeTab, onChange, variant = 'underline', size = 'md', children }: TabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent, currentIndex: number) {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(t => t.id === tabs[currentIndex].id);
    let nextIndex: number;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
        onChange(enabledTabs[nextIndex].id);
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (currentEnabledIndex + 1) % enabledTabs.length;
        onChange(enabledTabs[nextIndex].id);
        break;
      case 'Home':
        e.preventDefault();
        onChange(enabledTabs[0].id);
        break;
      case 'End':
        e.preventDefault();
        onChange(enabledTabs[enabledTabs.length - 1].id);
        break;
    }
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-3 py-1.5 gap-1'
    : 'text-sm px-4 py-2 gap-1.5';

  const variantClasses = {
    underline: {
      list: 'border-b',
      tab: (active: boolean) => \`border-b-2 -mb-px \${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'}\`,
    },
    pills: {
      list: 'gap-1 bg-muted/50 p-1 rounded-lg',
      tab: (active: boolean) => \`rounded-md \${active ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}\`,
    },
    enclosed: {
      list: 'border-b',
      tab: (active: boolean) => \`border border-b-0 rounded-t-lg -mb-px \${active ? 'bg-white border-border text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`,
    },
  };

  return (
    <div>
      <div ref={tabListRef} role="tablist" className={\`flex \${variantClasses[variant].list}\`}>
        {tabs.map((tab, i) => (
          <button key={tab.id} role="tab" id={\`tab-\${tab.id}\`}
            aria-selected={activeTab === tab.id}
            aria-controls={\`panel-\${tab.id}\`}
            aria-disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={\`flex items-center font-medium transition-all whitespace-nowrap \${sizeClasses} \${
              variantClasses[variant].tab(activeTab === tab.id)
            } \${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}\`}>
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={\`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold \${
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }\`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={\`panel-\${activeTab}\`} aria-labelledby={\`tab-\${activeTab}\`} className="pt-4">
        {children}
      </div>
    </div>
  );
}

// Usage:
// const [tab, setTab] = useState('overview');
// <Tabs tabs={[
//   { id: 'overview', label: 'Overview' },
//   { id: 'tasks', label: 'Tasks', count: 12 },
//   { id: 'members', label: 'Members', count: 5 },
//   { id: 'settings', label: 'Settings' },
// ]} activeTab={tab} onChange={setTab}>
//   {tab === 'overview' && <OverviewPanel />}
//   {tab === 'tasks' && <TasksPanel />}
//   ...
// </Tabs>`,
  },

  {
    id: 'avatar-component',
    title: 'Avatar Component with Initials Fallback',
    description: 'User avatar component that shows an image or falls back to initials with a consistent background color.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['avatar', 'component', 'user', 'profile'],
    code: `interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const showImage = src && !imgError;

  return (
    <div className={\`rounded-full overflow-hidden flex items-center justify-center shrink-0 \${sizeClasses[size]} \${
      showImage ? '' : \`\${getColorFromName(name)} text-white font-bold\`
    } \${className}\`}
      title={name}>
      {showImage ? (
        <img src={src} alt={name} className="w-full h-full object-cover"
          onError={() => setImgError(true)} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

// Avatar group for showing multiple users
function AvatarGroup({ users, max = 3, size = 'sm' }: {
  users: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: AvatarProps['size'];
}) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={i} src={u.avatarUrl} name={u.name} size={size}
          className="ring-2 ring-white" />
      ))}
      {remaining > 0 && (
        <div className={\`rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-white \${
          size === 'xs' ? 'w-6 h-6 text-[10px]' :
          size === 'sm' ? 'w-8 h-8 text-xs' :
          'w-10 h-10 text-sm'
        }\`}>
          +{remaining}
        </div>
      )}
    </div>
  );
}`,
  },

  {
    id: 'empty-state-component',
    title: 'Empty State Component',
    description: 'Reusable empty state component for when lists have no data, with illustration and call-to-action.',
    tech: ['react', 'typescript', 'tailwind'],
    tags: ['empty-state', 'component', 'ux'],
    code: `interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={\`flex flex-col items-center justify-center py-12 px-4 text-center \${className}\`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}

// Usage:
// <EmptyState
//   icon={<FolderIcon className="w-8 h-8" />}
//   title="No projects yet"
//   description="Create your first project to get started with task management."
//   action={{ label: 'Create Project', onClick: () => setShowCreateModal(true) }}
// />`,
  },
];
