# RuFlo Agent Output Schemas & Blueprinter Engine: Exhaustive Technical Reference

> **Audience**: Anyone — including a complete stranger who has never seen this codebase.
> **Purpose**: Document every agent's output JSON schema (field-by-field) and the Blueprinter's complete internal logic (line-by-line).
> **Source files**: All files in `src/lib/agents/ruflo/registry/` and `src/lib/agents/ruflo/memory.ts`.

---

## Table of Contents

1. [How to Read This Document](#1-how-to-read-this-document)
2. [What Is RuFlo?](#2-what-is-ruflo)
3. [The Pipeline at a Glance](#3-the-pipeline-at-a-glance)
4. [How Data Flows Between Agents](#4-how-data-flows-between-agents)
5. [Agent Output Schemas (Complete Reference)](#5-agent-output-schemas-complete-reference)
   - 5.1 [Queen Agent](#51-queen-agent)
   - 5.2 [Planner Agent](#52-planner-agent)
   - 5.3 [SystemsArchitect Agent (Architect)](#53-systemsarchitect-agent-architect)
   - 5.4 [BackendArchitect Agent (System)](#54-backendarchitect-agent-system)
   - 5.5 [UIUXArchitect Agent (Designer)](#55-uiuxarchitect-agent-designer)
   - 5.6 [Blueprinter (Deterministic Engine)](#56-blueprinter-deterministic-engine)
   - 5.7 [Coder Synthesizer](#57-coder-synthesizer)
   - 5.8 [Tester Agent](#58-tester-agent)
   - 5.9 [Debugger Agent](#59-debugger-agent)
   - 5.10 [VerificationAgent (Reviewer)](#510-verificationagent-reviewer)
   - 5.11 [SecurityAuditor Agent (Security)](#511-securityauditor-agent-security)
6. [Agent Context Dependencies Matrix](#6-agent-context-dependencies-matrix)
7. [Blueprinter Engine: Complete Internals](#7-blueprinter-engine-complete-internals)
   - 7.1 [What the Blueprinter Is](#71-what-the-blueprinter-is)
   - 7.2 [What the Blueprinter Is NOT](#72-what-the-blueprinter-is-not)
   - 7.3 [Input: What It Reads](#73-input-what-it-reads)
   - 7.4 [Phase 1: Data Extraction](#74-phase-1-data-extraction)
   - 7.5 [Phase 2: Global Symbol Table Construction](#75-phase-2-global-symbol-table-construction)
   - 7.6 [Phase 3: Language Detection (`getLanguageDetails`)](#76-phase-3-language-detection-getlanguagedetails)
   - 7.7 [Phase 4: Compile Order Assignment (`getCompileOrder`)](#77-phase-4-compile-order-assignment-getcompileorder)
   - 7.8 [Phase 5: Per-File Blueprint Assembly Loop](#78-phase-5-per-file-blueprint-assembly-loop)
   - 7.9 [Phase 6: Topological Sorting (`compileAfter` Population)](#79-phase-6-topological-sorting-compileafter-population)
   - 7.10 [Phase 7: HTML Asset Injection](#710-phase-7-html-asset-injection)
   - 7.11 [Output: The Final Manifest](#711-output-the-final-manifest)
   - 7.12 [How the Orchestrator Invokes the Blueprinter](#712-how-the-orchestrator-invokes-the-blueprinter)
   - 7.13 [Error Handling & Pipeline Pause](#713-error-handling--pipeline-pause)
8. [Executive Memory State Model](#8-executive-memory-state-model)
9. [OWNERSHIP Contract](#9-ownership-contract)
10. [Cross-Reference Traceability Map](#10-cross-reference-traceability-map)

---

## 1. How to Read This Document

Every schema in Section 5 is presented as:

- **Agent Name**: The human name and the internal registry name
- **Source File**: The exact `.ts` file
- **LLM Config**: Temperature, maxTokens
- **Schema Type**: JSON Schema object (the literal code from the source)
- **Field Table**: Every field, its type, whether it's required, enum values (if any), nested structure, and what it means in plain English
- **Example Output**: A realistic JSON output
- **What consumes it**: Which downstream agents read this data and which specific fields they pull

---

## 2. What Is RuFlo?

RuFlo is a **multi-agent AI software engineering pipeline**. A user types a prompt like *"Build me a to-do app"*, and RuFlo passes that prompt through a sequence of 11 specialized agents. Each agent does one job:

1. **Queen**: Understands what the user wants
2. **Planner**: Decides what features to build
3. **SystemsArchitect**: Designs the file/folder structure
4. **BackendArchitect**: Designs the database and APIs
5. **UIUXArchitect**: Designs the UI components and pages
6. **Blueprinter**: Deterministically calculates build order and cross-references everything (NO AI — pure code)
7. **Coder**: Writes the actual source code files
8. **Tester**: Tests the generated code for bugs
9. **Debugger**: Diagnoses bugs found by the Tester
10. **Reviewer**: Scores code quality
11. **SecurityAuditor**: Scans for security vulnerabilities

Each agent produces a **JSON document** that the next agent reads. The schemas below define the **exact shape** of these JSON documents.

---

## 3. The Pipeline at a Glance

```
User Prompt
    │
    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Queen      │ ──► │   Planner    │ ──► │ SystemsArchitect │
│ (taskSpec)   │     │ (planner)    │     │ (architect)      │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                                         [APPROVAL GATE]
                                                   │
                                          ┌────────▼─────────┐
                                          │ BackendArchitect  │
                                          │ (system)          │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │  UIUXArchitect   │
                                          │  (designer)      │
                                          └────────┬─────────┘
                                                   │
                                       [CONTEXT RESOLVER]
                                                   │
                                          ┌────────▼─────────┐
                                          │  Blueprinter     │
                                          │  (blueprints)    │
                                          │  DETERMINISTIC   │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │    Coder         │
                                          │  (coder)         │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │    Tester        │◄──────┐
                                          │  (tester)        │       │
                                          └────────┬─────────┘       │
                                                   │ defects?        │
                                          ┌────────▼─────────┐       │
                                          │   Debugger       │───────┘
                                          │  (debugger)      │ patch & retry
                                          └──────────────────┘
                                                   │ 0 defects
                                          ┌────────▼─────────┐
                                          │   Reviewer       │
                                          │  (reviewer)      │
                                          └────────┬─────────┘
                                                   │
                                       [QUALITY GATE]
                                                   │
                                          ┌────────▼─────────┐
                                          │ SecurityAuditor  │
                                          │  (security)      │
                                          └──────────────────┘
                                                   │
                                                   ▼
                                          ✅ Completed App
```

---

## 4. How Data Flows Between Agents

Every agent output is written to two places:

| Store | Table | Purpose |
|-------|-------|---------|
| **Executive Memory** (`ExecutiveMemory`) | Single JSON blob per conversation | In-memory state dictionary. Each agent owns exactly one field (see [Section 9](#9-ownership-contract)). Accessed via `StageLedger.read()` and `StageLedger.write()`. |
| **SML Agent Output** (`AgentOutput`) | One row per agent execution | Historical snapshots. Queried by `queryAgentOutput(conversationId, agentName, field)`. |

When Agent B needs data from Agent A, it calls `ledger.query('B', { fromAgent: 'A', select: ['field1', 'field2'] })`. The `StageLedger` looks up Agent A's ownership field in the `OWNERSHIP` map, reads that field from `MemoryState`, and returns only the requested sub-keys.

---

## 5. Agent Output Schemas (Complete Reference)

---

### 5.1 Queen Agent

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Queen` |
| **Source File** | [Queen.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Queen.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `1024` |
| **Memory Field** | `taskSpec` |
| **Execution Type** | LLM Inference |

#### Schema (uses `anyOf` — two possible shapes)

**Shape A: Canonical Task Specification** (the happy path)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | Always `"canonical"`. Marks this document as the immutable project source-of-truth. |
| `mvpId` | `string` | ✅ | Unique MVP identifier, e.g. `"MVP-001"`. Referenced by every downstream agent's `mvpReference`. |
| `projectName` | `string` | ✅ | Human-readable project name, e.g. `"E-Commerce Dashboard"`. |
| `problemStatement` | `string` | ✅ | What problem the software solves. |
| `projectDescription` | `string` | ✅ | Free-text description of the application. |
| `projectGoal` | `string` | ✅ | The intended outcome/achievement. |
| `mvpScope` | `object` | ✅ | Defines what is IN and OUT of scope. |
| `mvpScope.included` | `string[]` | ✅ | Features that ARE in the MVP. |
| `mvpScope.excluded` | `string[]` | ✅ | Features explicitly excluded. |
| `constraints` | `string[]` | ✅ | Technical or business constraints. |
| `risks` | `string[]` | ✅ | Identified technical risks. |
| `agentInstructions` | `object` OR `array` | ✅ | Instructions for downstream agents. Can be either a flat object with keys `planner`, `architect`, `system`, `designer`, `reviewer`, `coder`, `tester`, `debugger`, `security` (all `string`), OR an array of `{ agentName: string, responsibilities: string[] }`. |

**Shape B: Validation Error** (the rejection path)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"validationError"`) | ✅ | Marks this as a rejected request. |
| `status` | `string` (const: `"Rejected"`) | ✅ | Always `"Rejected"`. |
| `reason` | `string` | ✅ | Why the request was rejected. |
| `message` | `string` | ✅ | User-facing explanation. |

#### Example Output (Shape A)
```json
{
  "contextType": "canonical",
  "mvpId": "MVP-001",
  "projectName": "Task Manager",
  "problemStatement": "Users need a simple way to track daily tasks",
  "projectDescription": "A lightweight to-do list web application",
  "projectGoal": "Deliver a functional task tracker with CRUD operations",
  "mvpScope": {
    "included": ["Add Task", "Delete Task", "Mark Complete", "View Task List"],
    "excluded": ["User Authentication", "Team Collaboration", "Calendar Sync"]
  },
  "constraints": ["Must be a single-page buildless web app", "No backend server"],
  "risks": ["Local storage may be insufficient for large datasets"],
  "agentInstructions": {
    "planner": "Focus on CRUD operations for tasks with local storage persistence",
    "architect": "Design a single-page HTML/CSS/JS structure",
    "system": "No backend required — use localStorage",
    "designer": "Clean minimal UI with dark theme",
    "reviewer": "Verify all CRUD operations work correctly",
    "coder": "Use vanilla JavaScript only",
    "tester": "Test add, delete, and completion toggle flows",
    "debugger": "Focus on DOM manipulation errors",
    "security": "Check for XSS in task input fields"
  }
}
```

#### What Consumes It

| Downstream Agent | Fields Read | Via |
|-----------------|-------------|-----|
| Planner | `projectName`, `problemStatement`, `projectDescription`, `projectGoal`, `mvpScope`, `constraints`, `risks`, `agentInstructions` | `ledger.query('Planner', { fromAgent: 'Queen', select: [...] })` |
| Architect | `constraints` | `ledger.query('Architect', { fromAgent: 'Queen', select: ['constraints'] })` |
| System | `constraints` | `ledger.query('System', { fromAgent: 'Queen', select: ['constraints'] })` |
| Tester | `projectGoal`, `constraints` | `ledger.query('Tester', { fromAgent: 'Queen', select: ['projectGoal', 'constraints'] })` |
| Debugger | `projectGoal`, `constraints` | `ledger.query('Debugger', { fromAgent: 'Queen', select: ['projectGoal', 'constraints'] })` |
| Security | `projectGoal`, `constraints` | `ledger.query('Security', { fromAgent: 'Queen', select: ['projectGoal', 'constraints'] })` |
| Reviewer | `projectGoal`, `constraints` | `ledger.query('Reviewer', { fromAgent: 'Queen', select: ['projectGoal', 'constraints'] })` |

#### `getContext()` (What Queen Receives as Input)
```typescript
return '{}';  // Queen receives nothing — it IS the first agent
```

---

### 5.2 Planner Agent

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Planner` |
| **Source File** | [Planner.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Planner.ts) |
| **Temperature** | `0.3` |
| **Max Tokens** | `1536` |
| **Memory Field** | `planner` |
| **Execution Type** | LLM Inference |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | Always `"canonical"`. |
| `projectName` | `string` | ✅ | Echoed from Queen. |
| `mvpReference` | `string` | ✅ | References Queen's `mvpId`, e.g. `"MVP-001"`. |
| `recommendedTechStack` | `object` | ✅ | Technology selections (see sub-fields below). |
| `recommendedTechStack.frontend` | `string` | ✅ | e.g. `"HTML/CSS/JavaScript"`, `"React"`, `"Next.js"` |
| `recommendedTechStack.backend` | `string` | ✅ | e.g. `"Node.js"`, `"Python/Flask"`, `"none"` |
| `recommendedTechStack.database` | `string` | ✅ | e.g. `"localStorage"`, `"PostgreSQL"`, `"none"` |
| `recommendedTechStack.authentication` | `string` | ✅ | e.g. `"JWT"`, `"none"` |
| `recommendedTechStack.deployment` | `string` | ✅ | e.g. `"Static Hosting"`, `"Docker"`, `"local"` |
| `recommendedTechStack.additionalTechnologies` | `string[]` | ✅ | e.g. `["Tailwind CSS", "Chart.js"]` |
| `features` | `array` (minItems: 1) | ✅ | The MVP feature backlog. Each item is an object (see below). |
| `features[].id` | `string` | ✅ | Stable ID, e.g. `"Feature-001"`. Referenced by Architect modules, System APIs, Designer pages. |
| `features[].mvpReference` | `string` | ✅ | Back-reference to Queen's `mvpId`. |
| `features[].name` | `string` | ✅ | Human name, e.g. `"Add Task"`. |
| `features[].description` | `string` | ✅ | What the feature does. |
| `features[].priority` | `string` (enum) | ✅ | One of: `"Critical"`, `"High"`, `"Medium"`, `"Low"`. |
| `functionalRequirements` | `string[]` | ✅ | List of functional requirements. |
| `nonFunctionalRequirements` | `object` | ✅ | Seven sub-categories (see below). |
| `nonFunctionalRequirements.security` | `string[]` | ✅ | Security requirements. |
| `nonFunctionalRequirements.performance` | `string[]` | ✅ | Performance requirements. |
| `nonFunctionalRequirements.scalability` | `string[]` | ✅ | Scalability requirements. |
| `nonFunctionalRequirements.usability` | `string[]` | ✅ | Usability requirements. |
| `nonFunctionalRequirements.maintainability` | `string[]` | ✅ | Maintainability requirements. |
| `nonFunctionalRequirements.accessibility` | `string[]` | ✅ | Accessibility requirements. |
| `nonFunctionalRequirements.reliability` | `string[]` | ✅ | Reliability requirements. |
| `deliverables` | `string[]` | ✅ | What the project produces. |
| `agentInstructions` | `object` | ✅ | Instructions for downstream agents. |
| `agentInstructions.architect` | `string` | ✅ | Instructions for the Architect. |
| `agentInstructions.system` | `string` | ✅ | Instructions for the System agent. |
| `agentInstructions.designer` | `string` | ✅ | Instructions for the Designer. |
| `agentInstructions.coder` | `string` | ✅ | Instructions for the Coder. |
| `agentInstructions.tester` | `string` | ✅ | Instructions for the Tester. |
| `agentInstructions.debugger` | `string` | ✅ | Instructions for the Debugger. |
| `agentInstructions.security` | `string` | ✅ | Instructions for the Security agent. |

#### `getContext()` — What Planner Receives
```typescript
ledger.query('Planner', {
  fromAgent: 'Queen',
  select: ['projectName', 'problemStatement', 'projectDescription',
           'projectGoal', 'mvpScope', 'constraints', 'risks', 'agentInstructions']
});
// Wrapped as: { Queen: <result> }
```

#### What Consumes It

| Downstream Agent | Fields Read |
|-----------------|-------------|
| Architect | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` |
| System | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` |
| Designer | `features`, `functionalRequirements`, `recommendedTechStack` |
| Coder | `features`, `recommendedTechStack` |
| Tester | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` |
| Debugger | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` |
| Security | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` |
| **Blueprinter** | `features` (reads entire `planner` object via `ledger.read('planner')`) |

---

### 5.3 SystemsArchitect Agent (Architect)

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Architect` |
| **Pipeline Stage Name** | `SystemsArchitect` |
| **Source File** | [Architect.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Architect.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `2048` |
| **Memory Field** | `architect` |
| **Execution Type** | LLM Inference |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | Always `"canonical"`. |
| `projectName` | `string` | ✅ | Echoed from Queen. |
| `mvpReference` | `string` | ✅ | References Queen's `mvpId`. |
| `architectureStyle` | `string` | ✅ | e.g. `"Single Page Application"`, `"Modular Monolith"`, `"Microservices"`. |
| `projectStructure` | `object` | ✅ | The file tree. |
| `projectStructure.root` | `string` | ✅ | Root directory name, e.g. `"/"`. |
| `projectStructure.directories` | `string[]` | ✅ | All directories, e.g. `["src/", "src/components/", "public/"]`. |
| `projectStructure.files` | `array` (minItems: 1) | ✅ | **THE CRITICAL FIELD**. Every file in the project. Each is `{ path: string, module: string }`. |
| `projectStructure.files[].path` | `string` | ✅ | File path, e.g. `"index.html"`, `"src/app.js"`. |
| `projectStructure.files[].module` | `string` | ✅ | Which module owns this file. Must match a `modules[].id` or `modules[].name`. |
| `modules` | `array` (minItems: 1) | ✅ | Logical module groupings. |
| `modules[].id` | `string` | ✅ | Stable module ID, e.g. `"frontend-entry"`. |
| `modules[].name` | `string` | ✅ | Human name, e.g. `"Frontend Entry Module"`. |
| `modules[].purpose` | `string` | ✅ | What this module does. |
| `modules[].supportsFeatures` | `string[]` | ✅ | List of `Feature-XXX` IDs from Planner that this module implements. |
| `modules[].directories` | `string[]` | ✅ | Directories belonging to this module. |
| `modules[].files` | `string[]` | ✅ | File paths belonging to this module. |
| `modules[].dependsOn` | `string[]` | ✅ | Module IDs this module depends on. |
| `modules[].usedBy` | `string[]` | ✅ | Module IDs that depend on this module. |
| `sharedResources` | `object` | ✅ | Cross-cutting concerns. |
| `sharedResources.configuration` | `string[]` | ✅ | Config files. |
| `sharedResources.constants` | `string[]` | ✅ | Constants files. |
| `sharedResources.types` | `string[]` | ✅ | Type definition files. |
| `sharedResources.utilities` | `string[]` | ✅ | Utility files. |
| `sharedResources.middleware` | `string[]` | ✅ | Middleware files. |
| `sharedResources.assets` | `string[]` | ✅ | Static asset files. |
| `sharedResources.environment` | `string[]` | ✅ | Env files. |
| `sharedResources.others` | `string[]` | ✅ | Misc. |
| `projectConventions` | `object` | ✅ | Coding standards. |
| `projectConventions.namingConvention` | `string` | ✅ | e.g. `"camelCase for variables, PascalCase for components"`. |
| `projectConventions.folderConvention` | `string` | ✅ | e.g. `"Feature-based folder structure"`. |
| `projectConventions.codingConvention` | `string` | ✅ | e.g. `"ESLint standard"`. |
| `projectConventions.importConvention` | `string` | ✅ | e.g. `"ES Module imports"`. |

> [!IMPORTANT]
> `projectStructure.files` is the **single most critical field in the entire pipeline**. The Blueprinter iterates over this array to generate one blueprint per file. If a file is missing from this array, it will never be generated by the Coder. If a file has a wrong `module` value, it will be assigned incorrect features and dependencies.

---

### 5.4 BackendArchitect Agent (System)

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `System` |
| **Pipeline Stage Name** | `BackendArchitect` |
| **Source File** | [System.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/System.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `2048` |
| **Memory Field** | `system` |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | Always `"canonical"`. |
| `projectName` | `string` | ✅ | |
| `mvpReference` | `string` | ✅ | |
| `database` | `object` | ✅ | Database design. |
| `database.type` | `string` | ✅ | e.g. `"PostgreSQL"`, `"localStorage"`, `"N/A"`. |
| `database.entities` | `array` | ✅ | Array of entity objects. |
| `database.entities[].id` | `string` | ✅ | Stable ID, e.g. `"Entity-001"`. |
| `database.entities[].name` | `string` | ✅ | e.g. `"Task"`, `"User"`. |
| `database.entities[].purpose` | `string` | ✅ | Business justification. |
| `database.entities[].fields` | `string[]` | ✅ | Field definitions (as strings). |
| `database.entities[].relationships` | `string[]` | ✅ | Relationship descriptions. |
| `database.entities[].indexes` | `string[]` | ✅ | Index definitions. |
| `database.entities[].constraints` | `string[]` | ✅ | Constraint rules. |
| `apis` | `array` | ✅ | API endpoint definitions. |
| `apis[].id` | `string` | ✅ | Stable ID, e.g. `"API-001"`. |
| `apis[].name` | `string` | ✅ | Human name. |
| `apis[].method` | `string` | ✅ | HTTP method: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, `"PATCH"`. |
| `apis[].route` | `string` | ✅ | Route path, e.g. `"/api/tasks"`. |
| `apis[].purpose` | `string` | ✅ | What this endpoint does. |
| `apis[].featureId` | `string` | ✅ | Which `Feature-XXX` this API supports. **This is how the Blueprinter links APIs to files.** |
| `apis[].request` | `object` | ✅ | Request body schema (free-form). |
| `apis[].response` | `object` | ✅ | Response body schema (free-form). |
| `apis[].middleware` | `string[]` | ✅ | Middleware applied to this endpoint. |
| `routing` | `object` | ✅ | Router configuration. |
| `routing.routerStructure` | `array` | ✅ | Array of `{ apiId: string, path: string }` — maps API IDs to route paths. |
| `routing.routeGroups` | `string[]` | ✅ | Logical route groups. |
| `middleware` | `array` | ✅ | Middleware definitions. |
| `middleware[].name` | `string` | ✅ | e.g. `"authMiddleware"`. |
| `middleware[].purpose` | `string` | ✅ | What it does. |
| `middleware[].appliesTo` | `string[]` | ✅ | Which routes/groups it applies to. |
| `services` | `array` | ✅ | Backend service definitions. |
| `services[].id` | `string` | ✅ | e.g. `"Service-001"`. |
| `services[].name` | `string` | ✅ | e.g. `"TaskService"`. |
| `services[].purpose` | `string` | ✅ | |
| `services[].usedByApis` | `string[]` | ✅ | List of `API-XXX` IDs that consume this service. |
| `configuration` | `object` | ✅ | Infrastructure config. |
| `configuration.environmentVariables` | `string[]` | ✅ | Required env vars. |
| `configuration.storage` | `string[]` | ✅ | Storage config. |
| `configuration.cache` | `string[]` | ✅ | Cache config. |
| `configuration.externalServices` | `string[]` | ✅ | Third-party integrations. |
| `configuration.authentication` | `string[]` | ✅ | Auth config. |
| `configuration.authorization` | `string[]` | ✅ | Authz config. |
| `configuration.others` | `string[]` | ✅ | Misc config. |
| `backendRules` | `object` | ✅ | Backend constraints. |
| `backendRules.validationRules` | `string[]` | ✅ | Input validation rules. |
| `backendRules.businessRules` | `string[]` | ✅ | Business logic rules. |
| `backendRules.errorHandling` | `string[]` | ✅ | Error handling policies. |
| `backendRules.securityPolicies` | `string[]` | ✅ | Security policies. |

---

### 5.5 UIUXArchitect Agent (Designer)

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Designer` |
| **Pipeline Stage Name** | `UIUXArchitect` |
| **Source File** | [Designer.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Designer.ts) |
| **Temperature** | `0.3` |
| **Max Tokens** | `2048` |
| **Memory Field** | `designer` |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | |
| `projectName` | `string` | ✅ | |
| `mvpReference` | `string` | ✅ | |
| `designPhilosophy` | `object` | ✅ | Overall design approach. |
| `designPhilosophy.theme` | `string` | ✅ | `"dark"`, `"light"`, `"system"`. |
| `designPhilosophy.designPrinciples` | `string[]` | ✅ | e.g. `["Minimalist", "Modern"]`. |
| `designPhilosophy.targetExperience` | `string` | ✅ | UX goal description. |
| `designPhilosophy.brandingGuidelines` | `string[]` | ✅ | Brand rules. |
| `navigation` | `object` | ✅ | Navigation structure. |
| `navigation.primaryNavigation` | `string[]` | ✅ | Main nav items. |
| `navigation.secondaryNavigation` | `string[]` | ✅ | Secondary nav items. |
| `navigation.userFlows` | `string[]` | ✅ | User flow descriptions. |
| `pages` | `array` | ✅ | Page definitions. |
| `pages[].id` | `string` | ✅ | e.g. `"Page-Dashboard"`. **Used by Blueprinter for `designerPageId` matching.** |
| `pages[].name` | `string` | ✅ | e.g. `"DashboardPage"`. **Used by Blueprinter for filename-to-page fuzzy matching.** |
| `pages[].purpose` | `string` | ✅ | |
| `pages[].layout` | `string` | ✅ | e.g. `"standard"`, `"sidebar"`. |
| `pages[].supportsFeature` | `string` | ✅ | Which `Feature-XXX` this page serves. |
| `pages[].components` | `string[]` | ✅ | List of `Component-XXX` IDs rendered on this page. |
| `components` | `array` | ✅ | Component definitions. |
| `components[].id` | `string` | ✅ | e.g. `"Component-TaskList"`. **Used by Blueprinter for `designerComponentIds`.** |
| `components[].name` | `string` | ✅ | e.g. `"TaskList"`. **Used by Blueprinter for filename-to-component fuzzy matching.** |
| `components[].purpose` | `string` | ✅ | |
| `components[].pageId` | `string` | ✅ | Parent `Page-XXX` ID. |
| `components[].variants` | `string[]` | ✅ | Visual variants (e.g. `"compact"`, `"expanded"`). |
| `components[].states` | `string[]` | ✅ | Component states (e.g. `"loading"`, `"empty"`, `"error"`). |
| `designSystem` | `object` | ✅ | Visual design tokens. |
| `designSystem.colors` | `string[]` | ✅ | Color palette. |
| `designSystem.typography` | `string[]` | ✅ | Font specs. |
| `designSystem.spacing` | `string[]` | ✅ | Spacing scale. |
| `designSystem.icons` | `string[]` | ✅ | Icon set. |
| `designSystem.animations` | `string[]` | ✅ | Animation specs. |
| `designSystem.responsiveBreakpoints` | `string[]` | ✅ | Breakpoints. |
| `designSystem.elevation` | `string[]` | ✅ | Shadow/elevation values. |
| `designSystem.borders` | `string[]` | ✅ | Border specs. |
| `accessibility` | `object` | ✅ | A11y requirements. |
| `accessibility.standards` | `string[]` | ✅ | e.g. `["WCAG 2.1 AA"]`. |
| `accessibility.requirements` | `string[]` | ✅ | Specific a11y rules. |
| `interactionGuidelines` | `object` | ✅ | Interaction UX. |
| `interactionGuidelines.feedback` | `string[]` | ✅ | User feedback mechanisms. |
| `interactionGuidelines.transitions` | `string[]` | ✅ | Page/component transitions. |
| `interactionGuidelines.errorStates` | `string[]` | ✅ | Error state designs. |
| `interactionGuidelines.loadingStates` | `string[]` | ✅ | Loading state designs. |

---

### 5.6 Blueprinter (Deterministic Engine)

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Blueprinter` |
| **Source File** | [Blueprinter.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Blueprinter.ts) |
| **System Prompt** | `"DETERMINISTIC BLUEPRINT ENGINE"` (not used — no LLM call) |
| **Execution Type** | **Deterministic TypeScript function — ZERO LLM calls** |

#### Schema (Output Shape)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blueprints` | `array` | ✅ | Array of per-file blueprint objects. One entry per file in `architect.projectStructure.files`. |
| `blueprints[].id` | `string` | ✅ | Auto-generated: `"BP_001"`, `"BP_002"`, etc. (zero-padded to 3 digits). |
| `blueprints[].file` | `string` | ✅ | Exact file path from `architect.projectStructure.files[].path`. |
| `blueprints[].moduleId` | `string` | ✅ | The owning module's `id` from `architect.modules[]`. |
| `blueprints[].featureIds` | `string[]` | ✅ | `supportsFeatures` from the owning module. Traces back to Planner `Feature-XXX` IDs. |
| `blueprints[].plannerRequirementIds` | `string[]` | ✅ | Requirement IDs from Planner features matching the `featureIds`. |
| `blueprints[].language` | `string` | ✅ | Detected from file extension: `"HTML"`, `"CSS"`, `"JavaScript"`, `"TypeScript"`, `"Python"`, etc. |
| `blueprints[].languageProfile` | `string` | ✅ | Profile classification: `"HTML"`, `"CSS"`, `"JavaScript"`, `"TypeScript"`, `"Python"`, etc. |
| `blueprints[].purpose` | `string` | ✅ | From owning module's `purpose`, or default text. |
| `blueprints[].compileOrder` | `number` | ✅ | **Integer priority**: `1` (config/types) → `2` (models/schemas) → `3` (services/utils) → `4` (APIs/routes) → `5` (UI/components) → `6` (generic) → `999` (HTML entry files). |
| `blueprints[].compileAfter` | `string[]` | ✅ | List of blueprint IDs (`BP_XXX`) that must compile before this file. |
| `blueprints[].imports` | `string[]` | ✅ | Symbols this file imports (API IDs, etc.). |
| `blueprints[].exports` | `string[]` | ✅ | Symbols this file exports (component names, etc.). |
| `blueprints[].dependencies` | `string[]` | ✅ | File paths this file depends on (resolved from module `dependsOn`). |
| `blueprints[].interfaces` | `string[]` | ✅ | Always `[]` (reserved for future use). |
| `blueprints[].classes` | `string[]` | ✅ | Always `[]` (reserved for future use). |
| `blueprints[].functions` | `string[]` | ✅ | Always `[]` (reserved for future use). |
| `blueprints[].implementedApis` | `string[]` | ✅ | `API-XXX` IDs that this file implements (matched via shared `featureId`). |
| `blueprints[].consumedApis` | `string[]` | ✅ | For HTML entry files: `REQUIRED: Include <script src="...">` and `REQUIRED: Include <link rel="stylesheet" href="...">` directives. |
| `blueprints[].databaseEntities` | `string[]` | ✅ | `Entity-XXX` IDs if filepath contains `db`, `model`, `schema`, or `entity`. |
| `blueprints[].designerPageId` | `string \| null` | ✅ | Matched Designer `Page-XXX` ID if the filepath contains the page name (case-insensitive). |
| `blueprints[].designerComponentIds` | `string[]` | ✅ | Matched Designer `Component-XXX` IDs if the filepath contains any component name. |
| `blueprints[].acceptanceCriteria` | `string[]` | ✅ | Derived from module `purpose`. |
| `blueprints[].allowedConstructs` | `string[]` | ✅ | Language-specific allowed constructs. |
| `blueprints[].forbiddenConstructs` | `string[]` | ✅ | Language-specific forbidden constructs (e.g. CSS files forbid `"HTML"`, `"script"`, `"javascript"`). |
| `blueprints[].validationRules` | `string[]` | ✅ | Language-specific validation rules (e.g. `"Must parse as valid CSS syntax"`). |

> [!IMPORTANT]
> The Blueprinter output is **THE most critical handoff in the entire pipeline**. The Coder iterates over `blueprints` sorted by `compileOrder`. Each blueprint tells the Coder *exactly* what file to generate, what language to use, what APIs to implement, what design components to render, and what files must exist before it. If the Blueprinter produces wrong data, every downstream file will be wrong.

---

### 5.7 Coder Synthesizer

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Coder` |
| **Source File** | [Coder.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Coder.ts) |
| **Temperature** | `0.1` (very low — deterministic code output) |
| **Max Tokens** | `4096` (largest of any agent) |
| **Memory Field** | `coder` (a `Record<string, any>` mapping filepath → code content) |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `string` | ✅ | The target file path being generated, e.g. `"index.html"`. |
| `code` | `string` | ✅ | The complete source code of the file. |

> [!NOTE]
> The Coder schema is the **simplest** in the pipeline — just `{ file, code }`. This is by design: the Coder is called once per file in the blueprint manifest, not once for the whole project. The orchestrator loops through blueprints, calls the Coder for each one, and writes the `code` to disk.

#### How the Coder Consumes Each Blueprint

When the orchestrator invokes the Coder for a specific file, it constructs this **exact prompt** from the blueprint fields:

```
Generate code for the target filepath: "{bp.file}"
Language: {bp.language}
Language Profile: {bp.languageProfile}
Target Purpose: {bp.purpose}
Required Imports: {JSON.stringify(bp.imports)}
Required Exports: {JSON.stringify(bp.exports)}
Interfaces: {JSON.stringify(bp.interfaces)}
Classes: {JSON.stringify(bp.classes)}
Functions to Implement: {JSON.stringify(bp.functions)}
Implemented APIs: {JSON.stringify(bp.implementedApis)}
Consumed APIs: {JSON.stringify(bp.consumedApis)}
Database Entities: {JSON.stringify(bp.databaseEntities)}
Designer Page: {bp.designerPageId || 'N/A'}
Designer Components: {JSON.stringify(bp.designerComponentIds)}
Acceptance criteria to fulfill: {JSON.stringify(bp.acceptanceCriteria)}
Allowed Constructs: {JSON.stringify(bp.allowedConstructs)}
Forbidden Constructs: {JSON.stringify(bp.forbiddenConstructs)}
Validation Rules: {JSON.stringify(bp.validationRules)}

Ensure you write complete source code matching these specs. Do not truncate.
```

This means **every single field** in the Blueprinter output is directly consumed by the Coder. If the Blueprinter sets `implementedApis: ["API-001"]`, the Coder sees `Implemented APIs: ["API-001"]` in its prompt and knows to implement that API endpoint in the generated file.

The orchestrator also:
- **Sorts blueprints** by `compileOrder` (ascending) before iteration
- **Retries** each file up to 3 times on failure
- **Writes** each generated file to `projects/{conversationId}/{filepath}` on disk
- **Tracks oscillation** via MD5 hashes in `StageLedger.write()` (see Section 7, Edge Cases)

#### Oscillation Detection (How Infinite Loops Are Prevented)

When the Coder writes code to `StageLedger`, the `write()` method (in `memory.ts`) performs **oscillation detection**:

1. Computes an MD5 hash of the new file content
2. Checks if this exact hash has appeared before for this file (stored in `fileStateHistory`)
3. If yes → throws `"Oscillation detected: File \"X\" has returned to an identical state. Aborting compilation to prevent infinite loops."`
4. If no → stores the hash in history and continues

This prevents a scenario where the Coder and Debugger keep patching a file back and forth between two (or more) identical states.

---

### 5.8 Tester Agent

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Tester` |
| **Source File** | [Tester.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Tester.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `2048` |
| **Memory Field** | `tester` |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | |
| `projectName` | `string` | ✅ | |
| `mvpReference` | `string` | ✅ | |
| `generatedTestFiles` | `array` | ✅ | Test file definitions. |
| `generatedTestFiles[].id` | `string` | ✅ | e.g. `"Test-001"`. |
| `generatedTestFiles[].path` | `string` | ✅ | Test file path. |
| `generatedTestFiles[].targetFile` | `string` | ✅ | Which source file this test validates. |
| `generatedTestFiles[].coversFeature` | `string` | ✅ | Which `Feature-XXX` this test validates. |
| `generatedTestFiles[].type` | `string` | ✅ | `"unit"`, `"integration"`, `"e2e"`, etc. |
| `generatedTestFiles[].language` | `string` | ✅ | Programming language. |
| `generatedTestFiles[].content` | `string` | ✅ | Full test file source code. |
| `testReport` | `object` | ✅ | Validation results. |
| `testReport.summary` | `object` | ✅ | Aggregate stats. |
| `testReport.summary.totalTests` | `integer` | ✅ | |
| `testReport.summary.passed` | `integer` | ✅ | |
| `testReport.summary.failed` | `integer` | ✅ | |
| `testReport.summary.skipped` | `integer` | ✅ | |
| `testReport.summary.coverage` | `string` | ✅ | `"Ready for running"` if clean. |
| `testReport.summary.coveredFeatures` | `string[]` | ✅ | Features with test coverage. |
| `testReport.summary.missingFeatures` | `string[]` | ✅ | Features lacking test coverage. |
| `testReport.defects` | `array` | ✅ | Detected bugs. |
| `testReport.defects[].id` | `string` | ✅ | Stable ID: `"DEF-001"`, `"DEF-002"`, etc. **Referenced by Debugger's `testerDefectId`.** |
| `testReport.defects[].severity` | `string` (enum) | ✅ | `"Critical"`, `"High"`, `"Medium"`, `"Low"`. |
| `testReport.defects[].category` | `string` (enum) | ✅ | `"Functional"`, `"Integration"`, `"API"`, `"UI"`, `"Security"`, `"Performance"`, `"Validation"`. |
| `testReport.defects[].file` | `string` | ✅ | Which file has the bug. |
| `testReport.defects[].description` | `string` | ✅ | |
| `testReport.defects[].expectedBehaviour` | `string` | ✅ | What should happen. |
| `testReport.defects[].actualBehaviour` | `string` | ✅ | What actually happens. |
| `testReport.defects[].reproductionSteps` | `string[]` | ✅ | How to reproduce. |
| `testReport.warnings` | `string[]` | ✅ | Non-blocking warnings. |
| `testReport.status` | `string` (enum) | ✅ | `"Success"`, `"Partial"`, `"Failed"`. |

---

### 5.9 Debugger Agent

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Debugger` |
| **Source File** | [Debugger.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Debugger.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `1536` |
| **Memory Field** | `debugger` |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | |
| `projectName` | `string` | ✅ | |
| `mvpReference` | `string` | ✅ | |
| `debugReport` | `object` | ✅ | Diagnostic results. |
| `debugReport.issues` | `array` | ✅ | Diagnosed issues. |
| `debugReport.issues[].id` | `string` | ✅ | e.g. `"DBG-001"`. |
| `debugReport.issues[].testerDefectId` | `string` | ✅ | Back-references Tester's `DEF-XXX`. |
| `debugReport.issues[].severity` | `string` (enum) | ✅ | `"Critical"`, `"High"`, `"Medium"`, `"Low"`. |
| `debugReport.issues[].category` | `string` (enum) | ✅ | `"Compilation"`, `"Runtime"`, `"Functional"`, `"Integration"`, `"API"`, `"UI"`, `"Security"`, `"Performance"`. |
| `debugReport.issues[].file` | `string` | ✅ | Affected source file. |
| `debugReport.issues[].module` | `string` | ✅ | Affected module. |
| `debugReport.issues[].class` | `string` | ✅ | Affected class (or `"N/A"`). |
| `debugReport.issues[].function` | `string` | ✅ | Affected function (or `"N/A"`). |
| `debugReport.issues[].location` | `string` | ✅ | Line/col or description. |
| `debugReport.issues[].rootCause` | `string` | ✅ | Why the bug exists. |
| `debugReport.issues[].stackTrace` | `string` | ✅ | Stack trace if available. |
| `debugReport.issues[].impact` | `string` | ✅ | What breaks if not fixed. |
| `debugReport.issues[].recommendedFix` | `string` | ✅ | Fix description. |
| `debugReport.issues[].implementationInstructions` | `string[]` | ✅ | Step-by-step fix instructions for the Coder. |
| `debugReport.issues[].regressionRisk` | `string` (enum) | ✅ | `"Low"`, `"Medium"`, `"High"`. |
| `debugReport.summary` | `object` | ✅ | |
| `debugReport.summary.issuesDetected` | `integer` | ✅ | |
| `debugReport.summary.issuesResolved` | `integer` | ✅ | |
| `debugReport.summary.remainingIssues` | `integer` | ✅ | |
| `debugReport.warnings` | `string[]` | ✅ | |
| `debugReport.status` | `string` (enum) | ✅ | `"Success"`, `"Partial"`, `"Failed"`. |

---

### 5.10 VerificationAgent (Reviewer)

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Reviewer` |
| **Pipeline Stage Name** | `VerificationAgent` |
| **Source File** | [Reviewer.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Reviewer.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `1536` |
| **Memory Field** | `reviewer` |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `qualityScore` | `integer` | ✅ | Score from `0` to `100`. Represents overall code quality. |
| `annotations` | `array` | ✅ | Code quality notes. |
| `annotations[].file` | `string` | ✅ | Path of the file. |
| `annotations[].note` | `string` | ✅ | Description of warning/suggestion/error. |
| `annotations[].agent` | `string` (enum: `["Reviewer"]`) | ✅ | Always `"Reviewer"`. |
| `annotations[].severity` | `string` (enum) | ✅ | `"info"`, `"warn"`, `"error"`. |

> [!NOTE]
> The Reviewer schema is the **simplest LLM agent schema** — just a score and annotations. But it has outsized impact: if any annotation has `severity: "error"`, the pipeline can pause at the Quality Gate.

---

### 5.11 SecurityAuditor Agent (Security)

| Attribute | Value |
|-----------|-------|
| **Registry Name** | `Security` |
| **Pipeline Stage Name** | `SecurityAuditor` |
| **Source File** | [Security.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Security.ts) |
| **Temperature** | `0.2` |
| **Max Tokens** | `2048` |
| **Memory Field** | `security` |

#### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contextType` | `string` (const: `"canonical"`) | ✅ | |
| `projectName` | `string` | ✅ | |
| `mvpReference` | `string` | ✅ | |
| `securityReport` | `object` | ✅ | Security assessment. |
| `securityReport.issues` | `array` | ✅ | Detected vulnerabilities. |
| `securityReport.issues[].id` | `string` | ✅ | e.g. `"SEC-001"`. |
| `securityReport.issues[].severity` | `string` (enum) | ✅ | `"Critical"`, `"High"`, `"Medium"`, `"Low"`, `"Informational"`. |
| `securityReport.issues[].category` | `string` (enum) | ✅ | One of 17 categories: `"Authentication"`, `"Authorization"`, `"Input Validation"`, `"Injection"`, `"XSS"`, `"CSRF"`, `"SSRF"`, `"File Upload"`, `"Security Headers"`, `"Session Management"`, `"Configuration"`, `"Secrets"`, `"Dependency"`, `"API"`, `"Cryptography"`, `"Transport Security"`, `"Other"`. |
| `securityReport.issues[].file` | `string` | ✅ | Affected file. |
| `securityReport.issues[].location` | `string` | ✅ | Line/location in file. |
| `securityReport.issues[].description` | `string` | ✅ | What the vulnerability is. |
| `securityReport.issues[].risk` | `string` | ✅ | Impact/risk assessment. |
| `securityReport.issues[].recommendation` | `string` | ✅ | How to fix it. |
| `securityReport.issues[].affectedFeature` | `string` | ✅ | `Feature-XXX` or `"N/A"`. |
| `securityReport.issues[].owaspTop10` | `string` | ✅ | OWASP category. |
| `securityReport.issues[].cweReference` | `string` | ✅ | CWE ID, e.g. `"CWE-79"`. |
| `securityReport.issues[].confidence` | `string` (enum) | ✅ | `"High"`, `"Medium"`, `"Low"`. |
| `securityReport.summary` | `object` | ✅ | Counts by severity. |
| `securityReport.summary.critical` | `integer` | ✅ | |
| `securityReport.summary.high` | `integer` | ✅ | |
| `securityReport.summary.medium` | `integer` | ✅ | |
| `securityReport.summary.low` | `integer` | ✅ | |
| `securityReport.summary.informational` | `integer` | ✅ | |
| `securityReport.warnings` | `string[]` | ✅ | General warnings. |
| `securityReport.status` | `string` (enum) | ✅ | `"Success"`, `"Partial"`, `"Failed"`. |

---

## 6. Agent Context Dependencies Matrix

This table shows **exactly what data each agent reads** from which upstream agent, and the exact `ledger.query()` call used.

| Agent (Consumer) | Reads From | Fields Selected | Code |
|:---|:---|:---|:---|
| **Queen** | *(nothing)* | — | `return '{}'` |
| **Planner** | Queen | `projectName`, `problemStatement`, `projectDescription`, `projectGoal`, `mvpScope`, `constraints`, `risks`, `agentInstructions` | `ledger.query('Planner', { fromAgent: 'Queen', select: [...] })` |
| **Architect** | Planner | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` | `ledger.query('Architect', { fromAgent: 'Planner', select: [...] })` |
| **Architect** | Queen | `constraints` | `ledger.query('Architect', { fromAgent: 'Queen', select: ['constraints'] })` |
| **System** | Planner | `features`, `functionalRequirements`, `nonFunctionalRequirements`, `recommendedTechStack` | `ledger.query('System', { fromAgent: 'Planner', select: [...] })` |
| **System** | Architect | `modules` | `ledger.query('System', { fromAgent: 'Architect', select: ['modules'] })` |
| **System** | Queen | `constraints` | `ledger.query('System', { fromAgent: 'Queen', select: ['constraints'] })` |
| **Designer** | Planner | `features`, `functionalRequirements`, `recommendedTechStack` | `ledger.query('Designer', { fromAgent: 'Planner', select: [...] })` |
| **Designer** | Architect | `modules`, `projectStructure` | `ledger.query('Designer', { fromAgent: 'Architect', select: [...] })` |
| **Designer** | System | `database` | `ledger.query('Designer', { fromAgent: 'System', select: ['database'] })` |
| **Blueprinter** | *(all four)* | Reads entire objects | `ledger.read('planner')`, `ledger.read('architect')`, `ledger.read('system')`, `ledger.read('designer')` |
| **Coder** | Planner | `features`, `recommendedTechStack` | `ledger.query(...)` |
| **Coder** | Architect | `modules`, `projectStructure`, `projectConventions` | `ledger.query(...)` |
| **Coder** | System | `database`, `apis` | `ledger.query(...)` |
| **Coder** | Designer | `pages`, `components`, `designSystem`, `navigation`, `designPhilosophy`, `interactionGuidelines` | `ledger.query(...)` |
| **Coder** | *(self)* | `coder` | `ledger.read('coder')` — reads previously generated files |
| **Tester** | Queen, Planner, Architect, System, Designer, Coder | Various | See source |
| **Debugger** | Queen, Planner, Architect, System, Designer, Tester, Coder | Various | See source |
| **Reviewer** | Queen, Security, Coder, Debugger | Various | See source |
| **Security** | Queen, Planner, Architect, System, Designer, Coder | Various | See source |

---

## 7. Blueprinter Engine: Complete Internals

### 7.1 What the Blueprinter Is

The Blueprinter is a **pure TypeScript deterministic function** that takes the output of four upstream LLM agents (Planner, Architect, System, Designer) and produces a **build manifest** — an ordered list of file blueprints that tells the Coder exactly what to generate and in what order.

It is the **bridge between the design phase and the implementation phase**. Without it, the Coder would have no idea what files to create, what order to create them in, or what constraints apply to each file.

### 7.2 What the Blueprinter Is NOT

- ❌ It does NOT use an LLM. Zero API calls. Zero tokens. Zero latency from inference.
- ❌ It does NOT generate code. It generates *instructions* for the Coder.
- ❌ It does NOT modify any upstream data. It only reads.
- ❌ It does NOT have a meaningful system prompt. Its `systemPrompt` is the literal string `"DETERMINISTIC BLUEPRINT ENGINE"` — a label, not an instruction.

### 7.3 Input: What It Reads

The Blueprinter calls `ledger.read()` on four fields:

```typescript
const planner  = ledger.read('planner')  || {};  // From Planner agent
const architect = ledger.read('architect') || {}; // From Architect agent
const system   = ledger.read('system')    || {};  // From System agent
const designer = ledger.read('designer')  || {};  // From Designer agent
```

From these, it extracts six data arrays:

| Variable | Source | Path | What It Contains |
|----------|--------|------|------------------|
| `filesList` | Architect | `architect.projectStructure.files` | Array of `{ path, module }` — every file in the project |
| `modules` | Architect | `architect.modules` | Array of module definitions |
| `apis` | System | `system.apis` | Array of API endpoint definitions |
| `dbEntities` | System | `system.database.entities` | Array of database entity definitions |
| `pages` | Designer | `designer.pages` | Array of page definitions |
| `components` | Designer | `designer.components` | Array of component definitions |

### 7.4 Phase 1: Data Extraction

Lines 71-81 of [Blueprinter.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/registry/Blueprinter.ts#L71-L81):

```typescript
const filesList   = architect.projectStructure?.files || [];
const modules     = architect.modules || [];
const apis        = system.apis || [];
const dbEntities  = system.database?.entities || [];
const pages       = designer.pages || [];
const components  = designer.components || [];
```

Every extraction uses optional chaining (`?.`) with an empty-array fallback (`|| []`). This means the Blueprinter **never crashes** if an upstream agent produces `null` or missing fields — it just produces empty blueprints for those dimensions.

### 7.5 Phase 2: Global Symbol Table Construction

Lines 86-89:

```typescript
const symbolTable: Record<string, string> = {};
dbEntities.forEach((ent: any) => { if (ent.name) symbolTable[ent.name] = 'database'; });
apis.forEach((api: any) => { if (api.id) symbolTable[api.id] = 'api'; });
components.forEach((comp: any) => { if (comp.name) symbolTable[comp.name] = 'component'; });
```

This builds a flat lookup dictionary mapping symbol names to their origin type:
- Database entity names → `'database'`
- API IDs → `'api'`
- Component names → `'component'`

> [!NOTE]
> The `symbolTable` is constructed but **never directly referenced** later in the current code. It's a pre-built index for potential future use (e.g., detecting unresolved symbols in imports). Currently it serves as a documentation artifact showing what symbols exist in the project.

### 7.6 Phase 3: Language Detection (`getLanguageDetails`)

Lines 92-108. A pure function that maps file extensions to language metadata:

| Extension | Language | Profile |
|-----------|----------|---------|
| `.html` | `HTML` | `HTML` |
| `.css` | `CSS` | `CSS` |
| `.scss` | `SCSS` | `SCSS` |
| `.js` | `JavaScript` | `JavaScript` |
| `.jsx` | `JSX` | `JSX` |
| `.ts` | `TypeScript` | `TypeScript` |
| `.tsx` | `TSX` | `TypeScript` |
| `.py` | `Python` | `Python` |
| `.json` | `JSON` | `JSON` |
| `.sql` | `SQL` | `SQL` |
| `.sh` | `Bash` | `Bash` |
| *(anything else)* | `Generic Text` | `YAML` |

> [!WARNING]
> `.tsx` maps to profile `"TypeScript"`, not `"TSX"`. This is intentional — TSX files share TypeScript validation rules. But `.jsx` maps to profile `"JSX"`, not `"JavaScript"`. This asymmetry could be a source of subtle bugs if validation rules are ever profile-dependent.

### 7.7 Phase 4: Compile Order Assignment (`getCompileOrder`)

Lines 111-133. The core topological priority algorithm. Takes a file path, looks at the **base filename** (not the full path), and assigns an integer priority:

```
┌─────────────────────────────────────────────────────────┐
│ Priority 999: HTML Entry Points                         │
│   Regex: /^(index|main|app)\.(html|htm)$/i              │
│   Files: index.html, main.html, app.htm                 │
│   Why: Entry files must be compiled LAST because they    │
│   reference all other files (JS scripts, CSS links).     │
├─────────────────────────────────────────────────────────┤
│ Priority 1: Infrastructure & Configuration               │
│   Keywords in basename: "config", "constant", "types",   │
│   "db"                                                   │
│   Files: config.js, constants.ts, types.d.ts, db.js      │
│   Why: Everything depends on config and types.           │
├─────────────────────────────────────────────────────────┤
│ Priority 2: Database Layer                               │
│   Keywords: "entity", "model", "schema"                  │
│   Files: User.model.js, schema.prisma, TaskEntity.ts     │
│   Why: Services and APIs depend on data models.          │
├─────────────────────────────────────────────────────────┤
│ Priority 3: Service & Utility Layer                      │
│   Keywords: "service", "util", "helper"                  │
│   Files: taskService.js, dateUtils.ts, authHelper.js     │
│   Why: APIs call services; services call models.         │
├─────────────────────────────────────────────────────────┤
│ Priority 4: API & Routing Layer                          │
│   Keywords: "controller", "route", "api"                 │
│   Files: taskController.js, apiRoutes.ts                 │
│   Why: API layer depends on services and models.         │
├─────────────────────────────────────────────────────────┤
│ Priority 5: UI Components & Views                        │
│   Keywords: "component", "page", "view"                  │
│   Files: TaskList.jsx, DashboardPage.tsx, HomeView.vue   │
│   Why: UI consumes APIs and renders data.                │
├─────────────────────────────────────────────────────────┤
│ Priority 6: Everything Else                              │
│   Files: README.md, .env, package.json, etc.             │
│   Why: Generic files with no specific dependency order.  │
└─────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **The `999` check runs FIRST** (line 114). If a file matches the HTML entry pattern, it gets `999` immediately — the keyword checks below never run. This means a file named `index.html` will **always** be compiled last, even if its name also contains `"config"` or `"api"`.

> [!WARNING]
> The keyword matching uses `name.includes(...)` on the **lowercased basename**. This means a file named `database_config.js` would match BOTH `"config"` (priority 1) and `"db"` (priority 1) — but since `"config"` is checked first (line 117), it returns priority `1`. The match is first-come-first-served within the if-else chain.

### 7.8 Phase 5: Per-File Blueprint Assembly Loop

Lines 135-255. The main `for` loop iterates over every file in `filesList`. For each file, it:

#### Step 1: Extract basics (lines 136-141)
```typescript
const filepath = fileEntry.path;
const moduleName = fileEntry.module;
const langInfo = getLanguageDetails(filepath);
const order = getCompileOrder(filepath);
```

#### Step 2: Find the owning module (lines 143-146)
```typescript
const owningModule = modules.find((m: any) =>
  m.id === moduleName || m.name === moduleName
) || {};
```
Searches `architect.modules[]` for a module whose `id` or `name` matches `fileEntry.module`. Falls back to `{}` if no match.

#### Step 3: Extract feature IDs (line 146)
```typescript
const featureIds = owningModule.supportsFeatures || [];
```
These are the `Feature-XXX` IDs from the Planner that this module implements.

#### Step 4: Trace planner requirement IDs (lines 148-156)
```typescript
planner.features.forEach((feat: any) => {
  if (featureIds.includes(feat.id) && feat.requirements) {
    plannerRequirementIds.push(...feat.requirements);
  }
});
```
For each Planner feature whose ID appears in the module's `supportsFeatures`, if that feature has a `requirements` array, those requirement IDs are collected. This traces **File → Module → Feature → Requirements**.

#### Step 5: Match APIs to features (lines 158-165)
```typescript
apis.forEach((api: any) => {
  if (featureIds.includes(api.featureId)) {
    implementedApis.push(api.id);
  }
});
```
If an API's `featureId` matches one of this file's features, the API is considered "implemented" by this file.

#### Step 6: Match database entities (lines 167-173)
```typescript
if (filepath.includes('db') || filepath.includes('model') ||
    filepath.includes('schema') || filepath.includes('entity')) {
  dbEntities.forEach((ent: any) => { databaseEntities.push(ent.id); });
}
```
If the filepath contains database-related keywords, ALL database entities are linked to this file. This is a **broad match** — it doesn't check which specific entities this file handles.

#### Step 7: Match Designer pages (lines 176-182)
```typescript
const pageMatch = pages.find((p: any) =>
  p.name && filepath.toLowerCase().includes(p.name.toLowerCase())
);
if (pageMatch) { designerPageId = pageMatch.id; }
```
**Fuzzy match**: if the filepath contains the page's `name` (case-insensitive), the page is linked. Example: file `DashboardPage.tsx` matches page named `"DashboardPage"`.

#### Step 8: Match Designer components (lines 184-188)
```typescript
components.forEach((comp: any) => {
  if (comp.name && filepath.toLowerCase().includes(comp.name.toLowerCase())) {
    designerComponentIds.push(comp.id);
  }
});
```
Same fuzzy logic for components.

#### Step 9: Set validation rules by language (lines 190-203)
- **CSS files**: Forbidden constructs = `["HTML", "script", "javascript"]`. Validation = `"Must parse as valid CSS syntax"`.
- **HTML files**: Forbidden = `["inline-style", "inline-javascript"]`. Validation = `"Must parse as valid HTML5 markup"`.
- **TypeScript/TSX files**: Validation = `"Must compile cleanly with no TypeScript diagnostics errors"`.

#### Step 10: Resolve module dependencies (lines 205-209)
```typescript
const dependencyModuleNames: string[] = owningModule.dependsOn || [];
const moduleFileDependencies = filesList
  .filter((f: any) => dependencyModuleNames.includes(f.module) && f.path !== filepath)
  .map((f: any) => f.path);
```
If this file's module depends on other modules, find all files belonging to those dependency modules. These become the file's `dependencies` array.

#### Step 11: Resolve imports/exports (lines 211-226)
For JS/TS files only:
- **Imports**: If an API's `id` appears in the module's `purpose` string or in the filepath, that API is added as an import.
- **Exports**: If a component's `name` appears in the filepath, that component is added as an export.

#### Step 12: Assemble the blueprint object (lines 228-254)
All gathered data is pushed into the `blueprints` array as a single object.

### 7.9 Phase 6: Topological Sorting (`compileAfter` Population)

Lines 257-264:

```typescript
blueprints.forEach((bp: any) => {
  blueprints.forEach((other: any) => {
    if (other.compileOrder < bp.compileOrder) {
      bp.compileAfter.push(other.id);
    }
  });
});
```

This is an O(n²) pass that creates explicit dependency edges. For every blueprint, it finds all other blueprints with a **lower** compile order number and adds their IDs to `compileAfter`.

**Result**: A file with `compileOrder: 5` (UI) will have `compileAfter` containing the IDs of all files with orders `1`, `2`, `3`, and `4`. The Coder will generate those files first.

### 7.10 Phase 7: HTML Asset Injection

Lines 266-292. The final post-processing step for HTML entry files.

```
Pattern: /^(index|main|app)\.(html|htm)$/i
```

For every HTML entry file in the blueprints:

1. **Find JS siblings**: All blueprints with `.js`, `.mjs`, or `.jsx` extensions.
2. **Compute relative paths**: `path.relative(dir_of_html, js_file_path)` with backslash normalization.
3. **Inject script directives**: Adds `REQUIRED: Include <script src="relative/path.js"></script>` to the blueprint's `consumedApis` array.
4. **Find CSS siblings**: All blueprints with `.css` extension.
5. **Inject stylesheet directives**: Adds `REQUIRED: Include <link rel="stylesheet" href="relative/path.css">` to `consumedApis`.

> [!IMPORTANT]
> These directives are placed in `consumedApis` (not a dedicated field). The Coder reads `consumedApis` and sees these `REQUIRED:` prefixed strings, treating them as mandatory instructions to include `<script>` and `<link>` tags in the HTML output. This is how the Blueprinter ensures the generated HTML actually loads its sibling JS/CSS files.

### 7.11 Output: The Final Manifest

The function returns:

```typescript
return { blueprints };
```

The `blueprints` array is sorted by `compileOrder` when the Coder consumes it (the orchestrator sorts it). Each element is a complete instruction set for generating one file.

### 7.12 How the Orchestrator Invokes the Blueprinter

In [orchestrator.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/orchestrator.ts#L874-L948):

1. **Context Resolver runs first** (line 885): `resolveContext()` checks for cross-contract conflicts. If conflicts exist, pipeline pauses with `PAUSE_CONFLICT`.
2. **Blueprinter executes** (line 913): `const bpOutput = await runDeterministic(ledger)`.
3. **Result is written to SML** (lines 918-928): `writeAgentOutput()` stores the blueprint manifest with `model: 'deterministic-service'` and `tokenUsage: 0`.
4. **History log records** (line 930): Logs the blueprint count and execution duration.
5. **SSE event fires** (lines 932-936): Notifies the frontend.

### 7.13 Error Handling & Pipeline Pause

If `runDeterministic()` throws (lines 937-948):
- A `PIPELINE_ERROR` SSE event fires.
- A `Failed` history log is written.
- The conversation status is set to `'Paused'`.
- The pipeline **stops** — it does not retry. Manual intervention is required.

---

## 8. Executive Memory State Model

From [memory.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/memory.ts#L4-L27):

```typescript
interface MemoryState {
  originalPrompt?: string;
  taskSpec: any | null;       // Written by Queen
  planner: any | null;        // Written by Planner
  architect: any | null;      // Written by Architect / SystemsArchitect
  system: any | null;         // Written by System / BackendArchitect
  designer: any | null;       // Written by Designer / UIUXArchitect
  coder: Record<string, any>; // Written by Coder (filepath → code)
  debugger: any | null;       // Written by Debugger
  security: any | null;       // Written by Security / SecurityAuditor
  reviewer: any | null;       // Written by Reviewer / VerificationAgent
  tester: any | null;         // Written by Tester
  invalidated: string[];      // Agents needing re-run
  hashes: Record<string, string>; // filepath → MD5 hash
  decisions: any[];           // Historical LLM decision log
  qualityGateOverride?: boolean;
}
```

---

## 9. OWNERSHIP Contract

From [memory.ts](file:///home/lenovo/Downloads/autocoder-redone-/src/lib/agents/ruflo/memory.ts#L29-L45):

This is the **strict enforcement map** that prevents agents from writing to fields they don't own. If an agent tries to write to a field not listed here, `StageLedger.write()` throws a `DriftEvent` error.

| Agent Name | Allowed Fields |
|:---|:---|
| `Queen` | `['taskSpec']` |
| `Planner` | `['planner']` |
| `Architect` | `['architect']` |
| `SystemsArchitect` | `['architect']` |
| `System` | `['system']` |
| `BackendArchitect` | `['system']` |
| `Designer` | `['designer']` |
| `UIUXArchitect` | `['designer']` |
| `Coder` | `['coder']` |
| `Debugger` | `['debugger']` |
| `Security` | `['security']` |
| `SecurityAuditor` | `['security']` |
| `Reviewer` | `['reviewer']` |
| `VerificationAgent` | `['reviewer']` |
| `Tester` | `['tester']` |

> [!NOTE]
> Notice the aliasing: `SystemsArchitect` and `Architect` both write to `architect`. `BackendArchitect` and `System` both write to `system`. This is the RuFlo Transition aliasing system that maps new pipeline stage names to legacy registry names.

---

## 10. Cross-Reference Traceability Map

This is how IDs chain across agents:

```
Queen.mvpId = "MVP-001"
    │
    ├──► Planner.mvpReference = "MVP-001"
    │       │
    │       ├──► Planner.features[].id = "Feature-001"
    │       │       │
    │       │       ├──► Architect.modules[].supportsFeatures = ["Feature-001"]
    │       │       │       │
    │       │       │       ├──► Blueprinter.blueprints[].featureIds = ["Feature-001"]
    │       │       │       │
    │       │       │       └──► Blueprinter.blueprints[].moduleId = "frontend-entry"
    │       │       │
    │       │       ├──► System.apis[].featureId = "Feature-001"
    │       │       │       │
    │       │       │       └──► Blueprinter.blueprints[].implementedApis = ["API-001"]
    │       │       │
    │       │       ├──► Designer.pages[].supportsFeature = "Feature-001"
    │       │       │       │
    │       │       │       └──► Blueprinter.blueprints[].designerPageId = "Page-Dashboard"
    │       │       │
    │       │       └──► Tester.generatedTestFiles[].coversFeature = "Feature-001"
    │       │               │
    │       │               └──► Tester.testReport.defects[].id = "DEF-001"
    │       │                       │
    │       │                       └──► Debugger.debugReport.issues[].testerDefectId = "DEF-001"
    │       │
    │       └──► Planner.features[].mvpReference = "MVP-001"
    │
    └──► Architect.mvpReference = "MVP-001"
            │
            └──► System.mvpReference = "MVP-001"
                    │
                    └──► Designer.mvpReference = "MVP-001"
```

Every ID in the system traces back to `Queen.mvpId`. This is the **traceability chain** that ensures every file, every API, every test, and every bug report can be traced back to the original user request.

---

## 11. Blueprinter Edge Cases & Known Behaviors

A stranger reading this report should understand how the Blueprinter behaves in non-obvious situations:

### Edge Case 1: Empty `filesList`
If `architect.projectStructure.files` is `[]` or missing, the Blueprinter produces `{ blueprints: [] }`. The Coder loop receives zero blueprints and emits `AGENT_ERROR: No blueprints found in SML. Cannot compile files.`

### Edge Case 2: Module Not Found
If `fileEntry.module` doesn't match any module's `id` or `name` in `architect.modules[]`, the `owningModule` falls back to `{}`. This means:
- `moduleId` = the raw `moduleName` string from the file entry
- `featureIds` = `[]` (no features linked)
- `purpose` = fallback text: `"Implements features for module: undefined"`
- `dependencies` = `[]` (no module dependencies resolved)

The file will still get a blueprint, but it will have no feature traceability.

### Edge Case 3: Database-Keyword False Positives
The database entity matching checks if the filepath `.includes('db')`. This means a file named `sidebar.tsx` would NOT match, but `dbtypes.ts` WOULD match — and it would get ALL database entities linked to it, even if it's just a types file.

### Edge Case 4: Fuzzy Page/Component Name Collision
If the Designer defines a component named `"App"` and the project has a file `app.js`, that file gets `designerComponentIds: ["Component-App"]` even if the file is the entry point and has nothing to do with that specific component. The match is purely string-contains on the lowercased filepath.

### Edge Case 5: Multiple HTML Entry Points
If the Architect defines both `index.html` and `app.html`, BOTH get `compileOrder: 999` and BOTH get JS/CSS sibling injection. Each HTML file independently discovers all JS and CSS siblings in the project.

### Edge Case 6: The `interfaces`, `classes`, `functions` Arrays
These are always `[]` in the current implementation. They exist as reserved fields in the schema for future static analysis capabilities but are never populated by the current Blueprinter logic.

---

## 12. Glossary of Key Terms

| Term | Definition |
|:---|:---|
| **SML** | Structured Memory Layer — the Prisma-backed database tables (`AgentOutput`, `ExecutionHistory`, `ExecutiveMemory`) |
| **StageLedger** | In-memory class wrapping `ExecutiveMemory` state with read/write/query access control |
| **Executive Memory** | Single JSON blob per conversation containing all agent states |
| **OWNERSHIP** | Frozen object mapping agent names to the `MemoryState` fields they're allowed to write |
| **Blueprint** | A per-file instruction object containing language, compile order, dependencies, APIs, UI components, and validation rules |
| **Compile Order** | Integer priority (1-999) determining which files the Coder generates first |
| **Oscillation Detection** | MD5-based loop prevention that throws if a file returns to a previously seen content state |
| **Approval Gate** | Pipeline pause after SystemsArchitect for user review |
| **Quality Gate** | Pipeline pause after Reviewer if `error`-severity annotations exist |
| **Context Resolver** | Deterministic cross-contract validator that runs before the Blueprinter |
| **Specialist Recovery** | Event-triggered Debugger agent that patches code and rewinds the validation loop |
| **SSE** | Server-Sent Events — real-time log stream from `/api/pipeline/stream` to the browser |
| **DriftEvent** | Error thrown when an agent tries to write to a `MemoryState` field it doesn't own |

---

> **End of Document**
>
> This report covers all 11 agents, their exact JSON output schemas (165+ fields documented), the Blueprinter's 7-phase deterministic algorithm (296 lines of TypeScript explained line-by-line), the Executive Memory state model, the OWNERSHIP enforcement contract, the full cross-reference traceability chain, edge case behavior analysis, and a complete glossary. A stranger with zero prior context should be able to understand the entire data flow from user prompt to final compiled application.
