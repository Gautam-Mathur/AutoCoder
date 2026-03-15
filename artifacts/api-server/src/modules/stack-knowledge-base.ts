import type { Concept, CodeSnippet, BestPractice, AntiPattern } from './knowledge-base.js';

// ════════════════════════════════════════════════════════════════════════════
// STACK KNOWLEDGE BASE
// Production-grade patterns, snippets, best practices and anti-patterns
// for 5 major full-stack technology stacks:
//   1. MERN  (MongoDB + Express + React + Node.js/TypeScript)
//   2. Django (Python + Django REST Framework + PostgreSQL + Celery + Redis)
//   3. Spring Boot (Java + Hibernate + Angular/React + Maven/Gradle)
//   4. .NET  (C# + ASP.NET Core + EF Core + SQL Server)
//   5. Go + React (Go + Gin/Fiber + PostgreSQL + Redis + gRPC)
// ════════════════════════════════════════════════════════════════════════════


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1 — MERN STACK                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── MERN Concepts ──────────────────────────────────────────────────────────

export const STACK_CONCEPTS: Record<string, Concept> = {

  'mern-stack': {
    id: 'mern-stack',
    name: 'MERN Stack',
    description: 'Full-stack JavaScript/TypeScript stack using MongoDB, Express.js, React, and Node.js.',
    explanation: 'MERN is one of the most popular full-stack combos for startups and rapid prototyping. MongoDB provides flexible document storage, Express handles HTTP routing, React powers the UI, and Node.js runs server-side JS. The entire stack uses one language (JavaScript/TypeScript), reducing context switching.',
    category: 'architecture',
    examples: [
      'npx create-react-app client --template typescript && mkdir server && cd server && npm init -y && npm i express mongoose dotenv',
      'const app = express(); app.use(cors()); app.use(express.json()); app.use("/api/users", userRoutes); app.listen(PORT);',
    ],
    relatedConcepts: ['rest-api', 'document-database', 'spa'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  'mongoose-odm': {
    id: 'mongoose-odm',
    name: 'Mongoose ODM',
    description: 'Object Document Mapper for MongoDB in Node.js, providing schema validation, middleware, and query building.',
    explanation: 'Mongoose wraps the MongoDB driver with schemas, models, middleware (pre/post hooks), virtuals, and population (join-like references). Define a schema once and get validation, type coercion, and query helpers automatically. Use lean() for read-only queries to skip hydration overhead.',
    category: 'database',
    examples: [
      'const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, unique: true } }); const User = model("User", userSchema);',
      'const users = await User.find({ age: { $gte: 18 } }).lean();',
    ],
    relatedConcepts: ['mongodb', 'document-database', 'orm'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  'express-middleware': {
    id: 'express-middleware',
    name: 'Express Middleware Pipeline',
    description: 'Chain of functions that process HTTP requests and responses in order in Express.js.',
    explanation: 'Express middleware are functions with (req, res, next) signatures. They execute in order: logging → parsing → auth → route handler → error handler. Each middleware can modify req/res, end the response, or call next(). Error middleware has four params: (err, req, res, next). Always place error middleware last.',
    category: 'architecture',
    examples: [
      'app.use(cors()); app.use(express.json()); app.use(authMiddleware); app.use("/api", routes); app.use(errorHandler);',
      'function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) { console.error(err); res.status(500).json({ error: err.message }); }',
    ],
    relatedConcepts: ['rest-api', 'authentication', 'error-handling'],
    difficulty: 'beginner',
    languages: ['typescript', 'javascript'],
  },

  'react-query-pattern': {
    id: 'react-query-pattern',
    name: 'React Query / TanStack Query',
    description: 'Server-state management library that handles caching, background refetching, pagination, and optimistic updates.',
    explanation: 'React Query separates server state from client state. useQuery handles GET requests with automatic caching, stale-while-revalidate, and retry logic. useMutation handles POST/PUT/DELETE with onSuccess invalidation. queryClient.invalidateQueries triggers refetch after mutations. Eliminates most Redux boilerplate for API data.',
    category: 'react',
    examples: [
      'const { data, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: () => fetch("/api/users").then(r => r.json()) });',
      'const mutation = useMutation({ mutationFn: createUser, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }) });',
    ],
    relatedConcepts: ['react-hooks', 'caching', 'optimistic-updates'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  'mongodb-aggregation': {
    id: 'mongodb-aggregation',
    name: 'MongoDB Aggregation Pipeline',
    description: 'Multi-stage data processing pipeline for complex queries, transformations, and analytics in MongoDB.',
    explanation: 'Aggregation pipelines pass documents through stages: $match (filter), $group (aggregate), $project (reshape), $sort, $lookup (join), $unwind (flatten arrays), $facet (parallel pipelines). Each stage transforms the document stream. Use $match early to reduce documents processed by later stages.',
    category: 'database',
    examples: [
      'db.orders.aggregate([ { $match: { status: "completed" } }, { $group: { _id: "$customerId", total: { $sum: "$amount" } } }, { $sort: { total: -1 } } ]);',
      'db.products.aggregate([ { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "category" } }, { $unwind: "$category" } ]);',
    ],
    relatedConcepts: ['mongodb', 'data-pipeline', 'analytics'],
    difficulty: 'advanced',
    languages: ['typescript', 'javascript'],
  },

  'jwt-auth-mern': {
    id: 'jwt-auth-mern',
    name: 'JWT Authentication in MERN',
    description: 'JSON Web Token based authentication flow for MERN stack applications.',
    explanation: 'Login endpoint verifies credentials and returns a signed JWT (access token + optional refresh token). Client stores tokens in httpOnly cookies (preferred) or memory (never localStorage for auth tokens). Protected routes use middleware that verifies the JWT signature and extracts the user. Refresh tokens enable silent re-authentication.',
    category: 'security',
    examples: [
      'const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "15m" });',
      'function authMiddleware(req, res, next) { const token = req.cookies.accessToken; if (!token) return res.status(401).json({ error: "Not authenticated" }); try { req.user = jwt.verify(token, process.env.JWT_SECRET!); next(); } catch { res.status(401).json({ error: "Invalid token" }); } }',
    ],
    relatedConcepts: ['authentication', 'authorization', 'cookies'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  'redux-toolkit': {
    id: 'redux-toolkit',
    name: 'Redux Toolkit',
    description: 'Official, opinionated Redux toolset that simplifies store setup, reducers, and async logic.',
    explanation: 'Redux Toolkit (RTK) eliminates Redux boilerplate: configureStore sets up middleware and devtools, createSlice generates action creators and reducers from a single object, createAsyncThunk handles async operations with pending/fulfilled/rejected states. RTK Query (built-in) handles API caching similar to React Query.',
    category: 'react',
    examples: [
      'const userSlice = createSlice({ name: "users", initialState: { list: [], loading: false }, reducers: { setUsers: (state, action) => { state.list = action.payload; } } });',
      'const fetchUsers = createAsyncThunk("users/fetch", async () => { const res = await fetch("/api/users"); return res.json(); });',
    ],
    relatedConcepts: ['state-management', 'react-hooks', 'flux-pattern'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  // ── Django Concepts ──────────────────────────────────────────────────────

  'django-stack': {
    id: 'django-stack',
    name: 'Django Stack',
    description: 'Full-stack Python web framework with batteries included: ORM, admin, auth, forms, and REST framework.',
    explanation: 'Django follows the "batteries included" philosophy. The ORM maps Python classes to database tables. The admin site auto-generates CRUD interfaces. Django REST Framework (DRF) adds serialization, viewsets, and API browsability. Celery handles background tasks. The MTV pattern (Model-Template-View) separates concerns. Migrations are auto-generated from model changes.',
    category: 'architecture',
    examples: [
      'django-admin startproject myproject && cd myproject && python manage.py startapp api',
      'class Article(models.Model): title = models.CharField(max_length=200); body = models.TextField(); author = models.ForeignKey(User, on_delete=models.CASCADE)',
    ],
    relatedConcepts: ['orm', 'rest-api', 'mvc-pattern'],
    difficulty: 'intermediate',
    languages: ['python'],
  },

  'drf-serializers': {
    id: 'drf-serializers',
    name: 'Django REST Framework Serializers',
    description: 'DRF serializers convert complex data types (querysets, model instances) to native Python datatypes for JSON rendering.',
    explanation: 'ModelSerializer auto-generates fields from a Django model. Serializers validate incoming data, handle nested relationships, and support custom create/update logic. Use SerializerMethodField for computed fields. Use depth for auto-nesting (but prefer explicit nested serializers for control). Always validate in the serializer, not in the view.',
    category: 'architecture',
    examples: [
      'class ArticleSerializer(serializers.ModelSerializer): class Meta: model = Article; fields = ["id", "title", "body", "author", "created_at"]',
      'class ArticleSerializer(serializers.ModelSerializer): author_name = serializers.SerializerMethodField(); def get_author_name(self, obj): return obj.author.get_full_name()',
    ],
    relatedConcepts: ['validation', 'data-transfer-objects', 'rest-api'],
    difficulty: 'intermediate',
    languages: ['python'],
  },

  'celery-tasks': {
    id: 'celery-tasks',
    name: 'Celery Task Queue',
    description: 'Distributed task queue for Python that enables asynchronous background processing with Redis or RabbitMQ as broker.',
    explanation: 'Celery offloads time-consuming tasks (email sending, report generation, image processing) to background workers. Tasks are defined as decorated functions, queued via .delay() or .apply_async(), and processed by worker processes. Use task idempotency, retries with exponential backoff, and result backends for tracking completion.',
    category: 'architecture',
    examples: [
      '@shared_task(bind=True, max_retries=3) def send_email(self, user_id, template): try: user = User.objects.get(id=user_id); send_mail(...) except Exception as exc: raise self.retry(exc=exc, countdown=60)',
      'send_email.delay(user.id, "welcome") # Queue the task',
    ],
    relatedConcepts: ['message-queue', 'background-jobs', 'async'],
    difficulty: 'intermediate',
    languages: ['python'],
  },

  'django-orm-optimization': {
    id: 'django-orm-optimization',
    name: 'Django ORM Query Optimization',
    description: 'Techniques for writing efficient database queries using Django ORM: select_related, prefetch_related, and annotations.',
    explanation: 'select_related does a SQL JOIN for ForeignKey/OneToOne fields (one query instead of N). prefetch_related does a separate query for ManyToMany/reverse ForeignKey (two queries instead of N+1). Use only() and defer() to fetch specific fields. Use annotate() and aggregate() for database-level computations. Use values_list(flat=True) for simple value lists.',
    category: 'performance',
    examples: [
      'articles = Article.objects.select_related("author").prefetch_related("tags").filter(published=True)[:20]',
      'stats = Order.objects.values("status").annotate(count=Count("id"), total=Sum("amount")).order_by("-count")',
    ],
    relatedConcepts: ['n-plus-one', 'database-indexing', 'query-optimization'],
    difficulty: 'intermediate',
    languages: ['python'],
  },

  // ── Spring Boot Concepts ────────────────────────────────────────────────

  'spring-boot-stack': {
    id: 'spring-boot-stack',
    name: 'Spring Boot Stack',
    description: 'Enterprise-grade Java framework with auto-configuration, dependency injection, and a rich ecosystem.',
    explanation: 'Spring Boot simplifies Spring Framework setup with auto-configuration and embedded servers. The layered architecture separates Controller (HTTP), Service (business logic), and Repository (data access). Spring Data JPA provides repository interfaces with auto-generated queries. Spring Security handles authentication and authorization. Actuator adds health checks and metrics.',
    category: 'architecture',
    examples: [
      '@SpringBootApplication public class App { public static void main(String[] args) { SpringApplication.run(App.class, args); } }',
      '@RestController @RequestMapping("/api/users") public class UserController { @Autowired private UserService userService; @GetMapping public List<UserDTO> getAll() { return userService.findAll(); } }',
    ],
    relatedConcepts: ['dependency-injection', 'orm', 'enterprise-patterns'],
    difficulty: 'intermediate',
    languages: ['java'],
  },

  'spring-data-jpa': {
    id: 'spring-data-jpa',
    name: 'Spring Data JPA',
    description: 'Repository abstraction over JPA/Hibernate that auto-generates CRUD operations and query methods from method names.',
    explanation: 'Define an interface extending JpaRepository<Entity, IdType> and Spring generates the implementation. Method names like findByEmailAndStatus() auto-generate queries. Use @Query for custom JPQL/SQL. Specifications enable dynamic queries. Pageable parameter adds pagination. Always use DTOs for API responses (never expose entities directly).',
    category: 'database',
    examples: [
      'public interface UserRepository extends JpaRepository<User, Long> { Optional<User> findByEmail(String email); List<User> findByStatusOrderByCreatedAtDesc(Status status); @Query("SELECT u FROM User u WHERE u.department.id = :deptId") List<User> findByDepartment(@Param("deptId") Long deptId); }',
      'Page<User> users = userRepository.findAll(PageRequest.of(0, 20, Sort.by("createdAt").descending()));',
    ],
    relatedConcepts: ['jpa', 'hibernate', 'repository-pattern'],
    difficulty: 'intermediate',
    languages: ['java'],
  },

  'spring-security': {
    id: 'spring-security',
    name: 'Spring Security',
    description: 'Comprehensive security framework for authentication, authorization, CSRF protection, and session management in Spring applications.',
    explanation: 'Spring Security uses a filter chain to intercept requests. Configure SecurityFilterChain to define URL access rules, authentication providers, and CORS settings. Use @PreAuthorize for method-level security. JWT authentication requires a custom filter that validates tokens and sets the SecurityContext. Always disable CSRF for stateless REST APIs.',
    category: 'security',
    examples: [
      '@Bean SecurityFilterChain filterChain(HttpSecurity http) { return http.csrf(c -> c.disable()).authorizeHttpRequests(auth -> auth.requestMatchers("/api/auth/**").permitAll().anyRequest().authenticated()).addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class).build(); }',
      '@PreAuthorize("hasRole(\'ADMIN\')") @DeleteMapping("/{id}") public void deleteUser(@PathVariable Long id) { userService.delete(id); }',
    ],
    relatedConcepts: ['authentication', 'authorization', 'jwt'],
    difficulty: 'advanced',
    languages: ['java'],
  },

  'hibernate-jpa': {
    id: 'hibernate-jpa',
    name: 'Hibernate / JPA Entity Mapping',
    description: 'Java Persistence API with Hibernate as the ORM implementation for mapping Java objects to database tables.',
    explanation: 'JPA entities use annotations: @Entity, @Table, @Id, @GeneratedValue, @Column. Relationships: @ManyToOne, @OneToMany, @ManyToMany with fetch types (LAZY vs EAGER). Always default to LAZY fetching and use JOIN FETCH in queries when you need related data. Use @EntityGraph for declarative fetch plans. Avoid bidirectional mappings unless necessary.',
    category: 'database',
    examples: [
      '@Entity @Table(name = "orders") public class Order { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id; @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "customer_id") private Customer customer; @OneToMany(mappedBy = "order", cascade = CascadeType.ALL) private List<OrderItem> items; }',
    ],
    relatedConcepts: ['orm', 'database-design', 'lazy-loading'],
    difficulty: 'intermediate',
    languages: ['java'],
  },

  // ── .NET Concepts ────────────────────────────────────────────────────────

  'dotnet-stack': {
    id: 'dotnet-stack',
    name: '.NET / ASP.NET Core Stack',
    description: 'Microsoft full-stack framework with C#, ASP.NET Core for web APIs, Entity Framework Core for data access, and Azure integration.',
    explanation: 'ASP.NET Core is a cross-platform, high-performance web framework. It uses dependency injection natively, supports both MVC controllers and Minimal APIs, and integrates deeply with Azure services. Entity Framework Core provides LINQ-based data access. The Options pattern manages configuration. Middleware pipeline handles cross-cutting concerns. SignalR adds real-time communication.',
    category: 'architecture',
    examples: [
      'var builder = WebApplication.CreateBuilder(args); builder.Services.AddControllers(); builder.Services.AddDbContext<AppDbContext>(); var app = builder.Build(); app.MapControllers(); app.Run();',
      'dotnet new webapi -n MyApi && cd MyApi && dotnet add package Microsoft.EntityFrameworkCore.SqlServer',
    ],
    relatedConcepts: ['dependency-injection', 'orm', 'middleware-pipeline'],
    difficulty: 'intermediate',
    languages: ['csharp'],
  },

  'ef-core': {
    id: 'ef-core',
    name: 'Entity Framework Core',
    description: 'Microsoft ORM for .NET that maps C# classes to database tables with LINQ query support and migrations.',
    explanation: 'EF Core uses DbContext as the unit of work and DbSet<T> as repositories. Configure entities with Fluent API or data annotations. Migrations are auto-generated from model changes (dotnet ef migrations add). Use AsNoTracking() for read-only queries. Use Include()/ThenInclude() for eager loading. Avoid loading entire tables; always filter and project with Select().',
    category: 'database',
    examples: [
      'public class AppDbContext : DbContext { public DbSet<User> Users => Set<User>(); public DbSet<Order> Orders => Set<Order>(); protected override void OnModelCreating(ModelBuilder mb) { mb.Entity<User>().HasIndex(u => u.Email).IsUnique(); } }',
      'var users = await db.Users.AsNoTracking().Where(u => u.IsActive).Select(u => new UserDto(u.Id, u.Name, u.Email)).ToListAsync();',
    ],
    relatedConcepts: ['orm', 'linq', 'migrations'],
    difficulty: 'intermediate',
    languages: ['csharp'],
  },

  'aspnet-minimal-api': {
    id: 'aspnet-minimal-api',
    name: 'ASP.NET Core Minimal APIs',
    description: 'Lightweight API endpoints in ASP.NET Core without controllers, using lambda expressions and route handlers.',
    explanation: 'Minimal APIs reduce ceremony for simple endpoints. Define routes directly on WebApplication with MapGet/MapPost/etc. Use parameter binding for route params, query strings, and JSON bodies. Add filters for validation. Group related endpoints with MapGroup(). Use TypedResults for strongly-typed responses. Best for microservices and simple APIs.',
    category: 'architecture',
    examples: [
      'app.MapGet("/api/users/{id}", async (int id, AppDbContext db) => await db.Users.FindAsync(id) is User user ? Results.Ok(user) : Results.NotFound());',
      'var group = app.MapGroup("/api/products").RequireAuthorization(); group.MapGet("/", async (AppDbContext db) => await db.Products.ToListAsync()); group.MapPost("/", async (CreateProductDto dto, AppDbContext db) => { var product = new Product(dto); db.Products.Add(product); await db.SaveChangesAsync(); return Results.Created($"/api/products/{product.Id}", product); });',
    ],
    relatedConcepts: ['rest-api', 'dependency-injection', 'lambda-expressions'],
    difficulty: 'beginner',
    languages: ['csharp'],
  },

  'dotnet-di': {
    id: 'dotnet-di',
    name: '.NET Dependency Injection',
    description: 'Built-in IoC container in ASP.NET Core for registering and resolving services with three lifetimes.',
    explanation: 'Register services in Program.cs: AddTransient (new instance per request), AddScoped (one per HTTP request), AddSingleton (one for app lifetime). Inject via constructor parameters. Use interfaces for testability. The Options pattern (IOptions<T>) injects configuration sections as strongly-typed objects. Never resolve services from the root provider in scoped contexts.',
    category: 'architecture',
    examples: [
      'builder.Services.AddScoped<IUserService, UserService>(); builder.Services.AddSingleton<ICacheService, RedisCacheService>(); builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));',
      'public class UserController(IUserService userService, ILogger<UserController> logger) : ControllerBase { [HttpGet] public async Task<IActionResult> GetAll() => Ok(await userService.GetAllAsync()); }',
    ],
    relatedConcepts: ['dependency-injection', 'inversion-of-control', 'solid'],
    difficulty: 'intermediate',
    languages: ['csharp'],
  },

  // ── Go + React Concepts ──────────────────────────────────────────────────

  'go-react-stack': {
    id: 'go-react-stack',
    name: 'Go + React Stack',
    description: 'Cloud-native stack combining Go for high-performance backend APIs with React for the frontend.',
    explanation: 'Go provides exceptional concurrency via goroutines, fast compilation, single-binary deployment, and strong typing. Gin/Fiber are the most popular HTTP frameworks. GORM or sqlx handle database access. gRPC enables efficient service-to-service communication. React serves as the SPA frontend, communicating with the Go API via REST or gRPC-Web. The stack excels at high-throughput, low-latency services.',
    category: 'architecture',
    examples: [
      'r := gin.Default(); r.GET("/api/users", getUsers); r.POST("/api/users", createUser); r.Run(":8080")',
      'go mod init myapp && go get github.com/gin-gonic/gin && go get gorm.io/gorm && go get gorm.io/driver/postgres',
    ],
    relatedConcepts: ['concurrency', 'microservices', 'grpc'],
    difficulty: 'intermediate',
    languages: ['go', 'typescript'],
  },

  'gin-framework': {
    id: 'gin-framework',
    name: 'Gin Web Framework',
    description: 'High-performance HTTP web framework for Go with a martini-like API and blazing fast routing.',
    explanation: 'Gin uses a radix tree router for fast path matching. Middleware is added with Use(). Route groups organize related endpoints. Context (c *gin.Context) provides request/response helpers: c.JSON, c.Bind, c.Param, c.Query. Use c.ShouldBindJSON for request body parsing with validation tags. Always return appropriate status codes.',
    category: 'architecture',
    examples: [
      'func getUser(c *gin.Context) { id := c.Param("id"); user, err := userService.FindByID(c.Request.Context(), id); if err != nil { c.JSON(404, gin.H{"error": "not found"}); return }; c.JSON(200, user) }',
      'v1 := r.Group("/api/v1"); v1.Use(authMiddleware()); { v1.GET("/users", listUsers); v1.POST("/users", createUser) }',
    ],
    relatedConcepts: ['rest-api', 'middleware', 'routing'],
    difficulty: 'intermediate',
    languages: ['go'],
  },

  'gorm-orm': {
    id: 'gorm-orm',
    name: 'GORM — Go ORM',
    description: 'Full-featured ORM for Go with auto-migrations, associations, hooks, and query building.',
    explanation: 'GORM maps Go structs to database tables. Use gorm.Model for common fields (ID, CreatedAt, UpdatedAt, DeletedAt). Define relationships with struct tags. Use Preload() for eager loading (avoids N+1). Use Scopes for reusable query conditions. Always use transactions for multi-step operations. Use db.Raw() for complex queries that GORM cannot express cleanly.',
    category: 'database',
    examples: [
      'type User struct { gorm.Model; Name string `gorm:"not null"`; Email string `gorm:"uniqueIndex"`; Orders []Order }',
      'var users []User; db.Preload("Orders").Where("active = ?", true).Find(&users)',
    ],
    relatedConcepts: ['orm', 'database-design', 'go-structs'],
    difficulty: 'intermediate',
    languages: ['go'],
  },

  'go-concurrency': {
    id: 'go-concurrency',
    name: 'Go Concurrency Patterns',
    description: 'Goroutines, channels, and context for safe concurrent programming in Go.',
    explanation: 'Goroutines are lightweight threads managed by the Go runtime. Channels enable safe communication between goroutines. Context carries deadlines, cancellation signals, and request-scoped values. Always pass context.Context as the first parameter. Use sync.WaitGroup to wait for goroutine completion. Use sync.Mutex for shared state. Never start a goroutine without a way to stop it.',
    category: 'architecture',
    examples: [
      'ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second); defer cancel(); result, err := fetchWithTimeout(ctx, url)',
      'var wg sync.WaitGroup; for _, url := range urls { wg.Add(1); go func(u string) { defer wg.Done(); fetch(u) }(url) }; wg.Wait()',
    ],
    relatedConcepts: ['concurrency', 'parallelism', 'channels'],
    difficulty: 'advanced',
    languages: ['go'],
  },

  'grpc-go': {
    id: 'grpc-go',
    name: 'gRPC in Go',
    description: 'High-performance RPC framework using Protocol Buffers for service-to-service communication.',
    explanation: 'gRPC uses .proto files to define services and messages. protoc generates Go client/server code. Supports unary, server-streaming, client-streaming, and bidirectional streaming RPCs. Interceptors add cross-cutting concerns (logging, auth, tracing). Use gRPC-Web or gRPC-Gateway for browser clients. Health checking and load balancing are built in.',
    category: 'architecture',
    examples: [
      'service UserService { rpc GetUser(GetUserRequest) returns (User); rpc ListUsers(ListUsersRequest) returns (stream User); }',
      's := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor)); pb.RegisterUserServiceServer(s, &userServer{}); s.Serve(lis)',
    ],
    relatedConcepts: ['protobuf', 'microservices', 'streaming'],
    difficulty: 'advanced',
    languages: ['go'],
  },

};


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  STACK CODE SNIPPETS                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export const STACK_CODE_SNIPPETS: CodeSnippet[] = [

  // ── MERN Stack Snippets ─────────────────────────────────────────────────

  {
    id: 'mern-mongoose-schema',
    title: 'Mongoose Schema with Validation, Hooks, and Indexes',
    description: 'Production-ready Mongoose schema with field validation, pre-save hooks, virtuals, and compound indexes.',
    tech: ['mongodb', 'mongoose', 'typescript', 'node'],
    tags: ['mern', 'database', 'schema', 'mongodb'],
    code: `import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'moderator';
  profile: {
    bio: string;
    avatar: string;
    socialLinks: { platform: string; url: string }[];
  };
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName: string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\\S+@\\S+\\.\\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    profile: {
      bio: { type: String, maxlength: 500, default: '' },
      avatar: { type: String, default: '' },
      socialLinks: [
        {
          platform: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('fullName').get(function () {
  return this.name;
});

export const User = model<IUser>('User', userSchema);`,
  },

  {
    id: 'mern-express-crud',
    title: 'Express CRUD Routes with Validation and Error Handling',
    description: 'Complete RESTful CRUD router for Express with Zod validation, async error wrapper, and proper HTTP status codes.',
    tech: ['express', 'typescript', 'zod', 'node'],
    tags: ['mern', 'api', 'crud', 'express', 'validation'],
    code: `import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true });

const validate =
  (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments({ isActive: true }),
    ]);

    res.json({
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ data: user });
  })
);

router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.create(req.body);
    res.status(201).json({ data: user });
  })
);

router.patch(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ data: user });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  })
);

export default router;`,
  },

  {
    id: 'mern-jwt-auth-middleware',
    title: 'JWT Authentication Middleware for Express',
    description: 'Complete JWT auth flow with access/refresh tokens, cookie-based storage, and role-based authorization.',
    tech: ['express', 'jsonwebtoken', 'typescript', 'node'],
    tags: ['mern', 'auth', 'jwt', 'middleware', 'security'],
    code: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export function setTokenCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export async function refreshTokenHandler(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    const tokens = generateTokens(user._id.toString(), user.role);
    setTokenCookies(res, tokens);
    res.json({ message: 'Token refreshed' });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}`,
  },

  {
    id: 'mern-error-handler',
    title: 'Express Global Error Handler',
    description: 'Centralized error handling middleware with custom error classes, logging, and consistent error response format.',
    tech: ['express', 'typescript', 'node'],
    tags: ['mern', 'error-handling', 'middleware', 'express'],
    code: `import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? \`\${resource} with id '\${id}' not found\` : \`\${resource} not found\`, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super(422, 'Validation failed', 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
      },
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: { message: 'Invalid ID format', code: 'INVALID_ID' },
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(422).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: err.message },
    });
  }

  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    return res.status(409).json({
      error: { message: \`\${field} already exists\`, code: 'DUPLICATE_KEY' },
    });
  }

  console.error('[Unhandled Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}`,
  },

  {
    id: 'mern-react-query-hooks',
    title: 'React Query Custom Hooks for MERN API',
    description: 'Reusable React Query hooks for CRUD operations with optimistic updates, error handling, and toast notifications.',
    tech: ['react', 'tanstack-query', 'typescript'],
    tags: ['mern', 'react', 'hooks', 'data-fetching', 'crud'],
    code: `import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const API_BASE = '/api/users';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message || 'Request failed');
  }
  return res.json();
}

export function useUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['users', { page, limit }],
    queryFn: () => apiFetch<PaginatedResponse<User>>(\`\${API_BASE}?page=\${page}&limit=\${limit}\`),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useUser(id: string, options?: Partial<UseQueryOptions<{ data: User }>>) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiFetch<{ data: User }>(\`\${API_BASE}/\${id}\`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      apiFetch<{ data: User }>(API_BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; email?: string }) =>
      apiFetch<{ data: User }>(\`\${API_BASE}/\${id}\`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['users', result.data._id], result);
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}`,
  },

  {
    id: 'mern-mongodb-aggregation',
    title: 'MongoDB Aggregation Pipeline Examples',
    description: 'Common aggregation patterns for analytics, reporting, and data transformation in Mongoose/MongoDB.',
    tech: ['mongodb', 'mongoose', 'typescript', 'node'],
    tags: ['mern', 'database', 'aggregation', 'analytics'],
    code: `import { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

export async function getOrderStats(startDate: Date, endDate: Date) {
  return Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$totalAmount' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount: 1,
        avgOrderValue: { $round: ['$avgOrderValue', 2] },
        _id: 0,
      },
    },
  ]);
}

export async function getTopProducts(limit = 10) {
  return Order.aggregate([
    { $match: { status: 'completed' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        productName: '$product.name',
        productCategory: '$product.category',
        totalQuantity: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount: 1,
      },
    },
  ]);
}

export async function getCustomerSegmentation() {
  return Order.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$customerId',
        totalSpent: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$totalAmount' },
        firstOrder: { $min: '$createdAt' },
        lastOrder: { $max: '$createdAt' },
      },
    },
    {
      $addFields: {
        segment: {
          $switch: {
            branches: [
              { case: { $gte: ['$totalSpent', 10000] }, then: 'VIP' },
              { case: { $gte: ['$totalSpent', 1000] }, then: 'Regular' },
              { case: { $gte: ['$orderCount', 3] }, then: 'Returning' },
            ],
            default: 'New',
          },
        },
      },
    },
    {
      $group: {
        _id: '$segment',
        customerCount: { $sum: 1 },
        avgSpent: { $avg: '$totalSpent' },
        avgOrders: { $avg: '$orderCount' },
      },
    },
    { $sort: { avgSpent: -1 } },
  ]);
}

export async function getProductCategorySales() {
  return Product.aggregate([
    {
      $lookup: {
        from: 'orders',
        let: { productId: '$_id' },
        pipeline: [
          { $match: { status: 'completed' } },
          { $unwind: '$items' },
          { $match: { $expr: { $eq: ['$items.productId', '$$productId'] } } },
        ],
        as: 'orders',
      },
    },
    {
      $group: {
        _id: '$category',
        productCount: { $sum: 1 },
        totalSales: { $sum: { $size: '$orders' } },
        avgPrice: { $avg: '$price' },
      },
    },
    { $sort: { totalSales: -1 } },
  ]);
}`,
  },

  {
    id: 'mern-express-app-setup',
    title: 'Express Application Setup with Middleware Stack',
    description: 'Production Express.js application setup with security, CORS, rate limiting, logging, and graceful shutdown.',
    tech: ['express', 'typescript', 'node'],
    tags: ['mern', 'setup', 'express', 'security', 'middleware'],
    code: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' } },
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

async function start() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
  const PORT = parseInt(process.env.PORT || '5000', 10);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const server = app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
  });

  const shutdown = async (signal: string) => {
    console.log(\`\${signal} received. Shutting down gracefully...\`);
    server.close(async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });
    setTimeout(() => { console.error('Forced shutdown'); process.exit(1); }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });

export default app;`,
  },

  {
    id: 'mern-react-form-component',
    title: 'React Form Component with React Hook Form + Zod',
    description: 'Type-safe form component using React Hook Form and Zod for validation in a MERN app.',
    tech: ['react', 'react-hook-form', 'zod', 'typescript'],
    tags: ['mern', 'react', 'forms', 'validation'],
    code: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateUser } from '../hooks/useUsers';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'user' },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    const { confirmPassword, ...userData } = data;
    await createUser.mutateAsync(userData);
    reset();
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input id="name" {...register('name')} className="mt-1 w-full rounded border p-2" />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" type="email" {...register('email')} className="mt-1 w-full rounded border p-2" />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input id="password" type="password" {...register('password')} className="mt-1 w-full rounded border p-2" />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirm Password</label>
        <input id="confirmPassword" type="password" {...register('confirmPassword')} className="mt-1 w-full rounded border p-2" />
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium">Role</label>
        <select id="role" {...register('role')} className="mt-1 w-full rounded border p-2">
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}`,
  },

  // ── Django Stack Snippets ────────────────────────────────────────────────

  {
    id: 'django-model-advanced',
    title: 'Django Model with PostgreSQL Fields, Managers, and Methods',
    description: 'Production Django model with custom managers, model methods, constraints, and PostgreSQL-specific fields.',
    tech: ['django', 'python', 'postgresql'],
    tags: ['django', 'database', 'model', 'postgresql'],
    code: `from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(
            status='published',
            published_at__lte=timezone.now()
        )


class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        REVIEW = 'review', 'In Review'
        PUBLISHED = 'published', 'Published'
        ARCHIVED = 'archived', 'Archived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=200, unique=True)
    body = models.TextField()
    excerpt = models.TextField(max_length=500, blank=True)

    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='articles'
    )
    category = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='articles'
    )

    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text='List of tags for this article'
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    featured = models.BooleanField(default=False)
    view_count = models.PositiveIntegerField(default=0)
    reading_time = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text='Estimated reading time in minutes',
        default=5,
    )

    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()
    published = PublishedManager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['author', 'slug'],
                name='unique_author_slug'
            ),
            models.CheckConstraint(
                check=models.Q(reading_time__gte=1),
                name='positive_reading_time'
            ),
        ]
        indexes = [
            models.Index(fields=['status', '-published_at']),
            models.Index(fields=['author', '-created_at']),
            GinIndex(fields=['tags']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        if not self.excerpt and self.body:
            self.excerpt = self.body[:497] + '...' if len(self.body) > 500 else self.body
        super().save(*args, **kwargs)

    @property
    def is_published(self):
        return self.status == self.Status.PUBLISHED and self.published_at and self.published_at <= timezone.now()

    def increment_views(self):
        Article.objects.filter(pk=self.pk).update(view_count=models.F('view_count') + 1)


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='children'
    )

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name`,
  },

  {
    id: 'django-drf-viewset',
    title: 'DRF ViewSet with Permissions, Filtering, and Pagination',
    description: 'Complete Django REST Framework viewset with custom permissions, search/filter, pagination, and nested serializers.',
    tech: ['django', 'drf', 'python'],
    tags: ['django', 'api', 'viewset', 'drf', 'crud'],
    code: `from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg
from .models import Article, Category
from .serializers import (
    ArticleListSerializer,
    ArticleDetailSerializer,
    ArticleCreateSerializer,
    CategorySerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.select_related('author', 'category').all()
    pagination_class = StandardPagination
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'featured']
    search_fields = ['title', 'body', 'tags']
    ordering_fields = ['created_at', 'published_at', 'view_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ArticleListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ArticleCreateSerializer
        return ArticleDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list' and not self.request.user.is_staff:
            qs = qs.filter(status='published')
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        article = self.get_object()
        if article.author != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Only the author or staff can publish'},
                status=status.HTTP_403_FORBIDDEN,
            )
        article.status = Article.Status.PUBLISHED
        article.save()
        return Response(ArticleDetailSerializer(article).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats = Article.objects.aggregate(
            total=Count('id'),
            published=Count('id', filter=models.Q(status='published')),
            avg_views=Avg('view_count'),
        )
        return Response(stats)

    @action(detail=False, methods=['get'])
    def my_articles(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        qs = self.get_queryset().filter(author=request.user)
        page = self.paginate_queryset(qs)
        serializer = ArticleListSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(article_count=Count('articles')).all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None
    lookup_field = 'slug'`,
  },

  {
    id: 'django-drf-serializer',
    title: 'DRF Serializers with Validation and Nested Data',
    description: 'Django REST Framework serializers with custom validation, nested relationships, and computed fields.',
    tech: ['django', 'drf', 'python'],
    tags: ['django', 'serializer', 'validation', 'drf'],
    code: `from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Article, Category


class AuthorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'parent', 'article_count']


class ArticleListSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'excerpt', 'author',
            'category_name', 'tags', 'status', 'featured',
            'view_count', 'reading_time', 'published_at', 'created_at',
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    is_published = serializers.BooleanField(read_only=True)

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'body', 'excerpt', 'author',
            'category', 'tags', 'status', 'featured', 'is_published',
            'view_count', 'reading_time', 'published_at', 'created_at', 'updated_at',
        ]


class ArticleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = [
            'title', 'slug', 'body', 'excerpt', 'category',
            'tags', 'status', 'featured', 'reading_time',
        ]

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError('Title must be at least 5 characters')
        return value.strip()

    def validate_tags(self, value):
        if len(value) > 10:
            raise serializers.ValidationError('Maximum 10 tags allowed')
        return [tag.lower().strip() for tag in value]

    def validate(self, attrs):
        if attrs.get('status') == 'published' and not attrs.get('body'):
            raise serializers.ValidationError(
                {'body': 'Body is required for published articles'}
            )
        return attrs`,
  },

  {
    id: 'django-celery-tasks',
    title: 'Celery Tasks with Retry, Chaining, and Periodic Tasks',
    description: 'Production Celery task patterns including retry logic, task chaining, error handling, and periodic scheduling.',
    tech: ['django', 'celery', 'redis', 'python'],
    tags: ['django', 'celery', 'background-jobs', 'async'],
    code: `from celery import shared_task, chain, group
from celery.utils.log import get_task_logger
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = get_task_logger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=300,
    acks_late=True,
)
def send_notification_email(self, user_id, template_name, context=None):
    from django.contrib.auth.models import User

    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject=f'Notification: {template_name}',
            message=f'Hello {user.get_full_name()}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f'Email sent to {user.email} (template: {template_name})')
    except User.DoesNotExist:
        logger.error(f'User {user_id} not found, skipping email')
    except Exception as exc:
        logger.error(f'Failed to send email to user {user_id}: {exc}')
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def generate_report(self, report_type, date_range, user_id):
    from .models import Article
    from .reports import ReportGenerator

    try:
        start_date, end_date = date_range
        articles = Article.objects.filter(
            created_at__range=(start_date, end_date)
        ).select_related('author', 'category')

        generator = ReportGenerator(report_type)
        report_url = generator.generate(articles, f'report_{report_type}_{start_date}')

        send_notification_email.delay(
            user_id, 'report_ready', {'report_url': report_url}
        )

        logger.info(f'Report generated: {report_url}')
        return report_url
    except Exception as exc:
        logger.error(f'Report generation failed: {exc}')
        raise self.retry(exc=exc, countdown=120)


@shared_task
def cleanup_old_drafts():
    from .models import Article

    threshold = timezone.now() - timedelta(days=90)
    deleted_count, _ = Article.objects.filter(
        status='draft',
        updated_at__lt=threshold,
    ).delete()
    logger.info(f'Cleaned up {deleted_count} old drafts')
    return deleted_count


@shared_task
def update_article_stats():
    from .models import Article
    from django.db.models import F

    articles = Article.published.filter(
        published_at__gte=timezone.now() - timedelta(hours=24)
    )
    for article in articles:
        article.increment_views()
    logger.info(f'Updated stats for {articles.count()} articles')


@shared_task
def process_bulk_import(file_path, user_id):
    import csv
    from .models import Article

    results = {'created': 0, 'errors': []}
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            try:
                Article.objects.create(
                    title=row['title'],
                    body=row['body'],
                    author_id=user_id,
                    status='draft',
                )
                results['created'] += 1
            except Exception as e:
                results['errors'].append(f'Row {row_num}: {str(e)}')

    send_notification_email.delay(user_id, 'import_complete', results)
    return results`,
  },

  {
    id: 'django-settings-split',
    title: 'Django Settings Split for Dev/Staging/Production',
    description: 'Environment-based Django settings configuration with secure defaults and environment variable loading.',
    tech: ['django', 'python'],
    tags: ['django', 'config', 'settings', 'deployment'],
    code: `import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'insecure-dev-key-change-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'myapp'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 300,
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
    'EXCEPTION_HANDLER': 'api.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/1')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300
CELERY_BEAT_SCHEDULE = {
    'cleanup-old-drafts': {
        'task': 'api.tasks.cleanup_old_drafts',
        'schedule': timedelta(hours=24),
    },
    'update-article-stats': {
        'task': 'api.tasks.update_article_stats',
        'schedule': timedelta(hours=1),
    },
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:3000'
).split(',')
CORS_ALLOW_CREDENTIALS = True

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO' if not DEBUG else 'DEBUG',
    },
    'loggers': {
        'django.db.backends': {
            'level': 'WARNING',
            'handlers': ['console'],
        },
    },
}`,
  },

  // ── Spring Boot Stack Snippets ──────────────────────────────────────────

  {
    id: 'spring-rest-controller',
    title: 'Spring Boot REST Controller with Validation and Exception Handling',
    description: 'Complete REST controller with DTO mapping, Bean Validation, pagination, and global exception handler.',
    tech: ['spring-boot', 'java'],
    tags: ['spring', 'api', 'controller', 'crud', 'java'],
    code: `package com.myapp.controller;

import com.myapp.dto.UserDTO;
import com.myapp.dto.CreateUserRequest;
import com.myapp.dto.UpdateUserRequest;
import com.myapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserDTO>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role
    ) {
        Page<UserDTO> users = userService.findAll(pageable, search, role);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getById(@PathVariable Long id) {
        UserDTO user = userService.findById(id);
        return ResponseEntity.ok(user);
    }

    @PostMapping
    public ResponseEntity<UserDTO> create(@Valid @RequestBody CreateUserRequest request) {
        UserDTO created = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        UserDTO updated = userService.update(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

// --- DTO classes ---
package com.myapp.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateUserRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = ".*[A-Z].*", message = "Must contain an uppercase letter")
    private String password;

    private String role = "USER";
}

@Data
public class UpdateUserRequest {
    @Size(min = 2, max = 100)
    private String name;

    @Email
    private String email;

    private String role;
}

@Data
public class UserDTO {
    private Long id;
    private String name;
    private String email;
    private String role;
    private boolean active;
    private java.time.LocalDateTime createdAt;
}`,
  },

  {
    id: 'spring-jpa-entity',
    title: 'JPA Entity with Relationships, Auditing, and Lifecycle Hooks',
    description: 'Production JPA entity with bidirectional relationships, audit fields, lifecycle callbacks, and proper equals/hashCode.',
    tech: ['spring-boot', 'jpa', 'hibernate', 'java'],
    tags: ['spring', 'database', 'entity', 'jpa', 'java'],
    code: `package com.myapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_customer", columnList = "customer_id"),
    @Index(name = "idx_order_status_date", columnList = "status,created_at"),
})
@SQLDelete(sql = "UPDATE orders SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<OrderItem> items = new ArrayList<>();

    @Column(nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;

    @Column(length = 500)
    private String notes;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;

    @Version
    private Long version;

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
        recalculateTotal();
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
        recalculateTotal();
    }

    private void recalculateTotal() {
        this.totalAmount = items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
    }

    @PrePersist
    private void prePersist() {
        if (orderNumber == null) {
            orderNumber = "ORD-" + System.currentTimeMillis();
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order order)) return false;
        return id != null && id.equals(order.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}

@Entity
@Table(name = "order_items")
@Getter @Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal unitPrice;

    @CreatedDate
    private LocalDateTime createdAt;

    public java.math.BigDecimal getSubtotal() {
        return unitPrice.multiply(java.math.BigDecimal.valueOf(quantity));
    }
}

public enum OrderStatus {
    PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
}`,
  },

  {
    id: 'spring-service-transactional',
    title: 'Spring Service Layer with Transactions and Business Logic',
    description: 'Service class with proper @Transactional usage, DTO mapping, validation, and error handling.',
    tech: ['spring-boot', 'java'],
    tags: ['spring', 'service', 'transactional', 'business-logic', 'java'],
    code: `package com.myapp.service;

import com.myapp.dto.*;
import com.myapp.entity.*;
import com.myapp.exception.*;
import com.myapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<UserDTO> findAll(Pageable pageable, String search, String role) {
        if (search != null && !search.isBlank()) {
            return userRepository
                .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(search, search, pageable)
                .map(this::toDTO);
        }
        if (role != null && !role.isBlank()) {
            return userRepository.findByRole(role, pageable).map(this::toDTO);
        }
        return userRepository.findAll(pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public UserDTO findById(Long id) {
        return userRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Transactional
    public UserDTO create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered: " + request.getEmail());
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole() != null ? request.getRole() : "USER");
        user.setActive(true);

        User saved = userRepository.save(user);
        log.info("User created: id={}, email={}", saved.getId(), saved.getEmail());
        return toDTO(saved);
    }

    @Transactional
    public UserDTO update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getEmail() != null) {
            String newEmail = request.getEmail().toLowerCase();
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new ConflictException("Email already in use: " + newEmail);
            }
            user.setEmail(newEmail);
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        User saved = userRepository.save(user);
        log.info("User updated: id={}", saved.getId());
        return toDTO(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", id);
        }
        userRepository.deleteById(id);
        log.info("User deleted: id={}", id);
    }

    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setActive(user.isActive());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}

// --- Exception classes ---
package com.myapp.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " not found with id: " + id);
    }
}

@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}`,
  },

  {
    id: 'spring-security-jwt-config',
    title: 'Spring Security JWT Configuration',
    description: 'Complete Spring Security config with JWT filter, security filter chain, CORS, and role-based access control.',
    tech: ['spring-boot', 'spring-security', 'java'],
    tags: ['spring', 'security', 'jwt', 'auth', 'java'],
    code: `package com.myapp.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.*;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/health", "/actuator/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/articles/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) -> {
                    res.setStatus(401);
                    res.setContentType("application/json");
                    res.getWriter().write("{\\"error\\":\\"Authentication required\\"}");
                })
                .accessDeniedHandler((req, res, e) -> {
                    res.setStatus(403);
                    res.setContentType("application/json");
                    res.getWriter().write("{\\"error\\":\\"Access denied\\"}");
                })
            )
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        String username = jwtService.extractUsername(token);

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (jwtService.isTokenValid(token, userDetails)) {
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}

@Component
public class JwtService {

    @Value("\${jwt.secret}")
    private String secretKey;

    @Value("\${jwt.expiration:900000}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .subject(userDetails.getUsername())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser().verifyWith(getSigningKey()).build()
            .parseSignedClaims(token).getPayload().getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        Date expiration = Jwts.parser().verifyWith(getSigningKey()).build()
            .parseSignedClaims(token).getPayload().getExpiration();
        return expiration.before(new Date());
    }
}`,
  },

  {
    id: 'spring-exception-handler',
    title: 'Spring Boot Global Exception Handler with @ControllerAdvice',
    description: 'Centralized exception handling for REST APIs with ProblemDetail responses and validation error formatting.',
    tech: ['spring-boot', 'java'],
    tags: ['spring', 'error-handling', 'exception', 'java'],
    code: `package com.myapp.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import java.net.URI;
import java.time.Instant;
import java.util.*;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setType(URI.create("https://api.myapp.com/errors/not-found"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> handleConflict(ConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Conflict");
        problem.setType(URI.create("https://api.myapp.com/errors/conflict"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed"
        );
        problem.setTitle("Validation Error");
        problem.setType(URI.create("https://api.myapp.com/errors/validation"));
        problem.setProperty("errors", errors);
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied");
        problem.setTitle("Forbidden");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuth(AuthenticationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Authentication failed");
        problem.setTitle("Unauthorized");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneral(Exception ex, WebRequest request) {
        log.error("Unhandled exception at {}: {}", request.getDescription(false), ex.getMessage(), ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred"
        );
        problem.setTitle("Internal Server Error");
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}`,
  },

  // ── .NET Stack Snippets ─────────────────────────────────────────────────

  {
    id: 'dotnet-controller-crud',
    title: 'ASP.NET Core Controller with CRUD and ProblemDetails',
    description: 'Complete API controller with dependency injection, FluentValidation, and RFC 7807 ProblemDetails error responses.',
    tech: ['aspnet-core', 'csharp'],
    tags: ['dotnet', 'api', 'controller', 'crud', 'csharp'],
    code: `using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FluentValidation;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null)
    {
        var result = await _userService.GetAllAsync(page, pageSize, search, role);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(UserDto), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 404)]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user is null)
            return NotFound(CreateProblemDetails("User not found", $"No user with id {id}"));
        return Ok(user);
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserDto), 201)]
    [ProducesResponseType(typeof(ValidationProblemDetails), 422)]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request)
    {
        var user = await _userService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userService.UpdateAsync(id, request);
        if (user is null)
            return NotFound(CreateProblemDetails("User not found", $"No user with id {id}"));
        return Ok(user);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _userService.DeleteAsync(id);
        if (!deleted)
            return NotFound(CreateProblemDetails("User not found", $"No user with id {id}"));
        return NoContent();
    }

    private static ProblemDetails CreateProblemDetails(string title, string detail) =>
        new() { Title = title, Detail = detail, Status = StatusCodes.Status404NotFound };
}

// --- DTOs ---
public record UserDto(int Id, string Name, string Email, string Role, bool IsActive, DateTime CreatedAt);
public record CreateUserRequest(string Name, string Email, string Password, string? Role);
public record UpdateUserRequest(string? Name, string? Email, string? Role);
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);

// --- FluentValidation ---
public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MinimumLength(2).MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Must contain an uppercase letter")
            .Matches("[0-9]").WithMessage("Must contain a number");
    }
}`,
  },

  {
    id: 'dotnet-ef-core-dbcontext',
    title: 'EF Core DbContext with Fluent API Configuration',
    description: 'Entity Framework Core DbContext with entity configuration, shadow properties, query filters, and seed data.',
    tech: ['ef-core', 'csharp', 'aspnet-core'],
    tags: ['dotnet', 'database', 'ef-core', 'dbcontext', 'csharp'],
    code: `using Microsoft.EntityFrameworkCore;

namespace MyApp.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(20).HasDefaultValue("User");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasQueryFilter(e => e.IsActive);
            entity.HasMany(e => e.Orders).WithOne(o => o.Customer).HasForeignKey(o => o.CustomerId);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.Property(e => e.TotalAmount).HasPrecision(10, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => new { e.Status, e.CreatedAt });
            entity.HasQueryFilter(e => e.DeletedAt == null);
            entity.HasMany(e => e.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Price).HasPrecision(10, 2);
            entity.Property(e => e.Sku).HasMaxLength(50);
            entity.HasIndex(e => e.Sku).IsUnique();
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(10, 2);
            entity.HasOne(e => e.Product).WithMany().HasForeignKey(e => e.ProductId);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = DateTime.UtcNow;
            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(ct);
    }
}

// --- Entities ---
public interface IAuditable { DateTime CreatedAt { get; set; } DateTime? UpdatedAt { get; set; } }

public class User : IAuditable
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

public class Order : IAuditable
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public int CustomerId { get; set; }
    public User Customer { get; set; } = null!;
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public enum OrderStatus { Pending, Confirmed, Processing, Shipped, Delivered, Cancelled }`,
  },

  {
    id: 'dotnet-service-repository',
    title: 'ASP.NET Core Service + Repository Pattern with EF Core',
    description: 'Service and generic repository pattern with Unit of Work, async operations, and specification pattern.',
    tech: ['aspnet-core', 'ef-core', 'csharp'],
    tags: ['dotnet', 'service', 'repository', 'pattern', 'csharp'],
    code: `using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace MyApp.Data;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IReadOnlyList<T>> GetAllAsync();
    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<(IReadOnlyList<T> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize,
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        params Expression<Func<T, object>>[] includes);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
}

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id) =>
        await _dbSet.FindAsync(id);

    public async Task<IReadOnlyList<T>> GetAllAsync() =>
        await _dbSet.AsNoTracking().ToListAsync();

    public async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate) =>
        await _dbSet.AsNoTracking().Where(predicate).ToListAsync();

    public async Task<(IReadOnlyList<T> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize,
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbSet.AsNoTracking();
        foreach (var include in includes) query = query.Include(include);
        if (filter != null) query = query.Where(filter);

        var totalCount = await query.CountAsync();

        if (orderBy != null) query = orderBy(query);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return (items, totalCount);
    }

    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate) =>
        await _dbSet.AnyAsync(predicate);

    public async Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null) =>
        predicate == null ? await _dbSet.CountAsync() : await _dbSet.CountAsync(predicate);
}

// --- Service using Repository ---
public class UserService : IUserService
{
    private readonly IRepository<User> _userRepo;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<UserService> _logger;

    public UserService(IRepository<User> userRepo, IPasswordHasher passwordHasher, ILogger<UserService> logger)
    {
        _userRepo = userRepo;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<PagedResult<UserDto>> GetAllAsync(int page, int pageSize, string? search, string? role)
    {
        Expression<Func<User, bool>>? filter = null;
        if (!string.IsNullOrWhiteSpace(search))
            filter = u => u.Name.Contains(search) || u.Email.Contains(search);
        else if (!string.IsNullOrWhiteSpace(role))
            filter = u => u.Role == role;

        var (items, total) = await _userRepo.GetPagedAsync(
            page, pageSize, filter,
            q => q.OrderByDescending(u => u.CreatedAt));

        return new PagedResult<UserDto>(
            items.Select(u => new UserDto(u.Id, u.Name, u.Email, u.Role, u.IsActive, u.CreatedAt)).ToList(),
            page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var user = await _userRepo.GetByIdAsync(id);
        return user is null ? null : new UserDto(user.Id, user.Name, user.Email, user.Role, user.IsActive, user.CreatedAt);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        if (await _userRepo.ExistsAsync(u => u.Email == request.Email))
            throw new ConflictException($"Email already registered: {request.Email}");

        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLower(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = request.Role ?? "User"
        };

        await _userRepo.AddAsync(user);
        _logger.LogInformation("User created: {UserId}", user.Id);
        return new UserDto(user.Id, user.Name, user.Email, user.Role, user.IsActive, user.CreatedAt);
    }
}

// --- DI Registration in Program.cs ---
// builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
// builder.Services.AddScoped<IUserService, UserService>();`,
  },

  {
    id: 'dotnet-program-setup',
    title: 'ASP.NET Core Program.cs Setup with Middleware Pipeline',
    description: 'Complete Program.cs with DI registration, middleware ordering, EF Core, JWT auth, Swagger, and health checks.',
    tech: ['aspnet-core', 'csharp'],
    tags: ['dotnet', 'setup', 'middleware', 'di', 'csharp'],
    code: `using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using FluentValidation;
using FluentValidation.AspNetCore;
using Serilog;
using System.Text;
using MyApp.Data;
using MyApp.Services;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure(3)));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"])
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseExceptionHandler("/error");
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.MapGet("/error", () => Results.Problem("An error occurred", statusCode: 500))
    .ExcludeFromDescription();

app.Run();`,
  },

  // ── Go + React Stack Snippets ──────────────────────────────────────────

  {
    id: 'go-gin-crud',
    title: 'Gin CRUD Handler with Validation and Error Responses',
    description: 'Complete REST API handlers using Gin framework with struct validation, error handling, and pagination.',
    tech: ['go', 'gin'],
    tags: ['go', 'api', 'crud', 'gin'],
    code: `package handler

import (
        "myapp/internal/model"
        "myapp/internal/service"
        "net/http"
        "strconv"

        "github.com/gin-gonic/gin"
)

type UserHandler struct {
        svc service.UserService
}

func NewUserHandler(svc service.UserService) *UserHandler {
        return &UserHandler{svc: svc}
}

func (h *UserHandler) RegisterRoutes(rg *gin.RouterGroup) {
        users := rg.Group("/users")
        {
                users.GET("", h.List)
                users.GET("/:id", h.GetByID)
                users.POST("", h.Create)
                users.PUT("/:id", h.Update)
                users.DELETE("/:id", h.Delete)
        }
}

type CreateUserRequest struct {
        Name     string \`json:"name" binding:"required,min=2,max=100"\`
        Email    string \`json:"email" binding:"required,email"\`
        Password string \`json:"password" binding:"required,min=8"\`
        Role     string \`json:"role" binding:"omitempty,oneof=user admin moderator"\`
}

type UpdateUserRequest struct {
        Name  *string \`json:"name" binding:"omitempty,min=2,max=100"\`
        Email *string \`json:"email" binding:"omitempty,email"\`
        Role  *string \`json:"role" binding:"omitempty,oneof=user admin moderator"\`
}

func (h *UserHandler) List(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
        search := c.Query("search")

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        result, err := h.svc.List(c.Request.Context(), service.ListParams{
                Page:     page,
                PageSize: pageSize,
                Search:   search,
        })
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
                return
        }

        c.JSON(http.StatusOK, gin.H{
                "data": result.Items,
                "pagination": gin.H{
                        "page":       result.Page,
                        "page_size":  result.PageSize,
                        "total":      result.Total,
                        "total_pages": result.TotalPages,
                },
        })
}

func (h *UserHandler) GetByID(c *gin.Context) {
        id, err := strconv.ParseUint(c.Param("id"), 10, 64)
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
                return
        }

        user, err := h.svc.GetByID(c.Request.Context(), uint(id))
        if err != nil {
                if err == service.ErrNotFound {
                        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
                        return
                }
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
                return
        }

        c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *UserHandler) Create(c *gin.Context) {
        var req CreateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Validation failed", "details": err.Error()})
                return
        }

        user, err := h.svc.Create(c.Request.Context(), service.CreateUserInput{
                Name:     req.Name,
                Email:    req.Email,
                Password: req.Password,
                Role:     req.Role,
        })
        if err != nil {
                if err == service.ErrConflict {
                        c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
                        return
                }
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
                return
        }

        c.JSON(http.StatusCreated, gin.H{"data": user})
}

func (h *UserHandler) Update(c *gin.Context) {
        id, err := strconv.ParseUint(c.Param("id"), 10, 64)
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
                return
        }

        var req UpdateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Validation failed", "details": err.Error()})
                return
        }

        user, err := h.svc.Update(c.Request.Context(), uint(id), service.UpdateUserInput{
                Name:  req.Name,
                Email: req.Email,
                Role:  req.Role,
        })
        if err != nil {
                if err == service.ErrNotFound {
                        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
                        return
                }
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
                return
        }

        c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *UserHandler) Delete(c *gin.Context) {
        id, err := strconv.ParseUint(c.Param("id"), 10, 64)
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
                return
        }

        if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
                if err == service.ErrNotFound {
                        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
                        return
                }
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
                return
        }

        c.Status(http.StatusNoContent)
}`,
  },

  {
    id: 'go-gorm-model-repo',
    title: 'GORM Model and Repository with Scopes and Transactions',
    description: 'Go GORM models with relationships, hooks, scopes, and a generic repository pattern with transaction support.',
    tech: ['go', 'gorm', 'postgresql'],
    tags: ['go', 'database', 'gorm', 'repository', 'model'],
    code: `package model

import (
        "time"

        "golang.org/x/crypto/bcrypt"
        "gorm.io/gorm"
)

type User struct {
        ID        uint           \`gorm:"primarykey" json:"id"\`
        Name      string         \`gorm:"not null;size:100" json:"name"\`
        Email     string         \`gorm:"uniqueIndex;not null;size:255" json:"email"\`
        Password  string         \`gorm:"not null" json:"-"\`
        Role      string         \`gorm:"not null;default:user;size:20" json:"role"\`
        IsActive  bool           \`gorm:"not null;default:true" json:"is_active"\`
        Orders    []Order        \`gorm:"foreignKey:CustomerID" json:"orders,omitempty"\`
        CreatedAt time.Time      \`json:"created_at"\`
        UpdatedAt time.Time      \`json:"updated_at"\`
        DeletedAt gorm.DeletedAt \`gorm:"index" json:"-"\`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
        hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
        if err != nil {
                return err
        }
        u.Password = string(hashed)
        return nil
}

func (u *User) CheckPassword(password string) bool {
        return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)) == nil
}

type Order struct {
        ID          uint           \`gorm:"primarykey" json:"id"\`
        OrderNumber string         \`gorm:"uniqueIndex;not null;size:20" json:"order_number"\`
        CustomerID  uint           \`gorm:"not null;index" json:"customer_id"\`
        Customer    User           \`json:"customer,omitempty"\`
        Status      string         \`gorm:"not null;default:pending;size:20;index" json:"status"\`
        TotalAmount float64        \`gorm:"not null;default:0" json:"total_amount"\`
        Items       []OrderItem    \`gorm:"foreignKey:OrderID" json:"items,omitempty"\`
        Notes       *string        \`json:"notes,omitempty"\`
        CreatedAt   time.Time      \`json:"created_at"\`
        UpdatedAt   time.Time      \`json:"updated_at"\`
        DeletedAt   gorm.DeletedAt \`gorm:"index" json:"-"\`
}

type OrderItem struct {
        ID        uint    \`gorm:"primarykey" json:"id"\`
        OrderID   uint    \`gorm:"not null;index" json:"order_id"\`
        ProductID uint    \`gorm:"not null" json:"product_id"\`
        Product   Product \`json:"product,omitempty"\`
        Quantity  int     \`gorm:"not null" json:"quantity"\`
        UnitPrice float64 \`gorm:"not null" json:"unit_price"\`
}

type Product struct {
        ID       uint    \`gorm:"primarykey" json:"id"\`
        Name     string  \`gorm:"not null;size:200" json:"name"\`
        SKU      string  \`gorm:"uniqueIndex;size:50" json:"sku"\`
        Price    float64 \`gorm:"not null" json:"price"\`
        Category string  \`gorm:"size:100;index" json:"category"\`
        InStock  bool    \`gorm:"not null;default:true" json:"in_stock"\`
}

// --- Scopes ---
func Active(db *gorm.DB) *gorm.DB {
        return db.Where("is_active = ?", true)
}

func ByRole(role string) func(db *gorm.DB) *gorm.DB {
        return func(db *gorm.DB) *gorm.DB {
                return db.Where("role = ?", role)
        }
}

func SearchByName(search string) func(db *gorm.DB) *gorm.DB {
        return func(db *gorm.DB) *gorm.DB {
                if search == "" {
                        return db
                }
                return db.Where("name ILIKE ?", "%"+search+"%")
        }
}

func Paginate(page, pageSize int) func(db *gorm.DB) *gorm.DB {
        return func(db *gorm.DB) *gorm.DB {
                offset := (page - 1) * pageSize
                return db.Offset(offset).Limit(pageSize)
        }
}`,
  },

  {
    id: 'go-jwt-middleware',
    title: 'Go JWT Authentication Middleware for Gin',
    description: 'JWT middleware with token generation, validation, role-based authorization, and refresh token support.',
    tech: ['go', 'gin', 'jwt'],
    tags: ['go', 'auth', 'jwt', 'middleware', 'gin'],
    code: `package middleware

import (
        "errors"
        "net/http"
        "os"
        "strings"
        "time"

        "github.com/gin-gonic/gin"
        "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
        UserID uint   \`json:"user_id"\`
        Role   string \`json:"role"\`
        jwt.RegisteredClaims
}

type TokenPair struct {
        AccessToken  string \`json:"access_token"\`
        RefreshToken string \`json:"refresh_token"\`
}

var (
        ErrInvalidToken = errors.New("invalid token")
        ErrExpiredToken = errors.New("token expired")
)

func GenerateTokenPair(userID uint, role string) (*TokenPair, error) {
        secret := []byte(os.Getenv("JWT_SECRET"))
        refreshSecret := []byte(os.Getenv("JWT_REFRESH_SECRET"))

        accessClaims := Claims{
                UserID: userID,
                Role:   role,
                RegisteredClaims: jwt.RegisteredClaims{
                        ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
                        IssuedAt:  jwt.NewNumericDate(time.Now()),
                },
        }
        accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(secret)
        if err != nil {
                return nil, err
        }

        refreshClaims := Claims{
                UserID: userID,
                Role:   role,
                RegisteredClaims: jwt.RegisteredClaims{
                        ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
                        IssuedAt:  jwt.NewNumericDate(time.Now()),
                },
        }
        refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(refreshSecret)
        if err != nil {
                return nil, err
        }

        return &TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func ValidateToken(tokenString string) (*Claims, error) {
        secret := []byte(os.Getenv("JWT_SECRET"))
        token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
                if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                        return nil, ErrInvalidToken
                }
                return secret, nil
        })
        if err != nil {
                if errors.Is(err, jwt.ErrTokenExpired) {
                        return nil, ErrExpiredToken
                }
                return nil, ErrInvalidToken
        }

        claims, ok := token.Claims.(*Claims)
        if !ok || !token.Valid {
                return nil, ErrInvalidToken
        }
        return claims, nil
}

func AuthRequired() gin.HandlerFunc {
        return func(c *gin.Context) {
                header := c.GetHeader("Authorization")
                if header == "" {
                        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
                        return
                }

                parts := strings.SplitN(header, " ", 2)
                if len(parts) != 2 || parts[0] != "Bearer" {
                        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
                        return
                }

                claims, err := ValidateToken(parts[1])
                if err != nil {
                        status := http.StatusUnauthorized
                        msg := "Invalid token"
                        if errors.Is(err, ErrExpiredToken) {
                                msg = "Token expired"
                        }
                        c.AbortWithStatusJSON(status, gin.H{"error": msg})
                        return
                }

                c.Set("user_id", claims.UserID)
                c.Set("user_role", claims.Role)
                c.Next()
        }
}

func RequireRole(roles ...string) gin.HandlerFunc {
        return func(c *gin.Context) {
                role, exists := c.Get("user_role")
                if !exists {
                        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
                        return
                }

                roleStr, ok := role.(string)
                if !ok {
                        c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Invalid role"})
                        return
                }

                allowed := false
                for _, r := range roles {
                        if r == roleStr {
                                allowed = true
                                break
                        }
                }

                if !allowed {
                        c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
                        return
                }

                c.Next()
        }
}`,
  },

  {
    id: 'go-app-setup',
    title: 'Go Application Setup with Gin, GORM, and Graceful Shutdown',
    description: 'Production Go application entry point with Gin router, GORM database, middleware stack, and graceful shutdown.',
    tech: ['go', 'gin', 'gorm', 'postgresql'],
    tags: ['go', 'setup', 'gin', 'gorm', 'middleware'],
    code: `package main

import (
        "context"
        "fmt"
        "log"
        "myapp/internal/handler"
        "myapp/internal/middleware"
        "myapp/internal/model"
        "myapp/internal/service"
        "net/http"
        "os"
        "os/signal"
        "syscall"
        "time"

        "github.com/gin-contrib/cors"
        "github.com/gin-gonic/gin"
        "gorm.io/driver/postgres"
        "gorm.io/gorm"
        "gorm.io/gorm/logger"
)

func main() {
        dsn := fmt.Sprintf(
                "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
                getEnv("DB_HOST", "localhost"),
                getEnv("DB_PORT", "5432"),
                getEnv("DB_USER", "postgres"),
                getEnv("DB_PASSWORD", ""),
                getEnv("DB_NAME", "myapp"),
        )

        db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
                Logger: logger.Default.LogMode(logger.Info),
        })
        if err != nil {
                log.Fatalf("Failed to connect to database: %v", err)
        }

        sqlDB, _ := db.DB()
        sqlDB.SetMaxOpenConns(25)
        sqlDB.SetMaxIdleConns(10)
        sqlDB.SetConnMaxLifetime(5 * time.Minute)

        if err := db.AutoMigrate(&model.User{}, &model.Product{}, &model.Order{}, &model.OrderItem{}); err != nil {
                log.Fatalf("Migration failed: %v", err)
        }

        if os.Getenv("GIN_MODE") == "release" {
                gin.SetMode(gin.ReleaseMode)
        }

        r := gin.New()
        r.Use(gin.Logger())
        r.Use(gin.Recovery())
        r.Use(cors.New(cors.Config{
                AllowOrigins:     []string{getEnv("CORS_ORIGIN", "http://localhost:3000")},
                AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
                AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
                AllowCredentials: true,
                MaxAge:           12 * time.Hour,
        }))

        r.GET("/health", func(c *gin.Context) {
                c.JSON(200, gin.H{"status": "ok", "timestamp": time.Now().UTC()})
        })

        api := r.Group("/api/v1")

        public := api.Group("")
        authHandler := handler.NewAuthHandler(service.NewAuthService(db))
        authHandler.RegisterRoutes(public)

        protected := api.Group("")
        protected.Use(middleware.AuthRequired())

        userHandler := handler.NewUserHandler(service.NewUserService(db))
        userHandler.RegisterRoutes(protected)

        orderHandler := handler.NewOrderHandler(service.NewOrderService(db))
        orderHandler.RegisterRoutes(protected)

        port := getEnv("PORT", "8080")
        srv := &http.Server{
                Addr:         ":" + port,
                Handler:      r,
                ReadTimeout:  10 * time.Second,
                WriteTimeout: 30 * time.Second,
                IdleTimeout:  120 * time.Second,
        }

        go func() {
                log.Printf("Server starting on port %s", port)
                if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
                        log.Fatalf("Server failed: %v", err)
                }
        }()

        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
        <-quit

        log.Println("Shutting down server...")
        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()

        if err := srv.Shutdown(ctx); err != nil {
                log.Fatalf("Server forced to shutdown: %v", err)
        }

        sqlDB.Close()
        log.Println("Server exited cleanly")
}

func getEnv(key, fallback string) string {
        if v := os.Getenv(key); v != "" {
                return v
        }
        return fallback
}`,
  },

  {
    id: 'go-grpc-service',
    title: 'gRPC Service Definition and Go Server Implementation',
    description: 'Complete gRPC service with proto definition, Go server implementation, interceptors, and health checking.',
    tech: ['go', 'grpc', 'protobuf'],
    tags: ['go', 'grpc', 'protobuf', 'microservices'],
    code: `// --- user.proto ---
// syntax = "proto3";
// package user;
// option go_package = "myapp/api/proto/user";
//
// service UserService {
//   rpc GetUser(GetUserRequest) returns (UserResponse);
//   rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
//   rpc CreateUser(CreateUserRequest) returns (UserResponse);
//   rpc UpdateUser(UpdateUserRequest) returns (UserResponse);
//   rpc DeleteUser(DeleteUserRequest) returns (Empty);
// }
//
// message GetUserRequest { uint64 id = 1; }
// message ListUsersRequest { int32 page = 1; int32 page_size = 2; string search = 3; }
// message CreateUserRequest { string name = 1; string email = 2; string password = 3; }
// message UpdateUserRequest { uint64 id = 1; optional string name = 2; optional string email = 3; }
// message DeleteUserRequest { uint64 id = 1; }
// message UserResponse { uint64 id = 1; string name = 2; string email = 3; string role = 4; }
// message ListUsersResponse { repeated UserResponse users = 1; int32 total = 2; }
// message Empty {}

// --- Go server implementation ---
package grpcserver

import (
        "context"
        "log"
        "net"
        "time"

        pb "myapp/api/proto/user"
        "myapp/internal/service"

        "google.golang.org/grpc"
        "google.golang.org/grpc/codes"
        "google.golang.org/grpc/health"
        healthpb "google.golang.org/grpc/health/grpc_health_v1"
        "google.golang.org/grpc/reflection"
        "google.golang.org/grpc/status"
)

type userServer struct {
        pb.UnimplementedUserServiceServer
        svc service.UserService
}

func NewUserServer(svc service.UserService) pb.UserServiceServer {
        return &userServer{svc: svc}
}

func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.UserResponse, error) {
        user, err := s.svc.GetByID(ctx, uint(req.Id))
        if err != nil {
                if err == service.ErrNotFound {
                        return nil, status.Errorf(codes.NotFound, "user not found")
                }
                return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
        }
        return toProto(user), nil
}

func (s *userServer) ListUsers(ctx context.Context, req *pb.ListUsersRequest) (*pb.ListUsersResponse, error) {
        result, err := s.svc.List(ctx, service.ListParams{
                Page:     int(req.Page),
                PageSize: int(req.PageSize),
                Search:   req.Search,
        })
        if err != nil {
                return nil, status.Errorf(codes.Internal, "failed to list users: %v", err)
        }
        users := make([]*pb.UserResponse, len(result.Items))
        for i, u := range result.Items {
                users[i] = toProto(&u)
        }
        return &pb.ListUsersResponse{Users: users, Total: int32(result.Total)}, nil
}

func loggingInterceptor(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
) (interface{}, error) {
        start := time.Now()
        resp, err := handler(ctx, req)
        duration := time.Since(start)
        code := codes.OK
        if err != nil {
                code = status.Code(err)
        }
        log.Printf("gRPC %s | %s | %v | %v", info.FullMethod, code, duration, err)
        return resp, err
}

func StartGRPCServer(addr string, svc service.UserService) error {
        lis, err := net.Listen("tcp", addr)
        if err != nil {
                return err
        }

        s := grpc.NewServer(
                grpc.UnaryInterceptor(loggingInterceptor),
        )

        pb.RegisterUserServiceServer(s, NewUserServer(svc))

        healthSrv := health.NewServer()
        healthpb.RegisterHealthServer(s, healthSrv)
        healthSrv.SetServingStatus("user.UserService", healthpb.HealthCheckResponse_SERVING)

        reflection.Register(s)

        log.Printf("gRPC server starting on %s", addr)
        return s.Serve(lis)
}

func toProto(u *service.UserDTO) *pb.UserResponse {
        return &pb.UserResponse{
                Id:    uint64(u.ID),
                Name:  u.Name,
                Email: u.Email,
                Role:  u.Role,
        }
}`,
  },

  {
    id: 'go-redis-cache',
    title: 'Go Redis Cache Helper with TTL and JSON Serialization',
    description: 'Generic Redis cache wrapper with type-safe get/set, TTL, cache-aside pattern, and batch operations.',
    tech: ['go', 'redis'],
    tags: ['go', 'cache', 'redis', 'performance'],
    code: `package cache

import (
        "context"
        "encoding/json"
        "fmt"
        "time"

        "github.com/redis/go-redis/v9"
)

type Cache struct {
        client *redis.Client
        prefix string
}

func New(addr, password string, db int, prefix string) *Cache {
        client := redis.NewClient(&redis.Options{
                Addr:         addr,
                Password:     password,
                DB:           db,
                DialTimeout:  5 * time.Second,
                ReadTimeout:  3 * time.Second,
                WriteTimeout: 3 * time.Second,
                PoolSize:     20,
                MinIdleConns: 5,
        })
        return &Cache{client: client, prefix: prefix}
}

func (c *Cache) key(k string) string {
        return fmt.Sprintf("%s:%s", c.prefix, k)
}

func Set[T any](ctx context.Context, c *Cache, key string, value T, ttl time.Duration) error {
        data, err := json.Marshal(value)
        if err != nil {
                return fmt.Errorf("cache marshal: %w", err)
        }
        return c.client.Set(ctx, c.key(key), data, ttl).Err()
}

func Get[T any](ctx context.Context, c *Cache, key string) (*T, error) {
        data, err := c.client.Get(ctx, c.key(key)).Bytes()
        if err == redis.Nil {
                return nil, nil
        }
        if err != nil {
                return nil, fmt.Errorf("cache get: %w", err)
        }
        var result T
        if err := json.Unmarshal(data, &result); err != nil {
                return nil, fmt.Errorf("cache unmarshal: %w", err)
        }
        return &result, nil
}

func GetOrSet[T any](ctx context.Context, c *Cache, key string, ttl time.Duration, fetcher func() (T, error)) (T, error) {
        cached, err := Get[T](ctx, c, key)
        if err == nil && cached != nil {
                return *cached, nil
        }

        result, err := fetcher()
        if err != nil {
                return result, err
        }

        _ = Set(ctx, c, key, result, ttl)
        return result, nil
}

func (c *Cache) Delete(ctx context.Context, keys ...string) error {
        fullKeys := make([]string, len(keys))
        for i, k := range keys {
                fullKeys[i] = c.key(k)
        }
        return c.client.Del(ctx, fullKeys...).Err()
}

func (c *Cache) DeleteByPattern(ctx context.Context, pattern string) error {
        iter := c.client.Scan(ctx, 0, c.key(pattern), 100).Iterator()
        var keys []string
        for iter.Next(ctx) {
                keys = append(keys, iter.Val())
        }
        if err := iter.Err(); err != nil {
                return err
        }
        if len(keys) > 0 {
                return c.client.Del(ctx, keys...).Err()
        }
        return nil
}

func (c *Cache) Ping(ctx context.Context) error {
        return c.client.Ping(ctx).Err()
}

func (c *Cache) Close() error {
        return c.client.Close()
}`,
  },

];


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  STACK BEST PRACTICES                                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export const STACK_BEST_PRACTICES: BestPractice[] = [

  // ── MERN Best Practices ─────────────────────────────────────────────────

  { id: 'mern-mongodb-schema-design', title: 'MongoDB Schema Design', category: 'mern-database', description: 'Design MongoDB schemas for optimal read/write performance and data integrity.', do: ['Embed data that is always accessed together (e.g., address inside user)', 'Use references (ObjectId) for large or frequently-updated subdocuments', 'Add compound indexes matching your most common query patterns', 'Use .lean() on read-only queries to skip Mongoose hydration (2-5x faster)', 'Set select: false on sensitive fields like password in the schema', 'Use Schema timestamps: true for automatic createdAt/updatedAt'], dont: ['Create deeply nested documents (>3 levels) — flatten or reference instead', 'Store large arrays that grow unboundedly in a single document (16MB BSON limit)', 'Use MongoDB as a relational database — avoid excessive $lookup (JOIN) operations', 'Forget to create indexes — unindexed queries do full collection scans', 'Use autoIndex: true in production — build indexes manually during maintenance windows'], languages: ['typescript', 'javascript'] },

  { id: 'mern-express-middleware', title: 'Express Middleware Best Practices', category: 'mern-architecture', description: 'Structure Express middleware for security, performance, and maintainability.', do: ['Order middleware: security (helmet, cors) → parsing → auth → routes → error handler', 'Use async error wrapper to catch rejected promises in route handlers', 'Implement a centralized error handler as the last middleware', 'Use rate limiting on public API endpoints', 'Set appropriate request body size limits with express.json({ limit: "10mb" })', 'Use compression middleware for production responses'], dont: ['Place error handler middleware before routes — it will never catch anything', 'Use app.use(cors()) without configuring allowed origins in production', 'Mix .then() and async/await error handling in the same handler', 'Forget to call next() in middleware — the request will hang', 'Log sensitive data (passwords, tokens) in request loggers'], languages: ['typescript', 'javascript'] },

  { id: 'mern-project-structure', title: 'MERN Project Structure', category: 'mern-architecture', description: 'Organize MERN codebases for scalability and developer experience.', do: ['Separate client/ and server/ directories at the root', 'Group server code by feature: routes/, models/, services/, middleware/', 'Use barrel exports (index.ts) for cleaner imports', 'Keep environment config in a single config/ module that validates all required env vars at startup', 'Share TypeScript types between client and server via a shared/ package'], dont: ['Put business logic directly in route handlers — extract to service layer', 'Mix database queries into controller/route files', 'Store secrets in source code or .env files committed to git', 'Use relative path imports more than 3 levels deep (use path aliases)', 'Put everything in one massive server.ts file'], languages: ['typescript', 'javascript'] },

  { id: 'mern-async-error-handling', title: 'Async Error Handling in Express', category: 'mern-reliability', description: 'Handle async errors consistently across all Express routes to prevent unhandled promise rejections.', do: ['Wrap all async route handlers with a try-catch or asyncHandler wrapper', 'Create custom error classes (NotFoundError, ValidationError) with appropriate status codes', 'Always pass errors to next() from middleware — never swallow them', 'Use a global unhandledRejection handler as a safety net', 'Return consistent error response format: { error: { message, code, details } }'], dont: ['Use empty catch blocks that silently swallow errors', 'Return raw Error objects or stack traces to clients in production', 'Forget to await async operations inside try blocks', 'Mix callback-style and promise-style error handling', 'Use process.exit(1) on unhandled rejections in production — gracefully shutdown instead'], languages: ['typescript', 'javascript'] },

  { id: 'mern-env-management', title: 'Environment Variable Management', category: 'mern-config', description: 'Safely manage configuration across development, staging, and production environments.', do: ['Validate all required environment variables at application startup', 'Use a typed config module that fails fast on missing values', 'Use .env.example (committed to git) as documentation of required variables', 'Store secrets in a vault or cloud secret manager in production', 'Use different database names/URLs for dev, test, and production'], dont: ['Commit .env files with real secrets to version control', 'Use process.env directly throughout the codebase — centralize in a config module', 'Hardcode default values for secrets (only for non-sensitive config)', 'Use the same database for development and production', 'Store JWT secrets, API keys, or database passwords in source code'], languages: ['typescript', 'javascript'] },

  // ── Django Best Practices ───────────────────────────────────────────────

  { id: 'django-app-structure', title: 'Django App Structure', category: 'django-architecture', description: 'Organize Django projects with clean app boundaries and separation of concerns.', do: ['Create separate Django apps for distinct features (users, articles, payments)', 'Use a services layer between views and models for complex business logic', 'Keep models focused — one model per concept with clear responsibilities', 'Use signals sparingly — prefer explicit service method calls', 'Split settings into base.py, development.py, production.py using django-environ'], dont: ['Put all models in a single models.py when the app grows beyond 5 models', 'Write complex business logic directly in views (fat views anti-pattern)', 'Use circular imports between apps — if apps depend on each other, consider merging them', 'Override save() for complex side effects — use signals or service methods', 'Use settings.DEBUG to toggle business logic — only for development tools'], languages: ['python'] },

  { id: 'django-drf-validation', title: 'DRF Serializer Validation', category: 'django-api', description: 'Implement robust validation in Django REST Framework serializers.', do: ['Use field-level validators for single-field rules (validate_email, validate_title)', 'Use object-level validate() for cross-field validation (password confirmation, date ranges)', 'Return specific error messages that help the client fix the issue', 'Use UniqueValidator and UniqueTogetherValidator for database-level uniqueness', 'Create reusable validator functions for common patterns (phone numbers, URLs)'], dont: ['Validate in views instead of serializers — views should only orchestrate', 'Use generic error messages like "Invalid data" without specifying the field', 'Forget to validate nested serializer data — nested data is not auto-validated by default', 'Mix validation and business logic — validators check data shape, services apply rules', 'Skip validation on update operations — partial=True still needs field-level validators'], languages: ['python'] },

  { id: 'django-celery-best-practices', title: 'Celery Task Best Practices', category: 'django-async', description: 'Write reliable, idempotent Celery tasks that handle failures gracefully.', do: ['Make tasks idempotent — running the same task twice should produce the same result', 'Use exponential backoff for retries: retry_backoff=True, retry_backoff_max=600', 'Set acks_late=True for tasks that must not be lost if a worker crashes', 'Pass simple serializable arguments (IDs, strings) — never pass ORM objects', 'Use task_time_limit and soft_time_limit to prevent stuck workers', 'Log task start, success, and failure for monitoring'], dont: ['Pass Django model instances as task arguments — they cannot be serialized/deserialized reliably', 'Use synchronous operations in tasks without timeouts — always set connection timeouts', 'Ignore task failures — use on_failure handlers or dead letter queues', 'Schedule heavy tasks without rate limiting — use rate_limit parameter', 'Use the database as a result backend in production — use Redis'], languages: ['python'] },

  { id: 'django-orm-optimization', title: 'Django ORM Query Optimization', category: 'django-performance', description: 'Write efficient database queries to avoid N+1 problems and unnecessary data loading.', do: ['Use select_related() for ForeignKey and OneToOneField (SQL JOIN)', 'Use prefetch_related() for ManyToManyField and reverse ForeignKey (separate query)', 'Use only() and defer() to load only the fields you need', 'Use F() expressions for database-level arithmetic (avoid race conditions)', 'Use bulk_create() and bulk_update() for batch operations', 'Use .exists() instead of .count() > 0 for existence checks'], dont: ['Access related objects in loops without prefetching (N+1 query problem)', 'Use .all() followed by Python-level filtering — filter in the query', 'Call len(queryset) — use .count() which does SELECT COUNT at the database level', 'Evaluate querysets unnecessarily — they are lazy, keep them lazy until needed', 'Use raw SQL without parameterized queries — SQL injection risk'], languages: ['python'] },

  { id: 'django-settings-security', title: 'Django Settings for Production', category: 'django-deployment', description: 'Configure Django securely for production deployments.', do: ['Set DEBUG=False and configure ALLOWED_HOSTS explicitly', 'Enable SECURE_SSL_REDIRECT, SECURE_HSTS_SECONDS, SECURE_HSTS_PRELOAD', 'Set SESSION_COOKIE_SECURE=True and CSRF_COOKIE_SECURE=True', 'Use environment variables for all secrets via django-environ or os.environ', 'Configure proper logging with structured output for production monitoring'], dont: ['Deploy with DEBUG=True — it exposes settings, SQL queries, and stack traces', 'Use the default SECRET_KEY — generate a unique, random key for each environment', 'Commit real database credentials to version control', 'Use SQLite in production — PostgreSQL is the recommended database for Django', 'Disable CSRF protection for "convenience" — fix the root cause instead'], languages: ['python'] },

  // ── Spring Boot Best Practices ──────────────────────────────────────────

  { id: 'spring-layered-architecture', title: 'Spring Boot Layered Architecture', category: 'spring-architecture', description: 'Organize Spring Boot applications with clear layer boundaries: Controller → Service → Repository.', do: ['Keep controllers thin — only HTTP concerns (request parsing, response formatting, status codes)', 'Put all business logic in service classes annotated with @Service', 'Use @Transactional on service methods, not on controllers or repositories', 'Map between entities and DTOs in the service layer', 'Inject interfaces, not concrete classes — enables testing and flexibility'], dont: ['Access repositories directly from controllers — always go through a service', 'Put validation logic in repositories — validate in DTOs or service layer', 'Return JPA entities from controllers — always map to DTOs', 'Mix HTTP concerns (HttpServletRequest) into service classes', 'Create service classes that are just thin wrappers around repository calls'], languages: ['java'] },

  { id: 'spring-transactional', title: 'Proper @Transactional Usage', category: 'spring-database', description: 'Use Spring @Transactional correctly for data consistency and performance.', do: ['Use @Transactional on service methods that modify data', 'Use @Transactional(readOnly = true) for read-only operations (enables optimizations)', 'Set specific rollbackFor exceptions when needed', 'Use programmatic transactions (TransactionTemplate) for fine-grained control', 'Test transactional behavior with @SpringBootTest and verify rollback on errors'], dont: ['Put @Transactional on private methods — Spring proxies only intercept public methods', 'Call a @Transactional method from within the same class — self-invocation bypasses the proxy', 'Use @Transactional on controllers — transaction scope should match business operation scope', 'Forget that @Transactional defaults to RuntimeException rollback only', 'Open transactions for long-running operations — keep transactions short'], languages: ['java'] },

  { id: 'spring-security-cors', title: 'Spring Security CORS Configuration', category: 'spring-security', description: 'Configure CORS properly in Spring Security for frontend-backend separation.', do: ['Define CorsConfigurationSource bean with explicit allowed origins', 'Allow specific HTTP methods: GET, POST, PUT, DELETE, PATCH', 'Set AllowCredentials(true) if using cookies or Authorization headers', 'Configure CORS before Spring Security filter chain', 'Disable CSRF for stateless REST APIs using JWT authentication'], dont: ['Use @CrossOrigin("*") on controllers in production — configure globally', 'Allow all origins in production: setAllowedOriginPatterns("*")', 'Forget to add OPTIONS to allowed methods — preflight requests will fail', 'Configure CORS in Spring Security AND a separate CorsFilter — pick one', 'Disable CORS entirely "to make it work" — fix the configuration instead'], languages: ['java'] },

  { id: 'spring-hikari-pool', title: 'HikariCP Connection Pool Tuning', category: 'spring-performance', description: 'Configure the HikariCP database connection pool for optimal performance.', do: ['Set maximum-pool-size based on: connections = ((core_count * 2) + disk_spindles)', 'Set minimum-idle equal to maximum-pool-size for consistent performance', 'Set connection-timeout to 30000ms (30 seconds)', 'Set idle-timeout to 600000ms (10 minutes) for idle connection cleanup', 'Set max-lifetime to 1800000ms (30 minutes) — less than database wait_timeout'], dont: ['Set maximum-pool-size too high (>50) — more connections means more context switching', 'Set minimum-idle to 0 — cold start penalty when first requests arrive', 'Forget to set max-lifetime — stale connections cause intermittent failures', 'Use the default connection test query — HikariCP uses Connection.isValid() which is faster', 'Ignore connection leak detection — set leak-detection-threshold to 60000 in development'], languages: ['java'] },

  { id: 'spring-lombok-usage', title: 'Lombok Best Practices in Spring', category: 'spring-code-style', description: 'Use Lombok effectively to reduce boilerplate while maintaining code quality.', do: ['Use @RequiredArgsConstructor for constructor injection in Spring beans', 'Use @Data for simple DTOs and value objects', 'Use @Builder for classes with many optional parameters', 'Use @Slf4j for logging instead of manual Logger creation', 'Use @Getter/@Setter selectively on JPA entities (avoid @Data on entities)'], dont: ['Use @Data on JPA entities — it generates equals/hashCode based on all fields, breaking Hibernate', 'Use @AllArgsConstructor for Spring beans — prefer @RequiredArgsConstructor for final fields', 'Use @ToString on entities with lazy-loaded relationships — triggers lazy loading', 'Overuse @Builder — simple constructors are often clearer', 'Forget to add Lombok annotation processor to your build tool'], languages: ['java'] },

  // ── .NET Best Practices ────────────────────────────────────────────────

  { id: 'dotnet-minimal-vs-mvc', title: 'Minimal API vs MVC Controllers', category: 'dotnet-architecture', description: 'Choose the right API style in ASP.NET Core based on complexity and team preferences.', do: ['Use Minimal APIs for microservices and simple CRUD endpoints', 'Use MVC Controllers when you need filters, model binding, and complex routing', 'Use MapGroup() to organize related Minimal API endpoints', 'Use TypedResults for strongly-typed response documentation', 'Add endpoint filters for cross-cutting concerns in Minimal APIs'], dont: ['Mix Minimal APIs and Controllers in the same project without a clear boundary', 'Use Minimal APIs for complex APIs with many cross-cutting concerns (logging, auth, validation per action)', 'Put all endpoints in Program.cs — extract to extension methods or classes', 'Forget that Minimal APIs still support DI, middleware, and authorization', 'Choose based on team familiarity alone — consider the API complexity'], languages: ['csharp'] },

  { id: 'dotnet-ef-core-tracking', title: 'EF Core Change Tracking', category: 'dotnet-database', description: 'Manage Entity Framework Core change tracking for optimal performance and correctness.', do: ['Use AsNoTracking() for read-only queries (significant performance improvement)', 'Use AsNoTrackingWithIdentityResolution() when you need deduplication without tracking', 'Call SaveChangesAsync() once after all modifications in a unit of work', 'Use ExecuteUpdateAsync/ExecuteDeleteAsync for bulk operations (EF Core 7+)', 'Use explicit loading (Entry().Reference().Load()) when you need a single related entity'], dont: ['Track entities you only read — change tracker memory grows with each tracked entity', 'Call SaveChangesAsync() inside loops — batch operations and save once', 'Forget that tracked entities auto-detect changes on SaveChanges — this has a cost', 'Use Update() when only a few properties changed — modify properties directly', 'Mix tracked and untracked entities in the same operation — confusing behavior'], languages: ['csharp'] },

  { id: 'dotnet-options-pattern', title: 'Options Pattern for Configuration', category: 'dotnet-config', description: 'Use the ASP.NET Core Options pattern to bind configuration to strongly-typed classes.', do: ['Create a POCO class for each configuration section (JwtSettings, SmtpSettings)', 'Register with builder.Services.Configure<T>(builder.Configuration.GetSection("Key"))', 'Inject IOptions<T> for singleton config, IOptionsSnapshot<T> for scoped (reloadable)', 'Add validation with ValidateDataAnnotations() or ValidateOnStart()', 'Use the [Required] and [Range] attributes on options classes for startup validation'], dont: ['Read Configuration directly throughout the codebase — always bind to typed options', 'Use IOptions<T> when you need configuration that reloads — use IOptionsSnapshot<T>', 'Put secrets in appsettings.json — use User Secrets (dev) or Key Vault (prod)', 'Create one giant settings class — split by feature/concern', 'Forget ValidateOnStart() — without it, invalid config is only discovered at runtime'], languages: ['csharp'] },

  { id: 'dotnet-problem-details', title: 'ProblemDetails Error Responses', category: 'dotnet-api', description: 'Use RFC 7807 ProblemDetails for consistent, machine-readable API error responses.', do: ['Use app.UseExceptionHandler() with ProblemDetails for global error handling', 'Set Title, Detail, Status, and Type on ProblemDetail responses', 'Add custom extension properties for validation errors or error codes', 'Return 422 (Unprocessable Entity) for validation errors with field-level details', 'Use TypedResults.Problem() in Minimal APIs for consistent error format'], dont: ['Return plain strings or ad-hoc JSON objects for errors', 'Include stack traces or internal error details in production responses', 'Use 400 (Bad Request) for all client errors — use specific status codes', 'Return 200 with an error field — use proper HTTP status codes', 'Forget to set the Type URI — it helps clients programmatically handle errors'], languages: ['csharp'] },

  { id: 'dotnet-async-best-practices', title: 'Async Programming in .NET', category: 'dotnet-performance', description: 'Write correct async code to avoid deadlocks, thread pool starvation, and performance issues.', do: ['Use async/await all the way down — from controller to repository', 'Use ConfigureAwait(false) in library code (not in ASP.NET Core controllers)', 'Use ValueTask for hot paths that often complete synchronously', 'Prefer Task.WhenAll for independent concurrent operations', 'Use CancellationToken in all async methods and pass it through the chain'], dont: ['Use .Result or .Wait() on tasks — causes deadlocks in ASP.NET', 'Use async void except for event handlers — exceptions cannot be caught', 'Block on async code with Task.Run(() => AsyncMethod().Result) — thread pool starvation', 'Create unnecessary tasks with Task.Run for already-async operations', 'Forget to dispose IAsyncDisposable resources — use await using'], languages: ['csharp'] },

  // ── Go + React Best Practices ──────────────────────────────────────────

  { id: 'go-project-layout', title: 'Go Project Layout', category: 'go-architecture', description: 'Organize Go projects following standard conventions for clarity and maintainability.', do: ['Use cmd/ for application entry points (cmd/api/main.go, cmd/worker/main.go)', 'Use internal/ for private packages that cannot be imported by other modules', 'Use pkg/ sparingly for truly reusable library code', 'Group by domain (internal/user/, internal/order/) not by layer (controllers/, models/)', 'Keep main.go thin — wire dependencies and start the server, nothing else'], dont: ['Put everything in the root package — even small projects benefit from packages', 'Create a utils/ package — if it is util, it is not well-named', 'Use circular dependencies between packages — refactor shared types into a separate package', 'Nest packages too deeply — two levels (internal/user/repository.go) is usually enough', 'Copy the project-layout template blindly — only use what your project needs'], languages: ['go'] },

  { id: 'go-error-handling', title: 'Go Error Handling', category: 'go-reliability', description: 'Handle errors idiomatically in Go with wrapping, sentinel errors, and custom error types.', do: ['Always check returned errors — never use _ for errors you should handle', 'Wrap errors with context: fmt.Errorf("fetching user %d: %w", id, err)', 'Use sentinel errors (var ErrNotFound = errors.New("not found")) for expected error conditions', 'Use errors.Is() and errors.As() to check wrapped errors', 'Return errors instead of using panic for expected failure cases', 'Log errors at the top level — avoid logging and returning the same error'], dont: ['Ignore returned errors — the Go compiler warns about some, but not all', 'Use panic() for business logic errors — panic is for unrecoverable programming bugs', 'Create error strings with fmt.Sprintf — use fmt.Errorf with %w for wrapping', 'Check error strings with string comparison — use sentinel errors or error types', 'Wrap errors when re-returning without adding context — just return the original error'], languages: ['go'] },

  { id: 'go-goroutine-management', title: 'Goroutine Lifecycle Management', category: 'go-concurrency', description: 'Manage goroutine lifecycles to prevent leaks, deadlocks, and resource exhaustion.', do: ['Always pass context.Context and respect cancellation signals', 'Use sync.WaitGroup or errgroup.Group to wait for goroutine completion', 'Use buffered channels when the producer should not block', 'Set timeouts on all external calls: ctx, cancel := context.WithTimeout(ctx, 5*time.Second)', 'Use a worker pool pattern for bounded concurrency'], dont: ['Start goroutines without a way to stop them — goroutine leaks consume memory forever', 'Use unbuffered channels without ensuring both sender and receiver are ready', 'Share memory between goroutines without synchronization (mutex or channels)', 'Forget defer cancel() after context.WithTimeout/WithCancel', 'Use time.Sleep for synchronization — use channels, WaitGroups, or select'], languages: ['go'] },

  { id: 'go-database-connection-pool', title: 'Go Database Connection Pooling', category: 'go-database', description: 'Configure database connection pools correctly in Go for reliability and performance.', do: ['Set sql.DB.SetMaxOpenConns — default is unlimited, which can overwhelm the database', 'Set sql.DB.SetMaxIdleConns to a reasonable value (10-25) to reuse connections', 'Set sql.DB.SetConnMaxLifetime to prevent using stale connections (5 minutes)', 'Use context with timeouts for all database queries', 'Use connection pool monitoring to detect connection leaks'], dont: ['Leave MaxOpenConns at default (0 = unlimited) — this can exhaust database connections', 'Create a new sql.DB for each request — it is designed to be a long-lived pool', 'Use sql.Open without immediately calling db.Ping() to verify connectivity', 'Set MaxIdleConns > MaxOpenConns — idle connections will be closed immediately', 'Forget to close rows after query: defer rows.Close()'], languages: ['go'] },

  { id: 'go-api-versioning', title: 'API Versioning in Gin/Fiber', category: 'go-api', description: 'Version Go REST APIs for backward compatibility and smooth client migration.', do: ['Use URL path versioning: /api/v1/users, /api/v2/users', 'Group versioned routes: v1 := r.Group("/api/v1"); v2 := r.Group("/api/v2")', 'Share common middleware across versions, apply version-specific middleware per group', 'Keep old versions working while developing new ones — deprecate, do not remove', 'Document breaking changes and provide migration guides between versions'], dont: ['Use header-based versioning (Accept: application/vnd.myapi.v1+json) for public APIs — harder to discover', 'Change existing endpoint behavior without bumping the version', 'Maintain more than 2-3 active versions — sunset old versions on a schedule', 'Copy-paste entire handler code between versions — extract shared logic', 'Version internal microservice APIs the same way as public APIs — use semantic versioning instead'], languages: ['go'] },

];


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  STACK ANTI-PATTERNS                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export const STACK_ANTI_PATTERNS: AntiPattern[] = [

  // ── MERN Anti-Patterns ──────────────────────────────────────────────────

  { id: 'mern-callback-hell', name: 'Callback Hell in Mongoose/Node.js', description: 'Nesting multiple callback functions creating deeply indented, hard-to-read code.', whyBad: 'Callback pyramids are impossible to maintain, debug, or add error handling to. Each level of nesting adds complexity and makes the control flow unclear.', fix: 'Use async/await with try/catch. Mongoose supports promises natively since v5. Convert legacy callback APIs with util.promisify().', severity: 'high', badExample: 'User.findById(id, (err, user) => { if (err) return cb(err); Order.find({ userId: user._id }, (err, orders) => { if (err) return cb(err); Product.find({ _id: { $in: orders.map(o => o.productId) } }, (err, products) => { cb(null, { user, orders, products }); }); }); });', goodExample: 'async function getUserWithOrders(id: string) { const user = await User.findById(id).lean(); if (!user) throw new NotFoundError("User"); const orders = await Order.find({ userId: user._id }).lean(); const products = await Product.find({ _id: { $in: orders.map(o => o.productId) } }).lean(); return { user, orders, products }; }', tags: ['mern', 'mongodb', 'async', 'node'] },

  { id: 'mern-plaintext-passwords', name: 'Storing Passwords in Plaintext in MongoDB', description: 'Saving user passwords directly to MongoDB without hashing.', whyBad: 'If the database is compromised, all user passwords are immediately exposed. Users often reuse passwords across services, amplifying the damage.', fix: 'Hash passwords with bcrypt (cost factor 12+) before storing. Use a Mongoose pre-save hook to hash automatically. Never store or log plaintext passwords.', severity: 'critical', badExample: 'const user = new User({ email: req.body.email, password: req.body.password }); await user.save();', goodExample: 'userSchema.pre("save", async function(next) { if (!this.isModified("password")) return next(); this.password = await bcrypt.hash(this.password, 12); next(); });', tags: ['mern', 'security', 'mongodb', 'passwords'] },

  { id: 'mern-no-error-middleware', name: 'Missing Express Error Middleware', description: 'Express app without a centralized error handling middleware.', whyBad: 'Unhandled errors crash the server or return raw stack traces to clients. Each route must handle errors individually, leading to inconsistent error responses.', fix: 'Add a 4-parameter error middleware as the last middleware. Create custom error classes (NotFoundError, ValidationError) with appropriate status codes. Wrap async handlers.', severity: 'high', badExample: 'app.get("/users/:id", async (req, res) => { const user = await User.findById(req.params.id); res.json(user); }); // No error handling — crashes on invalid ID', goodExample: 'app.get("/users/:id", asyncHandler(async (req, res) => { const user = await User.findById(req.params.id); if (!user) throw new NotFoundError("User"); res.json(user); })); app.use((err, req, res, next) => { const status = err.statusCode || 500; res.status(status).json({ error: { message: err.message, code: err.code } }); });', tags: ['mern', 'express', 'error-handling'] },

  { id: 'mern-mutate-mongo-docs', name: 'Directly Mutating MongoDB Documents', description: 'Modifying document properties and relying on Mongoose change detection instead of using atomic update operators.', whyBad: 'Race conditions when multiple requests modify the same document concurrently. Mongoose change detection misses some modifications, leading to data loss.', fix: 'Use atomic update operators ($set, $inc, $push, $pull) with findByIdAndUpdate(). Use $inc for counters to avoid race conditions. Use $push/$pull for array modifications.', severity: 'medium', badExample: 'const product = await Product.findById(id); product.stock = product.stock - 1; await product.save(); // Race condition: two concurrent requests can both read stock=10', goodExample: 'await Product.findByIdAndUpdate(id, { $inc: { stock: -1 } }, { new: true }); // Atomic — no race condition', tags: ['mern', 'mongodb', 'concurrency'] },

  { id: 'mern-no-lean', name: 'Missing .lean() on Read-Only Mongoose Queries', description: 'Fetching full Mongoose documents when only plain data is needed for API responses.', whyBad: 'Mongoose documents include change tracking, virtuals, methods, and other overhead. For read-only operations (GET endpoints), this wastes memory and CPU (2-5x slower than plain objects).', fix: 'Add .lean() to all read-only queries. It returns plain JavaScript objects instead of Mongoose documents. Only skip .lean() when you need to call document methods (.save(), .validate()).', severity: 'medium', badExample: 'const users = await User.find({ isActive: true }).sort({ createdAt: -1 }).limit(100); // Full Mongoose documents with change tracking', goodExample: 'const users = await User.find({ isActive: true }).sort({ createdAt: -1 }).limit(100).lean(); // Plain objects, 2-5x faster', tags: ['mern', 'mongodb', 'performance'] },

  // ── Django Anti-Patterns ────────────────────────────────────────────────

  { id: 'django-n-plus-one-drf', name: 'N+1 Queries in DRF Serializers', description: 'DRF serializers that access related objects without prefetching, causing one query per item in a list.', whyBad: 'A list of 50 articles with author names generates 51 queries (1 for articles + 50 for authors). API response time scales linearly with list size.', fix: 'Override get_queryset() in the viewset to add select_related() for ForeignKey and prefetch_related() for ManyToMany. Use SerializerMethodField with pre-fetched data.', severity: 'critical', badExample: 'class ArticleSerializer(serializers.ModelSerializer): author_name = serializers.CharField(source="author.username") # Triggers a query per article\n    class Meta: model = Article; fields = ["title", "author_name"]', goodExample: 'class ArticleViewSet(viewsets.ModelViewSet):\n    queryset = Article.objects.select_related("author").all() # Single JOIN query\n    serializer_class = ArticleSerializer', tags: ['django', 'drf', 'database', 'performance'] },

  { id: 'django-fat-views', name: 'Fat Views (Business Logic in Views)', description: 'Writing complex business logic directly in Django views or DRF viewsets.', whyBad: 'Views become unmaintainable, untestable, and unreusable. The same logic cannot be called from Celery tasks, management commands, or other views without code duplication.', fix: 'Extract business logic into service classes or functions. Views should only handle HTTP concerns: parse request, call service, format response. Services are pure Python and easily testable.', severity: 'high', badExample: 'class OrderView(APIView):\n    def post(self, request):\n        cart = Cart.objects.get(user=request.user)\n        if cart.items.count() == 0: return Response({"error": "empty"}, status=400)\n        order = Order.objects.create(user=request.user, total=0)\n        for item in cart.items.all():\n            if item.product.stock < item.quantity: ...\n            OrderItem.objects.create(order=order, ...)\n            item.product.stock -= item.quantity; item.product.save()\n        order.total = sum(...); order.save()\n        send_email(...)\n        return Response(OrderSerializer(order).data)', goodExample: 'class OrderView(APIView):\n    def post(self, request):\n        order = OrderService.create_from_cart(request.user)\n        return Response(OrderSerializer(order).data, status=201)', tags: ['django', 'architecture', 'maintainability'] },

  { id: 'django-debug-production', name: 'DEBUG=True in Production', description: 'Running Django with DEBUG=True in a production environment.', whyBad: 'DEBUG=True exposes sensitive information: full settings, SQL queries, template paths, and detailed stack traces. It also disables security features (ALLOWED_HOSTS checking) and causes memory leaks (all SQL queries are stored in memory).', fix: 'Set DEBUG=False via environment variable. Configure ALLOWED_HOSTS. Set up proper error logging. Use Sentry or similar for error tracking. Configure custom 404/500 error pages.', severity: 'critical', badExample: 'DEBUG = True  # settings.py in production', goodExample: 'DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"  # False in production', tags: ['django', 'security', 'deployment'] },

  { id: 'django-missing-indexes', name: 'Missing Database Indexes on FK Fields', description: 'Foreign key fields and frequently-queried columns without database indexes.', whyBad: 'Queries filtering on un-indexed columns do full table scans. JOINs on un-indexed foreign keys are extremely slow as tables grow. A table with 1M rows can take seconds instead of milliseconds.', fix: 'Add db_index=True on frequently-queried fields. Use Meta.indexes for compound indexes. Django auto-indexes ForeignKey fields, but manually verify with EXPLAIN ANALYZE. Add indexes for filter, order_by, and unique combinations.', severity: 'high', badExample: 'class Article(models.Model):\n    status = models.CharField(max_length=20)  # No index — full scan for Article.objects.filter(status="published")\n    published_at = models.DateTimeField()  # No index — slow ordering', goodExample: 'class Article(models.Model):\n    status = models.CharField(max_length=20, db_index=True)\n    published_at = models.DateTimeField(db_index=True)\n    class Meta:\n        indexes = [models.Index(fields=["status", "-published_at"])]', tags: ['django', 'database', 'performance'] },

  { id: 'django-sync-celery', name: 'Synchronous Tasks That Should Be Async', description: 'Performing time-consuming operations (email, PDF generation, API calls) synchronously in request/response cycle.', whyBad: 'Users wait for slow operations to complete before getting a response. If the external service is slow or down, the request times out. Under load, synchronous tasks tie up all web server workers.', fix: 'Use Celery for any operation that takes more than 200ms or calls external services. Return 202 Accepted immediately and process asynchronously. Use WebSocket or polling for status updates.', severity: 'high', badExample: 'def create_order(request):\n    order = Order.objects.create(...)\n    send_confirmation_email(order)  # 2-5 seconds waiting for SMTP\n    generate_invoice_pdf(order)     # 1-3 seconds for PDF generation\n    notify_warehouse_api(order)     # 0.5-2 seconds for HTTP call\n    return Response({"id": order.id})  # User waited 4-10 seconds!', goodExample: 'def create_order(request):\n    order = Order.objects.create(...)\n    send_confirmation_email.delay(order.id)   # Queued, returns instantly\n    generate_invoice_pdf.delay(order.id)      # Queued, returns instantly\n    notify_warehouse_api.delay(order.id)      # Queued, returns instantly\n    return Response({"id": order.id}, status=202)  # Instant response', tags: ['django', 'celery', 'performance', 'async'] },

  // ── Spring Boot Anti-Patterns ──────────────────────────────────────────

  { id: 'spring-logic-in-controller', name: 'Business Logic in Spring Controllers', description: 'Putting database queries, validation, and business rules directly in controller methods.', whyBad: 'Controllers become bloated and untestable. Business logic cannot be reused by other controllers, scheduled tasks, or message consumers. Testing requires full HTTP context.', fix: 'Move all business logic to @Service classes. Controllers should only parse HTTP input, call the service, and format the response. Test services independently with mocks.', severity: 'high', badExample: '@PostMapping public ResponseEntity<?> create(@RequestBody OrderRequest req) { User user = userRepo.findById(req.getUserId()).orElseThrow(); if (user.getBalance() < req.getTotal()) throw new RuntimeException("Insufficient funds"); Order order = new Order(); order.setUser(user); for (var item : req.getItems()) { Product p = productRepo.findById(item.getId()).orElseThrow(); /* ... */ } orderRepo.save(order); emailService.send(user.getEmail(), "order confirmed"); return ResponseEntity.ok(order); }', goodExample: '@PostMapping public ResponseEntity<OrderDTO> create(@Valid @RequestBody OrderRequest req) { OrderDTO order = orderService.createOrder(req); return ResponseEntity.status(201).body(order); }', tags: ['spring', 'architecture', 'java'] },

  { id: 'spring-missing-transactional', name: 'Missing @Transactional on Write Operations', description: 'Service methods that modify multiple database records without transaction management.', whyBad: 'If an error occurs mid-operation, some records are saved and others are not, leaving the database in an inconsistent state. Partial writes corrupt data relationships.', fix: 'Add @Transactional to all service methods that write data. The entire method runs in a single transaction — if any exception occurs, all changes roll back. Use @Transactional(readOnly = true) for read-only methods.', severity: 'critical', badExample: 'public void transferFunds(Long fromId, Long toId, BigDecimal amount) { Account from = accountRepo.findById(fromId).orElseThrow(); from.setBalance(from.getBalance().subtract(amount)); accountRepo.save(from); // Saved! Account to = accountRepo.findById(toId).orElseThrow(); // If this throws, from is debited but to is not credited to.setBalance(to.getBalance().add(amount)); accountRepo.save(to); }', goodExample: '@Transactional public void transferFunds(Long fromId, Long toId, BigDecimal amount) { Account from = accountRepo.findById(fromId).orElseThrow(); Account to = accountRepo.findById(toId).orElseThrow(); from.setBalance(from.getBalance().subtract(amount)); to.setBalance(to.getBalance().add(amount)); // Both save in one transaction — atomic }', tags: ['spring', 'database', 'transaction', 'java'] },

  { id: 'spring-n-plus-one-lazy', name: 'N+1 Lazy Loading in JPA/Hibernate', description: 'Accessing lazy-loaded relationships in a loop, triggering one SQL query per entity.', whyBad: 'Loading 100 orders with their items generates 101 queries. This is the #1 performance problem in JPA applications and causes exponential slowdown as data grows.', fix: 'Use @EntityGraph or JOIN FETCH in JPQL to eagerly load needed relationships. Use projections/DTOs to select only needed fields. Enable Hibernate query logging in development to detect N+1 queries.', severity: 'critical', badExample: 'List<Order> orders = orderRepo.findAll(); // 1 query for (Order order : orders) { order.getItems().size(); // N queries — one per order! order.getCustomer().getName(); // N more queries! }', goodExample: '@Query("SELECT o FROM Order o JOIN FETCH o.items JOIN FETCH o.customer WHERE o.status = :status") List<Order> findWithDetails(@Param("status") OrderStatus status);', tags: ['spring', 'jpa', 'hibernate', 'performance', 'java'] },

  { id: 'spring-expose-entities', name: 'Exposing JPA Entities in API Responses', description: 'Returning JPA entity objects directly from REST controllers without mapping to DTOs.', whyBad: 'Exposes internal database structure, lazy-loading proxies, and potentially sensitive fields. Bidirectional relationships cause infinite JSON recursion. Changes to entities break the API contract. Hibernate proxies may throw LazyInitializationException during serialization.', fix: 'Always map entities to DTOs in the service layer. DTOs represent the API contract and are independent of the database schema. Use MapStruct or manual mapping.', severity: 'high', badExample: '@GetMapping("/{id}") public User getUser(@PathVariable Long id) { return userRepo.findById(id).orElseThrow(); // Exposes password hash, internal IDs, Hibernate proxies }', goodExample: '@GetMapping("/{id}") public UserDTO getUser(@PathVariable Long id) { return userService.findById(id); // Returns a clean DTO without internal fields }', tags: ['spring', 'api', 'security', 'java'] },

  { id: 'spring-no-controller-advice', name: 'No Global Exception Handler (@ControllerAdvice)', description: 'Spring Boot application without centralized exception handling, relying on default error pages.', whyBad: 'Default Spring error responses expose internal details (stack traces, class names). Each controller must handle exceptions individually, leading to inconsistent error formats. Unhandled exceptions return generic 500 errors with no useful information.', fix: 'Create a @RestControllerAdvice class with @ExceptionHandler methods for each exception type. Return ProblemDetail (RFC 7807) for consistent error responses. Log unhandled exceptions with full context.', severity: 'high', badExample: '// No exception handler — Spring returns: {"timestamp":"...","status":500,"error":"Internal Server Error","path":"/api/users"}', goodExample: '@RestControllerAdvice public class GlobalExceptionHandler { @ExceptionHandler(ResourceNotFoundException.class) public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) { ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage()); pd.setTitle("Not Found"); return ResponseEntity.status(404).body(pd); } }', tags: ['spring', 'error-handling', 'api', 'java'] },

  // ── .NET Anti-Patterns ──────────────────────────────────────────────────

  { id: 'dotnet-sync-blocking', name: 'Synchronous Blocking in ASP.NET Core (.Result/.Wait())', description: 'Calling .Result or .Wait() on async tasks in ASP.NET Core, blocking the thread pool.', whyBad: 'ASP.NET Core uses a limited thread pool. Blocking on async code ties up a thread that cannot serve other requests. Under load, all threads are blocked waiting for async operations, causing thread pool starvation and application hangs.', fix: 'Use async/await all the way through the call stack. Every method from controller to repository should be async. If you must call async from sync code (rare), use Task.Run() in a background service, not in request handlers.', severity: 'critical', badExample: 'public UserDto GetUser(int id) { var user = _dbContext.Users.FindAsync(id).Result; // BLOCKS the thread return new UserDto(user); }', goodExample: 'public async Task<UserDto> GetUserAsync(int id) { var user = await _dbContext.Users.FindAsync(id); // Non-blocking return new UserDto(user); }', tags: ['dotnet', 'async', 'performance', 'csharp'] },

  { id: 'dotnet-no-tracking-missing', name: 'Missing AsNoTracking() for Read-Only EF Core Queries', description: 'EF Core queries that track all entities even when they are only read and never modified.', whyBad: 'Change tracker stores a snapshot of every tracked entity. For list endpoints returning hundreds of records, this wastes significant memory and CPU. The tracker also slows down SaveChanges by checking all tracked entities for changes.', fix: 'Add .AsNoTracking() to all read-only queries (GET endpoints, reports, searches). Only track entities when you intend to modify and save them. Use .AsNoTrackingWithIdentityResolution() when you need deduplication.', severity: 'medium', badExample: 'var users = await _db.Users.Where(u => u.IsActive).ToListAsync(); // All 1000 users are tracked in memory', goodExample: 'var users = await _db.Users.AsNoTracking().Where(u => u.IsActive).ToListAsync(); // No tracking overhead', tags: ['dotnet', 'ef-core', 'performance', 'csharp'] },

  { id: 'dotnet-secrets-in-appsettings', name: 'Secrets in appsettings.json', description: 'Storing database connection strings, API keys, and JWT secrets directly in appsettings.json.', whyBad: 'appsettings.json is committed to source control, exposing secrets to anyone with repository access. Even if the file is gitignored, it exists on every developer machine in plaintext.', fix: 'Use User Secrets in development (dotnet user-secrets set). Use environment variables or Azure Key Vault / AWS Secrets Manager in production. Use builder.Configuration["Key"] which reads from multiple sources.', severity: 'critical', badExample: '// appsettings.json: { "ConnectionStrings": { "Default": "Server=prod.db.com;Password=S3cret!" }, "Jwt": { "Key": "my-super-secret-key" } }', goodExample: '// Use environment variables: ConnectionStrings__Default=Server=..., or User Secrets for dev, Key Vault for prod. appsettings.json only has non-sensitive config.', tags: ['dotnet', 'security', 'config', 'csharp'] },

  { id: 'dotnet-no-global-exception', name: 'Missing Global Exception Handler in ASP.NET Core', description: 'No centralized error handling, causing raw exceptions to reach clients.', whyBad: 'Unhandled exceptions return the default developer exception page (in Development) or a generic 500 error (in Production) with no useful information. Different endpoints return errors in different formats.', fix: 'Use app.UseExceptionHandler() middleware or implement IExceptionHandler (.NET 8+). Return ProblemDetails (RFC 7807) for all errors. Log the full exception server-side.', severity: 'high', badExample: '// No exception handler configured — raw exceptions leak to clients', goodExample: 'app.UseExceptionHandler(appError => { appError.Run(async context => { context.Response.StatusCode = 500; context.Response.ContentType = "application/problem+json"; await context.Response.WriteAsJsonAsync(new ProblemDetails { Title = "Internal Error", Status = 500, Detail = "An unexpected error occurred" }); }); });', tags: ['dotnet', 'error-handling', 'api', 'csharp'] },

  { id: 'dotnet-dbcontext-singleton', name: 'DbContext Registered as Singleton', description: 'Registering EF Core DbContext with AddSingleton instead of AddDbContext/AddScoped.', whyBad: 'DbContext is not thread-safe. A singleton DbContext shared across concurrent requests causes data corruption, stale data, and random exceptions. Change tracker grows unboundedly, consuming more memory over time.', fix: 'Use builder.Services.AddDbContext<AppDbContext>() which registers as Scoped by default. Each HTTP request gets its own DbContext instance. Use IDbContextFactory<T> for background services.', severity: 'critical', badExample: 'builder.Services.AddSingleton<AppDbContext>(); // WRONG — shared across all requests', goodExample: 'builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString)); // Scoped — one per request', tags: ['dotnet', 'ef-core', 'threading', 'csharp'] },

  // ── Go + React Anti-Patterns ──────────────────────────────────────────

  { id: 'go-goroutine-leak', name: 'Goroutine Leaks (No Context Cancellation)', description: 'Starting goroutines without passing context or providing a way to cancel them.', whyBad: 'Goroutines without cancellation run forever if the parent operation is cancelled or times out. Over time, leaked goroutines accumulate, consuming memory and CPU. In long-running servers, this causes gradual performance degradation and eventual OOM.', fix: 'Always pass context.Context to goroutines. Use context.WithCancel or context.WithTimeout. Check ctx.Done() in long-running goroutines. Use errgroup.Group for managing goroutine lifecycles.', severity: 'critical', badExample: 'func handler(w http.ResponseWriter, r *http.Request) { go func() { for { sendMetrics() // Runs forever even after request is done time.Sleep(time.Second) } }() }', goodExample: 'func handler(w http.ResponseWriter, r *http.Request) { ctx := r.Context(); go func() { for { select { case <-ctx.Done(): return // Stop when request is cancelled default: sendMetrics(); time.Sleep(time.Second) } } }() }', tags: ['go', 'concurrency', 'memory-leak'] },

  { id: 'go-ignored-errors', name: 'Ignoring Returned Errors in Go', description: 'Using _ to discard error return values or not checking err at all.', whyBad: 'Errors are Go\'s primary error reporting mechanism. Ignoring errors leads to silent failures, corrupted data, and impossible-to-debug issues. The program continues with invalid state.', fix: 'Always check error returns. If you truly cannot handle the error, log it. Use errcheck linter to catch ignored errors at build time.', severity: 'high', badExample: 'file, _ := os.Open("config.json") // Ignores file-not-found error\ndata, _ := io.ReadAll(file)        // Panic: nil pointer dereference\njson.Unmarshal(data, &config)      // Ignores parse error', goodExample: 'file, err := os.Open("config.json")\nif err != nil { return fmt.Errorf("opening config: %w", err) }\ndefer file.Close()\ndata, err := io.ReadAll(file)\nif err != nil { return fmt.Errorf("reading config: %w", err) }\nif err := json.Unmarshal(data, &config); err != nil { return fmt.Errorf("parsing config: %w", err) }', tags: ['go', 'error-handling', 'reliability'] },

  { id: 'go-panic-business-logic', name: 'Using panic() for Business Logic Errors', description: 'Using panic instead of returning errors for expected failure cases like "user not found" or "invalid input".', whyBad: 'panic is meant for unrecoverable programming bugs (nil pointer, out of bounds). Using it for business logic errors crashes the program unless recovered. It bypasses the error handling chain and makes the code unpredictable.', fix: 'Return errors for all expected failure cases. Use sentinel errors (var ErrNotFound = errors.New("not found")) or custom error types. Reserve panic for truly unrecoverable situations (corrupted state, missing required configuration at startup).', severity: 'high', badExample: 'func GetUser(id uint) *User { user, err := db.Find(id); if err != nil { panic("user not found") } // Crashes the server! return user }', goodExample: 'func GetUser(id uint) (*User, error) { user, err := db.Find(id); if err != nil { return nil, fmt.Errorf("finding user %d: %w", id, err) } return user, nil }', tags: ['go', 'error-handling', 'architecture'] },

  { id: 'go-global-mutable-state', name: 'Global Mutable State Without Mutex', description: 'Using global variables accessed by multiple goroutines without synchronization.', whyBad: 'Concurrent reads and writes to global state cause data races. Go detects some with -race flag, but not all. Data races lead to corrupted data, intermittent panics, and security vulnerabilities.', fix: 'Use sync.Mutex or sync.RWMutex to protect shared state. Better yet, avoid global state entirely — pass dependencies via function parameters or struct fields. Use channels for communication between goroutines.', severity: 'critical', badExample: 'var cache = map[string]string{} // Global, no mutex\n\nfunc SetCache(k, v string) { cache[k] = v }  // DATA RACE\nfunc GetCache(k string) string { return cache[k] }', goodExample: 'type SafeCache struct { mu sync.RWMutex; data map[string]string }\nfunc (c *SafeCache) Set(k, v string) { c.mu.Lock(); defer c.mu.Unlock(); c.data[k] = v }\nfunc (c *SafeCache) Get(k string) string { c.mu.RLock(); defer c.mu.RUnlock(); return c.data[k] }', tags: ['go', 'concurrency', 'data-race'] },

  { id: 'go-gorm-n-plus-one', name: 'N+1 Queries with GORM (Missing Preload)', description: 'Accessing related GORM models in a loop without using Preload() to eager-load relationships.', whyBad: 'Each access to a related model triggers a separate database query. Loading 100 orders with their items generates 101 queries instead of 2. Response time grows linearly with data volume.', fix: 'Use db.Preload("RelationName") to eager-load relationships in a single additional query. Use db.Joins() for filtering on related fields. Use db.Preload(clause.Associations) to load all associations.', severity: 'critical', badExample: 'var orders []Order\ndb.Find(&orders)\nfor _, order := range orders {\n    db.Model(&order).Association("Items").Find(&order.Items) // N queries!\n}', goodExample: 'var orders []Order\ndb.Preload("Items").Preload("Items.Product").Find(&orders) // 3 queries total', tags: ['go', 'gorm', 'database', 'performance'] },

];


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENDED STACK CODE SNIPPETS                                           ║
// ║  Additional production patterns for all 5 stacks                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_SNIPPETS: CodeSnippet[] = [

  // ── MERN Extended Snippets ─────────────────────────────────────────────

  {
    id: 'mern-mongoose-plugin-timestamps',
    title: 'Mongoose Plugin for Soft Deletes and Audit Trail',
    description: 'Reusable Mongoose plugin that adds soft delete functionality and audit trail to any schema.',
    tech: ['mongodb', 'mongoose', 'typescript', 'node'],
    tags: ['mern', 'database', 'plugin', 'audit'],
    code: `import { Schema, Query, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';

interface SoftDeleteDocument extends Document {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  lastModifiedBy: string | null;
  softDelete(userId: string): Promise<this>;
  restore(): Promise<this>;
}

export function softDeletePlugin(schema: Schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    lastModifiedBy: { type: String, default: null },
  });

  schema.methods.softDelete = async function (userId: string) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
  };

  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };

  const excludeDeleted = function (this: Query<any, any>) {
    const conditions = this.getFilter();
    if (conditions.isDeleted === undefined) {
      this.where({ isDeleted: false });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);

  schema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
    if (this.isModified() && !this.isNew) {
      const userId = (this as any)._currentUserId;
      if (userId) {
        (this as any).lastModifiedBy = userId;
      }
    }
    next();
  });
}

export function paginationPlugin(schema: Schema) {
  schema.statics.paginate = async function (
    filter: Record<string, any> = {},
    options: {
      page?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
      populate?: string | string[];
      select?: string;
      lean?: boolean;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    let query = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate) {
      const populates = Array.isArray(options.populate)
        ? options.populate
        : [options.populate];
      populates.forEach((p: string) => {
        query = query.populate(p);
      });
    }

    if (options.select) {
      query = query.select(options.select);
    }

    if (options.lean !== false) {
      query = query.lean();
    }

    const [docs, total] = await Promise.all([
      query.exec(),
      this.countDocuments(filter),
    ]);

    return {
      data: docs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  };
}`,
  },

  {
    id: 'mern-socket-io-chat',
    title: 'Socket.IO Real-Time Chat Server with Rooms',
    description: 'Real-time chat implementation with Socket.IO, rooms, typing indicators, and message history.',
    tech: ['socket.io', 'express', 'typescript', 'node'],
    tags: ['mern', 'websocket', 'real-time', 'chat'],
    code: `import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Message, IMessage } from '../models/Message';
import { Room } from '../models/Room';

interface SocketUser {
  userId: string;
  username: string;
  socketId: string;
}

const onlineUsers = new Map<string, SocketUser>();

export function initSocketServer(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        username: string;
      };
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, username } = socket.data;
    console.log(\`User connected: \${username} (\${socket.id})\`);

    onlineUsers.set(userId, { userId, username, socketId: socket.id });
    io.emit('users:online', Array.from(onlineUsers.values()));

    socket.on('room:join', async (roomId: string) => {
      socket.join(roomId);
      const messages = await Message.find({ roomId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      socket.emit('room:history', { roomId, messages: messages.reverse() });
      socket.to(roomId).emit('room:user-joined', { userId, username, roomId });
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('room:user-left', { userId, username, roomId });
    });

    socket.on(
      'message:send',
      async (data: { roomId: string; content: string; type?: string }) => {
        const message = await Message.create({
          roomId: data.roomId,
          senderId: userId,
          senderName: username,
          content: data.content,
          type: data.type || 'text',
        });

        io.to(data.roomId).emit('message:new', message.toJSON());
      }
    );

    socket.on('message:typing', (data: { roomId: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit('message:typing', {
        userId,
        username,
        isTyping: data.isTyping,
      });
    });

    socket.on('message:read', async (data: { roomId: string; messageId: string }) => {
      await Message.findByIdAndUpdate(data.messageId, {
        $addToSet: { readBy: userId },
      });
      socket.to(data.roomId).emit('message:read', {
        messageId: data.messageId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('users:online', Array.from(onlineUsers.values()));
      console.log(\`User disconnected: \${username}\`);
    });
  });

  return io;
}`,
  },

  {
    id: 'mern-file-upload-service',
    title: 'Express File Upload Service with Multer and S3',
    description: 'File upload middleware with validation, S3 storage, image resizing, and URL generation.',
    tech: ['express', 'multer', 'aws-s3', 'typescript', 'node'],
    tags: ['mern', 'file-upload', 's3', 'middleware'],
    code: `import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
};

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  avatar: 2 * 1024 * 1024,
};

function createUploadMiddleware(category: keyof typeof ALLOWED_MIME_TYPES) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZES[category] },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES[category].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(\`Invalid file type. Allowed: \${ALLOWED_MIME_TYPES[category].join(', ')}\`));
      }
    },
  });
}

function generateKey(originalName: string, folder: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const date = new Date().toISOString().split('T')[0];
  return \`\${folder}/\${date}/\${hash}\${ext}\`;
}

export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string
): Promise<{ key: string; url: string }> {
  const key = generateKey(originalName, folder);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'max-age=31536000',
    })
  );

  const url = \`https://\${BUCKET}.s3.amazonaws.com/\${key}\`;
  return { key, url };
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export const uploadImage = createUploadMiddleware('image');
export const uploadDocument = createUploadMiddleware('document');
export const uploadAvatar = createUploadMiddleware('avatar');

export function handleUploadError(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(415).json({ error: err.message });
  }
  next(err);
}`,
  },

  {
    id: 'mern-react-auth-context',
    title: 'React Auth Context with Token Refresh',
    description: 'Complete React authentication context with login, logout, token refresh, and protected route wrapper.',
    tech: ['react', 'typescript'],
    tags: ['mern', 'react', 'auth', 'context'],
    code: `import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface User {
  _id: string;
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

async function authFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });

  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      return fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        credentials: 'include',
      });
    }
    throw new Error('Session expired');
  }

  return res;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          scheduleRefresh();
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }, 13 * 60 * 1000);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          scheduleRefresh();
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Login failed');
    }
    const data = await res.json();
    setUser(data.user);
    scheduleRefresh();
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Registration failed');
    }
    const data = await res.json();
    setUser(data.user);
    scheduleRefresh();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) { window.location.href = '/login'; return null; }
  if (roles && user && !roles.includes(user.role)) return <div className="p-8 text-center"><h1 className="text-2xl font-bold text-red-600">Access Denied</h1><p>You do not have permission to view this page.</p></div>;

  return <>{children}</>;
}`,
  },

  {
    id: 'mern-express-rate-limiter-advanced',
    title: 'Advanced Express Rate Limiter with Redis Store',
    description: 'Production rate limiting with Redis backend, sliding window, per-user limits, and IP whitelist support.',
    tech: ['express', 'redis', 'typescript', 'node'],
    tags: ['mern', 'rate-limiting', 'security', 'redis'],
    code: `import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
}

const defaultKeyGenerator = (req: Request): string => {
  const userId = (req as any).user?.userId;
  if (userId) return \`user:\${userId}\`;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  return \`ip:\${ip}\`;
};

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'rl',
    keyGenerator = defaultKeyGenerator,
    skipIf,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    headers = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skipIf?.(req)) return next();

    const identifier = keyGenerator(req);
    const key = \`\${keyPrefix}:\${identifier}\`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now.toString(), \`\${now}:\${Math.random()}\`);
      pipeline.zcard(key);
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();
      const requestCount = (results?.[2]?.[1] as number) || 0;

      if (headers) {
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount));
        res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      }

      if (requestCount > maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(statusCode).json({
          error: {
            message,
            code: 'RATE_LIMITED',
            retryAfter,
          },
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter] Redis error:', err);
      next();
    }
  };
}

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'rl:api',
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl:auth',
  message: 'Too many login attempts, please try again in 15 minutes',
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 50,
  keyPrefix: 'rl:upload',
});`,
  },

  // ── Django Extended Snippets ────────────────────────────────────────────

  {
    id: 'django-custom-user-model',
    title: 'Django Custom User Model with Manager',
    description: 'Custom User model replacing Django default with email-based auth, custom manager, and profile fields.',
    tech: ['django', 'python', 'postgresql'],
    tags: ['django', 'auth', 'user-model', 'custom'],
    code: `from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        USER = 'user', 'User'
        MODERATOR = 'moderator', 'Moderator'
        ADMIN = 'admin', 'Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)

    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role', 'is_active']),
        ]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        name = f'{self.first_name} {self.last_name}'.strip()
        return name or self.email

    def update_last_login(self, ip_address=None):
        self.last_login_at = timezone.now()
        if ip_address:
            self.last_login_ip = ip_address
        self.save(update_fields=['last_login_at', 'last_login_ip'])`,
  },

  {
    id: 'django-middleware-custom',
    title: 'Django Custom Middleware for Request Logging and Timing',
    description: 'Custom Django middleware for request/response logging, performance timing, and request ID tracking.',
    tech: ['django', 'python'],
    tags: ['django', 'middleware', 'logging', 'monitoring'],
    code: `import logging
import time
import uuid
from django.http import HttpRequest, HttpResponse

logger = logging.getLogger('api.requests')


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.start_time = time.monotonic()
        request.request_id = str(uuid.uuid4())[:8]

        response = self.get_response(request)

        duration_ms = (time.monotonic() - request.start_time) * 1000
        response['X-Request-ID'] = request.request_id
        response['X-Response-Time'] = f'{duration_ms:.2f}ms'

        log_data = {
            'request_id': request.request_id,
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': round(duration_ms, 2),
            'user': getattr(request, 'user', None) and request.user.is_authenticated and request.user.email or 'anonymous',
            'ip': self.get_client_ip(request),
        }

        if response.status_code >= 500:
            logger.error('Request failed', extra=log_data)
        elif response.status_code >= 400:
            logger.warning('Client error', extra=log_data)
        elif duration_ms > 1000:
            logger.warning('Slow request', extra=log_data)
        else:
            logger.info('Request completed', extra=log_data)

        return response

    @staticmethod
    def get_client_ip(request: HttpRequest) -> str:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')


class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.method == 'OPTIONS':
            response = HttpResponse()
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response['Access-Control-Max-Age'] = '86400'
            return response

        response = self.get_response(request)
        response['Access-Control-Allow-Origin'] = '*'
        return response


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        from django.conf import settings
        from django.http import JsonResponse

        if getattr(settings, 'MAINTENANCE_MODE', False):
            if not request.path.startswith('/admin/') and not request.path.startswith('/health/'):
                return JsonResponse(
                    {
                        'error': 'Service temporarily unavailable',
                        'message': 'We are performing scheduled maintenance. Please try again later.',
                    },
                    status=503,
                )

        return self.get_response(request)`,
  },

  {
    id: 'django-management-command',
    title: 'Django Management Command with Progress Bar and Error Handling',
    description: 'Custom Django management command for data import with argument parsing, progress reporting, and transactional safety.',
    tech: ['django', 'python'],
    tags: ['django', 'management-command', 'cli', 'data-import'],
    code: `import csv
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from api.models import Article, Category, User


class Command(BaseCommand):
    help = 'Import articles from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')
        parser.add_argument(
            '--author',
            type=str,
            required=True,
            help='Email of the author to assign articles to',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate data without saving to the database',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process in each batch (default: 100)',
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Continue processing on row errors instead of aborting',
        )

    def handle(self, *args, **options):
        csv_path = Path(options['csv_file'])
        if not csv_path.exists():
            raise CommandError(f'CSV file not found: {csv_path}')

        try:
            author = User.objects.get(email=options['author'])
        except User.DoesNotExist:
            raise CommandError(f'Author not found: {options["author"]}')

        dry_run = options['dry_run']
        batch_size = options['batch_size']
        skip_errors = options['skip_errors']

        stats = {'created': 0, 'skipped': 0, 'errors': 0, 'total': 0}
        errors = []

        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            required_fields = {'title', 'body'}
            if not required_fields.issubset(set(reader.fieldnames or [])):
                raise CommandError(f'CSV must contain columns: {required_fields}')

            rows = list(reader)
            stats['total'] = len(rows)

        self.stdout.write(f'Processing {stats["total"]} rows...')

        articles_to_create = []

        for i, row in enumerate(rows, start=1):
            try:
                title = row['title'].strip()
                body = row['body'].strip()

                if not title or not body:
                    stats['skipped'] += 1
                    continue

                if Article.objects.filter(title=title, author=author).exists():
                    stats['skipped'] += 1
                    continue

                category = None
                if row.get('category'):
                    category, _ = Category.objects.get_or_create(
                        name=row['category'].strip(),
                        defaults={'slug': row['category'].strip().lower().replace(' ', '-')},
                    )

                articles_to_create.append(
                    Article(
                        title=title,
                        body=body,
                        author=author,
                        category=category,
                        status=row.get('status', 'draft'),
                        tags=row.get('tags', '').split(',') if row.get('tags') else [],
                    )
                )
                stats['created'] += 1

            except Exception as e:
                stats['errors'] += 1
                errors.append(f'Row {i}: {str(e)}')
                if not skip_errors:
                    raise CommandError(f'Error at row {i}: {e}')

            if i % 100 == 0:
                self.stdout.write(f'  Processed {i}/{stats["total"]}...')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no data saved'))
        else:
            with transaction.atomic():
                for batch_start in range(0, len(articles_to_create), batch_size):
                    batch = articles_to_create[batch_start:batch_start + batch_size]
                    Article.objects.bulk_create(batch, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(
            f'Done: {stats["created"]} created, {stats["skipped"]} skipped, {stats["errors"]} errors'
        ))
        if errors:
            self.stdout.write(self.style.ERROR('Errors:'))
            for err in errors[:20]:
                self.stdout.write(f'  {err}')`,
  },

  {
    id: 'django-signals-service',
    title: 'Django Signals for Side Effects and Event Publishing',
    description: 'Using Django signals for decoupled side effects like notification sending, cache invalidation, and activity logging.',
    tech: ['django', 'python'],
    tags: ['django', 'signals', 'events', 'decoupled'],
    code: `from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver, Signal
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

order_placed = Signal()
order_status_changed = Signal()


@receiver(post_save, sender='api.Article')
def article_post_save(sender, instance, created, **kwargs):
    cache.delete_many([
        f'article:{instance.pk}',
        f'article_list:page:1',
        f'article_list:category:{instance.category_id}',
        f'user_articles:{instance.author_id}',
    ])

    if created:
        from api.tasks import send_notification_email
        followers = instance.author.followers.values_list('id', flat=True)
        for follower_id in followers[:100]:
            send_notification_email.delay(
                follower_id,
                'new_article',
                {'article_title': instance.title, 'author_name': instance.author.full_name},
            )


@receiver(pre_save, sender='api.Article')
def article_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                from api.models import ActivityLog
                ActivityLog.objects.create(
                    user=instance.author,
                    action='status_change',
                    target_type='article',
                    target_id=str(instance.pk),
                    metadata={
                        'old_status': old_instance.status,
                        'new_status': instance.status,
                    },
                )
        except sender.DoesNotExist:
            pass


@receiver(post_delete, sender='api.Article')
def article_post_delete(sender, instance, **kwargs):
    cache.delete(f'article:{instance.pk}')
    cache.delete_many([
        f'article_list:page:1',
        f'user_articles:{instance.author_id}',
    ])


@receiver(order_placed)
def handle_order_placed(sender, order, **kwargs):
    from api.tasks import (
        send_notification_email,
        generate_invoice_pdf,
        notify_warehouse,
    )
    send_notification_email.delay(order.customer_id, 'order_confirmation', {'order_id': str(order.id)})
    generate_invoice_pdf.delay(str(order.id))
    notify_warehouse.delay(str(order.id))


@receiver(order_status_changed)
def handle_order_status_changed(sender, order, old_status, new_status, **kwargs):
    from api.tasks import send_notification_email

    template_map = {
        'confirmed': 'order_confirmed',
        'shipped': 'order_shipped',
        'delivered': 'order_delivered',
        'cancelled': 'order_cancelled',
    }

    template = template_map.get(new_status)
    if template:
        send_notification_email.delay(
            order.customer_id,
            template,
            {'order_id': str(order.id), 'old_status': old_status, 'new_status': new_status},
        )`,
  },

  {
    id: 'django-test-suite',
    title: 'Django Test Suite with pytest-django and Factory Boy',
    description: 'Comprehensive test suite for Django REST API with factories, fixtures, and parameterized tests.',
    tech: ['django', 'pytest', 'factory-boy', 'python'],
    tags: ['django', 'testing', 'pytest', 'factories'],
    code: `import pytest
from rest_framework.test import APIClient
from rest_framework import status
import factory
from django.contrib.auth import get_user_model
from api.models import Article, Category

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f'user{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True
    is_verified = True


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f'Category {n}')
    slug = factory.LazyAttribute(lambda o: o.name.lower().replace(' ', '-'))


class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Faker('sentence', nb_words=5)
    slug = factory.LazyAttribute(lambda o: o.title.lower().replace(' ', '-')[:200])
    body = factory.Faker('text', max_nb_chars=2000)
    author = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory)
    status = 'published'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def admin_user():
    return UserFactory(is_staff=True, role='admin')


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.mark.django_db
class TestArticleAPI:
    def test_list_articles(self, authenticated_client):
        ArticleFactory.create_batch(5)
        response = authenticated_client.get('/api/articles/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 5

    def test_create_article(self, authenticated_client, user):
        category = CategoryFactory()
        data = {
            'title': 'Test Article Title',
            'slug': 'test-article-title',
            'body': 'This is the article body with enough content.',
            'category': category.id,
            'tags': ['python', 'django'],
            'status': 'draft',
        }
        response = authenticated_client.post('/api/articles/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Test Article Title'
        assert Article.objects.filter(author=user).count() == 1

    def test_create_article_validation_error(self, authenticated_client):
        response = authenticated_client.post('/api/articles/', {'title': 'ab'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_own_article(self, authenticated_client, user):
        article = ArticleFactory(author=user)
        response = authenticated_client.patch(
            f'/api/articles/{article.pk}/',
            {'title': 'Updated Title'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        article.refresh_from_db()
        assert article.title == 'Updated Title'

    def test_cannot_update_others_article(self, authenticated_client):
        article = ArticleFactory()
        response = authenticated_client.patch(
            f'/api/articles/{article.pk}/',
            {'title': 'Hacked Title'},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_requires_auth(self, api_client):
        article = ArticleFactory()
        response = api_client.delete(f'/api/articles/{article.pk}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.parametrize('search,expected_count', [
        ('django', 1),
        ('nonexistent', 0),
    ])
    def test_search_articles(self, authenticated_client, search, expected_count):
        ArticleFactory(title='Learning Django REST Framework')
        ArticleFactory(title='React Tutorial')
        response = authenticated_client.get(f'/api/articles/?search={search}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == expected_count`,
  },

  // ── Spring Boot Extended Snippets ──────────────────────────────────────

  {
    id: 'spring-data-jpa-specification',
    title: 'Spring Data JPA Dynamic Queries with Specifications',
    description: 'Type-safe dynamic query building using JPA Specifications for complex filtering.',
    tech: ['spring-boot', 'jpa', 'java'],
    tags: ['spring', 'database', 'query', 'specification', 'java'],
    code: `package com.myapp.repository.spec;

import com.myapp.entity.Order;
import com.myapp.entity.OrderStatus;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class OrderSpecifications {

    private OrderSpecifications() {}

    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) ->
            status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Order> hasCustomerId(Long customerId) {
        return (root, query, cb) ->
            customerId == null ? null : cb.equal(root.get("customer").get("id"), customerId);
    }

    public static Specification<Order> totalBetween(BigDecimal min, BigDecimal max) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (min != null) predicates.add(cb.greaterThanOrEqualTo(root.get("totalAmount"), min));
            if (max != null) predicates.add(cb.lessThanOrEqualTo(root.get("totalAmount"), max));
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Order> createdBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Order> searchByOrderNumber(String search) {
        return (root, query, cb) ->
            search == null || search.isBlank() ? null
                : cb.like(cb.lower(root.get("orderNumber")), "%" + search.toLowerCase() + "%");
    }

    public static Specification<Order> isNotDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<Order> withItemsFetched() {
        return (root, query, cb) -> {
            if (Long.class != query.getResultType()) {
                root.fetch("items", JoinType.LEFT);
                root.fetch("customer", JoinType.LEFT);
                query.distinct(true);
            }
            return null;
        };
    }
}

// --- Usage in service ---
// Specification<Order> spec = Specification
//     .where(OrderSpecifications.isNotDeleted())
//     .and(OrderSpecifications.hasStatus(status))
//     .and(OrderSpecifications.hasCustomerId(customerId))
//     .and(OrderSpecifications.totalBetween(minTotal, maxTotal))
//     .and(OrderSpecifications.createdBetween(fromDate, toDate))
//     .and(OrderSpecifications.searchByOrderNumber(search));
//
// Page<Order> orders = orderRepository.findAll(spec, pageable);`,
  },

  {
    id: 'spring-flyway-migration',
    title: 'Flyway Database Migration Scripts for Spring Boot',
    description: 'Database migration SQL scripts with Flyway for schema evolution, data migration, and rollback support.',
    tech: ['spring-boot', 'flyway', 'postgresql', 'java'],
    tags: ['spring', 'database', 'migration', 'flyway', 'java'],
    code: `-- V1__create_users_table.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role_active ON users (role, is_active);

-- V2__create_orders_table.sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status_date ON orders (status, created_at);
CREATE INDEX idx_orders_number ON orders (order_number);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- V3__add_user_profile_fields.sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;

-- V4__create_audit_log.sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log (user_id, created_at);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);

-- V5__add_full_text_search.sql
ALTER TABLE users ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_user_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.email, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_search
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_user_search_vector();

CREATE INDEX idx_users_search ON users USING gin(search_vector);`,
  },

  {
    id: 'spring-test-mockmvc',
    title: 'Spring Boot Integration Tests with MockMvc',
    description: 'Comprehensive Spring Boot tests with MockMvc, TestContainers, and database isolation.',
    tech: ['spring-boot', 'junit5', 'java'],
    tags: ['spring', 'testing', 'mockmvc', 'integration', 'java'],
    code: `package com.myapp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myapp.dto.CreateUserRequest;
import com.myapp.entity.User;
import com.myapp.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User testUser;
    private String authToken;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Test User");
        testUser.setEmail("test@example.com");
        testUser.setPassword(passwordEncoder.encode("Password123"));
        testUser.setRole("USER");
        testUser.setActive(true);
        testUser = userRepository.save(testUser);
    }

    @Test
    @DisplayName("GET /api/users - should return paginated users")
    void listUsers() throws Exception {
        mockMvc.perform(get("/api/users")
                .param("page", "0")
                .param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.content[0].email").exists())
            .andExpect(jsonPath("$.content[0].password").doesNotExist())
            .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    @DisplayName("GET /api/users/{id} - should return user by ID")
    void getUserById() throws Exception {
        mockMvc.perform(get("/api/users/{id}", testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Test User"))
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    @DisplayName("GET /api/users/{id} - should return 404 for non-existent user")
    void getUserNotFound() throws Exception {
        mockMvc.perform(get("/api/users/{id}", 99999))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.title").value("Resource Not Found"));
    }

    @Test
    @DisplayName("POST /api/users - should create user with valid data")
    void createUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("New User");
        request.setEmail("new@example.com");
        request.setPassword("StrongPass1");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("New User"))
            .andExpect(jsonPath("$.email").value("new@example.com"))
            .andExpect(jsonPath("$.id").isNumber());

        assertThat(userRepository.findByEmail("new@example.com")).isPresent();
    }

    @Test
    @DisplayName("POST /api/users - should return 422 for invalid data")
    void createUserValidationError() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("");
        request.setEmail("not-an-email");
        request.setPassword("short");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.email").exists());
    }

    @Test
    @DisplayName("POST /api/users - should return 409 for duplicate email")
    void createUserDuplicateEmail() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("Duplicate");
        request.setEmail("test@example.com");
        request.setPassword("StrongPass1");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict());
    }
}`,
  },

  {
    id: 'spring-mapstruct-dto',
    title: 'MapStruct DTO Mapping for Spring Boot',
    description: 'Type-safe entity-to-DTO mapping using MapStruct with custom mappings and collection handling.',
    tech: ['spring-boot', 'mapstruct', 'java'],
    tags: ['spring', 'dto', 'mapping', 'mapstruct', 'java'],
    code: `package com.myapp.mapper;

import com.myapp.dto.*;
import com.myapp.entity.*;
import org.mapstruct.*;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(target = "fullName", expression = "java(user.getFirstName() + \\" \\" + user.getLastName())")
    @Mapping(target = "orderCount", expression = "java(user.getOrders() != null ? user.getOrders().size() : 0)")
    UserDTO toDTO(User user);

    List<UserDTO> toDTOList(List<User> users);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "orders", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "active", constant = "true")
    User toEntity(CreateUserRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(UpdateUserRequest request, @MappingTarget User user);
}

@Mapper(componentModel = "spring", uses = {UserMapper.class})
public interface OrderMapper {

    @Mapping(source = "customer.id", target = "customerId")
    @Mapping(source = "customer", target = "customer")
    @Mapping(target = "itemCount", expression = "java(order.getItems() != null ? order.getItems().size() : 0)")
    OrderDTO toDTO(Order order);

    @Mapping(source = "customer.id", target = "customerId")
    OrderSummaryDTO toSummaryDTO(Order order);

    List<OrderSummaryDTO> toSummaryDTOList(List<Order> orders);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "status", constant = "PENDING")
    Order toEntity(CreateOrderRequest request);
}

// --- Generated usage ---
// @Service
// @RequiredArgsConstructor
// public class UserService {
//     private final UserMapper userMapper;
//     private final UserRepository userRepository;
//
//     public UserDTO create(CreateUserRequest request) {
//         User user = userMapper.toEntity(request);
//         user.setPassword(passwordEncoder.encode(request.getPassword()));
//         return userMapper.toDTO(userRepository.save(user));
//     }
//
//     public UserDTO update(Long id, UpdateUserRequest request) {
//         User user = userRepository.findById(id).orElseThrow();
//         userMapper.updateEntity(request, user);
//         return userMapper.toDTO(userRepository.save(user));
//     }
// }`,
  },

  // ── .NET Extended Snippets ─────────────────────────────────────────────

  {
    id: 'dotnet-mediatr-cqrs',
    title: 'CQRS with MediatR in ASP.NET Core',
    description: 'Command Query Responsibility Segregation pattern using MediatR for clean request handling.',
    tech: ['aspnet-core', 'mediatr', 'csharp'],
    tags: ['dotnet', 'cqrs', 'mediatr', 'pattern', 'csharp'],
    code: `using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace MyApp.Features.Users;

public record GetUserQuery(int Id) : IRequest<UserDto?>;

public class GetUserQueryHandler : IRequestHandler<GetUserQuery, UserDto?>
{
    private readonly AppDbContext _db;

    public GetUserQueryHandler(AppDbContext db) => _db = db;

    public async Task<UserDto?> Handle(GetUserQuery request, CancellationToken ct)
    {
        return await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == request.Id)
            .Select(u => new UserDto(u.Id, u.Name, u.Email, u.Role, u.IsActive, u.CreatedAt))
            .FirstOrDefaultAsync(ct);
    }
}

public record CreateUserCommand(string Name, string Email, string Password, string? Role)
    : IRequest<UserDto>;

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    private readonly AppDbContext _db;

    public CreateUserCommandValidator(AppDbContext db)
    {
        _db = db;
        RuleFor(x => x.Name).NotEmpty().MinimumLength(2).MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress()
            .MustAsync(BeUniqueEmail).WithMessage("Email already registered");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Must contain uppercase letter");
    }

    private async Task<bool> BeUniqueEmail(string email, CancellationToken ct)
        => !await _db.Users.AnyAsync(u => u.Email == email.ToLower(), ct);
}

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, UserDto>
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ILogger<CreateUserCommandHandler> _logger;

    public CreateUserCommandHandler(AppDbContext db, IPasswordHasher hasher, ILogger<CreateUserCommandHandler> logger)
    {
        _db = db;
        _hasher = hasher;
        _logger = logger;
    }

    public async Task<UserDto> Handle(CreateUserCommand request, CancellationToken ct)
    {
        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLower(),
            PasswordHash = _hasher.Hash(request.Password),
            Role = request.Role ?? "User"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("User created: {UserId}", user.Id);

        return new UserDto(user.Id, user.Name, user.Email, user.Role, user.IsActive, user.CreatedAt);
    }
}

public record DeleteUserCommand(int Id) : IRequest<bool>;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, bool>
{
    private readonly AppDbContext _db;

    public DeleteUserCommandHandler(AppDbContext db) => _db = db;

    public async Task<bool> Handle(DeleteUserCommand request, CancellationToken ct)
    {
        var user = await _db.Users.FindAsync(new object[] { request.Id }, ct);
        if (user is null) return false;
        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

// --- Controller using MediatR ---
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;
    public UsersController(IMediator mediator) => _mediator = mediator;

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var user = await _mediator.Send(new GetUserQuery(id));
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserCommand command)
    {
        var user = await _mediator.Send(command);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _mediator.Send(new DeleteUserCommand(id));
        return result ? NoContent() : NotFound();
    }
}`,
  },

  {
    id: 'dotnet-ef-core-migration',
    title: 'EF Core Migration with Seed Data and Custom SQL',
    description: 'Entity Framework Core migration with initial seed data, custom SQL execution, and data transformation.',
    tech: ['ef-core', 'csharp'],
    tags: ['dotnet', 'database', 'migration', 'ef-core', 'csharp'],
    code: `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

namespace MyApp.Data.Migrations;

public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(maxLength: 100, nullable: false),
                Email = table.Column<string>(maxLength: 255, nullable: false),
                PasswordHash = table.Column<string>(nullable: false),
                Role = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "User"),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_users_Email",
            table: "users",
            column: "Email",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_users_Role_IsActive",
            table: "users",
            columns: new[] { "Role", "IsActive" });

        migrationBuilder.CreateTable(
            name: "orders",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                OrderNumber = table.Column<string>(maxLength: 20, nullable: false),
                CustomerId = table.Column<int>(nullable: false),
                Status = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "Pending"),
                TotalAmount = table.Column<decimal>(precision: 10, scale: 2, nullable: false),
                Notes = table.Column<string>(nullable: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: true),
                DeletedAt = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_orders", x => x.Id);
                table.ForeignKey("FK_orders_users", x => x.CustomerId, "users", "Id");
            });

        migrationBuilder.CreateIndex(
            name: "IX_orders_OrderNumber",
            table: "orders",
            column: "OrderNumber",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_orders_CustomerId",
            table: "orders",
            column: "CustomerId");

        migrationBuilder.CreateIndex(
            name: "IX_orders_Status_CreatedAt",
            table: "orders",
            columns: new[] { "Status", "CreatedAt" });

        migrationBuilder.Sql(@"
            CREATE TRIGGER trg_users_updated
            ON users AFTER UPDATE AS
            BEGIN
                UPDATE users SET UpdatedAt = GETUTCDATE()
                FROM users u INNER JOIN inserted i ON u.Id = i.Id;
            END
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_users_updated");
        migrationBuilder.DropTable(name: "orders");
        migrationBuilder.DropTable(name: "users");
    }
}`,
  },

  {
    id: 'dotnet-serilog-config',
    title: 'Serilog Structured Logging Configuration for ASP.NET Core',
    description: 'Production Serilog setup with structured logging, enrichment, multiple sinks, and request logging.',
    tech: ['aspnet-core', 'serilog', 'csharp'],
    tags: ['dotnet', 'logging', 'serilog', 'monitoring', 'csharp'],
    code: `using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

namespace MyApp;

public static class LoggingConfig
{
    public static void ConfigureSerilog(WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
            .MinimumLevel.Override("System", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .Enrich.WithEnvironmentName()
            .Enrich.WithMachineName()
            .Enrich.WithProperty("Application", "MyApp")
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}{NewLine}  {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                new CompactJsonFormatter(),
                path: "logs/app-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                fileSizeLimitBytes: 100_000_000)
            .CreateLogger();

        builder.Host.UseSerilog();
    }

    public static void UseRequestLogging(WebApplication app)
    {
        app.UseSerilogRequestLogging(options =>
        {
            options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
            {
                diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value ?? "unknown");
                diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
                diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
                diagnosticContext.Set("ClientIP", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

                if (httpContext.User.Identity?.IsAuthenticated == true)
                {
                    diagnosticContext.Set("UserId", httpContext.User.FindFirst("sub")?.Value ?? "unknown");
                }
            };

            options.MessageTemplate = "{RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";

            options.GetLevel = (httpContext, elapsed, ex) =>
            {
                if (ex != null) return LogEventLevel.Error;
                if (httpContext.Response.StatusCode >= 500) return LogEventLevel.Error;
                if (httpContext.Response.StatusCode >= 400) return LogEventLevel.Warning;
                if (elapsed > 5000) return LogEventLevel.Warning;
                return LogEventLevel.Information;
            };
        });
    }
}

// --- Usage in Program.cs ---
// LoggingConfig.ConfigureSerilog(builder);
// var app = builder.Build();
// LoggingConfig.UseRequestLogging(app);

// --- Usage in services ---
// public class OrderService
// {
//     private readonly ILogger<OrderService> _logger;
//     public OrderService(ILogger<OrderService> logger) => _logger = logger;
//
//     public async Task<Order> CreateAsync(CreateOrderRequest request)
//     {
//         _logger.LogInformation("Creating order for customer {CustomerId} with {ItemCount} items",
//             request.CustomerId, request.Items.Count);
//         // ...
//         _logger.LogInformation("Order {OrderId} created successfully with total {Total:C}",
//             order.Id, order.TotalAmount);
//     }
// }`,
  },

  {
    id: 'dotnet-xunit-tests',
    title: 'xUnit Tests for ASP.NET Core API',
    description: 'Integration and unit tests using xUnit, WebApplicationFactory, and Moq for ASP.NET Core.',
    tech: ['aspnet-core', 'xunit', 'csharp'],
    tags: ['dotnet', 'testing', 'xunit', 'integration', 'csharp'],
    code: `using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace MyApp.Tests;

public class UsersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public UsersApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb_" + Guid.NewGuid()));
            });
        });
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_ReturnsOkWithPaginatedResult()
    {
        var response = await _client.GetAsync("/api/users?page=1&pageSize=10");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PagedResult<UserDto>>();
        Assert.NotNull(result);
        Assert.True(result.TotalCount >= 0);
    }

    [Fact]
    public async Task CreateUser_WithValidData_ReturnsCreated()
    {
        var request = new CreateUserRequest("Test User", "test@example.com", "StrongPass1", null);
        var response = await _client.PostAsJsonAsync("/api/users", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(user);
        Assert.Equal("Test User", user.Name);
        Assert.Equal("test@example.com", user.Email);
    }

    [Theory]
    [InlineData("", "valid@email.com", "StrongPass1")]
    [InlineData("Name", "not-email", "StrongPass1")]
    [InlineData("Name", "valid@email.com", "short")]
    public async Task CreateUser_WithInvalidData_ReturnsBadRequest(string name, string email, string password)
    {
        var request = new CreateUserRequest(name, email, password, null);
        var response = await _client.PostAsJsonAsync("/api/users", request);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task GetUser_WithNonExistentId_ReturnsNotFound()
    {
        var response = await _client.GetAsync("/api/users/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateUser_DuplicateEmail_ReturnsConflict()
    {
        var request = new CreateUserRequest("User 1", "dup@example.com", "StrongPass1", null);
        await _client.PostAsJsonAsync("/api/users", request);

        var request2 = new CreateUserRequest("User 2", "dup@example.com", "StrongPass1", null);
        var response = await _client.PostAsJsonAsync("/api/users", request2);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}

// --- Unit test with Moq ---
public class UserServiceTests
{
    private readonly Mock<IRepository<User>> _mockRepo;
    private readonly Mock<IPasswordHasher> _mockHasher;
    private readonly Mock<ILogger<UserService>> _mockLogger;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _mockRepo = new Mock<IRepository<User>>();
        _mockHasher = new Mock<IPasswordHasher>();
        _mockLogger = new Mock<ILogger<UserService>>();
        _service = new UserService(_mockRepo.Object, _mockHasher.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task CreateAsync_WithUniqueEmail_CreatesUser()
    {
        _mockRepo.Setup(r => r.ExistsAsync(It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>()))
            .ReturnsAsync(false);
        _mockHasher.Setup(h => h.Hash(It.IsAny<string>())).Returns("hashed");
        _mockRepo.Setup(r => r.AddAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => { u.Id = 1; return u; });

        var result = await _service.CreateAsync(new CreateUserRequest("Name", "test@test.com", "pass", null));

        Assert.Equal("Name", result.Name);
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateEmail_ThrowsConflict()
    {
        _mockRepo.Setup(r => r.ExistsAsync(It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>()))
            .ReturnsAsync(true);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _service.CreateAsync(new CreateUserRequest("Name", "dup@test.com", "pass", null)));
    }
}`,
  },

  // ── Go + React Extended Snippets ──────────────────────────────────────

  {
    id: 'go-fiber-handler',
    title: 'Fiber Framework REST API Handlers',
    description: 'REST API handlers using Go Fiber framework with middleware, validation, and structured error responses.',
    tech: ['go', 'fiber'],
    tags: ['go', 'api', 'fiber', 'crud'],
    code: `package handler

import (
        "myapp/internal/model"
        "myapp/internal/service"
        "strconv"

        "github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
        svc service.ProductService
}

func NewProductHandler(svc service.ProductService) *ProductHandler {
        return &ProductHandler{svc: svc}
}

func (h *ProductHandler) RegisterRoutes(app *fiber.App) {
        api := app.Group("/api/v1/products")
        api.Get("/", h.List)
        api.Get("/:id", h.GetByID)
        api.Post("/", h.Create)
        api.Put("/:id", h.Update)
        api.Delete("/:id", h.Delete)
        api.Get("/search", h.Search)
        api.Get("/categories", h.ListCategories)
}

type CreateProductRequest struct {
        Name     string  \`json:"name" validate:"required,min=2,max=200"\`
        SKU      string  \`json:"sku" validate:"required,min=3,max=50"\`
        Price    float64 \`json:"price" validate:"required,gt=0"\`
        Category string  \`json:"category" validate:"required"\`
        InStock  *bool   \`json:"in_stock"\`
}

type ErrorResponse struct {
        Error   string      \`json:"error"\`
        Code    string      \`json:"code,omitempty"\`
        Details interface{} \`json:"details,omitempty"\`
}

func (h *ProductHandler) List(c *fiber.Ctx) error {
        page := c.QueryInt("page", 1)
        pageSize := c.QueryInt("page_size", 20)
        category := c.Query("category")

        if page < 1 { page = 1 }
        if pageSize < 1 || pageSize > 100 { pageSize = 20 }

        result, err := h.svc.List(c.Context(), service.ProductListParams{
                Page:     page,
                PageSize: pageSize,
                Category: category,
        })
        if err != nil {
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
                        Error: "Failed to fetch products",
                        Code:  "INTERNAL_ERROR",
                })
        }

        return c.JSON(fiber.Map{
                "data": result.Items,
                "pagination": fiber.Map{
                        "page":        result.Page,
                        "page_size":   result.PageSize,
                        "total":       result.Total,
                        "total_pages": result.TotalPages,
                },
        })
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
        id, err := strconv.ParseUint(c.Params("id"), 10, 64)
        if err != nil {
                return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
                        Error: "Invalid product ID",
                        Code:  "INVALID_ID",
                })
        }

        product, err := h.svc.GetByID(c.Context(), uint(id))
        if err != nil {
                if err == service.ErrNotFound {
                        return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
                                Error: "Product not found",
                                Code:  "NOT_FOUND",
                        })
                }
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Internal error"})
        }

        return c.JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
        var req CreateProductRequest
        if err := c.BodyParser(&req); err != nil {
                return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
                        Error: "Invalid request body",
                        Code:  "PARSE_ERROR",
                })
        }

        product, err := h.svc.Create(c.Context(), service.CreateProductInput{
                Name:     req.Name,
                SKU:      req.SKU,
                Price:    req.Price,
                Category: req.Category,
                InStock:  req.InStock == nil || *req.InStock,
        })
        if err != nil {
                if err == service.ErrConflict {
                        return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
                                Error: "Product with this SKU already exists",
                                Code:  "CONFLICT",
                        })
                }
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Failed to create product"})
        }

        return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
        id, err := strconv.ParseUint(c.Params("id"), 10, 64)
        if err != nil {
                return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Invalid ID"})
        }

        var req CreateProductRequest
        if err := c.BodyParser(&req); err != nil {
                return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Invalid body"})
        }

        product, err := h.svc.Update(c.Context(), uint(id), service.UpdateProductInput{
                Name:     req.Name,
                Price:    req.Price,
                Category: req.Category,
        })
        if err != nil {
                if err == service.ErrNotFound {
                        return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "Product not found"})
                }
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Update failed"})
        }

        return c.JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
        id, err := strconv.ParseUint(c.Params("id"), 10, 64)
        if err != nil {
                return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Invalid ID"})
        }

        if err := h.svc.Delete(c.Context(), uint(id)); err != nil {
                if err == service.ErrNotFound {
                        return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "Product not found"})
                }
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Delete failed"})
        }

        return c.SendStatus(fiber.StatusNoContent)
}

func (h *ProductHandler) Search(c *fiber.Ctx) error {
        query := c.Query("q")
        if query == "" {
                return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "Search query required"})
        }
        results, err := h.svc.Search(c.Context(), query, c.QueryInt("limit", 20))
        if err != nil {
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Search failed"})
        }
        return c.JSON(fiber.Map{"data": results})
}

func (h *ProductHandler) ListCategories(c *fiber.Ctx) error {
        categories, err := h.svc.ListCategories(c.Context())
        if err != nil {
                return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{Error: "Failed to list categories"})
        }
        return c.JSON(fiber.Map{"data": categories})
}`,
  },

  {
    id: 'go-error-handling-patterns',
    title: 'Go Error Handling Patterns and Custom Error Types',
    description: 'Idiomatic Go error handling with custom error types, wrapping, sentinel errors, and error checking utilities.',
    tech: ['go'],
    tags: ['go', 'error-handling', 'patterns'],
    code: `package apperr

import (
        "errors"
        "fmt"
        "net/http"
)

var (
        ErrNotFound     = errors.New("resource not found")
        ErrConflict     = errors.New("resource already exists")
        ErrUnauthorized = errors.New("authentication required")
        ErrForbidden    = errors.New("insufficient permissions")
        ErrBadRequest   = errors.New("invalid request")
)

type AppError struct {
        Code    string
        Message string
        Err     error
        Status  int
        Details map[string]interface{}
}

func (e *AppError) Error() string {
        if e.Err != nil {
                return fmt.Sprintf("%s: %v", e.Message, e.Err)
        }
        return e.Message
}

func (e *AppError) Unwrap() error {
        return e.Err
}

func NewNotFound(resource string, id interface{}) *AppError {
        return &AppError{
                Code:    "NOT_FOUND",
                Message: fmt.Sprintf("%s not found: %v", resource, id),
                Err:     ErrNotFound,
                Status:  http.StatusNotFound,
        }
}

func NewConflict(message string) *AppError {
        return &AppError{
                Code:    "CONFLICT",
                Message: message,
                Err:     ErrConflict,
                Status:  http.StatusConflict,
        }
}

func NewValidation(details map[string]interface{}) *AppError {
        return &AppError{
                Code:    "VALIDATION_ERROR",
                Message: "Validation failed",
                Err:     ErrBadRequest,
                Status:  http.StatusUnprocessableEntity,
                Details: details,
        }
}

func NewInternal(err error) *AppError {
        return &AppError{
                Code:    "INTERNAL_ERROR",
                Message: "An unexpected error occurred",
                Err:     err,
                Status:  http.StatusInternalServerError,
        }
}

func StatusCode(err error) int {
        var appErr *AppError
        if errors.As(err, &appErr) {
                return appErr.Status
        }
        if errors.Is(err, ErrNotFound) {
                return http.StatusNotFound
        }
        if errors.Is(err, ErrConflict) {
                return http.StatusConflict
        }
        if errors.Is(err, ErrUnauthorized) {
                return http.StatusUnauthorized
        }
        if errors.Is(err, ErrForbidden) {
                return http.StatusForbidden
        }
        if errors.Is(err, ErrBadRequest) {
                return http.StatusBadRequest
        }
        return http.StatusInternalServerError
}

type ErrorResponse struct {
        Error   string                 \`json:"error"\`
        Code    string                 \`json:"code"\`
        Details map[string]interface{} \`json:"details,omitempty"\`
}

func ToResponse(err error) (int, ErrorResponse) {
        var appErr *AppError
        if errors.As(err, &appErr) {
                return appErr.Status, ErrorResponse{
                        Error:   appErr.Message,
                        Code:    appErr.Code,
                        Details: appErr.Details,
                }
        }
        return http.StatusInternalServerError, ErrorResponse{
                Error: "Internal server error",
                Code:  "INTERNAL_ERROR",
        }
}

func Wrap(err error, message string) error {
        if err == nil {
                return nil
        }
        return fmt.Errorf("%s: %w", message, err)
}

func WrapWith(err error, format string, args ...interface{}) error {
        if err == nil {
                return nil
        }
        msg := fmt.Sprintf(format, args...)
        return fmt.Errorf("%s: %w", msg, err)
}`,
  },

  {
    id: 'go-struct-validation',
    title: 'Go Struct Validation with go-playground/validator',
    description: 'Request validation middleware using go-playground/validator with custom validators and error formatting.',
    tech: ['go', 'gin'],
    tags: ['go', 'validation', 'middleware', 'gin'],
    code: `package validator

import (
        "net/http"
        "reflect"
        "regexp"
        "strings"

        "github.com/gin-gonic/gin"
        "github.com/gin-gonic/gin/binding"
        govalidator "github.com/go-playground/validator/v10"
)

func SetupValidation() {
        if v, ok := binding.Validator.Engine().(*govalidator.Validate); ok {
                v.RegisterTagNameFunc(func(fld reflect.StructField) string {
                        name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
                        if name == "-" {
                                return ""
                        }
                        return name
                })

                v.RegisterValidation("strong_password", validateStrongPassword)
                v.RegisterValidation("slug", validateSlug)
                v.RegisterValidation("phone", validatePhone)
        }
}

var (
        slugRegex  = regexp.MustCompile(\`^[a-z0-9]+(?:-[a-z0-9]+)*$\`)
        phoneRegex = regexp.MustCompile(\`^\\+?[1-9]\\d{6,14}$\`)
)

func validateStrongPassword(fl govalidator.FieldLevel) bool {
        password := fl.Field().String()
        if len(password) < 8 {
                return false
        }
        hasUpper := false
        hasLower := false
        hasDigit := false
        for _, c := range password {
                switch {
                case c >= 'A' && c <= 'Z':
                        hasUpper = true
                case c >= 'a' && c <= 'z':
                        hasLower = true
                case c >= '0' && c <= '9':
                        hasDigit = true
                }
        }
        return hasUpper && hasLower && hasDigit
}

func validateSlug(fl govalidator.FieldLevel) bool {
        return slugRegex.MatchString(fl.Field().String())
}

func validatePhone(fl govalidator.FieldLevel) bool {
        return phoneRegex.MatchString(fl.Field().String())
}

type ValidationError struct {
        Field   string \`json:"field"\`
        Message string \`json:"message"\`
}

func FormatValidationErrors(err error) []ValidationError {
        var errors []ValidationError

        if ve, ok := err.(govalidator.ValidationErrors); ok {
                for _, fe := range ve {
                        errors = append(errors, ValidationError{
                                Field:   fe.Field(),
                                Message: getErrorMessage(fe),
                        })
                }
        }

        return errors
}

func getErrorMessage(fe govalidator.FieldError) string {
        switch fe.Tag() {
        case "required":
                return fe.Field() + " is required"
        case "email":
                return "Must be a valid email address"
        case "min":
                return "Must be at least " + fe.Param() + " characters"
        case "max":
                return "Must be at most " + fe.Param() + " characters"
        case "gt":
                return "Must be greater than " + fe.Param()
        case "oneof":
                return "Must be one of: " + fe.Param()
        case "strong_password":
                return "Must contain at least 8 characters with uppercase, lowercase, and digits"
        case "slug":
                return "Must be a valid URL slug (lowercase letters, numbers, and hyphens)"
        case "phone":
                return "Must be a valid phone number"
        default:
                return "Failed validation: " + fe.Tag()
        }
}

func ValidateJSON[T any]() gin.HandlerFunc {
        return func(c *gin.Context) {
                var request T
                if err := c.ShouldBindJSON(&request); err != nil {
                        errors := FormatValidationErrors(err)
                        if len(errors) > 0 {
                                c.AbortWithStatusJSON(http.StatusUnprocessableEntity, gin.H{
                                        "error":   "Validation failed",
                                        "code":    "VALIDATION_ERROR",
                                        "details": errors,
                                })
                                return
                        }
                        c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
                                "error": "Invalid request body",
                                "code":  "PARSE_ERROR",
                        })
                        return
                }
                c.Set("validated_body", request)
                c.Next()
        }
}`,
  },

  {
    id: 'go-worker-pool',
    title: 'Go Worker Pool Pattern with Error Group',
    description: 'Bounded concurrency worker pool using errgroup for parallel processing with error collection.',
    tech: ['go'],
    tags: ['go', 'concurrency', 'worker-pool', 'goroutines'],
    code: `package worker

import (
        "context"
        "fmt"
        "log"
        "sync"
        "time"

        "golang.org/x/sync/errgroup"
)

type Job[T any] struct {
        ID   string
        Data T
}

type Result[T any, R any] struct {
        Job    Job[T]
        Result R
        Err    error
}

func Pool[T any, R any](
        ctx context.Context,
        workers int,
        jobs []Job[T],
        process func(ctx context.Context, job Job[T]) (R, error),
) []Result[T, R] {
        results := make([]Result[T, R], len(jobs))
        var mu sync.Mutex
        idx := 0

        g, ctx := errgroup.WithContext(ctx)
        g.SetLimit(workers)

        for _, job := range jobs {
                job := job
                g.Go(func() error {
                        result, err := process(ctx, job)

                        mu.Lock()
                        results[idx] = Result[T, R]{Job: job, Result: result, Err: err}
                        idx++
                        mu.Unlock()

                        return nil
                })
        }

        g.Wait()
        return results[:idx]
}

type BatchProcessor[T any] struct {
        workers    int
        batchSize  int
        processFn  func(ctx context.Context, batch []T) error
        onError    func(batch []T, err error)
        retries    int
        retryDelay time.Duration
}

func NewBatchProcessor[T any](
        workers, batchSize int,
        processFn func(ctx context.Context, batch []T) error,
) *BatchProcessor[T] {
        return &BatchProcessor[T]{
                workers:    workers,
                batchSize:  batchSize,
                processFn:  processFn,
                retries:    3,
                retryDelay: time.Second,
        }
}

func (bp *BatchProcessor[T]) WithRetries(retries int, delay time.Duration) *BatchProcessor[T] {
        bp.retries = retries
        bp.retryDelay = delay
        return bp
}

func (bp *BatchProcessor[T]) WithErrorHandler(fn func(batch []T, err error)) *BatchProcessor[T] {
        bp.onError = fn
        return bp
}

func (bp *BatchProcessor[T]) Process(ctx context.Context, items []T) error {
        batches := makeBatches(items, bp.batchSize)
        g, ctx := errgroup.WithContext(ctx)
        g.SetLimit(bp.workers)

        for _, batch := range batches {
                batch := batch
                g.Go(func() error {
                        var lastErr error
                        for attempt := 0; attempt <= bp.retries; attempt++ {
                                if err := bp.processFn(ctx, batch); err != nil {
                                        lastErr = err
                                        if attempt < bp.retries {
                                                select {
                                                case <-ctx.Done():
                                                        return ctx.Err()
                                                case <-time.After(bp.retryDelay * time.Duration(attempt+1)):
                                                }
                                        }
                                        continue
                                }
                                return nil
                        }

                        if bp.onError != nil {
                                bp.onError(batch, lastErr)
                        }
                        return fmt.Errorf("batch failed after %d retries: %w", bp.retries, lastErr)
                })
        }

        return g.Wait()
}

func makeBatches[T any](items []T, size int) [][]T {
        var batches [][]T
        for i := 0; i < len(items); i += size {
                end := i + size
                if end > len(items) {
                        end = len(items)
                }
                batches = append(batches, items[i:end])
        }
        return batches
}

// --- Usage example ---
// results := worker.Pool(ctx, 5, jobs, func(ctx context.Context, job worker.Job[string]) (int, error) {
//     resp, err := http.Get(job.Data)
//     if err != nil { return 0, err }
//     defer resp.Body.Close()
//     return resp.StatusCode, nil
// })
//
// processor := worker.NewBatchProcessor(10, 100, func(ctx context.Context, batch []User) error {
//     return db.CreateInBatches(batch, len(batch)).Error
// }).WithRetries(3, time.Second)
// processor.Process(ctx, users)`,
  },

  {
    id: 'go-database-migration',
    title: 'Go Database Migration with golang-migrate',
    description: 'Database migration setup and management using golang-migrate with PostgreSQL for Go applications.',
    tech: ['go', 'postgresql', 'golang-migrate'],
    tags: ['go', 'database', 'migration', 'postgresql'],
    code: `package database

import (
        "database/sql"
        "embed"
        "fmt"
        "log"

        "github.com/golang-migrate/migrate/v4"
        "github.com/golang-migrate/migrate/v4/database/postgres"
        "github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func RunMigrations(db *sql.DB, dbName string) error {
        sourceDriver, err := iofs.New(migrationsFS, "migrations")
        if err != nil {
                return fmt.Errorf("creating source driver: %w", err)
        }

        dbDriver, err := postgres.WithInstance(db, &postgres.Config{})
        if err != nil {
                return fmt.Errorf("creating db driver: %w", err)
        }

        m, err := migrate.NewWithInstance("iofs", sourceDriver, dbName, dbDriver)
        if err != nil {
                return fmt.Errorf("creating migrator: %w", err)
        }

        if err := m.Up(); err != nil && err != migrate.ErrNoChange {
                return fmt.Errorf("running migrations: %w", err)
        }

        version, dirty, _ := m.Version()
        log.Printf("Migration complete: version=%d, dirty=%v", version, dirty)
        return nil
}

// --- migrations/000001_create_users.up.sql ---
// CREATE TABLE IF NOT EXISTS users (
//     id BIGSERIAL PRIMARY KEY,
//     name VARCHAR(100) NOT NULL,
//     email VARCHAR(255) NOT NULL UNIQUE,
//     password_hash VARCHAR(255) NOT NULL,
//     role VARCHAR(20) NOT NULL DEFAULT 'user',
//     is_active BOOLEAN NOT NULL DEFAULT true,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// CREATE INDEX idx_users_email ON users (email);
// CREATE INDEX idx_users_role_active ON users (role, is_active);
//
// --- migrations/000001_create_users.down.sql ---
// DROP TABLE IF EXISTS users;
//
// --- migrations/000002_create_orders.up.sql ---
// CREATE TABLE IF NOT EXISTS orders (
//     id BIGSERIAL PRIMARY KEY,
//     order_number VARCHAR(20) NOT NULL UNIQUE,
//     customer_id BIGINT NOT NULL REFERENCES users(id),
//     status VARCHAR(20) NOT NULL DEFAULT 'pending',
//     total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
//     notes TEXT,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     deleted_at TIMESTAMPTZ
// );
//
// CREATE INDEX idx_orders_customer ON orders (customer_id);
// CREATE INDEX idx_orders_status ON orders (status, created_at);
//
// CREATE TABLE IF NOT EXISTS order_items (
//     id BIGSERIAL PRIMARY KEY,
//     order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
//     product_id BIGINT NOT NULL,
//     quantity INTEGER NOT NULL CHECK (quantity > 0),
//     unit_price DECIMAL(10,2) NOT NULL,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// CREATE INDEX idx_order_items_order ON order_items (order_id);
//
// --- migrations/000002_create_orders.down.sql ---
// DROP TABLE IF EXISTS order_items;
// DROP TABLE IF EXISTS orders;`,
  },

  {
    id: 'go-react-api-client',
    title: 'React API Client for Go Backend with TypeScript',
    description: 'Type-safe React frontend API client for communicating with a Go REST backend.',
    tech: ['react', 'typescript', 'axios'],
    tags: ['go', 'react', 'api-client', 'typescript'],
    code: `import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = \`Bearer \${token}\`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed && error.config) {
            return this.client.request(error.config);
          }
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await this.client.post('/api/v1/auth/refresh');
      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.get<{ data: T }>(url, config);
    return res.data.data;
  }

  async getPaginated<T>(url: string, params?: Record<string, string | number>): Promise<PaginatedResponse<T>> {
    const res = await this.client.get<PaginatedResponse<T>>(url, { params });
    return res.data;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const res = await this.client.post<{ data: T }>(url, data);
    return res.data.data;
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const res = await this.client.put<{ data: T }>(url, data);
    return res.data.data;
  }

  async delete(url: string): Promise<void> {
    await this.client.delete(url);
  }
}

const api = new ApiClient(import.meta.env.VITE_API_URL || '/api/v1');

// --- Typed API functions ---

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  category: string;
  in_stock: boolean;
}

export const userApi = {
  list: (page = 1, pageSize = 20) =>
    api.getPaginated<User>('/users', { page, page_size: pageSize }),

  getById: (id: number) => api.get<User>(\`/users/\${id}\`),

  create: (data: { name: string; email: string; password: string }) =>
    api.post<User>('/users', data),

  update: (id: number, data: Partial<Pick<User, 'name' | 'email' | 'role'>>) =>
    api.put<User>(\`/users/\${id}\`, data),

  delete: (id: number) => api.delete(\`/users/\${id}\`),
};

export const productApi = {
  list: (page = 1, pageSize = 20, category?: string) =>
    api.getPaginated<Product>('/products', { page, page_size: pageSize, ...(category && { category }) }),

  getById: (id: number) => api.get<Product>(\`/products/\${id}\`),

  search: (query: string, limit = 20) =>
    api.get<Product[]>(\`/products/search?q=\${encodeURIComponent(query)}&limit=\${limit}\`),

  create: (data: { name: string; sku: string; price: number; category: string }) =>
    api.post<Product>('/products', data),

  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(\`/products/\${id}\`, data),

  delete: (id: number) => api.delete(\`/products/\${id}\`),
};

export default api;`,
  },

];

STACK_CODE_SNIPPETS.push(...EXTENDED_STACK_SNIPPETS);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENDED BEST PRACTICES                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_BEST_PRACTICES: BestPractice[] = [

  // ── MERN Extended Best Practices ──────────────────────────────────────

  { id: 'mern-mongodb-indexing', title: 'MongoDB Index Strategy', category: 'mern-performance', description: 'Design MongoDB indexes for common query patterns to ensure sub-millisecond query times.', do: ['Create compound indexes matching your query filter + sort patterns', 'Use covered queries where the index contains all fields being returned', 'Use partial indexes for queries that always filter on a condition (e.g. isActive: true)', 'Monitor slow queries with MongoDB profiler (db.setProfilingLevel(1, { slowms: 100 }))', 'Use explain("executionStats") to verify index usage before deploying', 'Consider TTL indexes for auto-expiring documents (sessions, logs, temporary data)'], dont: ['Create an index for every field — each index costs write performance and storage', 'Use multi-key indexes on large arrays — they create one index entry per array element', 'Forget that compound index field order matters: { status: 1, createdAt: -1 } is different from { createdAt: -1, status: 1 }', 'Create indexes on collections with fewer than 1000 documents — full scans are fast enough', 'Use text indexes for complex full-text search — use Atlas Search or Elasticsearch instead'], languages: ['typescript', 'javascript'] },

  { id: 'mern-react-state-management', title: 'React State Management Strategy', category: 'mern-frontend', description: 'Choose the right state management approach for different types of state in React applications.', do: ['Use React Query / TanStack Query for server state (API data, caching, sync)', 'Use React Context for global UI state (theme, locale, sidebar open/closed)', 'Use useState/useReducer for local component state', 'Use URL params (useSearchParams) for filter/sort/pagination state', 'Colocate state as close to where it is used as possible'], dont: ['Use Redux for everything — it is overkill for most state management needs', 'Store server/API data in Redux — React Query handles caching, refetching, and sync better', 'Use Context for frequently-changing values (causes unnecessary re-renders)', 'Lift state up more than 2 levels — create a context or use a state library instead', 'Mix form state with application state — use React Hook Form for form state'], languages: ['typescript', 'javascript'] },

  { id: 'mern-api-response-format', title: 'MERN API Response Format', category: 'mern-api', description: 'Consistent API response format across all endpoints for predictable client-side handling.', do: ['Use consistent envelope: { data: T } for success, { error: { message, code, details? } } for errors', 'Include pagination metadata: { data: [], pagination: { page, limit, total, pages } }', 'Use proper HTTP status codes: 200 OK, 201 Created, 204 No Content, 400/401/403/404/409/422/429/500', 'Include a request ID in response headers for debugging (X-Request-ID)', 'Version your API with URL prefix: /api/v1/...'], dont: ['Return 200 with an error field for failures — use proper HTTP status codes', 'Return different response shapes from different endpoints', 'Include sensitive data (passwords, internal IDs, stack traces) in responses', 'Use 500 for all errors — distinguish client errors (4xx) from server errors (5xx)', 'Return raw database errors or ORM error messages to clients'], languages: ['typescript', 'javascript'] },

  { id: 'mern-testing-strategy', title: 'MERN Testing Strategy', category: 'mern-testing', description: 'Balanced testing approach for MERN applications covering unit, integration, and end-to-end tests.', do: ['Unit test business logic in service layer with Jest', 'Integration test API routes with Supertest (test the full request/response cycle)', 'Use in-memory MongoDB (mongodb-memory-server) for test isolation', 'Test React components with React Testing Library (test behavior, not implementation)', 'Use Playwright or Cypress for critical user flows (login, checkout, forms)', 'Aim for 80% code coverage on business logic, less on boilerplate'], dont: ['Test implementation details (internal state, private methods)', 'Mock everything — prefer integration tests that hit real middleware', 'Write tests that depend on test execution order', 'Use snapshot tests for dynamic content — they break on every change', 'Skip testing error paths — errors are where most bugs hide'], languages: ['typescript', 'javascript'] },

  { id: 'mern-security-checklist', title: 'MERN Security Checklist', category: 'mern-security', description: 'Essential security practices for production MERN applications.', do: ['Use helmet() middleware for security headers (CSP, HSTS, X-Frame-Options)', 'Store JWT tokens in httpOnly cookies (not localStorage)', 'Validate and sanitize all user input on the server (never trust the client)', 'Use bcrypt with cost factor 12+ for password hashing', 'Implement rate limiting on auth endpoints (10 attempts per 15 minutes)', 'Use parameterized queries or Mongoose methods (never string-concatenate queries)'], dont: ['Store sensitive data in localStorage or sessionStorage', 'Disable CORS entirely ("*") in production — whitelist specific origins', 'Use eval() or Function() with user input — code injection risk', 'Expose MongoDB connection strings or JWT secrets in client-side code', 'Trust client-side validation alone — always validate server-side'], languages: ['typescript', 'javascript'] },

  // ── Django Extended Best Practices ────────────────────────────────────

  { id: 'django-signals-best-practices', title: 'Django Signals Best Practices', category: 'django-architecture', description: 'Use Django signals appropriately for decoupled side effects.', do: ['Use signals for cross-app communication where direct imports would create circular dependencies', 'Keep signal handlers lightweight — offload heavy work to Celery tasks', 'Use dispatch_uid to prevent duplicate signal handler registration', 'Document which signals each app sends and receives', 'Test signal handlers independently of the models that trigger them'], dont: ['Use signals as the primary control flow — they make code flow hard to trace', 'Put complex business logic in signal handlers — use service functions instead', 'Use signals for operations that must succeed atomically with the triggering operation', 'Forget that signals run synchronously by default — they block the request/response cycle', 'Use pre_save/post_save for cross-model updates — creates hidden coupling and potential infinite loops'], languages: ['python'] },

  { id: 'django-caching-strategy', title: 'Django Caching Strategy', category: 'django-performance', description: 'Implement caching effectively in Django with Redis for API performance.', do: ['Cache expensive database queries with django.core.cache (Redis backend)', 'Use cache key patterns: "model:pk" for objects, "list:page:N" for lists', 'Set appropriate TTLs: 60s for real-time data, 300s for semi-static, 3600s for static', 'Invalidate cache on write operations (post_save signal or in service layer)', 'Use cache.get_or_set() for simple cache-aside pattern'], dont: ['Cache user-specific data with shared cache keys — include user ID in the key', 'Set infinite TTLs — all caches should expire to prevent stale data', 'Cache inside loops — batch cache operations with cache.get_many/set_many', 'Forget to invalidate related caches (e.g., invalidate list cache when an item changes)', 'Cache database querysets directly — they are not serializable; cache .values() or serialized data'], languages: ['python'] },

  { id: 'django-api-pagination', title: 'Django REST Framework Pagination', category: 'django-api', description: 'Implement efficient pagination for DRF APIs.', do: ['Use CursorPagination for large datasets (no count query, consistent ordering)', 'Use PageNumberPagination for admin/dashboard APIs where total count is needed', 'Set max_page_size to prevent clients from requesting excessively large pages', 'Include pagination links (next, previous) in responses for client navigation', 'Add ordering param to control sort order alongside pagination'], dont: ['Use LimitOffsetPagination with large offsets — OFFSET in SQL is slow for large values', 'Allow page_size > 100 — large responses are slow to serialize and transfer', 'Forget that count() queries can be expensive on large tables — consider CursorPagination', 'Return all results without pagination — even small datasets should be paginated for consistency', 'Use pagination on endpoints that naturally return small datasets (e.g., user roles, categories)'], languages: ['python'] },

  // ── Spring Boot Extended Best Practices ────────────────────────────────

  { id: 'spring-testing-strategy', title: 'Spring Boot Testing Strategy', category: 'spring-testing', description: 'Write effective tests for Spring Boot applications with appropriate test scope.', do: ['Use @WebMvcTest for controller-layer tests (fast, tests request/response mapping only)', 'Use @DataJpaTest for repository-layer tests (fast, uses H2/test database)', 'Use @SpringBootTest for integration tests (slow, loads full context)', 'Use MockMvc for API tests — it tests the full request pipeline without starting a server', 'Use @Transactional on test classes to auto-rollback after each test', 'Use TestContainers for database-specific behavior tests'], dont: ['Use @SpringBootTest for every test — it is slow and loads the entire application', 'Mock repositories in integration tests — test the real database interactions', 'Write tests that depend on data from other tests — each test should set up its own data', 'Test Spring Boot auto-configuration — test your code, not the framework', 'Skip testing validation — @Valid annotations are easy to break silently'], languages: ['java'] },

  { id: 'spring-actuator-monitoring', title: 'Spring Boot Actuator Configuration', category: 'spring-devops', description: 'Configure Spring Boot Actuator for production monitoring and health checking.', do: ['Enable only needed endpoints: health, info, metrics, prometheus', 'Secure actuator endpoints: expose on a separate port or require admin role', 'Implement custom health indicators for external dependencies (database, cache, APIs)', 'Use Micrometer for custom business metrics (order count, processing time)', 'Configure liveness and readiness probes for Kubernetes deployments'], dont: ['Expose all actuator endpoints in production — some reveal sensitive information', 'Use /actuator/env or /actuator/configprops in production — they expose secrets', 'Forget to add health checks for external dependencies — /health should reflect real system state', 'Ignore actuator security — treat it as an admin API', 'Rely solely on JVM metrics — add business-level metrics for observability'], languages: ['java'] },

  { id: 'spring-dto-validation', title: 'Spring Boot DTO Validation', category: 'spring-api', description: 'Validate request DTOs thoroughly using Bean Validation annotations.', do: ['Use @Valid on controller parameters to trigger validation', 'Combine annotations: @NotBlank @Size(min=2, max=100) for string fields', 'Use custom validators for complex rules (@StrongPassword, @UniqueEmail)', 'Create separate DTOs for create vs update operations (different required fields)', 'Return validation errors in a consistent format with field names and messages'], dont: ['Validate in service layer what can be caught by Bean Validation annotations', 'Use @NotNull on primitive types (int, boolean) — they cannot be null', 'Forget @Valid on nested objects — nested DTOs are not validated by default', 'Use generic error messages — each validation should explain what is wrong', 'Rely on database constraints for validation — catch errors before hitting the database'], languages: ['java'] },

  // ── .NET Extended Best Practices ──────────────────────────────────────

  { id: 'dotnet-middleware-pipeline', title: 'ASP.NET Core Middleware Pipeline Order', category: 'dotnet-architecture', description: 'Configure the ASP.NET Core middleware pipeline in the correct order for security and functionality.', do: ['Order: ExceptionHandler → HSTS → HttpsRedirection → Static Files → Routing → CORS → Authentication → Authorization → Endpoints', 'Use app.UseExceptionHandler() first to catch all unhandled exceptions', 'Place Authentication before Authorization in the pipeline', 'Use app.UseRouting() before any endpoint-aware middleware', 'Add custom middleware between standard middleware where it makes sense'], dont: ['Place Authorization before Authentication — it cannot work without identity', 'Put CORS after routing — CORS preflight requests need to be handled early', 'Add middleware after endpoint mapping (app.MapControllers) — it will not execute', 'Forget the order matters — each middleware sees the request in pipeline order', 'Use middleware for logic that should be in endpoint filters — middleware runs for ALL requests'], languages: ['csharp'] },

  { id: 'dotnet-ef-performance', title: 'EF Core Performance Optimization', category: 'dotnet-database', description: 'Optimize Entity Framework Core for production performance.', do: ['Use AsNoTracking() for all read-only queries', 'Use projection (Select()) to fetch only needed columns', 'Use compiled queries for hot-path queries that run frequently', 'Use ExecuteUpdateAsync/ExecuteDeleteAsync for bulk operations (EF Core 7+)', 'Use split queries for Include() that returns cartesian products'], dont: ['Load entire entities when you only need 2-3 fields — project to DTOs', 'Use Include() for deep hierarchies without considering the query cost', 'Forget that Count() and Any() hit the database — cache results if called frequently', 'Use FindAsync() for queries with filters — it only works with primary keys', 'Iterate over IQueryable with foreach without materializing — it keeps the connection open'], languages: ['csharp'] },

  { id: 'dotnet-health-checks', title: 'ASP.NET Core Health Checks', category: 'dotnet-devops', description: 'Implement comprehensive health checks for ASP.NET Core applications.', do: ['Add health checks for database, cache, message queue, and external APIs', 'Use separate liveness (/health/live) and readiness (/health/ready) endpoints', 'Set timeouts on health check implementations to prevent hanging', 'Return degraded status when non-critical dependencies are down', 'Use health check UI or prometheus exporter for monitoring dashboards'], dont: ['Put expensive operations in health checks — they run frequently', 'Return unhealthy for degraded dependencies — use Degraded status', 'Forget to add health checks for new dependencies', 'Make health checks that require authentication — load balancers cannot authenticate', 'Use health checks for business logic — they should only check infrastructure'], languages: ['csharp'] },

  // ── Go + React Extended Best Practices ────────────────────────────────

  { id: 'go-testing-patterns', title: 'Go Testing Patterns', category: 'go-testing', description: 'Write effective tests in Go using table-driven tests, test helpers, and testify.', do: ['Use table-driven tests for functions with multiple input/output combinations', 'Use t.Helper() in test helper functions for accurate error line reporting', 'Use t.Parallel() for independent tests to speed up the test suite', 'Use testify/assert for cleaner assertion syntax', 'Use httptest.NewServer for HTTP handler tests', 'Run tests with -race flag in CI to detect data races'], dont: ['Test private functions directly — test through the public API', 'Use package-level state in tests — each test should be independent', 'Skip error path testing — test both success and failure cases', 'Use time.Sleep in tests — use channels or sync primitives for synchronization', 'Write tests that depend on external services — use mocks or test doubles'], languages: ['go'] },

  { id: 'go-logging-structured', title: 'Structured Logging in Go', category: 'go-observability', description: 'Implement structured logging in Go applications for production observability.', do: ['Use structured logging (slog, zap, or zerolog) instead of fmt.Println', 'Include context in every log: request_id, user_id, operation, duration', 'Use log levels appropriately: Debug for development, Info for state changes, Error for failures', 'Log at the boundary (HTTP handlers, service methods) not deep in utility functions', 'Include the error chain in error logs for debugging'], dont: ['Use log.Fatal in request handlers — it calls os.Exit and kills the server', 'Log sensitive data (passwords, tokens, PII) — redact before logging', 'Use fmt.Printf for application logging — it is not structured and has no levels', 'Log inside hot loops — it generates massive log volume and impacts performance', 'Create a new logger instance per request — use context-aware logging'], languages: ['go'] },

  { id: 'go-graceful-shutdown', title: 'Go Graceful Shutdown Pattern', category: 'go-reliability', description: 'Implement graceful shutdown for Go services to handle in-flight requests and cleanup resources.', do: ['Listen for SIGTERM and SIGINT signals to trigger shutdown', 'Use http.Server.Shutdown() which waits for in-flight requests to complete', 'Set a shutdown timeout (10-30 seconds) to prevent hanging', 'Close database connections, message queues, and caches during shutdown', 'Log shutdown progress for debugging deployment issues'], dont: ['Use os.Exit() directly — it skips deferred functions and resource cleanup', 'Set shutdown timeout too short — in-flight requests will be dropped', 'Forget to drain work queues before shutdown — pending work is lost', 'Start new work after receiving shutdown signal — check context cancellation', 'Ignore errors during shutdown cleanup — log them for post-mortem analysis'], languages: ['go'] },

  { id: 'go-config-management', title: 'Go Configuration Management', category: 'go-architecture', description: 'Manage application configuration in Go with environment variables and defaults.', do: ['Load configuration at startup into a typed struct', 'Validate all required configuration values before starting the server', 'Use environment variables for all runtime configuration', 'Provide sensible defaults for non-required configuration', 'Use viper or envconfig for structured config loading', 'Log configuration values at startup (redact secrets)'], dont: ['Read environment variables directly throughout the codebase — centralize in a config package', 'Use hardcoded default values for secrets — fail fast if secrets are missing', 'Parse configuration lazily — validate everything at startup', 'Use global variables for configuration — pass config via dependency injection', 'Store different config formats for different environments — use env vars consistently'], languages: ['go'] },

];

STACK_BEST_PRACTICES.push(...EXTENDED_STACK_BEST_PRACTICES);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENDED ANTI-PATTERNS                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_ANTI_PATTERNS: AntiPattern[] = [

  // ── MERN Extended Anti-Patterns ───────────────────────────────────────

  { id: 'mern-unbounded-array', name: 'Unbounded Arrays in MongoDB Documents', description: 'Storing arrays that grow without limit inside a single MongoDB document.', whyBad: 'MongoDB has a 16MB BSON document size limit. An array that grows with every user action (comments, log entries, events) will eventually hit this limit, crashing the application. Even before hitting the limit, large arrays degrade read/write performance.', fix: 'Use the bucket pattern: group items into time-bounded sub-documents. Or use a separate collection with a reference to the parent document. Set a maximum array size and archive older entries.', severity: 'high', badExample: 'const userSchema = new Schema({ notifications: [{ message: String, date: Date }] }); // Grows forever', goodExample: 'const notificationSchema = new Schema({ userId: { type: ObjectId, ref: "User", index: true }, message: String, date: Date }); // Separate collection, indexed by userId', tags: ['mern', 'mongodb', 'schema-design'] },

  { id: 'mern-no-connection-pool', name: 'Creating New MongoDB Connections Per Request', description: 'Opening a new MongoDB connection for each incoming HTTP request instead of using a connection pool.', whyBad: 'Each new connection has ~50ms overhead (TCP handshake, TLS, auth). Under load, creating hundreds of connections exhausts the MongoDB connection limit and causes connection errors.', fix: 'Create a single mongoose.connect() at application startup. Mongoose maintains a connection pool internally (default: 5 connections). Configure poolSize based on your workload.', severity: 'critical', badExample: 'app.get("/users", async (req, res) => { const conn = await mongoose.connect(MONGODB_URI); const users = await conn.model("User").find(); await conn.disconnect(); });', goodExample: 'await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 }); // Once at startup\napp.get("/users", async (req, res) => { const users = await User.find().lean(); res.json(users); });', tags: ['mern', 'mongodb', 'performance', 'connection'] },

  { id: 'mern-no-input-validation', name: 'No Server-Side Input Validation in Express', description: 'Trusting client-side validation and not validating request data on the server.', whyBad: 'Any user can bypass client-side validation with browser DevTools, curl, or Postman. Unvalidated input leads to SQL/NoSQL injection, XSS, buffer overflow, and data corruption. Never trust the client.', fix: 'Validate all input on the server with Zod, Joi, or express-validator. Validate types, lengths, formats, and business rules. Sanitize strings to prevent XSS. Use Mongoose schema validation as a second layer.', severity: 'critical', badExample: 'app.post("/users", async (req, res) => { const user = await User.create(req.body); // Accepts ANY data res.json(user); });', goodExample: 'const schema = z.object({ name: z.string().min(2).max(100), email: z.string().email() });\napp.post("/users", validate(schema), async (req, res) => { const user = await User.create(req.body); res.json(user); });', tags: ['mern', 'security', 'validation', 'express'] },

  { id: 'mern-monolithic-component', name: 'Monolithic React Components', description: 'Building single React components with hundreds of lines that handle multiple responsibilities.', whyBad: 'Giant components are impossible to test, reuse, or maintain. They re-render entirely on any state change. Multiple developers cannot work on different parts simultaneously. Debugging is like finding a needle in a haystack.', fix: 'Follow the single responsibility principle. Extract sub-components, custom hooks for logic, and utility functions. A component should do one thing well. If it is over 150 lines, it probably does too much.', severity: 'medium', badExample: '// UserDashboard.tsx — 800 lines: fetches data, renders charts, handles forms, manages modals, processes payments', goodExample: '// UserDashboard.tsx — 30 lines: composes sub-components\n// useUserData.ts — custom hook for data fetching\n// UserStats.tsx — stats display\n// UserForm.tsx — form handling\n// PaymentModal.tsx — payment flow', tags: ['mern', 'react', 'architecture', 'maintainability'] },

  // ── Django Extended Anti-Patterns ──────────────────────────────────────

  { id: 'django-raw-sql-injection', name: 'SQL Injection via Raw Queries', description: 'Using string formatting to build raw SQL queries instead of parameterized queries.', whyBad: 'Attackers can inject arbitrary SQL: " OR 1=1 -- " drops all users, "; DROP TABLE users --" deletes the table. The most dangerous web vulnerability (OWASP #1).', fix: 'Always use Django ORM methods (filter, exclude, annotate) which auto-parameterize. For raw SQL, use cursor.execute() with parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", [user_id]).', severity: 'critical', badExample: 'User.objects.raw(f"SELECT * FROM users WHERE email = \'{email}\'")  # SQL INJECTION!', goodExample: 'User.objects.filter(email=email)  # Safe: Django parameterizes the query\n# Or for raw SQL:\ncursor.execute("SELECT * FROM users WHERE email = %s", [email])', tags: ['django', 'security', 'sql-injection'] },

  { id: 'django-no-migration-review', name: 'Not Reviewing Auto-Generated Migrations', description: 'Running makemigrations and migrate without reviewing what the migration actually does.', whyBad: 'Auto-generated migrations can include destructive operations: dropping columns, changing field types, removing indexes. In production, these can cause data loss and downtime.', fix: 'Always review migration SQL before applying: python manage.py sqlmigrate appname 0001. Test migrations on a copy of production data. Use --plan flag to see what will run. Add RunSQL operations for complex data migrations.', severity: 'high', badExample: 'python manage.py makemigrations && python manage.py migrate  # Ship it! (never reviewed)', goodExample: 'python manage.py makemigrations\npython manage.py sqlmigrate myapp 0005  # Review the SQL\npython manage.py migrate --plan  # Check what will run\npython manage.py migrate  # Apply after review', tags: ['django', 'database', 'migration'] },

  { id: 'django-serializer-all-fields', name: 'Using fields = "__all__" in DRF Serializers', description: 'Exposing all model fields through the API serializer.', whyBad: 'Exposes internal fields (password hashes, internal IDs, soft-delete flags) to API consumers. When new fields are added to the model, they are automatically exposed without review. Violates the principle of least privilege.', fix: 'Explicitly list fields in the serializer Meta class. Create separate serializers for list vs detail views. Never expose password, internal flags, or audit fields.', severity: 'high', badExample: 'class UserSerializer(serializers.ModelSerializer):\n    class Meta:\n        model = User\n        fields = "__all__"  # Exposes password_hash, is_staff, last_login_ip...', goodExample: 'class UserSerializer(serializers.ModelSerializer):\n    class Meta:\n        model = User\n        fields = ["id", "email", "first_name", "last_name", "role", "date_joined"]', tags: ['django', 'drf', 'security', 'api'] },

  // ── Spring Boot Extended Anti-Patterns ────────────────────────────────

  { id: 'spring-circular-dependency', name: 'Circular Bean Dependencies', description: 'Two or more Spring beans depending on each other, creating a circular reference.', whyBad: 'Spring cannot resolve the dependency graph. The application fails to start with BeanCurrentlyInCreationException. Even with @Lazy workaround, it indicates poor architecture.', fix: 'Break the cycle by extracting shared logic into a third service. Use events (ApplicationEventPublisher) for decoupled communication. Rethink the architecture — circular dependencies usually mean responsibilities are misplaced.', severity: 'high', badExample: '@Service class UserService { @Autowired OrderService orderService; } // circular\n@Service class OrderService { @Autowired UserService userService; }', goodExample: '@Service class UserService { @Autowired UserOrderFacade facade; } // Break cycle with facade\n@Service class OrderService { @Autowired UserOrderFacade facade; }\n@Service class UserOrderFacade { /* shared logic */ }', tags: ['spring', 'architecture', 'dependency-injection', 'java'] },

  { id: 'spring-eager-fetch-all', name: 'EAGER Fetch Type on All JPA Relationships', description: 'Setting FetchType.EAGER on entity relationships, loading all related data for every query.', whyBad: 'Every query loads the entire object graph. Loading a user also loads all their orders, each order loads all items, each item loads the product. A simple findById becomes dozens of JOINs. Memory usage explodes.', fix: 'Default to FetchType.LAZY (which is the default for @ManyToOne/@OneToMany). Use JOIN FETCH in JPQL queries or @EntityGraph when you need related data. Only load what the specific use case requires.', severity: 'high', badExample: '@OneToMany(fetch = FetchType.EAGER) private List<Order> orders; // Loaded for EVERY user query, even user login', goodExample: '@OneToMany(fetch = FetchType.LAZY) private List<Order> orders; // Loaded only when explicitly accessed or fetched with JOIN FETCH', tags: ['spring', 'jpa', 'performance', 'java'] },

  { id: 'spring-no-logging-context', name: 'Logging Without Context in Spring', description: 'Log messages without request IDs, user IDs, or operation context, making debugging impossible.', whyBad: 'In a multi-threaded server, logs from different requests interleave. Without a request ID, you cannot trace a single request through the system. Without user context, you cannot identify who triggered an error.', fix: 'Use MDC (Mapped Diagnostic Context) to add request ID and user ID to every log statement. Use a filter to set MDC at the start of each request. Configure the log pattern to include MDC values automatically.', severity: 'medium', badExample: 'log.error("Failed to create order"); // Which request? Which user? What order data?', goodExample: 'log.error("Failed to create order: userId={}, items={}", userId, items.size(), ex); // Full context', tags: ['spring', 'logging', 'debugging', 'java'] },

  // ── .NET Extended Anti-Patterns ────────────────────────────────────────

  { id: 'dotnet-async-void', name: 'Using async void Instead of async Task', description: 'Declaring async methods with void return type instead of Task.', whyBad: 'Exceptions in async void methods cannot be caught with try/catch — they crash the entire process. The caller cannot await the method, so there is no way to know when it completes. Fire-and-forget async void methods are a common source of race conditions.', fix: 'Always use async Task for async methods. The only exception is async event handlers (required by the delegate signature). If you need fire-and-forget, use Task.Run and handle errors explicitly.', severity: 'critical', badExample: 'public async void ProcessOrderAsync(int orderId) { // async VOID — exceptions crash the process\n    var order = await _db.Orders.FindAsync(orderId);\n    await _emailService.SendAsync(order.Email, "confirmed");\n}', goodExample: 'public async Task ProcessOrderAsync(int orderId) { // async TASK — exceptions propagate normally\n    var order = await _db.Orders.FindAsync(orderId);\n    await _emailService.SendAsync(order.Email, "confirmed");\n}', tags: ['dotnet', 'async', 'error-handling', 'csharp'] },

  { id: 'dotnet-service-locator', name: 'Service Locator Anti-Pattern', description: 'Resolving dependencies manually from IServiceProvider instead of using constructor injection.', whyBad: 'Hides dependencies — you cannot tell what a class needs by looking at its constructor. Makes testing difficult — you need to set up a full DI container instead of passing mocks. Violates the Dependency Inversion principle.', fix: 'Use constructor injection for all dependencies. If a dependency is optional, use a default implementation or the Null Object pattern. Use IServiceProvider only in factory patterns or when creating scoped services in background tasks.', severity: 'medium', badExample: 'public class OrderService {\n    private readonly IServiceProvider _sp;\n    public OrderService(IServiceProvider sp) { _sp = sp; }\n    public void Process() {\n        var db = _sp.GetRequiredService<AppDbContext>(); // Hidden dependency!\n    }\n}', goodExample: 'public class OrderService {\n    private readonly AppDbContext _db;\n    private readonly IEmailService _email;\n    public OrderService(AppDbContext db, IEmailService email) { _db = db; _email = email; }\n}', tags: ['dotnet', 'dependency-injection', 'architecture', 'csharp'] },

  { id: 'dotnet-no-cancellation-token', name: 'Not Passing CancellationToken', description: 'Async methods that do not accept or propagate CancellationToken.', whyBad: 'When a client disconnects, the server continues processing the request wastefully. Long-running operations cannot be cancelled, tying up threads and resources. In microservices, cascading timeouts cause system-wide slowdowns.', fix: 'Accept CancellationToken as the last parameter in all async methods. Pass it to EF Core queries, HttpClient calls, and other async operations. Check ct.IsCancellationRequested in loops.', severity: 'medium', badExample: 'public async Task<List<User>> GetAllAsync() {\n    return await _db.Users.ToListAsync(); // Cannot be cancelled\n}', goodExample: 'public async Task<List<User>> GetAllAsync(CancellationToken ct = default) {\n    return await _db.Users.ToListAsync(ct); // Cancels on client disconnect\n}', tags: ['dotnet', 'async', 'performance', 'csharp'] },

  // ── Go + React Extended Anti-Patterns ─────────────────────────────────

  { id: 'go-channel-misuse', name: 'Channel Misuse in Go', description: 'Using Go channels incorrectly: sending on closed channels, unbuffered channels without receivers, or channels as mutexes.', whyBad: 'Sending on a closed channel panics. Sending on an unbuffered channel without a ready receiver blocks the goroutine forever. Using channels where a mutex is simpler adds unnecessary complexity.', fix: 'Only close channels from the sender side, never the receiver. Use buffered channels when the sender should not block. Use sync.Mutex for protecting shared state — channels are for communication between goroutines.', severity: 'high', badExample: 'ch := make(chan int)\nclose(ch)\nch <- 1 // PANIC: send on closed channel\n\nch2 := make(chan int) // unbuffered\nch2 <- 1 // DEADLOCK: no receiver', goodExample: 'ch := make(chan int, 10) // buffered — sender won\'t block until buffer is full\ngo func() { for v := range ch { process(v) } }() // receiver\nfor _, item := range items { ch <- item }\nclose(ch) // close after all sends, from sender side', tags: ['go', 'concurrency', 'channels'] },

  { id: 'go-sql-connection-leak', name: 'SQL Connection Leak in Go', description: 'Not closing sql.Rows after query, leaking database connections from the pool.', whyBad: 'Each unclosed Rows holds a database connection from the pool. After enough leaks, all connections are exhausted. New queries block or timeout. The application becomes unresponsive.', fix: 'Always defer rows.Close() immediately after Query/QueryContext. Check for errors after rows.Err() iteration. Use QueryRow for single-row queries (auto-closes). Use database/sql scanner libraries that handle closing.', severity: 'critical', badExample: 'rows, err := db.Query("SELECT * FROM users")\nif err != nil { return err }\n// Missing defer rows.Close() — connection leaked!\nfor rows.Next() { /* ... */ }', goodExample: 'rows, err := db.QueryContext(ctx, "SELECT * FROM users")\nif err != nil { return err }\ndefer rows.Close() // Always close!\nfor rows.Next() { /* ... */ }\nif err := rows.Err(); err != nil { return err }', tags: ['go', 'database', 'connection-pool', 'memory-leak'] },

  { id: 'go-empty-interface-overuse', name: 'Overusing interface{}/any in Go', description: 'Using empty interface (interface{} or any) instead of concrete types or specific interfaces.', whyBad: 'Loses all type safety benefits of Go. Runtime type assertions are needed everywhere, adding error-prone code. IDE autocomplete and refactoring tools cannot help. Errors that should be caught at compile time become runtime panics.', fix: 'Use concrete types when the type is known. Define narrow interfaces for polymorphism: io.Reader, io.Writer, fmt.Stringer. Use generics (Go 1.18+) for type-safe generic functions. Reserve any for truly unknown types (JSON parsing, reflection).', severity: 'medium', badExample: 'func Process(data any) any {\n    m := data.(map[string]any) // Runtime panic if wrong type\n    name := m["name"].(string) // Another potential panic\n    return map[string]any{"processed": name}\n}', goodExample: 'type ProcessInput struct { Name string }\ntype ProcessOutput struct { Processed string }\nfunc Process(data ProcessInput) ProcessOutput {\n    return ProcessOutput{Processed: data.Name} // Compile-time type safety\n}', tags: ['go', 'types', 'architecture'] },

  { id: 'go-context-key-collision', name: 'Using String Keys for context.Value', description: 'Using plain strings as context keys, risking key collisions between packages.', whyBad: 'If two packages use the same string key (e.g., "userID"), they silently overwrite each other\'s values. This is a subtle, hard-to-debug bug that only manifests when specific packages are used together.', fix: 'Define unexported custom types as context keys. Each package should use its own key type. This guarantees no collisions because different types are never equal, even if the underlying values match.', severity: 'medium', badExample: 'ctx = context.WithValue(ctx, "userID", 123) // String key — collision risk\nid := ctx.Value("userID").(int)', goodExample: 'type contextKey string\nconst userIDKey contextKey = "userID" // Package-private type — no collisions\nctx = context.WithValue(ctx, userIDKey, 123)\nid := ctx.Value(userIDKey).(int)', tags: ['go', 'context', 'architecture'] },

];

STACK_ANTI_PATTERNS.push(...EXTENDED_STACK_ANTI_PATTERNS);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENDED STACK CODE SNIPPETS — BATCH 2                                 ║
// ║  Advanced deployment, testing, monitoring, and infrastructure patterns  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_SNIPPETS_2: CodeSnippet[] = [

  // ── MERN Deployment & Infrastructure ───────────────────────────────────

  {
    id: 'mern-docker-compose',
    title: 'Docker Compose for MERN Development Environment',
    description: 'Complete Docker Compose setup for MERN stack with MongoDB, Redis, Node.js backend, and React frontend.',
    tech: ['docker', 'mongodb', 'redis', 'node', 'react'],
    tags: ['mern', 'docker', 'deployment', 'devops'],
    code: `# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: myapp-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD:-devpassword}
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongodb_data:/data/db
      - ./docker/mongo-init.js:/docker-entrypoint-initdb.d/init.js
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - myapp-network

  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - myapp-network

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: myapp-api
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: development
      PORT: 5000
      MONGODB_URI: mongodb://admin:\${MONGO_PASSWORD:-devpassword}@mongodb:27017/myapp?authSource=admin
      REDIS_URL: redis://redis:6379
      JWT_SECRET: \${JWT_SECRET:-dev-jwt-secret-change-in-prod}
      JWT_REFRESH_SECRET: \${JWT_REFRESH_SECRET:-dev-refresh-secret-change-in-prod}
      CLIENT_URL: http://localhost:3000
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./server/src:/app/src
      - /app/node_modules
    networks:
      - myapp-network

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: myapp-client
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:5000
    volumes:
      - ./client/src:/app/src
      - /app/node_modules
    depends_on:
      - api
    networks:
      - myapp-network

volumes:
  mongodb_data:
  redis_data:

networks:
  myapp-network:
    driver: bridge

# --- server/Dockerfile ---
# FROM node:20-alpine AS base
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# EXPOSE 5000
# CMD ["npm", "run", "dev"]
#
# --- client/Dockerfile ---
# FROM node:20-alpine AS base
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# EXPOSE 3000
# CMD ["npm", "run", "dev", "--", "--host"]`,
  },

  {
    id: 'mern-mongoose-transaction',
    title: 'Mongoose Multi-Document Transactions',
    description: 'MongoDB transactions for atomic multi-document operations using Mongoose sessions.',
    tech: ['mongodb', 'mongoose', 'typescript', 'node'],
    tags: ['mern', 'database', 'transaction', 'mongodb'],
    code: `import mongoose, { ClientSession } from 'mongoose';
import { Order, IOrder } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<IOrder> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

    const customer = await User.findById(input.customerId).session(session);
    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    const productIds = input.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .session(session)
      .lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let totalAmount = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new AppError(404, \`Product \${item.productId} not found\`);
      }
      if (product.stock < item.quantity) {
        throw new AppError(422, \`Insufficient stock for \${product.name}: available \${product.stock}, requested \${item.quantity}\`);
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
      });

      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity, soldCount: item.quantity } },
        { session }
      );
    }

    const orderNumber = \`ORD-\${Date.now()}-\${Math.random().toString(36).substring(2, 8).toUpperCase()}\`;

    const [order] = await Order.create(
      [
        {
          orderNumber,
          customer: input.customerId,
          items: orderItems,
          totalAmount,
          shippingAddress: input.shippingAddress,
          notes: input.notes,
          status: 'pending',
        },
      ],
      { session }
    );

    await User.findByIdAndUpdate(
      input.customerId,
      {
        $inc: { orderCount: 1, totalSpent: totalAmount },
        $set: { lastOrderAt: new Date() },
      },
      { session }
    );

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}`,
  },

  {
    id: 'mern-redis-session-store',
    title: 'Redis Session Store for Express',
    description: 'Redis-backed session management for Express with session rotation, secure cookies, and cleanup.',
    tech: ['express', 'redis', 'typescript', 'node'],
    tags: ['mern', 'session', 'redis', 'security'],
    code: `import session from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import { Application } from 'express';

const RedisStore = connectRedis(session);

export function configureSession(app: Application) {
  const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
  });

  redisClient.on('error', (err) => console.error('[Redis Session] Error:', err));
  redisClient.on('connect', () => console.log('[Redis Session] Connected'));

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    session({
      store: new RedisStore({
        client: redisClient as any,
        prefix: 'session:',
        ttl: 86400,
        disableTouch: false,
      }),
      name: 'sid',
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
      },
      genid: () => {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
      },
    })
  );

  return redisClient;
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
    loginAt: number;
    lastActivity: number;
    ip: string;
    userAgent: string;
  }
}

export function createSession(
  req: import('express').Request,
  userId: string,
  role: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);

      req.session.userId = userId;
      req.session.role = role;
      req.session.loginAt = Date.now();
      req.session.lastActivity = Date.now();
      req.session.ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip || '';
      req.session.userAgent = req.headers['user-agent'] || '';

      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export function destroySession(req: import('express').Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function requireSession(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Session required' });
  }

  const MAX_IDLE = 30 * 60 * 1000;
  if (Date.now() - (req.session.lastActivity || 0) > MAX_IDLE) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session expired' });
  }

  req.session.lastActivity = Date.now();
  next();
}`,
  },

  // ── Django Deployment & Infrastructure ─────────────────────────────────

  {
    id: 'django-gunicorn-config',
    title: 'Django Gunicorn Production Configuration',
    description: 'Production Gunicorn configuration for Django with worker tuning, logging, and graceful shutdown.',
    tech: ['django', 'gunicorn', 'python'],
    tags: ['django', 'deployment', 'gunicorn', 'production'],
    code: `# gunicorn.conf.py
import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = os.getenv('GUNICORN_WORKER_CLASS', 'gthread')
threads = int(os.getenv('GUNICORN_THREADS', '4'))

max_requests = int(os.getenv('GUNICORN_MAX_REQUESTS', '1000'))
max_requests_jitter = int(os.getenv('GUNICORN_MAX_REQUESTS_JITTER', '50'))
timeout = int(os.getenv('GUNICORN_TIMEOUT', '30'))
graceful_timeout = int(os.getenv('GUNICORN_GRACEFUL_TIMEOUT', '30'))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', '5'))

accesslog = '-'
errorlog = '-'
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

preload_app = True

forwarded_allow_ips = '*'
proxy_allow_from = '*'

def on_starting(server):
    server.log.info("Gunicorn starting with %d workers", workers)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def worker_exit(server, worker):
    server.log.info("Worker exited (pid: %s)", worker.pid)

def pre_exec(server):
    server.log.info("Forked child, re-executing")

# --- Dockerfile for Django + Gunicorn ---
# FROM python:3.12-slim AS base
# WORKDIR /app
#
# RUN apt-get update && apt-get install -y --no-install-recommends \\
#     libpq-dev gcc && \\
#     rm -rf /var/lib/apt/lists/*
#
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
#
# COPY . .
# RUN python manage.py collectstatic --noinput
#
# EXPOSE 8000
#
# ENV DJANGO_SETTINGS_MODULE=config.settings.production
# ENV PYTHONUNBUFFERED=1
# ENV PYTHONDONTWRITEBYTECODE=1
#
# CMD ["gunicorn", "config.wsgi:application", "-c", "gunicorn.conf.py"]

# --- requirements.txt (core) ---
# Django>=5.0,<5.1
# djangorestframework>=3.14
# django-filter>=23.5
# django-cors-headers>=4.3
# djangorestframework-simplejwt>=5.3
# psycopg[binary]>=3.1
# redis>=5.0
# django-redis>=5.4
# celery[redis]>=5.3
# gunicorn>=21.2
# whitenoise>=6.6
# django-environ>=0.11`,
  },

  {
    id: 'django-redis-cache-service',
    title: 'Django Cache Service with Redis',
    description: 'Comprehensive cache service for Django with Redis backend, cache decorators, and cache invalidation patterns.',
    tech: ['django', 'redis', 'python'],
    tags: ['django', 'cache', 'redis', 'performance'],
    code: `from django.core.cache import cache
from django.conf import settings
from functools import wraps
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class CacheService:
    DEFAULT_TTL = 300
    LONG_TTL = 3600
    SHORT_TTL = 60

    @staticmethod
    def make_key(*parts):
        key = ':'.join(str(p) for p in parts)
        if len(key) > 200:
            key_hash = hashlib.md5(key.encode()).hexdigest()
            return f'{parts[0]}:{key_hash}'
        return key

    @staticmethod
    def get(key, default=None):
        try:
            return cache.get(key, default)
        except Exception as e:
            logger.warning(f'Cache get failed for {key}: {e}')
            return default

    @staticmethod
    def set(key, value, ttl=None):
        try:
            cache.set(key, value, ttl or CacheService.DEFAULT_TTL)
        except Exception as e:
            logger.warning(f'Cache set failed for {key}: {e}')

    @staticmethod
    def get_or_set(key, fetcher, ttl=None):
        value = CacheService.get(key)
        if value is not None:
            return value
        value = fetcher()
        CacheService.set(key, value, ttl)
        return value

    @staticmethod
    def delete(*keys):
        try:
            cache.delete_many(list(keys))
        except Exception as e:
            logger.warning(f'Cache delete failed: {e}')

    @staticmethod
    def delete_pattern(pattern):
        try:
            from django_redis import get_redis_connection
            conn = get_redis_connection('default')
            keys = conn.keys(f'*{pattern}*')
            if keys:
                conn.delete(*keys)
                logger.info(f'Deleted {len(keys)} cache keys matching {pattern}')
        except Exception as e:
            logger.warning(f'Cache pattern delete failed for {pattern}: {e}')

    @staticmethod
    def get_many(keys):
        try:
            return cache.get_many(keys)
        except Exception as e:
            logger.warning(f'Cache get_many failed: {e}')
            return {}

    @staticmethod
    def set_many(mapping, ttl=None):
        try:
            cache.set_many(mapping, ttl or CacheService.DEFAULT_TTL)
        except Exception as e:
            logger.warning(f'Cache set_many failed: {e}')


def cached(key_prefix, ttl=300, key_func=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if key_func:
                cache_key = CacheService.make_key(key_prefix, key_func(*args, **kwargs))
            else:
                parts = [str(a) for a in args] + [f'{k}={v}' for k, v in sorted(kwargs.items())]
                cache_key = CacheService.make_key(key_prefix, *parts)

            result = CacheService.get(cache_key)
            if result is not None:
                return result

            result = func(*args, **kwargs)
            CacheService.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator


def invalidate_cache(*patterns):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            for pattern in patterns:
                if callable(pattern):
                    key = pattern(*args, **kwargs)
                    CacheService.delete(key)
                else:
                    CacheService.delete_pattern(pattern)
            return result
        return wrapper
    return decorator


# --- Usage examples ---
# @cached('article', ttl=300, key_func=lambda self, pk: str(pk))
# def get_article(self, pk):
#     return Article.objects.select_related('author').get(pk=pk)
#
# @cached('article_list', ttl=60)
# def get_published_articles(self, page=1, per_page=20):
#     return list(Article.published.all()[(page-1)*per_page:page*per_page].values())
#
# @invalidate_cache(
#     lambda self, pk, **kw: f'article:{pk}',
#     'article_list',
# )
# def update_article(self, pk, **data):
#     return Article.objects.filter(pk=pk).update(**data)`,
  },

  {
    id: 'django-websocket-channels',
    title: 'Django Channels WebSocket Consumer',
    description: 'Django Channels WebSocket consumer for real-time notifications with groups, authentication, and message routing.',
    tech: ['django', 'channels', 'redis', 'python'],
    tags: ['django', 'websocket', 'real-time', 'channels'],
    code: `import json
import logging
from channels.generic.websocket import AsyncJsonWebSocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationConsumer(AsyncJsonWebSocketConsumer):
    async def connect(self):
        self.user = await self.authenticate()
        if not self.user:
            await self.close(code=4001)
            return

        self.user_group = f'user_{self.user.id}'
        self.role_group = f'role_{self.user.role}'

        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.role_group, self.channel_name)
        await self.channel_layer.group_add('broadcast', self.channel_name)

        await self.accept()
        await self.send_json({
            'type': 'connection.established',
            'data': {'user_id': str(self.user.id), 'username': self.user.email},
        })

        logger.info(f'WebSocket connected: user={self.user.email}')

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
            await self.channel_layer.group_discard(self.role_group, self.channel_name)
            await self.channel_layer.group_discard('broadcast', self.channel_name)
        logger.info(f'WebSocket disconnected: code={close_code}')

    async def receive_json(self, content):
        msg_type = content.get('type')

        handlers = {
            'ping': self.handle_ping,
            'notification.read': self.handle_notification_read,
            'notification.read_all': self.handle_notification_read_all,
        }

        handler = handlers.get(msg_type)
        if handler:
            await handler(content)
        else:
            await self.send_json({'type': 'error', 'data': {'message': f'Unknown message type: {msg_type}'}})

    async def handle_ping(self, content):
        await self.send_json({'type': 'pong', 'data': {'timestamp': content.get('timestamp')}})

    async def handle_notification_read(self, content):
        notification_id = content.get('data', {}).get('id')
        if notification_id:
            await self.mark_notification_read(notification_id)
            await self.send_json({
                'type': 'notification.read.confirmed',
                'data': {'id': notification_id},
            })

    async def handle_notification_read_all(self, content):
        count = await self.mark_all_notifications_read()
        await self.send_json({
            'type': 'notification.read_all.confirmed',
            'data': {'count': count},
        })

    async def notification_message(self, event):
        await self.send_json({
            'type': 'notification.new',
            'data': event['data'],
        })

    async def system_announcement(self, event):
        await self.send_json({
            'type': 'system.announcement',
            'data': event['data'],
        })

    async def authenticate(self):
        token = self.scope.get('query_string', b'').decode()
        if token.startswith('token='):
            token = token.split('=', 1)[1]

        if not token:
            headers = dict(self.scope.get('headers', []))
            auth = headers.get(b'authorization', b'').decode()
            if auth.startswith('Bearer '):
                token = auth[7:]

        if not token:
            return None

        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return await self.get_user(user_id)
        except (TokenError, Exception) as e:
            logger.warning(f'WebSocket auth failed: {e}')
            return None

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from api.models import Notification
        Notification.objects.filter(id=notification_id, user=self.user).update(is_read=True)

    @database_sync_to_async
    def mark_all_notifications_read(self):
        from api.models import Notification
        return Notification.objects.filter(user=self.user, is_read=False).update(is_read=True)`,
  },

  // ── Spring Boot Deployment & Infrastructure ───────────────────────────

  {
    id: 'spring-application-yml',
    title: 'Spring Boot application.yml Production Configuration',
    description: 'Comprehensive Spring Boot configuration with profiles, database, security, and monitoring settings.',
    tech: ['spring-boot', 'java'],
    tags: ['spring', 'config', 'deployment', 'production', 'java'],
    code: `# application.yml
spring:
  application:
    name: myapp-api

  profiles:
    active: \${SPRING_PROFILES_ACTIVE:dev}

  datasource:
    url: \${DATABASE_URL:jdbc:postgresql://localhost:5432/myapp}
    username: \${DATABASE_USER:postgres}
    password: \${DATABASE_PASSWORD:}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: \${HIKARI_MAX_POOL:20}
      minimum-idle: \${HIKARI_MIN_IDLE:10}
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      leak-detection-threshold: 60000
      pool-name: myapp-pool

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        format_sql: false
        generate_statistics: false
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
        default_batch_fetch_size: 25

  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
    validate-on-migrate: true

  cache:
    type: redis
    redis:
      time-to-live: 300000
      cache-null-values: false

  data:
    redis:
      host: \${REDIS_HOST:localhost}
      port: \${REDIS_PORT:6379}
      password: \${REDIS_PASSWORD:}
      timeout: 5000
      lettuce:
        pool:
          max-active: 16
          max-idle: 8
          min-idle: 4

server:
  port: \${PORT:8080}
  shutdown: graceful
  compression:
    enabled: true
    mime-types: application/json,text/plain,text/css,application/javascript
    min-response-size: 1024
  error:
    include-message: never
    include-stacktrace: never
    include-binding-errors: never

jwt:
  secret: \${JWT_SECRET}
  issuer: myapp-api
  audience: myapp-client
  expiration: 900000
  refresh-expiration: 604800000

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
      base-path: /actuator
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true
  health:
    db:
      enabled: true
    redis:
      enabled: true
    diskspace:
      enabled: true

logging:
  level:
    root: INFO
    com.myapp: INFO
    org.springframework.security: WARN
    org.hibernate.SQL: WARN
    org.hibernate.type.descriptor.sql: WARN
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"

---
spring:
  config:
    activate:
      on-profile: dev
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
logging:
  level:
    com.myapp: DEBUG
    org.hibernate.SQL: DEBUG

---
spring:
  config:
    activate:
      on-profile: prod
  jpa:
    show-sql: false
server:
  ssl:
    enabled: false`,
  },

  {
    id: 'spring-scheduled-task',
    title: 'Spring Boot Scheduled Tasks with Lock and Monitoring',
    description: 'Scheduled tasks with ShedLock for distributed locking, monitoring, and error handling.',
    tech: ['spring-boot', 'shedlock', 'java'],
    tags: ['spring', 'scheduling', 'cron', 'distributed', 'java'],
    code: `package com.myapp.scheduler;

import com.myapp.service.OrderService;
import com.myapp.service.ReportService;
import com.myapp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledTasks {

    private final OrderService orderService;
    private final ReportService reportService;
    private final NotificationService notificationService;
    private final MeterRegistry meterRegistry;

    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "processExpiredOrders", lockAtMostFor = "PT4M", lockAtLeastFor = "PT1M")
    public void processExpiredOrders() {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            log.info("Starting expired order processing");
            int processed = orderService.cancelExpiredOrders(Duration.ofHours(24));
            log.info("Processed {} expired orders", processed);
            meterRegistry.counter("scheduler.expired_orders.processed").increment(processed);
        } catch (Exception e) {
            log.error("Failed to process expired orders", e);
            meterRegistry.counter("scheduler.expired_orders.errors").increment();
        } finally {
            sample.stop(meterRegistry.timer("scheduler.expired_orders.duration"));
        }
    }

    @Scheduled(cron = "0 0 2 * * *")
    @SchedulerLock(name = "generateDailyReport", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    public void generateDailyReport() {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            log.info("Starting daily report generation");
            var report = reportService.generateDailyReport();
            notificationService.notifyAdmins("Daily report ready", report.getUrl());
            log.info("Daily report generated: {}", report.getUrl());
        } catch (Exception e) {
            log.error("Failed to generate daily report", e);
            notificationService.notifyAdmins("Daily report FAILED", e.getMessage());
        } finally {
            sample.stop(meterRegistry.timer("scheduler.daily_report.duration"));
        }
    }

    @Scheduled(fixedDelayString = "\${scheduler.cleanup.delay:3600000}")
    @SchedulerLock(name = "cleanupTempFiles", lockAtMostFor = "PT10M")
    public void cleanupTemporaryFiles() {
        try {
            log.info("Starting temporary file cleanup");
            int deleted = reportService.cleanupTempFiles(Duration.ofDays(7));
            log.info("Cleaned up {} temporary files", deleted);
        } catch (Exception e) {
            log.error("Temp file cleanup failed", e);
        }
    }

    @Scheduled(cron = "0 0 * * * *")
    @SchedulerLock(name = "sendPendingNotifications", lockAtMostFor = "PT10M", lockAtLeastFor = "PT2M")
    public void sendPendingNotifications() {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            log.info("Processing pending notifications");
            var result = notificationService.processPendingBatch(100);
            log.info("Notifications: sent={}, failed={}", result.getSent(), result.getFailed());
            meterRegistry.counter("scheduler.notifications.sent").increment(result.getSent());
            meterRegistry.counter("scheduler.notifications.failed").increment(result.getFailed());
        } catch (Exception e) {
            log.error("Notification processing failed", e);
        } finally {
            sample.stop(meterRegistry.timer("scheduler.notifications.duration"));
        }
    }
}

// --- ShedLock Configuration ---
// @Configuration
// @EnableScheduling
// public class SchedulerConfig {
//     @Bean
//     public LockProvider lockProvider(DataSource dataSource) {
//         return new JdbcTemplateLockProvider(
//             JdbcTemplateLockProvider.Configuration.builder()
//                 .withJdbcTemplate(new JdbcTemplate(dataSource))
//                 .usingDbTime()
//                 .build()
//         );
//     }
// }
//
// -- SQL for ShedLock table --
// CREATE TABLE shedlock (
//     name VARCHAR(64) NOT NULL PRIMARY KEY,
//     lock_until TIMESTAMP NOT NULL,
//     locked_at TIMESTAMP NOT NULL,
//     locked_by VARCHAR(255) NOT NULL
// );`,
  },

  {
    id: 'spring-event-driven',
    title: 'Spring Boot Event-Driven Architecture',
    description: 'Domain events with Spring ApplicationEventPublisher for decoupled microservice communication.',
    tech: ['spring-boot', 'java'],
    tags: ['spring', 'events', 'domain-driven', 'architecture', 'java'],
    code: `package com.myapp.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.time.Instant;
import java.util.UUID;

@Getter
public abstract class DomainEvent extends ApplicationEvent {
    private final String eventId;
    private final Instant occurredAt;
    private final String aggregateId;

    protected DomainEvent(Object source, String aggregateId) {
        super(source);
        this.eventId = UUID.randomUUID().toString();
        this.occurredAt = Instant.now();
        this.aggregateId = aggregateId;
    }
}

@Getter
public class OrderCreatedEvent extends DomainEvent {
    private final String orderNumber;
    private final Long customerId;
    private final java.math.BigDecimal totalAmount;
    private final int itemCount;

    public OrderCreatedEvent(Object source, String orderId, String orderNumber,
                             Long customerId, java.math.BigDecimal totalAmount, int itemCount) {
        super(source, orderId);
        this.orderNumber = orderNumber;
        this.customerId = customerId;
        this.totalAmount = totalAmount;
        this.itemCount = itemCount;
    }
}

@Getter
public class OrderStatusChangedEvent extends DomainEvent {
    private final String oldStatus;
    private final String newStatus;
    private final Long customerId;

    public OrderStatusChangedEvent(Object source, String orderId,
                                    String oldStatus, String newStatus, Long customerId) {
        super(source, orderId);
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.customerId = customerId;
    }
}

// --- Event Publisher in Service ---
package com.myapp.service;

import com.myapp.event.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public OrderDTO createOrder(CreateOrderRequest request) {
        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setOrderNumber(generateOrderNumber());
        order.setStatus(OrderStatus.PENDING);
        order = orderRepository.save(order);

        eventPublisher.publishEvent(new OrderCreatedEvent(
            this, order.getId().toString(), order.getOrderNumber(),
            order.getCustomerId(), order.getTotalAmount(), order.getItems().size()
        ));

        return toDTO(order);
    }

    @Transactional
    public OrderDTO updateStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        String oldStatus = order.getStatus().name();
        order.setStatus(newStatus);
        order = orderRepository.save(order);

        eventPublisher.publishEvent(new OrderStatusChangedEvent(
            this, order.getId().toString(),
            oldStatus, newStatus.name(), order.getCustomerId()
        ));

        return toDTO(order);
    }
}

// --- Event Listeners ---
package com.myapp.listener;

import com.myapp.event.*;
import com.myapp.service.EmailService;
import com.myapp.service.AnalyticsService;
import com.myapp.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventListener {

    private final EmailService emailService;
    private final AnalyticsService analyticsService;
    private final InventoryService inventoryService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Order created: {} for customer {}", event.getOrderNumber(), event.getCustomerId());
        emailService.sendOrderConfirmation(event.getCustomerId(), event.getOrderNumber());
        analyticsService.trackOrderCreated(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        log.info("Order {} status: {} -> {}", event.getAggregateId(), event.getOldStatus(), event.getNewStatus());
        emailService.sendStatusUpdate(event.getCustomerId(), event.getAggregateId(), event.getNewStatus());

        if ("CONFIRMED".equals(event.getNewStatus())) {
            inventoryService.reserveStock(event.getAggregateId());
        }
        if ("CANCELLED".equals(event.getNewStatus())) {
            inventoryService.releaseStock(event.getAggregateId());
        }
    }
}`,
  },

  // ── .NET Deployment & Infrastructure ───────────────────────────────────

  {
    id: 'dotnet-background-service',
    title: 'ASP.NET Core Background Service with Queue',
    description: 'Hosted background service for processing queued work items with cancellation and error handling.',
    tech: ['aspnet-core', 'csharp'],
    tags: ['dotnet', 'background-service', 'queue', 'worker', 'csharp'],
    code: `using System.Threading.Channels;

namespace MyApp.Services;

public interface IBackgroundTaskQueue
{
    ValueTask QueueAsync(Func<IServiceProvider, CancellationToken, Task> workItem);
    ValueTask<Func<IServiceProvider, CancellationToken, Task>> DequeueAsync(CancellationToken ct);
}

public class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<Func<IServiceProvider, CancellationToken, Task>> _queue;

    public BackgroundTaskQueue(int capacity = 100)
    {
        _queue = Channel.CreateBounded<Func<IServiceProvider, CancellationToken, Task>>(
            new BoundedChannelOptions(capacity)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = false,
                SingleWriter = false,
            });
    }

    public async ValueTask QueueAsync(Func<IServiceProvider, CancellationToken, Task> workItem)
    {
        ArgumentNullException.ThrowIfNull(workItem);
        await _queue.Writer.WriteAsync(workItem);
    }

    public async ValueTask<Func<IServiceProvider, CancellationToken, Task>> DequeueAsync(
        CancellationToken ct)
    {
        return await _queue.Reader.ReadAsync(ct);
    }
}

public class QueuedHostedService : BackgroundService
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QueuedHostedService> _logger;

    public QueuedHostedService(
        IBackgroundTaskQueue taskQueue,
        IServiceScopeFactory scopeFactory,
        ILogger<QueuedHostedService> logger)
    {
        _taskQueue = taskQueue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation("Background queue service starting");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var workItem = await _taskQueue.DequeueAsync(ct);

                using var scope = _scopeFactory.CreateScope();
                await workItem(scope.ServiceProvider, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing queued work item");
                await Task.Delay(1000, ct);
            }
        }

        _logger.LogInformation("Background queue service stopping");
    }
}

public class TimedCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TimedCleanupService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public TimedCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<TimedCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation("Timed cleanup service starting");

        using var timer = new PeriodicTimer(_interval);
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var threshold = DateTime.UtcNow.AddDays(-30);
                var deleted = await db.AuditLogs
                    .Where(a => a.CreatedAt < threshold)
                    .ExecuteDeleteAsync(ct);

                _logger.LogInformation("Cleaned up {Count} old audit logs", deleted);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cleanup failed");
            }
        }
    }
}

// --- Registration in Program.cs ---
// builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
// builder.Services.AddHostedService<QueuedHostedService>();
// builder.Services.AddHostedService<TimedCleanupService>();
//
// --- Usage ---
// app.MapPost("/api/reports", async (IBackgroundTaskQueue queue) =>
// {
//     await queue.QueueAsync(async (sp, ct) =>
//     {
//         var reportService = sp.GetRequiredService<IReportService>();
//         await reportService.GenerateAsync(ct);
//     });
//     return Results.Accepted();
// });`,
  },

  {
    id: 'dotnet-signalr-hub',
    title: 'ASP.NET Core SignalR Hub for Real-Time Notifications',
    description: 'SignalR hub with authentication, groups, typed clients, and broadcast patterns.',
    tech: ['aspnet-core', 'signalr', 'csharp'],
    tags: ['dotnet', 'signalr', 'real-time', 'websocket', 'csharp'],
    code: `using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MyApp.Hubs;

public interface INotificationClient
{
    Task ReceiveNotification(NotificationDto notification);
    Task ReceiveMessage(ChatMessageDto message);
    Task UserJoined(string userId, string userName);
    Task UserLeft(string userId);
    Task ReceiveTypingIndicator(string userId, bool isTyping);
    Task ReceiveSystemMessage(string message);
}

public record NotificationDto(string Id, string Type, string Title, string Body, DateTime CreatedAt);
public record ChatMessageDto(string Id, string SenderId, string SenderName, string Content, DateTime SentAt);

[Authorize]
public class NotificationHub : Hub<INotificationClient>
{
    private readonly ILogger<NotificationHub> _logger;
    private static readonly Dictionary<string, HashSet<string>> _userConnections = new();
    private static readonly object _lock = new();

    public NotificationHub(ILogger<NotificationHub> logger) => _logger = logger;

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value ?? Context.UserIdentifier;
        if (userId == null) { Context.Abort(); return; }

        lock (_lock)
        {
            if (!_userConnections.ContainsKey(userId))
                _userConnections[userId] = new HashSet<string>();
            _userConnections[userId].Add(Context.ConnectionId);
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        _logger.LogInformation("Client connected: {UserId} ({ConnectionId})", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst("sub")?.Value ?? Context.UserIdentifier;
        if (userId != null)
        {
            lock (_lock)
            {
                if (_userConnections.TryGetValue(userId, out var connections))
                {
                    connections.Remove(Context.ConnectionId);
                    if (connections.Count == 0) _userConnections.Remove(userId);
                }
            }
            _logger.LogInformation("Client disconnected: {UserId}", userId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"room:{roomId}");
        var userName = Context.User?.FindFirst("name")?.Value ?? "Unknown";
        var userId = Context.UserIdentifier ?? "unknown";
        await Clients.Group($"room:{roomId}").UserJoined(userId, userName);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"room:{roomId}");
        var userId = Context.UserIdentifier ?? "unknown";
        await Clients.Group($"room:{roomId}").UserLeft(userId);
    }

    public async Task SendMessage(string roomId, string content)
    {
        var userId = Context.UserIdentifier ?? "unknown";
        var userName = Context.User?.FindFirst("name")?.Value ?? "Unknown";

        var message = new ChatMessageDto(
            Guid.NewGuid().ToString(), userId, userName, content, DateTime.UtcNow);

        await Clients.Group($"room:{roomId}").ReceiveMessage(message);
    }

    public async Task SendTypingIndicator(string roomId, bool isTyping)
    {
        var userId = Context.UserIdentifier ?? "unknown";
        await Clients.OthersInGroup($"room:{roomId}").ReceiveTypingIndicator(userId, isTyping);
    }

    public static bool IsUserOnline(string userId)
    {
        lock (_lock) { return _userConnections.ContainsKey(userId); }
    }
}

// --- Sending notifications from anywhere ---
// public class NotificationSender
// {
//     private readonly IHubContext<NotificationHub, INotificationClient> _hub;
//     public NotificationSender(IHubContext<NotificationHub, INotificationClient> hub) => _hub = hub;
//
//     public async Task NotifyUser(string userId, NotificationDto notification)
//         => await _hub.Clients.Group($"user:{userId}").ReceiveNotification(notification);
//
//     public async Task BroadcastToAll(string message)
//         => await _hub.Clients.All.ReceiveSystemMessage(message);
// }`,
  },

  // ── Go + React Deployment & Infrastructure ────────────────────────────

  {
    id: 'go-config-viper',
    title: 'Go Application Configuration with Viper',
    description: 'Structured application configuration using Viper with validation, defaults, and environment variable binding.',
    tech: ['go', 'viper'],
    tags: ['go', 'config', 'viper', 'environment'],
    code: `package config

import (
        "fmt"
        "log"
        "strings"
        "time"

        "github.com/spf13/viper"
)

type Config struct {
        Server   ServerConfig
        Database DatabaseConfig
        Redis    RedisConfig
        JWT      JWTConfig
        CORS     CORSConfig
        Log      LogConfig
}

type ServerConfig struct {
        Port            int           \`mapstructure:"port"\`
        ReadTimeout     time.Duration \`mapstructure:"read_timeout"\`
        WriteTimeout    time.Duration \`mapstructure:"write_timeout"\`
        ShutdownTimeout time.Duration \`mapstructure:"shutdown_timeout"\`
        Mode            string        \`mapstructure:"mode"\`
}

type DatabaseConfig struct {
        Host         string        \`mapstructure:"host"\`
        Port         int           \`mapstructure:"port"\`
        User         string        \`mapstructure:"user"\`
        Password     string        \`mapstructure:"password"\`
        Name         string        \`mapstructure:"name"\`
        SSLMode      string        \`mapstructure:"ssl_mode"\`
        MaxOpenConns int           \`mapstructure:"max_open_conns"\`
        MaxIdleConns int           \`mapstructure:"max_idle_conns"\`
        MaxLifetime  time.Duration \`mapstructure:"max_lifetime"\`
}

type RedisConfig struct {
        Addr     string \`mapstructure:"addr"\`
        Password string \`mapstructure:"password"\`
        DB       int    \`mapstructure:"db"\`
        PoolSize int    \`mapstructure:"pool_size"\`
}

type JWTConfig struct {
        Secret          string        \`mapstructure:"secret"\`
        RefreshSecret   string        \`mapstructure:"refresh_secret"\`
        AccessExpiry    time.Duration \`mapstructure:"access_expiry"\`
        RefreshExpiry   time.Duration \`mapstructure:"refresh_expiry"\`
}

type CORSConfig struct {
        AllowedOrigins []string \`mapstructure:"allowed_origins"\`
        AllowedMethods []string \`mapstructure:"allowed_methods"\`
        AllowedHeaders []string \`mapstructure:"allowed_headers"\`
}

type LogConfig struct {
        Level  string \`mapstructure:"level"\`
        Format string \`mapstructure:"format"\`
}

func (d DatabaseConfig) DSN() string {
        return fmt.Sprintf(
                "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
                d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
        )
}

func Load() (*Config, error) {
        v := viper.New()

        v.SetDefault("server.port", 8080)
        v.SetDefault("server.read_timeout", "10s")
        v.SetDefault("server.write_timeout", "30s")
        v.SetDefault("server.shutdown_timeout", "10s")
        v.SetDefault("server.mode", "debug")

        v.SetDefault("database.host", "localhost")
        v.SetDefault("database.port", 5432)
        v.SetDefault("database.user", "postgres")
        v.SetDefault("database.name", "myapp")
        v.SetDefault("database.ssl_mode", "disable")
        v.SetDefault("database.max_open_conns", 25)
        v.SetDefault("database.max_idle_conns", 10)
        v.SetDefault("database.max_lifetime", "5m")

        v.SetDefault("redis.addr", "localhost:6379")
        v.SetDefault("redis.db", 0)
        v.SetDefault("redis.pool_size", 20)

        v.SetDefault("jwt.access_expiry", "15m")
        v.SetDefault("jwt.refresh_expiry", "168h")

        v.SetDefault("cors.allowed_origins", []string{"http://localhost:3000"})
        v.SetDefault("cors.allowed_methods", []string{"GET", "POST", "PUT", "PATCH", "DELETE"})
        v.SetDefault("cors.allowed_headers", []string{"Origin", "Content-Type", "Authorization"})

        v.SetDefault("log.level", "info")
        v.SetDefault("log.format", "json")

        v.SetConfigName("config")
        v.SetConfigType("yaml")
        v.AddConfigPath(".")
        v.AddConfigPath("./config")

        v.SetEnvPrefix("APP")
        v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
        v.AutomaticEnv()

        if err := v.ReadInConfig(); err != nil {
                if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
                        return nil, fmt.Errorf("reading config: %w", err)
                }
                log.Println("No config file found, using defaults and environment variables")
        }

        var cfg Config
        if err := v.Unmarshal(&cfg); err != nil {
                return nil, fmt.Errorf("unmarshaling config: %w", err)
        }

        if err := validate(&cfg); err != nil {
                return nil, fmt.Errorf("validating config: %w", err)
        }

        return &cfg, nil
}

func validate(cfg *Config) error {
        if cfg.JWT.Secret == "" {
                return fmt.Errorf("JWT secret is required (set APP_JWT_SECRET)")
        }
        if cfg.JWT.RefreshSecret == "" {
                return fmt.Errorf("JWT refresh secret is required (set APP_JWT_REFRESH_SECRET)")
        }
        if cfg.Database.Password == "" && cfg.Server.Mode != "debug" {
                return fmt.Errorf("database password is required in production")
        }
        return nil
}`,
  },

  {
    id: 'go-health-check',
    title: 'Go Health Check Endpoint with Dependency Checks',
    description: 'Health check HTTP handler that verifies database, Redis, and external service dependencies.',
    tech: ['go', 'gin'],
    tags: ['go', 'health-check', 'monitoring', 'gin'],
    code: `package handler

import (
        "context"
        "database/sql"
        "net/http"
        "sync"
        "time"

        "github.com/gin-gonic/gin"
        "github.com/redis/go-redis/v9"
)

type HealthStatus string

const (
        StatusUp       HealthStatus = "UP"
        StatusDown     HealthStatus = "DOWN"
        StatusDegraded HealthStatus = "DEGRADED"
)

type ComponentHealth struct {
        Status   HealthStatus  \`json:"status"\`
        Duration string        \`json:"duration"\`
        Error    string        \`json:"error,omitempty"\`
        Details  interface{}   \`json:"details,omitempty"\`
}

type HealthResponse struct {
        Status     HealthStatus               \`json:"status"\`
        Version    string                     \`json:"version"\`
        Uptime     string                     \`json:"uptime"\`
        Components map[string]ComponentHealth \`json:"components"\`
}

type HealthHandler struct {
        db        *sql.DB
        redis     *redis.Client
        startTime time.Time
        version   string
}

func NewHealthHandler(db *sql.DB, redisClient *redis.Client, version string) *HealthHandler {
        return &HealthHandler{
                db:        db,
                redis:     redisClient,
                startTime: time.Now(),
                version:   version,
        }
}

func (h *HealthHandler) RegisterRoutes(r *gin.Engine) {
        r.GET("/health", h.Health)
        r.GET("/health/live", h.Liveness)
        r.GET("/health/ready", h.Readiness)
}

func (h *HealthHandler) Health(c *gin.Context) {
        ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
        defer cancel()

        components := make(map[string]ComponentHealth)
        var mu sync.Mutex
        var wg sync.WaitGroup

        checks := map[string]func(context.Context) ComponentHealth{
                "database": h.checkDatabase,
                "redis":    h.checkRedis,
        }

        for name, check := range checks {
                wg.Add(1)
                go func(n string, fn func(context.Context) ComponentHealth) {
                        defer wg.Done()
                        result := fn(ctx)
                        mu.Lock()
                        components[n] = result
                        mu.Unlock()
                }(name, check)
        }

        wg.Wait()

        overallStatus := StatusUp
        for _, comp := range components {
                if comp.Status == StatusDown {
                        overallStatus = StatusDown
                        break
                }
                if comp.Status == StatusDegraded {
                        overallStatus = StatusDegraded
                }
        }

        response := HealthResponse{
                Status:     overallStatus,
                Version:    h.version,
                Uptime:     time.Since(h.startTime).Round(time.Second).String(),
                Components: components,
        }

        statusCode := http.StatusOK
        if overallStatus == StatusDown {
                statusCode = http.StatusServiceUnavailable
        }

        c.JSON(statusCode, response)
}

func (h *HealthHandler) Liveness(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "UP"})
}

func (h *HealthHandler) Readiness(c *gin.Context) {
        ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
        defer cancel()

        dbHealth := h.checkDatabase(ctx)
        if dbHealth.Status == StatusDown {
                c.JSON(http.StatusServiceUnavailable, gin.H{"status": "NOT_READY", "reason": "database"})
                return
        }

        c.JSON(http.StatusOK, gin.H{"status": "READY"})
}

func (h *HealthHandler) checkDatabase(ctx context.Context) ComponentHealth {
        start := time.Now()
        if err := h.db.PingContext(ctx); err != nil {
                return ComponentHealth{
                        Status:   StatusDown,
                        Duration: time.Since(start).String(),
                        Error:    err.Error(),
                }
        }

        stats := h.db.Stats()
        return ComponentHealth{
                Status:   StatusUp,
                Duration: time.Since(start).String(),
                Details: map[string]interface{}{
                        "open_connections": stats.OpenConnections,
                        "in_use":           stats.InUse,
                        "idle":             stats.Idle,
                        "max_open":         stats.MaxOpenConnections,
                },
        }
}

func (h *HealthHandler) checkRedis(ctx context.Context) ComponentHealth {
        start := time.Now()
        if err := h.redis.Ping(ctx).Err(); err != nil {
                return ComponentHealth{
                        Status:   StatusDown,
                        Duration: time.Since(start).String(),
                        Error:    err.Error(),
                }
        }

        info, _ := h.redis.Info(ctx, "memory").Result()
        return ComponentHealth{
                Status:   StatusUp,
                Duration: time.Since(start).String(),
                Details: map[string]interface{}{
                        "pool_stats": h.redis.PoolStats(),
                        "memory_info": info[:200],
                },
        }
}`,
  },

  {
    id: 'go-middleware-chain',
    title: 'Go Middleware Chain with Logging, Recovery, and CORS',
    description: 'Production middleware stack for Gin with structured logging, panic recovery, request ID, and CORS.',
    tech: ['go', 'gin'],
    tags: ['go', 'middleware', 'logging', 'recovery', 'gin'],
    code: `package middleware

import (
        "fmt"
        "log/slog"
        "net/http"
        "runtime/debug"
        "time"

        "github.com/gin-gonic/gin"
        "github.com/google/uuid"
)

func RequestID() gin.HandlerFunc {
        return func(c *gin.Context) {
                requestID := c.GetHeader("X-Request-ID")
                if requestID == "" {
                        requestID = uuid.New().String()[:8]
                }
                c.Set("request_id", requestID)
                c.Header("X-Request-ID", requestID)
                c.Next()
        }
}

func StructuredLogger(logger *slog.Logger) gin.HandlerFunc {
        return func(c *gin.Context) {
                start := time.Now()
                path := c.Request.URL.Path
                query := c.Request.URL.RawQuery

                c.Next()

                duration := time.Since(start)
                statusCode := c.Writer.Status()

                attrs := []slog.Attr{
                        slog.String("method", c.Request.Method),
                        slog.String("path", path),
                        slog.String("query", query),
                        slog.Int("status", statusCode),
                        slog.Duration("duration", duration),
                        slog.String("client_ip", c.ClientIP()),
                        slog.String("user_agent", c.Request.UserAgent()),
                        slog.Int("body_size", c.Writer.Size()),
                }

                if requestID, ok := c.Get("request_id"); ok {
                        attrs = append(attrs, slog.String("request_id", requestID.(string)))
                }

                if userID, ok := c.Get("user_id"); ok {
                        attrs = append(attrs, slog.Any("user_id", userID))
                }

                level := slog.LevelInfo
                msg := "Request completed"

                if statusCode >= 500 {
                        level = slog.LevelError
                        msg = "Server error"
                } else if statusCode >= 400 {
                        level = slog.LevelWarn
                        msg = "Client error"
                } else if duration > 2*time.Second {
                        level = slog.LevelWarn
                        msg = "Slow request"
                }

                if len(c.Errors) > 0 {
                        attrs = append(attrs, slog.String("errors", c.Errors.String()))
                }

                logger.LogAttrs(c.Request.Context(), level, msg, attrs...)
        }
}

func Recovery(logger *slog.Logger) gin.HandlerFunc {
        return func(c *gin.Context) {
                defer func() {
                        if r := recover(); r != nil {
                                stack := string(debug.Stack())
                                logger.Error("Panic recovered",
                                        slog.Any("error", r),
                                        slog.String("stack", stack),
                                        slog.String("path", c.Request.URL.Path),
                                        slog.String("method", c.Request.Method),
                                )

                                c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                                        "error": "Internal server error",
                                        "code":  "INTERNAL_ERROR",
                                })
                        }
                }()
                c.Next()
        }
}

func RateLimiter(maxRequests int, window time.Duration) gin.HandlerFunc {
        type client struct {
                count    int
                lastSeen time.Time
        }
        clients := make(map[string]*client)
        var mu sync.Mutex

        go func() {
                for range time.Tick(window) {
                        mu.Lock()
                        for ip, c := range clients {
                                if time.Since(c.lastSeen) > window {
                                        delete(clients, ip)
                                }
                        }
                        mu.Unlock()
                }
        }()

        return func(c *gin.Context) {
                ip := c.ClientIP()
                mu.Lock()
                cl, exists := clients[ip]
                if !exists {
                        clients[ip] = &client{count: 1, lastSeen: time.Now()}
                        mu.Unlock()
                        c.Next()
                        return
                }

                if time.Since(cl.lastSeen) > window {
                        cl.count = 1
                        cl.lastSeen = time.Now()
                        mu.Unlock()
                        c.Next()
                        return
                }

                cl.count++
                cl.lastSeen = time.Now()

                if cl.count > maxRequests {
                        mu.Unlock()
                        c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                                "error": "Rate limit exceeded",
                                "code":  "RATE_LIMITED",
                        })
                        return
                }
                mu.Unlock()
                c.Next()
        }
}

func SecurityHeaders() gin.HandlerFunc {
        return func(c *gin.Context) {
                c.Header("X-Content-Type-Options", "nosniff")
                c.Header("X-Frame-Options", "DENY")
                c.Header("X-XSS-Protection", "1; mode=block")
                c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
                c.Header("Content-Security-Policy", "default-src 'self'")
                c.Next()
        }
}

import "sync"`,
  },

  {
    id: 'go-test-suite',
    title: 'Go Test Suite with Table-Driven Tests and Mocks',
    description: 'Comprehensive Go test patterns with table-driven tests, mock interfaces, HTTP handler tests, and test helpers.',
    tech: ['go', 'testing'],
    tags: ['go', 'testing', 'table-driven', 'mocks'],
    code: `package handler_test

import (
        "bytes"
        "context"
        "encoding/json"
        "errors"
        "myapp/internal/handler"
        "myapp/internal/model"
        "myapp/internal/service"
        "net/http"
        "net/http/httptest"
        "testing"

        "github.com/gin-gonic/gin"
        "github.com/stretchr/testify/assert"
        "github.com/stretchr/testify/mock"
        "github.com/stretchr/testify/require"
)

type MockUserService struct {
        mock.Mock
}

func (m *MockUserService) GetByID(ctx context.Context, id uint) (*model.User, error) {
        args := m.Called(ctx, id)
        if args.Get(0) == nil {
                return nil, args.Error(1)
        }
        return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserService) List(ctx context.Context, params service.ListParams) (*service.PagedResult[model.User], error) {
        args := m.Called(ctx, params)
        return args.Get(0).(*service.PagedResult[model.User]), args.Error(1)
}

func (m *MockUserService) Create(ctx context.Context, input service.CreateUserInput) (*model.User, error) {
        args := m.Called(ctx, input)
        if args.Get(0) == nil {
                return nil, args.Error(1)
        }
        return args.Get(0).(*model.User), args.Error(1)
}

func setupRouter(mockSvc *MockUserService) *gin.Engine {
        gin.SetMode(gin.TestMode)
        r := gin.New()
        h := handler.NewUserHandler(mockSvc)
        h.RegisterRoutes(r.Group("/api/v1"))
        return r
}

func TestGetUserByID(t *testing.T) {
        tests := []struct {
                name       string
                id         string
                mockSetup  func(m *MockUserService)
                wantStatus int
                wantBody   map[string]interface{}
        }{
                {
                        name: "valid user returns 200",
                        id:   "1",
                        mockSetup: func(m *MockUserService) {
                                m.On("GetByID", mock.Anything, uint(1)).Return(&model.User{
                                        ID: 1, Name: "Alice", Email: "alice@test.com", Role: "user",
                                }, nil)
                        },
                        wantStatus: http.StatusOK,
                        wantBody:   map[string]interface{}{"name": "Alice", "email": "alice@test.com"},
                },
                {
                        name: "non-existent user returns 404",
                        id:   "999",
                        mockSetup: func(m *MockUserService) {
                                m.On("GetByID", mock.Anything, uint(999)).Return(nil, service.ErrNotFound)
                        },
                        wantStatus: http.StatusNotFound,
                },
                {
                        name:       "invalid ID returns 400",
                        id:         "abc",
                        mockSetup:  func(m *MockUserService) {},
                        wantStatus: http.StatusBadRequest,
                },
        }

        for _, tt := range tests {
                t.Run(tt.name, func(t *testing.T) {
                        mockSvc := new(MockUserService)
                        tt.mockSetup(mockSvc)
                        router := setupRouter(mockSvc)

                        req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+tt.id, nil)
                        w := httptest.NewRecorder()
                        router.ServeHTTP(w, req)

                        assert.Equal(t, tt.wantStatus, w.Code)

                        if tt.wantBody != nil {
                                var body map[string]interface{}
                                err := json.Unmarshal(w.Body.Bytes(), &body)
                                require.NoError(t, err)
                                data := body["data"].(map[string]interface{})
                                for k, v := range tt.wantBody {
                                        assert.Equal(t, v, data[k])
                                }
                        }

                        mockSvc.AssertExpectations(t)
                })
        }
}

func TestCreateUser(t *testing.T) {
        tests := []struct {
                name       string
                body       interface{}
                mockSetup  func(m *MockUserService)
                wantStatus int
        }{
                {
                        name: "valid user returns 201",
                        body: map[string]string{"name": "Bob", "email": "bob@test.com", "password": "StrongP1"},
                        mockSetup: func(m *MockUserService) {
                                m.On("Create", mock.Anything, mock.MatchedBy(func(input service.CreateUserInput) bool {
                                        return input.Name == "Bob" && input.Email == "bob@test.com"
                                })).Return(&model.User{ID: 2, Name: "Bob", Email: "bob@test.com"}, nil)
                        },
                        wantStatus: http.StatusCreated,
                },
                {
                        name:       "empty body returns 422",
                        body:       map[string]string{},
                        mockSetup:  func(m *MockUserService) {},
                        wantStatus: http.StatusUnprocessableEntity,
                },
                {
                        name: "duplicate email returns 409",
                        body: map[string]string{"name": "Bob", "email": "exists@test.com", "password": "StrongP1"},
                        mockSetup: func(m *MockUserService) {
                                m.On("Create", mock.Anything, mock.Anything).Return(nil, service.ErrConflict)
                        },
                        wantStatus: http.StatusConflict,
                },
        }

        for _, tt := range tests {
                t.Run(tt.name, func(t *testing.T) {
                        mockSvc := new(MockUserService)
                        tt.mockSetup(mockSvc)
                        router := setupRouter(mockSvc)

                        body, _ := json.Marshal(tt.body)
                        req := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewReader(body))
                        req.Header.Set("Content-Type", "application/json")
                        w := httptest.NewRecorder()
                        router.ServeHTTP(w, req)

                        assert.Equal(t, tt.wantStatus, w.Code)
                        mockSvc.AssertExpectations(t)
                })
        }
}`,
  },

];

STACK_CODE_SNIPPETS.push(...EXTENDED_STACK_SNIPPETS_2);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENDED BEST PRACTICES — BATCH 2                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_BEST_PRACTICES_2: BestPractice[] = [

  { id: 'mern-docker-development', title: 'MERN Docker Development Best Practices', category: 'mern-devops', description: 'Optimize Docker workflows for MERN stack development.', do: ['Use docker-compose for local development with MongoDB, Redis, and services', 'Mount source directories as volumes for hot-reloading', 'Use multi-stage builds for production images (build stage + minimal runtime stage)', 'Add health checks to all containers so compose can detect unhealthy services', 'Use .dockerignore to exclude node_modules, .git, and test files from build context'], dont: ['Install devDependencies in production images — use npm ci --omit=dev', 'Run containers as root — use USER node in the Dockerfile', 'Copy node_modules from host into container — install inside the container', 'Use latest tag for base images — pin to specific versions (node:20-alpine)', 'Forget to set NODE_ENV=production in production containers'], languages: ['typescript', 'javascript'] },

  { id: 'mern-mongodb-backup', title: 'MongoDB Backup Strategy', category: 'mern-operations', description: 'Implement reliable MongoDB backup and recovery procedures.', do: ['Use mongodump for logical backups on a regular schedule (hourly/daily)', 'Test backup restoration regularly — a backup you cannot restore is worthless', 'Store backups in a separate geographic region (S3 cross-region replication)', 'Use MongoDB Atlas automated backups with point-in-time recovery if available', 'Encrypt backups at rest and in transit'], dont: ['Rely on a single backup copy — use the 3-2-1 rule (3 copies, 2 media, 1 offsite)', 'Back up during peak traffic — schedule during low-activity windows', 'Forget to include indexes in backup verification — mongorestore recreates them', 'Store backup credentials alongside application credentials', 'Skip testing disaster recovery — practice failover procedures quarterly'], languages: ['typescript', 'javascript'] },

  { id: 'django-docker-best-practices', title: 'Django Docker Deployment', category: 'django-devops', description: 'Best practices for containerizing Django applications.', do: ['Use Gunicorn or uWSGI as the WSGI server (never django runserver in production)', 'Run collectstatic during image build, serve static files with Whitenoise or Nginx', 'Use multi-stage builds: install dependencies in build stage, copy to slim runtime', 'Set PYTHONUNBUFFERED=1 and PYTHONDONTWRITEBYTECODE=1 for Docker', 'Run database migrations as an init container or entrypoint script (not in Dockerfile)'], dont: ['Run Django development server in production — it is single-threaded and insecure', 'Install system packages that are only needed for building (remove gcc, build-essential after pip install)', 'Run the container as root — create a non-root user', 'Use Django manage.py runserver for health checks — use a lightweight HTTP check', 'Include .pyc files, __pycache__, venv, or .git in the Docker image'], languages: ['python'] },

  { id: 'spring-docker-jib', title: 'Spring Boot Container Best Practices', category: 'spring-devops', description: 'Containerize Spring Boot applications efficiently for production.', do: ['Use Google Jib or Spring Boot Buildpacks for optimized layered container images', 'Set JVM memory limits matching container memory (e.g., -XX:MaxRAMPercentage=75)', 'Use CDS (Class Data Sharing) or GraalVM native-image for faster startup', 'Configure graceful shutdown: server.shutdown=graceful with spring.lifecycle.timeout-per-shutdown-phase=30s', 'Run the JVM process as a non-root user inside the container'], dont: ['Use a fat JAR without layer extraction — every code change rebuilds the entire image', 'Set container memory to exactly the JVM heap size — the JVM needs metaspace, stack, and off-heap too', 'Forget to configure the JVM for containers (-XX:+UseContainerSupport, available since JDK 10)', 'Use openjdk images — use Eclipse Temurin or Amazon Corretto for production support', 'Ignore JVM warmup — consider readiness probes with initial delay'], languages: ['java'] },

  { id: 'dotnet-container-best-practices', title: '.NET Container Optimization', category: 'dotnet-devops', description: 'Optimize ASP.NET Core container images for production deployment.', do: ['Use multi-stage builds: sdk image for build, runtime image for production', 'Use .NET 8+ AOT compilation for minimal container size and instant startup', 'Set DOTNET_EnableDiagnostics=0 in production containers for smaller images', 'Configure garbage collector for containers: DOTNET_GCHeapHardLimit or DOTNET_GCConserveMemory', 'Use distroless or chiseled container images for minimal attack surface'], dont: ['Use the SDK image in production — it is 3x larger than the runtime image', 'Set --self-contained without trimming — the published output is huge', 'Forget to configure the ASP.NET Core URLs: ENV ASPNETCORE_URLS=http://+:8080', 'Run as root in the container — use USER app (built into .NET images)', 'Include PDB files in production images unless needed for debugging'], languages: ['csharp'] },

  { id: 'go-docker-best-practices', title: 'Go Container Best Practices', category: 'go-devops', description: 'Build minimal Go containers for production deployment.', do: ['Use multi-stage builds: golang:1.22 for building, scratch or distroless for running', 'Build static binaries: CGO_ENABLED=0 go build -ldflags="-s -w"', 'Use scratch or gcr.io/distroless/static for the final image (single-digit MB)', 'Embed version info at build time: -ldflags="-X main.version=$(git describe --tags)"', 'Add ca-certificates if your app makes HTTPS calls from scratch image'], dont: ['Use the golang image for production — it is 800MB+', 'Enable CGO unless you need it — it requires glibc in the runtime image', 'Forget to set the timezone data (copy from build stage if needed)', 'Include test files or development tools in the production image', 'Run as root — create a non-root user or use distroless nonroot variant'], languages: ['go'] },

  { id: 'mern-api-versioning', title: 'MERN API Versioning Strategy', category: 'mern-api', description: 'Version Express REST APIs for backward compatibility during evolution.', do: ['Use URL path versioning: /api/v1/users, /api/v2/users', 'Create separate route files per version: routes/v1/, routes/v2/', 'Share service layer between versions — only the route/controller layer changes', 'Deprecate old versions with Sunset header and advance notice', 'Document changes between versions in a changelog'], dont: ['Version every endpoint change — only version breaking changes', 'Maintain more than 3 active versions — sunset old versions on a schedule', 'Break backward compatibility within a version (e.g., changing response shape)', 'Copy-paste entire route files between versions — extract shared logic', 'Use query parameter versioning (?v=2) — harder to route and cache'], languages: ['typescript', 'javascript'] },

  { id: 'django-api-versioning', title: 'DRF API Versioning', category: 'django-api', description: 'Version Django REST Framework APIs for smooth client migration.', do: ['Use URLPathVersioning for public APIs: /api/v1/, /api/v2/', 'Configure DEFAULT_VERSIONING_CLASS in REST_FRAMEWORK settings', 'Use request.version in views to customize behavior per version', 'Create separate serializers for different API versions when response shapes change', 'Use AcceptHeaderVersioning for internal APIs: Accept: application/json; version=2'], dont: ['Use NamespaceVersioning for public APIs — URL paths are more discoverable', 'Change existing version behavior after clients depend on it', 'Version every minor change — only version breaking changes', 'Forget to document which versions are supported and their sunset dates', 'Mix versioning strategies in the same project'], languages: ['python'] },

];

STACK_BEST_PRACTICES.push(...EXTENDED_STACK_BEST_PRACTICES_2);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EXTENDED ANTI-PATTERNS — BATCH 2                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_ANTI_PATTERNS_2: AntiPattern[] = [

  { id: 'mern-jwt-localstorage', name: 'Storing JWT in localStorage', description: 'Saving JWT access tokens in localStorage instead of httpOnly cookies.', whyBad: 'localStorage is accessible to any JavaScript running on the page. A single XSS vulnerability (even from a third-party script) can steal the token and impersonate the user. httpOnly cookies cannot be read by JavaScript.', fix: 'Store access tokens in httpOnly, Secure, SameSite=Strict cookies. Use the cookie for auth on every request. If you must use localStorage (e.g., for non-browser clients), implement token rotation and short expiry (5 minutes).', severity: 'critical', badExample: 'localStorage.setItem("token", response.data.accessToken); // XSS can steal this', goodExample: 'res.cookie("accessToken", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 15 * 60 * 1000 }); // JavaScript cannot read this', tags: ['mern', 'security', 'jwt', 'xss'] },

  { id: 'mern-no-rate-limiting', name: 'No Rate Limiting on MERN APIs', description: 'Express API endpoints without rate limiting, allowing unlimited requests from any client.', whyBad: 'Without rate limiting, attackers can perform brute-force password attacks, scrape all data, or launch denial-of-service attacks. Even well-meaning clients can accidentally overload the server with buggy retry logic.', fix: 'Add express-rate-limit middleware globally (100 req/15min for API, 10 req/15min for auth). Use Redis store for distributed rate limiting. Implement per-user and per-IP limits. Return 429 with Retry-After header.', severity: 'high', badExample: 'app.post("/api/auth/login", loginHandler); // No rate limiting — unlimited brute force attempts', goodExample: 'const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many attempts" });\napp.post("/api/auth/login", authLimiter, loginHandler);', tags: ['mern', 'security', 'rate-limiting'] },

  { id: 'django-model-in-template', name: 'Querying Database in Django Templates', description: 'Making database queries inside Django templates via model methods or template tags.', whyBad: 'Template rendering becomes slow and unpredictable. Database queries happen without the developer seeing them in views. N+1 problems are invisible and impossible to optimize. Templates should only display data, never fetch it.', fix: 'Fetch all required data in the view or serializer. Pass pre-computed data to the template context. Use select_related/prefetch_related in the view to avoid template-triggered queries.', severity: 'medium', badExample: '{% for article in articles %}\n  Author: {{ article.author.profile.display_name }}  {# Triggers a query PER article #}\n  Tags: {% for tag in article.tags.all %}  {# Another query PER article #}\n{% endfor %}', goodExample: '# In view: articles = Article.objects.select_related("author__profile").prefetch_related("tags")[:20]\n{% for article in articles %}\n  Author: {{ article.author.profile.display_name }}  {# No query — already loaded #}\n{% endfor %}', tags: ['django', 'performance', 'templates'] },

  { id: 'spring-field-injection', name: 'Field Injection (@Autowired on Fields) in Spring', description: 'Using @Autowired directly on fields instead of constructor injection.', whyBad: 'Field injection hides dependencies — you cannot tell what a class needs by looking at its constructor. It makes testing difficult because you need Spring context or reflection to set fields. It allows creating objects in an invalid state (fields are null until Spring injects them).', fix: 'Use constructor injection (preferably with @RequiredArgsConstructor from Lombok). All dependencies are visible in the constructor, required at creation time, and easily mockable in tests.', severity: 'medium', badExample: '@Service public class UserService {\n    @Autowired private UserRepository userRepo;  // Hidden dependency\n    @Autowired private PasswordEncoder encoder; // Hidden dependency\n}', goodExample: '@Service @RequiredArgsConstructor public class UserService {\n    private final UserRepository userRepo;  // Visible, required, immutable\n    private final PasswordEncoder encoder;\n}', tags: ['spring', 'dependency-injection', 'testing', 'java'] },

  { id: 'dotnet-loading-all-records', name: 'Loading All Records from Database', description: 'Using ToListAsync() without Where/Take to load entire database tables into memory.', whyBad: 'Loading 100,000+ records into memory causes OutOfMemoryException, extreme GC pressure, and 10+ second response times. The database sends all data over the network even if you only need 20 records.', fix: 'Always filter with Where(), limit with Take(), and paginate. Use Select() to project only needed columns. Use AsAsyncEnumerable() for streaming large datasets without loading all into memory.', severity: 'high', badExample: 'var allUsers = await _db.Users.ToListAsync(); // Loads ALL users into memory\nvar activeUsers = allUsers.Where(u => u.IsActive).Take(20);', goodExample: 'var activeUsers = await _db.Users\n    .AsNoTracking()\n    .Where(u => u.IsActive)\n    .OrderByDescending(u => u.CreatedAt)\n    .Take(20)\n    .Select(u => new UserDto(u.Id, u.Name, u.Email))\n    .ToListAsync();', tags: ['dotnet', 'ef-core', 'performance', 'memory'] },

  { id: 'go-defer-in-loop', name: 'Defer Inside Loop in Go', description: 'Using defer inside a loop, causing deferred calls to accumulate until the function returns.', whyBad: 'Deferred calls execute when the enclosing function returns, not when the loop iteration ends. In a loop processing 10,000 files, all 10,000 file handles remain open until the function returns, potentially exhausting file descriptors.', fix: 'Extract the loop body into a separate function so defer executes per iteration. Or manually close resources at the end of each iteration without defer.', severity: 'high', badExample: 'func processFiles(paths []string) error {\n    for _, path := range paths {\n        f, err := os.Open(path)\n        if err != nil { return err }\n        defer f.Close() // ALL files stay open until function returns!\n        process(f)\n    }\n    return nil\n}', goodExample: 'func processFiles(paths []string) error {\n    for _, path := range paths {\n        if err := processFile(path); err != nil { return err }\n    }\n    return nil\n}\nfunc processFile(path string) error {\n    f, err := os.Open(path)\n    if err != nil { return err }\n    defer f.Close() // Closes when processFile returns — each iteration\n    return process(f)\n}', tags: ['go', 'resource-leak', 'defer'] },

  { id: 'go-no-context-timeout', name: 'HTTP Calls Without Context Timeout in Go', description: 'Making HTTP requests to external services without setting a timeout via context.', whyBad: 'If the external service is slow or unresponsive, the goroutine blocks indefinitely. Under load, hundreds of goroutines pile up waiting for responses, consuming memory and eventually causing OOM. Cascading timeouts bring down the entire system.', fix: 'Always create a context with timeout for external calls: ctx, cancel := context.WithTimeout(ctx, 5*time.Second). Set http.Client.Timeout as a safety net. Use circuit breaker patterns for resilience.', severity: 'high', badExample: 'resp, err := http.Get("https://external-api.com/data") // No timeout — blocks forever if API is down', goodExample: 'ctx, cancel := context.WithTimeout(ctx, 5*time.Second)\ndefer cancel()\nreq, _ := http.NewRequestWithContext(ctx, "GET", "https://external-api.com/data", nil)\nresp, err := client.Do(req) // Cancels after 5 seconds', tags: ['go', 'timeout', 'reliability', 'http'] },

  { id: 'mern-mixed-auth-patterns', name: 'Mixed Authentication Patterns in Express', description: 'Using multiple, inconsistent authentication methods across different routes in the same Express app.', whyBad: 'Some routes check cookies, others check headers, some use sessions, others use JWTs. This creates security gaps where one auth method is bypassed. Developers do not know which auth method applies to new routes.', fix: 'Choose one primary authentication method (JWT in httpOnly cookies for web apps). Implement it as a single middleware function. Apply it consistently via app.use() on protected route groups. Document the auth flow clearly.', severity: 'high', badExample: 'app.get("/api/users", checkJWT, handler); // JWT in header\napp.get("/api/orders", checkSession, handler); // Session cookie\napp.get("/api/products", checkApiKey, handler); // API key\n// Which auth do new routes use? Nobody knows', goodExample: 'const protectedRoutes = Router();\nprotectedRoutes.use(authenticate); // Single consistent auth middleware\nprotectedRoutes.use("/users", userRoutes);\nprotectedRoutes.use("/orders", orderRoutes);\napp.use("/api", protectedRoutes);', tags: ['mern', 'security', 'auth', 'consistency'] },

];

STACK_ANTI_PATTERNS.push(...EXTENDED_STACK_ANTI_PATTERNS_2);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ADDITIONAL CONCEPTS — CROSS-STACK PATTERNS                             ║
// ║  Architecture, deployment, and integration concepts for all stacks      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const ADDITIONAL_STACK_CONCEPTS: Record<string, Concept> = {

  'mern-monorepo': {
    id: 'mern-monorepo',
    name: 'MERN Monorepo Architecture',
    description: 'Organizing a MERN project as a monorepo with shared types, utilities, and configurations.',
    explanation: 'A monorepo keeps client, server, and shared code in a single repository using pnpm workspaces, Turborepo, or Nx. Shared TypeScript interfaces ensure API contract consistency. Changes to shared types trigger type-checking across all packages. This eliminates version drift between client and server, simplifies CI/CD, and enables atomic commits across the full stack.',
    category: 'architecture',
    examples: [
      '// pnpm-workspace.yaml: packages: ["packages/*", "apps/*"]',
      'import type { User, CreateUserDTO } from "@myapp/shared-types"; // Shared types in both client and server',
    ],
    relatedConcepts: ['monorepo', 'typescript', 'workspace'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  'django-async-views': {
    id: 'django-async-views',
    name: 'Django Async Views',
    description: 'Asynchronous view support in Django 4.1+ for concurrent I/O-bound operations.',
    explanation: 'Django 4.1+ supports async def views that can await I/O-bound operations (HTTP calls, file I/O) without blocking the worker. Combined with ASGI (Daphne, Uvicorn), async views handle more concurrent requests. The ORM gained async support (aget, afirst, acount) in Django 4.1. Use sync_to_async for calling synchronous code from async views.',
    category: 'architecture',
    examples: [
      'async def fetch_external_data(request): async with httpx.AsyncClient() as client: response = await client.get("https://api.example.com/data"); return JsonResponse(response.json())',
      'async def list_users(request): users = [user async for user in User.objects.filter(is_active=True).aiterator()]; return JsonResponse({"users": users})',
    ],
    relatedConcepts: ['async', 'asgi', 'concurrency'],
    difficulty: 'advanced',
    languages: ['python'],
  },

  'spring-webflux': {
    id: 'spring-webflux',
    name: 'Spring WebFlux',
    description: 'Reactive, non-blocking web framework in Spring for building high-concurrency applications.',
    explanation: 'WebFlux uses Project Reactor (Mono/Flux) for non-blocking I/O. A single thread can handle thousands of concurrent connections because it never blocks waiting for I/O. Best for applications with many concurrent connections (WebSockets, SSE) or gateway/proxy services. Not a replacement for Spring MVC — use MVC for CRUD APIs, WebFlux for reactive streaming.',
    category: 'architecture',
    examples: [
      '@GetMapping("/users") public Flux<User> getAll() { return userRepository.findAll(); }',
      'webClient.get().uri("/api/external").retrieve().bodyToMono(ExternalData.class).timeout(Duration.ofSeconds(5)).retry(3)',
    ],
    relatedConcepts: ['reactive-programming', 'non-blocking-io', 'project-reactor'],
    difficulty: 'advanced',
    languages: ['java'],
  },

  'dotnet-blazor': {
    id: 'dotnet-blazor',
    name: 'Blazor',
    description: 'Microsoft framework for building interactive web UIs using C# instead of JavaScript.',
    explanation: 'Blazor supports two hosting models: Server (UI logic runs on server, updates via SignalR) and WebAssembly (C# runs in browser). Components use Razor syntax (.razor files) with C# code-behind. Blazor eliminates the need for a separate JavaScript frontend for .NET teams. Server-side Blazor has low latency for intranet apps; WASM enables offline-capable SPAs.',
    category: 'architecture',
    examples: [
      '@page "/users" @inject HttpClient Http\n<ul>@foreach (var user in users) { <li>@user.Name</li> }</ul>\n@code { private List<User>? users; protected override async Task OnInitializedAsync() { users = await Http.GetFromJsonAsync<List<User>>("api/users"); } }',
    ],
    relatedConcepts: ['spa', 'webassembly', 'signalr'],
    difficulty: 'intermediate',
    languages: ['csharp'],
  },

  'go-fiber-framework': {
    id: 'go-fiber-framework',
    name: 'Fiber Web Framework',
    description: 'Express.js-inspired Go web framework built on fasthttp for extreme performance.',
    explanation: 'Fiber is designed for developers transitioning from Node.js/Express. It wraps fasthttp (faster than net/http) and provides Express-like routing, middleware, and template engines. Fiber uses zero-allocation techniques for high throughput. Good for microservices and API gateways where raw performance matters. The API is intentionally similar to Express for familiarity.',
    category: 'architecture',
    examples: [
      'app := fiber.New(fiber.Config{ Prefork: true, ReadTimeout: 10 * time.Second })\napp.Get("/api/users", getUsers)\napp.Listen(":3000")',
      'app.Use(cors.New(cors.Config{ AllowOrigins: "http://localhost:3000", AllowCredentials: true }))',
    ],
    relatedConcepts: ['rest-api', 'middleware', 'fasthttp'],
    difficulty: 'beginner',
    languages: ['go'],
  },

  'mern-nextjs-fullstack': {
    id: 'mern-nextjs-fullstack',
    name: 'Next.js Full-Stack Architecture',
    description: 'Using Next.js as a full-stack framework with API routes, server components, and React frontend.',
    explanation: 'Next.js combines React frontend with Node.js backend through API routes (app/api/) and Server Components. Server Components run on the server and send HTML (not JavaScript) to the client. Route Handlers replace Express for API endpoints. Server Actions enable direct form submission to server functions. This replaces the traditional separate Express + React setup for many use cases.',
    category: 'architecture',
    examples: [
      'export async function GET(request: Request) { const users = await db.user.findMany(); return NextResponse.json(users); }',
      'async function UserList() { const users = await prisma.user.findMany(); return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>; }',
    ],
    relatedConcepts: ['server-components', 'server-actions', 'ssr'],
    difficulty: 'intermediate',
    languages: ['typescript', 'javascript'],
  },

  'django-graphql': {
    id: 'django-graphql',
    name: 'Django + GraphQL (Strawberry/Graphene)',
    description: 'GraphQL API layer for Django using Strawberry or Graphene for type-safe query/mutation resolution.',
    explanation: 'GraphQL provides a flexible query language where clients request exactly the data they need. Strawberry (type-safe, Python 3.10+ dataclasses) or Graphene (class-based) integrate with Django ORM. Clients send queries like { users { name email } } and receive only those fields. Eliminates over-fetching and under-fetching problems of REST. Use DataLoader to batch N+1 queries.',
    category: 'architecture',
    examples: [
      '@strawberry.type class UserType: id: int; name: str; email: str\n@strawberry.type class Query: @strawberry.field async def users(self) -> list[UserType]: return await User.objects.all()',
    ],
    relatedConcepts: ['graphql', 'dataloader', 'type-system'],
    difficulty: 'intermediate',
    languages: ['python'],
  },

  'spring-kafka': {
    id: 'spring-kafka',
    name: 'Spring Boot + Apache Kafka',
    description: 'Event streaming with Apache Kafka in Spring Boot for asynchronous, decoupled microservice communication.',
    explanation: 'Kafka provides durable, ordered, replayable event streams. Spring Kafka simplifies producer/consumer setup. Producers publish events (order.created, payment.completed) to topics. Consumers subscribe and process events independently. Consumer groups enable parallel processing with exactly-once semantics. Use Kafka for audit logs, event sourcing, CQRS, and inter-service communication.',
    category: 'architecture',
    examples: [
      '@KafkaListener(topics = "orders", groupId = "order-service") public void handleOrder(OrderEvent event) { orderService.process(event); }',
      'kafkaTemplate.send("orders", order.getId().toString(), new OrderCreatedEvent(order));',
    ],
    relatedConcepts: ['event-driven', 'message-queue', 'event-sourcing'],
    difficulty: 'advanced',
    languages: ['java'],
  },

  'dotnet-minimal-api-filters': {
    id: 'dotnet-minimal-api-filters',
    name: 'ASP.NET Core Endpoint Filters',
    description: 'Middleware-like filters for Minimal API endpoints for validation, logging, and authorization.',
    explanation: 'Endpoint filters run before and after endpoint delegates, similar to MVC action filters but for Minimal APIs. They can short-circuit the pipeline (return early), modify arguments, or transform results. Use for validation, caching, audit logging, and rate limiting at the endpoint level. Filters compose with AddEndpointFilter() and run in registration order.',
    category: 'architecture',
    examples: [
      'app.MapPost("/api/users", CreateUser).AddEndpointFilter(async (ctx, next) => { var body = ctx.GetArgument<CreateUserRequest>(0); if (string.IsNullOrEmpty(body.Name)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["name"] = ["Required"] }); return await next(ctx); });',
    ],
    relatedConcepts: ['middleware', 'validation', 'minimal-api'],
    difficulty: 'intermediate',
    languages: ['csharp'],
  },

  'go-sqlx-raw': {
    id: 'go-sqlx-raw',
    name: 'sqlx — Enhanced SQL in Go',
    description: 'Extensions to database/sql with named parameters, struct scanning, and query building.',
    explanation: 'sqlx extends Go standard library database/sql without wrapping it. It adds StructScan for mapping rows to structs, NamedExec for named parameters, and In() for expanding slice arguments. Unlike GORM, sqlx gives you full control over SQL. Use it when you want the safety of parameterized queries with the flexibility of raw SQL. No magic — you write SQL, sqlx helps you map results.',
    category: 'database',
    examples: [
      'var users []User; err := db.SelectContext(ctx, &users, "SELECT * FROM users WHERE role = $1 AND active = $2 ORDER BY created_at DESC LIMIT $3", role, true, limit)',
      'result, err := db.NamedExecContext(ctx, "INSERT INTO users (name, email) VALUES (:name, :email)", user)',
    ],
    relatedConcepts: ['database-sql', 'raw-sql', 'struct-scanning'],
    difficulty: 'intermediate',
    languages: ['go'],
  },

};

Object.assign(STACK_CONCEPTS, ADDITIONAL_STACK_CONCEPTS);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ADDITIONAL CODE SNIPPETS — BATCH 3                                     ║
// ║  Testing, monitoring, and cross-stack integration patterns              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const EXTENDED_STACK_SNIPPETS_3: CodeSnippet[] = [

  {
    id: 'mern-jest-api-test',
    title: 'Express API Integration Tests with Jest and Supertest',
    description: 'Complete API test suite for Express with database cleanup, authentication helpers, and assertion patterns.',
    tech: ['express', 'jest', 'supertest', 'typescript', 'node'],
    tags: ['mern', 'testing', 'jest', 'supertest', 'integration'],
    code: `import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models/User';
import { generateTokens, setTokenCookies } from '../middleware/auth';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

async function createTestUser(overrides: Partial<typeof defaultUser> = {}) {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123',
    role: 'user' as const,
  };
  const userData = { ...defaultUser, ...overrides };
  const user = await User.create(userData);
  return user;
}

async function getAuthCookie(email = 'test@example.com', password = 'TestPassword123') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.headers['set-cookie'];
}

describe('GET /api/users', () => {
  it('returns paginated users', async () => {
    await createTestUser({ email: 'user1@test.com' });
    await createTestUser({ email: 'user2@test.com' });
    const cookie = await getAuthCookie('user1@test.com');

    const res = await request(app)
      .get('/api/users')
      .set('Cookie', cookie)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual(expect.objectContaining({
      page: 1,
      limit: 10,
      total: 2,
      pages: 1,
    }));
    expect(res.body.data[0]).not.toHaveProperty('password');
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/users', () => {
  it('creates a user with valid data', async () => {
    await createTestUser();
    const cookie = await getAuthCookie();

    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({
        name: 'New User',
        email: 'new@example.com',
        password: 'StrongPass1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'New User',
      email: 'new@example.com',
    });

    const dbUser = await User.findOne({ email: 'new@example.com' });
    expect(dbUser).not.toBeNull();
  });

  it('returns 422 for invalid data', async () => {
    await createTestUser();
    const cookie = await getAuthCookie();

    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ name: '', email: 'not-email', password: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveProperty('name');
    expect(res.body.details).toHaveProperty('email');
  });

  it('returns 409 for duplicate email', async () => {
    await createTestUser();
    const cookie = await getAuthCookie();

    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ name: 'Dup', email: 'test@example.com', password: 'StrongPass1' });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/users/:id', () => {
  it('updates user fields', async () => {
    const user = await createTestUser();
    const cookie = await getAuthCookie();

    const res = await request(app)
      .patch(\`/api/users/\${user._id}\`)
      .set('Cookie', cookie)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('returns 404 for non-existent user', async () => {
    await createTestUser();
    const cookie = await getAuthCookie();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .patch(\`/api/users/\${fakeId}\`)
      .set('Cookie', cookie)
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/users/:id', () => {
  it('soft-deletes user (sets isActive to false)', async () => {
    const user = await createTestUser();
    const cookie = await getAuthCookie();

    const res = await request(app)
      .delete(\`/api/users/\${user._id}\`)
      .set('Cookie', cookie);

    expect(res.status).toBe(204);

    const dbUser = await User.findById(user._id);
    expect(dbUser!.isActive).toBe(false);
  });
});`,
  },

  {
    id: 'django-api-permissions',
    title: 'Django REST Framework Custom Permissions',
    description: 'Custom DRF permission classes for object-level, role-based, and conditional access control.',
    tech: ['django', 'drf', 'python'],
    tags: ['django', 'permissions', 'auth', 'security', 'drf'],
    code: `from rest_framework import permissions
from django.utils import timezone
from datetime import timedelta


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if hasattr(obj, 'author'):
            return obj.author == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsVerifiedUser(permissions.BasePermission):
    message = 'Email verification required to perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_verified', False)
        )


class HasRole(permissions.BasePermission):
    def __init__(self, *roles):
        self.roles = roles

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) in self.roles


def has_role(*roles):
    class RolePermission(permissions.BasePermission):
        message = f'Required role: {", ".join(roles)}'

        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            user_role = getattr(request.user, 'role', None)
            return user_role in roles

    return RolePermission


class ThrottledCreatePermission(permissions.BasePermission):
    message = 'You have exceeded the creation limit. Please wait before creating more.'

    def has_permission(self, request, view):
        if request.method != 'POST':
            return True
        if not request.user or not request.user.is_authenticated:
            return True

        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_count = view.get_queryset().filter(
            author=request.user,
            created_at__gte=one_hour_ago,
        ).count()
        return recent_count < 10


class IsObjectOwnerOrAdmin(permissions.BasePermission):
    owner_field = 'author'

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class ReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


# --- Usage in ViewSets ---
# class ArticleViewSet(viewsets.ModelViewSet):
#     permission_classes = [
#         permissions.IsAuthenticatedOrReadOnly,
#         IsOwnerOrReadOnly,
#     ]
#
# class AdminViewSet(viewsets.ModelViewSet):
#     permission_classes = [has_role('admin', 'moderator')]
#
# class PublicViewSet(viewsets.ReadOnlyModelViewSet):
#     permission_classes = [ReadOnly]`,
  },

  {
    id: 'spring-audit-interceptor',
    title: 'Spring Boot Audit Interceptor with JPA Listener',
    description: 'Entity auditing with JPA lifecycle callbacks for tracking who changed what and when.',
    tech: ['spring-boot', 'jpa', 'java'],
    tags: ['spring', 'audit', 'jpa', 'tracking', 'java'],
    code: `package com.myapp.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
public abstract class Auditable {
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false, length = 100)
    private String createdBy;

    @LastModifiedBy
    @Column(length = 100)
    private String updatedBy;
}

@Entity
@Table(name = "audit_log", indexes = {
    @Index(name = "idx_audit_entity", columnList = "entityType,entityId"),
    @Index(name = "idx_audit_user", columnList = "performedBy,performedAt"),
})
@Getter @Setter @NoArgsConstructor
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private AuditAction action;

    @Column(nullable = false, length = 50)
    private String entityType;

    @Column(nullable = false, length = 50)
    private String entityId;

    @Column(columnDefinition = "TEXT")
    private String oldValues;

    @Column(columnDefinition = "TEXT")
    private String newValues;

    @Column(length = 100)
    private String performedBy;

    @Column(nullable = false)
    private LocalDateTime performedAt;

    @Column(length = 45)
    private String ipAddress;
}

public enum AuditAction { CREATE, UPDATE, DELETE }

@Component
@Slf4j
public class AuditListener {

    private static AuditLogRepository auditLogRepository;
    private static ObjectMapper objectMapper;

    public AuditListener(AuditLogRepository repo, ObjectMapper mapper) {
        AuditListener.auditLogRepository = repo;
        AuditListener.objectMapper = mapper;
    }

    @PostPersist
    public void onPostPersist(Object entity) {
        logAudit(AuditAction.CREATE, entity, null);
    }

    @PostUpdate
    public void onPostUpdate(Object entity) {
        logAudit(AuditAction.UPDATE, entity, null);
    }

    @PostRemove
    public void onPostRemove(Object entity) {
        logAudit(AuditAction.DELETE, entity, null);
    }

    private void logAudit(AuditAction action, Object entity, Object oldEntity) {
        try {
            String entityType = entity.getClass().getSimpleName();
            String entityId = getEntityId(entity);
            String currentUser = getCurrentUser();

            AuditLog auditLog = new AuditLog();
            auditLog.setAction(action);
            auditLog.setEntityType(entityType);
            auditLog.setEntityId(entityId);
            auditLog.setPerformedBy(currentUser);
            auditLog.setPerformedAt(LocalDateTime.now());

            if (action != AuditAction.DELETE) {
                auditLog.setNewValues(objectMapper.writeValueAsString(entity));
            }
            if (oldEntity != null) {
                auditLog.setOldValues(objectMapper.writeValueAsString(oldEntity));
            }

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to create audit log for {} {}", entity.getClass().getSimpleName(), action, e);
        }
    }

    private String getEntityId(Object entity) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            Object id = field.get(entity);
            return id != null ? id.toString() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    private String getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() ? auth.getName() : "system";
    }
}`,
  },

  {
    id: 'dotnet-output-cache',
    title: 'ASP.NET Core Output Caching with Redis',
    description: 'Response caching for ASP.NET Core APIs with Redis backend, cache tags, and selective invalidation.',
    tech: ['aspnet-core', 'redis', 'csharp'],
    tags: ['dotnet', 'caching', 'redis', 'performance', 'csharp'],
    code: `using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using StackExchange.Redis;

namespace MyApp.Caching;

public static class CachingConfig
{
    public static void AddOutputCaching(this IServiceCollection services, IConfiguration config)
    {
        services.AddStackExchangeRedisOutputCache(options =>
        {
            options.Configuration = config.GetConnectionString("Redis");
            options.InstanceName = "myapp:";
        });

        services.AddOutputCache(options =>
        {
            options.AddBasePolicy(builder => builder.NoCache());

            options.AddPolicy("CachePublicData", builder =>
                builder.Expire(TimeSpan.FromMinutes(5))
                    .Tag("public-data"));

            options.AddPolicy("CacheUserData", builder =>
                builder.Expire(TimeSpan.FromMinutes(1))
                    .SetVaryByHeader("Authorization")
                    .Tag("user-data"));

            options.AddPolicy("CacheProductList", builder =>
                builder.Expire(TimeSpan.FromMinutes(10))
                    .SetVaryByQuery("page", "pageSize", "category", "search")
                    .Tag("products"));
        });
    }

    public static void UseOutputCaching(this WebApplication app)
    {
        app.UseOutputCache();
    }
}

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly IOutputCacheStore _cacheStore;

    public ProductsController(IProductService productService, IOutputCacheStore cacheStore)
    {
        _productService = productService;
        _cacheStore = cacheStore;
    }

    [HttpGet]
    [OutputCache(PolicyName = "CacheProductList")]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null)
    {
        var result = await _productService.GetAllAsync(page, pageSize, category);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [OutputCache(Duration = 60, VaryByRouteValueNames = new[] { "id" }, Tags = new[] { "products" })]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request)
    {
        var product = await _productService.CreateAsync(request);
        await _cacheStore.EvictByTagAsync("products", default);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(int id, UpdateProductRequest request)
    {
        var product = await _productService.UpdateAsync(id, request);
        if (product is null) return NotFound();
        await _cacheStore.EvictByTagAsync("products", default);
        return Ok(product);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _productService.DeleteAsync(id);
        if (!deleted) return NotFound();
        await _cacheStore.EvictByTagAsync("products", default);
        return NoContent();
    }
}`,
  },

  {
    id: 'go-sqlx-repository',
    title: 'Go Repository with sqlx and Context',
    description: 'Clean repository implementation using sqlx with context support, named queries, and transaction handling.',
    tech: ['go', 'sqlx', 'postgresql'],
    tags: ['go', 'database', 'sqlx', 'repository'],
    code: `package repository

import (
        "context"
        "database/sql"
        "fmt"
        "strings"

        "github.com/jmoiron/sqlx"
)

type User struct {
        ID        uint   \`db:"id" json:"id"\`
        Name      string \`db:"name" json:"name"\`
        Email     string \`db:"email" json:"email"\`
        Password  string \`db:"password_hash" json:"-"\`
        Role      string \`db:"role" json:"role"\`
        IsActive  bool   \`db:"is_active" json:"is_active"\`
        CreatedAt string \`db:"created_at" json:"created_at"\`
        UpdatedAt string \`db:"updated_at" json:"updated_at"\`
}

type UserFilter struct {
        Search string
        Role   string
        Active *bool
}

type PagedResult struct {
        Items      []User \`json:"items"\`
        Page       int    \`json:"page"\`
        PageSize   int    \`json:"page_size"\`
        Total      int    \`json:"total"\`
        TotalPages int    \`json:"total_pages"\`
}

type UserRepository struct {
        db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
        return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id uint) (*User, error) {
        var user User
        err := r.db.GetContext(ctx, &user,
                "SELECT id, name, email, password_hash, role, is_active, created_at, updated_at FROM users WHERE id = $1 AND is_active = true",
                id)
        if err == sql.ErrNoRows {
                return nil, nil
        }
        if err != nil {
                return nil, fmt.Errorf("finding user %d: %w", id, err)
        }
        return &user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
        var user User
        err := r.db.GetContext(ctx, &user,
                "SELECT id, name, email, password_hash, role, is_active, created_at, updated_at FROM users WHERE email = $1",
                email)
        if err == sql.ErrNoRows {
                return nil, nil
        }
        if err != nil {
                return nil, fmt.Errorf("finding user by email: %w", err)
        }
        return &user, nil
}

func (r *UserRepository) List(ctx context.Context, filter UserFilter, page, pageSize int) (*PagedResult, error) {
        var conditions []string
        var args []interface{}
        argIdx := 1

        conditions = append(conditions, "is_active = true")

        if filter.Search != "" {
                conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR email ILIKE $%d)", argIdx, argIdx))
                args = append(args, "%"+filter.Search+"%")
                argIdx++
        }
        if filter.Role != "" {
                conditions = append(conditions, fmt.Sprintf("role = $%d", argIdx))
                args = append(args, filter.Role)
                argIdx++
        }

        where := strings.Join(conditions, " AND ")

        var total int
        countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users WHERE %s", where)
        if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
                return nil, fmt.Errorf("counting users: %w", err)
        }

        offset := (page - 1) * pageSize
        args = append(args, pageSize, offset)
        listQuery := fmt.Sprintf(
                "SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
                where, argIdx, argIdx+1)

        var users []User
        if err := r.db.SelectContext(ctx, &users, listQuery, args...); err != nil {
                return nil, fmt.Errorf("listing users: %w", err)
        }

        totalPages := (total + pageSize - 1) / pageSize

        return &PagedResult{
                Items:      users,
                Page:       page,
                PageSize:   pageSize,
                Total:      total,
                TotalPages: totalPages,
        }, nil
}

func (r *UserRepository) Create(ctx context.Context, user *User) error {
        query := \`INSERT INTO users (name, email, password_hash, role)
                VALUES (:name, :email, :password_hash, :role)
                RETURNING id, created_at, updated_at\`

        rows, err := r.db.NamedQueryContext(ctx, query, user)
        if err != nil {
                return fmt.Errorf("creating user: %w", err)
        }
        defer rows.Close()
        if rows.Next() {
                if err := rows.StructScan(user); err != nil {
                        return fmt.Errorf("scanning created user: %w", err)
                }
        }
        return nil
}

func (r *UserRepository) Update(ctx context.Context, id uint, updates map[string]interface{}) error {
        var setClauses []string
        var args []interface{}
        argIdx := 1

        for field, value := range updates {
                setClauses = append(setClauses, fmt.Sprintf("%s = $%d", field, argIdx))
                args = append(args, value)
                argIdx++
        }

        setClauses = append(setClauses, fmt.Sprintf("updated_at = NOW()"))
        args = append(args, id)

        query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d",
                strings.Join(setClauses, ", "), argIdx)

        result, err := r.db.ExecContext(ctx, query, args...)
        if err != nil {
                return fmt.Errorf("updating user %d: %w", id, err)
        }
        rows, _ := result.RowsAffected()
        if rows == 0 {
                return fmt.Errorf("user %d not found", id)
        }
        return nil
}

func (r *UserRepository) Delete(ctx context.Context, id uint) error {
        result, err := r.db.ExecContext(ctx,
                "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true", id)
        if err != nil {
                return fmt.Errorf("deleting user %d: %w", id, err)
        }
        rows, _ := result.RowsAffected()
        if rows == 0 {
                return fmt.Errorf("user %d not found", id)
        }
        return nil
}

func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
        var exists bool
        err := r.db.GetContext(ctx, &exists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email)
        return exists, err
}`,
  },

];

STACK_CODE_SNIPPETS.push(...EXTENDED_STACK_SNIPPETS_3);

// ============================================
// Final Go+React supplemental best practices
// ============================================

const FINAL_GO_REACT_PRACTICES: BestPractice[] = [
  {
    id: 'go-react-bp-table-driven',
    title: 'Table-Driven Tests in Go',
    category: 'testing',
    description: 'Use table-driven tests to cover multiple cases concisely and reduce repetition.',
    do: [
      'Define a slice of structs containing inputs and expected outputs',
      'Loop over cases with t.Run() for named subtests',
      'Use t.Parallel() in subtests when tests are independent',
      'Name each case descriptively for clear failure messages',
    ],
    dont: [
      'Write one test function per input — table-driven is more maintainable',
      'Ignore subtests — t.Run gives better failure context',
      'Share mutable state across table cases',
    ],
    languages: ['go'],
  },
  {
    id: 'go-react-bp-embed-migrations',
    title: 'Embed SQL Migrations with go:embed',
    category: 'database',
    description: 'Use go:embed to ship SQL migration files inside the binary for zero-dependency deployments.',
    do: [
      'Place migration files in a migrations/ subdirectory',
      'Use //go:embed migrations/*.sql to embed all files',
      'Run migrations at startup before accepting HTTP traffic',
      'Use a migration library (golang-migrate) with the embedded FS',
    ],
    dont: [
      'Rely on external files at runtime — they may not exist in containerised environments',
      'Run migrations in parallel — execute them sequentially',
      'Skip idempotency — every migration must be safe to re-run or use version tracking',
    ],
    languages: ['go'],
  },
  {
    id: 'go-react-bp-signal-shutdown',
    title: 'Graceful Shutdown on OS Signal',
    category: 'deployment',
    description: 'Listen for SIGINT/SIGTERM to drain in-flight requests before the process exits.',
    do: [
      'Use signal.NotifyContext or signal.Notify with a buffered channel',
      'Give in-flight requests a deadline (e.g. 10s) via context.WithTimeout',
      'Close database connections and flush caches after the HTTP server shuts down',
      'Log the shutdown reason so operators know whether it was graceful',
    ],
    dont: [
      'Call os.Exit(0) directly — it skips all deferred cleanup',
      'Set an infinite shutdown timeout — set a hard ceiling',
      'Ignore the error returned by server.Shutdown()',
    ],
    languages: ['go'],
  },
];

STACK_BEST_PRACTICES.push(...FINAL_GO_REACT_PRACTICES);

// ============================================
// Final anti-pattern entries
// ============================================

const FINAL_ANTI_PATTERNS_END: AntiPattern[] = [
  {
    id: 'go-naked-panic',
    name: 'Naked Panic in HTTP Handlers',
    description: 'Calling panic() inside an HTTP handler to signal errors.',
    whyBad: 'A panic propagates up the call stack and, without a recovery middleware, crashes the entire server process — dropping all in-flight requests.',
    fix: 'Return an error from the handler and write an appropriate HTTP error response. Add a recovery middleware (e.g. gin.Recovery()) that catches panics at the router level and returns 500.',
    severity: 'critical',
    badExample: `func handler(w http.ResponseWriter, r *http.Request) {
  data, err := getUser(r.Context(), 1)
  if err != nil { panic(err) }
  json.NewEncoder(w).Encode(data)
}`,
    goodExample: `func handler(w http.ResponseWriter, r *http.Request) {
  data, err := getUser(r.Context(), 1)
  if err != nil {
    http.Error(w, "internal server error", http.StatusInternalServerError)
    return
  }
  json.NewEncoder(w).Encode(data)
}`,
    tags: ['go', 'panic', 'reliability', 'http'],
  },
  {
    id: 'go-goroutine-abandoned-channel',
    name: 'Goroutine Leak from Abandoned Channels',
    description: 'Spawning goroutines that block on a channel no receiver will ever read.',
    whyBad: 'Leaked goroutines hold memory and open resources (DB connections, file handles) for the lifetime of the process, causing steady memory growth and eventual OOM.',
    fix: 'Always pair every goroutine with a cancel mechanism (context cancellation, a done channel, or a timeout). Use goleak in tests to detect leaks.',
    severity: 'high',
    badExample: `func process(items []int) {
  ch := make(chan int)
  go func() { ch <- heavyWork(items) }() // nobody reads ch
}`,
    goodExample: `func process(ctx context.Context, items []int) (int, error) {
  ch := make(chan int, 1)
  go func() { ch <- heavyWork(items) }()
  select {
  case result := <-ch:
    return result, nil
  case <-ctx.Done():
    return 0, ctx.Err()
  }
}`,
    tags: ['go', 'goroutine', 'memory', 'concurrency'],
  },
];

STACK_ANTI_PATTERNS.push(...FINAL_ANTI_PATTERNS_END);

// ============================================
// Extended coverage snippets — missing topics
// ============================================

const MISSING_COVERAGE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'django-pytest-fixture',
    title: 'pytest-django Fixtures and API Tests',
    description: 'Write Django REST Framework API tests using pytest-django fixtures.',
    tech: ['django', 'python', 'pytest', 'rest-framework'],
    code: `# conftest.py
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client, db):
    user = User.objects.create_user(
        username='testuser', email='test@example.com', password='testpass123'
    )
    api_client.force_authenticate(user=user)
    return api_client, user

# tests/test_articles.py
import pytest
from django.urls import reverse
from articles.models import Article

@pytest.mark.django_db
def test_create_article(auth_client):
    client, user = auth_client
    url = reverse('article-list')
    payload = {'title': 'Hello World', 'content': 'Body text', 'status': 'draft'}
    response = client.post(url, payload, format='json')
    assert response.status_code == 201
    assert response.data['title'] == 'Hello World'
    assert Article.objects.filter(author=user).count() == 1

@pytest.mark.django_db
def test_list_articles_unauthenticated(api_client):
    url = reverse('article-list')
    response = api_client.get(url)
    assert response.status_code in [200, 401]  # depends on permission class

@pytest.mark.django_db
@pytest.mark.parametrize('status_filter', ['draft', 'published', 'archived'])
def test_filter_articles_by_status(auth_client, status_filter):
    client, user = auth_client
    Article.objects.create(title='T1', content='C', author=user, status=status_filter)
    url = reverse('article-list') + f'?status={status_filter}'
    response = client.get(url)
    assert response.status_code == 200
    assert all(a['status'] == status_filter for a in response.data['results'])`,
    tags: ['django', 'pytest', 'testing', 'api'],
  },
  {
    id: 'spring-mockmvc-test',
    title: 'Spring Boot MockMvc Integration Tests',
    description: 'Test Spring REST controllers with MockMvc and JUnit 5.',
    tech: ['spring-boot', 'java', 'junit5', 'mockito'],
    code: `package com.example.api.controllers;

import com.example.api.dto.CreateUserRequest;
import com.example.api.services.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean UserService userService;

    @Test
    void createUser_returnsCreated() throws Exception {
        var req = new CreateUserRequest("Alice", "alice@example.com");
        var saved = new UserDto(1L, "Alice", "alice@example.com");
        when(userService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1L))
            .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void getUser_notFound_returns404() throws Exception {
        when(userService.findById(99L)).thenThrow(new NotFoundException("User 99 not found"));
        mockMvc.perform(get("/api/users/99"))
            .andExpect(status().isNotFound());
    }
}`,
    tags: ['spring', 'mockmvc', 'junit5', 'testing'],
  },
  {
    id: 'spring-mapstruct-dto',
    title: 'MapStruct DTO Mapping in Spring Boot',
    description: 'Use MapStruct for compile-time, type-safe DTO ↔ entity mapping.',
    tech: ['spring-boot', 'java', 'mapstruct', 'jpa'],
    code: `// Entity
@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String email;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    // getters/setters omitted for brevity
}

// DTO
public record UserDto(Long id, String name, String email, LocalDateTime createdAt) {}
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email
) {}

// Mapper — MapStruct generates the implementation at compile time
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
    User toEntity(CreateUserRequest request);
    List<UserDto> toDtoList(List<User> users);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    User updateFromRequest(UpdateUserRequest request, @MappingTarget User user);
}

// Usage in Service
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository repo;
    private final UserMapper mapper;

    public UserDto create(CreateUserRequest req) {
        User user = mapper.toEntity(req);
        return mapper.toDto(repo.save(user));
    }

    public List<UserDto> findAll() {
        return mapper.toDtoList(repo.findAll());
    }
}`,
    tags: ['spring', 'mapstruct', 'dto', 'mapping'],
  },
  {
    id: 'dotnet-mediatr-cqrs',
    title: 'MediatR CQRS Handlers in .NET',
    description: 'Implement the CQRS pattern using MediatR with commands, queries, and handlers.',
    tech: ['dotnet', 'csharp', 'mediatr', 'aspnetcore'],
    code: `// Query
public record GetUserByIdQuery(int Id) : IRequest<UserDto?>;

// Command
public record CreateUserCommand(string Name, string Email) : IRequest<UserDto>;

// Query Handler
public class GetUserByIdHandler : IRequestHandler<GetUserByIdQuery, UserDto?>
{
    private readonly IUserRepository _repo;
    private readonly IMapper _mapper;

    public GetUserByIdHandler(IUserRepository repo, IMapper mapper)
        => (_repo, _mapper) = (repo, mapper);

    public async Task<UserDto?> Handle(GetUserByIdQuery request, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(request.Id, ct);
        return user is null ? null : _mapper.Map<UserDto>(user);
    }
}

// Command Handler
public class CreateUserHandler : IRequestHandler<CreateUserCommand, UserDto>
{
    private readonly IUserRepository _repo;
    private readonly IMapper _mapper;

    public CreateUserHandler(IUserRepository repo, IMapper mapper)
        => (_repo, _mapper) = (repo, mapper);

    public async Task<UserDto> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        var user = new User { Name = cmd.Name, Email = cmd.Email };
        await _repo.AddAsync(user, ct);
        return _mapper.Map<UserDto>(user);
    }
}

// Controller — thin, delegates to MediatR
[ApiController, Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;
    public UsersController(IMediator mediator) => _mediator = mediator;

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetUserByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserCommand cmd, CancellationToken ct)
    {
        var user = await _mediator.Send(cmd, ct);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }
}`,
    tags: ['dotnet', 'mediatr', 'cqrs', 'architecture'],
  },
  {
    id: 'dotnet-xunit-test',
    title: 'xUnit Integration Tests for .NET API',
    description: 'Write integration tests for ASP.NET Core controllers using xUnit and WebApplicationFactory.',
    tech: ['dotnet', 'csharp', 'xunit', 'aspnetcore'],
    code: `using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Json;
using Xunit;

public class UsersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UsersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace real DB with in-memory for tests
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(opts =>
                    opts.UseInMemoryDatabase("TestDb"));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task CreateUser_ReturnsCreated()
    {
        var cmd = new { Name = "Alice", Email = "alice@test.com" };
        var response = await _client.PostAsJsonAsync("/api/users", cmd);
        response.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("Alice", user!.Name);
    }

    [Fact]
    public async Task GetUser_NotFound_Returns404()
    {
        var response = await _client.GetAsync("/api/users/9999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("", "valid@test.com")]
    [InlineData("Bob", "not-an-email")]
    public async Task CreateUser_InvalidInput_Returns400(string name, string email)
    {
        var cmd = new { Name = name, Email = email };
        var response = await _client.PostAsJsonAsync("/api/users", cmd);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}`,
    tags: ['dotnet', 'xunit', 'integration-test', 'aspnetcore'],
  },
  {
    id: 'go-fiber-route-group',
    title: 'Fiber Route Groups with Middleware',
    description: 'Organise Fiber routes into versioned groups with per-group middleware.',
    tech: ['go', 'fiber', 'jwt', 'middleware'],
    code: `package main

import (
        "github.com/gofiber/fiber/v2"
        "github.com/gofiber/fiber/v2/middleware/logger"
        "github.com/gofiber/fiber/v2/middleware/recover"
        "github.com/gofiber/jwt/v3"
)

func SetupRoutes(app *fiber.App, h *Handlers) {
        // Global middleware
        app.Use(logger.New())
        app.Use(recover.New())

        // Public routes
        public := app.Group("/api")
        public.Post("/auth/login", h.Login)
        public.Post("/auth/register", h.Register)

        // Protected routes — require JWT
        protected := app.Group("/api", jwtware.New(jwtware.Config{
                SigningKey: []byte(cfg.JWTSecret),
        }))

        // v1 Users
        v1 := protected.Group("/v1")
        users := v1.Group("/users")
        users.Get("/", h.ListUsers)
        users.Get("/:id", h.GetUser)
        users.Post("/", h.CreateUser)
        users.Put("/:id", h.UpdateUser)
        users.Delete("/:id", h.DeleteUser)

        // Admin-only routes with additional middleware
        admin := v1.Group("/admin", RequireRole("admin"))
        admin.Get("/stats", h.GetStats)
        admin.Delete("/users/:id", h.AdminDeleteUser)
}

func RequireRole(role string) fiber.Handler {
        return func(c *fiber.Ctx) error {
                claims, ok := c.Locals("user").(*Claims)
                if !ok || claims.Role != role {
                        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                                "error": "insufficient permissions",
                        })
                }
                return c.Next()
        }
}`,
    tags: ['go', 'fiber', 'routing', 'middleware', 'jwt'],
  },
  {
    id: 'go-react-axios-client',
    title: 'React Axios Client for Go API',
    description: 'Typed axios client for a Go backend with interceptors for auth and error handling.',
    tech: ['react', 'typescript', 'axios', 'go'],
    code: `// src/lib/api.ts
import axios, { type AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Typed request helpers
export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<{ data: User[] }>('/api/v1/users');
  return data.data;
}

export async function createUser(payload: CreateUserInput): Promise<User> {
  const { data } = await api.post<{ data: User }>('/api/v1/users', payload);
  return data.data;
}

export async function updateUser(id: number, payload: Partial<CreateUserInput>): Promise<User> {
  const { data } = await api.put<{ data: User }>(\`/api/v1/users/\${id}\`, payload);
  return data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(\`/api/v1/users/\${id}\`);
}

// Types
export interface User { id: number; name: string; email: string; createdAt: string; }
export interface CreateUserInput { name: string; email: string; }`,
    tags: ['go', 'react', 'axios', 'typescript', 'frontend'],
  },
];

STACK_CODE_SNIPPETS.push(...MISSING_COVERAGE_SNIPPETS);
