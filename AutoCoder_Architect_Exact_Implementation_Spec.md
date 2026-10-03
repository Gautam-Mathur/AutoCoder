# AutoCoder Architect RCA Fix

## AGI Implementation Specification, Exact Patch Plan, Code-Level Instructions, Tests, and Recursive Verification

**Repository:** `Gautam-Mathur/AutoCoder`\
**Base revision audited:** `c9116813676ecd3068f79ae624e19b82b5b5454c`\
**Purpose:** Give an implementation agent an exact, deterministic
specification for fixing the Architect pipeline failure.\
**Instruction to implementing AGI:** Implement this document as written.
Do not redesign the architecture, do not weaken validators, do not add
application-specific whitelists, and do not "improve" unrelated code.

------------------------------------------------------------------------

# 0. IMPLEMENTATION CONTRACT

You are modifying an existing production pipeline.

The implementation must preserve existing behavior outside the
explicitly listed changes.

Do NOT:

-   rewrite unrelated pipeline stages;
-   replace the validation system with LLM judgment;
-   remove `validateArchitectureArtifact`;
-   remove `isValidNextDynamicSegment`;
-   whitelist `ProductCard`;
-   whitelist `SearchBar`;
-   whitelist `Prisma client`;
-   ignore `src/app/layout.tsx`;
-   ignore `src/public/**`;
-   convert `[...]` into `[...slug]`;
-   silently repair invalid Architect output before validation;
-   make validation warnings instead of errors;
-   change the Architect retry count;
-   change the model temperature;
-   change downstream Blueprint/Coder contracts unless a regression test
    proves it is necessary.

The target result is:

``` text
authoritative specs
        |
        v
Architect prompt
        |
        v
strict architecture parser
        |
        v
architecture contract
        |
        v
validation
        |
   +----+----+
   |         |
 invalid    valid
   |         |
 retry      persist
   |         |
   +-----> downstream
```

------------------------------------------------------------------------

# 1. CURRENT CODEBASE FACTS

At the audited revision:

## 1.1 Architect artifact dependencies

`orchestrator.ts` contains:

``` ts
const STAGE_ARTIFACT_DEPS: Record<string, string[]> = {
  'Queen':       [],
  'Planner':     ['plan.md'],
  'Architect':   ['plan.md', 'requirements.md'],
  ...
};
```

Therefore Architect is explicitly declared to require:

``` text
plan.md
requirements.md
```

## 1.2 Artifact resolver

`buildArtifactContext()` reads the required VFS files and emits:

``` text
=== ARTIFACT: plan.md ===
...
=== END ARTIFACT: plan.md ===

=== ARTIFACT: requirements.md ===
...
=== END ARTIFACT: requirements.md ===
```

## 1.3 Existing `runAgent()` bug

Current code contains:

``` ts
const upstreamContext = await buildArtifactContext(conversationId, agentName);

const baseUserContent =
  customUserContent ||
  (
    upstreamContext
      ? `Upstream Specification Context:\n${upstreamContext}\n\nOriginal Request:\n"${userPromptText}"`
      : `Original Request:\n"${userPromptText}"`
  );
```

The Architect caller always supplies non-empty `customUserContent`.

Therefore:

``` text
customUserContent
```

wins over:

``` text
upstreamContext
```

and the Architect may not receive `plan.md` or `requirements.md`.

## 1.4 Existing Architect caller

The current Architect stage constructs:

``` ts
let customContext = extraContext || '';

if (validationErrorFeedback) {
  customContext += `=== ARCHITECT VALIDATION FAILURE ...`;
}

stageOutput = await runAgent(
  conversationId,
  'Architect',
  userPrompt,
  emit,
  ledger,
  attempt,
  customContext,
  executionSignal,
  validationErrorFeedback
);
```

## 1.5 Existing parser problem

`validateArchitectureArtifact()` currently uses:

``` ts
const moduleHeaderRegex =
  /(?:^|\n)(?:###|\*\*)\s*\[?([^\*\#\]\r\n]+?)\]?(?:\*\*)?(?=\r?\n|$)/g;
```

This is too permissive.

It can cause Markdown field lines or malformed lines to be interpreted
as module declarations.

## 1.6 Existing dependency validation

Current validator treats:

``` text
Depends On:
```

as references to declared module names.

That behavior MUST remain.

The problem is generation semantics, not that unknown dependencies
should be accepted.

## 1.7 Existing route validation

`isValidNextDynamicSegment()` already correctly rejects:

``` text
[...]
```

and accepts:

``` text
[id]
[...slug]
[[...slug]]
```

Do not weaken this rule.

## 1.8 Existing Architect persistence problem

`runAgent()` currently does:

``` ts
const outputFilename = VFS_OUTPUT_MAP[agentName];

if (outputFilename) {
  await writeVirtualFile(conversationId, outputFilename, finalContent);
}
```

before the Architect caller validates the candidate.

Therefore an invalid candidate temporarily becomes `architecture.md`.

This must become transactional for Architect.

------------------------------------------------------------------------

# 2. REQUIRED FINAL BEHAVIOR

After implementation:

## Architect attempt 1 input MUST contain

``` text
system prompt
+
plan.md
+
requirements.md
+
original user request
```

## Architect retry input MUST contain

``` text
system prompt
+
plan.md
+
requirements.md
+
original user request
+
validation failure feedback
```

## Architect candidate MUST NOT be persisted as canonical `architecture.md` until validation succeeds.

## Module parser MUST recognize only actual module declarations.

## `Depends On` MUST resolve only to declared module names.

## Next.js route validation MUST remain strict.

## Framework special files such as:

``` text
src/app/layout.tsx
src/app/page.tsx
src/app/**/route.ts
```

must be owned by exactly one module if they appear in the tree.

## Static assets MUST follow the explicit Next.js public-directory policy:

``` text
public/
```

not:

``` text
src/public/
```

unless the project specification explicitly requires otherwise.

------------------------------------------------------------------------

# 3. FILES TO MODIFY

Modify only these files unless compilation proves another directly
dependent file requires a change:

``` text
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/registry/Architect.ts
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

Potentially add:

``` text
src/lib/agents/ruflo/architecture-parser.ts
```

ONLY if the implementation agent determines that extracting the parser
into a dedicated module materially improves testability.

Preferred implementation: keep parser in `spec-contract.ts` unless file
size or circular dependency becomes a real problem.

Do not add dependencies.

------------------------------------------------------------------------

# 4. PATCH 1: FIX ARCHITECT CONTEXT COMPOSITION

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## LOCATION

Inside:

``` ts
export async function runAgent(...)
```

Current code:

``` ts
const upstreamContext = await buildArtifactContext(conversationId, agentName);

const constraintsBlock = `\n\nActive System Constraints:
- Output MUST be valid structured markdown matching the exact header specifications.
- Do NOT wrap your entire response in markdown code blocks (\`\`\`markdown). Return raw text directly.`;

const systemInstructions = agentDef.systemPrompt + constraintsBlock;
const retryPrefix = attempt > 1 ? `[RETRY ${attempt}/3] Your previous output failed verification. Error: ${validationError || 'Ensure ALL required section headers are present.'}.\n\n` : '';
const baseUserContent = customUserContent || (upstreamContext ? `Upstream Specification Context:\n${upstreamContext}\n\nOriginal Request:\n"${userPromptText}"` : `Original Request:\n"${userPromptText}"`);
const userContent = retryPrefix + baseUserContent;
```

## REPLACE WITH

``` ts
const upstreamContext = await buildArtifactContext(conversationId, agentName);

const constraintsBlock = `\n\nActive System Constraints:
- Output MUST be valid structured markdown matching the exact header specifications.
- Do NOT wrap your entire response in markdown code blocks (\`\`\`markdown). Return raw text directly.`;

const systemInstructions = agentDef.systemPrompt + constraintsBlock;

const retryPrefix =
  attempt > 1
    ? `[RETRY ${attempt}/3] Your previous output failed verification. Error: ${
        validationError || 'Ensure ALL required section headers are present.'
      }.\n\n`
    : '';

const contextParts: string[] = [];

if (upstreamContext.trim()) {
  contextParts.push(
    `Upstream Specification Context:\n${upstreamContext.trim()}`
  );
}

if (customUserContent?.trim()) {
  contextParts.push(customUserContent.trim());
}

contextParts.push(`Original Request:\n"${userPromptText}"`);

const baseUserContent = contextParts.join('\n\n');

const userContent = retryPrefix + baseUserContent;
```

## IMPORTANT

This changes the semantic contract from:

``` text
custom content OR upstream context
```

to:

``` text
upstream context
+
custom stage context
+
original request
```

This is intentional.

------------------------------------------------------------------------

# 5. PATCH 2: ADD CONTEXT-INVARIANT TELEMETRY

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## LOCATION

Immediately after:

``` ts
const userContent = retryPrefix + baseUserContent;
```

ADD:

``` ts
const requiredArtifactNames = STAGE_ARTIFACT_DEPS[agentName] ?? [];

const contextTelemetry = {
  requiredArtifacts: requiredArtifactNames,
  upstreamContextIncluded: upstreamContext.trim().length > 0,
  customContextIncluded: !!customUserContent?.trim(),
  originalRequestIncluded: userContent.includes('Original Request:'),
  requiredArtifactsPresent: requiredArtifactNames.map((artifact) => ({
    artifact,
    included: userContent.includes(`=== ARTIFACT: ${artifact} ===`),
  })),
};
```

Do NOT log raw artifact contents separately.

------------------------------------------------------------------------

# 6. PATCH 3: FAIL FAST IF REQUIRED ARCHITECT ARTIFACTS ARE MISSING FROM INPUT

This is a safety invariant.

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## LOCATION

Immediately after the `contextTelemetry` block.

ADD:

``` ts
if (agentName === 'Architect') {
  const missingRequiredContext = contextTelemetry.requiredArtifactsPresent
    .filter((item) => !item.included)
    .map((item) => item.artifact);

  if (missingRequiredContext.length > 0) {
    throw new Error(
      `Architect context invariant violated. Required artifacts were not included in the inference input: ${missingRequiredContext.join(', ')}`
    );
  }
}
```

This is deliberate.

Do not allow the Architect to silently run without the artifacts that
the pipeline declares it requires.

------------------------------------------------------------------------

# 7. PATCH 4: INCLUDE CONTEXT TELEMETRY IN RICH TELEMETRY

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## LOCATION

Current:

``` ts
inflow: { systemInstructions, userContent },
```

REPLACE WITH:

``` ts
inflow: {
  systemInstructions,
  userContent,
  context: contextTelemetry,
},
```

Do not include duplicated raw artifact fields.

------------------------------------------------------------------------

# 8. PATCH 5: MAKE ARCHITECT PERSISTENCE TRANSACTIONAL

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## FUNCTION

``` ts
runAgent(...)
```

## CHANGE SIGNATURE

Current tail:

``` ts
validationError?: string,
targetFile?: string
```

Change to:

``` ts
validationError?: string,
targetFile?: string,
persistOutput: boolean = true
```

Therefore the full signature becomes:

``` ts
export async function runAgent(
  conversationId: string,
  agentName: string,
  userPromptText: string,
  rawOnEvent: PipelineEventCallback,
  ledger: StageLedger,
  attempt: number = 1,
  customUserContent?: string,
  signal?: AbortSignal,
  validationError?: string,
  targetFile?: string,
  persistOutput: boolean = true
): Promise<any> {
```

Do not reorder existing parameters.

------------------------------------------------------------------------

# 9. PATCH 6: GATE VFS WRITE

Current:

``` ts
const outputFilename = VFS_OUTPUT_MAP[agentName];

if (outputFilename) {
  await writeVirtualFile(conversationId, outputFilename, finalContent);
}
```

REPLACE WITH:

``` ts
const outputFilename = VFS_OUTPUT_MAP[agentName];

if (outputFilename && persistOutput) {
  await writeVirtualFile(conversationId, outputFilename, finalContent);
}
```

This preserves existing behavior for every stage except the Architect
call where we explicitly disable persistence until validation passes.

------------------------------------------------------------------------

# 10. PATCH 7: ARCHITECT MUST CALL `runAgent()` WITH `persistOutput = false`

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## LOCATION

Architect stage.

Current:

``` ts
stageOutput = await runAgent(
  conversationId,
  'Architect',
  userPrompt,
  emit,
  ledger,
  attempt,
  customContext,
  executionSignal,
  validationErrorFeedback
);
```

REPLACE WITH:

``` ts
stageOutput = await runAgent(
  conversationId,
  'Architect',
  userPrompt,
  emit,
  ledger,
  attempt,
  customContext,
  executionSignal,
  validationErrorFeedback,
  undefined,
  false
);
```

The final two arguments are:

``` text
targetFile = undefined
persistOutput = false
```

------------------------------------------------------------------------

# 11. PATCH 8: PERSIST ONLY AFTER ARCHITECT ACCEPTANCE

## FILE

``` text
src/lib/agents/ruflo/orchestrator.ts
```

## LOCATION

Inside:

``` ts
if (validation.valid) {
```

Current:

``` ts
if (validation.valid) {
  accepted = true;
  break;
}
```

REPLACE WITH:

``` ts
if (validation.valid) {
  await writeVirtualFile(
    conversationId,
    'architecture.md',
    stageOutput.content
  );

  accepted = true;
  break;
}
```

This creates the intended transaction:

``` text
candidate
  |
  v
validate
  |
  +---- invalid ---> retry
  |
  +---- valid -----> persist
```

------------------------------------------------------------------------

# 12. PATCH 9: DO NOT CLEAR A PREVIOUS ACCEPTED ARCHITECTURE ON FAILED RETRY

Current final failure code:

``` ts
await writeVirtualFile(conversationId, 'architecture.md', '');
```

REPLACE IT WITH:

``` ts
// The Architect candidate was never persisted because persistOutput=false.
// Preserve any previously accepted architecture.md instead of clearing it.
```

Then remove the write.

The final failure block becomes:

``` ts
} else {
  const errSummary = validation.errors.join('; ');

  emit({
    type: 'PIPELINE_ERROR',
    message: `Architect validation failed after ${attempt} attempts: ${errSummary}`,
  });

  throw new Error(
    `Architect validation failed after ${attempt} attempts: ${errSummary}`
  );
}
```

## IMPORTANT

Do not clear the previous accepted architecture.

If the conversation is a fresh run, there will be no accepted artifact.

If this is a resumed/retried run, the previously accepted artifact must
not be destroyed by a failed candidate.

------------------------------------------------------------------------

# 13. PATCH 10: ADD A STRICT ARCHITECTURE MODULE PARSER

## FILE

``` text
src/lib/agents/ruflo/spec-contract.ts
```

Add these interfaces before `validateArchitectureArtifact()`:

``` ts
export interface ParsedArchitectureModule {
  name: string;
  responsibility: string;
  ownedFiles: string[];
  dependsOn: string[];
  supportsFeatures: string[];
  startLine: number;
  endLine: number;
}

export interface ParsedArchitectureArtifact {
  treeFiles: string[];
  modules: ParsedArchitectureModule[];
  parserErrors: string[];
}
```

------------------------------------------------------------------------

# 14. STRICT MODULE HEADER GRAMMAR

The ONLY accepted module declaration syntax should be:

``` text
**Module Name**
```

A module name:

-   must occupy the complete line;
-   must not contain `*`;
-   must not contain newline;
-   must not start with `-`;
-   must not contain `:`;
-   must be at least 1 character;
-   should be no longer than 120 characters.

Use:

``` ts
const MODULE_HEADER_RE = /^\*\*\s*([^*\r\n]+?)\s*\*\*\s*$/;
```

Do NOT use the existing broad regex.

------------------------------------------------------------------------

# 15. STRICT MODULE FIELD GRAMMAR

Recognize only these fields:

``` text
- Responsibility:
- Owned Files:
- Depends On:
- Supports Features:
```

Use:

``` ts
const RESPONSIBILITY_RE = /^-\s*Responsibility:\s*(.*)$/i;
const OWNED_FILES_RE = /^-\s*Owned Files:\s*(.*)$/i;
const DEPENDS_ON_RE = /^-\s*Depends On:\s*(.*)$/i;
const SUPPORTS_FEATURES_RE = /^-\s*Supports Features:\s*(.*)$/i;
```

A field line MUST NEVER become a module.

------------------------------------------------------------------------

# 16. IMPLEMENT `parseArchitectureModules()`

Add:

``` ts
export function parseArchitectureModules(
  architectureContent: string
): {
  modules: ParsedArchitectureModule[];
  errors: string[];
} {
  const lines = architectureContent.replace(/\r\n/g, '\n').split('\n');

  const modules: ParsedArchitectureModule[] = [];
  const errors: string[] = [];

  const modulesHeadingIndex = lines.findIndex((line) =>
    /^###\s*Modules\s*$/i.test(line.trim())
  );

  if (modulesHeadingIndex === -1) {
    return {
      modules: [],
      errors: ['Architecture Parser Error: Missing "### Modules" section.'],
    };
  }

  const conventionsHeadingIndex = lines.findIndex(
    (line, index) =>
      index > modulesHeadingIndex &&
      /^###\s*Conventions\s*$/i.test(line.trim())
  );

  const endIndex =
    conventionsHeadingIndex === -1
      ? lines.length
      : conventionsHeadingIndex;

  let current: ParsedArchitectureModule | null = null;
  let currentStartLine = -1;

  const finishCurrent = (endLine: number) => {
    if (!current) return;

    current.endLine = endLine;

    if (!current.responsibility.trim()) {
      errors.push(
        `Architecture Parser Error: Module "${current.name}" is missing "- Responsibility:".`
      );
    }

    if (current.ownedFiles.length === 0) {
      errors.push(
        `Architecture Parser Error: Module "${current.name}" has no "- Owned Files:" entries.`
      );
    }

    modules.push(current);
    current = null;
    currentStartLine = -1;
  };

  for (let index = modulesHeadingIndex + 1; index < endIndex; index++) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) continue;

    const moduleMatch = line.match(MODULE_HEADER_RE);

    if (moduleMatch) {
      finishCurrent(index);

      const name = moduleMatch[1].trim();

      if (!name || name.includes(':')) {
        errors.push(
          `Architecture Parser Error: Invalid module name "${name}".`
        );
        continue;
      }

      currentStartLine = index + 1;

      current = {
        name,
        responsibility: '',
        ownedFiles: [],
        dependsOn: [],
        supportsFeatures: [],
        startLine: currentStartLine,
        endLine: currentStartLine,
      };

      continue;
    }

    if (!current) {
      errors.push(
        `Architecture Parser Error: Unexpected content in "### Modules" at line ${index + 1}: "${line}"`
      );
      continue;
    }

    const responsibilityMatch = line.match(RESPONSIBILITY_RE);
    if (responsibilityMatch) {
      current.responsibility = responsibilityMatch[1].trim();
      continue;
    }

    const ownedFilesMatch = line.match(OWNED_FILES_RE);
    if (ownedFilesMatch) {
      const rawFiles = ownedFilesMatch[1].trim();

      if (
        rawFiles &&
        rawFiles.toLowerCase() !== 'none'
      ) {
        current.ownedFiles = rawFiles
          .split(/[,;]/)
          .map((file) =>
            file
              .trim()
              .replace(/[*`'"]/g, '')
              .replace(/^\.\/+/, '')
              .replace(/^\/+/, '')
          )
          .filter(Boolean);
      }

      continue;
    }

    const dependsOnMatch = line.match(DEPENDS_ON_RE);
    if (dependsOnMatch) {
      const rawDeps = dependsOnMatch[1].trim();

      if (
        rawDeps &&
        rawDeps.toLowerCase() !== 'none'
      ) {
        current.dependsOn = rawDeps
          .split(/[,;]/)
          .map((dep) =>
            dep
              .trim()
              .replace(/[*`'"]/g, '')
          )
          .filter(Boolean);
      }

      continue;
    }

    const supportsFeaturesMatch = line.match(SUPPORTS_FEATURES_RE);
    if (supportsFeaturesMatch) {
      const rawFeatures = supportsFeaturesMatch[1].trim();

      if (
        rawFeatures &&
        rawFeatures.toLowerCase() !== 'none'
      ) {
        current.supportsFeatures = rawFeatures
          .split(/[,;]/)
          .map((feature) =>
            feature.trim().replace(/[*`'"]/g, '')
          )
          .filter(Boolean);
      }

      continue;
    }

    // Ignore continuation prose inside a module.
    // Do NOT interpret arbitrary Markdown as another module.
  }

  finishCurrent(endIndex);

  const seen = new Set<string>();

  for (const module of modules) {
    const key = module.name.toLowerCase();

    if (seen.has(key)) {
      errors.push(
        `Architecture Parser Error: Duplicate module declaration "${module.name}".`
      );
    }

    seen.add(key);
  }

  return {
    modules,
    errors,
  };
}
```

------------------------------------------------------------------------

# 17. IMPORTANT PARSER BEHAVIOR

This parser MUST parse:

``` text
**Frontend Module**
- Responsibility: Main frontend
- Owned Files: src/app/page.tsx
- Depends On: None
- Supports Features: Catalog
```

as:

``` json
{
  "name": "Frontend Module",
  "responsibility": "Main frontend",
  "ownedFiles": ["src/app/page.tsx"],
  "dependsOn": [],
  "supportsFeatures": ["Catalog"]
}
```

It MUST NOT parse:

``` text
- Responsibility: Main frontend
```

as a module.

It MUST NOT parse:

``` text
- Owned Files: ...
```

as a module.

It MUST NOT parse:

``` text
- Depends On: ...
```

as a module.

------------------------------------------------------------------------

# 18. REPLACE `validateArchitectureArtifact()` MODULE PARSING

Delete the existing block beginning with:

``` ts
const moduleHeaderRegex = ...
```

through the construction of:

``` ts
allDeclaredModulesMap
```

Replace it with:

``` ts
const parsedModules = parseArchitectureModules(architectureContent);

for (const parserError of parsedModules.errors) {
  errors.push(parserError);
}

const fileToModulesMap = new Map<string, string[]>();
const allModuleOwnedFiles = new Set<string>();
const allDeclaredModulesMap = new Map<
  string,
  { name: string; deps: string[] }
>();

for (const module of parsedModules.modules) {
  for (const rawFile of module.ownedFiles) {
    const cleanF = rawFile
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .toLowerCase();

    if (!cleanF) continue;

    allModuleOwnedFiles.add(cleanF);

    const existingMods = fileToModulesMap.get(cleanF) || [];
    existingMods.push(module.name);
    fileToModulesMap.set(cleanF, existingMods);
  }

  allDeclaredModulesMap.set(module.name.toLowerCase(), {
    name: module.name,
    deps: module.dependsOn,
  });
}
```

------------------------------------------------------------------------

# 19. KEEP OWNERSHIP VALIDATION

Do NOT remove:

``` text
duplicate ownership
orphan module file
unclaimed tree file
```

The existing checks should continue to operate against:

``` text
fileToModulesMap
allModuleOwnedFiles
allDeclaredModulesMap
```

------------------------------------------------------------------------

# 20. ADD MODULE NAME VALIDATION

After parsing modules:

``` ts
for (const module of parsedModules.modules) {
  if (module.name.length > 120) {
    errors.push(
      `Architecture Parser Error: Module "${module.name}" exceeds the 120-character module-name limit.`
    );
  }

  if (module.name.includes(':')) {
    errors.push(
      `Architecture Parser Error: Module "${module.name}" contains ":" and is not a valid module identifier.`
    );
  }

  if (module.name.startsWith('-')) {
    errors.push(
      `Architecture Parser Error: Module "${module.name}" begins with a Markdown list marker and is invalid.`
    );
  }
}
```

------------------------------------------------------------------------

# 21. KEEP DEPENDENCY VALIDATION STRICT

Keep the existing semantic rule:

``` ts
for (const [modLower, modInfo] of allDeclaredModulesMap.entries()) {
  for (const depName of modInfo.deps) {
    const depLower = depName.toLowerCase();

    if (depLower === modLower) {
      errors.push(
        `Architecture Contract Error: Module "${modInfo.name}" cannot depend on itself.`
      );
    } else if (!allDeclaredModulesMap.has(depLower)) {
      errors.push(
        `Architecture Contract Error: Module "${modInfo.name}" depends on unknown module "${depName}".`
      );
    }
  }
}
```

Do NOT weaken this.

------------------------------------------------------------------------

# 22. ADD DEPENDENCY SEMANTIC VALIDATION

Unknown module dependencies should still fail.

Additionally, detect obviously non-module dependency forms and provide a
clearer message.

Add:

``` ts
function looksLikeArchitectureModuleName(value: string): boolean {
  const clean = value.trim();

  if (!clean) return false;

  if (
    clean.includes('/') ||
    clean.includes('\\') ||
    clean.includes('@') ||
    clean.includes('.') ||
    clean.includes(':')
  ) {
    return false;
  }

  return true;
}
```

Then inside dependency validation:

``` ts
for (const [modLower, modInfo] of allDeclaredModulesMap.entries()) {
  for (const depName of modInfo.deps) {
    const depLower = depName.toLowerCase();

    if (!looksLikeArchitectureModuleName(depName)) {
      errors.push(
        `Architecture Contract Error: Module "${modInfo.name}" has invalid dependency "${depName}". "Depends On" must contain declared architecture module names only, not files, packages, components, or technologies.`
      );
      continue;
    }

    if (depLower === modLower) {
      errors.push(
        `Architecture Contract Error: Module "${modInfo.name}" cannot depend on itself.`
      );
    } else if (!allDeclaredModulesMap.has(depLower)) {
      errors.push(
        `Architecture Contract Error: Module "${modInfo.name}" depends on unknown module "${depName}".`
      );
    }
  }
}
```

IMPORTANT:

Do NOT reject every natural-language module name.

For example:

``` text
Product Catalog
Database Layer
Storefront UI
API Routes
```

are valid module names.

The function only rejects obvious file/package/technology syntax.

------------------------------------------------------------------------

# 23. ADD MODULE DEPENDENCY CYCLE DETECTION

The current validator rejects self-dependencies but not multi-module
cycles.

Add:

``` ts
function detectModuleDependencyCycles(
  modules: Map<string, { name: string; deps: string[] }>
): string[] {
  const errors: string[] = [];

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string) => {
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cycle =
        cycleStart >= 0
          ? [...stack.slice(cycleStart), node]
          : [...stack, node];

      errors.push(
        `Architecture Contract Error: Module dependency cycle detected: ${cycle.join(' -> ')}.`
      );

      return;
    }

    if (visited.has(node)) return;

    visiting.add(node);
    stack.push(node);

    const info = modules.get(node);

    if (info) {
      for (const dep of info.deps) {
        const depLower = dep.toLowerCase();

        if (modules.has(depLower)) {
          visit(depLower);
        }
      }
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  for (const key of modules.keys()) {
    visit(key);
  }

  return errors;
}
```

After building `allDeclaredModulesMap`, call:

``` ts
errors.push(
  ...detectModuleDependencyCycles(allDeclaredModulesMap)
);
```

------------------------------------------------------------------------

# 24. NEXT.JS PUBLIC ASSET POLICY

Add:

``` ts
function validateNextPublicAssetPath(
  treeFiles: string[],
  framework: ProjectContract['framework']
): string[] {
  if (
    framework !== 'NEXT_APP_ROUTER' &&
    framework !== 'NEXT_PAGES_ROUTER'
  ) {
    return [];
  }

  const errors: string[] = [];

  for (const file of treeFiles) {
    const clean = file.replace(/\\/g, '/');

    if (/^src\/public\//i.test(clean)) {
      errors.push(
        `Next.js Architecture Error: Static public asset "${file}" must be placed under project-root "public/" rather than "src/public/".`
      );
    }
  }

  return errors;
}
```

Then after framework determination in `validateArchitectureArtifact()`:

``` ts
errors.push(
  ...validateNextPublicAssetPath(treeFiles, framework)
);
```

------------------------------------------------------------------------

# 25. IMPORTANT PUBLIC-ASSET EXCEPTION

Do NOT reject:

``` text
src/public/
```

if the project specification explicitly requires it.

Implement the exception using a contract-level signal rather than
hard-coded application knowledge.

For the first implementation, if no explicit contract field exists, use
the strict default.

Do NOT invent a new broad exception mechanism just to make the current
failing fixture pass.

------------------------------------------------------------------------

# 26. NEXT.JS FRAMEWORK SPECIAL FILE OWNERSHIP

Do NOT add:

``` text
src/app/layout.tsx
```

to `IGNORED_ROOT_FILES`.

Do NOT add:

``` text
src/app/page.tsx
src/app/**/route.ts
```

to ignored files.

The existing unclaimed-file validation MUST continue to require
ownership.

------------------------------------------------------------------------

# 27. TIGHTEN BACKEND ENTRY VALIDATION

Current condition:

``` ts
if (!/(^|\/)app\/.*route\.(ts|tsx|js|jsx)$/i.test(cleanEntry) && !cleanEntry.endsWith('/route.ts')) {
```

The second condition is too broad.

Replace with:

``` ts
const isNextAppRouteHandler =
  /^(?:src\/)?app\/.+\/route\.(ts|tsx|js|jsx)$/i.test(cleanEntry);
```

Then:

``` ts
if (!isNextAppRouteHandler) {
  errors.push(
    `Next.js Architecture Error: Backend Entry Point "${entry}" must be a valid Next.js App Router route handler (e.g., "src/app/api/[...slug]/route.ts").`
  );
}
```

Do not allow:

``` text
src/foo/route.ts
```

to pass as a Next App Router backend entry.

------------------------------------------------------------------------

# 28. DO NOT SANITIZE INVALID ROUTES

Do NOT add code such as:

``` ts
entry.replace('[...]', '[...slug]')
```

or:

``` ts
path.replace(/\[\.\.\.\]/g, '[...slug]')
```

The validator must report invalid architecture.

The retry mechanism is responsible for regeneration.

------------------------------------------------------------------------

# 29. PATCH ARCHITECT PROMPT

## FILE

``` text
src/lib/agents/ruflo/registry/Architect.ts
```

Inside the `### Modules` section, replace:

``` text
- Depends On: Other module names this module imports from, or "None"
```

with:

``` text
- Depends On: ONLY names of modules declared in the "### Modules" section, or "None"
```

Then immediately after the module format add:

``` text
MODULE DEPENDENCY RULE:
- "Depends On" is an architecture-module graph, not a general usage list.
- Every value in "Depends On" MUST exactly match the name of another declared module.
- Never put a filename in "Depends On".
- Never put a component name in "Depends On".
- Never put a package name in "Depends On".
- Never put a framework name in "Depends On".
- Never put a database client in "Depends On".
- Never put an integration name in "Depends On".

INVALID examples:
- ProductCard
- SearchBar
- Prisma
- Prisma client
- @prisma/client
- Stripe
- React
- Next.js
- src/lib/prisma.ts

VALID examples:
- Storefront Components
- Data Access Module
- API Routes
- Payment Integration

If no other architecture module is required:
- Depends On: None
```

------------------------------------------------------------------------

# 30. PATCH ARCHITECT PROMPT: NEXT.JS FILE RULES

Inside the Next.js rules add:

``` text
NEXT.JS APP ROUTER FILE RULES:
- The root App Router page may be app/page.tsx or src/app/page.tsx.
- A root layout may be app/layout.tsx or src/app/layout.tsx when the application requires a root layout.
- Framework special files that appear in the Project Folder Structure are still real architecture files and MUST be owned by exactly one module.
- Static public assets belong in the project-root public/ directory.
- Do NOT create src/public/ for standard Next.js public assets.
- Never invent src/public/ solely because other source files are under src/.
```

------------------------------------------------------------------------

# 31. PATCH ARCHITECT PROMPT: MODULE OWNERSHIP

Replace the existing ownership rule with:

``` text
MODULE OWNERSHIP INVARIANT:
- Every file in Project Folder Structure that is not an explicitly exempt root configuration file MUST appear in exactly one module's Owned Files.
- Every Owned Files entry MUST exist in Project Folder Structure.
- Do not omit framework special files.
- Do not omit layout.tsx.
- Do not omit route.ts.
- Do not omit public assets.
- Do not create module names from field lines such as "Responsibility", "Owned Files", "Depends On", or "Supports Features".
```

------------------------------------------------------------------------

# 32. PATCH ARCHITECT PROMPT: EXPLICIT INVALID EXAMPLE

Add:

``` text
NEVER produce:

**Storefront**
- Responsibility: Renders the storefront
- Owned Files: src/app/page.tsx
- Depends On: ProductCard, SearchBar

because ProductCard and SearchBar are component/file concepts, not declared architecture modules.

Instead:

**Storefront**
- Responsibility: Renders the storefront
- Owned Files: src/app/page.tsx, src/components/ProductCard.tsx, src/components/SearchBar.tsx
- Depends On: Data Access
- Supports Features: Product browsing

where "Data Access" must be another declared module.
```

------------------------------------------------------------------------

# 33. PATCH ARCHITECT PROMPT: INVALID ROUTE EXAMPLES

Keep the existing rule and strengthen it:

``` text
NEXT.JS ROUTE SEGMENT RULE:
- [id] is valid.
- [...slug] is valid.
- [[...slug]] is valid.
- [...] is ALWAYS invalid.
- [] is invalid.
- [[] is invalid.
- [...]/route.ts is invalid.
- Never infer or invent an unnamed catch-all segment.
- If a catch-all route is required, choose a meaningful parameter name such as [...slug].
```

------------------------------------------------------------------------

# 34. PATCH ARCHITECT PROMPT: OUTPUT COMPLETENESS

Add:

``` text
FINAL SELF-CHECK BEFORE OUTPUT:
1. Every tree file has exactly one module owner.
2. Every module-owned file exists in the tree.
3. Every Depends On value exactly matches a declared module name.
4. No component/package/technology appears in Depends On.
5. Every Next.js dynamic segment is named.
6. No src/public/ asset path exists unless explicitly required.
7. Backend Entry Point is a valid Next.js App Router route handler when Next App Router is selected.
8. Output starts exactly at ### Tech Stack.
9. Output ends after ### Conventions.
```

------------------------------------------------------------------------

# 35. PATCH ARCHITECT PROMPT: CONTEXT HONESTY

Change the first sentence from:

``` text
You receive the complete project specification (plan.md) and feature requirements (requirements.md)
```

to:

``` text
You receive authoritative upstream project specification artifacts, including plan.md and requirements.md, plus the original user request. Treat these artifacts as authoritative project constraints.
```

This matches the intended runtime contract.

------------------------------------------------------------------------

# 36. ARCHITECT RETRY CONTEXT

The retry input should now become:

``` text
Upstream Specification Context:
plan.md
requirements.md

=== ORIGINAL USER REQUEST ... ===
...

=== ARCHITECT VALIDATION FAILURE ... ===
...
```

Do not put validation feedback before the authoritative specification.

The authoritative project context should remain first.

------------------------------------------------------------------------

# 37. ADD TESTS: CONTEXT PROPAGATION

## FILE

``` text
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

The existing test file is primarily contract-level, so add pure tests
for any extracted message-building helper if possible.

Preferred approach:

Extract the context composition logic into a pure exported helper:

``` ts
export function composeAgentUserContent(params: {
  upstreamContext: string;
  customUserContent?: string;
  userPromptText: string;
  attempt: number;
  validationError?: string;
}): string {
  const {
    upstreamContext,
    customUserContent,
    userPromptText,
    attempt,
    validationError,
  } = params;

  const retryPrefix =
    attempt > 1
      ? `[RETRY ${attempt}/3] Your previous output failed verification. Error: ${
          validationError ||
          'Ensure ALL required section headers are present.'
        }.\n\n`
      : '';

  const parts: string[] = [];

  if (upstreamContext.trim()) {
    parts.push(
      `Upstream Specification Context:\n${upstreamContext.trim()}`
    );
  }

  if (customUserContent?.trim()) {
    parts.push(customUserContent.trim());
  }

  parts.push(`Original Request:\n"${userPromptText}"`);

  return retryPrefix + parts.join('\n\n');
}
```

Then `runAgent()` uses:

``` ts
const userContent = composeAgentUserContent({
  upstreamContext,
  customUserContent,
  userPromptText,
  attempt,
  validationError,
});
```

This is strongly preferred because the critical context behavior becomes
unit-testable without invoking the LLM.

------------------------------------------------------------------------

# 38. CONTEXT TEST A

Add:

``` ts
const composedA = composeAgentUserContent({
  upstreamContext:
    '=== ARTIFACT: plan.md ===\nPLAN_SENTINEL\n=== END ARTIFACT: plan.md ===',
  customUserContent: 'CUSTOM_SENTINEL',
  userPromptText: 'USER_SENTINEL',
  attempt: 1,
});

assert.ok(composedA.includes('PLAN_SENTINEL'));
assert.ok(composedA.includes('CUSTOM_SENTINEL'));
assert.ok(composedA.includes('USER_SENTINEL'));
```

------------------------------------------------------------------------

# 39. CONTEXT TEST B

Verify ordering:

``` ts
assert.ok(
  composedA.indexOf('PLAN_SENTINEL') <
  composedA.indexOf('CUSTOM_SENTINEL')
);

assert.ok(
  composedA.indexOf('CUSTOM_SENTINEL') <
  composedA.indexOf('USER_SENTINEL')
);
```

------------------------------------------------------------------------

# 40. CONTEXT TEST C: RETRY

``` ts
const composedRetry = composeAgentUserContent({
  upstreamContext:
    '=== ARTIFACT: plan.md ===\nPLAN_SENTINEL',
  customUserContent: 'CUSTOM_SENTINEL',
  userPromptText: 'USER_SENTINEL',
  attempt: 2,
  validationError: 'VALIDATION_SENTINEL',
});

assert.ok(composedRetry.includes('PLAN_SENTINEL'));
assert.ok(composedRetry.includes('CUSTOM_SENTINEL'));
assert.ok(composedRetry.includes('USER_SENTINEL'));
assert.ok(composedRetry.includes('VALIDATION_SENTINEL'));
```

------------------------------------------------------------------------

# 41. CONTEXT TEST D: NO CUSTOM CONTENT

``` ts
const composedNoCustom = composeAgentUserContent({
  upstreamContext: 'UPSTREAM_SENTINEL',
  customUserContent: undefined,
  userPromptText: 'USER_SENTINEL',
  attempt: 1,
});

assert.ok(composedNoCustom.includes('UPSTREAM_SENTINEL'));
assert.ok(composedNoCustom.includes('USER_SENTINEL'));
```

------------------------------------------------------------------------

# 42. CONTEXT TEST E: NO UPSTREAM CONTENT

``` ts
const composedNoUpstream = composeAgentUserContent({
  upstreamContext: '',
  customUserContent: 'CUSTOM_SENTINEL',
  userPromptText: 'USER_SENTINEL',
  attempt: 1,
});

assert.ok(composedNoUpstream.includes('CUSTOM_SENTINEL'));
assert.ok(composedNoUpstream.includes('USER_SENTINEL'));
```

------------------------------------------------------------------------

# 43. TEST STRICT MODULE PARSER

Add a valid fixture:

``` ts
const validModulesFixture = `
### Modules

**Storefront**
- Responsibility: Renders the storefront
- Owned Files: src/app/page.tsx, src/components/ProductCard.tsx
- Depends On: Data Access
- Supports Features: Catalog

**Data Access**
- Responsibility: Provides persistence access
- Owned Files: src/lib/prisma.ts
- Depends On: None
- Supports Features: Persistence

### Conventions
- **File Naming**: kebab-case
`;
```

Then:

``` ts
const parsedModules = parseArchitectureModules(validModulesFixture);

assert.deepStrictEqual(
  parsedModules.modules.map((m) => m.name),
  ['Storefront', 'Data Access']
);

assert.strictEqual(parsedModules.errors.length, 0);
```

------------------------------------------------------------------------

# 44. TEST FIELD-LINE FALSE POSITIVE

Use:

``` ts
const fieldFixture = `
### Modules

**Storefront**
- Responsibility: Renders the storefront
- Owned Files: src/app/page.tsx
- Depends On: None
- Supports Features: Catalog

### Conventions
- **File Naming**: kebab-case
`;
```

Then:

``` ts
const parsedField = parseArchitectureModules(fieldFixture);

assert.deepStrictEqual(
  parsedField.modules.map((m) => m.name),
  ['Storefront']
);

assert.ok(
  !parsedField.modules.some(
    (m) => m.name.startsWith('- Responsibility')
  )
);
```

------------------------------------------------------------------------

# 45. TEST EXACT CURRENT FAILURE SHAPE

Add:

``` ts
const failingModuleFixture = `
### Modules

**Storefront**
- Responsibility: Renders the main storefront and search pages
- Owned Files: src/app/page.tsx
- Depends On: ProductCard, SearchBar
- Supports Features: Product browsing

**API Routes**
- Responsibility: Handles API routes
- Owned Files: src/app/api/[...slug]/route.ts
- Depends On: Prisma client
- Supports Features: API
`;
```

Parse it.

Expected:

``` text
module names:
Storefront
API Routes
```

NOT:

``` text
- Responsibility: Renders the main storefront and search pages
```

Then validator MUST report:

``` text
unknown module ProductCard
unknown module SearchBar
unknown module Prisma client
```

because those are genuinely invalid module dependencies.

This test proves the parser and semantic validator are now separated
correctly.

------------------------------------------------------------------------

# 46. TEST VALID COMPONENT OWNERSHIP

Use:

``` text
**Storefront**
- Responsibility: ...
- Owned Files: src/app/page.tsx, src/components/ProductCard.tsx, src/components/SearchBar.tsx
- Depends On: Data Access
```

with:

``` text
**Data Access**
...
```

Expected:

``` text
valid
```

This proves components belong in `Owned Files`, not `Depends On`.

------------------------------------------------------------------------

# 47. TEST UNCLAIMED `layout.tsx`

Fixture:

``` ts
const layoutUnclaimed = `
### Tech Stack
- **Frontend**: Next.js App Router
- **Frontend Entry Point**: src/app/page.tsx

### Project Folder Structure
project-root/
└── src/
    └── app/
        ├── page.tsx
        └── layout.tsx

### Modules
**App**
- Responsibility: Main application
- Owned Files: src/app/page.tsx
- Depends On: None
- Supports Features: App
`;
```

Expected:

``` ts
const result = validateArchitectureArtifact(layoutUnclaimed);

assert.strictEqual(result.valid, false);

assert.ok(
  result.errors.some((e) =>
    e.includes('src/app/layout.tsx')
  )
);
```

Do NOT add a whitelist.

------------------------------------------------------------------------

# 48. TEST VALID `layout.tsx` OWNERSHIP

Modify:

``` text
Owned Files: src/app/page.tsx, src/app/layout.tsx
```

Expected:

``` ts
assert.strictEqual(result.valid, true);
```

------------------------------------------------------------------------

# 49. TEST ROOT PUBLIC ASSET

Valid:

``` text
public/
└── next.svg
```

and module:

``` text
Owned Files: public/next.svg
```

Expected:

``` text
valid
```

------------------------------------------------------------------------

# 50. TEST `src/public` REJECTION

Fixture:

``` text
src/
└── public/
    └── next.svg
```

Expected:

``` text
invalid
```

with error containing:

``` text
must be placed under project-root "public/"
```

------------------------------------------------------------------------

# 51. TEST VALID NEXT ROUTES

These must pass:

``` text
src/app/api/[id]/route.ts
src/app/api/[...slug]/route.ts
src/app/api/[[...slug]]/route.ts
```

------------------------------------------------------------------------

# 52. TEST INVALID NEXT ROUTES

These must fail:

``` text
src/app/api/[...]/route.ts
src/app/api/[]/route.ts
src/app/api/[[]/route.ts
```

Do not modify the existing tests that already cover these. Add missing
edge cases around them.

------------------------------------------------------------------------

# 53. TEST BACKEND ENTRY ESCAPE HATCH

Invalid:

``` text
Backend Entry Point: src/foo/route.ts
```

Expected:

``` text
invalid
```

Valid:

``` text
Backend Entry Point: src/app/api/products/route.ts
```

Expected:

``` text
valid
```

------------------------------------------------------------------------

# 54. TEST MODULE CYCLE

Fixture:

``` text
**A**
- Responsibility: A
- Owned Files: src/a.ts
- Depends On: B

**B**
- Responsibility: B
- Owned Files: src/b.ts
- Depends On: A
```

Expected:

``` text
invalid
```

with:

``` text
Module dependency cycle detected
```

------------------------------------------------------------------------

# 55. TEST SELF DEPENDENCY

Existing test must continue to pass:

``` text
A -> A
```

Expected:

``` text
invalid
```

------------------------------------------------------------------------

# 56. TEST PACKAGE DEPENDENCY

Fixture:

``` text
**API Routes**
- Responsibility: API
- Owned Files: src/app/api/route.ts
- Depends On: @prisma/client
```

Expected:

``` text
invalid
```

with semantic message.

------------------------------------------------------------------------

# 57. TEST COMPONENT DEPENDENCY

Fixture:

``` text
**Storefront**
- Responsibility: UI
- Owned Files: src/app/page.tsx
- Depends On: ProductCard
```

Expected:

``` text
invalid
```

unless:

``` text
**ProductCard**
```

is explicitly declared as a module.

------------------------------------------------------------------------

# 58. TEST REAL MODULE DEPENDENCY

Fixture:

``` text
**Storefront**
- Responsibility: UI
- Owned Files: src/app/page.tsx
- Depends On: Data Access

**Data Access**
- Responsibility: Persistence
- Owned Files: src/lib/prisma.ts
- Depends On: None
```

Expected:

``` text
valid
```

------------------------------------------------------------------------

# 59. FULL E-COMMERCE REGRESSION FIXTURE

Update the existing full E-Commerce architecture fixture to include:

``` text
src/app/layout.tsx
public/next.svg
```

and valid ownership:

``` text
**Application Shell**
- Responsibility: Provides the root App Router shell
- Owned Files: src/app/layout.tsx, src/app/page.tsx
- Depends On: Storefront Components
- Supports Features: Storefront

**Storefront Components**
- Responsibility: Renders product and search components
- Owned Files: src/app/components/ProductCard.tsx, src/app/components/SearchBar.tsx
- Depends On: Data Access
- Supports Features: Product Catalog & Search

**API Routes**
- Responsibility: Handles API routes and checkout
- Owned Files: src/app/api/[...slug]/route.ts
- Depends On: Data Access
- Supports Features: API & Payments

**Data Access**
- Responsibility: Provides database and payment integration access
- Owned Files: src/lib/prisma.ts, src/lib/stripe.ts
- Depends On: None
- Supports Features: Persistence & Payments

**Static Assets**
- Responsibility: Provides public static assets
- Owned Files: public/next.svg
- Depends On: None
- Supports Features: Static Assets
```

This fixture MUST pass.

------------------------------------------------------------------------

# 60. FULL NEGATIVE E-COMMERCE FIXTURE

Create a second fixture that intentionally contains all original errors:

``` text
src/app/layout.tsx
src/public/next.svg
src/app/api/[...]/route.ts
```

and:

``` text
- Depends On: ProductCard, SearchBar
```

and:

``` text
- Depends On: Prisma client
```

Expected:

``` text
invalid
```

and each category of error MUST be represented.

------------------------------------------------------------------------

# 61. DO NOT MAKE THE NEGATIVE FIXTURE PASS

The negative fixture is specifically there to prevent "fixes" that
weaken validation.

If an implementation makes the negative fixture pass without correcting
the architecture itself, the implementation is wrong.

------------------------------------------------------------------------

# 62. ARCHITECT ACCEPTANCE TEST

The existing `validateArchitectOutput()` tests must remain.

Add:

``` ts
const invalidArchitecture = `
### Tech Stack
- **Frontend**: Next.js App Router
- **Frontend Entry Point**: src/app/page.tsx
- **Backend Entry Point**: src/app/api/[...]/route.ts

### Project Folder Structure
project-root/
└── src/
    └── app/
        ├── page.tsx
        └── api/
            └── [...]/
                └── route.ts

### Modules
**App**
- Responsibility: Main app
- Owned Files: src/app/page.tsx, src/app/api/[...]/route.ts
- Depends On: None
- Supports Features: App
`;
```

Expected:

``` ts
const validation = await validateArchitectOutput(
  'test-convo-invalid-architect',
  invalidArchitecture
);

assert.strictEqual(validation.valid, false);
```

------------------------------------------------------------------------

# 63. ACCEPTANCE TEST FOR VALID CANDIDATE

Use:

``` text
[...slug]
```

and complete module ownership.

Expected:

``` ts
assert.strictEqual(validation.valid, true);
```

------------------------------------------------------------------------

# 64. PERSISTENCE TEST REQUIREMENT

Because `runAgent()` invokes a real LLM, do not create a brittle network
test unless the existing test infrastructure already mocks
`runInference`.

Instead, extract the persistence decision into a small pure helper if
necessary.

Preferred helper:

``` ts
export function shouldPersistAgentOutput(
  agentName: string,
  persistOutput: boolean
): boolean {
  return Boolean(VFS_OUTPUT_MAP[agentName]) && persistOutput;
}
```

Then test:

``` ts
assert.strictEqual(
  shouldPersistAgentOutput('Architect', false),
  false
);

assert.strictEqual(
  shouldPersistAgentOutput('Architect', true),
  true
);

assert.strictEqual(
  shouldPersistAgentOutput('Planner', true),
  true
);
```

Do not mock the entire orchestrator just to test a boolean.

------------------------------------------------------------------------

# 65. IMPORTANT: PRESERVE EXISTING CALLERS

After adding:

``` ts
persistOutput: boolean = true
```

all existing `runAgent()` callers remain valid.

Only Architect passes:

``` ts
false
```

because only Architect currently requires pre-validation persistence
isolation.

------------------------------------------------------------------------

# 66. OPTIONAL STRONGER DESIGN

If the implementing AGI finds that `runAgent()` is too overloaded, it
may instead extract:

``` ts
runInferenceForAgent()
```

and:

``` ts
persistAgentOutput()
```

BUT:

-   do not redesign the entire orchestrator;
-   preserve telemetry;
-   preserve agent output history;
-   preserve executive memory;
-   preserve stage events;
-   preserve existing function behavior.

The minimal implementation is preferred.

------------------------------------------------------------------------

# 67. ARCHITECT OUTPUT HISTORY

Even when:

``` text
persistOutput = false
```

the candidate may still be recorded in:

``` text
executionHistory
agent output
executive memory
```

This is desirable for forensic debugging.

Do NOT suppress telemetry merely because VFS persistence is
transactional.

------------------------------------------------------------------------

# 68. RETRY CANDIDATE HISTORY

Each attempt should remain observable:

``` text
Attempt 1 -> candidate A
Attempt 2 -> candidate B
Attempt 3 -> candidate C
```

This is critical for determining whether retry feedback is actually
correcting the output.

------------------------------------------------------------------------

# 69. REQUIRED TELEMETRY INVARIANTS

For every Architect attempt:

``` text
context.requiredArtifacts
context.requiredArtifactsPresent
upstreamContextIncluded
customContextIncluded
originalRequestIncluded
```

must be present.

For valid Architect:

``` text
architecture.md persisted = true
```

For invalid Architect attempt:

``` text
architecture.md candidate write = false
```

------------------------------------------------------------------------

# 70. RECURSIVE VERIFICATION LOOP

After implementing the patch, perform this loop.

``` text
LEVEL 0
TypeScript compile
    |
    v
LEVEL 1
Focused parser tests
    |
    v
LEVEL 2
Full spec-contract tests
    |
    v
LEVEL 3
Architect validation fixtures
    |
    v
LEVEL 4
Context composition tests
    |
    v
LEVEL 5
Full application build
    |
    v
LEVEL 6
Real E-Commerce Architect run
    |
    v
LEVEL 7
Inspect telemetry
    |
    v
LEVEL 8
Inspect architecture.md
    |
    v
LEVEL 9
Run downstream System/Blueprinter compatibility test
    |
    v
LEVEL 10
Re-run all tests
```

Do not stop after a single successful compile.

------------------------------------------------------------------------

# 71. LEVEL 0 COMMAND

Run:

``` bash
npx tsc --noEmit
```

Expected:

``` text
exit code 0
```

If failure:

``` text
STOP.
Fix TypeScript errors before continuing.
```

Do not reinterpret unrelated TypeScript failures as successful
implementation.

------------------------------------------------------------------------

# 72. LEVEL 1 COMMAND

Run the project's configured test command from `package.json`.

Current `package.json` has no explicit `test` script.

Therefore inspect the repository for the existing test invocation.

Do not invent a new test framework.

If the existing spec test is executable directly with its current
imports, run the existing supported command.

------------------------------------------------------------------------

# 73. LEVEL 2

Run:

``` text
all existing spec-contract regression assertions
```

Expected:

``` text
all pass
```

Pay particular attention to:

``` text
Tests A-N
Full E-Commerce fixture
Route Regression Tests 1-13
```

------------------------------------------------------------------------

# 74. LEVEL 3

Run every newly added architecture fixture.

Expected:

``` text
valid fixtures -> valid
invalid fixtures -> invalid
```

No fixture may be skipped.

------------------------------------------------------------------------

# 75. LEVEL 4

Run context tests.

Expected:

``` text
plan.md present
requirements.md present
custom context present
original request present
retry feedback present on retry
```

------------------------------------------------------------------------

# 76. LEVEL 5

Run:

``` bash
npm run build
```

Expected:

``` text
exit code 0
```

If build fails because of unrelated pre-existing environment issues,
record exact failure and do not silently claim success.

------------------------------------------------------------------------

# 77. LEVEL 6 REAL PIPELINE

Run a real E-Commerce prompt equivalent to:

``` text
Build a full-stack e-commerce storefront using Next.js App Router, Stripe checkout, SQLite with Prisma, a product catalog, and catalog search.
```

Do not inject the invalid route into the request.

Observe Architect attempt 1.

------------------------------------------------------------------------

# 78. LEVEL 6 EXPECTED INPUT

Inspect Architect telemetry.

The `userContent` MUST contain:

``` text
=== ARTIFACT: plan.md ===
```

and:

``` text
=== ARTIFACT: requirements.md ===
```

and:

``` text
=== ORIGINAL USER REQUEST ...
```

If either artifact is absent:

``` text
implementation is NOT complete.
```

------------------------------------------------------------------------

# 79. LEVEL 6 EXPECTED ARCHITECT OUTPUT

A successful architecture should NOT contain:

``` text
src/app/api/[...]/route.ts
```

It may contain:

``` text
src/app/api/[...slug]/route.ts
```

It should NOT contain:

``` text
src/public/next.svg
```

It may contain:

``` text
public/next.svg
```

If:

``` text
src/app/layout.tsx
```

exists, it must be module-owned.

------------------------------------------------------------------------

# 80. LEVEL 6 EXPECTED DEPENDENCIES

Bad:

``` text
Depends On: ProductCard, SearchBar
Depends On: Prisma client
```

Good:

``` text
Depends On: Storefront Components
Depends On: Data Access
```

provided those modules actually exist.

------------------------------------------------------------------------

# 81. LEVEL 7 TELEMETRY INSPECTION

For each Architect attempt, record:

``` text
attempt number
model
temperature
required artifacts
artifacts included
custom context included
validation errors
candidate hash
```

Do not expose or persist secret material.

------------------------------------------------------------------------

# 82. LEVEL 8 ARCHITECTURE INSPECTION

Check:

``` text
### Tech Stack
### Project Folder Structure
### Modules
### Conventions
```

in exact order.

Check:

``` text
every tree file
```

against:

``` text
exactly one module owner
```

Check:

``` text
every Depends On
```

against:

``` text
declared module names
```

Check:

``` text
every Next dynamic segment
```

against:

``` text
isValidNextDynamicSegment
```

------------------------------------------------------------------------

# 83. LEVEL 9 DOWNSTREAM COMPATIBILITY

After Architect acceptance, run the next downstream stage or its
validation fixture.

Confirm:

``` text
ProjectContract.framework
ProjectContract.entryPoints
ProjectContract.backendEntryPoints
ProjectContract.orm
ProjectContract.database
ProjectContract.integrations
ProjectContract.implementationBoundaries
```

remain correct.

The parser fix must not break contract extraction.

------------------------------------------------------------------------

# 84. LEVEL 10 FINAL FULL REGRESSION

Run:

``` text
TypeScript
focused parser tests
spec-contract tests
architecture fixtures
context tests
application build
real pipeline
```

again after any final code adjustment.

No "it passed once" conclusion.

------------------------------------------------------------------------

# 85. FAILURE TRIAGE RULE

If a test fails:

## Category A: Context failure

Symptoms:

``` text
plan.md absent from Architect userContent
requirements.md absent
```

Fix:

``` text
orchestrator context composition
```

Do not modify parser.

## Category B: Parser failure

Symptoms:

``` text
- Responsibility...
```

appears as module.

Fix:

``` text
architecture parser
```

Do not whitelist the value.

## Category C: Architecture semantic failure

Symptoms:

``` text
Depends On: ProductCard
```

and no ProductCard module.

Fix:

``` text
Architect prompt
```

Keep validator strict.

## Category D: Framework path failure

Symptoms:

``` text
src/public/...
```

or invalid route.

Fix:

``` text
Architect prompt + framework validator
```

Do not weaken validator.

## Category E: Persistence failure

Symptoms:

``` text
invalid candidate appears in architecture.md
```

Fix:

``` text
persistOutput transaction
```

------------------------------------------------------------------------

# 86. NO SILENT AUTO-REPAIR

The implementation must never transform:

``` text
ProductCard
```

into:

``` text
Storefront Components
```

or:

``` text
[...]
```

into:

``` text
[...slug]
```

or:

``` text
src/public/
```

into:

``` text
public/
```

inside validation.

The validator validates.

The Architect regenerates.

This preserves causal transparency.

------------------------------------------------------------------------

# 87. PARSER ERROR QUALITY

Errors should identify the actual layer.

Examples:

``` text
Architecture Parser Error:
Unexpected content in "### Modules" at line 27.
```

versus:

``` text
Architecture Contract Error:
Module "Storefront" depends on unknown module "ProductCard".
```

versus:

``` text
Next.js Architecture Error:
Invalid dynamic route segment "[...]".
```

Do not collapse all errors into one generic message.

------------------------------------------------------------------------

# 88. EXACT ORIGINAL FAILURE MUST BECOME A REGRESSION

The original failure must be represented by a deterministic fixture.

The fixture should contain:

``` text
layout.tsx
src/public/next.svg
ProductCard
SearchBar
Prisma client
[...]
```

and the validator must reject it for the correct reasons.

Then create a corrected fixture and ensure it passes.

This guarantees the RCA is not merely theoretical.

------------------------------------------------------------------------

# 89. CORRECTED FIXTURE REQUIREMENTS

Corrected:

``` text
src/app/layout.tsx
public/next.svg
src/app/api/[...slug]/route.ts
```

Module ownership:

``` text
layout.tsx -> one module
next.svg -> one module
route.ts -> one module
```

Dependencies:

``` text
module -> declared module
```

No component names.

No package names.

No technology names.

------------------------------------------------------------------------

# 90. TEST COUNT REQUIREMENT

The implementing AGI must report:

``` text
existing tests run: N
new tests added: N
valid fixtures: N
invalid fixtures: N
integration tests: N
```

Do not report only:

``` text
tests passed
```

------------------------------------------------------------------------

# 91. REQUIRED FINAL REPORT FROM IMPLEMENTING AGI

At completion, return exactly these sections:

``` text
## Implementation Summary

## Files Changed

## Exact Bugs Fixed

## Tests Added

## Tests Run

## Commands Run

## Test Results

## Architect Context Verification

## Parser Verification

## Next.js Verification

## Persistence Verification

## Full E-Commerce Verification

## Remaining Failures

## Unrelated Pre-existing Failures
```

For every remaining failure, include:

``` text
file
line
error
whether introduced by this patch
```

------------------------------------------------------------------------

# 92. GIT DIFF REVIEW REQUIREMENT

Before declaring completion, inspect:

``` bash
git diff --stat
git diff -- src/lib/agents/ruflo/orchestrator.ts
git diff -- src/lib/agents/ruflo/spec-contract.ts
git diff -- src/lib/agents/ruflo/registry/Architect.ts
git diff -- src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

If a new parser file was created:

``` bash
git diff -- <new-parser-file>
```

Review every changed line.

------------------------------------------------------------------------

# 93. DIFF SAFETY RULE

Reject the implementation if the diff contains:

``` text
unrelated refactor
dependency changes
package upgrades
model changes
temperature changes
retry count changes
validator bypasses
hard-coded application-specific exceptions
```

unless explicitly justified by a failing test directly related to this
RCA.

------------------------------------------------------------------------

# 94. REQUIRED SEARCH AFTER IMPLEMENTATION

Search the codebase for:

``` text
customUserContent ||
```

Expected:

``` text
no Architect context replacement remains
```

Search:

``` text
moduleHeaderRegex
```

Expected:

``` text
old permissive module parser removed
```

Search:

``` text
[...]
```

Expected:

``` text
only in tests/docs/explicit invalid examples or prompt prohibition
```

Do NOT delete invalid examples from tests.

Search:

``` text
src/public
```

Expected:

``` text
only in negative tests, diagnostics, or explicit policy references
```

------------------------------------------------------------------------

# 95. REQUIRED SEARCH FOR DEPENDENCY SEMANTICS

Search:

``` text
Depends On:
```

Inspect every occurrence in:

``` text
Architect prompt
tests
fixtures
docs
generated examples
```

All examples should distinguish:

``` text
module dependencies
```

from:

``` text
file/package dependencies
```

------------------------------------------------------------------------

# 96. REQUIRED SEARCH FOR ARCHITECT CALLERS

Search:

``` text
runAgent(
```

and classify every caller.

Ensure adding:

``` ts
persistOutput = true
```

as a default does not change other stages.

------------------------------------------------------------------------

# 97. REQUIRED SEARCH FOR ARCHITECT FILE WRITES

Search:

``` text
architecture.md
writeVirtualFile
VFS_OUTPUT_MAP
```

Ensure no hidden second writer overwrites the accepted architecture
after validation.

------------------------------------------------------------------------

# 98. REQUIRED SEARCH FOR ARCHITECT READS

Search:

``` text
readVirtualFile(conversationId, 'architecture.md')
```

Ensure downstream stages still see the accepted architecture.

------------------------------------------------------------------------

# 99. REQUIRED INVARIANT

At no point after an Architect rejection should downstream stages be
able to observe the rejected candidate as the accepted canonical
architecture.

This is the fundamental transactional invariant.

------------------------------------------------------------------------

# 100. FINAL ACCEPTANCE CONDITIONS

The implementation is COMPLETE only if all of these are true:

``` text
[ ] Architect receives plan.md.
[ ] Architect receives requirements.md.
[ ] Architect receives original user request.
[ ] Architect retry receives validation feedback.
[ ] Retry still receives authoritative artifacts.
[ ] Required Architect context is enforced by runtime invariant.
[ ] Rich telemetry records context inclusion.
[ ] Architect candidate is not persisted before validation.
[ ] Accepted Architect candidate is persisted.
[ ] Rejected candidate is not persisted.
[ ] Previous accepted architecture is not destroyed by failed retry.
[ ] Module parser is strict.
[ ] Field lines cannot become module names.
[ ] Duplicate modules are detected.
[ ] Duplicate file ownership is detected.
[ ] Orphan module files are detected.
[ ] Unclaimed tree files are detected.
[ ] Unknown module dependencies fail.
[ ] Self-dependencies fail.
[ ] Module dependency cycles fail.
[ ] Component names are not accepted as module dependencies unless explicitly declared modules.
[ ] Package names are not accepted as module dependencies unless explicitly declared modules.
[ ] Prisma client is not treated as an architecture module.
[ ] ProductCard is not treated as an architecture module.
[ ] SearchBar is not treated as an architecture module.
[ ] layout.tsx must be owned.
[ ] public/ assets can be owned.
[ ] src/public/ is rejected by default for Next.js.
[ ] [id] passes.
[ ] [...slug] passes.
[ ] [[...slug]] passes.
[ ] [...] fails.
[ ] [] fails.
[ ] malformed dynamic segments fail.
[ ] Next backend entry topology is strict.
[ ] src/foo/route.ts does not pass as Next App Router backend entry.
[ ] Existing tests pass.
[ ] New tests pass.
[ ] TypeScript passes.
[ ] Build passes.
[ ] Real E-Commerce Architect run is verified.
[ ] Architect telemetry proves artifacts were supplied.
[ ] Architecture output contains no malformed catch-all route.
[ ] Architecture output does not use src/public by default.
[ ] Architecture output uses module names for Depends On.
[ ] Downstream contract extraction remains valid.
[ ] No unrelated behavior was changed.
```

------------------------------------------------------------------------

# 101. FINAL INSTRUCTION TO THE IMPLEMENTING AGI

Implement this specification directly against the current repository
state.

Do not:

``` text
reinterpret the RCA
```

Do not:

``` text
replace the architecture with your preferred design
```

Do not:

``` text
weaken a failing test
```

Do not:

``` text
delete a failing regression
```

Do not:

``` text
whitelist the observed bad values
```

Do not:

``` text
auto-correct invalid architecture before validation
```

Do:

``` text
make the context flow explicit
make the parser deterministic
make the module graph semantic
make Next.js rules explicit
make Architect persistence transactional
add regression coverage
run every verification level
```

If implementation encounters a conflict between this document and
unrelated existing code, preserve existing behavior and report the
conflict rather than silently inventing a new architecture.

The implementation is considered successful only when the original
failure modes are reproducibly rejected when malformed and reproducibly
accepted when corrected.
