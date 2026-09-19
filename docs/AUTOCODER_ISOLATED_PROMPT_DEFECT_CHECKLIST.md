# AutoCoder Isolated Prompt Defect Checklist

> Scope: prompt defects demonstrated by the simulated agent responses.
>
> Excluded: cross-agent propagation, orchestration/runtime defects, shared-state architecture problems, and defects whose primary cause is an external execution component rather than the prompt itself.

## 1. Queen

- [ ] Inferred assumptions are not explicitly marked with provenance.
- [ ] Scope Summary is inherently lossy and can omit requirements when used as a condensed specification.
- [ ] MVP Scope - Excluded can treat unmentioned functionality as explicitly excluded.
- [ ] Technical constraints are represented as an untyped flat list rather than distinct constraint categories/semantics.
- [ ] Stable requirement IDs are not produced.
- [ ] Ambiguous or conflicting user statements are not represented through a first-class decision-needed mechanism.
- [ ] The prompt does not force preservation of the distinction between explicit requirements, assumptions, preferences, and unresolved interpretations.

## 2. Planner

- [ ] Requirement provenance is discarded when inputs are converted into formal requirements.
- [ ] Acceptance criteria are too vague to be directly executed as tests.
- [ ] The prompt does not define a structured acceptance-criteria format containing preconditions, action, expected result, negative cases, and verification method.
- [ ] The output contract asks for structured requirements while the instructions primarily drive Markdown generation.
- [ ] Technical constraints do not retain mandatory/preferred authority and strength.
- [ ] NFR instructions permit vague requirements such as “handled securely” without measurable verification.
- [ ] Feature-to-requirement relationships are not explicitly represented.
- [ ] The prompt lacks a mechanism for recording unresolved ambiguity and decisions.
- [ ] The WHAT-vs-HOW rule is not paired with sufficient behavioral specificity, allowing requirements to become vague.
- [ ] Negative/failure behavior is not required in acceptance criteria.
- [ ] Requirement priority is not represented.
- [ ] The prompt does not explicitly preserve the distinction between user-stated constraints and planner-derived requirements.

## 3. Architect

- [ ] The prompt contains an unresolved conflict between preserving upstream technology constraints and selecting/optimizing the technology stack.
- [ ] There is no explicit authority hierarchy for resolving conflicting constraints.
- [ ] The prompt does not clearly define the boundary between architectural decisions and implementation/API details.
- [ ] Framework structure is guided by over-generalized heuristics such as the broad `index.html` rule.
- [ ] Module creation is not constrained by explicit responsibility/requirement justification.
- [ ] Deployment requirements are not required to be expressed as concrete runtime/persistence/environment constraints.
- [ ] Impossible or technically incompatible requirement combinations are not required to produce a blocked architecture decision.
- [ ] Architectural decisions are not explicitly labeled as locked, recommended, user-mandated, or otherwise authoritative.
- [ ] The prompt does not require a formal module dependency representation.
- [ ] The architecture output is overly prose-oriented for precise implementation consumption.
- [ ] There is no explicit architectural complexity/minimality constraint.
- [ ] The prompt does not require explicit architectural support for every requirement.
- [ ] The prompt does not require a validation step demonstrating framework, technology, module, and deployment compatibility before declaring the architecture valid.

## 4. System / Backend Architect

- [ ] Every entity is forced to contain `id`, `createdAt`, and `updatedAt`, regardless of domain semantics.
- [ ] Database field types are constrained by an overly narrow universal whitelist.
- [ ] The prompt does not require explicit nullability semantics.
- [ ] The prompt does not require defaults, uniqueness, indexing, or foreign-key behavior to be specified.
- [ ] Relationship definitions lack explicit cardinality and lifecycle semantics.
- [ ] Domain ownership decisions such as global vs. user-scoped entities are not explicitly resolved.
- [ ] Seed data is treated as a mandatory backend concern instead of conditional behavior.
- [ ] API request/response contracts are underspecified.
- [ ] Error response schemas are not required.
- [ ] HTTP status-code semantics are not fully defined per operation.
- [ ] Authorization rules are described too generally and are not expressed as deterministic enforcement invariants.
- [ ] JWT is accepted as a technology choice without requiring a complete trust/storage/expiry/key-management model.
- [ ] Transactional boundaries are not required to be identified.
- [ ] Database indexes/query patterns are not required to be derived from access requirements.
- [ ] The `no backend` branch is too binary to accurately represent partial/backend-adjacent capabilities.
- [ ] REST is over-constrained as the API style instead of being selected according to the validated architecture.
- [ ] Security/tenant isolation is not required as a first-class backend invariant.
- [ ] The prompt does not require explicit handling of architecture/API-style conflicts.

## 5. Designer / UI-UX Architect

- [ ] The prompt's requirement to put every feature on a page encourages backend/non-UI requirements to be represented as UI features.
- [ ] UI capabilities can be invented when they are not explicitly grounded in requirements.
- [ ] UI requirements are not required to carry requirement IDs.
- [ ] Data-driven UI components are not required to bind explicitly to canonical backend/API operations.
- [ ] Interaction states are underspecified and do not require complete state transitions.
- [ ] Authentication UX lifecycle is incomplete, especially expiration, unauthorized handling, and logout/session behavior.
- [ ] Accessibility is not a required part of the UI contract.
- [ ] Responsive behavior is too generic to function as an implementation specification.
- [ ] Breakpoints are not formally specified.
- [ ] Design decisions are not required to carry provenance/authority.
- [ ] Visual hierarchy is not tied to task or requirement priority.
- [ ] Component decomposition is not constrained against unnecessary over-componentization.
- [ ] The prompt does not cleanly distinguish UI-relevant requirements from backend-only/system requirements.

## 6. Blueprinter

- [ ] The prompt makes Blueprint the sole information source for Coder, turning any Blueprint omission into irreversible semantic loss.
- [ ] Blueprinter is instructed to reproduce upstream API/DB/props/dependency details, creating opportunities to rewrite canonical contracts.
- [ ] The prompt does not establish Blueprint as a projection rather than an authority.
- [ ] Cross-layer types are not protected against contradiction with canonical backend contracts.
- [ ] File generation is treated too uniformly and does not distinguish authored, framework-generated, tool-generated, binary, or non-generated artifacts.
- [ ] Dependency ordering is represented as a simple sequence rather than a full dependency graph.
- [ ] Symbol specifications lack consistently formalized signatures and behavioral contracts.
- [ ] API references are not deterministically bound to canonical API contracts.
- [ ] DOM IDs are over-specified as Blueprint-level implementation requirements.
- [ ] Requirement-to-file-to-test relationships are not required.
- [ ] Cross-file/system-wide invariants are not first-class Blueprint data.
- [ ] The prompt permits implementation over-specification that can reduce Coder to a code transcription step.

## 7. Coder

- [ ] The prompt defines Coder primarily as one-file-at-a-time generation rather than an explicit iterative coding process.
- [ ] The prompt lacks a mandatory inspect → modify → validate → repair execution protocol.
- [ ] Blueprint adherence is stronger than necessary and can prevent Coder from correcting a contradictory Blueprint.
- [ ] “Do not introduce unrequested dependencies” is too absolute when a required dependency is missing from the Blueprint.
- [ ] Dependency interface summaries are not guaranteed to include behavioral contracts, invariants, and error semantics.
- [ ] Repository inspection before editing is not mandatory.
- [ ] Existing implementation preservation semantics are not explicit enough.
- [ ] Tool usage has no required order, failure handling, completion conditions, or evidence requirements.
- [ ] Definition of Done is not sufficiently defined.
- [ ] Behavioral verification is not required before completion.
- [ ] Error handling requirements do not enforce a standardized domain-error taxonomy.
- [ ] Cross-file semantic consistency is not explicitly required during generation.
- [ ] Missing dependencies/symbols do not have a defined prompt-level resolution behavior.
- [ ] Concurrency/version assumptions are not represented in the coding contract.
- [ ] Invariants are not explicit inputs that Coder must preserve.

## 8. Tester / Static Validation Prompt

- [ ] The Tester prompt defines a deterministic/static validation role rather than an actual behavioral testing role.
- [ ] The prompt does not translate acceptance criteria into executable tests.
- [ ] Runtime behavior is not part of the testing contract.
- [ ] Integration behavior across frontend/API/service/database boundaries is not part of the contract.
- [ ] Database behavior and constraints are not required to be exercised.
- [ ] Authentication and authorization scenarios are not required.
- [ ] Negative/adversarial behavior is not required.
- [ ] Regression testing is not required.
- [ ] Coverage is not tied to requirements, acceptance criteria, or security invariants.
- [ ] Browser/UI behavior is not part of the testing contract.
- [ ] Test isolation and fixture/state reset are not sufficiently specified for a real test environment.
- [ ] Failure output does not require a structured requirement/test/evidence/file/symbol relationship.

## 9. Debugger

- [ ] The prompt optimizes for resolving reported compiler/type errors rather than restoring the violated software contract.
- [ ] Behavioral failures are not first-class inputs.
- [ ] “Fix only the reported errors” is too restrictive when the root cause lies elsewhere.
- [ ] Root-cause analysis is not a first-class output requirement.
- [ ] Patch output is line-range based without a stronger semantic/content anchor.
- [ ] Post-repair validation is not required.
- [ ] Regression verification is not required.
- [ ] Semantic failure localization is not required.
- [ ] Interface preservation can be too rigid when the interface itself is the defect.
- [ ] Escalation behavior is not defined when the failure is caused by a higher-level contract.
- [ ] Contract-conflict detection is not required before patching.
- [ ] The prompt does not require behavioral debugging evidence such as reproduction, expected/actual results, runtime evidence, or affected symbols.
- [ ] Requirement and invariant awareness is not required during repair.

## 10. Reviewer

- [ ] Input scope is underspecified despite the instruction that Reviewer receives original specifications and generated code.
- [ ] Requirement verification is not operationalized into deterministic evidence checks.
- [ ] Architectural compliance is not defined with a sufficiently formal invariant model.
- [ ] Severity rules are not adequate as a deterministic release mechanism.
- [ ] PASS criteria can permit materially incorrect software to pass.
- [ ] Findings do not require sufficient evidence to substantiate the defect.
- [ ] Reviewer does not consume formal test/build/security evidence as required inputs.
- [ ] Tool access is absent despite the Reviewer being positioned as a verification layer.
- [ ] Reviewer cannot reliably distinguish confirmed failure from suspicion.
- [ ] Requirement coverage is not required as a first-class review result.
- [ ] Architectural invariant verification is not explicitly required.
- [ ] Regression awareness is not part of the review contract.
- [ ] Findings are not explicitly divided into blocking vs. non-blocking defects.
- [ ] `file` is not mandatory in the finding schema.
- [ ] Finding categories are not constrained by a formal taxonomy.
- [ ] Findings do not carry sufficiently actionable repair instructions.
- [ ] Reviewer is overloaded with code review, requirement verification, architecture verification, test substitution, and release-gate responsibilities.

## 11. Security Auditor

- [ ] The security prompt assumes source code alone is sufficient evidence, leaving configuration/runtime/deployment-dependent vulnerability classes outside its observable scope.
- [ ] Dependency vulnerability analysis is explicitly excluded from the security reasoning path.
- [ ] Security scoring is subjective rather than derived from verifiable findings/evidence.
- [ ] “No vulnerabilities found” can be emitted without proving adequate security-scope coverage.
- [ ] Security scope is not explicitly defined across source, dependencies, configuration, deployment, runtime, and integrations.
- [ ] No explicit threat model is required.
- [ ] Business-logic security/invariants are not sufficiently first-class in the audit contract.
- [ ] Negative/adversarial security testing is not required.
- [ ] Secure code with insecure configuration/environment can escape meaningful detection.
- [ ] Cookie security requirements are not systematically checked.
- [ ] CSRF protection is not systematically checked.
- [ ] Rate limiting/abuse controls are not systematically checked.
- [ ] SSRF is not systematically checked.
- [ ] Dangerous file-upload behavior is not systematically checked.
- [ ] Security output is Markdown-centric rather than a strong structured finding contract.
- [ ] Security findings are not sufficiently structured for deterministic downstream repair/verification.
- [ ] Security status/severity is not tightly bound to verified evidence coverage.

## 12. Prompt Defects That Are Repeated Within Individual Agents

- [ ] Prompts use broad natural-language rules where domain-specific contracts are required.
- [ ] Prompts state desired outcomes without defining machine-verifiable behavior.
- [ ] Prompts encode defaults as universal rules rather than conditional defaults with justified exceptions.
- [ ] Prompts do not consistently distinguish mandatory requirements from recommendations.
- [ ] Prompts frequently describe information in prose without requiring identifiers, relationships, or explicit structured semantics.
- [ ] Prompts often specify what an agent should produce without specifying how the agent should determine that the output is complete and correct.
- [ ] Prompts do not consistently require evidence for claims of correctness.
- [ ] Prompts do not consistently provide explicit failure/ambiguity/escalation states.
