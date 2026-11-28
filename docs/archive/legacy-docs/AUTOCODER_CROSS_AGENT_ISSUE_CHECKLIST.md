# AutoCoder Cross-Agent Issue Checklist

## 1. Global Pipeline / Source-of-Truth Issues

- [ ] Multiple representations of the same semantic state exist across the pipeline, allowing information to drift between stages.
- [ ] Natural-language artifacts are being used as inter-agent APIs, forcing downstream agents to reinterpret upstream intent.
- [ ] There is no single canonical, machine-readable source of truth spanning user intent, requirements, architecture, backend, UI, implementation, tests, and security evidence.
- [ ] Requirement provenance is lost as information moves from Queen into Planner and later stages, allowing agent inferences to become indistinguishable from user requirements.
- [ ] Assumptions can be laundered into authoritative requirements because source/authority metadata does not survive stage transitions.
- [ ] Ambiguities and unresolved decisions are not preserved as first-class pipeline state, so downstream agents can silently resolve product or architecture conflicts.
- [ ] Stable identifiers and traceability relationships are missing or inconsistent across features, requirements, architecture elements, backend contracts, UI elements, files, and tests.
- [ ] Markdown projections can become the effective source of truth instead of remaining a human-readable projection of structured state.
- [ ] Schema/runtime/output mismatches create additional failure boundaries between agent output and downstream consumption.
- [ ] Authority is not consistently encoded, so downstream agents cannot reliably distinguish user-mandated constraints, validated contracts, recommendations, assumptions, and local implementation choices.

## 2. Queen → Planner

- [ ] Queen's inferred assumptions are not provenance-tagged, allowing Planner to formalize them as authoritative requirements.
- [ ] Queen's scope summary can be lossy and therefore drop requirements before Planner receives them.
- [ ] Queen can generate exclusions for items the user never explicitly excluded, turning omission into a negative requirement.
- [ ] Queen's technical constraints are represented as an untyped flat list, so Planner cannot reliably preserve authority or strength.
- [ ] Queen has no first-class ambiguity/decision mechanism, so conflicts such as simplicity vs. offline sync vs. multi-tenancy can be silently resolved.
- [ ] Queen does not preserve a reliable distinction between explicit user statements, agent inferences, preferences, and unresolved implications.
- [ ] Queen lacks stable requirement identifiers, making downstream traceability dependent on semantic interpretation.

## 3. Planner → Architect

- [ ] Planner removes requirement provenance, so Architect cannot reliably distinguish mandatory user intent from agent-derived interpretation.
- [ ] Planner's structured schema and its Markdown-oriented output contract can disagree, creating a contract break before Architect receives requirements.
- [ ] Planner acceptance criteria are not executable enough for deterministic downstream testing, leaving Architect, Coder, Tester, Debugger, and Reviewer without precise behavioral targets.
- [ ] Acceptance criteria lack structured links to requirements, verification methods, negative cases, and expected results.
- [ ] Feature-to-requirement relationships are not machine-readable, weakening downstream coverage checks.
- [ ] Planner does not provide a formal ambiguity/decision mechanism, so unresolved product decisions can enter Architect as if already settled.
- [ ] Technical constraints do not reliably preserve mandatory/preferred semantics or authority, creating conflict ambiguity for Architect.
- [ ] NFRs can be vague or inferred without measurable verification criteria, causing Architect and downstream validators to inherit underspecified requirements.
- [ ] Planner lacks negative/failure requirements, leaving downstream architecture and testing biased toward happy-path behavior.
- [ ] Behavioral precision can be lost because the WHAT-vs-HOW boundary is not paired with sufficiently specific behavioral contracts.
- [ ] Requirement priorities are not encoded, preventing downstream agents from distinguishing critical business behavior from lower-priority functionality.

## 4. Architect → System / Designer / Blueprinter

- [ ] Architect has no explicit authority/conflict-resolution model, so it can theoretically override mandatory user constraints.
- [ ] Architect can silently optimize architecture around its own preferences instead of adapting the architecture around locked requirements.
- [ ] Architect can make implementation-level decisions without a clear boundary between architecture and System/API design.
- [ ] Architect's folder tree becomes a downstream generation contract without a deterministic architecture validation gate.
- [ ] Architect does not provide a requirement-to-architecture coverage map, so requirements can disappear while architecture still appears coherent.
- [ ] Architect can introduce modules without explicit requirement linkage, increasing downstream file count, cross-file inconsistency, and debugging surface.
- [ ] Architect does not provide a formal module dependency graph, forcing Blueprinter to reconstruct dependency relationships.
- [ ] Architect does not consistently distinguish locked decisions from recommendations, causing downstream agents to treat both as equally authoritative.
- [ ] Architect's deployment compatibility claims are not sufficiently represented as enforceable runtime/deployment constraints.
- [ ] Architect does not reliably detect impossible or incompatible technology/runtime combinations before System and later stages consume them.
- [ ] Framework-specific structural heuristics can inject invalid or unnecessary files into the downstream generation plan.
- [ ] Prose-heavy architecture is used as an implementation contract, creating semantic drift when Blueprinter interprets it.

## 5. Architect → System

- [ ] System can choose an API/communication model that conflicts with the architecture because architecture-to-System consistency is not explicitly validated.
- [ ] System's REST-oriented assumptions can conflict with an architectural choice of another communication style.
- [ ] System inherits architecture decisions without a machine-readable authority model, so downstream code can implement a reinterpretation rather than the validated architecture.
- [ ] System lacks explicit architecture-to-backend coverage, so backend contracts can appear complete while omitting architectural requirements.
- [ ] System lacks a deterministic mechanism for resolving architecture/API-style conflicts rather than silently choosing one.

## 6. System → Designer / Blueprinter / Coder

- [ ] System hard-coded entity conventions can impose data-model decisions that conflict with domain requirements.
- [ ] Restricted database field types can force downstream Blueprint and Coder representations that are inconsistent with the selected database/ORM/domain semantics.
- [ ] Missing nullability/default/unique/index/foreign-key semantics leave Blueprinter and Coder to reconstruct database behavior.
- [ ] Relationship semantics are underspecified, allowing downstream agents to disagree on ownership, cardinality, deletion behavior, or global vs. user-scoped data.
- [ ] Domain-model assumptions such as global vs. per-user categories can propagate into schema, APIs, UI, and code without explicit upstream validation.
- [ ] Seed-data requirements can introduce downstream implementation assumptions that were not part of user intent.
- [ ] System API contracts are too vague for deterministic downstream implementation, especially for request/response schemas.
- [ ] HTTP error semantics are underspecified, leaving Coder and UI layers to invent status-code behavior.
- [ ] Authorization rules are expressed too generally to guarantee deterministic enforcement in every affected query and mutation.
- [ ] JWT trust-model decisions are underspecified, leaving authentication behavior open to downstream interpretation.
- [ ] Database query/index strategy is not connected to requirements, so filtering and aggregation behavior can be implemented without aligned data-access semantics.
- [ ] System lacks requirement-to-backend traceability, forcing downstream agents to infer which backend artifact satisfies which requirement.
- [ ] System lacks explicit architecture consistency validation, allowing backend contracts to diverge from architecture without being blocked.

## 7. System ↔ Designer

- [ ] Designer is not given a deterministic mapping from UI behavior to canonical backend operations and API contracts.
- [ ] Designer can invent UI capabilities that do not exist in the backend or requirements.
- [ ] Backend resources and API contracts can be reinterpreted at the UI layer because API references are not binding.
- [ ] UI-relevant and backend-only requirements are not cleanly separated, causing non-UI requirements to be forced into UI specifications.
- [ ] Authentication lifecycle details can diverge between System and Designer because token/session/error behavior is not represented as a shared contract.
- [ ] Data states and interaction states are not sufficiently connected to backend success/error semantics.
- [ ] Backend type/response semantics can be re-expressed differently by Designer, creating downstream type inconsistencies.

## 8. Designer → Blueprinter

- [ ] Designer has no UI-requirement traceability, so Blueprinter cannot deterministically prove which UI element implements which requirement.
- [ ] Designer lacks explicit API/backend bindings, so Blueprinter must infer data sources and operations.
- [ ] Designer's interaction state model is too shallow to provide deterministic behavior to Blueprinter and Coder.
- [ ] Authentication UX lifecycle is incomplete, so Blueprinter may not implement token expiration, unauthorized handling, or logout behavior consistently.
- [ ] Accessibility is not part of the contract, allowing downstream implementation to omit required accessibility behavior.
- [ ] Responsive behavior is too vague to become deterministic implementation rules.
- [ ] Design decisions lack authority/provenance, so downstream agents cannot distinguish locked UI choices from designer recommendations.
- [ ] Component boundaries can encourage over-componentization, increasing Blueprinter file count and Coder generation surface.
- [ ] Blueprinter must reinterpret Designer prose instead of consuming a validated UI contract.

## 9. Upstream Specifications → Blueprinter

- [ ] Blueprinter is positioned as a semantic compression point for all upstream specifications, making information loss at Blueprint generation irreversible for Coder.
- [ ] Blueprinter can duplicate and rewrite upstream contracts instead of referencing them, creating a second authority.
- [ ] Blueprint can silently contradict canonical backend types and semantics.
- [ ] Blueprint can overwrite upstream authority because Coder is told to follow Blueprint exactly.
- [ ] API contracts are not always deterministically bound from System through Designer into Blueprint.
- [ ] Exact symbol signatures are not consistently formalized, leaving Coder to infer interfaces.
- [ ] File specifications do not preserve cross-file/system-wide invariants as first-class constraints.
- [ ] Requirement-to-file-to-test traceability is missing at the Blueprint layer.
- [ ] Blueprint treats file ordering as a substitute for a real dependency graph.
- [ ] Blueprint's file-tree assumptions do not distinguish authored, framework-generated, tool-generated, binary, or non-generated artifacts.
- [ ] Blueprint can over-specify implementation details and thereby replace architectural/contractual intent with local generation instructions.
- [ ] DOM IDs can become architecture-level noise rather than remaining tied to validated UI/test contracts.

## 10. Blueprinter → Coder

- [ ] Coder reads only the Blueprint, making Blueprinter information loss unrecoverable.
- [ ] Coder's authority hierarchy gives excessive weight to Blueprint over canonical validated contracts.
- [ ] Coder cannot reliably recover from a Blueprint that contradicts System or architecture.
- [ ] Semantically lossy dependency summaries prevent Coder from understanding behavior, invariants, and error semantics of adjacent code.
- [ ] Missing dependency handling is undefined, so Coder can emit imports or references to unavailable symbols and defer discovery to Tester/Debugger.
- [ ] Coder lacks mandatory repository-state inspection, so it may overwrite or duplicate existing implementations.
- [ ] Existing validated behavior is not sufficiently protected from inferior Blueprint-driven rewrites.
- [ ] Coder lacks an explicit tool-execution protocol, so declared tools do not guarantee an inspect/modify/validate loop.
- [ ] Coder lacks a reliable definition of done tied to contracts and verification evidence.
- [ ] Coder lacks behavioral verification and can produce locally plausible code against incorrect dependencies.
- [ ] Coder lacks cross-file semantic consistency protection, allowing individually valid files to form an invalid system.
- [ ] Standardized backend error semantics are not strongly connected to Coder's implementation.
- [ ] Cross-file concurrency/version changes can invalidate assumptions between Coder tasks without detection.

## 11. Coder → Tester

- [ ] Coder can complete without proving behavioral correctness because Tester receives only a weak static validation path.
- [ ] Coder's missing Definition of Done shifts correctness discovery downstream to Tester.
- [ ] Coder's lack of cross-file verification increases the probability that Tester receives structurally valid but semantically inconsistent code.
- [ ] Coder can implement API behavior that deviates from System contracts while still producing compiler-valid code.
- [ ] Coder can implement UI interactions that satisfy types but violate Designer behavior contracts.
- [ ] Coder can create authorization defects that static validation cannot establish.
- [ ] Coder can introduce regressions while still appearing successful at file generation time.

## 12. Planner → Tester

- [ ] Planner acceptance criteria are not sufficiently executable to become deterministic tests.
- [ ] Acceptance criteria are not structurally linked to test definitions and verification methods.
- [ ] Negative behavior is absent from Planner output, leaving Tester without explicit failure scenarios.
- [ ] Requirement priorities are not propagated into test criticality.
- [ ] Requirement traceability is too weak for Tester to prove coverage.

## 13. Tester / Validation Architecture Issues

- [ ] The current Tester stage is effectively static validation rather than behavioral testing.
- [ ] Static diagnostics are not connected to requirements or acceptance criteria.
- [ ] Tester does not execute the generated application and therefore cannot validate runtime behavior.
- [ ] Tester does not perform meaningful integration verification across frontend, API, service, ORM, and database layers.
- [ ] Tester does not verify actual database behavior from the System contract.
- [ ] Tester does not systematically exercise authentication and authorization behavior.
- [ ] Tester does not perform negative/adversarial behavior testing.
- [ ] Tester lacks meaningful regression testing after code changes and repairs.
- [ ] Tester lacks requirement-level coverage, so generic code coverage can conceal untested critical behavior.
- [ ] Static validation configuration is permissive enough to weaken the verification signal.
- [ ] Generated-project build failures can escape because a real build gate is missing.
- [ ] Browser/UI behavior is not validated against Designer contracts.
- [ ] Test isolation and environment/state management are underspecified for runtime testing.
- [ ] Tester does not emit a machine-readable failure model containing requirement, test, evidence, affected file, and symbol relationships.

## 14. Tester → Debugger

- [ ] Tester does not emit the structured semantic failure information required by Debugger.
- [ ] Compiler/type diagnostics lack the requirement, expected behavior, actual behavior, reproduction, and evidence context that Debugger needs for root-cause repair.
- [ ] Security failures are not represented as executable/behavioral failures that Debugger can consume.
- [ ] Missing regression evidence prevents Debugger from knowing what previously passing behavior must remain intact.
- [ ] Tester cannot reliably distinguish a compiler failure from a behavioral contract failure for downstream repair routing.

## 15. Debugger → Coder / Pipeline

- [ ] Debugger is designed around compiler/type failures and cannot consume the behavioral failures a real Tester should produce.
- [ ] Debugger optimizes for making reported errors disappear rather than restoring the violated contract.
- [ ] Debugger can patch the symptom while leaving the root cause intact.
- [ ] Debugger's "fix only reported errors" constraint can prevent correction of the true defect located in another file or contract.
- [ ] Debugger lacks a structured root-cause analysis model tied to violated contracts and invariants.
- [ ] Debugger uses brittle line-range patch anchoring, increasing risk when files change between observation and repair.
- [ ] Debugger has no mandatory post-repair validation step.
- [ ] Debugger has no meaningful regression verification loop.
- [ ] Debugger has no semantic localization mechanism tied to requirements, symbols, or dependency relationships.
- [ ] Debugger has no escalation path when the failure originates from an incorrect Blueprint, System contract, architecture decision, or requirement.
- [ ] Debugger cannot reliably detect or resolve contract conflicts before applying a patch.
- [ ] Debugger lacks a behavioral evidence model for logs, HTTP responses, database state, runtime output, and other failure evidence.
- [ ] Debugger's interface-preservation rule can block legitimate contract repairs when an upstream interface itself is wrong.

## 16. Debugger → Reviewer

- [ ] Reviewer cannot reliably determine whether a repair restored the original requirement because repair evidence is not connected to requirement and acceptance-test state.
- [ ] Reviewer lacks before/after change context and previously passing test information needed for regression-aware review.
- [ ] Reviewer cannot reliably distinguish repaired defects from newly introduced regressions.
- [ ] Reviewer is forced to re-derive correctness from final code instead of consuming structured repair evidence.

## 17. Security ↔ System / Requirements / Architecture

- [ ] Security invariants are not consistently preserved as first-class requirements from upstream stages into implementation and verification.
- [ ] Business-logic authorization requirements can be too weakly specified in System and therefore difficult to verify downstream.
- [ ] JWT security decisions are underspecified upstream, leaving security behavior dependent on downstream implementation choices.
- [ ] Configuration/deployment security requirements are not part of the defined security evidence model.
- [ ] Security scope is not clearly bounded against application code, integrations, runtime configuration, deployment, and trust boundaries.
- [ ] No explicit threat model connects protected assets, trust boundaries, and threat classes to the rest of the pipeline.

## 18. Security → Tester / Reviewer / Debugger

- [ ] Security review is primarily static and is not backed by systematic negative security testing.
- [ ] Dependency security is not backed by deterministic dependency scanning evidence.
- [ ] Configuration/deployment security can remain unverified while the application is treated as secure.
- [ ] Cookie security, CSRF, rate limiting, SSRF, and dangerous file-upload risks are not guaranteed to be systematically exercised.
- [ ] Security findings are not represented in a strong machine-readable handoff contract for Debugger and Reviewer.
- [ ] Security output is Markdown-only, forcing downstream consumers to parse prose.
- [ ] "No vulnerabilities found" can become false assurance because absence of findings is not tied to explicit evidence coverage.
- [ ] Security score and status are not deterministically linked, allowing contradictory quality signals.
- [ ] Security findings do not consistently carry requirement/test/evidence relationships needed by downstream repair and release decisions.

## 19. Reviewer → Release / Repair Loop

- [ ] Reviewer lacks a canonical source of requirements, architecture invariants, test results, build results, security results, deviations, and generated-project state.
- [ ] Reviewer lacks requirement-to-code traceability and can miss requirements buried in the project.
- [ ] Reviewer lacks a formal architectural invariant model and must subjectively judge compliance.
- [ ] Reviewer severity granularity is insufficient for deterministic release decisions.
- [ ] Reviewer PASS criteria can allow materially incorrect behavior to pass when findings do not cross the configured severity threshold.
- [ ] Reviewer findings lack sufficient evidence for another agent to act deterministically.
- [ ] Reviewer does not consume structured test/build/runtime/security evidence.
- [ ] Reviewer is stateless/static relative to the live repository and cannot independently verify runtime claims.
- [ ] Reviewer cannot distinguish confirmed defects from suspicion without a stronger evidence/confidence model.
- [ ] Reviewer lacks requirement-coverage state, so requirements can disappear without an explicit NOT VERIFIED state.
- [ ] Reviewer lacks deterministic architectural invariant verification.
- [ ] Reviewer has no meaningful regression awareness across repair iterations.
- [ ] Reviewer lacks an explicit blocking/non-blocking model independent of prose severity.
- [ ] Reviewer schema requirements can diverge from prompt requirements, allowing formally valid but semantically incomplete findings.
- [ ] Reviewer is being used as code reviewer, requirement verifier, architecture verifier, test substitute, and quality gate simultaneously.
- [ ] Release decisions depend too heavily on LLM judgment rather than deterministic evidence aggregation.
- [ ] Cases 8, 9, and 10 form a coupled verification/repair/review dependency and cannot be repaired independently.

## 20. Core Cascading Failure Chains

- [ ] Queen assumption → Planner formalizes assumption → Architect treats it as requirement → System models it → Blueprint encodes it → Coder implements it.
- [ ] Queen scope loss → Planner never receives omitted requirement → downstream traceability cannot recover the missing behavior.
- [ ] Planner schema/output mismatch → structured requirement state is unavailable or parsing is required → every downstream agent inherits a weaker contract.
- [ ] Planner ambiguity loss → Architect receives an apparently settled requirement → System/Designer/Blueprint implement an unauthorized interpretation.
- [ ] Architect authority ambiguity → System inherits a potentially incorrect technology/architecture decision → Blueprint and Coder reproduce it.
- [ ] Architect folder structure → Blueprinter treats it as authoritative → Coder generates the resulting files even if the architecture was never validated.
- [ ] System type/relationship ambiguity → Designer/Blueprint/Coder independently reinterpret data semantics → frontend/backend contract drift.
- [ ] System API vagueness → Designer and Blueprint invent request/response behavior → Coder implements an API that may compile but violate runtime contracts.
- [ ] Missing architecture-to-System consistency → architecture and backend can encode different communication models → downstream implementation becomes internally inconsistent.
- [ ] Designer API-binding gap → Blueprinter invents data sources/operations → Coder implements UI behavior not aligned with backend contracts.
- [ ] Blueprinter contract rewrite → canonical upstream meaning is replaced → Coder cannot recover because Blueprint is treated as authoritative.
- [ ] Blueprint type drift → Coder implements incorrect cross-layer types → integration defects may survive static validation.
- [ ] Coder one-shot execution → bad repository state/dependencies remain undiscovered → Tester becomes the first place the defect is observed.
- [ ] Coder no behavioral verification → compiler-valid but behaviorally wrong code reaches Tester.
- [ ] Static-only Tester → logical/security/API/UI defects remain undetected → pipeline can report success despite requirement failure.
- [ ] Weak Tester failure model → Debugger receives insufficient evidence → Debugger patches symptoms or cannot act.
- [ ] Debugger no post-repair regression testing → repair can introduce new defects without detection.
- [ ] Reviewer lacks evidence consumption → Reviewer rediscovers issues manually from final code and can disagree with actual test/build/security state.
- [ ] Security static-only review → runtime/configuration/dependency threats remain unverified → Reviewer may receive an incomplete security picture.
- [ ] Reviewer subjective PASS gate → undetected or under-classified defects can become release-eligible.
- [ ] Missing requirement/test/file/invariant traceability across stages → no agent can reliably prove end-to-end coverage of user intent.
