import { EXTENDED_LANGUAGES } from './language-registry-extended.js';

export interface ImportSyntax {
  defaultImport: string;
  namedImport: string;
  moduleImport: string;
  example: string;
}

export interface TypeMapping {
  string: string;
  integer: string;
  float: string;
  boolean: string;
  date: string;
  datetime: string;
  decimal: string;
  text: string;
  json: string;
  uuid: string;
  serial: string;
  bigint: string;
  array: (innerType: string) => string;
  optional: (innerType: string) => string;
  nullable: (innerType: string) => string;
}

export interface ModelPattern {
  defineModel: string;
  field: string;
  primaryKey: string;
  foreignKey: string;
  relationship: string;
  example: string;
}

export interface RoutePattern {
  defineRoute: string;
  getAll: string;
  getById: string;
  create: string;
  update: string;
  delete: string;
  middleware: string;
  example: string;
}

export interface ProjectStructure {
  entryPoint: string;
  modelDir: string;
  routeDir: string;
  configFiles: string[];
  testDir: string;
  staticDir: string;
  templateDir: string;
}

export interface PackageManager {
  name: string;
  installCmd: string;
  addCmd: string;
  lockFile: string;
  dependencyFile: string;
  devDependencyFile?: string;
  runCmd: string;
  initCmd: string;
}

export interface LanguageConfig {
  id: string;
  name: string;
  displayName: string;
  version: string;
  fileExtension: string;
  secondaryExtensions?: string[];
  paradigm: string[];
  typing: 'static' | 'dynamic' | 'gradual';
  compiled: boolean;
  importSyntax: ImportSyntax;
  typeMapping: TypeMapping;
  commentSyntax: { single: string; multiStart: string; multiEnd: string };
  stringInterpolation: string;
  nullValue: string;
  booleanLiterals: { true: string; false: string };
  entryPointTemplate: string;
  classDefinition: string;
  functionDefinition: string;
  asyncPattern: string;
  errorHandling: string;
  packageManager: PackageManager;
  projectStructure: ProjectStructure;
  popularFrameworks: string[];
  defaultFramework: string;
  ormOptions: string[];
  defaultOrm: string;
  testFrameworks: string[];
  linter: string;
  formatter: string;
  runCommand: string;
  buildCommand: string;
  dockerBase: string;
  minimalExample: string;
}

export interface FrameworkInfo {
  id: string;
  name: string;
  language: string;
  category: 'backend' | 'frontend' | 'fullstack';
  version: string;
  description: string;
  routePattern: RoutePattern;
  modelPattern: ModelPattern;
  projectStructure: ProjectStructure;
  configFiles: { path: string; content: string }[];
  startCommand: string;
  installDeps: string[];
  devDeps: string[];
}

const arrayType = (lang: string) => (inner: string) => {
  const patterns: Record<string, (i: string) => string> = {
    python: (i) => `List[${i}]`,
    go: (i) => `[]${i}`,
    rust: (i) => `Vec<${i}>`,
    java: (i) => `List<${i}>`,
    csharp: (i) => `List<${i}>`,
    ruby: (_i) => `Array`,
    php: (i) => `array<${i}>`,
    swift: (i) => `[${i}]`,
    kotlin: (i) => `List<${i}>`,
    dart: (i) => `List<${i}>`,
    scala: (i) => `List[${i}]`,
    elixir: (_i) => `list()`,
    haskell: (i) => `[${i}]`,
    typescript: (i) => `${i}[]`,
    lua: (_i) => `table`,
    perl: (_i) => `@array`,
    r: (_i) => `vector`,
    julia: (i) => `Vector{${i}}`,
    cpp: (i) => `std::vector<${i}>`,
    c: (i) => `${i}*`,
    zig: (i) => `[]${i}`,
  };
  return (patterns[lang] || ((i: string) => `${i}[]`))(inner);
};

const optionalType = (lang: string) => (inner: string) => {
  const patterns: Record<string, (i: string) => string> = {
    python: (i) => `Optional[${i}]`,
    go: (i) => `*${i}`,
    rust: (i) => `Option<${i}>`,
    java: (i) => `Optional<${i}>`,
    csharp: (i) => `${i}?`,
    ruby: (_i) => `# optional`,
    php: (i) => `?${i}`,
    swift: (i) => `${i}?`,
    kotlin: (i) => `${i}?`,
    dart: (i) => `${i}?`,
    scala: (i) => `Option[${i}]`,
    elixir: (i) => `${i} | nil`,
    haskell: (i) => `Maybe ${i}`,
    typescript: (i) => `${i} | undefined`,
    lua: (i) => `${i}?`,
    perl: (i) => `${i}`,
    r: (i) => `${i}`,
    julia: (i) => `Union{${i}, Nothing}`,
    cpp: (i) => `std::optional<${i}>`,
    c: (i) => `${i}*`,
    zig: (i) => `?${i}`,
  };
  return (patterns[lang] || ((i: string) => `${i} | null`))(inner);
};

const BASE_LANGUAGES: Record<string, LanguageConfig> = {
  python: {
    id: 'python',
    name: 'python',
    displayName: 'Python',
    version: '3.12',
    fileExtension: '.py',
    paradigm: ['object-oriented', 'functional', 'imperative', 'procedural'],
    typing: 'dynamic',
    compiled: false,
    importSyntax: {
      defaultImport: 'import {module}',
      namedImport: 'from {module} import {name}',
      moduleImport: 'import {module}',
      example: 'from flask import Flask, jsonify',
    },
    typeMapping: {
      string: 'str', integer: 'int', float: 'float', boolean: 'bool',
      date: 'date', datetime: 'datetime', decimal: 'Decimal', text: 'str',
      json: 'dict', uuid: 'UUID', serial: 'int', bigint: 'int',
      array: arrayType('python'), optional: optionalType('python'), nullable: optionalType('python'),
    },
    commentSyntax: { single: '#', multiStart: '"""', multiEnd: '"""' },
    stringInterpolation: 'f"{variable}"',
    nullValue: 'None',
    booleanLiterals: { true: 'True', false: 'False' },
    entryPointTemplate: 'if __name__ == "__main__":\n    app.run(debug=True, port=5000)',
    classDefinition: 'class {Name}:',
    functionDefinition: 'def {name}({params}):',
    asyncPattern: 'async def {name}({params}):',
    errorHandling: 'try:\n    {code}\nexcept Exception as e:\n    {handler}',
    packageManager: {
      name: 'pip', installCmd: 'pip install -r requirements.txt', addCmd: 'pip install {package}',
      lockFile: 'requirements.txt', dependencyFile: 'requirements.txt', runCmd: 'python', initCmd: 'python -m venv venv',
    },
    projectStructure: {
      entryPoint: 'main.py', modelDir: 'models/', routeDir: 'routes/',
      configFiles: ['requirements.txt', '.env', 'config.py'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    popularFrameworks: ['flask', 'fastapi', 'django', 'tornado', 'bottle', 'starlette'],
    defaultFramework: 'fastapi',
    ormOptions: ['sqlalchemy', 'tortoise-orm', 'peewee', 'django-orm'],
    defaultOrm: 'sqlalchemy',
    testFrameworks: ['pytest', 'unittest'],
    linter: 'ruff',
    formatter: 'black',
    runCommand: 'python main.py',
    buildCommand: 'pip install -r requirements.txt',
    dockerBase: 'python:3.12-slim',
    minimalExample: `from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef root():\n    return {"message": "Hello World"}`,
  },

  go: {
    id: 'go',
    name: 'go',
    displayName: 'Go',
    version: '1.22',
    fileExtension: '.go',
    paradigm: ['imperative', 'concurrent', 'procedural'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'import "{module}"',
      namedImport: 'import (\n\t"{module}"\n)',
      moduleImport: 'import "{module}"',
      example: 'import (\n\t"github.com/gin-gonic/gin"\n\t"net/http"\n)',
    },
    typeMapping: {
      string: 'string', integer: 'int', float: 'float64', boolean: 'bool',
      date: 'time.Time', datetime: 'time.Time', decimal: 'float64', text: 'string',
      json: 'map[string]interface{}', uuid: 'string', serial: 'uint', bigint: 'int64',
      array: arrayType('go'), optional: optionalType('go'), nullable: optionalType('go'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: 'fmt.Sprintf("%s", variable)',
    nullValue: 'nil',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'func main() {\n\tr := gin.Default()\n\tr.Run(":5000")\n}',
    classDefinition: 'type {Name} struct {',
    functionDefinition: 'func {name}({params}) {returnType} {',
    asyncPattern: 'go func() {\n\t{code}\n}()',
    errorHandling: 'if err != nil {\n\t{handler}\n}',
    packageManager: {
      name: 'go modules', installCmd: 'go mod tidy', addCmd: 'go get {package}',
      lockFile: 'go.sum', dependencyFile: 'go.mod', runCmd: 'go run', initCmd: 'go mod init {name}',
    },
    projectStructure: {
      entryPoint: 'main.go', modelDir: 'models/', routeDir: 'handlers/',
      configFiles: ['go.mod', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    popularFrameworks: ['gin', 'echo', 'fiber', 'chi', 'mux', 'net/http'],
    defaultFramework: 'gin',
    ormOptions: ['gorm', 'sqlx', 'ent', 'sqlc'],
    defaultOrm: 'gorm',
    testFrameworks: ['testing', 'testify'],
    linter: 'golangci-lint',
    formatter: 'gofmt',
    runCommand: 'go run main.go',
    buildCommand: 'go build -o app',
    dockerBase: 'golang:1.22-alpine',
    minimalExample: `package main\n\nimport "github.com/gin-gonic/gin"\n\nfunc main() {\n\tr := gin.Default()\n\tr.GET("/", func(c *gin.Context) {\n\t\tc.JSON(200, gin.H{"message": "Hello World"})\n\t})\n\tr.Run(":5000")\n}`,
  },

  rust: {
    id: 'rust',
    name: 'rust',
    displayName: 'Rust',
    version: '1.77',
    fileExtension: '.rs',
    paradigm: ['imperative', 'functional', 'concurrent'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'use {module};',
      namedImport: 'use {module}::{name};',
      moduleImport: 'mod {module};',
      example: 'use actix_web::{web, App, HttpServer, HttpResponse};',
    },
    typeMapping: {
      string: 'String', integer: 'i32', float: 'f64', boolean: 'bool',
      date: 'NaiveDate', datetime: 'NaiveDateTime', decimal: 'f64', text: 'String',
      json: 'serde_json::Value', uuid: 'Uuid', serial: 'i32', bigint: 'i64',
      array: arrayType('rust'), optional: optionalType('rust'), nullable: optionalType('rust'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: 'format!("{}", variable)',
    nullValue: 'None',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: '#[actix_web::main]\nasync fn main() -> std::io::Result<()> {\n    HttpServer::new(|| App::new())\n        .bind("0.0.0.0:5000")?\n        .run()\n        .await\n}',
    classDefinition: '#[derive(Debug, Serialize, Deserialize)]\npub struct {Name} {',
    functionDefinition: 'fn {name}({params}) -> {returnType} {',
    asyncPattern: 'async fn {name}({params}) -> {returnType} {',
    errorHandling: 'match result {\n    Ok(val) => {success},\n    Err(e) => {handler}\n}',
    packageManager: {
      name: 'cargo', installCmd: 'cargo build', addCmd: 'cargo add {package}',
      lockFile: 'Cargo.lock', dependencyFile: 'Cargo.toml', runCmd: 'cargo run', initCmd: 'cargo init',
    },
    projectStructure: {
      entryPoint: 'src/main.rs', modelDir: 'src/models/', routeDir: 'src/handlers/',
      configFiles: ['Cargo.toml', '.env'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/',
    },
    popularFrameworks: ['actix-web', 'axum', 'rocket', 'warp', 'tide'],
    defaultFramework: 'actix-web',
    ormOptions: ['diesel', 'sqlx', 'sea-orm'],
    defaultOrm: 'diesel',
    testFrameworks: ['built-in', 'tokio-test'],
    linter: 'clippy',
    formatter: 'rustfmt',
    runCommand: 'cargo run',
    buildCommand: 'cargo build --release',
    dockerBase: 'rust:1.77-slim',
    minimalExample: `use actix_web::{web, App, HttpServer, HttpResponse};\n\nasync fn index() -> HttpResponse {\n    HttpResponse::Ok().json(serde_json::json!({"message": "Hello World"}))\n}\n\n#[actix_web::main]\nasync fn main() -> std::io::Result<()> {\n    HttpServer::new(|| App::new().route("/", web::get().to(index)))\n        .bind("0.0.0.0:5000")?.run().await\n}`,
  },

  java: {
    id: 'java',
    name: 'java',
    displayName: 'Java',
    version: '21',
    fileExtension: '.java',
    paradigm: ['object-oriented', 'imperative'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'import {module};',
      namedImport: 'import {module}.{name};',
      moduleImport: 'import {module}.*;',
      example: 'import org.springframework.web.bind.annotation.*;',
    },
    typeMapping: {
      string: 'String', integer: 'Integer', float: 'Double', boolean: 'Boolean',
      date: 'LocalDate', datetime: 'LocalDateTime', decimal: 'BigDecimal', text: 'String',
      json: 'JsonNode', uuid: 'UUID', serial: 'Long', bigint: 'Long',
      array: arrayType('java'), optional: optionalType('java'), nullable: optionalType('java'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: 'String.format("%s", variable)',
    nullValue: 'null',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'public static void main(String[] args) {\n    SpringApplication.run(Application.class, args);\n}',
    classDefinition: 'public class {Name} {',
    functionDefinition: 'public {returnType} {name}({params}) {',
    asyncPattern: 'public CompletableFuture<{returnType}> {name}({params}) {',
    errorHandling: 'try {\n    {code}\n} catch (Exception e) {\n    {handler}\n}',
    packageManager: {
      name: 'maven', installCmd: 'mvn install', addCmd: 'mvn dependency:resolve',
      lockFile: '', dependencyFile: 'pom.xml', runCmd: 'java -jar', initCmd: 'mvn archetype:generate',
    },
    projectStructure: {
      entryPoint: 'src/main/java/com/app/Application.java', modelDir: 'src/main/java/com/app/model/', routeDir: 'src/main/java/com/app/controller/',
      configFiles: ['pom.xml', 'application.properties'], testDir: 'src/test/java/', staticDir: 'src/main/resources/static/', templateDir: 'src/main/resources/templates/',
    },
    popularFrameworks: ['spring-boot', 'quarkus', 'micronaut', 'javalin', 'spark'],
    defaultFramework: 'spring-boot',
    ormOptions: ['hibernate', 'jpa', 'mybatis', 'jooq'],
    defaultOrm: 'jpa',
    testFrameworks: ['junit5', 'testng'],
    linter: 'checkstyle',
    formatter: 'google-java-format',
    runCommand: 'mvn spring-boot:run',
    buildCommand: 'mvn package',
    dockerBase: 'eclipse-temurin:21-jdk-alpine',
    minimalExample: `@SpringBootApplication\n@RestController\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n    @GetMapping("/")\n    public Map<String, String> index() {\n        return Map.of("message", "Hello World");\n    }\n}`,
  },

  csharp: {
    id: 'csharp',
    name: 'csharp',
    displayName: 'C#',
    version: '12',
    fileExtension: '.cs',
    paradigm: ['object-oriented', 'functional', 'imperative'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'using {module};',
      namedImport: 'using {module};',
      moduleImport: 'using {module};',
      example: 'using Microsoft.AspNetCore.Mvc;',
    },
    typeMapping: {
      string: 'string', integer: 'int', float: 'double', boolean: 'bool',
      date: 'DateOnly', datetime: 'DateTime', decimal: 'decimal', text: 'string',
      json: 'JsonElement', uuid: 'Guid', serial: 'int', bigint: 'long',
      array: arrayType('csharp'), optional: optionalType('csharp'), nullable: optionalType('csharp'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: '$"{variable}"',
    nullValue: 'null',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.Run();',
    classDefinition: 'public class {Name}\n{',
    functionDefinition: 'public {returnType} {Name}({params})\n{',
    asyncPattern: 'public async Task<{returnType}> {Name}({params})\n{',
    errorHandling: 'try\n{\n    {code}\n}\ncatch (Exception ex)\n{\n    {handler}\n}',
    packageManager: {
      name: 'nuget', installCmd: 'dotnet restore', addCmd: 'dotnet add package {package}',
      lockFile: '', dependencyFile: 'app.csproj', runCmd: 'dotnet run', initCmd: 'dotnet new webapi',
    },
    projectStructure: {
      entryPoint: 'Program.cs', modelDir: 'Models/', routeDir: 'Controllers/',
      configFiles: ['app.csproj', 'appsettings.json'], testDir: 'Tests/', staticDir: 'wwwroot/', templateDir: 'Views/',
    },
    popularFrameworks: ['aspnet-core', 'minimal-api', 'blazor'],
    defaultFramework: 'aspnet-core',
    ormOptions: ['entity-framework', 'dapper', 'linq2db'],
    defaultOrm: 'entity-framework',
    testFrameworks: ['xunit', 'nunit', 'mstest'],
    linter: 'roslyn-analyzers',
    formatter: 'dotnet-format',
    runCommand: 'dotnet run',
    buildCommand: 'dotnet build',
    dockerBase: 'mcr.microsoft.com/dotnet/aspnet:8.0',
    minimalExample: `var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet("/", () => new { message = "Hello World" });\napp.Run("http://0.0.0.0:5000");`,
  },

  ruby: {
    id: 'ruby',
    name: 'ruby',
    displayName: 'Ruby',
    version: '3.3',
    fileExtension: '.rb',
    paradigm: ['object-oriented', 'functional', 'imperative'],
    typing: 'dynamic',
    compiled: false,
    importSyntax: {
      defaultImport: "require '{module}'",
      namedImport: "require '{module}'",
      moduleImport: "require '{module}'",
      example: "require 'sinatra'\nrequire 'json'",
    },
    typeMapping: {
      string: 'String', integer: 'Integer', float: 'Float', boolean: 'Boolean',
      date: 'Date', datetime: 'DateTime', decimal: 'BigDecimal', text: 'String',
      json: 'Hash', uuid: 'String', serial: 'Integer', bigint: 'Integer',
      array: arrayType('ruby'), optional: optionalType('ruby'), nullable: optionalType('ruby'),
    },
    commentSyntax: { single: '#', multiStart: '=begin', multiEnd: '=end' },
    stringInterpolation: '"#{variable}"',
    nullValue: 'nil',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: "require 'sinatra'\n\nset :port, 5000\nset :bind, '0.0.0.0'",
    classDefinition: 'class {Name}',
    functionDefinition: 'def {name}({params})',
    asyncPattern: 'def {name}({params})',
    errorHandling: "begin\n  {code}\nrescue => e\n  {handler}\nend",
    packageManager: {
      name: 'bundler', installCmd: 'bundle install', addCmd: 'gem install {package}',
      lockFile: 'Gemfile.lock', dependencyFile: 'Gemfile', runCmd: 'ruby', initCmd: 'bundle init',
    },
    projectStructure: {
      entryPoint: 'app.rb', modelDir: 'models/', routeDir: 'routes/',
      configFiles: ['Gemfile', '.env', 'config.ru'], testDir: 'spec/', staticDir: 'public/', templateDir: 'views/',
    },
    popularFrameworks: ['rails', 'sinatra', 'hanami', 'grape', 'roda'],
    defaultFramework: 'sinatra',
    ormOptions: ['activerecord', 'sequel', 'rom'],
    defaultOrm: 'activerecord',
    testFrameworks: ['rspec', 'minitest'],
    linter: 'rubocop',
    formatter: 'rubocop',
    runCommand: 'ruby app.rb',
    buildCommand: 'bundle install',
    dockerBase: 'ruby:3.3-slim',
    minimalExample: `require 'sinatra'\nrequire 'json'\n\nset :port, 5000\n\nget '/' do\n  content_type :json\n  { message: "Hello World" }.to_json\nend`,
  },

  php: {
    id: 'php',
    name: 'php',
    displayName: 'PHP',
    version: '8.3',
    fileExtension: '.php',
    paradigm: ['object-oriented', 'imperative', 'procedural'],
    typing: 'gradual',
    compiled: false,
    importSyntax: {
      defaultImport: "use {module};",
      namedImport: "use {module}\\{name};",
      moduleImport: "require_once '{module}';",
      example: "use Illuminate\\Http\\Request;\nuse App\\Models\\User;",
    },
    typeMapping: {
      string: 'string', integer: 'int', float: 'float', boolean: 'bool',
      date: 'Carbon', datetime: 'Carbon', decimal: 'float', text: 'string',
      json: 'array', uuid: 'string', serial: 'int', bigint: 'int',
      array: arrayType('php'), optional: optionalType('php'), nullable: optionalType('php'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: '"${variable}"',
    nullValue: 'null',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: "<?php\nrequire __DIR__.'/vendor/autoload.php';\n$app->run();",
    classDefinition: 'class {Name}\n{',
    functionDefinition: 'public function {name}({params}): {returnType}\n{',
    asyncPattern: 'public function {name}({params}): {returnType}\n{',
    errorHandling: 'try {\n    {code}\n} catch (\\Exception $e) {\n    {handler}\n}',
    packageManager: {
      name: 'composer', installCmd: 'composer install', addCmd: 'composer require {package}',
      lockFile: 'composer.lock', dependencyFile: 'composer.json', runCmd: 'php', initCmd: 'composer init',
    },
    projectStructure: {
      entryPoint: 'public/index.php', modelDir: 'app/Models/', routeDir: 'routes/',
      configFiles: ['composer.json', '.env', 'config/app.php'], testDir: 'tests/', staticDir: 'public/', templateDir: 'resources/views/',
    },
    popularFrameworks: ['laravel', 'symfony', 'slim', 'lumen', 'codeigniter'],
    defaultFramework: 'laravel',
    ormOptions: ['eloquent', 'doctrine', 'propel'],
    defaultOrm: 'eloquent',
    testFrameworks: ['phpunit', 'pest'],
    linter: 'phpstan',
    formatter: 'php-cs-fixer',
    runCommand: 'php artisan serve --port=5000',
    buildCommand: 'composer install',
    dockerBase: 'php:8.3-apache',
    minimalExample: `<?php\nuse Slim\\Factory\\AppFactory;\n\nrequire __DIR__ . '/vendor/autoload.php';\n\n$app = AppFactory::create();\n$app->get('/', function ($req, $res) {\n    $res->getBody()->write(json_encode(['message' => 'Hello World']));\n    return $res->withHeader('Content-Type', 'application/json');\n});\n$app->run();`,
  },

  swift: {
    id: 'swift',
    name: 'swift',
    displayName: 'Swift',
    version: '5.10',
    fileExtension: '.swift',
    paradigm: ['object-oriented', 'functional', 'protocol-oriented'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'import {module}',
      namedImport: 'import {module}',
      moduleImport: 'import {module}',
      example: 'import Vapor',
    },
    typeMapping: {
      string: 'String', integer: 'Int', float: 'Double', boolean: 'Bool',
      date: 'Date', datetime: 'Date', decimal: 'Decimal', text: 'String',
      json: '[String: Any]', uuid: 'UUID', serial: 'Int', bigint: 'Int64',
      array: arrayType('swift'), optional: optionalType('swift'), nullable: optionalType('swift'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: '"\\(variable)"',
    nullValue: 'nil',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: '@main\nstruct App {\n    static func main() async throws {\n        let app = try Application(.detect())\n        try app.run()\n    }\n}',
    classDefinition: 'struct {Name}: Content {',
    functionDefinition: 'func {name}({params}) -> {returnType} {',
    asyncPattern: 'func {name}({params}) async throws -> {returnType} {',
    errorHandling: 'do {\n    {code}\n} catch {\n    {handler}\n}',
    packageManager: {
      name: 'swift-pm', installCmd: 'swift package resolve', addCmd: 'swift package add {package}',
      lockFile: 'Package.resolved', dependencyFile: 'Package.swift', runCmd: 'swift run', initCmd: 'swift package init --type executable',
    },
    projectStructure: {
      entryPoint: 'Sources/App/main.swift', modelDir: 'Sources/App/Models/', routeDir: 'Sources/App/Controllers/',
      configFiles: ['Package.swift', '.env'], testDir: 'Tests/', staticDir: 'Public/', templateDir: 'Resources/Views/',
    },
    popularFrameworks: ['vapor', 'hummingbird', 'kitura', 'perfect'],
    defaultFramework: 'vapor',
    ormOptions: ['fluent', 'grdb'],
    defaultOrm: 'fluent',
    testFrameworks: ['xctest', 'swift-testing'],
    linter: 'swiftlint',
    formatter: 'swift-format',
    runCommand: 'swift run',
    buildCommand: 'swift build',
    dockerBase: 'swift:5.10-slim',
    minimalExample: `import Vapor\n\nlet app = try Application(.detect())\napp.get { req in\n    ["message": "Hello World"]\n}\ntry app.run()`,
  },

  kotlin: {
    id: 'kotlin',
    name: 'kotlin',
    displayName: 'Kotlin',
    version: '2.0',
    fileExtension: '.kt',
    paradigm: ['object-oriented', 'functional'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'import {module}',
      namedImport: 'import {module}.{name}',
      moduleImport: 'import {module}.*',
      example: 'import io.ktor.server.application.*\nimport io.ktor.server.response.*',
    },
    typeMapping: {
      string: 'String', integer: 'Int', float: 'Double', boolean: 'Boolean',
      date: 'LocalDate', datetime: 'LocalDateTime', decimal: 'BigDecimal', text: 'String',
      json: 'JsonObject', uuid: 'UUID', serial: 'Long', bigint: 'Long',
      array: arrayType('kotlin'), optional: optionalType('kotlin'), nullable: optionalType('kotlin'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: '"${variable}"',
    nullValue: 'null',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'fun main() {\n    embeddedServer(Netty, port = 5000) {\n        configureRouting()\n    }.start(wait = true)\n}',
    classDefinition: 'data class {Name}(',
    functionDefinition: 'fun {name}({params}): {returnType} {',
    asyncPattern: 'suspend fun {name}({params}): {returnType} {',
    errorHandling: 'try {\n    {code}\n} catch (e: Exception) {\n    {handler}\n}',
    packageManager: {
      name: 'gradle', installCmd: 'gradle build', addCmd: 'implementation("{package}")',
      lockFile: 'gradle.lockfile', dependencyFile: 'build.gradle.kts', runCmd: 'gradle run', initCmd: 'gradle init',
    },
    projectStructure: {
      entryPoint: 'src/main/kotlin/Application.kt', modelDir: 'src/main/kotlin/models/', routeDir: 'src/main/kotlin/routes/',
      configFiles: ['build.gradle.kts', 'settings.gradle.kts', 'application.conf'], testDir: 'src/test/kotlin/', staticDir: 'src/main/resources/static/', templateDir: 'src/main/resources/templates/',
    },
    popularFrameworks: ['ktor', 'spring-boot', 'http4k', 'javalin'],
    defaultFramework: 'ktor',
    ormOptions: ['exposed', 'ktorm', 'hibernate'],
    defaultOrm: 'exposed',
    testFrameworks: ['junit5', 'kotest'],
    linter: 'detekt',
    formatter: 'ktlint',
    runCommand: 'gradle run',
    buildCommand: 'gradle build',
    dockerBase: 'eclipse-temurin:21-jdk-alpine',
    minimalExample: `import io.ktor.server.engine.*\nimport io.ktor.server.netty.*\nimport io.ktor.server.response.*\nimport io.ktor.server.routing.*\n\nfun main() {\n    embeddedServer(Netty, port = 5000) {\n        routing {\n            get("/") {\n                call.respond(mapOf("message" to "Hello World"))\n            }\n        }\n    }.start(wait = true)\n}`,
  },

  dart: {
    id: 'dart',
    name: 'dart',
    displayName: 'Dart',
    version: '3.3',
    fileExtension: '.dart',
    paradigm: ['object-oriented', 'functional'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: "import '{module}';",
      namedImport: "import '{module}' show {name};",
      moduleImport: "import '{module}';",
      example: "import 'package:shelf/shelf.dart';\nimport 'package:shelf_router/shelf_router.dart';",
    },
    typeMapping: {
      string: 'String', integer: 'int', float: 'double', boolean: 'bool',
      date: 'DateTime', datetime: 'DateTime', decimal: 'double', text: 'String',
      json: 'Map<String, dynamic>', uuid: 'String', serial: 'int', bigint: 'int',
      array: arrayType('dart'), optional: optionalType('dart'), nullable: optionalType('dart'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: "'$variable'",
    nullValue: 'null',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: "void main() async {\n  final handler = Pipeline().addMiddleware(logRequests()).addHandler(router);\n  await serve(handler, '0.0.0.0', 5000);\n}",
    classDefinition: 'class {Name} {',
    functionDefinition: '{returnType} {name}({params}) {',
    asyncPattern: 'Future<{returnType}> {name}({params}) async {',
    errorHandling: 'try {\n  {code}\n} catch (e) {\n  {handler}\n}',
    packageManager: {
      name: 'pub', installCmd: 'dart pub get', addCmd: 'dart pub add {package}',
      lockFile: 'pubspec.lock', dependencyFile: 'pubspec.yaml', runCmd: 'dart run', initCmd: 'dart create',
    },
    projectStructure: {
      entryPoint: 'bin/server.dart', modelDir: 'lib/models/', routeDir: 'lib/routes/',
      configFiles: ['pubspec.yaml', 'analysis_options.yaml'], testDir: 'test/', staticDir: 'public/', templateDir: 'templates/',
    },
    popularFrameworks: ['shelf', 'dart-frog', 'serverpod', 'aqueduct'],
    defaultFramework: 'shelf',
    ormOptions: ['drift', 'stormberry'],
    defaultOrm: 'drift',
    testFrameworks: ['test'],
    linter: 'dart-analyze',
    formatter: 'dart-format',
    runCommand: 'dart run bin/server.dart',
    buildCommand: 'dart compile exe bin/server.dart',
    dockerBase: 'dart:3.3',
    minimalExample: `import 'package:shelf/shelf.dart';\nimport 'package:shelf/shelf_io.dart';\nimport 'dart:convert';\n\nvoid main() async {\n  final handler = (Request req) => Response.ok(\n    jsonEncode({'message': 'Hello World'}),\n    headers: {'Content-Type': 'application/json'}\n  );\n  await serve(handler, '0.0.0.0', 5000);\n}`,
  },

  scala: {
    id: 'scala',
    name: 'scala',
    displayName: 'Scala',
    version: '3.4',
    fileExtension: '.scala',
    paradigm: ['object-oriented', 'functional'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'import {module}',
      namedImport: 'import {module}.{name}',
      moduleImport: 'import {module}.*',
      example: 'import zio.http.*\nimport zio.json.*',
    },
    typeMapping: {
      string: 'String', integer: 'Int', float: 'Double', boolean: 'Boolean',
      date: 'LocalDate', datetime: 'LocalDateTime', decimal: 'BigDecimal', text: 'String',
      json: 'Json', uuid: 'UUID', serial: 'Long', bigint: 'Long',
      array: arrayType('scala'), optional: optionalType('scala'), nullable: optionalType('scala'),
    },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: 's"$variable"',
    nullValue: 'null',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'object Main extends ZIOAppDefault:\n  def run = Server.serve(routes).provide(Server.default)',
    classDefinition: 'case class {Name}(',
    functionDefinition: 'def {name}({params}): {returnType} =',
    asyncPattern: 'def {name}({params}): ZIO[Any, Throwable, {returnType}] =',
    errorHandling: 'try {\n  {code}\n} catch {\n  case e: Exception => {handler}\n}',
    packageManager: {
      name: 'sbt', installCmd: 'sbt compile', addCmd: 'libraryDependencies += "{package}"',
      lockFile: '', dependencyFile: 'build.sbt', runCmd: 'sbt run', initCmd: 'sbt new',
    },
    projectStructure: {
      entryPoint: 'src/main/scala/Main.scala', modelDir: 'src/main/scala/models/', routeDir: 'src/main/scala/routes/',
      configFiles: ['build.sbt', 'project/build.properties'], testDir: 'src/test/scala/', staticDir: 'src/main/resources/static/', templateDir: 'src/main/resources/templates/',
    },
    popularFrameworks: ['zio-http', 'http4s', 'play', 'akka-http', 'cask'],
    defaultFramework: 'zio-http',
    ormOptions: ['slick', 'doobie', 'quill'],
    defaultOrm: 'slick',
    testFrameworks: ['scalatest', 'munit', 'zio-test'],
    linter: 'scalafix',
    formatter: 'scalafmt',
    runCommand: 'sbt run',
    buildCommand: 'sbt assembly',
    dockerBase: 'eclipse-temurin:21-jdk-alpine',
    minimalExample: `import zio.http.*\n\nobject Main extends ZIOAppDefault:\n  val routes = Routes(\n    Method.GET / Root -> handler(Response.json("""{"message":"Hello World"}"""))\n  )\n  def run = Server.serve(routes).provide(Server.default)`,
  },

  elixir: {
    id: 'elixir',
    name: 'elixir',
    displayName: 'Elixir',
    version: '1.16',
    fileExtension: '.ex',
    secondaryExtensions: ['.exs'],
    paradigm: ['functional', 'concurrent'],
    typing: 'dynamic',
    compiled: true,
    importSyntax: {
      defaultImport: 'import {module}',
      namedImport: 'alias {module}.{name}',
      moduleImport: 'use {module}',
      example: 'use Plug.Router',
    },
    typeMapping: {
      string: 'String.t()', integer: 'integer()', float: 'float()', boolean: 'boolean()',
      date: 'Date.t()', datetime: 'DateTime.t()', decimal: 'Decimal.t()', text: 'String.t()',
      json: 'map()', uuid: 'String.t()', serial: 'integer()', bigint: 'integer()',
      array: arrayType('elixir'), optional: optionalType('elixir'), nullable: optionalType('elixir'),
    },
    commentSyntax: { single: '#', multiStart: '@moduledoc """', multiEnd: '"""' },
    stringInterpolation: '"#{variable}"',
    nullValue: 'nil',
    booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'defmodule App.Application do\n  use Application\n  def start(_type, _args) do\n    children = [{Plug.Cowboy, scheme: :http, plug: App.Router, options: [port: 5000]}]\n    Supervisor.start_link(children, strategy: :one_for_one)\n  end\nend',
    classDefinition: 'defmodule {Name} do',
    functionDefinition: 'def {name}({params}) do',
    asyncPattern: 'def {name}({params}) do\n  Task.async(fn ->',
    errorHandling: 'try do\n  {code}\nrescue\n  e -> {handler}\nend',
    packageManager: {
      name: 'mix', installCmd: 'mix deps.get', addCmd: 'mix deps.get',
      lockFile: 'mix.lock', dependencyFile: 'mix.exs', runCmd: 'mix run', initCmd: 'mix new',
    },
    projectStructure: {
      entryPoint: 'lib/app/application.ex', modelDir: 'lib/app/models/', routeDir: 'lib/app/router.ex',
      configFiles: ['mix.exs', 'config/config.exs'], testDir: 'test/', staticDir: 'priv/static/', templateDir: 'lib/app/templates/',
    },
    popularFrameworks: ['phoenix', 'plug', 'bandit'],
    defaultFramework: 'phoenix',
    ormOptions: ['ecto'],
    defaultOrm: 'ecto',
    testFrameworks: ['exunit'],
    linter: 'credo',
    formatter: 'mix-format',
    runCommand: 'mix phx.server',
    buildCommand: 'mix compile',
    dockerBase: 'elixir:1.16-alpine',
    minimalExample: `defmodule App.Router do\n  use Plug.Router\n  plug :match\n  plug :dispatch\n  get "/" do\n    send_resp(conn, 200, Jason.encode!(%{message: "Hello World"}))\n  end\nend`,
  },

  haskell: {
    id: 'haskell',
    name: 'haskell',
    displayName: 'Haskell',
    version: '9.8',
    fileExtension: '.hs',
    paradigm: ['functional', 'lazy'],
    typing: 'static',
    compiled: true,
    importSyntax: {
      defaultImport: 'import {module}',
      namedImport: 'import {module} ({name})',
      moduleImport: 'import qualified {module} as M',
      example: 'import Web.Scotty\nimport Data.Aeson',
    },
    typeMapping: {
      string: 'Text', integer: 'Int', float: 'Double', boolean: 'Bool',
      date: 'Day', datetime: 'UTCTime', decimal: 'Scientific', text: 'Text',
      json: 'Value', uuid: 'UUID', serial: 'Int', bigint: 'Integer',
      array: arrayType('haskell'), optional: optionalType('haskell'), nullable: optionalType('haskell'),
    },
    commentSyntax: { single: '--', multiStart: '{-', multiEnd: '-}' },
    stringInterpolation: '++ show variable ++',
    nullValue: 'Nothing',
    booleanLiterals: { true: 'True', false: 'False' },
    entryPointTemplate: 'main :: IO ()\nmain = scotty 5000 $ do\n  get "/" $ json (object ["message" .= ("Hello World" :: Text)])',
    classDefinition: 'data {Name} = {Name}\n  {',
    functionDefinition: '{name} :: {params} -> {returnType}\n{name} =',
    asyncPattern: '{name} :: {params} -> IO {returnType}\n{name} =',
    errorHandling: 'catch ({code}) (\\e -> {handler})',
    packageManager: {
      name: 'cabal', installCmd: 'cabal build', addCmd: 'cabal install {package}',
      lockFile: 'cabal.project.freeze', dependencyFile: 'app.cabal', runCmd: 'cabal run', initCmd: 'cabal init',
    },
    projectStructure: {
      entryPoint: 'app/Main.hs', modelDir: 'src/Models/', routeDir: 'src/Routes/',
      configFiles: ['app.cabal', 'stack.yaml'], testDir: 'test/', staticDir: 'static/', templateDir: 'templates/',
    },
    popularFrameworks: ['scotty', 'servant', 'yesod', 'warp'],
    defaultFramework: 'scotty',
    ormOptions: ['persistent', 'beam', 'opaleye'],
    defaultOrm: 'persistent',
    testFrameworks: ['hspec', 'tasty'],
    linter: 'hlint',
    formatter: 'ormolu',
    runCommand: 'cabal run',
    buildCommand: 'cabal build',
    dockerBase: 'haskell:9.8',
    minimalExample: `{-# LANGUAGE OverloadedStrings #-}\nimport Web.Scotty\nmain :: IO ()\nmain = scotty 5000 $ do\n  get "/" $ json (object ["message" .= ("Hello World" :: String)])`,
  },

  lua: {
    id: 'lua', name: 'lua', displayName: 'Lua', version: '5.4', fileExtension: '.lua',
    paradigm: ['imperative', 'procedural', 'functional'], typing: 'dynamic', compiled: false,
    importSyntax: { defaultImport: "local {name} = require('{module}')", namedImport: "local {name} = require('{module}')", moduleImport: "require('{module}')", example: "local lapis = require('lapis')" },
    typeMapping: { string: 'string', integer: 'number', float: 'number', boolean: 'boolean', date: 'string', datetime: 'string', decimal: 'number', text: 'string', json: 'table', uuid: 'string', serial: 'number', bigint: 'number', array: arrayType('lua'), optional: optionalType('lua'), nullable: optionalType('lua') },
    commentSyntax: { single: '--', multiStart: '--[[', multiEnd: ']]' },
    stringInterpolation: '.. variable ..', nullValue: 'nil', booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: "local lapis = require('lapis')\nlocal app = lapis.Application()\napp:match('/', function(self) return { json = { message = 'Hello World' } } end)\nreturn app",
    classDefinition: 'local {Name} = {}', functionDefinition: 'function {name}({params})', asyncPattern: 'function {name}({params})',
    errorHandling: 'local ok, err = pcall(function()\n  {code}\nend)\nif not ok then {handler} end',
    packageManager: { name: 'luarocks', installCmd: 'luarocks install --only-deps', addCmd: 'luarocks install {package}', lockFile: '', dependencyFile: 'rockspec', runCmd: 'lua', initCmd: 'luarocks init' },
    projectStructure: { entryPoint: 'app.lua', modelDir: 'models/', routeDir: 'routes/', configFiles: ['rockspec'], testDir: 'spec/', staticDir: 'static/', templateDir: 'views/' },
    popularFrameworks: ['lapis', 'openresty', 'lor'], defaultFramework: 'lapis', ormOptions: ['lapis-db'], defaultOrm: 'lapis-db',
    testFrameworks: ['busted'], linter: 'luacheck', formatter: 'stylua', runCommand: 'lapis server', buildCommand: 'luarocks make', dockerBase: 'openresty/openresty:alpine',
    minimalExample: "local lapis = require('lapis')\nlocal app = lapis.Application()\napp:match('/', function(self) return { json = { message = 'Hello World' } } end)\nreturn app",
  },

  perl: {
    id: 'perl', name: 'perl', displayName: 'Perl', version: '5.38', fileExtension: '.pl',
    secondaryExtensions: ['.pm'], paradigm: ['imperative', 'functional', 'object-oriented'], typing: 'dynamic', compiled: false,
    importSyntax: { defaultImport: "use {module};", namedImport: "use {module} qw({name});", moduleImport: "use {module};", example: "use Mojolicious::Lite;\nuse JSON;" },
    typeMapping: { string: 'Str', integer: 'Int', float: 'Num', boolean: 'Bool', date: 'Str', datetime: 'Str', decimal: 'Num', text: 'Str', json: 'HashRef', uuid: 'Str', serial: 'Int', bigint: 'Int', array: arrayType('perl'), optional: optionalType('perl'), nullable: optionalType('perl') },
    commentSyntax: { single: '#', multiStart: '=pod', multiEnd: '=cut' },
    stringInterpolation: '"$variable"', nullValue: 'undef', booleanLiterals: { true: '1', false: '0' },
    entryPointTemplate: "use Mojolicious::Lite;\nget '/' => sub { shift->render(json => {message => 'Hello World'}) };\napp->start;",
    classDefinition: 'package {Name};', functionDefinition: 'sub {name} {', asyncPattern: 'sub {name} {',
    errorHandling: 'eval {\n  {code}\n};\nif ($@) {\n  {handler}\n}',
    packageManager: { name: 'cpanm', installCmd: 'cpanm --installdeps .', addCmd: 'cpanm {package}', lockFile: 'cpanfile.snapshot', dependencyFile: 'cpanfile', runCmd: 'perl', initCmd: 'milla new' },
    projectStructure: { entryPoint: 'app.pl', modelDir: 'lib/Model/', routeDir: 'lib/Controller/', configFiles: ['cpanfile'], testDir: 't/', staticDir: 'public/', templateDir: 'templates/' },
    popularFrameworks: ['mojolicious', 'dancer2', 'catalyst'], defaultFramework: 'mojolicious', ormOptions: ['dbix-class', 'rose-db'], defaultOrm: 'dbix-class',
    testFrameworks: ['test-more', 'test2'], linter: 'perlcritic', formatter: 'perltidy', runCommand: 'perl app.pl daemon -l http://*:5000', buildCommand: 'cpanm --installdeps .', dockerBase: 'perl:5.38',
    minimalExample: "use Mojolicious::Lite -signatures;\nget '/' => sub ($c) { $c->render(json => {message => 'Hello World'}) };\napp->start;",
  },

  r: {
    id: 'r', name: 'r', displayName: 'R', version: '4.3', fileExtension: '.R',
    paradigm: ['functional', 'imperative'], typing: 'dynamic', compiled: false,
    importSyntax: { defaultImport: "library({module})", namedImport: "{module}::{name}", moduleImport: "library({module})", example: "library(plumber)\nlibrary(jsonlite)" },
    typeMapping: { string: 'character', integer: 'integer', float: 'numeric', boolean: 'logical', date: 'Date', datetime: 'POSIXct', decimal: 'numeric', text: 'character', json: 'list', uuid: 'character', serial: 'integer', bigint: 'numeric', array: arrayType('r'), optional: optionalType('r'), nullable: optionalType('r') },
    commentSyntax: { single: '#', multiStart: '#', multiEnd: '' },
    stringInterpolation: 'paste0(variable)', nullValue: 'NULL', booleanLiterals: { true: 'TRUE', false: 'FALSE' },
    entryPointTemplate: 'library(plumber)\npr <- plumb("api.R")\npr$run(host="0.0.0.0", port=5000)',
    classDefinition: '{Name} <- R6Class("{Name}",', functionDefinition: '{name} <- function({params}) {', asyncPattern: '{name} <- function({params}) {',
    errorHandling: 'tryCatch({\n  {code}\n}, error = function(e) {\n  {handler}\n})',
    packageManager: { name: 'renv', installCmd: 'Rscript -e "renv::restore()"', addCmd: 'Rscript -e "install.packages(\'{package}\')"', lockFile: 'renv.lock', dependencyFile: 'DESCRIPTION', runCmd: 'Rscript', initCmd: 'Rscript -e "renv::init()"' },
    projectStructure: { entryPoint: 'app.R', modelDir: 'R/models/', routeDir: 'R/api/', configFiles: ['DESCRIPTION', 'renv.lock'], testDir: 'tests/', staticDir: 'www/', templateDir: 'inst/templates/' },
    popularFrameworks: ['plumber', 'shiny', 'ambiorix'], defaultFramework: 'plumber', ormOptions: ['dbplyr', 'dbi'], defaultOrm: 'dbplyr',
    testFrameworks: ['testthat'], linter: 'lintr', formatter: 'styler', runCommand: 'Rscript app.R', buildCommand: 'R CMD INSTALL .', dockerBase: 'r-base:4.3.0',
    minimalExample: '#* @get /\nfunction() {\n  list(message = "Hello World")\n}',
  },

  julia: {
    id: 'julia', name: 'julia', displayName: 'Julia', version: '1.10', fileExtension: '.jl',
    paradigm: ['functional', 'imperative', 'multiple-dispatch'], typing: 'dynamic', compiled: true,
    importSyntax: { defaultImport: 'using {module}', namedImport: 'using {module}: {name}', moduleImport: 'import {module}', example: 'using Genie\nusing JSON3' },
    typeMapping: { string: 'String', integer: 'Int64', float: 'Float64', boolean: 'Bool', date: 'Date', datetime: 'DateTime', decimal: 'BigFloat', text: 'String', json: 'Dict{String, Any}', uuid: 'UUID', serial: 'Int64', bigint: 'Int128', array: arrayType('julia'), optional: optionalType('julia'), nullable: optionalType('julia') },
    commentSyntax: { single: '#', multiStart: '#=', multiEnd: '=#' },
    stringInterpolation: '"$variable"', nullValue: 'nothing', booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'using Genie\nroute("/") do\n  json(Dict("message" => "Hello World"))\nend\nup(5000)',
    classDefinition: 'struct {Name}', functionDefinition: 'function {name}({params})', asyncPattern: 'function {name}({params})',
    errorHandling: 'try\n  {code}\ncatch e\n  {handler}\nend',
    packageManager: { name: 'pkg', installCmd: 'julia -e "using Pkg; Pkg.instantiate()"', addCmd: 'julia -e "using Pkg; Pkg.add(\\"{package}\\")"', lockFile: 'Manifest.toml', dependencyFile: 'Project.toml', runCmd: 'julia', initCmd: 'julia -e "using Pkg; Pkg.generate(\\"{name}\\")"' },
    projectStructure: { entryPoint: 'src/app.jl', modelDir: 'src/models/', routeDir: 'src/routes/', configFiles: ['Project.toml'], testDir: 'test/', staticDir: 'public/', templateDir: 'templates/' },
    popularFrameworks: ['genie', 'oxygen', 'mux'], defaultFramework: 'genie', ormOptions: ['searchlight', 'sequel'], defaultOrm: 'searchlight',
    testFrameworks: ['test'], linter: 'julialint', formatter: 'juliaformatter', runCommand: 'julia src/app.jl', buildCommand: 'julia -e "using Pkg; Pkg.instantiate()"', dockerBase: 'julia:1.10',
    minimalExample: 'using Genie\nroute("/") do\n  json(Dict("message" => "Hello World"))\nend\nup(5000)',
  },

  cpp: {
    id: 'cpp', name: 'cpp', displayName: 'C++', version: '23', fileExtension: '.cpp',
    secondaryExtensions: ['.h', '.hpp'], paradigm: ['object-oriented', 'imperative', 'functional', 'generic'], typing: 'static', compiled: true,
    importSyntax: { defaultImport: '#include <{module}>', namedImport: '#include "{module}"', moduleImport: '#include <{module}>', example: '#include <crow.h>\n#include <nlohmann/json.hpp>' },
    typeMapping: { string: 'std::string', integer: 'int', float: 'double', boolean: 'bool', date: 'std::string', datetime: 'std::string', decimal: 'double', text: 'std::string', json: 'nlohmann::json', uuid: 'std::string', serial: 'int', bigint: 'int64_t', array: arrayType('cpp'), optional: optionalType('cpp'), nullable: optionalType('cpp') },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: 'std::to_string(variable)', nullValue: 'nullptr', booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'int main() {\n    crow::SimpleApp app;\n    CROW_ROUTE(app, "/")([]{ return crow::response(200, "Hello World"); });\n    app.port(5000).run();\n}',
    classDefinition: 'class {Name} {\npublic:', functionDefinition: '{returnType} {name}({params}) {', asyncPattern: 'std::future<{returnType}> {name}({params}) {',
    errorHandling: 'try {\n    {code}\n} catch (const std::exception& e) {\n    {handler}\n}',
    packageManager: { name: 'vcpkg', installCmd: 'vcpkg install', addCmd: 'vcpkg install {package}', lockFile: 'vcpkg.json', dependencyFile: 'CMakeLists.txt', runCmd: './build/app', initCmd: 'cmake -B build' },
    projectStructure: { entryPoint: 'src/main.cpp', modelDir: 'src/models/', routeDir: 'src/routes/', configFiles: ['CMakeLists.txt', 'vcpkg.json'], testDir: 'tests/', staticDir: 'static/', templateDir: 'templates/' },
    popularFrameworks: ['crow', 'drogon', 'oat++', 'pistache', 'cpprestsdk'], defaultFramework: 'crow', ormOptions: ['odb', 'sqlpp11', 'soci'], defaultOrm: 'sqlpp11',
    testFrameworks: ['googletest', 'catch2', 'doctest'], linter: 'clang-tidy', formatter: 'clang-format', runCommand: './build/app', buildCommand: 'cmake --build build', dockerBase: 'gcc:14',
    minimalExample: '#include "crow.h"\nint main() {\n    crow::SimpleApp app;\n    CROW_ROUTE(app, "/")([]{\n        crow::json::wvalue x;\n        x["message"] = "Hello World";\n        return x;\n    });\n    app.port(5000).run();\n}',
  },

  c: {
    id: 'c', name: 'c', displayName: 'C', version: '23', fileExtension: '.c',
    secondaryExtensions: ['.h'], paradigm: ['imperative', 'procedural'], typing: 'static', compiled: true,
    importSyntax: { defaultImport: '#include <{module}.h>', namedImport: '#include "{module}.h"', moduleImport: '#include <{module}.h>', example: '#include <microhttpd.h>\n#include <stdio.h>' },
    typeMapping: { string: 'char*', integer: 'int', float: 'double', boolean: 'int', date: 'char*', datetime: 'time_t', decimal: 'double', text: 'char*', json: 'cJSON*', uuid: 'char*', serial: 'int', bigint: 'long long', array: arrayType('c'), optional: optionalType('c'), nullable: optionalType('c') },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: 'sprintf(buf, "%s", variable)', nullValue: 'NULL', booleanLiterals: { true: '1', false: '0' },
    entryPointTemplate: 'int main(int argc, char *argv[]) {\n    return 0;\n}',
    classDefinition: 'typedef struct {', functionDefinition: '{returnType} {name}({params}) {', asyncPattern: '{returnType} {name}({params}) {',
    errorHandling: 'if ({condition}) {\n    {handler}\n}',
    packageManager: { name: 'cmake', installCmd: 'cmake --build build', addCmd: 'vcpkg install {package}', lockFile: '', dependencyFile: 'CMakeLists.txt', runCmd: './build/app', initCmd: 'cmake -B build' },
    projectStructure: { entryPoint: 'src/main.c', modelDir: 'src/models/', routeDir: 'src/routes/', configFiles: ['CMakeLists.txt', 'Makefile'], testDir: 'tests/', staticDir: 'static/', templateDir: '' },
    popularFrameworks: ['microhttpd', 'kore', 'facil.io', 'mongoose'], defaultFramework: 'microhttpd', ormOptions: ['libpq', 'sqlite3'], defaultOrm: 'libpq',
    testFrameworks: ['cmocka', 'check', 'unity'], linter: 'cppcheck', formatter: 'clang-format', runCommand: './build/app', buildCommand: 'make', dockerBase: 'gcc:14',
    minimalExample: '#include <stdio.h>\n#include <microhttpd.h>\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}',
  },

  zig: {
    id: 'zig', name: 'zig', displayName: 'Zig', version: '0.13', fileExtension: '.zig',
    paradigm: ['imperative', 'systems'], typing: 'static', compiled: true,
    importSyntax: { defaultImport: 'const {name} = @import("{module}");', namedImport: 'const {name} = @import("{module}").{name};', moduleImport: 'const {name} = @import("{module}");', example: 'const std = @import("std");\nconst zap = @import("zap");' },
    typeMapping: { string: '[]const u8', integer: 'i32', float: 'f64', boolean: 'bool', date: 'i64', datetime: 'i64', decimal: 'f64', text: '[]const u8', json: 'std.json.Value', uuid: '[]const u8', serial: 'u32', bigint: 'i64', array: arrayType('zig'), optional: optionalType('zig'), nullable: optionalType('zig') },
    commentSyntax: { single: '//', multiStart: '//', multiEnd: '' },
    stringInterpolation: 'std.fmt.bufPrint(&buf, "{s}", .{variable})', nullValue: 'null', booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: 'pub fn main() !void {\n    var listener = zap.HttpListener.init(...);\n    listener.listen();\n}',
    classDefinition: 'const {Name} = struct {', functionDefinition: 'fn {name}({params}) {returnType} {', asyncPattern: 'fn {name}({params}) {returnType} {',
    errorHandling: '{code} catch |err| {\n    {handler}\n};',
    packageManager: { name: 'zig-build', installCmd: 'zig build', addCmd: 'zig fetch --save {package}', lockFile: 'build.zig.zon', dependencyFile: 'build.zig', runCmd: 'zig build run', initCmd: 'zig init' },
    projectStructure: { entryPoint: 'src/main.zig', modelDir: 'src/models/', routeDir: 'src/routes/', configFiles: ['build.zig', 'build.zig.zon'], testDir: 'src/tests/', staticDir: 'static/', templateDir: '' },
    popularFrameworks: ['zap', 'http.zig', 'jetzig'], defaultFramework: 'zap', ormOptions: ['pg.zig'], defaultOrm: 'pg.zig',
    testFrameworks: ['std.testing'], linter: 'zig-fmt', formatter: 'zig-fmt', runCommand: 'zig build run', buildCommand: 'zig build -Doptimize=ReleaseSafe', dockerBase: 'alpine:3.19',
    minimalExample: 'const std = @import("std");\npub fn main() !void {\n    const stdout = std.io.getStdOut().writer();\n    try stdout.print("Hello World\\n", .{});\n}',
  },

  typescript: {
    id: 'typescript', name: 'typescript', displayName: 'TypeScript', version: '5.6', fileExtension: '.ts',
    secondaryExtensions: ['.tsx'], paradigm: ['object-oriented', 'functional', 'imperative'], typing: 'static', compiled: true,
    importSyntax: { defaultImport: "import {name} from '{module}';", namedImport: "import {{ {name} }} from '{module}';", moduleImport: "import * as {name} from '{module}';", example: "import express from 'express';\nimport { Request, Response } from 'express';" },
    typeMapping: { string: 'string', integer: 'number', float: 'number', boolean: 'boolean', date: 'Date', datetime: 'Date', decimal: 'number', text: 'string', json: 'Record<string, unknown>', uuid: 'string', serial: 'number', bigint: 'bigint', array: arrayType('typescript'), optional: optionalType('typescript'), nullable: optionalType('typescript') },
    commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
    stringInterpolation: '`${variable}`', nullValue: 'null', booleanLiterals: { true: 'true', false: 'false' },
    entryPointTemplate: "import express from 'express';\nconst app = express();\napp.listen(5000);",
    classDefinition: 'interface {Name} {', functionDefinition: 'function {name}({params}): {returnType} {', asyncPattern: 'async function {name}({params}): Promise<{returnType}> {',
    errorHandling: 'try {\n  {code}\n} catch (error) {\n  {handler}\n}',
    packageManager: { name: 'npm', installCmd: 'npm install', addCmd: 'npm install {package}', lockFile: 'package-lock.json', dependencyFile: 'package.json', runCmd: 'npx tsx', initCmd: 'npm init -y' },
    projectStructure: { entryPoint: 'src/index.ts', modelDir: 'src/models/', routeDir: 'src/routes/', configFiles: ['package.json', 'tsconfig.json'], testDir: 'tests/', staticDir: 'public/', templateDir: 'src/views/' },
    popularFrameworks: ['express', 'fastify', 'koa', 'hono', 'nestjs', 'nextjs', 'nuxt', 'sveltekit'], defaultFramework: 'express', ormOptions: ['drizzle', 'prisma', 'typeorm', 'sequelize'], defaultOrm: 'drizzle',
    testFrameworks: ['vitest', 'jest'], linter: 'eslint', formatter: 'prettier', runCommand: 'npx tsx src/index.ts', buildCommand: 'tsc', dockerBase: 'node:20-alpine',
    minimalExample: "import express from 'express';\nconst app = express();\napp.get('/', (req, res) => res.json({ message: 'Hello World' }));\napp.listen(5000);",
  },
};

const LANGUAGES: Record<string, LanguageConfig> = { ...BASE_LANGUAGES, ...EXTENDED_LANGUAGES };

export function getLanguage(id: string): LanguageConfig | null {
  const normalized = id.toLowerCase().replace(/[^a-z0-9+#]/g, '');
  const aliases: Record<string, string> = {
    'py': 'python', 'python3': 'python', 'golang': 'go',
    'rs': 'rust', 'rb': 'ruby', 'cs': 'csharp', 'c#': 'csharp',
    'csharp': 'csharp', 'kt': 'kotlin', 'ts': 'typescript',
    'typescript': 'typescript', 'js': 'typescript', 'javascript': 'typescript',
    'node': 'typescript', 'nodejs': 'typescript', 'cpp': 'cpp', 'c++': 'cpp',
    'cplusplus': 'cpp', 'ex': 'elixir', 'hs': 'haskell',
    'jl': 'julia', 'pl': 'perl', 'fl': 'dart', 'flutter': 'dart',
  };
  const resolved = aliases[normalized] || normalized;
  return LANGUAGES[resolved] || null;
}

export function getAllLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES);
}

export function getLanguageIds(): string[] {
  return Object.keys(LANGUAGES);
}

export function getLanguagesByParadigm(paradigm: string): LanguageConfig[] {
  return Object.values(LANGUAGES).filter(l => l.paradigm.includes(paradigm));
}

export function getLanguagesByTyping(typing: 'static' | 'dynamic' | 'gradual'): LanguageConfig[] {
  return Object.values(LANGUAGES).filter(l => l.typing === typing);
}

export function getCompiledLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES).filter(l => l.compiled);
}

export function getInterpretedLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES).filter(l => !l.compiled);
}

export function searchLanguages(query: string): LanguageConfig[] {
  const q = query.toLowerCase();
  return Object.values(LANGUAGES).filter(l =>
    l.name.includes(q) || l.displayName.toLowerCase().includes(q) ||
    l.popularFrameworks.some(f => f.includes(q)) ||
    l.paradigm.some(p => p.includes(q))
  );
}

export function getFrameworksForLanguage(languageId: string): string[] {
  const lang = getLanguage(languageId);
  return lang?.popularFrameworks || [];
}

export function resolveType(languageId: string, fieldType: string): string {
  const lang = getLanguage(languageId);
  if (!lang) return fieldType;
  const mapping = lang.typeMapping as unknown as Record<string, unknown>;
  const resolved = mapping[fieldType];
  if (typeof resolved === 'string') return resolved;
  return lang.typeMapping.string;
}

export function getLanguageCount(): number {
  return Object.keys(LANGUAGES).length;
}

export function getLanguageSummary(): { id: string; name: string; frameworks: string[]; typing: string; compiled: boolean }[] {
  return Object.values(LANGUAGES).map(l => ({
    id: l.id, name: l.displayName, frameworks: l.popularFrameworks, typing: l.typing, compiled: l.compiled,
  }));
}