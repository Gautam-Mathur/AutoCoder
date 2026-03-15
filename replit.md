# Workspace

> Complete technical documentation: **[DOCS.md](./DOCS.md)** — covers every module, pipeline stage, SLM stage, API endpoint, frontend component, and environment variable.

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (AutoCoder backend)
│   └── autocoder/          # AutoCoder React frontend (preview path: /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run dev` — start both API server and frontend in parallel
- `pnpm run dev:api` — start only the API server
- `pnpm run dev:web` — start only the frontend
- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Local Development

See `DEVELOPMENT.md` for the full local setup guide. Key points:
- No cloud API keys required — uses Ollama or any OpenAI-compatible local server
- `DATABASE_URL` is optional (in-memory storage by default)
- `PORT` and `BASE_PATH` have sensible defaults (3001 and `/`)
- Vite dev server proxies `/api` and `/cache` to the API server automatically
- Platform-specific native binaries are installed normally (no Replit overrides)

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express + HTTP server (with WebSocket support via ws)
- Routes: `src/routes/autocoder.ts` — the main AutoCoder routes + WebSocket handlers; `src/routes/health.ts` — health check
- Modules: `src/modules/` — 35+ AI-powered modules (code generation, planning, security scanning, etc.)
- SLM system: 8 registered stage templates (understand, design, semantic, quality, schema, api, components, generate) initialized at startup via `slm-registry.ts`. When an AI endpoint is available, the pipeline uses SLM to enhance understanding (implicit requirements, inferred entities) and codegen (function-body improvements). Falls back to rules-only mode if no endpoint is configured.
- Snapshot system: Per-project snapshots only (generic prewarm disabled). The route `/api/cache/build-snapshot` accepts a project's package.json, upgrades it via `upgradePackageJson()` (cross-references dependency registry, removes bad packages, applies renames), and builds an npm install snapshot. Frontend applies the upgraded package.json back to the WebContainer.
- Validation: Multi-pass `validateAndFix()` in `post-generation-validator.ts` catches import/export mismatches, missing dependencies, and Vite-specific issues (Tailwind v4 directives, missing vite.config.ts, missing React imports, missing default exports in App.tsx). Auto-fixes are applied iteratively (up to 3 passes).
- TypeScript bracket fixer: `fixTSGenericBracketMismatch()` in `vite-error-fixer.ts` applies 6 targeted fixes for LLM-generated TypeScript where `>` and `)` are confused in generic type positions (e.g. `HTMLAttributes<HTMLSpanElement)` → `HTMLAttributes<HTMLSpanElement>`). Runs during generation and in the auto-fix route.
- Diagnostics: `continuous-debugger.ts` uses a count-based bracket balance checker (not stack-based) with a custom string stripper that correctly handles JSX apostrophes (`Don't`, `won't`) and excludes `<`/`>` from bracket pairs.
- Storage: `src/storage.ts` — in-memory or PostgreSQL storage (auto-selects based on DATABASE_URL)
- Client-lib: `src/client-lib/code-generator/` — shared code validator and pro-generator (used server-side)
- AI: Unified client via `OPENAI_BASE_URL` + `OPENAI_API_KEY` + `OPENAI_MODEL` (works with Ollama, LM Studio, cloud OpenAI). Falls back to `AI_INTEGRATIONS_OPENAI_*` (Replit). Default model: `llama3.2`
- Depends on: `@workspace/db`, `@workspace/api-zod`, `openai`, `ws`, `zod`, `nanoid`, `archiver`, `adm-zip`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle

### `artifacts/autocoder` (`@workspace/autocoder`)

AutoCoder React + Vite frontend. Full-stack AI code generation UI.

- Pages: `landing` (home), `chat` (main IDE), `vapt-dashboard` (security scans), `slm-settings`
- Components: chat interface, VS Code-style IDE, file panel, preview panel, code preview, deployment panel
- Uses `@webcontainer/api` for in-browser code execution/preview
- Auto-fix engine: When the dev server fails in WebContainer, the `auto-fix-engine.ts` parses errors (missing modules, export mismatches, syntax errors) and applies targeted fixes, retrying up to 3 times. Falls back to server-side `/api/auto-fix` endpoint for deeper analysis.
- Uses `@shared/schema` alias → `artifacts/autocoder/shared/schema.ts`
- CSS: Tailwind v4 with custom CSS variables for theming
- AI: Communicates with api-server via REST + WebSockets
- `pnpm --filter @workspace/autocoder run dev` — run dev server

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance (or exports `null` when `DATABASE_URL` is absent), exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
