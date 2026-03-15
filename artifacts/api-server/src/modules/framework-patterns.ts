import type { RoutePattern, ModelPattern, ProjectStructure } from './language-registry';

export interface FrameworkPattern {
  id: string;
  name: string;
  language: string;
  category: 'backend' | 'frontend' | 'fullstack';
  version: string;
  description: string;
  routePattern: RoutePattern;
  modelPattern: ModelPattern;
  projectStructure: ProjectStructure;
  configTemplate: { path: string; content: string }[];
  startCommand: string;
  dependencies: string[];
  devDependencies: string[];
  middlewarePattern: string;
  authPattern: string;
  validationPattern: string;
  errorHandlerPattern: string;
  corsPattern: string;
  staticFilePattern: string;
  envPattern: string;
  dockerfileTemplate: string;
}

const FRAMEWORKS: Record<string, FrameworkPattern> = {
  fastapi: {
    id: 'fastapi', name: 'FastAPI', language: 'python', category: 'backend', version: '0.111',
    description: 'Modern, fast Python web framework with automatic OpenAPI docs',
    routePattern: {
      defineRoute: '@app.{method}("{path}")',
      getAll: '@app.get("/{entity}")\nasync def get_{entity}(db: Session = Depends(get_db)):\n    return db.query({Entity}).all()',
      getById: '@app.get("/{entity}/{{id}}")\nasync def get_{entity}(id: int, db: Session = Depends(get_db)):\n    item = db.query({Entity}).filter({Entity}.id == id).first()\n    if not item:\n        raise HTTPException(status_code=404, detail="{Entity} not found")\n    return item',
      create: '@app.post("/{entity}", status_code=201)\nasync def create_{entity}(data: {Entity}Create, db: Session = Depends(get_db)):\n    item = {Entity}(**data.dict())\n    db.add(item)\n    db.commit()\n    db.refresh(item)\n    return item',
      update: '@app.put("/{entity}/{{id}}")\nasync def update_{entity}(id: int, data: {Entity}Update, db: Session = Depends(get_db)):\n    item = db.query({Entity}).filter({Entity}.id == id).first()\n    if not item:\n        raise HTTPException(status_code=404, detail="{Entity} not found")\n    for key, value in data.dict(exclude_unset=True).items():\n        setattr(item, key, value)\n    db.commit()\n    return item',
      delete: '@app.delete("/{entity}/{{id}}", status_code=204)\nasync def delete_{entity}(id: int, db: Session = Depends(get_db)):\n    item = db.query({Entity}).filter({Entity}.id == id).first()\n    if not item:\n        raise HTTPException(status_code=404, detail="{Entity} not found")\n    db.delete(item)\n    db.commit()',
      middleware: '@app.middleware("http")\nasync def {name}(request: Request, call_next):\n    response = await call_next(request)\n    return response',
      example: '@app.get("/health")\nasync def health():\n    return {"status": "ok"}',
    },
    modelPattern: {
      defineModel: 'class {Name}(Base):\n    __tablename__ = "{table}"',
      field: '    {name} = Column({type}{constraints})',
      primaryKey: '    id = Column(Integer, primary_key=True, autoincrement=True)',
      foreignKey: '    {name}_id = Column(Integer, ForeignKey("{table}.id"))',
      relationship: '    {name} = relationship("{Target}", back_populates="{backref}")',
      example: 'class User(Base):\n    __tablename__ = "users"\n    id = Column(Integer, primary_key=True)\n    name = Column(String, nullable=False)\n    email = Column(String, unique=True)',
    },
    projectStructure: {
      entryPoint: 'main.py', modelDir: 'models/', routeDir: 'routes/',
      configFiles: ['requirements.txt', '.env', 'config.py', 'database.py'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'requirements.txt', content: 'fastapi==0.111.0\nuvicorn[standard]==0.30.0\nsqlalchemy==2.0.30\npython-dotenv==1.0.1\npydantic==2.7.0\nalembic==1.13.1\npsycopg2-binary==2.9.9' },
      { path: 'database.py', content: 'from sqlalchemy import create_engine\nfrom sqlalchemy.ext.declarative import declarative_base\nfrom sqlalchemy.orm import sessionmaker\nimport os\n\nDATABASE_URL = os.getenv("DATABASE_URL")\nengine = create_engine(DATABASE_URL)\nSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)\nBase = declarative_base()\n\ndef get_db():\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()' },
    ],
    startCommand: 'uvicorn main:app --host 0.0.0.0 --port 5000 --reload',
    dependencies: ['fastapi', 'uvicorn[standard]', 'sqlalchemy', 'python-dotenv', 'pydantic', 'alembic', 'psycopg2-binary'],
    devDependencies: ['pytest', 'httpx'],
    middlewarePattern: '@app.middleware("http")\nasync def {name}_middleware(request: Request, call_next):\n    response = await call_next(request)\n    return response',
    authPattern: 'from fastapi.security import OAuth2PasswordBearer\noauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")\n\nasync def get_current_user(token: str = Depends(oauth2_scheme)):\n    pass',
    validationPattern: 'from pydantic import BaseModel, Field\n\nclass {Name}Create(BaseModel):\n    {fields}',
    errorHandlerPattern: '@app.exception_handler(HTTPException)\nasync def http_exception_handler(request, exc):\n    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})',
    corsPattern: 'from fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])',
    staticFilePattern: 'from fastapi.staticfiles import StaticFiles\napp.mount("/static", StaticFiles(directory="static"), name="static")',
    envPattern: 'from dotenv import load_dotenv\nimport os\nload_dotenv()\nDATABASE_URL = os.getenv("DATABASE_URL")',
    dockerfileTemplate: 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]',
  },

  flask: {
    id: 'flask', name: 'Flask', language: 'python', category: 'backend', version: '3.0',
    description: 'Lightweight Python web framework with flexible architecture',
    routePattern: {
      defineRoute: '@app.route("{path}", methods=["{method}"])',
      getAll: '@app.route("/{entity}", methods=["GET"])\ndef get_{entity}():\n    items = {Entity}.query.all()\n    return jsonify([item.to_dict() for item in items])',
      getById: '@app.route("/{entity}/<int:id>", methods=["GET"])\ndef get_{entity}(id):\n    item = {Entity}.query.get_or_404(id)\n    return jsonify(item.to_dict())',
      create: '@app.route("/{entity}", methods=["POST"])\ndef create_{entity}():\n    data = request.get_json()\n    item = {Entity}(**data)\n    db.session.add(item)\n    db.session.commit()\n    return jsonify(item.to_dict()), 201',
      update: '@app.route("/{entity}/<int:id>", methods=["PUT"])\ndef update_{entity}(id):\n    item = {Entity}.query.get_or_404(id)\n    data = request.get_json()\n    for key, value in data.items():\n        setattr(item, key, value)\n    db.session.commit()\n    return jsonify(item.to_dict())',
      delete: '@app.route("/{entity}/<int:id>", methods=["DELETE"])\ndef delete_{entity}(id):\n    item = {Entity}.query.get_or_404(id)\n    db.session.delete(item)\n    db.session.commit()\n    return "", 204',
      middleware: '@app.before_request\ndef {name}():\n    pass',
      example: '@app.route("/health")\ndef health():\n    return jsonify({"status": "ok"})',
    },
    modelPattern: {
      defineModel: 'class {Name}(db.Model):\n    __tablename__ = "{table}"',
      field: '    {name} = db.Column(db.{type}{constraints})',
      primaryKey: '    id = db.Column(db.Integer, primary_key=True)',
      foreignKey: '    {name}_id = db.Column(db.Integer, db.ForeignKey("{table}.id"))',
      relationship: '    {name} = db.relationship("{Target}", backref="{backref}")',
      example: 'class User(db.Model):\n    __tablename__ = "users"\n    id = db.Column(db.Integer, primary_key=True)\n    name = db.Column(db.String(100), nullable=False)\n    email = db.Column(db.String(120), unique=True)',
    },
    projectStructure: {
      entryPoint: 'app.py', modelDir: 'models/', routeDir: 'routes/',
      configFiles: ['requirements.txt', '.env', 'config.py'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'requirements.txt', content: 'flask==3.0.3\nflask-sqlalchemy==3.1.1\nflask-cors==4.0.1\npython-dotenv==1.0.1\npsycopg2-binary==2.9.9\ngunicorn==22.0.0' },
    ],
    startCommand: 'flask run --host=0.0.0.0 --port=5000',
    dependencies: ['flask', 'flask-sqlalchemy', 'flask-cors', 'python-dotenv', 'psycopg2-binary', 'gunicorn'],
    devDependencies: ['pytest', 'flask-testing'],
    middlewarePattern: '@app.before_request\ndef {name}_middleware():\n    pass',
    authPattern: 'from flask_login import LoginManager, login_required\nlogin_manager = LoginManager()\n\n@login_manager.user_loader\ndef load_user(user_id):\n    return User.query.get(user_id)',
    validationPattern: 'from marshmallow import Schema, fields\n\nclass {Name}Schema(Schema):\n    {fields}',
    errorHandlerPattern: '@app.errorhandler(404)\ndef not_found(e):\n    return jsonify({"error": "Not found"}), 404',
    corsPattern: 'from flask_cors import CORS\nCORS(app)',
    staticFilePattern: 'app = Flask(__name__, static_folder="static")',
    envPattern: 'from dotenv import load_dotenv\nimport os\nload_dotenv()\napp.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")',
    dockerfileTemplate: 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]',
  },

  django: {
    id: 'django', name: 'Django', language: 'python', category: 'fullstack', version: '5.0',
    description: 'Full-featured Python web framework with batteries included',
    routePattern: {
      defineRoute: 'path("{path}", {view}, name="{name}")',
      getAll: 'class {Entity}ListView(generics.ListCreateAPIView):\n    queryset = {Entity}.objects.all()\n    serializer_class = {Entity}Serializer',
      getById: 'class {Entity}DetailView(generics.RetrieveUpdateDestroyAPIView):\n    queryset = {Entity}.objects.all()\n    serializer_class = {Entity}Serializer',
      create: 'class {Entity}ListView(generics.ListCreateAPIView):\n    queryset = {Entity}.objects.all()\n    serializer_class = {Entity}Serializer',
      update: 'class {Entity}DetailView(generics.RetrieveUpdateDestroyAPIView):\n    queryset = {Entity}.objects.all()\n    serializer_class = {Entity}Serializer',
      delete: 'class {Entity}DetailView(generics.RetrieveUpdateDestroyAPIView):\n    queryset = {Entity}.objects.all()\n    serializer_class = {Entity}Serializer',
      middleware: 'class {Name}Middleware:\n    def __init__(self, get_response):\n        self.get_response = get_response\n    def __call__(self, request):\n        response = self.get_response(request)\n        return response',
      example: 'path("health/", lambda r: JsonResponse({"status": "ok"}))',
    },
    modelPattern: {
      defineModel: 'class {Name}(models.Model):\n    class Meta:\n        db_table = "{table}"',
      field: '    {name} = models.{Type}Field({constraints})',
      primaryKey: '    id = models.AutoField(primary_key=True)',
      foreignKey: '    {name} = models.ForeignKey("{Target}", on_delete=models.CASCADE)',
      relationship: '    {name} = models.ForeignKey("{Target}", related_name="{backref}", on_delete=models.CASCADE)',
      example: 'class User(models.Model):\n    name = models.CharField(max_length=100)\n    email = models.EmailField(unique=True)',
    },
    projectStructure: {
      entryPoint: 'manage.py', modelDir: 'app/models/', routeDir: 'app/views/',
      configFiles: ['requirements.txt', '.env', 'settings.py', 'urls.py'], testDir: 'app/tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'requirements.txt', content: 'django==5.0.6\ndjangorestframework==3.15.1\ndjango-cors-headers==4.3.1\npython-dotenv==1.0.1\npsycopg2-binary==2.9.9\ngunicorn==22.0.0' },
    ],
    startCommand: 'python manage.py runserver 0.0.0.0:5000',
    dependencies: ['django', 'djangorestframework', 'django-cors-headers', 'python-dotenv', 'psycopg2-binary', 'gunicorn'],
    devDependencies: ['pytest-django'],
    middlewarePattern: 'MIDDLEWARE = [\n    "{name}Middleware",\n]',
    authPattern: 'from django.contrib.auth.decorators import login_required\nfrom rest_framework.permissions import IsAuthenticated',
    validationPattern: 'class {Name}Serializer(serializers.ModelSerializer):\n    class Meta:\n        model = {Name}\n        fields = "__all__"',
    errorHandlerPattern: 'handler404 = "app.views.custom_404"',
    corsPattern: 'INSTALLED_APPS += ["corsheaders"]\nMIDDLEWARE.insert(0, "corsheaders.middleware.CorsMiddleware")\nCORS_ALLOW_ALL_ORIGINS = True',
    staticFilePattern: 'STATIC_URL = "/static/"\nSTATICFILES_DIRS = [BASE_DIR / "static"]',
    envPattern: 'from dotenv import load_dotenv\nimport os\nload_dotenv()\nDATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": os.getenv("DB_NAME")}}',
    dockerfileTemplate: 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD ["gunicorn", "project.wsgi:application", "-b", "0.0.0.0:5000"]',
  },

  gin: {
    id: 'gin', name: 'Gin', language: 'go', category: 'backend', version: '1.10',
    description: 'High-performance HTTP web framework for Go',
    routePattern: {
      defineRoute: 'r.{METHOD}("{path}", {handler})',
      getAll: 'func Get{Entity}(c *gin.Context) {\n\tvar items []{Entity}\n\tdb.Find(&items)\n\tc.JSON(http.StatusOK, items)\n}',
      getById: 'func Get{Entity}ByID(c *gin.Context) {\n\tid := c.Param("id")\n\tvar item {Entity}\n\tif err := db.First(&item, id).Error; err != nil {\n\t\tc.JSON(http.StatusNotFound, gin.H{"error": "{Entity} not found"})\n\t\treturn\n\t}\n\tc.JSON(http.StatusOK, item)\n}',
      create: 'func Create{Entity}(c *gin.Context) {\n\tvar item {Entity}\n\tif err := c.ShouldBindJSON(&item); err != nil {\n\t\tc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})\n\t\treturn\n\t}\n\tdb.Create(&item)\n\tc.JSON(http.StatusCreated, item)\n}',
      update: 'func Update{Entity}(c *gin.Context) {\n\tid := c.Param("id")\n\tvar item {Entity}\n\tif err := db.First(&item, id).Error; err != nil {\n\t\tc.JSON(http.StatusNotFound, gin.H{"error": "{Entity} not found"})\n\t\treturn\n\t}\n\tif err := c.ShouldBindJSON(&item); err != nil {\n\t\tc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})\n\t\treturn\n\t}\n\tdb.Save(&item)\n\tc.JSON(http.StatusOK, item)\n}',
      delete: 'func Delete{Entity}(c *gin.Context) {\n\tid := c.Param("id")\n\tif err := db.Delete(&{Entity}{}, id).Error; err != nil {\n\t\tc.JSON(http.StatusNotFound, gin.H{"error": "{Entity} not found"})\n\t\treturn\n\t}\n\tc.Status(http.StatusNoContent)\n}',
      middleware: 'func {Name}Middleware() gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\tc.Next()\n\t}\n}',
      example: 'r.GET("/health", func(c *gin.Context) {\n\tc.JSON(200, gin.H{"status": "ok"})\n})',
    },
    modelPattern: {
      defineModel: 'type {Name} struct {\n\tgorm.Model',
      field: '\t{Name} {type} `json:"{json_name}" gorm:"{gorm_tag}"`',
      primaryKey: '\tID uint `json:"id" gorm:"primaryKey"`',
      foreignKey: '\t{Name}ID uint `json:"{json_name}_id"`',
      relationship: '\t{Name} {Target} `json:"{json_name}" gorm:"foreignKey:{FK}"`',
      example: 'type User struct {\n\tgorm.Model\n\tName  string `json:"name" gorm:"not null"`\n\tEmail string `json:"email" gorm:"unique"`\n}',
    },
    projectStructure: {
      entryPoint: 'main.go', modelDir: 'models/', routeDir: 'handlers/',
      configFiles: ['go.mod', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'go.mod', content: 'module app\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n\tgorm.io/gorm v1.25.10\n\tgorm.io/driver/postgres v1.5.9\n\tgithub.com/joho/godotenv v1.5.1\n)' },
    ],
    startCommand: 'go run main.go',
    dependencies: ['github.com/gin-gonic/gin', 'gorm.io/gorm', 'gorm.io/driver/postgres', 'github.com/joho/godotenv'],
    devDependencies: ['github.com/stretchr/testify'],
    middlewarePattern: 'func {Name}() gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\tc.Next()\n\t}\n}',
    authPattern: 'func AuthMiddleware() gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\ttoken := c.GetHeader("Authorization")\n\t\tif token == "" {\n\t\t\tc.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})\n\t\t\treturn\n\t\t}\n\t\tc.Next()\n\t}\n}',
    validationPattern: 'type Create{Name}Input struct {\n\t{fields}\n}',
    errorHandlerPattern: 'func ErrorHandler() gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\tc.Next()\n\t\tfor _, err := range c.Errors {\n\t\t\tc.JSON(-1, gin.H{"error": err.Error()})\n\t\t}\n\t}\n}',
    corsPattern: 'import "github.com/gin-contrib/cors"\nr.Use(cors.Default())',
    staticFilePattern: 'r.Static("/static", "./static")',
    envPattern: 'import "github.com/joho/godotenv"\ngodotenv.Load()\ndbURL := os.Getenv("DATABASE_URL")',
    dockerfileTemplate: 'FROM golang:1.22-alpine AS build\nWORKDIR /app\nCOPY go.* ./\nRUN go mod download\nCOPY . .\nRUN go build -o /server\nFROM alpine:3.19\nCOPY --from=build /server /server\nCMD ["/server"]',
  },

  echo: {
    id: 'echo', name: 'Echo', language: 'go', category: 'backend', version: '4.12',
    description: 'High performance, minimalist Go web framework',
    routePattern: {
      defineRoute: 'e.{METHOD}("{path}", {handler})',
      getAll: 'func Get{Entity}(c echo.Context) error {\n\tvar items []{Entity}\n\tdb.Find(&items)\n\treturn c.JSON(http.StatusOK, items)\n}',
      getById: 'func Get{Entity}ByID(c echo.Context) error {\n\tid := c.Param("id")\n\tvar item {Entity}\n\tif err := db.First(&item, id).Error; err != nil {\n\t\treturn c.JSON(http.StatusNotFound, map[string]string{"error": "not found"})\n\t}\n\treturn c.JSON(http.StatusOK, item)\n}',
      create: 'func Create{Entity}(c echo.Context) error {\n\tvar item {Entity}\n\tif err := c.Bind(&item); err != nil {\n\t\treturn c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})\n\t}\n\tdb.Create(&item)\n\treturn c.JSON(http.StatusCreated, item)\n}',
      update: 'func Update{Entity}(c echo.Context) error {\n\tid := c.Param("id")\n\tvar item {Entity}\n\tif err := db.First(&item, id).Error; err != nil {\n\t\treturn c.JSON(http.StatusNotFound, map[string]string{"error": "not found"})\n\t}\n\tc.Bind(&item)\n\tdb.Save(&item)\n\treturn c.JSON(http.StatusOK, item)\n}',
      delete: 'func Delete{Entity}(c echo.Context) error {\n\tid := c.Param("id")\n\tdb.Delete(&{Entity}{}, id)\n\treturn c.NoContent(http.StatusNoContent)\n}',
      middleware: 'e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {\n\treturn func(c echo.Context) error {\n\t\treturn next(c)\n\t}\n})',
      example: 'e.GET("/health", func(c echo.Context) error {\n\treturn c.JSON(200, map[string]string{"status": "ok"})\n})',
    },
    modelPattern: {
      defineModel: 'type {Name} struct {\n\tgorm.Model',
      field: '\t{Name} {type} `json:"{json_name}"`',
      primaryKey: '\tID uint `json:"id" gorm:"primaryKey"`',
      foreignKey: '\t{Name}ID uint `json:"{json_name}_id"`',
      relationship: '\t{Name} {Target} `json:"{json_name}"`',
      example: 'type User struct {\n\tgorm.Model\n\tName  string `json:"name"`\n\tEmail string `json:"email" gorm:"unique"`\n}',
    },
    projectStructure: {
      entryPoint: 'main.go', modelDir: 'models/', routeDir: 'handlers/',
      configFiles: ['go.mod', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'go.mod', content: 'module app\n\ngo 1.22\n\nrequire (\n\tgithub.com/labstack/echo/v4 v4.12.0\n\tgorm.io/gorm v1.25.10\n\tgorm.io/driver/postgres v1.5.9\n)' },
    ],
    startCommand: 'go run main.go',
    dependencies: ['github.com/labstack/echo/v4', 'gorm.io/gorm', 'gorm.io/driver/postgres'],
    devDependencies: ['github.com/stretchr/testify'],
    middlewarePattern: 'e.Use(middleware.Logger())\ne.Use(middleware.Recover())',
    authPattern: 'e.Use(middleware.JWT([]byte("secret")))',
    validationPattern: 'type Create{Name}Request struct {\n\t{fields}\n}',
    errorHandlerPattern: 'e.HTTPErrorHandler = func(err error, c echo.Context) {\n\tc.JSON(500, map[string]string{"error": err.Error()})\n}',
    corsPattern: 'e.Use(middleware.CORS())',
    staticFilePattern: 'e.Static("/static", "static")',
    envPattern: 'godotenv.Load()',
    dockerfileTemplate: 'FROM golang:1.22-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN go build -o /server\nFROM alpine:3.19\nCOPY --from=build /server /server\nCMD ["/server"]',
  },

  'actix-web': {
    id: 'actix-web', name: 'Actix Web', language: 'rust', category: 'backend', version: '4',
    description: 'Powerful, pragmatic, and extremely fast Rust web framework',
    routePattern: {
      defineRoute: '#[{method}("{path}")]',
      getAll: '#[get("/{entity}")]\nasync fn get_{entity}(pool: web::Data<PgPool>) -> impl Responder {\n    let items = sqlx::query_as::<_, {Entity}>("SELECT * FROM {table}")\n        .fetch_all(pool.get_ref()).await.unwrap();\n    HttpResponse::Ok().json(items)\n}',
      getById: '#[get("/{entity}/{{id}}")]\nasync fn get_{entity}(pool: web::Data<PgPool>, id: web::Path<i32>) -> impl Responder {\n    let item = sqlx::query_as::<_, {Entity}>("SELECT * FROM {table} WHERE id = $1")\n        .bind(id.into_inner()).fetch_optional(pool.get_ref()).await.unwrap();\n    match item {\n        Some(i) => HttpResponse::Ok().json(i),\n        None => HttpResponse::NotFound().json(serde_json::json!({"error": "not found"}))\n    }\n}',
      create: '#[post("/{entity}")]\nasync fn create_{entity}(pool: web::Data<PgPool>, body: web::Json<Create{Entity}>) -> impl Responder {\n    let item = sqlx::query_as::<_, {Entity}>("INSERT INTO {table} ({fields}) VALUES ({placeholders}) RETURNING *")\n        .fetch_one(pool.get_ref()).await.unwrap();\n    HttpResponse::Created().json(item)\n}',
      update: '#[put("/{entity}/{{id}}")]\nasync fn update_{entity}(pool: web::Data<PgPool>, id: web::Path<i32>, body: web::Json<Update{Entity}>) -> impl Responder {\n    let item = sqlx::query_as::<_, {Entity}>("UPDATE {table} SET {sets} WHERE id = $1 RETURNING *")\n        .bind(id.into_inner()).fetch_one(pool.get_ref()).await.unwrap();\n    HttpResponse::Ok().json(item)\n}',
      delete: '#[delete("/{entity}/{{id}}")]\nasync fn delete_{entity}(pool: web::Data<PgPool>, id: web::Path<i32>) -> impl Responder {\n    sqlx::query("DELETE FROM {table} WHERE id = $1")\n        .bind(id.into_inner()).execute(pool.get_ref()).await.unwrap();\n    HttpResponse::NoContent().finish()\n}',
      middleware: 'pub struct {Name};',
      example: '#[get("/health")]\nasync fn health() -> impl Responder {\n    HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))\n}',
    },
    modelPattern: {
      defineModel: '#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\npub struct {Name} {',
      field: '    pub {name}: {type},',
      primaryKey: '    pub id: i32,',
      foreignKey: '    pub {name}_id: i32,',
      relationship: '    // relationship to {Target}',
      example: '#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\npub struct User {\n    pub id: i32,\n    pub name: String,\n    pub email: String,\n}',
    },
    projectStructure: {
      entryPoint: 'src/main.rs', modelDir: 'src/models/', routeDir: 'src/handlers/',
      configFiles: ['Cargo.toml', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'Cargo.toml', content: '[package]\nname = "app"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nactix-web = "4"\nactix-cors = "0.7"\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\nsqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }\ntokio = { version = "1", features = ["full"] }\ndotenv = "0.15"' },
    ],
    startCommand: 'cargo run',
    dependencies: ['actix-web', 'actix-cors', 'serde', 'serde_json', 'sqlx', 'tokio', 'dotenv'],
    devDependencies: ['actix-rt'],
    middlewarePattern: 'use actix_web::middleware::Logger;\nApp::new().wrap(Logger::default())',
    authPattern: 'pub async fn auth(req: ServiceRequest) -> Result<ServiceResponse> {\n    let token = req.headers().get("Authorization");\n    srv.call(req).await\n}',
    validationPattern: '#[derive(Debug, Deserialize)]\npub struct Create{Name} {\n    {fields}\n}',
    errorHandlerPattern: 'impl ResponseError for AppError {\n    fn error_response(&self) -> HttpResponse {\n        HttpResponse::build(self.status_code()).json(serde_json::json!({"error": self.to_string()}))\n    }\n}',
    corsPattern: 'use actix_cors::Cors;\nApp::new().wrap(Cors::permissive())',
    staticFilePattern: 'use actix_files::Files;\nApp::new().service(Files::new("/static", "static"))',
    envPattern: 'dotenv::dotenv().ok();\nlet database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");',
    dockerfileTemplate: 'FROM rust:1.77-slim AS build\nWORKDIR /app\nCOPY . .\nRUN cargo build --release\nFROM debian:bookworm-slim\nCOPY --from=build /app/target/release/app /app\nCMD ["/app"]',
  },

  axum: {
    id: 'axum', name: 'Axum', language: 'rust', category: 'backend', version: '0.7',
    description: 'Ergonomic and modular Rust web framework built with Tokio',
    routePattern: {
      defineRoute: '.route("{path}", {method}({handler}))',
      getAll: 'async fn get_{entity}(State(pool): State<PgPool>) -> Json<Vec<{Entity}>> {\n    let items = sqlx::query_as::<_, {Entity}>("SELECT * FROM {table}")\n        .fetch_all(&pool).await.unwrap();\n    Json(items)\n}',
      getById: 'async fn get_{entity}_by_id(State(pool): State<PgPool>, Path(id): Path<i32>) -> Result<Json<{Entity}>, StatusCode> {\n    sqlx::query_as::<_, {Entity}>("SELECT * FROM {table} WHERE id = $1")\n        .bind(id).fetch_optional(&pool).await.unwrap()\n        .map(Json).ok_or(StatusCode::NOT_FOUND)\n}',
      create: 'async fn create_{entity}(State(pool): State<PgPool>, Json(body): Json<Create{Entity}>) -> (StatusCode, Json<{Entity}>) {\n    let item = sqlx::query_as::<_, {Entity}>("INSERT INTO {table} ({fields}) VALUES ({placeholders}) RETURNING *")\n        .fetch_one(&pool).await.unwrap();\n    (StatusCode::CREATED, Json(item))\n}',
      update: 'async fn update_{entity}(State(pool): State<PgPool>, Path(id): Path<i32>, Json(body): Json<Update{Entity}>) -> Json<{Entity}> {\n    let item = sqlx::query_as::<_, {Entity}>("UPDATE {table} SET {sets} WHERE id = $1 RETURNING *")\n        .bind(id).fetch_one(&pool).await.unwrap();\n    Json(item)\n}',
      delete: 'async fn delete_{entity}(State(pool): State<PgPool>, Path(id): Path<i32>) -> StatusCode {\n    sqlx::query("DELETE FROM {table} WHERE id = $1")\n        .bind(id).execute(&pool).await.unwrap();\n    StatusCode::NO_CONTENT\n}',
      middleware: 'async fn {name}(req: Request, next: Next) -> Response {\n    next.run(req).await\n}',
      example: 'async fn health() -> Json<serde_json::Value> {\n    Json(serde_json::json!({"status": "ok"}))\n}',
    },
    modelPattern: {
      defineModel: '#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\npub struct {Name} {',
      field: '    pub {name}: {type},',
      primaryKey: '    pub id: i32,',
      foreignKey: '    pub {name}_id: i32,',
      relationship: '    // relationship to {Target}',
      example: '#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\npub struct User {\n    pub id: i32,\n    pub name: String,\n    pub email: String,\n}',
    },
    projectStructure: {
      entryPoint: 'src/main.rs', modelDir: 'src/models/', routeDir: 'src/handlers/',
      configFiles: ['Cargo.toml', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'Cargo.toml', content: '[package]\nname = "app"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\naxum = "0.7"\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\nsqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }\ntokio = { version = "1", features = ["full"] }\ntower-http = { version = "0.5", features = ["cors"] }\ndotenv = "0.15"' },
    ],
    startCommand: 'cargo run',
    dependencies: ['axum', 'serde', 'serde_json', 'sqlx', 'tokio', 'tower-http', 'dotenv'],
    devDependencies: [],
    middlewarePattern: 'use tower_http::trace::TraceLayer;\napp.layer(TraceLayer::new_for_http())',
    authPattern: 'async fn auth(headers: HeaderMap, next: Next) -> Result<Response, StatusCode> {\n    headers.get("Authorization").ok_or(StatusCode::UNAUTHORIZED)?;\n    Ok(next.run(req).await)\n}',
    validationPattern: '#[derive(Debug, Deserialize)]\npub struct Create{Name} {\n    {fields}\n}',
    errorHandlerPattern: 'impl IntoResponse for AppError {\n    fn into_response(self) -> Response {\n        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": self.0}))).into_response()\n    }\n}',
    corsPattern: 'use tower_http::cors::CorsLayer;\napp.layer(CorsLayer::permissive())',
    staticFilePattern: 'use tower_http::services::ServeDir;\napp.nest_service("/static", ServeDir::new("static"))',
    envPattern: 'dotenv::dotenv().ok();\nlet db_url = std::env::var("DATABASE_URL")?;',
    dockerfileTemplate: 'FROM rust:1.77 AS build\nWORKDIR /app\nCOPY . .\nRUN cargo build --release\nFROM debian:bookworm-slim\nCOPY --from=build /app/target/release/app /app\nCMD ["/app"]',
  },

  'spring-boot': {
    id: 'spring-boot', name: 'Spring Boot', language: 'java', category: 'backend', version: '3.3',
    description: 'Production-grade Java framework with convention over configuration',
    routePattern: {
      defineRoute: '@{Method}Mapping("{path}")',
      getAll: '@GetMapping("/{entity}")\npublic List<{Entity}> getAll() {\n    return repository.findAll();\n}',
      getById: '@GetMapping("/{entity}/{id}")\npublic ResponseEntity<{Entity}> getById(@PathVariable Long id) {\n    return repository.findById(id)\n        .map(ResponseEntity::ok)\n        .orElse(ResponseEntity.notFound().build());\n}',
      create: '@PostMapping("/{entity}")\n@ResponseStatus(HttpStatus.CREATED)\npublic {Entity} create(@RequestBody @Valid {Entity}Dto dto) {\n    {Entity} entity = new {Entity}();\n    BeanUtils.copyProperties(dto, entity);\n    return repository.save(entity);\n}',
      update: '@PutMapping("/{entity}/{id}")\npublic ResponseEntity<{Entity}> update(@PathVariable Long id, @RequestBody @Valid {Entity}Dto dto) {\n    return repository.findById(id)\n        .map(entity -> { BeanUtils.copyProperties(dto, entity); return ResponseEntity.ok(repository.save(entity)); })\n        .orElse(ResponseEntity.notFound().build());\n}',
      delete: '@DeleteMapping("/{entity}/{id}")\n@ResponseStatus(HttpStatus.NO_CONTENT)\npublic void delete(@PathVariable Long id) {\n    repository.deleteById(id);\n}',
      middleware: '@Component\npublic class {Name}Filter implements Filter {\n    @Override\n    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {\n        chain.doFilter(req, res);\n    }\n}',
      example: '@GetMapping("/health")\npublic Map<String, String> health() {\n    return Map.of("status", "ok");\n}',
    },
    modelPattern: {
      defineModel: '@Entity\n@Table(name = "{table}")\npublic class {Name} {',
      field: '    @Column({constraints})\n    private {type} {name};',
      primaryKey: '    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;',
      foreignKey: '    @ManyToOne\n    @JoinColumn(name = "{name}_id")\n    private {Target} {name};',
      relationship: '    @OneToMany(mappedBy = "{backref}")\n    private List<{Target}> {name};',
      example: '@Entity\n@Table(name = "users")\npublic class User {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    @Column(nullable = false)\n    private String name;\n    @Column(unique = true)\n    private String email;\n}',
    },
    projectStructure: {
      entryPoint: 'src/main/java/com/app/Application.java', modelDir: 'src/main/java/com/app/model/', routeDir: 'src/main/java/com/app/controller/',
      configFiles: ['pom.xml', 'src/main/resources/application.properties'], testDir: 'src/test/java/', staticDir: 'src/main/resources/static/', templateDir: 'src/main/resources/templates/',
    },
    configTemplate: [
      { path: 'src/main/resources/application.properties', content: 'server.port=5000\nspring.datasource.url=${DATABASE_URL}\nspring.jpa.hibernate.ddl-auto=update\nspring.jpa.show-sql=false' },
    ],
    startCommand: 'mvn spring-boot:run',
    dependencies: ['spring-boot-starter-web', 'spring-boot-starter-data-jpa', 'postgresql', 'spring-boot-starter-validation'],
    devDependencies: ['spring-boot-starter-test'],
    middlewarePattern: '@Component\npublic class {Name}Interceptor implements HandlerInterceptor {\n    @Override\n    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {\n        return true;\n    }\n}',
    authPattern: '@Configuration\npublic class SecurityConfig {\n    @Bean\n    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n        return http.csrf().disable().build();\n    }\n}',
    validationPattern: 'public class {Name}Dto {\n    @NotNull\n    {fields}\n}',
    errorHandlerPattern: '@RestControllerAdvice\npublic class GlobalExceptionHandler {\n    @ExceptionHandler(Exception.class)\n    public ResponseEntity<Map<String, String>> handleException(Exception e) {\n        return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));\n    }\n}',
    corsPattern: '@Configuration\npublic class CorsConfig implements WebMvcConfigurer {\n    @Override\n    public void addCorsMappings(CorsRegistry registry) {\n        registry.addMapping("/**").allowedOrigins("*");\n    }\n}',
    staticFilePattern: 'spring.web.resources.static-locations=classpath:/static/',
    envPattern: 'spring.datasource.url=${DATABASE_URL}',
    dockerfileTemplate: 'FROM eclipse-temurin:21-jdk-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN ./mvnw package -DskipTests\nFROM eclipse-temurin:21-jre-alpine\nCOPY --from=build /app/target/*.jar app.jar\nCMD ["java", "-jar", "app.jar"]',
  },

  'aspnet-core': {
    id: 'aspnet-core', name: 'ASP.NET Core', language: 'csharp', category: 'backend', version: '8.0',
    description: 'Cross-platform, high-performance .NET web framework',
    routePattern: {
      defineRoute: 'app.Map{Method}("{path}", {handler})',
      getAll: 'app.MapGet("/{entity}", async (AppDbContext db) =>\n    await db.{Entity}.ToListAsync());',
      getById: 'app.MapGet("/{entity}/{{id}}", async (int id, AppDbContext db) =>\n    await db.{Entity}.FindAsync(id) is {Entity} item\n        ? Results.Ok(item)\n        : Results.NotFound());',
      create: 'app.MapPost("/{entity}", async ({Entity} item, AppDbContext db) => {\n    db.{Entity}.Add(item);\n    await db.SaveChangesAsync();\n    return Results.Created($"/{entity}/{{item.Id}}", item);\n});',
      update: 'app.MapPut("/{entity}/{{id}}", async (int id, {Entity} input, AppDbContext db) => {\n    var item = await db.{Entity}.FindAsync(id);\n    if (item is null) return Results.NotFound();\n    await db.SaveChangesAsync();\n    return Results.Ok(item);\n});',
      delete: 'app.MapDelete("/{entity}/{{id}}", async (int id, AppDbContext db) => {\n    if (await db.{Entity}.FindAsync(id) is {Entity} item) {\n        db.{Entity}.Remove(item);\n        await db.SaveChangesAsync();\n        return Results.NoContent();\n    }\n    return Results.NotFound();\n});',
      middleware: 'app.Use(async (context, next) => {\n    await next(context);\n});',
      example: 'app.MapGet("/health", () => new { status = "ok" });',
    },
    modelPattern: {
      defineModel: 'public class {Name}\n{',
      field: '    public {type} {Name} { get; set; }',
      primaryKey: '    public int Id { get; set; }',
      foreignKey: '    public int {Name}Id { get; set; }',
      relationship: '    public {Target} {Name} { get; set; }\n    public ICollection<{Target}> {Name} { get; set; }',
      example: 'public class User\n{\n    public int Id { get; set; }\n    public string Name { get; set; } = "";\n    public string Email { get; set; } = "";\n}',
    },
    projectStructure: {
      entryPoint: 'Program.cs', modelDir: 'Models/', routeDir: 'Endpoints/',
      configFiles: ['app.csproj', 'appsettings.json'], testDir: 'Tests/', staticDir: 'wwwroot/', templateDir: 'Views/',
    },
    configTemplate: [
      { path: 'appsettings.json', content: '{\n  "ConnectionStrings": {\n    "DefaultConnection": ""\n  },\n  "Logging": {\n    "LogLevel": { "Default": "Information" }\n  }\n}' },
    ],
    startCommand: 'dotnet run --urls http://0.0.0.0:5000',
    dependencies: ['Microsoft.EntityFrameworkCore', 'Npgsql.EntityFrameworkCore.PostgreSQL'],
    devDependencies: ['xunit'],
    middlewarePattern: 'app.Use(async (context, next) => {\n    await next.Invoke();\n});',
    authPattern: 'builder.Services.AddAuthentication().AddJwtBearer();\napp.UseAuthentication();\napp.UseAuthorization();',
    validationPattern: 'public class {Name}Dto\n{\n    [Required]\n    {fields}\n}',
    errorHandlerPattern: 'app.UseExceptionHandler("/error");',
    corsPattern: 'builder.Services.AddCors(o => o.AddDefaultPolicy(b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));\napp.UseCors();',
    staticFilePattern: 'app.UseStaticFiles();',
    envPattern: 'var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");',
    dockerfileTemplate: 'FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nWORKDIR /app\nCOPY . .\nRUN dotnet publish -c Release -o /out\nFROM mcr.microsoft.com/dotnet/aspnet:8.0\nCOPY --from=build /out .\nCMD ["dotnet", "app.dll"]',
  },

  rails: {
    id: 'rails', name: 'Ruby on Rails', language: 'ruby', category: 'fullstack', version: '7.1',
    description: 'Full-stack Ruby framework emphasizing convention over configuration',
    routePattern: {
      defineRoute: '{method} "{path}", to: "{controller}#{action}"',
      getAll: 'def index\n  @{entity} = {Entity}.all\n  render json: @{entity}\nend',
      getById: 'def show\n  @{entity} = {Entity}.find(params[:id])\n  render json: @{entity}\nrescue ActiveRecord::RecordNotFound\n  render json: { error: "Not found" }, status: :not_found\nend',
      create: 'def create\n  @{entity} = {Entity}.new({entity}_params)\n  if @{entity}.save\n    render json: @{entity}, status: :created\n  else\n    render json: @{entity}.errors, status: :unprocessable_entity\n  end\nend',
      update: 'def update\n  @{entity} = {Entity}.find(params[:id])\n  if @{entity}.update({entity}_params)\n    render json: @{entity}\n  else\n    render json: @{entity}.errors, status: :unprocessable_entity\n  end\nend',
      delete: 'def destroy\n  @{entity} = {Entity}.find(params[:id])\n  @{entity}.destroy\n  head :no_content\nend',
      middleware: 'class {Name}Middleware\n  def initialize(app)\n    @app = app\n  end\n  def call(env)\n    @app.call(env)\n  end\nend',
      example: 'get "/health", to: proc { [200, {}, [{ status: "ok" }.to_json]] }',
    },
    modelPattern: {
      defineModel: 'class {Name} < ApplicationRecord\n  self.table_name = "{table}"',
      field: '  # {name}: {type}',
      primaryKey: '  # id: integer (auto)',
      foreignKey: '  belongs_to :{name}',
      relationship: '  has_many :{name}\n  belongs_to :{name}',
      example: 'class User < ApplicationRecord\n  validates :name, presence: true\n  validates :email, uniqueness: true\n  has_many :posts\nend',
    },
    projectStructure: {
      entryPoint: 'config.ru', modelDir: 'app/models/', routeDir: 'app/controllers/',
      configFiles: ['Gemfile', 'config/database.yml', 'config/routes.rb'], testDir: 'spec/', staticDir: 'public/', templateDir: 'app/views/',
    },
    configTemplate: [
      { path: 'Gemfile', content: 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\ngem "pg", "~> 1.5"\ngem "puma", "~> 6.4"\ngem "rack-cors"' },
    ],
    startCommand: 'rails server -b 0.0.0.0 -p 5000',
    dependencies: ['rails', 'pg', 'puma', 'rack-cors'],
    devDependencies: ['rspec-rails'],
    middlewarePattern: 'config.middleware.use {Name}Middleware',
    authPattern: 'before_action :authenticate_user!',
    validationPattern: 'validates :{field}, presence: true',
    errorHandlerPattern: 'rescue_from ActiveRecord::RecordNotFound do |e|\n  render json: { error: e.message }, status: :not_found\nend',
    corsPattern: 'config.middleware.insert_before 0, Rack::Cors do\n  allow do\n    origins "*"\n    resource "*", headers: :any, methods: [:get, :post, :put, :delete]\n  end\nend',
    staticFilePattern: 'config.public_file_server.enabled = true',
    envPattern: 'DATABASE_URL = ENV["DATABASE_URL"]',
    dockerfileTemplate: 'FROM ruby:3.3-slim\nWORKDIR /app\nCOPY Gemfile* ./\nRUN bundle install\nCOPY . .\nCMD ["rails", "server", "-b", "0.0.0.0", "-p", "5000"]',
  },

  sinatra: {
    id: 'sinatra', name: 'Sinatra', language: 'ruby', category: 'backend', version: '4.0',
    description: 'Lightweight Ruby web framework for simple applications',
    routePattern: {
      defineRoute: '{method} "{path}" do\nend',
      getAll: 'get "/{entity}" do\n  content_type :json\n  {Entity}.all.map(&:to_hash).to_json\nend',
      getById: 'get "/{entity}/:id" do\n  content_type :json\n  item = {Entity}[params[:id]]\n  halt 404, { error: "Not found" }.to_json unless item\n  item.to_hash.to_json\nend',
      create: 'post "/{entity}" do\n  content_type :json\n  data = JSON.parse(request.body.read)\n  item = {Entity}.create(data)\n  status 201\n  item.to_hash.to_json\nend',
      update: 'put "/{entity}/:id" do\n  content_type :json\n  item = {Entity}[params[:id]]\n  halt 404 unless item\n  data = JSON.parse(request.body.read)\n  item.update(data)\n  item.to_hash.to_json\nend',
      delete: 'delete "/{entity}/:id" do\n  item = {Entity}[params[:id]]\n  halt 404 unless item\n  item.destroy\n  status 204\nend',
      middleware: 'use {Name}Middleware',
      example: 'get "/health" do\n  content_type :json\n  { status: "ok" }.to_json\nend',
    },
    modelPattern: {
      defineModel: 'class {Name} < Sequel::Model(:{table})',
      field: '  # {name}: {type}',
      primaryKey: '  # id: primary_key',
      foreignKey: '  many_to_one :{name}',
      relationship: '  one_to_many :{name}',
      example: 'class User < Sequel::Model(:users)\nend',
    },
    projectStructure: {
      entryPoint: 'app.rb', modelDir: 'models/', routeDir: 'routes/',
      configFiles: ['Gemfile', '.env', 'config.ru'], testDir: 'spec/', staticDir: 'public/', templateDir: 'views/',
    },
    configTemplate: [
      { path: 'Gemfile', content: 'source "https://rubygems.org"\ngem "sinatra"\ngem "sinatra-contrib"\ngem "sequel"\ngem "pg"\ngem "puma"\ngem "dotenv"' },
    ],
    startCommand: 'ruby app.rb -p 5000 -o 0.0.0.0',
    dependencies: ['sinatra', 'sequel', 'pg', 'puma', 'dotenv'],
    devDependencies: ['rspec', 'rack-test'],
    middlewarePattern: 'use Rack::Logger',
    authPattern: 'before do\n  halt 401 unless authorized?\nend',
    validationPattern: 'def validate(data)\n  errors = []\n  errors\nend',
    errorHandlerPattern: 'error 404 do\n  content_type :json\n  { error: "Not found" }.to_json\nend',
    corsPattern: 'require "sinatra/cross_origin"\nenable :cross_origin',
    staticFilePattern: 'set :public_folder, "public"',
    envPattern: 'require "dotenv/load"\nDB = Sequel.connect(ENV["DATABASE_URL"])',
    dockerfileTemplate: 'FROM ruby:3.3-slim\nWORKDIR /app\nCOPY Gemfile* ./\nRUN bundle install\nCOPY . .\nCMD ["ruby", "app.rb", "-p", "5000", "-o", "0.0.0.0"]',
  },

  laravel: {
    id: 'laravel', name: 'Laravel', language: 'php', category: 'fullstack', version: '11',
    description: 'Full-featured PHP framework with elegant syntax',
    routePattern: {
      defineRoute: "Route::{method}('{path}', [{Controller}::class, '{action}']);",
      getAll: "public function index()\n{\n    return {Entity}::all();\n}",
      getById: "public function show(int $id)\n{\n    return {Entity}::findOrFail($id);\n}",
      create: "public function store(Request $request)\n{\n    $validated = $request->validate([{rules}]);\n    $item = {Entity}::create($validated);\n    return response()->json($item, 201);\n}",
      update: "public function update(Request $request, int $id)\n{\n    $item = {Entity}::findOrFail($id);\n    $item->update($request->validate([{rules}]));\n    return response()->json($item);\n}",
      delete: "public function destroy(int $id)\n{\n    {Entity}::findOrFail($id)->delete();\n    return response()->noContent();\n}",
      middleware: "public function handle(Request $request, Closure $next)\n{\n    return $next($request);\n}",
      example: "Route::get('/health', fn() => response()->json(['status' => 'ok']));",
    },
    modelPattern: {
      defineModel: "class {Name} extends Model\n{\n    protected $table = '{table}';",
      field: "    '{name}',",
      primaryKey: "    protected $primaryKey = 'id';",
      foreignKey: "    public function {name}()\n    {\n        return $this->belongsTo({Target}::class);\n    }",
      relationship: "    public function {name}()\n    {\n        return $this->hasMany({Target}::class);\n    }",
      example: "class User extends Model\n{\n    protected $fillable = ['name', 'email'];\n}",
    },
    projectStructure: {
      entryPoint: 'public/index.php', modelDir: 'app/Models/', routeDir: 'routes/',
      configFiles: ['composer.json', '.env', 'config/app.php'], testDir: 'tests/', staticDir: 'public/', templateDir: 'resources/views/',
    },
    configTemplate: [
      { path: '.env', content: 'APP_NAME=App\nAPP_ENV=local\nDB_CONNECTION=pgsql\nDB_URL=${DATABASE_URL}' },
    ],
    startCommand: 'php artisan serve --host=0.0.0.0 --port=5000',
    dependencies: ['laravel/framework', 'laravel/sanctum'],
    devDependencies: ['phpunit/phpunit'],
    middlewarePattern: "class {Name}\n{\n    public function handle(Request $request, Closure $next)\n    {\n        return $next($request);\n    }\n}",
    authPattern: "Route::middleware('auth:sanctum')->group(function () {\n});",
    validationPattern: "public function rules(): array\n{\n    return [\n        'name' => 'required|string|max:255',\n    ];\n}",
    errorHandlerPattern: "public function render($request, Throwable $e)\n{\n    return response()->json(['error' => $e->getMessage()], 500);\n}",
    corsPattern: "'allowed_origins' => ['*'],",
    staticFilePattern: "// public/ directory is automatically served",
    envPattern: "DB_CONNECTION=pgsql\nDB_URL=\\${DATABASE_URL}",
    dockerfileTemplate: 'FROM php:8.3-apache\nWORKDIR /var/www/html\nCOPY . .\nRUN composer install --no-dev\nCMD ["apache2-foreground"]',
  },

  express: {
    id: 'express', name: 'Express', language: 'typescript', category: 'backend', version: '4.19',
    description: 'Fast, unopinionated, minimalist web framework for Node.js',
    routePattern: {
      defineRoute: "app.{method}('{path}', {handler});",
      getAll: "app.get('/{entity}', async (req, res) => {\n  const items = await db.select().from({entity}Table);\n  res.json(items);\n});",
      getById: "app.get('/{entity}/:id', async (req, res) => {\n  const [item] = await db.select().from({entity}Table).where(eq({entity}Table.id, parseInt(req.params.id)));\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});",
      create: "app.post('/{entity}', async (req, res) => {\n  const [item] = await db.insert({entity}Table).values(req.body).returning();\n  res.status(201).json(item);\n});",
      update: "app.put('/{entity}/:id', async (req, res) => {\n  const [item] = await db.update({entity}Table).set(req.body).where(eq({entity}Table.id, parseInt(req.params.id))).returning();\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});",
      delete: "app.delete('/{entity}/:id', async (req, res) => {\n  await db.delete({entity}Table).where(eq({entity}Table.id, parseInt(req.params.id)));\n  res.status(204).end();\n});",
      middleware: "app.use((req, res, next) => {\n  next();\n});",
      example: "app.get('/health', (req, res) => res.json({ status: 'ok' }));",
    },
    modelPattern: {
      defineModel: "export const {name}Table = pgTable('{table}', {",
      field: "  {name}: {type}('{name}'){constraints},",
      primaryKey: "  id: serial('id').primaryKey(),",
      foreignKey: "  {name}Id: integer('{name}_id').references(() => {target}Table.id),",
      relationship: "  // relation: {name} -> {target}",
      example: "export const usersTable = pgTable('users', {\n  id: serial('id').primaryKey(),\n  name: text('name').notNull(),\n  email: text('email').unique(),\n});",
    },
    projectStructure: {
      entryPoint: 'src/index.ts', modelDir: 'src/models/', routeDir: 'src/routes/',
      configFiles: ['package.json', 'tsconfig.json', '.env'], testDir: 'tests/', staticDir: 'public/', templateDir: 'src/views/',
    },
    configTemplate: [
      { path: 'tsconfig.json', content: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "strict": true,\n    "esModuleInterop": true,\n    "outDir": "dist"\n  },\n  "include": ["src/**/*"]\n}' },
    ],
    startCommand: 'npx tsx src/index.ts',
    dependencies: ['express', '@types/express', 'drizzle-orm', 'pg', 'dotenv', 'zod'],
    devDependencies: ['tsx', 'typescript', 'vitest'],
    middlewarePattern: "app.use((req, res, next) => {\n  next();\n});",
    authPattern: "import passport from 'passport';\napp.use(passport.initialize());",
    validationPattern: "const {Name}Schema = z.object({\n  {fields}\n});",
    errorHandlerPattern: "app.use((err, req, res, next) => {\n  res.status(500).json({ error: err.message });\n});",
    corsPattern: "import cors from 'cors';\napp.use(cors());",
    staticFilePattern: "app.use(express.static('public'));",
    envPattern: "import dotenv from 'dotenv';\ndotenv.config();",
    dockerfileTemplate: 'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["npx", "tsx", "src/index.ts"]',
  },

  fiber: {
    id: 'fiber', name: 'Fiber', language: 'go', category: 'backend', version: '2.52',
    description: 'Express-inspired Go web framework built on Fasthttp',
    routePattern: {
      defineRoute: 'app.{Method}("{path}", {handler})',
      getAll: 'app.Get("/{entity}", func(c *fiber.Ctx) error {\n\tvar items []{Entity}\n\tdb.Find(&items)\n\treturn c.JSON(items)\n})',
      getById: 'app.Get("/{entity}/:id", func(c *fiber.Ctx) error {\n\tid := c.Params("id")\n\tvar item {Entity}\n\tif err := db.First(&item, id).Error; err != nil {\n\t\treturn c.Status(404).JSON(fiber.Map{"error": "not found"})\n\t}\n\treturn c.JSON(item)\n})',
      create: 'app.Post("/{entity}", func(c *fiber.Ctx) error {\n\tvar item {Entity}\n\tif err := c.BodyParser(&item); err != nil {\n\t\treturn c.Status(400).JSON(fiber.Map{"error": err.Error()})\n\t}\n\tdb.Create(&item)\n\treturn c.Status(201).JSON(item)\n})',
      update: 'app.Put("/{entity}/:id", func(c *fiber.Ctx) error {\n\tid := c.Params("id")\n\tvar item {Entity}\n\tdb.First(&item, id)\n\tc.BodyParser(&item)\n\tdb.Save(&item)\n\treturn c.JSON(item)\n})',
      delete: 'app.Delete("/{entity}/:id", func(c *fiber.Ctx) error {\n\tdb.Delete(&{Entity}{}, c.Params("id"))\n\treturn c.SendStatus(204)\n})',
      middleware: 'app.Use(func(c *fiber.Ctx) error {\n\treturn c.Next()\n})',
      example: 'app.Get("/health", func(c *fiber.Ctx) error {\n\treturn c.JSON(fiber.Map{"status": "ok"})\n})',
    },
    modelPattern: {
      defineModel: 'type {Name} struct {\n\tgorm.Model',
      field: '\t{Name} {type} `json:"{json_name}"`',
      primaryKey: '\tID uint `json:"id" gorm:"primaryKey"`',
      foreignKey: '\t{Name}ID uint `json:"{json_name}_id"`',
      relationship: '\t{Name} {Target} `json:"{json_name}"`',
      example: 'type User struct {\n\tgorm.Model\n\tName  string `json:"name"`\n\tEmail string `json:"email" gorm:"unique"`\n}',
    },
    projectStructure: {
      entryPoint: 'main.go', modelDir: 'models/', routeDir: 'handlers/',
      configFiles: ['go.mod', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'go.mod', content: 'module app\n\ngo 1.22\n\nrequire (\n\tgithub.com/gofiber/fiber/v2 v2.52.0\n\tgorm.io/gorm v1.25.10\n\tgorm.io/driver/postgres v1.5.9\n)' },
    ],
    startCommand: 'go run main.go',
    dependencies: ['github.com/gofiber/fiber/v2', 'gorm.io/gorm', 'gorm.io/driver/postgres'],
    devDependencies: [],
    middlewarePattern: 'app.Use(logger.New())\napp.Use(recover.New())',
    authPattern: 'app.Use(jwtware.New(jwtware.Config{SigningKey: jwtware.SigningKey{Key: []byte("secret")}}))',
    validationPattern: 'type Create{Name}Input struct {\n\t{fields}\n}',
    errorHandlerPattern: 'app.Use(func(c *fiber.Ctx) error {\n\terr := c.Next()\n\tif err != nil {\n\t\treturn c.Status(500).JSON(fiber.Map{"error": err.Error()})\n\t}\n\treturn nil\n})',
    corsPattern: 'app.Use(cors.New())',
    staticFilePattern: 'app.Static("/", "./static")',
    envPattern: 'godotenv.Load()\ndbURL := os.Getenv("DATABASE_URL")',
    dockerfileTemplate: 'FROM golang:1.22-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN go build -o /server\nFROM alpine:3.19\nCOPY --from=build /server /server\nCMD ["/server"]',
  },

  phoenix: {
    id: 'phoenix', name: 'Phoenix', language: 'elixir', category: 'fullstack', version: '1.7',
    description: 'Productive Elixir web framework with real-time capabilities',
    routePattern: {
      defineRoute: '{method} "{path}", {Controller}, :{action}',
      getAll: 'def index(conn, _params) do\n  items = Repo.all({Entity})\n  json(conn, items)\nend',
      getById: 'def show(conn, %{"id" => id}) do\n  case Repo.get({Entity}, id) do\n    nil -> conn |> put_status(:not_found) |> json(%{error: "not found"})\n    item -> json(conn, item)\n  end\nend',
      create: 'def create(conn, %{"{entity}" => params}) do\n  changeset = {Entity}.changeset(%{Entity}{}, params)\n  case Repo.insert(changeset) do\n    {:ok, item} -> conn |> put_status(:created) |> json(item)\n    {:error, cs} -> conn |> put_status(:unprocessable_entity) |> json(%{errors: cs.errors})\n  end\nend',
      update: 'def update(conn, %{"id" => id, "{entity}" => params}) do\n  item = Repo.get!({Entity}, id)\n  changeset = {Entity}.changeset(item, params)\n  case Repo.update(changeset) do\n    {:ok, item} -> json(conn, item)\n    {:error, cs} -> conn |> put_status(:unprocessable_entity) |> json(%{errors: cs.errors})\n  end\nend',
      delete: 'def delete(conn, %{"id" => id}) do\n  item = Repo.get!({Entity}, id)\n  Repo.delete!(item)\n  send_resp(conn, :no_content, "")\nend',
      middleware: 'plug :check_{name}',
      example: 'get "/health", PageController, :health',
    },
    modelPattern: {
      defineModel: 'defmodule App.{Name} do\n  use Ecto.Schema\n  import Ecto.Changeset\n\n  schema "{table}" do',
      field: '    field :{name}, :{type}',
      primaryKey: '    # id is auto-generated',
      foreignKey: '    belongs_to :{name}, App.{Target}',
      relationship: '    has_many :{name}, App.{Target}',
      example: 'defmodule App.User do\n  use Ecto.Schema\n  schema "users" do\n    field :name, :string\n    field :email, :string\n    timestamps()\n  end\nend',
    },
    projectStructure: {
      entryPoint: 'lib/app/application.ex', modelDir: 'lib/app/schemas/', routeDir: 'lib/app_web/controllers/',
      configFiles: ['mix.exs', 'config/config.exs'], testDir: 'test/', staticDir: 'priv/static/', templateDir: 'lib/app_web/templates/',
    },
    configTemplate: [
      { path: 'mix.exs', content: 'defp deps do\n  [\n    {:phoenix, "~> 1.7"},\n    {:phoenix_ecto, "~> 4.4"},\n    {:ecto_sql, "~> 3.10"},\n    {:postgrex, ">= 0.0.0"},\n    {:jason, "~> 1.4"},\n    {:plug_cowboy, "~> 2.7"}\n  ]\nend' },
    ],
    startCommand: 'mix phx.server',
    dependencies: ['phoenix', 'phoenix_ecto', 'ecto_sql', 'postgrex', 'jason', 'plug_cowboy'],
    devDependencies: ['phoenix_live_reload'],
    middlewarePattern: 'plug {Name}',
    authPattern: 'plug :authenticate',
    validationPattern: 'def changeset(struct, params \\\\ %{}) do\n  struct\n  |> cast(params, [{fields}])\n  |> validate_required([{required}])\nend',
    errorHandlerPattern: 'def call(conn, {:error, :not_found}) do\n  conn |> put_status(:not_found) |> json(%{error: "not found"})\nend',
    corsPattern: 'plug CORSPlug, origin: ["*"]',
    staticFilePattern: 'plug Plug.Static, at: "/", from: :app',
    envPattern: 'config :app, App.Repo,\n  url: System.get_env("DATABASE_URL")',
    dockerfileTemplate: 'FROM elixir:1.16-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN mix deps.get && mix release\nFROM alpine:3.19\nCOPY --from=build /app/_build/prod/rel/app /app\nCMD ["/app/bin/app", "start"]',
  },

  rocket: {
    id: 'rocket', name: 'Rocket', language: 'rust', category: 'backend', version: '0.5',
    description: 'Type-safe Rust web framework with focus on ergonomics',
    routePattern: {
      defineRoute: '#[{method}("{path}")]',
      getAll: '#[get("/{entity}")]\nasync fn get_{entity}(db: &State<PgPool>) -> Json<Vec<{Entity}>> {\n    let items = sqlx::query_as::<_, {Entity}>("SELECT * FROM {table}")\n        .fetch_all(db.inner()).await.unwrap();\n    Json(items)\n}',
      getById: '#[get("/{entity}/<id>")]\nasync fn get_{entity}(db: &State<PgPool>, id: i32) -> Option<Json<{Entity}>> {\n    sqlx::query_as::<_, {Entity}>("SELECT * FROM {table} WHERE id = $1")\n        .bind(id).fetch_optional(db.inner()).await.unwrap().map(Json)\n}',
      create: '#[post("/{entity}", data = "<body>")]\nasync fn create_{entity}(db: &State<PgPool>, body: Json<Create{Entity}>) -> (Status, Json<{Entity}>) {\n    let item = sqlx::query_as::<_, {Entity}>("INSERT INTO {table} ({fields}) VALUES ({placeholders}) RETURNING *")\n        .fetch_one(db.inner()).await.unwrap();\n    (Status::Created, Json(item))\n}',
      update: '#[put("/{entity}/<id>", data = "<body>")]\nasync fn update_{entity}(db: &State<PgPool>, id: i32, body: Json<Update{Entity}>) -> Json<{Entity}> {\n    let item = sqlx::query_as::<_, {Entity}>("UPDATE {table} SET {sets} WHERE id = $1 RETURNING *")\n        .bind(id).fetch_one(db.inner()).await.unwrap();\n    Json(item)\n}',
      delete: '#[delete("/{entity}/<id>")]\nasync fn delete_{entity}(db: &State<PgPool>, id: i32) -> Status {\n    sqlx::query("DELETE FROM {table} WHERE id = $1")\n        .bind(id).execute(db.inner()).await.unwrap();\n    Status::NoContent\n}',
      middleware: 'impl Fairing for {Name} {\n    fn info(&self) -> Info { Info { name: "{Name}", kind: Kind::Request } }\n}',
      example: '#[get("/health")]\nfn health() -> Json<serde_json::Value> {\n    Json(json!({"status": "ok"}))\n}',
    },
    modelPattern: {
      defineModel: '#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\npub struct {Name} {',
      field: '    pub {name}: {type},',
      primaryKey: '    pub id: i32,',
      foreignKey: '    pub {name}_id: i32,',
      relationship: '    // relationship to {Target}',
      example: '#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\npub struct User {\n    pub id: i32,\n    pub name: String,\n    pub email: String,\n}',
    },
    projectStructure: {
      entryPoint: 'src/main.rs', modelDir: 'src/models/', routeDir: 'src/routes/',
      configFiles: ['Cargo.toml', 'Rocket.toml', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    configTemplate: [
      { path: 'Cargo.toml', content: '[package]\nname = "app"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nrocket = { version = "0.5", features = ["json"] }\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\nsqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }\ntokio = { version = "1", features = ["full"] }' },
      { path: 'Rocket.toml', content: '[default]\naddress = "0.0.0.0"\nport = 5000' },
    ],
    startCommand: 'cargo run',
    dependencies: ['rocket', 'serde', 'serde_json', 'sqlx', 'tokio'],
    devDependencies: [],
    middlewarePattern: 'impl Fairing for {Name} {\n    fn info(&self) -> Info { Info { name: "{Name}", kind: Kind::Request } }\n}',
    authPattern: 'impl<\'r> FromRequest<\'r> for AuthUser {\n    type Error = ();\n    async fn from_request(req: &\'r Request<\'_>) -> Outcome<Self, ()> { }\n}',
    validationPattern: '#[derive(Debug, Deserialize)]\npub struct Create{Name} {\n    {fields}\n}',
    errorHandlerPattern: '#[catch(404)]\nfn not_found() -> Json<serde_json::Value> {\n    Json(json!({"error": "not found"}))\n}',
    corsPattern: 'use rocket_cors::CorsOptions;\nlet cors = CorsOptions::default().to_cors().unwrap();\nrocket.attach(cors)',
    staticFilePattern: 'use rocket::fs::FileServer;\nrocket.mount("/static", FileServer::from("static"))',
    envPattern: 'dotenv::dotenv().ok();\nlet db_url = std::env::var("DATABASE_URL")?;',
    dockerfileTemplate: 'FROM rust:1.77 AS build\nWORKDIR /app\nCOPY . .\nRUN cargo build --release\nFROM debian:bookworm-slim\nCOPY --from=build /app/target/release/app /app\nCMD ["/app"]',
  },

  ktor: {
    id: 'ktor', name: 'Ktor', language: 'kotlin', category: 'backend', version: '2.3',
    description: 'Asynchronous Kotlin web framework by JetBrains',
    routePattern: {
      defineRoute: '{method}("{path}") {\n    call.respond({handler})\n}',
      getAll: 'get("/{entity}") {\n    val items = db.from({Entity}Table).select()\n    call.respond(items)\n}',
      getById: 'get("/{entity}/{id}") {\n    val id = call.parameters["id"]?.toIntOrNull()\n    val item = db.from({Entity}Table).select().where { {Entity}Table.id eq id }\n    call.respond(item ?: HttpStatusCode.NotFound)\n}',
      create: 'post("/{entity}") {\n    val body = call.receive<Create{Entity}>()\n    val id = db.insert({Entity}Table) { set(it.name, body.name) }\n    call.respond(HttpStatusCode.Created, mapOf("id" to id))\n}',
      update: 'put("/{entity}/{id}") {\n    val id = call.parameters["id"]?.toIntOrNull()\n    val body = call.receive<Update{Entity}>()\n    db.update({Entity}Table) { set(it.name, body.name); where { it.id eq id } }\n    call.respond(HttpStatusCode.OK)\n}',
      delete: 'delete("/{entity}/{id}") {\n    val id = call.parameters["id"]?.toIntOrNull()\n    db.delete({Entity}Table) { it.id eq id }\n    call.respond(HttpStatusCode.NoContent)\n}',
      middleware: 'install({Name}) {\n}',
      example: 'get("/health") {\n    call.respond(mapOf("status" to "ok"))\n}',
    },
    modelPattern: {
      defineModel: 'object {Name}Table : Table("{table}") {',
      field: '    val {name} = {type}("{name}")',
      primaryKey: '    val id = integer("id").autoIncrement()\n    override val primaryKey = PrimaryKey(id)',
      foreignKey: '    val {name}Id = integer("{name}_id").references({Target}Table.id)',
      relationship: '    // relationship to {target}',
      example: 'object UsersTable : Table("users") {\n    val id = integer("id").autoIncrement()\n    val name = varchar("name", 100)\n    val email = varchar("email", 255).uniqueIndex()\n    override val primaryKey = PrimaryKey(id)\n}',
    },
    projectStructure: {
      entryPoint: 'src/main/kotlin/Application.kt', modelDir: 'src/main/kotlin/models/', routeDir: 'src/main/kotlin/routes/',
      configFiles: ['build.gradle.kts', 'application.conf'], testDir: 'src/test/kotlin/', staticDir: 'src/main/resources/static/', templateDir: 'src/main/resources/templates/',
    },
    configTemplate: [
      { path: 'application.conf', content: 'ktor {\n  deployment {\n    port = 5000\n    host = "0.0.0.0"\n  }\n  application {\n    modules = [ com.app.ApplicationKt.module ]\n  }\n}' },
    ],
    startCommand: 'gradle run',
    dependencies: ['io.ktor:ktor-server-netty', 'io.ktor:ktor-server-content-negotiation', 'org.jetbrains.exposed:exposed-core', 'org.postgresql:postgresql'],
    devDependencies: ['io.ktor:ktor-server-tests'],
    middlewarePattern: 'install(ContentNegotiation) {\n    json()\n}',
    authPattern: 'install(Authentication) {\n    jwt("auth-jwt") {\n        verifier(JWT.require(Algorithm.HMAC256("secret")).build())\n        validate { JWTPrincipal(it.payload) }\n    }\n}',
    validationPattern: '@Serializable\ndata class Create{Name}(\n    {fields}\n)',
    errorHandlerPattern: 'install(StatusPages) {\n    exception<Throwable> { call, cause ->\n        call.respond(HttpStatusCode.InternalServerError, mapOf("error" to cause.message))\n    }\n}',
    corsPattern: 'install(CORS) {\n    anyHost()\n}',
    staticFilePattern: 'staticResources("/static", "static")',
    envPattern: 'val dbUrl = System.getenv("DATABASE_URL")',
    dockerfileTemplate: 'FROM gradle:8-jdk21 AS build\nWORKDIR /app\nCOPY . .\nRUN gradle build --no-daemon\nFROM eclipse-temurin:21-jre-alpine\nCOPY --from=build /app/build/libs/*.jar app.jar\nCMD ["java", "-jar", "app.jar"]',
  },
};

export function getFramework(id: string): FrameworkPattern | null {
  return FRAMEWORKS[id] || null;
}

export function getAllFrameworks(): FrameworkPattern[] {
  return Object.values(FRAMEWORKS);
}

export function getFrameworksByLanguage(languageId: string): FrameworkPattern[] {
  return Object.values(FRAMEWORKS).filter(f => f.language === languageId);
}

export function getFrameworksByCategory(category: 'backend' | 'frontend' | 'fullstack'): FrameworkPattern[] {
  return Object.values(FRAMEWORKS).filter(f => f.category === category);
}

export function getFrameworkIds(): string[] {
  return Object.keys(FRAMEWORKS);
}

export function getFrameworkCount(): number {
  return Object.keys(FRAMEWORKS).length;
}

export function getFrameworkSummary(): { id: string; name: string; language: string; category: string }[] {
  return Object.values(FRAMEWORKS).map(f => ({
    id: f.id, name: f.name, language: f.language, category: f.category,
  }));
}

export function resolveFramework(languageId: string, frameworkName?: string): FrameworkPattern | null {
  if (frameworkName) {
    const normalized = frameworkName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const direct = FRAMEWORKS[normalized];
    if (direct && direct.language === languageId) return direct;
    const byLanguage = getFrameworksByLanguage(languageId);
    const match = byLanguage.find(f =>
      f.id.includes(normalized) || f.name.toLowerCase().includes(normalized)
    );
    if (match) return match;
  }
  const langFrameworks = getFrameworksByLanguage(languageId);
  return langFrameworks.length > 0 ? langFrameworks[0] : null;
}