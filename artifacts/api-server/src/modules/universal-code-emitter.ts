import {
  getLanguage,
  resolveType,
  type LanguageConfig,
} from './language-registry';
import {
  getFramework,
  resolveFramework,
  type FrameworkPattern,
} from './framework-patterns';

export interface EntityBlueprint {
  name: string;
  tableName?: string;
  fields: EntityField[];
  relationships?: EntityRelationship[];
}

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
  maxLength?: number;
}

export interface EntityRelationship {
  type: 'one-to-many' | 'many-to-one' | 'many-to-many' | 'one-to-one';
  target: string;
  foreignKey: string;
  backref?: string;
}

export interface RouteBlueprint {
  entity: string;
  basePath: string;
  operations: ('getAll' | 'getById' | 'create' | 'update' | 'delete')[];
  middleware?: string[];
  auth?: boolean;
}

export interface PageBlueprint {
  name: string;
  path: string;
  components: string[];
  dataSource?: string;
  layout?: string;
}

export interface ProjectBlueprint {
  name: string;
  description?: string;
  language: string;
  framework?: string;
  entities: EntityBlueprint[];
  routes?: RouteBlueprint[];
  pages?: PageBlueprint[];
  features?: string[];
  auth?: boolean;
  database?: string;
}

export interface EmittedFile {
  path: string;
  content: string;
  language: string;
}

export interface EmittedProject {
  files: EmittedFile[];
  language: LanguageConfig;
  framework: FrameworkPattern | null;
  startCommand: string;
  installCommand: string;
  dependencies: string[];
}

function toPascalCase(str: string): string {
  return str.replace(/(^|[_-])(\w)/g, (_, _sep, c) => c.toUpperCase()).replace(/s$/, '');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toKebabCase(str: string): string {
  return toSnakeCase(str).replace(/_/g, '-');
}

function pluralize(str: string): string {
  if (str.endsWith('s')) return str;
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
  if (str.endsWith('ch') || str.endsWith('sh') || str.endsWith('x')) return str + 'es';
  return str + 's';
}

function substituteTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function normalizeEntity(entity: EntityBlueprint): EntityBlueprint {
  return {
    name: entity.name,
    tableName: entity.tableName || toSnakeCase(pluralize(entity.name)),
    fields: (entity.fields || []).map(f => ({
      ...f,
      required: f.required ?? false,
      unique: f.unique ?? false,
      primaryKey: f.primaryKey ?? (f.name === 'id' || f.type === 'serial'),
    })),
    relationships: entity.relationships || [],
  };
}

function normalizeBlueprint(blueprint: ProjectBlueprint): ProjectBlueprint {
  return {
    ...blueprint,
    description: blueprint.description || 'A generated application',
    entities: blueprint.entities.map(normalizeEntity),
    routes: blueprint.routes || blueprint.entities.map(e => ({
      entity: e.name,
      basePath: `/api/${toSnakeCase(pluralize(e.name))}`,
      operations: ['getAll', 'getById', 'create', 'update', 'delete'] as const,
    })),
    pages: blueprint.pages || [],
    features: blueprint.features || [],
    auth: blueprint.auth ?? false,
    database: blueprint.database || 'postgresql',
  };
}

export function emitModel(entity: EntityBlueprint, lang: LanguageConfig, fw: FrameworkPattern | null): EmittedFile {
  const normalized = normalizeEntity(entity);
  const entityName = toPascalCase(normalized.name);
  const lines: string[] = [];

  if (fw) {
    const modelDef = substituteTemplate(fw.modelPattern.defineModel, {
      Name: entityName,
      table: normalized.tableName || toSnakeCase(pluralize(normalized.name)),
    });
    lines.push(modelDef);

    lines.push(substituteTemplate(fw.modelPattern.primaryKey, {}));

    for (const field of normalized.fields) {
      if (field.primaryKey) continue;
      const resolvedType = resolveType(lang.id, field.type);
      const constraints: string[] = [];
      if (field.required) constraints.push('not null');
      if (field.unique) constraints.push('unique');

      const fieldLine = substituteTemplate(fw.modelPattern.field, {
        name: toSnakeCase(field.name),
        Name: toPascalCase(field.name),
        type: resolvedType,
        json_name: toSnakeCase(field.name),
        gorm_tag: constraints.join(';'),
        constraints: constraints.length > 0 ? `, ${constraints.join(', ')}` : '',
      });
      lines.push(fieldLine);
    }

    for (const rel of normalized.relationships!) {
      const relLine = substituteTemplate(fw.modelPattern.relationship, {
        name: toCamelCase(rel.target),
        Name: toPascalCase(rel.target),
        Target: toPascalCase(rel.target),
        backref: toCamelCase(normalized.name),
        FK: toPascalCase(rel.foreignKey),
      });
      lines.push(relLine);
    }

    if (lang.id === 'rust' || lang.id === 'go' || lang.id === 'csharp' || lang.id === 'java') {
      lines.push('}');
    } else if (lang.id === 'python') {
      lines.push('');
    } else if (lang.id === 'elixir') {
      lines.push('    timestamps()');
      lines.push('  end');
      lines.push('end');
    } else if (lang.id === 'ruby') {
      lines.push('end');
    }
  } else {
    const classDef = substituteTemplate(lang.classDefinition, { Name: entityName });
    lines.push(classDef);
    for (const field of normalized.fields) {
      const resolvedType = resolveType(lang.id, field.type);
      lines.push(`  ${field.name}: ${resolvedType}`);
    }
  }

  const modelDir = fw?.projectStructure.modelDir || lang.projectStructure.modelDir;
  const fileName = `${toSnakeCase(normalized.name)}${lang.fileExtension}`;

  return {
    path: `${modelDir}${fileName}`,
    content: lines.join('\n'),
    language: lang.id,
  };
}

export function emitRoutes(route: RouteBlueprint, entity: EntityBlueprint, lang: LanguageConfig, fw: FrameworkPattern | null): EmittedFile {
  const normalized = normalizeEntity(entity);
  const entityName = toPascalCase(normalized.name);
  const entityVar = toCamelCase(normalized.name);
  const lines: string[] = [];
  const vars = {
    entity: entityVar,
    Entity: entityName,
    table: normalized.tableName || toSnakeCase(pluralize(normalized.name)),
    fields: normalized.fields.filter(f => !f.primaryKey).map(f => toSnakeCase(f.name)).join(', '),
    placeholders: normalized.fields.filter(f => !f.primaryKey).map((_, i) => `$${i + 1}`).join(', '),
    sets: normalized.fields.filter(f => !f.primaryKey).map((f, i) => `${toSnakeCase(f.name)} = $${i + 2}`).join(', '),
  };

  if (fw) {
    for (const op of route.operations) {
      const pattern = fw.routePattern[op];
      if (pattern) {
        lines.push(substituteTemplate(pattern, vars));
        lines.push('');
      }
    }
  } else {
    for (const op of route.operations) {
      const method = op === 'getAll' || op === 'getById' ? 'GET' : op === 'create' ? 'POST' : op === 'update' ? 'PUT' : 'DELETE';
      lines.push(`${lang.commentSyntax.single} ${method} ${route.basePath}`);
    }
  }

  const routeDir = fw?.projectStructure.routeDir || lang.projectStructure.routeDir;
  const fileName = `${toSnakeCase(entity.name)}${lang.fileExtension}`;

  return {
    path: `${routeDir}${fileName}`,
    content: lines.join('\n'),
    language: lang.id,
  };
}

function generateEntryPointForLanguage(blueprint: ProjectBlueprint, lang: LanguageConfig, fw: FrameworkPattern): string {
  const routes = blueprint.routes || [];
  const entities = blueprint.entities || [];

  if (lang.id === 'go') {
    const imports = [
      '"fmt"', '"net/http"', '"os"',
      `"${fw.id === 'gin' ? 'github.com/gin-gonic/gin' : fw.id === 'echo' ? 'github.com/labstack/echo/v4' : fw.id === 'fiber' ? 'github.com/gofiber/fiber/v2' : 'net/http'}"`,
      '"github.com/joho/godotenv"',
    ];
    const lines = [
      `package main`,
      '',
      `import (`,
      ...imports.map(i => `\t${i}`),
      `)`,
      '',
      `func main() {`,
      `\t_ = godotenv.Load()`,
      `\tport := os.Getenv("PORT")`,
      `\tif port == "" {`,
      `\t\tport = "5000"`,
      `\t}`,
      '',
    ];
    if (fw.id === 'gin') {
      lines.push(`\tr := gin.Default()`);
      lines.push(`\tr.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })`);
      for (const route of routes) {
        const entity = toPascalCase(route.entity);
        lines.push('');
        lines.push(`\t// ${entity} routes`);
        for (const op of route.operations) {
          const method = op === 'getAll' ? 'GET' : op === 'getById' ? 'GET' : op === 'create' ? 'POST' : op === 'update' ? 'PUT' : 'DELETE';
          const path = op === 'getById' || op === 'update' || op === 'delete' ? `${route.basePath}/:id` : route.basePath;
          lines.push(`\tr.${method}("${path}", handle${entity}${toPascalCase(op)})`);
        }
      }
      lines.push('');
      lines.push(`\tfmt.Printf("Server running on port %s\\n", port)`);
      lines.push(`\tr.Run(":" + port)`);
    } else {
      lines.push(`\tfmt.Printf("Server running on port %s\\n", port)`);
    }
    lines.push(`}`);
    return lines.join('\n');
  }

  if (lang.id === 'rust') {
    const lines = [
      `use actix_web::{web, App, HttpServer, HttpResponse};`,
      `use dotenv::dotenv;`,
      `use std::env;`,
      '',
      `#[actix_web::main]`,
      `async fn main() -> std::io::Result<()> {`,
      `    dotenv().ok();`,
      `    let port = env::var("PORT").unwrap_or_else(|_| "5000".to_string());`,
      `    println!("Server running on port {}", port);`,
      '',
      `    HttpServer::new(|| {`,
      `        App::new()`,
      `            .route("/health", web::get().to(|| async { HttpResponse::Ok().json(serde_json::json!({"status": "ok"})) }))`,
    ];
    for (const route of routes) {
      const entity = toSnakeCase(route.entity);
      for (const op of route.operations) {
        const method = op === 'getAll' ? 'get' : op === 'getById' ? 'get' : op === 'create' ? 'post' : op === 'update' ? 'put' : 'delete';
        const path = op === 'getById' || op === 'update' || op === 'delete' ? `${route.basePath}/{id}` : route.basePath;
        lines.push(`            .route("${path}", web::${method}().to(${entity}_${op}))`);
      }
    }
    lines.push(`    })`);
    lines.push(`    .bind(format!("0.0.0.0:{}", port))?`);
    lines.push(`    .run()`);
    lines.push(`    .await`);
    lines.push(`}`);
    return lines.join('\n');
  }

  if (lang.id === 'java') {
    return [
      `package com.app;`,
      '',
      `import org.springframework.boot.SpringApplication;`,
      `import org.springframework.boot.autoconfigure.SpringBootApplication;`,
      '',
      `@SpringBootApplication`,
      `public class Application {`,
      `    public static void main(String[] args) {`,
      `        SpringApplication.run(Application.class, args);`,
      `    }`,
      `}`,
    ].join('\n');
  }

  if (lang.id === 'csharp') {
    const lines = [
      `var builder = WebApplication.CreateBuilder(args);`,
      `builder.Services.AddControllers();`,
      `builder.Services.AddEndpointsApiExplorer();`,
      `var app = builder.Build();`,
      `app.UseHttpsRedirection();`,
      `app.MapControllers();`,
      `app.MapGet("/health", () => Results.Ok(new { status = "ok" }));`,
      `app.Run();`,
    ];
    return lines.join('\n');
  }

  if (lang.id === 'python') {
    if (fw.id === 'fastapi') {
      const lines = [
        `from fastapi import FastAPI`,
        `from dotenv import load_dotenv`,
        `import os`,
        '',
        `load_dotenv()`,
        `app = FastAPI(title="${blueprint.name}")`,
        '',
        `@app.get("/health")`,
        `def health():`,
        `    return {"status": "ok"}`,
        '',
      ];
      for (const route of routes) {
        lines.push(`# ${toPascalCase(route.entity)} routes`);
        for (const op of route.operations) {
          const method = op === 'getAll' ? 'get' : op === 'getById' ? 'get' : op === 'create' ? 'post' : op === 'update' ? 'put' : 'delete';
          const path = op === 'getById' || op === 'update' || op === 'delete' ? `${route.basePath}/{id}` : route.basePath;
          const funcName = `${toSnakeCase(route.entity)}_${op}`;
          lines.push(`@app.${method}("${path}")`);
          lines.push(`def ${funcName}():`, `    pass`, '');
        }
      }
      lines.push(`if __name__ == "__main__":`, `    import uvicorn`, `    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))`);
      return lines.join('\n');
    }
    if (fw.id === 'flask') {
      return [
        `from flask import Flask, jsonify`,
        `from dotenv import load_dotenv`,
        `import os`,
        '',
        `load_dotenv()`,
        `app = Flask(__name__)`,
        '',
        `@app.route("/health")`,
        `def health():`,
        `    return jsonify({"status": "ok"})`,
        '',
        `if __name__ == "__main__":`,
        `    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))`,
      ].join('\n');
    }
    if (fw.id === 'django') {
      return lang.entryPointTemplate;
    }
  }

  if (lang.id === 'ruby') {
    if (fw.id === 'rails') {
      return `#!/usr/bin/env ruby\nrequire_relative "../config/environment"\nRails.application.load_tasks`;
    }
    if (fw.id === 'sinatra') {
      return [
        `require 'sinatra'`,
        `require 'json'`,
        '',
        `set :port, ENV.fetch('PORT', 5000)`,
        '',
        `get '/health' do`,
        `  content_type :json`,
        `  { status: 'ok' }.to_json`,
        `end`,
      ].join('\n');
    }
  }

  if (lang.id === 'php' && fw.id === 'laravel') {
    return lang.entryPointTemplate;
  }

  if (lang.id === 'elixir' && fw.id === 'phoenix') {
    return lang.entryPointTemplate;
  }

  if (lang.id === 'kotlin' && fw.id === 'ktor') {
    return [
      `import io.ktor.server.engine.*`,
      `import io.ktor.server.netty.*`,
      `import io.ktor.server.application.*`,
      `import io.ktor.server.response.*`,
      `import io.ktor.server.routing.*`,
      '',
      `fun main() {`,
      `    embeddedServer(Netty, port = System.getenv("PORT")?.toIntOrNull() ?: 5000) {`,
      `        routing {`,
      `            get("/health") {`,
      `                call.respondText("{\\"status\\":\\"ok\\"}", io.ktor.http.ContentType.Application.Json)`,
      `            }`,
      `        }`,
      `    }.start(wait = true)`,
      `}`,
    ].join('\n');
  }

  if (lang.id === 'typescript') {
    return [
      `import express from 'express';`,
      `import dotenv from 'dotenv';`,
      '',
      `dotenv.config();`,
      `const app = express();`,
      `app.use(express.json());`,
      '',
      `app.get('/health', (_req, res) => res.json({ status: 'ok' }));`,
      '',
      ...routes.map(r => `// ${toPascalCase(r.entity)} routes: ${r.basePath}`),
      '',
      `const port = process.env.PORT || 5000;`,
      `app.listen(port, () => console.log(\`Server running on port \${port}\`));`,
    ].join('\n');
  }

  return lang.entryPointTemplate;
}

export function emitEntryPoint(blueprint: ProjectBlueprint, lang: LanguageConfig, fw: FrameworkPattern | null): EmittedFile {
  const entryPoint = fw?.projectStructure.entryPoint || lang.projectStructure.entryPoint;

  let content: string;
  if (fw) {
    content = generateEntryPointForLanguage(blueprint, lang, fw);
  } else {
    content = lang.entryPointTemplate;
  }

  return {
    path: entryPoint,
    content,
    language: lang.id,
  };
}

export function emitConfigFiles(blueprint: ProjectBlueprint, lang: LanguageConfig, fw: FrameworkPattern | null): EmittedFile[] {
  const files: EmittedFile[] = [];

  if (fw) {
    for (const config of fw.configTemplate) {
      files.push({
        path: config.path,
        content: config.content,
        language: lang.id,
      });
    }
  }

  const envContent = [
    `${lang.commentSyntax.single} ${blueprint.name} Environment Configuration`,
    `DATABASE_URL=\${DATABASE_URL}`,
    `PORT=5000`,
    `NODE_ENV=development`,
  ].join('\n');

  files.push({ path: '.env', content: envContent, language: 'env' });

  return files;
}

export function emitDockerfile(blueprint: ProjectBlueprint, _lang: LanguageConfig, fw: FrameworkPattern | null): EmittedFile | null {
  if (!fw) return null;
  return {
    path: 'Dockerfile',
    content: fw.dockerfileTemplate,
    language: 'dockerfile',
  };
}

export function emitReadme(blueprint: ProjectBlueprint, lang: LanguageConfig, fw: FrameworkPattern | null): EmittedFile {
  const lines = [
    `# ${blueprint.name}`,
    '',
    blueprint.description || 'A generated application',
    '',
    `## Tech Stack`,
    '',
    `- **Language**: ${lang.displayName} ${lang.version}`,
    fw ? `- **Framework**: ${fw.name} ${fw.version}` : '',
    `- **Database**: ${blueprint.database || 'postgresql'}`,
    fw ? `- **ORM**: ${lang.defaultOrm}` : '',
    '',
    `## Getting Started`,
    '',
    '```bash',
    lang.packageManager.installCmd,
    fw?.startCommand || lang.runCommand,
    '```',
    '',
    `## Project Structure`,
    '',
    '```',
    (fw?.projectStructure.entryPoint || lang.projectStructure.entryPoint) + '  # Entry point',
    (fw?.projectStructure.modelDir || lang.projectStructure.modelDir) + '  # Data models',
    (fw?.projectStructure.routeDir || lang.projectStructure.routeDir) + '  # API routes',
    (fw?.projectStructure.testDir || lang.projectStructure.testDir) + '  # Tests',
    '```',
    '',
    `## Entities`,
    '',
    ...blueprint.entities.map(e => `- **${toPascalCase(e.name)}**: ${e.fields.map(f => f.name).join(', ')}`),
    '',
    `## API Endpoints`,
    '',
    ...(blueprint.routes || []).flatMap(r => [
      `### ${toPascalCase(r.entity)}`,
      ...r.operations.map(op => {
        const method = op === 'getAll' ? 'GET' : op === 'getById' ? 'GET' : op === 'create' ? 'POST' : op === 'update' ? 'PUT' : 'DELETE';
        const path = op === 'getById' || op === 'update' || op === 'delete' ? `${r.basePath}/:id` : r.basePath;
        return `- \`${method} ${path}\``;
      }),
      '',
    ]),
  ];

  return { path: 'README.md', content: lines.filter(l => l !== undefined).join('\n'), language: 'markdown' };
}

export function emitProject(blueprint: ProjectBlueprint): EmittedProject {
  const bp = normalizeBlueprint(blueprint);
  const lang = getLanguage(bp.language);
  if (!lang) {
    throw new Error(`Unsupported language: ${bp.language}. Use getLanguageIds() to see available languages.`);
  }

  const fw = bp.framework
    ? resolveFramework(lang.id, bp.framework)
    : resolveFramework(lang.id);

  const files: EmittedFile[] = [];

  for (const entity of bp.entities) {
    files.push(emitModel(entity, lang, fw));
  }

  for (const route of bp.routes!) {
    const entity = bp.entities.find(e => e.name === route.entity);
    if (entity) {
      files.push(emitRoutes(route, entity, lang, fw));
    }
  }

  files.push(emitEntryPoint(bp, lang, fw));

  files.push(...emitConfigFiles(bp, lang, fw));

  const dockerfile = emitDockerfile(bp, lang, fw);
  if (dockerfile) files.push(dockerfile);

  files.push(emitReadme(bp, lang, fw));

  const dependencies = fw?.dependencies || [];

  return {
    files,
    language: lang,
    framework: fw,
    startCommand: fw?.startCommand || lang.runCommand,
    installCommand: lang.packageManager.installCmd,
    dependencies,
  };
}

export function getSupportedOutputLanguages(): string[] {
  const { getLanguageIds } = require('./language-registry');
  return getLanguageIds();
}

export function previewEmission(blueprint: ProjectBlueprint): { fileCount: number; filePaths: string[]; language: string; framework: string | null } {
  const result = emitProject(blueprint);
  return {
    fileCount: result.files.length,
    filePaths: result.files.map(f => f.path),
    language: result.language.displayName,
    framework: result.framework?.name || null,
  };
}
