# Case 1

### Case audit format

**1. Test scenario**

- A realistic user request
- Complexity appropriate to the agent being tested
- Explicit constraints designed to expose weaknesses

**2. Agent under test**

- What the prompt claims the agent should do
- Inputs available to it
- Outputs/contracts expected

**3. Simulated execution**
I will actually perform the role using the current prompt and produce the output that the agent should produce.

**4. Output audit**
We inspect the generated output for:

- Missing information
- Hallucinated decisions
- Constraint violations
- Ambiguity
- Loss of upstream information
- Downstream usability
- Contract/schema violations

**5. Prompt-level root cause**
Exactly which instruction, omission, contradiction, or constraint caused the failure.

**6. Severity**

- **P0**: pipeline can fundamentally fail
- **P1**: materially degrades generated software
- **P2**: quality/maintainability issue
- **P3**: polish/optimization

**7. Prompt fix**
The exact change I recommend to the prompt, not vague advice like _“make it more robust.”_

**8. Runtime/architecture dependency**
Whether fixing it requires:

- Prompt only
- Schema change
- Orchestrator change
- Tooling change
- Context/state change
- Multiple of the above

**9. Downstream impact**
Which later agents are affected.

---

## Case 1: Queen → Planner

We'll start at the beginning because otherwise we'll spend three hours debugging the Coder when the Queen quietly murdered the requirements six stages earlier.

### Test Project A: Explicit technology constraints

**User request given to Queen:**

> Build a full-stack expense tracking web application for individuals.
>
> Users should be able to:
>
> - Sign up and log in
> - Add, edit, and delete expenses
> - Categorize expenses
> - View monthly spending totals
> - Filter expenses by category and date
> - See a simple dashboard with spending summaries
>
> Technical requirements:
>
> - Next.js
> - TypeScript
> - PostgreSQL
> - Prisma ORM
> - Tailwind CSS
> - Authentication must use JWT
> - Deployable to Vercel
>
> The application should be responsive and work well on mobile.
>
> Do not add payment processing, bank integrations, AI features, or social features.

This is deliberately boring.

That's useful because it lets us isolate whether the **prompt contract** works instead of hiding failures behind some exotic product requirement.

---

# Case 1A: Simulated Queen Output

Treating the current Queen prompt as the model's system instruction, its output should approximately be:

```markdown
# Project Specification

## Project Overview

A full-stack expense tracking web application for individuals to record,
manage, categorize, and analyze personal expenses through a responsive
web interface.

## Problem Statement

Individuals need a simple way to maintain expense records and understand
their monthly spending without unnecessary financial-management features.

## Target Users

Individuals who want to track personal expenses and monitor spending
patterns.

## Scope Summary

A responsive expense management application with authentication,
expense CRUD operations, categorization, filtering, and a dashboard
showing monthly spending summaries.

## Key Constraints

- Next.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- JWT authentication
- Vercel deployment
- Responsive/mobile-friendly interface

## MVP Scope - Included

- User registration
- User login
- JWT-based authentication
- Add expenses
- Edit expenses
- Delete expenses
- Expense categorization
- Filter expenses by category
- Filter expenses by date
- Monthly spending totals
- Dashboard with spending summaries
- Responsive interface

## MVP Scope - Excluded

- Payment processing
- Bank integrations
- AI features
- Social features

## User Personas

### Individual Expense Tracker

A user who wants to record expenses and understand personal spending
over time.

## Core User Journeys

1. User registers an account.
2. User logs in.
3. User adds an expense and assigns a category.
4. User views their recorded expenses.
5. User filters expenses by category or date.
6. User edits or deletes an expense.
7. User views monthly spending summaries.

## Technical Constraints

- Frontend: Next.js with TypeScript
- Styling: Tailwind CSS
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT
- Deployment target: Vercel
- The application must support responsive/mobile layouts.

## Assumptions

- Each expense belongs to an authenticated user.
- Users manage only their own expenses.
- Expense categories are associated with expenses.
- Monthly summaries are calculated from stored expense data.

## Risks

- Incorrect authorization could expose one user's expenses to another.
- JWT implementation and token handling must be secure.
- Database queries must correctly scope expense data to the authenticated user.
- Vercel deployment constraints may influence backend architecture.
```

Now we **stop pretending this is good just because it looks neat**.

## Queen output audit

### 1. Explicit technologies survived

**PASS**

The current prompt has specifically been strengthened to preserve user-mentioned platforms, frameworks, languages, databases, ORMs, and application types.

That is one of the better changes in the current version.

The critical test:

> Next.js + TypeScript + PostgreSQL + Prisma + Tailwind + JWT + Vercel

survived into both the general constraints and technical constraints.

This is important because the downstream Architect is explicitly told to use the upstream constraints.

**Severity:** None.

---

### 2. User requirements survived

**PASS, mostly**

The important functional requirements remain:

- authentication
- expense CRUD
- categories
- filtering
- monthly totals
- dashboard
- responsive UI

No obvious feature was silently removed.

This is a meaningful improvement over a generic requirements-extraction prompt.

---

### 3. The Queen invented authorization semantics

**WARNING**

The output says:

> “Each expense belongs to an authenticated user.”

and:

> “Users manage only their own expenses.”

These are sensible assumptions.

But they were **not explicitly stated by the user**.

The application is for individuals, so this is a reasonable interpretation, but the prompt doesn't clearly distinguish:

```text
USER REQUIREMENT
vs
AGENT INFERENCE
vs
ASSUMPTION
```

That matters because the assumption can propagate:

**Queen → Planner → Architect → System → API → Coder**

By the time the Coder sees it, an inference can look indistinguishable from an explicit requirement.

### Root cause

The prompt allows the Queen to produce assumptions but doesn't require provenance.

### Severity

**P1**

Not because this particular assumption is bad, but because the mechanism allows arbitrary inferred requirements to acquire authority.

### Recommended contract

Every extracted item should have provenance:

```text
source: USER_EXPLICIT
source: USER_IMPLIED
source: AGENT_ASSUMPTION
```

For example:

```json
{
  "requirement": "Users can only access their own expenses",
  "source": "USER_IMPLIED",
  "confidence": "HIGH",
  "rationale": "Application is described as individual expense tracking"
}
```

This becomes particularly important when we test ambiguous projects later.

---

# 4. Scope Summary is lossy

This is subtler.

The current Queen prompt asks for:

> 2–4 most important MVP features

That means the Scope Summary is inherently a **compression layer**.

For this application it says:

> authentication, expense CRUD, categorization, filtering, dashboard

which is fine.

But imagine the user gave us **18 requirements**, including three unusual but business-critical ones.

The Queen's Scope Summary can legally omit them.

If Planner consumes only the summarized snapshot rather than the complete structured requirements, those requirements can disappear permanently.

And that is exactly the kind of bug that doesn't throw an exception.

The software simply comes out wrong.

### Severity

**P1**

### Root cause

The prompt treats the Scope Summary as presentation rather than explicitly defining it as non-authoritative.

### Fix

State:

> `Scope Summary` is a human-readable overview only. It MUST NOT be used as the authoritative requirements source. Every user requirement must be preserved in the structured requirements contract and remain traceable downstream.

This connects directly to our earlier canonical-state problem.

---

# 5. "MVP Scope - Excluded" is dangerous

The current prompt effectively encourages the Queen to identify things that someone might expect but the user didn't request.

For this test, it produced:

```text
Payment processing
Bank integrations
AI features
Social features
```

Fortunately, the user explicitly excluded them.

But imagine:

> Build a project management application.

The Queen might decide:

```text
Excluded:
- Gantt charts
- Team chat
- Time tracking
- Notifications
```

None of those were necessarily discussed.

The agent has now manufactured negative requirements.

Later:

**Architect:** "Notifications are excluded."

**Coder:** "No notification system."

**Reviewer:** "No notifications."

And everyone congratulates themselves for faithfully following the specification that the user never wrote.

Beautiful.

### Severity

**P1**

### Fix

Change the semantic rule:

```text
MVP Scope - Excluded may contain ONLY:
1. functionality explicitly excluded by the user, or
2. functionality explicitly rejected during a recorded clarification/decision.

Never infer exclusions merely because the user did not mention a feature.
```

That is a very important distinction.

---

# 6. Queen is mixing different kinds of information

Look at:

```text
Key Constraints

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Tailwind
- JWT
- Vercel
- Responsive/mobile-friendly
```

These aren't all the same type of constraint.

They're actually:

```text
Framework
Language
Database
ORM
Styling technology
Authentication mechanism
Deployment target
UX requirement
```

Flattening them into one list loses semantic type.

That's survivable for a human.

It's worse for machines.

The Architect wants to make architectural decisions from this information.

A structured representation would be much stronger:

```json
{
  "technology_constraints": {
    "framework": ["Next.js"],
    "language": ["TypeScript"],
    "database": ["PostgreSQL"],
    "orm": ["Prisma"],
    "styling": ["Tailwind CSS"],
    "authentication": ["JWT"],
    "deployment": ["Vercel"]
  },
  "product_constraints": {
    "responsive": true
  }
}
```

### Severity

**P1**

### Fix

Introduce typed constraint categories.

---

# 7. The Queen does not establish requirement IDs

This is probably the most important missing piece in the Queen → Planner boundary.

We currently have:

```text
Add expenses
Edit expenses
Delete expenses
Filter expenses
...
```

But no:

```text
FR-001
FR-002
FR-003
...
```

Therefore later stages can't reliably say:

```text
FR-003 → API endpoint → implementation file → test → result
```

That becomes crucial for:

- Reviewer
- Tester
- regression testing
- acceptance testing
- Definition of Done

### Severity

**P1**

### Fix

Every requirement needs a stable ID at extraction time.

Example:

```json
{
  "id": "FR-001",
  "type": "functional",
  "statement": "Users can create an expense",
  "source": "USER_EXPLICIT"
}
```

The ID must survive the entire pipeline.

---

# 8. No acceptance semantics yet

Queen isn't necessarily supposed to write detailed acceptance tests.

That's Planner's job.

So this is **not itself a defect**.

But Queen should preserve enough structure that Planner can generate acceptance criteria without reconstructing the user's intent from prose.

For example:

```text
FR-003: User can delete an expense
```

is much better than:

```text
Expense management features
```

The current prompt gets us reasonably close, but not all the way.

---

# Case 1 verdict

### Queen prompt

| Dimension                    | Result       |
| ---------------------------- | ------------ |
| User intent preservation     | 🟢 Strong    |
| Explicit tech preservation   | 🟢 Strong    |
| Feature extraction           | 🟢 Strong    |
| Assumption control           | 🟠 Weak      |
| Scope exclusion control      | 🔴 Dangerous |
| Structured semantics         | 🟠 Weak      |
| Requirement traceability     | 🔴 Missing   |
| Downstream machine usability | 🟠 Moderate  |
| Losslessness                 | 🟠 Moderate  |

### Severity summary

**P1**

1. No provenance for inferred assumptions
2. Scope summary can become a lossy requirements channel
3. Arbitrary inferred exclusions
4. Untyped constraint representation
5. No stable requirement IDs

**Not a bug**

- Queen does not produce acceptance tests. That's Planner's responsibility.
- Queen doesn't make architecture decisions. That's Architect's responsibility.
- Queen doesn't define database/API details. That's also correct.

---

# The more interesting test

The first case was deliberately friendly.

Now we need to attack the Queen with a request where **human language is ambiguous**.

## Case 1B: Conflicting and ambiguous requirements

User says:

> Build an employee attendance system.
>
> It should be a web app using React and Node.js.
> Use PostgreSQL if a database is needed.
>
> Employees can check in and check out.
> Managers should be able to see attendance.
> It should work offline when there is no internet and sync when the connection comes back.
>
> Keep it simple. No need for anything complicated.
>
> It should support multiple companies because we may sell it as SaaS later.
>
> Don't build the SaaS billing part yet.

This is where the Queen prompt becomes much more interesting.

There are contradictions and unresolved architectural implications:

```text
"Keep it simple"
        vs
"Offline + sync"

"Multiple companies"
        vs
"Simple"

"SaaS later"
        vs
"Support multiple companies now"

"PostgreSQL if a database is needed"
        vs
"attendance + multi-company + sync"
```

The Queen should **not resolve these silently**.

The correct behavior is to preserve the conflict/ambiguity.

Something like:

```json
{
  "decision_needed": true,
  "issue": "Multi-company support scope",
  "statements": [
    "Application should support multiple companies",
    "SaaS billing should not be implemented"
  ],
  "interpretation": "Multi-tenant data isolation appears required, while billing is explicitly deferred",
  "confidence": "MEDIUM"
}
```

The current prompt doesn't establish a proper mechanism for this.

That is the next thing I'd attack before moving to Planner.

**Case 1 conclusion:** the Queen is now reasonably good at _extracting_ requirements, but not yet good enough at preserving **provenance, ambiguity, conflicts, and machine-traceable authority**. Those are the things that determine whether the rest of AutoCoder builds the user's application or builds a beautifully documented interpretation of it.

# Case 2: Planner → Architect

Now we move one stage downstream.

The Queen's job was to preserve the user's intent. The Planner's job is to turn that intent into a **software requirements specification** that the Architect can actually build from.

This is where we test whether the Planner is genuinely a requirements-engineering stage or merely a very confident Markdown formatter.

The current Planner prompt defines five major output areas: **Context Snapshot, Features, Functional Requirements, Non-Functional Requirements, and Acceptance Criteria**. It also has a structured `requirements` field in its schema, creating an important contract question.

---

# Test Case 2A: Normal full-stack application

We'll use the Queen output from Case 1:

> Full-stack expense tracking application
> Next.js + TypeScript + PostgreSQL + Prisma + Tailwind CSS + JWT
> Vercel deployment
> User authentication
> Expense CRUD
> Categories
> Date/category filtering
> Monthly spending summaries
> Responsive UI

The Planner receives the Queen's `plan.md` context snapshot.

## Simulated Planner Output

```markdown id="m7c4x2"
# Requirements Specification

## Context Snapshot

The application is a responsive full-stack expense tracking web
application for individuals.

The system allows authenticated users to manage personal expenses,
categorize them, filter them, and view monthly spending summaries.

The specified technology stack includes Next.js, TypeScript, PostgreSQL,
Prisma ORM, Tailwind CSS, and JWT authentication, with Vercel as the
deployment target.

## Features

### Authentication

Users can register and log in securely.

### Expense Management

Users can create, view, edit, and delete their expenses.

### Expense Categorization

Users can assign categories to expenses.

### Expense Filtering

Users can filter expenses by category and date.

### Spending Dashboard

Users can view monthly spending totals and summary information.

### Responsive Interface

The application provides a usable experience across desktop and mobile
screen sizes.

## Functional Requirements

### FR-001: User Registration

The system shall allow a user to create an account.

### FR-002: User Login

The system shall allow a registered user to authenticate.

### FR-003: Create Expense

The system shall allow an authenticated user to create an expense.

### FR-004: View Expenses

The system shall allow an authenticated user to view their expenses.

### FR-005: Update Expense

The system shall allow an authenticated user to modify an existing
expense.

### FR-006: Delete Expense

The system shall allow an authenticated user to delete an existing
expense.

### FR-007: Categorize Expense

The system shall allow an expense to be assigned a category.

### FR-008: Filter Expenses

The system shall allow expenses to be filtered by category and date.

### FR-009: Monthly Spending

The system shall calculate and display monthly spending totals.

### FR-010: Dashboard

The system shall provide a dashboard containing spending summaries.

## Non-Functional Requirements

### NFR-001: Responsiveness

The application shall provide a usable interface on mobile and desktop
devices.

### NFR-002: Authentication Security

Authentication data shall be handled securely.

### NFR-003: Data Isolation

Authenticated users shall only access their own expense data.

### NFR-004: Deployment

The application shall be deployable to Vercel.

## Acceptance Criteria

### AC-001

A new user can successfully register an account.

### AC-002

A registered user can log in successfully.

### AC-003

An authenticated user can create an expense.

### AC-004

An authenticated user can view their expenses.

### AC-005

An authenticated user can edit an existing expense.

### AC-006

An authenticated user can delete an existing expense.

### AC-007

An expense can be assigned a category.

### AC-008

Expenses can be filtered by category and date.

### AC-009

The dashboard displays monthly spending totals.

### AC-010

The interface remains usable on mobile and desktop screen sizes.
```

At first glance, this is pretty good.

Now we perform the unpleasant part.

---

# Finding 1: Planner loses requirement provenance

The Queen had information like:

```text
explicit user requirement
inferred assumption
technology constraint
```

The Planner turns everything into:

```text
FR-001
FR-002
...
```

The distinction disappears.

For example:

> "Users shall only access their own expense data."

was an inference from Case 1.

The Planner converts that into:

```text
NFR-003: Data Isolation
```

It now looks like a formal user requirement.

This is **requirement laundering**.

An agent's assumption enters the pipeline wearing a tiny fake moustache and comes out looking authoritative.

### Severity: P1

### Fix

Requirements need provenance to survive Planner:

```json
{
  "id": "FR-003",
  "statement": "Users can create expenses",
  "source": "USER_EXPLICIT",
  "parent_feature": "expense-management"
}
```

And inferred requirements:

```json
{
  "id": "SEC-001",
  "statement": "Users can only access their own expenses",
  "source": "AGENT_INFERENCE",
  "confidence": "HIGH"
}
```

Architect can then distinguish:

**must implement** versus **interpretation requiring validation**.

---

# Finding 2: Acceptance criteria are not actually testable enough

This is probably the biggest Planner problem.

Take:

> "An authenticated user can create an expense."

That is a useful requirement.

But it's not a sufficiently deterministic acceptance test.

What constitutes success?

We need something closer to:

```text
Given:
- authenticated user U exists
- U is logged in
- category C exists

When:
- U submits an expense with amount 500,
  category C, and date D

Then:
- the request succeeds
- exactly one expense is created
- the expense belongs to U
- returned amount = 500
- returned category = C
- returned date = D
```

Now the Tester can execute it.

The current Planner does not establish that level of structure.

### Severity: P1

### Root cause

The prompt asks for acceptance criteria but doesn't define an **executable acceptance-criteria contract**.

### Fix

Every criterion should have:

```text
id
requirement_id
preconditions
action
expected_result
negative_cases
verification_method
```

For example:

```json
{
  "id": "AC-003",
  "requirement_id": "FR-003",
  "preconditions": ["Authenticated user exists", "User session is valid"],
  "action": {
    "method": "POST",
    "operation": "create_expense"
  },
  "input": {
    "amount": 500,
    "category": "Food"
  },
  "expected": {
    "status": 201,
    "expense_created": true,
    "owner_is_authenticated_user": true
  }
}
```

Now **Tester**, **Coder**, **Reviewer**, and **Debugger** all have something concrete to work with.

---

# Finding 3: The structured schema and Markdown output disagree

This one is particularly important because it is a **prompt/runtime contract problem**.

The Planner prompt defines a structured `requirements` array in its schema, but its actual instructions primarily describe producing Markdown content.

So we effectively have:

```text
LLM thinks:
"Produce a requirements document."

Schema says:
"Return structured requirements."

Runtime potentially gets:
"Here is some Markdown."
```

That is not a cosmetic issue.

If downstream logic expects structured requirements, Markdown parsing becomes necessary.

And once you introduce:

```text
LLM → Markdown → parser → structured object
```

you've created another failure boundary.

### Severity: P0/P1 depending on runtime enforcement

If the schema is genuinely enforced and malformed output gets rejected:

**P0**, because the agent can fail.

If the system simply stores the Markdown:

**P1**, because the structured contract is effectively useless.

### Fix

Pick one canonical representation:

```text
LLM
 ↓
Structured PlannerOutput
 ↓
Schema validation
 ↓
Canonical Requirements State
 ↓
Markdown projection
```

Not:

```text
LLM
 ↓
Markdown
 ↓
regex/parser
 ↓
hope
```

This connects directly to the larger AutoCoder architecture problem we identified earlier.

---

# Finding 4: Planner doesn't distinguish functional from technical constraints strongly enough

The Planner receives:

```text
Next.js
TypeScript
PostgreSQL
Prisma
Tailwind
JWT
Vercel
```

It correctly preserves them.

But the output doesn't establish which are:

```text
user-mandated
agent-selected
deployment constraints
implementation constraints
preferences
```

That becomes critical in the Architect stage.

Suppose the user says:

> "Use PostgreSQL if a database is needed."

That's very different from:

> "The application MUST use PostgreSQL."

Planner should preserve that distinction.

### Severity: P1

### Fix

Add constraint metadata:

```json
{
  "id": "TECH-001",
  "category": "database",
  "value": "PostgreSQL",
  "authority": "USER",
  "strength": "PREFERRED"
}
```

versus:

```json
{
  "id": "TECH-001",
  "category": "database",
  "value": "PostgreSQL",
  "authority": "USER",
  "strength": "MANDATORY"
}
```

---

# Finding 5: NFRs are too easy to hallucinate

The Planner generated:

> Authentication data shall be handled securely.

This sounds wonderful.

It means almost nothing.

What does "securely" mean?

- Secure cookies?
- JWT in HTTP-only cookies?
- Token expiration?
- Refresh tokens?
- Password hashing?
- CSRF protection?
- Rate limiting?

The Planner has turned an engineering requirement into a motivational poster.

Same problem with:

> The application shall be deployable to Vercel.

That is technically useful, but still underspecified.

### Severity: P1

### Fix

NFRs should either:

1. be directly stated by the user, or
2. be derived with explicit rationale and measurable criteria.

For example:

```text
NFR-002
Authentication

Requirement:
Authentication credentials/tokens must not be exposed to client-side
JavaScript unnecessarily.

Verification:
Security inspection + authentication integration test.
```

---

# Finding 6: Feature → requirement relationship isn't explicit

We have:

```text
Feature:
Expense Management

FR-003
FR-004
FR-005
FR-006
```

But the current prompt doesn't require an explicit machine-readable relationship.

Later, Reviewer wants to answer:

> Does every feature have implementation?

Tester wants:

> Which tests verify this feature?

Coder needs:

> What exactly am I implementing?

Without IDs and relationships:

```text
Feature
   ↓
Requirements
   ↓
Architecture
   ↓
Files
   ↓
Tests
```

becomes mostly semantic guesswork.

### Severity: P1

### Fix

Explicit traceability:

```text
Feature F-002
 ├── FR-003
 ├── FR-004
 ├── FR-005
 └── FR-006
```

And eventually:

```text
FR-003
 ├── API-004
 ├── DB-002
 ├── FILE-017
 └── TEST-008
```

---

# Finding 7: Planner doesn't handle ambiguity

Let's feed it the **Case 1B** Queen scenario:

> Attendance system
> React + Node.js
> PostgreSQL if needed
> Offline operation + synchronization
> Multiple companies
> SaaS later
> No billing yet
> "Keep it simple"

A weak Planner might output:

```text
FR-001: Employee check-in
FR-002: Employee check-out
FR-003: Manager attendance dashboard
FR-004: Offline functionality
FR-005: Synchronization
FR-006: Multi-company support
```

The problem is that the Planner has **resolved architectural/product ambiguity without authorization**.

It should instead surface questions such as:

```text
DEC-001
Multi-tenancy is required now, but SaaS billing is explicitly deferred.
The specification does not define whether tenant isolation must exist in
the initial MVP architecture.

Status: UNRESOLVED
```

The current prompt doesn't give the Planner a proper decision/ambiguity mechanism.

### Severity: P1

---

# Finding 8: "WHAT, not HOW" is correct, but incomplete

The Planner is explicitly told to focus on **WHAT** rather than implementation.

That's good.

We don't want Planner deciding:

```text
PostgreSQL table:
employees(...)
```

before Architect.

But there is a danger on the opposite side.

Requirements still need **behavioral precision**.

Bad:

> System should support attendance.

Good:

> An authenticated employee can record one check-in event for the current workday.

That is still **WHAT**.

The prompt needs to teach the model the difference between:

```text
implementation detail
```

and:

```text behavioral specificity

```

Otherwise "don't say HOW" can produce vague requirements.

### Severity: P1

---

# Finding 9: No negative requirements / failure criteria

Our acceptance criteria only test:

```text
happy path
```

But generated applications fail most spectacularly at boundaries.

For expense tracking:

```text
What happens if amount = -500?
What if category doesn't exist?
What if expense belongs to another user?
What if date is invalid?
What if unauthenticated user calls the endpoint?
What if duplicate submission occurs?
```

The Planner isn't required to create negative acceptance criteria.

### Severity: P1

---

# Finding 10: No requirement priority

Everything becomes equally important.

```text
FR-001 Authentication
FR-002 Login
FR-003 Create Expense
...
```

But if the system needs to make tradeoffs, we need:

```text
MUST
SHOULD
COULD
```

or:

```text
P0
P1
P2
```

Without this, the later agents cannot distinguish:

> "critical business behavior"

from:

> "nice dashboard enhancement."

### Severity: P2

---

# Planner scorecard

| Dimension                         | Result           |
| --------------------------------- | ---------------- |
| Requirements extraction           | 🟢 Good          |
| Feature decomposition             | 🟢 Good          |
| WHAT vs HOW separation            | 🟢 Good          |
| Acceptance criteria presence      | 🟢               |
| Acceptance criteria executability | 🔴 Poor          |
| Requirement traceability          | 🔴 Missing       |
| Provenance                        | 🔴 Missing       |
| Ambiguity handling                | 🔴 Missing       |
| Negative behavior                 | 🔴 Missing       |
| Priority                          | 🟠 Weak          |
| Structured output contract        | 🔴 Contradictory |
| NFR quality                       | 🟠 Weak          |
| Downstream usefulness             | 🟠 Moderate      |

---

# Case 2 verdict

The Planner is **better than the Queen at organizing information, but worse than it needs to be at preserving semantic authority**.

The biggest issue isn't that it produces bad requirements.

It produces **plausible requirements that are insufficiently machine-verifiable**.

That's much more dangerous.

### P0

**1. Structured schema ↔ actual output contract mismatch**

### P1

**2. No requirement provenance**

**3. No executable acceptance-test structure**

**4. No feature → requirement traceability**

**5. No ambiguity/decision mechanism**

**6. No distinction between mandatory/preferred technical constraints**

**7. NFRs can become vague or invented**

**8. No negative/failure acceptance criteria**

**9. Behavioral precision isn't explicitly taught**

### P2

**10. No requirement priority model**

---

## The corrected Planner contract should ultimately look more like this

```text
Queen
  ↓
Canonical Project Intent
  │
  ├── Features
  ├── Requirements
  ├── Constraints
  ├── Assumptions
  ├── Decisions
  └── Ambiguities
  ↓
Planner
  ↓
Canonical Requirements
  │
  ├── FR-xxx
  ├── NFR-xxx
  ├── AC-xxx
  ├── priorities
  ├── provenance
  ├── dependencies
  └── verification method
  ↓
Architect
```

That gives Architect something far more valuable than another Markdown document: **a deterministic requirements contract**.

# Case 3: Architect → System / Designer / Blueprinter

Now we test the **Architect**, which is where the pipeline stops merely describing the product and starts making consequential engineering decisions.

The current Architect prompt receives the plan and requirements snapshots and is responsible for deciding the technology stack, folder structure, modules, conventions, and architecture. It also explicitly says that user-specified technologies must be preserved.

The central question:

> **Can the Architect make good architectural decisions without overriding the user, inventing requirements, or creating a structure that downstream agents cannot actually implement?**

---

# Test Case 3A: Explicit Stack + Real Architecture

We'll use the Planner output from Case 2:

### Product

Expense tracking application.

### Requirements

- Registration/login
- JWT authentication
- Expense CRUD
- Categories
- Date/category filtering
- Monthly summaries
- Dashboard
- Responsive UI
- Users only access their own expenses
- Vercel deployment

### Explicit technology constraints

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- JWT

---

# Simulated Architect Output

Applying the current Architect prompt as faithfully as possible:

````markdown id="q5v7ka"
# Architecture Specification

## Context Snapshot

The system is a responsive full-stack expense tracking web application
for individuals.

The application provides authentication, expense management,
categorization, filtering, monthly spending summaries, and a dashboard.

## Architecture Overview

The application will use a Next.js full-stack architecture with
TypeScript.

The frontend will use Next.js and Tailwind CSS.

The backend functionality will be implemented through Next.js server-side
routes and services.

PostgreSQL will provide persistent storage through Prisma ORM.

JWT will be used for authentication.

The application will be structured into presentation, API, service,
authentication, database, and shared layers.

## Technology Stack

- Framework: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT
- Deployment: Vercel

## Folder Structure

```text
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── expenses/
│   │   └── categories/
│   ├── dashboard/
│   ├── login/
│   └── register/
├── components/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── services/
│   └── validation/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/
├── public/
├── styles/
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```
````

## Modules

### Authentication

Responsible for registration, login, JWT handling, authentication
validation, and authorization.

### Expense Management

Responsible for creating, reading, updating, and deleting expenses.

### Categories

Responsible for assigning and retrieving expense categories.

### Dashboard

Responsible for retrieving monthly spending summaries.

### Database

Responsible for PostgreSQL access through Prisma.

### Validation

Responsible for validating API inputs.

## Coding Conventions

- TypeScript will be used throughout the application.
- Shared types will be stored in the types directory.
- Database access will use Prisma.
- API routes will validate input before processing.
- Authentication and authorization checks will be performed before
  accessing user-specific resources.
- Components will use Tailwind CSS for styling.
- Environment variables will be used for secrets and configuration.

## Key Constraints

- Next.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- JWT authentication
- Vercel deployment
- Responsive/mobile-friendly interface

## Architectural Decisions

1. Next.js will provide both the frontend and backend route layer.
2. PostgreSQL will provide persistent relational storage.
3. Prisma will provide database access.
4. JWT will provide authentication.
5. User ownership will be enforced at the service/API layer.
6. Validation will occur before service operations.

````

This looks competent.

It is also hiding several architectural landmines.

---

# Finding 1: The Architect has an authority contradiction

The prompt effectively says two things:

1. Preserve upstream constraints.
2. Add the technology stack chosen by the Architect.

That creates an unresolved authority problem.

Suppose the user says:

> Use MongoDB.

Architect decides:

> PostgreSQL is better.

What wins?

The current prompt strongly implies that user technology must be preserved, but doesn't define an explicit **constraint-resolution hierarchy** for conflicts.

This is particularly dangerous because "architecture" agents are naturally inclined to optimize.

And optimization is precisely where autonomous systems start deciding that the human's requirements were merely suggestions.

### Severity: P0/P1

I would call this **P0 if the runtime allows Architect output to silently override explicit requirements**.

### Required rule

The Architect needs an explicit hierarchy:

```text
USER_MANDATORY_CONSTRAINT
        ↓
USER_PREFERENCE
        ↓
SYSTEM_REQUIREMENT
        ↓
ARCHITECTURAL_OPTIMIZATION
````

And:

> The Architect MUST NOT replace a `USER_MANDATORY_CONSTRAINT`.

If the constraint is technically incompatible:

```text
status: BLOCKED
reason: constraint conflict
required_decision: true
```

Not:

> "I know better."

---

# Finding 2: Architecture invents implementation details before System

Look at:

```text
id="y6f1r2"
app/api/
app/dashboard/
lib/auth/
lib/db/
lib/services/
lib/validation/
```

Some of these are reasonable.

But the Architect is already determining concrete API and service organization.

That isn't inherently wrong. In fact, Architecture needs some module boundaries.

The problem is **the boundary between architectural decision and implementation detail is undefined**.

For example:

> `app/api/auth/`

is an architectural decision.

But:

> `/api/auth/register`

belongs closer to System/API design.

The current prompt doesn't establish that boundary.

### Severity: P1

### Fix

Architect defines:

```text
Authentication module
Expense module
Category module
Reporting module
```

System defines:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/expenses
...
```

Architect can define _where_ the module lives.

System defines _what the API contract is_.

---

# Finding 3: The `index.html` rule is architecturally wrong for some frameworks

This is one of the more concrete defects.

The Architect prompt currently contains a convention requiring web applications to include `index.html`, except for certain server-rendered frameworks.

That is too broad.

A Next.js App Router application does not need a root:

```text
index.html
```

and introducing one can actively confuse the project structure.

The current simulated output avoided it because Next.js is explicitly exempted, but the rule itself remains dangerous.

Consider:

```text
Vite + React
```

An `index.html` is appropriate.

```text
Next.js
```

Not in the same sense.

```text
Astro
```

Different again.

```text
SvelteKit
```

Different.

### Severity: P1

### Fix

Replace framework-specific heuristics with:

> The architecture must follow the canonical project structure of the selected framework. Do not impose files required by another framework.

That is much more robust.

---

# Finding 4: The folder tree becomes a hidden contract

This is a major downstream problem.

Architect produces:

```text
app/
components/
lib/
types/
prisma/
...
```

Then Blueprinter is instructed to create files based on the architecture tree.

So the folder structure isn't merely descriptive.

It becomes:

```text
Architect
   ↓
Blueprinter
   ↓
Coder
```

Therefore a bad architectural folder decision propagates directly into source generation.

The Architect currently doesn't appear to have a deterministic validation stage asking:

> Does this structure actually satisfy every requirement and framework convention?

### Severity: P1

### Fix

Before Architecture becomes authoritative:

```text
Architecture
 ↓
Architecture Validator
 ├── requirement coverage
 ├── framework validity
 ├── technology compatibility
 ├── module completeness
 ├── dependency consistency
 └── deployment compatibility
```

Only then:

```text
Validated Architecture
 ↓
Blueprinter
```

---

# Finding 5: No explicit requirement coverage matrix

This is the big one.

Given:

```text
FR-001 registration
FR-002 login
FR-003 create expense
...
```

the Architect should prove:

```text
FR-001 → Authentication module
FR-002 → Authentication module
FR-003 → Expense module
...
```

Instead, we get prose.

That means the Architect can accidentally omit something.

For example:

> Monthly spending totals

appears under Dashboard.

Good.

But imagine a more complex requirement:

> Managers can view attendance for employees in their own company.

The Architect might create:

```text
Attendance module
Dashboard module
```

without preserving:

```text
company isolation
manager authorization
employee ownership
```

### Severity: P1

### Fix

Architecture needs a machine-readable coverage map:

```json id="h4k3q9"
{
  "requirement_id": "FR-009",
  "modules": ["dashboard", "expense-service", "authorization"],
  "architectural_support": ["monthly aggregation", "user-scoped queries"]
}
```

Now Reviewer can later verify that the requirement wasn't merely mentioned.

---

# Finding 6: The Architect can invent modules

The prompt asks for modules, so some invention is expected.

But there's no distinction between:

```text
REQUIRED MODULE
```

and:

```text
ARCHITECTURAL CONVENIENCE
```

Suppose the user asks for a tiny static site.

Architect could generate:

```text
auth/
services/
repositories/
controllers/
domain/
validators/
adapters/
```

Because apparently five buttons require a distributed enterprise architecture.

### Severity: P2

For AutoCoder, however, this can become P1 because unnecessary architecture increases generated-file count and therefore:

- context size
- generation cost
- failure surface
- cross-file inconsistency
- debugging complexity

### Fix

Require:

> Every module must have a documented responsibility and at least one consuming requirement.

And:

> Do not introduce architectural layers solely because they are conventional. Use the minimum architecture necessary for the project's requirements and selected framework.

---

# Finding 7: No explicit dependency graph

The Architect produces modules, but doesn't formally express:

```text
auth → user
expense → auth
dashboard → expense
```

That becomes problematic for Blueprinter's dependency ordering.

A proper architectural output needs:

```text
module dependency graph
```

not just a folder tree.

Example:

```text id="0w2i7f"
Authentication
    ↓
Authorization
    ↓
Expense Service
    ↓
Dashboard Aggregation
```

### Severity: P1

This connects directly to the larger semantic dependency graph problem we identified earlier.

---

# Finding 8: Deployment compatibility is asserted, not demonstrated

The output says:

> Vercel deployment

and architecture says:

> Next.js full-stack architecture.

Reasonable.

But there is no explicit check for:

```text
What runs on Vercel?
What requires persistent processes?
Where does PostgreSQL live?
How are environment variables handled?
Does JWT strategy work with the selected runtime?
Are there Node/runtime constraints?
```

The Architect isn't necessarily supposed to solve all deployment details.

But it **should establish deployment constraints**.

### Severity: P2

Potentially P1 for projects requiring:

- WebSockets
- background workers
- persistent processes
- local filesystem
- native binaries
- scheduled jobs

### Fix

Add:

```text
Deployment Model
Runtime Constraints
External Services
Persistence Requirements
Environment Requirements
```

---

# Finding 9: The Architect doesn't explicitly detect impossible combinations

Let's use a deliberately bad request:

> Build a Vercel-hosted application using Next.js.
>
> It must run a persistent background worker continuously on the same
> deployment instance.
>
> It must maintain an in-memory queue that survives deployments.

A weak Architect might produce:

```text
Next.js
Vercel
Background Worker
In-memory queue
```

and continue happily.

A real Architect should say:

```text
ARCHITECTURE BLOCKED

Conflict:
Persistent worker + deployment/runtime constraints.

Required resolution:
External worker/queue infrastructure or revised deployment requirement.
```

The current prompt does not sufficiently enforce this behavior.

### Severity: P1

---

# Finding 10: Architecture doesn't distinguish decisions from recommendations

This is subtle but important.

Suppose Architect says:

> PostgreSQL will provide persistent relational storage.

Is this:

```text
mandatory decision
```

or:

```text recommendation

```

The downstream Blueprinter/Coder has no reason to know.

Everything in the architecture document acquires roughly equal authority.

We need:

```text
DECISION
RATIONALE
AUTHORITY
STATUS
```

Example:

```json id="ynw4n8"
{
  "decision_id": "ARCH-004",
  "decision": "Use PostgreSQL",
  "authority": "USER_MANDATORY",
  "status": "LOCKED"
}
```

versus:

```json id="n4v6ps"
{
  "decision_id": "ARCH-005",
  "decision": "Use service-layer validation",
  "authority": "ARCHITECT",
  "status": "RECOMMENDED"
}
```

That distinction becomes extremely valuable when debugging contradictory downstream output.

---

# Finding 11: The Architect's output is too prose-heavy for downstream generation

This is not because Markdown is inherently bad.

It's because **Blueprinter is expected to extract exact implementation structure from it**.

We currently have:

```text
Architecture Markdown
       ↓
Blueprinter interpretation
       ↓
File specifications
```

That creates semantic drift.

A stronger architecture contract would contain:

```text
Project
├── constraints[]
├── decisions[]
├── modules[]
├── dependencies[]
├── requirementCoverage[]
├── runtime[]
├── deployment[]
└── fileStructure[]
```

Markdown becomes a rendered view.

Not the database.

---

# The killer test: conflicting technology choice

Let's actually attack the Architect.

### User requirement

> Build a web application using React, Node.js, and MongoDB.
> It must be deployable to Vercel.

Now suppose the Architect thinks:

> PostgreSQL + Prisma is cleaner.

Current prompt's behavior is ambiguous.

A strong architecture model should output something like:

```text
ARCHITECTURE DECISION

User-mandated:
- React
- Node.js
- MongoDB
- Vercel

The architecture MUST preserve these choices.

Potential compatibility concern:
A traditional persistent Node.js backend process is not equivalent to
Vercel's serverless runtime.

Resolution:
Use React/Next-compatible frontend architecture with server-side
Node.js-compatible functions and an externally hosted MongoDB service,
subject to runtime compatibility.

Do not replace MongoDB with PostgreSQL.
```

That is the behavior we want.

The Architect should **adapt architecture around constraints**, not adapt constraints around its preferred architecture.

---

# Architect Scorecard

| Dimension                     | Result               |
| ----------------------------- | -------------------- |
| Technology preservation       | 🟢 Strong            |
| Basic architecture generation | 🟢 Good              |
| Folder structure              | 🟢 Good              |
| Module identification         | 🟢 Good              |
| Requirement coverage          | 🔴 Missing           |
| Constraint authority          | 🔴 Ambiguous         |
| Conflict detection            | 🔴 Weak              |
| Architecture validation       | 🔴 Missing           |
| Dependency graph              | 🔴 Missing           |
| Decision provenance           | 🔴 Missing           |
| Deployment reasoning          | 🟠 Moderate          |
| Framework correctness         | 🟠 Needs improvement |
| Machine-readable output       | 🔴 Weak              |
| Downstream determinism        | 🟠 Moderate          |

---

# Case 3 Verdict

The Architect is **conceptually competent but contractually under-specified**.

It can produce a convincing architecture document.

The problem is that AutoCoder doesn't need convincing documents.

It needs **authoritative engineering decisions that machines can consume without reinterpretation**.

### P0

**1. No explicit authority/conflict-resolution model**

If Architect can override mandatory user constraints, this is catastrophic.

### P1

**2. No requirement → architecture coverage mapping**

**3. No architecture validation gate**

**4. No module dependency graph**

**5. No distinction between locked decisions and recommendations**

**6. No robust handling of technically incompatible constraints**

**7. Folder structure becomes an unchecked hidden contract**

**8. Architecture/API boundary isn't clearly defined**

**9. Framework-specific structural rules can produce invalid/unnecessary files**

**10. Prose architecture is being used as an implementation contract**

### P2

**11. No architectural complexity budget**

**12. Deployment constraints are underspecified**

---

# What the Architect should ultimately produce

The important transformation is:

```text
CURRENT

requirements.md
      ↓
Architect
      ↓
architecture.md
      ↓
Blueprinter interprets it
```

into:

```text
CURRENT TARGET

Canonical Requirements
      ↓
Architect
      ↓
Validated Architecture Contract
      │
      ├── locked constraints
      ├── architectural decisions
      ├── modules
      ├── module dependencies
      ├── requirement coverage
      ├── runtime constraints
      ├── deployment constraints
      └── file structure
      ↓
architecture.md  ← projection
      ↓
Blueprinter
```

The key principle:

> **Architecture should resolve implementation strategy, but it must never silently rewrite product intent.**

# Case 4: System / Backend Architect

Now we hit the backend contract.

The current **System** prompt takes the outputs of Plan, Requirements, and Architecture and produces the backend specification: database entities, seed data, API endpoints, backend services, middleware, and authentication/authorization rules.

This is a particularly important stage because its output becomes the source of truth for both **Blueprinter and Coder**. A bad decision here gets replicated across schema, API, services, and eventually code.

We'll use the same expense tracker first, then attack it with cases designed specifically against the System prompt's hard-coded assumptions.

---

# Test Case 4A: Expense Tracker

### Inputs

Architecture has established:

```text
Next.js
TypeScript
PostgreSQL
Prisma
JWT
Vercel
```

Requirements:

```text
FR-001 Registration
FR-002 Login
FR-003 Create expense
FR-004 View expenses
FR-005 Update expense
FR-006 Delete expense
FR-007 Categories
FR-008 Filtering
FR-009 Monthly spending
FR-010 Dashboard
```

The inferred requirement is:

```text
Users must only access their own expenses.
```

---

# Simulated System Output

Applying the current System prompt:

````markdown id="c9q4rm"
# Backend Specification

## Context Snapshot

The application is a full-stack expense tracking web application using
Next.js, TypeScript, PostgreSQL, Prisma ORM, Tailwind CSS, and JWT
authentication.

Authenticated users can manage their own expenses, categorize expenses,
filter them, and view monthly spending summaries.

## Database Entities

### User

Fields:

- id: string
- email: string
- passwordHash: string
- createdAt: Date
- updatedAt: Date

Relationships:

- User has many Expense records.

### Category

Fields:

- id: string
- name: string
- createdAt: Date
- updatedAt: Date

Relationships:

- Category has many Expense records.

### Expense

Fields:

- id: string
- userId: string
- categoryId: string
- amount: number
- description: string
- date: Date
- createdAt: Date
- updatedAt: Date

Relationships:

- Expense belongs to User.
- Expense belongs to Category.

## Seed Data

The database should contain 3-5 realistic category records such as:

- Food
- Transport
- Entertainment
- Utilities
- Shopping

## API Endpoints

### Authentication

POST /api/auth/register

Request:

```json
{
  "email": "user@example.com",
  "password": "string"
}
```
````

Response:

```text
User
```

POST /api/auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

Response:

```text
Authentication token
```

### Expenses

GET /api/expenses

Returns the authenticated user's expenses.

POST /api/expenses

Creates an expense for the authenticated user.

GET /api/expenses/:id

Returns a specific expense owned by the authenticated user.

PUT /api/expenses/:id

Updates an expense owned by the authenticated user.

DELETE /api/expenses/:id

Deletes an expense owned by the authenticated user.

### Categories

GET /api/categories

Returns available categories.

POST /api/categories

Creates a category.

## Backend Services

### AuthService

Responsible for:

- Registration
- Password hashing
- Login
- JWT generation
- Authentication

### ExpenseService

Responsible for:

- Expense CRUD
- Ownership checks
- Expense filtering
- Monthly totals

### CategoryService

Responsible for category operations.

### DashboardService

Responsible for monthly spending summaries.

## Middleware

### Authentication Middleware

Validates JWT authentication before protected operations.

### Validation Middleware

Validates request payloads.

## Authentication and Authorization

- Registration and login are public.
- Expense operations require authentication.
- Expense records must be scoped to the authenticated user.
- Unauthorized access must be rejected.
- Passwords must not be stored in plaintext.

````

Again, it looks pretty good.

And again, this is where we start breaking it.

---

# Finding 1: The System prompt hardcodes a database entity convention

The current prompt requires every entity to have:

```text id
createdAt
updatedAt
````

That's an extremely strong rule.

For our `User` and `Expense`, perfectly reasonable.

But consider:

### Case

```text
AuditEvent
```

Maybe it is immutable.

It doesn't logically need `updatedAt`.

Or:

```text
PasswordResetToken
```

It may need:

```text expiresAt

```

but an `updatedAt` field has little value.

Or:

```text CountryCode

```

A static reference entity may not need timestamps at all.

The prompt doesn't say:

> Include these fields unless the domain model provides a reason not to.

It effectively says:

> Every entity gets them.

### Severity: P1

### Why this matters

This isn't merely cosmetic.

It can force the generated Prisma schema to contain meaningless fields and encourage the Coder to maintain data that has no domain purpose.

### Fix

Change the rule from a universal invariant to a default:

```text
Every mutable application entity should normally include:
- id
- createdAt
- updatedAt

The agent may omit a field when the entity's lifecycle makes it
meaningless, but must provide a rationale.
```

---

# Finding 2: Field type restrictions are dangerously simplistic

The current System prompt restricts fields to a narrow set of types such as:

```text
string
number
boolean
Date
string[]
```

That immediately becomes problematic for PostgreSQL/Prisma.

Real applications commonly need:

```text
Decimal
Int
BigInt
Json
Enum
Bytes
DateTime
relations
nullable types
```

Our expense tracker is already an example.

### `amount: number`

For financial values, floating-point numbers are usually a poor representation.

A proper database model may want:

```text
Decimal
```

rather than JavaScript `number`.

The System prompt's type restriction pushes the model toward the wrong representation.

### Severity: P1

This is a genuine architectural-quality defect.

### Fix

Do **not** maintain a universal field-type whitelist.

Instead:

```text
The System agent must select types appropriate to:
1. the domain semantics,
2. the selected database,
3. the selected ORM,
4. precision/range requirements,
5. nullability,
6. indexing/query behavior.
```

Then validate the result against the chosen ORM/database.

---

# Finding 3: No explicit nullability

The output says:

```text id="m2jv8b"
description: string
categoryId: string
```

But is description:

```text
NOT NULL
```

or:

```text
NULL
```

?

What about:

```text categoryId

```

Can an expense exist without a category?

The current output format doesn't force the agent to specify:

- nullable
- default
- unique
- indexed
- foreign-key behavior

Those are essential database semantics.

### Severity: P1

### Fix

Every field should include:

```json id="b0v2pw"
{
  "name": "amount",
  "type": "Decimal",
  "nullable": false,
  "default": null,
  "unique": false,
  "indexed": false
}
```

For relationships:

```json id="8v0qay"
{
  "field": "userId",
  "references": "User.id",
  "onDelete": "Cascade"
}
```

---

# Finding 4: Relationship semantics are underspecified

The System output says:

> User has many Expense records.

That's not enough.

We need to know:

```text id="j2q9k8"
User 1 ─── N Expense
Category 1 ─── N Expense
```

and:

- Is `categoryId` mandatory?
- What happens if a category is deleted?
- What happens when a user is deleted?
- Can categories be user-specific?
- Are categories global?
- Can two categories have the same name?
- Are categories mutable?

None of this is specified.

### Severity: P1

---

# Finding 5: The category model is potentially wrong

This is an excellent example of a seemingly harmless assumption.

The System agent creates:

```text
Category
 ├── id
 ├── name
 └── timestamps
```

and seeds:

```text
Food
Transport
Entertainment
Utilities
Shopping
```

But the product is for **individual users**.

Are categories:

```text
global?
```

or:

```text
owned by each user?
```

The System prompt doesn't force this question.

If categories are global, users may be unable to create their own categories.

If categories are per-user, the model is missing:

```text
userId
```

The architecture therefore contains a potentially incorrect domain model.

### Severity: P1

---

# Finding 6: Seed data is unnecessarily mandatory

The current System prompt explicitly asks for realistic seed records for the primary entity/database.

For this application, it created categories.

That's harmless.

But imagine:

```text
Healthcare system
```

or:

```text
Employee management system
```

or:

```text
Customer relationship system
```

Automatically generating "realistic" seed records could create:

- fake personal data
- misleading domain records
- inappropriate defaults
- privacy issues
- test assumptions

More importantly, **seed data is not a user requirement**.

### Severity: P2

### Better rule

Seed data should be generated only when:

```text
- required for local development/demo
- explicitly requested
- necessary to validate a reference-data model
```

And it should be clearly marked as synthetic.

---

# Finding 7: API contract is far too vague

Look at:

```text id="my5c8c"
Response:
User
```

or:

```text
Response:
Authentication token
```

This is not an API contract.

The Coder eventually needs to know:

```json id="7k9xv4"
{
  "user": {
    "id": "...",
    "email": "..."
  },
  "token": "..."
}
```

or perhaps:

```json
{
  "accessToken": "...",
  "expiresAt": "..."
}
```

The System prompt doesn't require formal request/response schemas.

### Severity: P1

### Fix

Every endpoint should define:

```text
method
path
authentication
authorization
request params
query params
request body schema
response status
response body schema
error responses
side effects
```

For example:

```json id="f1qf1f"
{
  "method": "POST",
  "path": "/api/expenses",
  "auth": "required",
  "request": {
    "amount": "Decimal",
    "categoryId": "string",
    "description": "string?",
    "date": "Date"
  },
  "responses": {
    "201": "Expense",
    "400": "ValidationError",
    "401": "Unauthorized",
    "404": "CategoryNotFound"
  }
}
```

Now the Coder has something deterministic.

---

# Finding 8: HTTP semantics are incomplete

The prompt pushes REST conventions, but the output doesn't establish:

```text
400
401
403
404
409
422
500
```

or which endpoint uses which.

This matters especially for authorization.

Suppose:

```text
GET /api/expenses/123
```

where expense `123` belongs to another user.

Do we return:

```text
403 Forbidden
```

or:

```text
404 Not Found
```

?

That is a security-sensitive behavioral decision.

The System prompt doesn't force the distinction.

### Severity: P1

---

# Finding 9: Authorization is underspecified

The output says:

> Expense records must be scoped to the authenticated user.

Good.

But how?

The system should establish a rule such as:

```text
Every query for a user-owned resource MUST include authenticated
principal ownership in its database predicate.
```

For example:

```text
WHERE expense.id = requestedId
AND expense.userId = authenticatedUserId
```

The important part is that authorization shouldn't be:

```text
fetch expense
↓
check owner later
```

if the data access layer can enforce the ownership predicate directly.

The current prompt doesn't provide this level of precision.

### Severity: P1

---

# Finding 10: JWT is accepted without specifying the trust model

The System agent correctly preserves JWT because the user required it.

But JWT authentication isn't a complete design.

The system needs decisions around:

```text
token storage
expiration
signing algorithm
secret/key management
refresh strategy
revocation
rotation
CSRF considerations
```

The prompt says "JWT" and "securely".

That isn't enough.

### Severity: P1

---

# Finding 11: No transaction requirements

Consider:

```text
Create expense
```

Simple.

But later:

```text
Create invoice
→ update inventory
→ record payment
→ create audit event
```

Now transaction boundaries matter.

The System prompt doesn't require the agent to identify transactional operations.

### Severity: P2

It becomes P1 for genuinely transactional domains.

---

# Finding 12: No indexes/query strategy

Our requirements explicitly include:

```text
filter by category
filter by date
monthly totals
```

Those imply database access patterns.

The System output doesn't establish:

```text id="b2rqg6"
Expense(userId, date)
Expense(userId, categoryId)
Expense(userId, date, categoryId)
```

or equivalent indexes.

The System agent should derive database optimization requirements from the query patterns.

### Severity: P1

Especially because this stage is supposed to design the database.

---

# Finding 13: No requirement coverage

This is inherited from Planner and Architect, but it becomes especially visible here.

We need:

```text id="1fr4vf"
FR-003 Create Expense
    ↓
POST /api/expenses
    ↓
ExpenseService.create()
    ↓
Expense table
    ↓
AC-003
```

Instead, the System output merely contains endpoints that "look like" they cover the requirements.

That's semantic association, not traceability.

### Severity: P1

---

# Finding 14: "No backend" branch is too simplistic

The current prompt has a special output path for projects with no backend.

That is useful.

But backend requirements aren't binary.

Consider:

```text id="0n5kqa"
Static site
+
contact form
```

Does that count as:

```text no backend?

```

What about:

```text client-side Firebase

```

or:

```text Supabase

```

or:

```text third-party authentication

```

The system needs to reason about **backend responsibilities**, not just whether a traditional backend exists.

### Severity: P2

---

# Finding 15: API style is over-constrained

The prompt favors REST conventions.

That's sensible as a default.

But what if the architecture explicitly chooses:

```text GraphQL

```

or:

```text tRPC

```

or:

```text Server Actions

```

?

The System prompt should respect the architecture's communication model.

### Severity: P1

Otherwise we get:

```text Architect: tRPC
System: REST
Blueprinter: ???
Coder: picks one
```

And now the pipeline has achieved distributed schizophrenia.

---

# Attack Test: Financial precision

Let's isolate the most revealing one.

User says:

> Track expenses with amounts accurate to cents.

System currently has a restricted type vocabulary containing `number`.

A naive output:

```text
amount: number
```

is technically valid under the prompt.

But architecturally poor.

The correct output should be something like:

```text
amount:
  database type: Decimal
  precision: 12
  scale: 2
  nullable: false
```

The prompt currently doesn't give the System enough authority or vocabulary to make that decision.

**This is a prompt-induced defect, not merely a model-quality defect.**

---

# Attack Test: Multi-tenant SaaS

Now the nastier case.

User says:

> Build an employee attendance system.
>
> Multiple companies will use it.
> Employees belong to companies.
> Managers can view attendance only for employees in their company.

A correct System design requires something like:

```text
Company
 ├── Employee
 └── Manager

Employee
 └── Attendance

Attendance
 └── employeeId
```

plus authorization invariants:

```text
authenticatedUser.companyId
        ==
targetEmployee.companyId
```

The current System prompt doesn't explicitly require tenant isolation as a first-class architectural invariant.

It can easily produce:

```text
User
Employee
Attendance
```

with a role field, then rely on the Coder to "figure out" tenant security.

That is unacceptable.

### Severity: P0/P1 depending on project

For a multi-tenant application:

**P0 security architecture issue.**

---

# System Scorecard

| Dimension                     | Result               |
| ----------------------------- | -------------------- |
| Basic DB modeling             | 🟢 Good              |
| Basic API modeling            | 🟢 Good              |
| Authentication identification | 🟢                   |
| Domain relationship precision | 🟠 Weak              |
| Field semantics               | 🔴 Weak              |
| Database type selection       | 🔴 Too constrained   |
| API schemas                   | 🔴 Weak              |
| Error contracts               | 🔴 Missing           |
| Authorization                 | 🟠 Weak              |
| Multi-tenancy                 | 🔴 Not first-class   |
| Query/index design            | 🔴 Missing           |
| Transactions                  | 🟠 Weak              |
| Requirement traceability      | 🔴 Missing           |
| Seed data policy              | 🟠 Over-prescriptive |
| Architecture compliance       | 🟠                   |
| Framework/API-style alignment | 🔴 Weak              |

---

# Case 4 Verdict

The System agent is **one of the more dangerous prompts in the current pipeline**, because it has several hard-coded engineering rules that look like consistency but actually restrict correct modeling.

### P0

**1. No first-class security/tenant isolation contract**

For multi-tenant systems, this can become a catastrophic data-isolation failure.

**2. Architecture/API-style conflicts aren't explicitly resolved**

Architect can choose one communication model while System silently generates another.

### P1

**3. Universal `id/createdAt/updatedAt` rule**

**4. Restricted database field types**

**5. Missing nullability/default/unique/index semantics**

**6. Weak relationship semantics**

**7. Weak API request/response contracts**

**8. Missing HTTP error contracts**

**9. Authorization rules aren't sufficiently deterministic**

**10. JWT security model underspecified**

**11. No database query/index strategy**

**12. No requirement → backend contract traceability**

**13. No explicit architecture → System consistency validation**

### P2

**14. Mandatory seed data**

**15. Transaction boundaries not modeled**

**16. Binary "backend/no backend" mental model**

---

# What the System stage should actually become

The desired contract is closer to:

```text id="8d3w5c"
Validated Architecture
        ↓
      System
        ↓
Validated Backend Contract
        │
        ├── Entities
        │    ├── fields
        │    ├── types
        │    ├── nullability
        │    ├── defaults
        │    ├── indexes
        │    └── relations
        │
        ├── API / RPC Contract
        │    ├── operations
        │    ├── request schema
        │    ├── response schema
        │    ├── errors
        │    └── auth requirements
        │
        ├── Authorization Invariants
        │
        ├── Transactions
        │
        ├── Query Patterns
        │
        ├── Requirement Coverage
        │
        └── Deployment Constraints
                ↓
        System Validator
                ↓
           Blueprinter
```

The critical change is that **System shouldn't merely describe a backend**.

It should produce a **backend contract that can be mechanically validated against the Architecture and Requirements**.

And there is a nasty dependency here: several System defects aren't really fixable inside System alone. The canonical requirement IDs from Planner and architectural decisions from Architect need to exist first.

That means the pipeline is starting to reveal a pattern:

> **Every downstream agent is currently being asked to reconstruct authority from prose produced by the previous agent.**

# Case 5: Designer / UI-UX Architect

Now we test the **Designer**, whose job is to turn the product requirements and architecture into a frontend/UI specification.

The current Designer prompt takes snapshots from the plan, requirements, architecture, and backend specification, then produces:

- Context Snapshot
- Design System
- Pages
- Components
- Navigation
- Interaction Design

It also requires every feature to appear on a page and every component to have a visual description.

The critical question here is:

> **Does Designer produce an implementation-ready UI contract, or just a polished description of what the application might look like?**

---

# Test Case 5A: Expense Tracker

We'll use the same project because it lets us trace the exact same requirements through every stage.

### Requirements

```text id="m3q8k2"
FR-001  Registration
FR-002  Login
FR-003  Create expense
FR-004  View expenses
FR-005  Update expense
FR-006  Delete expense
FR-007  Categorization
FR-008  Filtering
FR-009  Monthly spending
FR-010  Dashboard
NFR-001 Responsive interface
```

### Architecture

```text id="x6v2pa"
Next.js
TypeScript
Tailwind
PostgreSQL
Prisma
JWT
Vercel
```

### Backend

```text id="b1t7hz"
Authentication
Expenses
Categories
Dashboard
```

---

# Simulated Designer Output

Applying the current Designer prompt:

```markdown id="d8p4wk"
# UI/UX Design Specification

## Context Snapshot

The application is a responsive expense tracking web application for
individual users.

Users can authenticate, manage expenses, categorize expenses, filter
expense records, and view monthly spending summaries.

## Design System

### Colors

- Primary: #2563EB
- Secondary: #64748B
- Background: #F8FAFC
- Surface: #FFFFFF
- Text: #0F172A
- Muted Text: #64748B
- Success: #16A34A
- Error: #DC2626
- Border: #E2E8F0

### Typography

- Primary font: Inter
- Heading weights: 600-700
- Body weight: 400
- Caption weight: 400

### Spacing

Use a consistent 4px spacing scale.

### Border Radius

- Cards: 12px
- Inputs: 8px
- Buttons: 8px

### Shadows

Use subtle shadows for elevated cards and modals.

### Responsive Behavior

- Desktop: multi-column dashboard layout.
- Tablet: reduced column count.
- Mobile: single-column layout.
- Tables should become horizontally scrollable or transform into
  responsive cards on smaller screens.

## Pages

### /login

Purpose:

Allow existing users to authenticate.

Components:

- Login form
- Email input
- Password input
- Submit button
- Error message
- Registration link

Interactions:

- Submit credentials
- Display validation errors
- Display authentication errors
- Navigate to dashboard after successful login

### /register

Purpose:

Allow users to create accounts.

Components:

- Registration form
- Email input
- Password input
- Confirm password input
- Submit button
- Error message
- Login link

### /dashboard

Purpose:

Provide an overview of personal spending.

Components:

- Monthly spending total
- Category spending summary
- Recent expenses
- Date/month selector
- Navigation
- Add expense button

Interactions:

- Change selected month
- Navigate to expenses
- Add expense
- View expense details

### /expenses

Purpose:

Allow users to manage expense records.

Components:

- Expense table
- Category filter
- Date filter
- Add expense button
- Edit action
- Delete action
- Empty state
- Loading state

Interactions:

- Filter expenses
- Edit expense
- Delete expense
- Create expense
- Change date range

### /expenses/new

Purpose:

Allow users to create an expense.

Components:

- Amount input
- Category selector
- Description input
- Date selector
- Save button
- Cancel button
- Validation messages

### /expenses/:id/edit

Purpose:

Allow users to edit an existing expense.

Components:

- Expense form
- Amount input
- Category selector
- Description input
- Date selector
- Save button
- Cancel button

### /categories

Purpose:

Allow users to view and manage expense categories.

Components:

- Category list
- Add category control
- Edit category control
- Delete category control

## Components

### ExpenseTable

Displays the user's expenses in rows.

Each row displays:

- Date
- Description
- Category
- Amount
- Edit action
- Delete action

### ExpenseForm

Provides fields for creating and editing expenses.

### SpendingSummary

Displays total spending for the selected month.

### CategorySummary

Displays spending grouped by category.

### DateFilter

Allows users to select a date range.

### CategoryFilter

Allows users to filter by category.

### Navigation

Provides navigation between dashboard, expenses, and categories.

## Navigation

Primary navigation:

- Dashboard
- Expenses
- Categories

Authentication navigation:

- Login
- Register

Authenticated users are redirected to the dashboard after login.

## Interaction Design

### Loading

Display loading indicators while dashboard and expense data is being
retrieved.

### Empty States

Display explanatory empty states when no expenses exist.

### Errors

Display inline validation errors for invalid form input and clear
feedback for failed operations.

### Delete Confirmation

Require confirmation before deleting an expense.

### Mobile Interaction

On mobile devices, actions should remain accessible without requiring
horizontal scrolling wherever practical.
```

This is a **perfectly plausible UI specification**.

Now let's see whether it's actually useful to AutoCoder.

---

# Finding 1: Designer invents a feature

The requirements only established:

```text id="3i4m8h"
expense categories
```

The Designer creates:

```text id="m8h5wy"
/categories

Add category
Edit category
Delete category
```

But the requirement never explicitly said users can **manage categories**.

The System agent also invented:

```text id="4f8tqz"
POST /api/categories
```

So we now have a chain:

```text Queen assumption
       ↓
Planner
       ↓
System invention
       ↓
Designer invention
```

Each agent is validating the previous agent's invention by seeing it upstream.

This is why provenance matters.

### Severity: P1

### Fix

Designer must classify every UI capability:

```text
USER_REQUIRED
SYSTEM_REQUIRED
ARCHITECTURAL_SUPPORT
UX_DERIVED
OPTIONAL
```

And:

> Designer MUST NOT introduce user-facing capabilities that require new backend functionality unless they are explicitly present upstream or marked as a proposal requiring approval.

---

# Finding 2: "Every feature must appear on a page" is too simplistic

This instruction sounds good.

But consider:

```text id="x7m3k8"
FR:
Password hashing must be secure.
```

What page should contain it?

Or:

```text id="j8v4n2"
API must reject unauthorized requests.
```

What UI page represents that?

Not every requirement is a UI feature.

Therefore:

> Every feature must appear on a page

should really mean:

> Every **UI-relevant requirement** must have a corresponding user interaction or visible state.

### Severity: P1

---

# Finding 3: No requirement → UI traceability

The Designer lists pages and components, but doesn't say:

```text id="q6c9va"
FR-003 → /expenses/new → ExpenseForm
FR-004 → /expenses → ExpenseTable
FR-008 → /expenses → CategoryFilter + DateFilter
FR-009 → /dashboard → SpendingSummary
```

That means Reviewer later has to infer coverage.

Again, prose instead of a contract.

### Severity: P1

---

# Finding 4: No backend/API binding

This is one of the biggest problems.

The Designer says:

```text id="t9a4qm"
ExpenseTable
```

and:

> Displays the user's expenses.

But which API?

```text id="w6v1kz"
GET /api/expenses
```

What query parameters?

```text id="m4h2px"
?categoryId=
?from=
?to=
```

What response shape?

```text id="q1r7fs"
{
  expenses: [...]
}
```

The Designer doesn't need to duplicate the entire backend contract.

But it needs to reference the contract.

Otherwise Coder has:

```text Blueprint
   ↓
Component
   ↓
??? API expectation
```

and starts guessing.

### Severity: P1

### Fix

Every data-driven UI element should declare:

```json id="g2v7xr"
{
  "component": "ExpenseTable",
  "data_source": "API-004",
  "inputs": ["categoryFilter", "dateRange"],
  "states": ["loading", "empty", "error", "success"]
}
```

---

# Finding 5: UI state modeling is too shallow

The Designer does mention:

- loading
- empty
- errors

Good.

But a serious frontend specification needs state transitions.

For:

```text id="e8tqf6"
Delete Expense
```

we need:

```text idle
 ↓
confirmation
 ↓
deleting
 ↓
success
 ↓
list refresh
```

or:

```text
deleting
 ↓
error
 ↓
retry
```

The current prompt does not require state machines for important interactions.

### Severity: P1

---

# Finding 6: Authentication UX is underspecified

The Designer gives us:

```text id="7s8k2e"
Login form
Email
Password
```

But JWT authentication creates UX/security questions:

- What happens when token expires?
- Where does the user go?
- How are unauthorized API responses handled?
- What happens after session expiration?
- Is the login form preserved after an error?
- Is there a logout flow?

Logout isn't even represented.

This is particularly interesting because the backend has authentication, but the frontend design doesn't fully represent the authentication lifecycle.

### Severity: P1

---

# Finding 7: Mobile behavior is generic

The requirement says responsive.

The Designer responds with:

> single-column layout

and:

> tables should become horizontally scrollable or transform into responsive cards.

That's reasonable but vague.

For AutoCoder, we want deterministic behavior:

```text id="3l9n8q"
Desktop:
Date | Description | Category | Amount | Actions

Mobile:
Expense card
  Amount
  Category
  Date
  Description
  Actions
```

Otherwise the Coder has to make a design decision.

### Severity: P2

---

# Finding 8: Design system values are invented without provenance

The Designer chooses:

```text id="5w2z91"
#2563EB
Inter
12px radius
4px spacing
```

Nothing is wrong with these choices.

The problem is that they're presented as **decisions**, rather than recommendations.

If the user said:

> Use our brand colors #000000 and #D4AF37.

then the Designer should preserve them.

If the user said nothing, Designer can select a design system.

But that choice should be marked:

```text id="3z5n1k"
authority: DESIGNER
status: PROPOSED
```

not equivalent to:

```text id="p9j3xk"
authority: USER
status: MANDATORY
```

### Severity: P2

---

# Finding 9: Accessibility is basically absent

This is a meaningful omission.

A frontend design specification should account for:

```text id="x4v9qf"
keyboard navigation
focus states
semantic controls
contrast
form labels
error announcements
screen-reader behavior
touch target sizes
```

The current prompt doesn't require accessibility.

For a production-quality generator, this is a gap.

### Severity: P1/P2

I'd classify it **P1** for a general-purpose AutoCoder because accessibility should be a standard quality dimension rather than something the model remembers occasionally.

---

# Finding 10: No responsive breakpoint contract

"Desktop/tablet/mobile" is not deterministic.

Different agents can interpret:

```text mobile

```

as:

```text <640

```

or:

```text <768

```

or:

```text <1024

```

The Designer should define semantic breakpoints or explicitly delegate them to the selected framework's conventions.

### Severity: P2

---

# Finding 11: No visual hierarchy tied to task priority

The Designer lists components but doesn't establish which actions are:

```text id="g7q5w2"
primary
secondary
destructive
tertiary
```

For example:

```text Add Expense
Delete Expense
Filter
View
```

are not equal interaction priorities.

This affects Coder implementation and visual quality.

### Severity: P2

---

# Finding 12: Component boundaries can become arbitrary

The prompt requires:

> Every component must be visually described.

This can lead to over-componentization.

Our example is reasonable:

```text
ExpenseTable
ExpenseForm
SpendingSummary
CategorySummary
DateFilter
CategoryFilter
```

But on a small app the model could generate:

```text
ExpenseTableHeader
ExpenseTableRow
ExpenseTableCell
ExpenseTableActions
ExpenseFilterWrapper
ExpenseFilterLabel
ExpenseFilterControl
```

Now the Blueprinter has 30 files for a CRUD application.

The Designer needs a rule based on **responsibility and reuse**, not merely visual elements.

### Severity: P2

---

# Attack Test: Backend-only requirement

Suppose Planner says:

> All expense queries must enforce ownership at the database access layer.

Designer should do:

```text
No UI mapping required.
Requirement is backend/security infrastructure.
```

The current "every feature appears on a page" mentality can tempt the model to manufacture something like:

> "User ownership indicator"

which solves absolutely nothing.

This demonstrates why **requirement typing** needs to exist before Designer.

---

# Attack Test: Complex interaction

Consider:

> Managers can filter attendance by employee, department, date range,
> and status, and export the filtered results as CSV.

A strong Designer should create:

```text
Attendance Dashboard

Filters:
- Employee
- Department
- Date range
- Status

Actions:
- Apply
- Clear
- Export CSV

States:
- Loading
- Empty
- Results
- Exporting
- Export success
- Export failure

Responsive:
Desktop → filter bar
Tablet → two-row filter grid
Mobile → filter drawer
```

The current prompt can produce something close, but **none of those state/interaction relationships are contractually required**.

That means quality depends heavily on model capability.

That's exactly what we don't want in an autonomous pipeline.

---

# Designer Scorecard

| Dimension                      | Result  |
| ------------------------------ | ------- |
| Basic page planning            | 🟢 Good |
| Design-system generation       | 🟢 Good |
| Component identification       | 🟢 Good |
| Basic responsive thinking      | 🟢      |
| Requirement coverage           | 🟠      |
| Requirement traceability       | 🔴      |
| Backend binding                | 🔴      |
| State modeling                 | 🔴      |
| Authentication lifecycle       | 🔴      |
| Accessibility                  | 🔴      |
| Scope control                  | 🔴      |
| Provenance of design decisions | 🟠      |
| Mobile specificity             | 🟠      |
| Component granularity          | 🟠      |
| Machine-readability            | 🔴      |

---

# Case 5 Verdict

The Designer is good at producing something a **human designer could hand to another human developer**.

AutoCoder needs something stronger:

> **A deterministic frontend implementation contract.**

### P1

**1. UI capabilities can be invented**

**2. No UI-requirement traceability**

**3. No API/backend binding**

**4. Insufficient interaction state modeling**

**5. Authentication lifecycle incomplete**

**6. Accessibility not part of the contract**

**7. UI-relevant vs backend-only requirements aren't distinguished**

### P2

**8. Design decisions lack authority/provenance**

**9. Responsive behavior too vague**

**10. Component boundaries can cause over-engineering**

**11. No explicit interaction priority**

**12. No formal breakpoint contract**

---

# The corrected Designer contract

The ideal pipeline becomes:

```text id="k7f3q2"
Requirements
     │
     ├── UI Requirements
     └── Non-UI Requirements
              ↓
        Architecture
              ↓
          Backend
              ↓
         Designer
              ↓
     Validated UI Contract
              │
              ├── Pages
              ├── Routes
              ├── Components
              ├── Data bindings
              ├── API references
              ├── UI states
              ├── Interaction flows
              ├── Responsive rules
              ├── Accessibility
              ├── Requirement coverage
              └── Design decisions
                    ↓
                Blueprinter
```

The most important thing is **API references rather than API reinvention**.

Designer should be able to say:

```text id="7x4p2n"
ExpenseTable
  requirement_ids: [FR-004, FR-008]
  data_source: API-EXPENSE-LIST
  inputs:
    - categoryId
    - startDate
    - endDate
  states:
    - loading
    - empty
    - error
    - populated
```

Then Blueprinter can turn that into an implementation specification without asking:

> "What did the Designer mean by 'expense data'?"

---

## And there's a very important pipeline finding

After five stages, we now have the same structural failure repeating:

```text id="j2m8q5"
Queen
  ↓ prose
Planner
  ↓ prose
Architect
  ↓ prose
System
  ↓ prose
Designer
  ↓ prose
Blueprinter
```

Every stage is **re-interpreting the previous stage**.

That's the fundamental issue.

The prompts themselves aren't uniformly terrible. In fact, several are reasonably well-written. The problem is that AutoCoder is using **natural-language artifacts as inter-agent APIs**.

# Case 6: Blueprinter

This is arguably the **most consequential planning prompt before code generation**.

The current Blueprinter prompt receives the outputs of Queen, Planner, Architect, System, and Designer. It is explicitly positioned as the code-planning agent, and it tells the Coder to read **only the Blueprint**. It requires an exact file tree, file specifications, dependency ordering, exports, props, API fields, DB fields, DOM IDs, and related implementation details.

That sounds like the solution to context bloat.

It isn't.

It creates a **semantic compression bottleneck**.

---

# Case 6A: Expense Tracker

We'll feed Blueprinter the results from Cases 1–5.

The intended application is:

```text id="r3c6q1"
Next.js
TypeScript
Tailwind
PostgreSQL
Prisma
JWT

Authentication
Expense CRUD
Categories
Filtering
Monthly summaries
Dashboard
Responsive UI
```

Architecture:

```text id="p6h2x8"
app/
components/
lib/
prisma/
types/
...
```

Backend:

```text id="w5f7n3"
User
Category
Expense

Auth API
Expense API
Category API
Dashboard
```

Designer:

```text id="b8k1m4"
Login
Register
Dashboard
Expenses
New Expense
Edit Expense
Categories
ExpenseTable
ExpenseForm
Filters
SpendingSummary
...
```

---

# Simulated Blueprinter Output

Applying the current prompt:

````markdown id="v6n2qa"
# Blueprint

## Project Structure

```text
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── login/
│   │   │       └── route.ts
│   │   ├── expenses/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   └── categories/
│   │       └── route.ts
│   ├── dashboard/
│   │   └── page.tsx
│   ├── expenses/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── categories/
│       └── page.tsx
├── components/
│   ├── ExpenseTable.tsx
│   ├── ExpenseForm.tsx
│   ├── SpendingSummary.tsx
│   ├── CategorySummary.tsx
│   ├── DateFilter.tsx
│   ├── CategoryFilter.tsx
│   └── Navigation.tsx
├── lib/
│   ├── auth/
│   │   ├── auth.ts
│   │   └── jwt.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── services/
│   │   ├── expense-service.ts
│   │   ├── category-service.ts
│   │   └── dashboard-service.ts
│   └── validation/
│       ├── auth.ts
│       └── expense.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/
│   ├── auth.ts
│   ├── expense.ts
│   └── category.ts
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```
````

## File Specifications

### app/login/page.tsx

Purpose:
Render the login page.

Imports:

- Navigation
- Authentication form

Exports:

- default LoginPage

UI:

- Email input
- Password input
- Submit button
- Error message
- Registration link

Behavior:

- Submit credentials
- Display errors
- Redirect authenticated users to dashboard

### app/register/page.tsx

Purpose:
Render registration page.

UI:

- Email input
- Password input
- Confirm password input
- Submit button

Behavior:

- Validate input
- Submit registration
- Redirect to dashboard after successful registration

### app/dashboard/page.tsx

Purpose:
Display monthly spending information.

Uses:

- SpendingSummary
- CategorySummary
- Navigation

Data:

- Monthly spending total
- Category spending breakdown
- Recent expenses

### app/expenses/page.tsx

Purpose:
Display and manage expenses.

Uses:

- ExpenseTable
- CategoryFilter
- DateFilter

Behavior:

- Fetch expenses
- Apply filters
- Edit expenses
- Delete expenses
- Navigate to new expense

### components/ExpenseTable.tsx

Purpose:
Display expense records.

Props:

- expenses
- onEdit
- onDelete

Fields:

- id
- date
- description
- category
- amount

### components/ExpenseForm.tsx

Purpose:
Create or edit an expense.

Props:

- initialValues
- onSubmit
- onCancel

Fields:

- amount
- categoryId
- description
- date

### lib/services/expense-service.ts

Purpose:
Provide expense operations.

Functions:

- createExpense
- getExpenses
- getExpense
- updateExpense
- deleteExpense
- getMonthlyTotals

Authorization:

- Operations must use authenticated user ownership.

### lib/auth/jwt.ts

Purpose:
JWT generation and verification.

Functions:

- generateToken
- verifyToken

### prisma/schema.prisma

Purpose:
Define database schema.

Models:

- User
- Category
- Expense

### types/expense.ts

Purpose:
Define shared expense types.

Exports:

- Expense
- CreateExpenseInput
- UpdateExpenseInput

## Dependency Order

1. Prisma schema
2. Database client
3. Shared types
4. Authentication
5. Services
6. API routes
7. Components
8. Pages

## Implementation Rules

- Follow the architecture exactly.
- Match API and database contracts.
- Use TypeScript.
- Use Tailwind CSS.
- Do not introduce unrequested dependencies.
- Coder should generate one file at a time.

````

Again, this looks excellent.

And again, we are about to ruin the party.

---

# Finding 1: "Coder reads ONLY Blueprint" is the biggest Blueprinter problem

This is the central defect.

The Blueprinter prompt explicitly establishes the Blueprint as the Coder's only source of information.

That means:

```text id="m6t2v8"
User intent
 ↓
Queen
 ↓
Planner
 ↓
Architect
 ↓
System
 ↓
Designer
 ↓
Blueprinter
 ↓
Coder
````

Everything before Blueprint is effectively compressed into it.

If Blueprinter loses one critical semantic detail, Coder **cannot recover it**.

This is fundamentally different from context optimization.

It's information destruction.

### Example

Original requirement:

> Users must only access expenses belonging to their own account.

Blueprinter writes:

> Operations must use authenticated user ownership.

Looks okay.

But what if the original requirement was:

> Managers can see employees in their own company but cannot see employees from other companies.

If Blueprint simplifies that to:

```text
authorization required
```

the Coder has no way to reconstruct tenant-level authorization.

### Severity: **P0**

For an autonomous coding system, this is a major architectural flaw.

### Correct approach

Coder should receive:

```text id="4n7p2x"
Blueprint
+
Relevant canonical requirements
+
Relevant architecture decisions
+
Relevant backend contracts
+
Semantic dependency interfaces
```

Not the entire world.

The right solution is **relevant context resolution**, not "Blueprint contains everything."

---

# Finding 2: Blueprint duplicates upstream information

The prompt tells Blueprinter to include:

- API fields
- DB fields
- props
- DOM IDs
- dependency information
- implementation details

This is effectively asking Blueprinter to rewrite the upstream specifications.

That produces:

```text id="s4q2x8"
System:
Expense.amount = Decimal

Designer:
Expense amount displayed as currency

Blueprint:
Expense.amount = number

Coder:
???
```

Now the Blueprint conflicts with its upstream source.

Which one wins?

The current system says Blueprint wins.

That's dangerous.

### Severity: P0/P1

The Blueprint should be a **projection of canonical contracts**, not a new authority.

---

# Finding 3: The Blueprint can silently contradict the backend

Our simulated output says:

```text id="2p8n7c"
types/expense.ts

Expense
CreateExpenseInput
UpdateExpenseInput
```

But it doesn't define the exact relationship between:

```text id="a1s7xq"
Prisma Expense
API Expense
UI Expense
```

Suppose System defines:

```text amount: Decimal

```

but Blueprint generates:

```text amount: number

```

Now Coder receives only Blueprint.

It will probably implement:

```typescript
amount: number;
```

because that is what it sees.

The canonical backend contract has effectively been overwritten.

### Severity: P0/P1

---

# Finding 4: "Every file exactly once" creates unnecessary rigidity

The current Blueprint philosophy expects the architecture's file tree to be converted into concrete file specifications.

That's useful.

But requiring every architectural file to appear exactly once can become problematic.

Consider:

```text id="5r4h8k"
README.md
```

Does it need a Coder-generated source specification?

Maybe.

But:

```text id="m1x9k3"
.env.example
```

needs different handling.

And:

```text id="public/favicon.ico"

```

isn't source code.

And:

```text id="prisma/migrations/"

```

might be generated by Prisma rather than manually authored.

The Blueprint needs to distinguish:

```text id="n3q8s6"
GENERATE
GENERATE_FROM_TEMPLATE
GENERATE_BY_TOOL
GENERATE_BINARY
FRAMEWORK_GENERATED
DO_NOT_GENERATE
```

### Severity: P1

---

# Finding 5: File ordering is not equivalent to dependency ordering

The Blueprint says:

```text id="8t2y6q"
1. Prisma schema
2. Database client
3. Types
4. Authentication
5. Services
6. API routes
7. Components
8. Pages
```

That is a reasonable conceptual order.

But actual module dependency graphs can contain cycles.

For example:

```text id="0b5p9k"
types → services
services → types
```

No simple linear order captures that.

Also, TypeScript/Next.js doesn't require source files to be generated in dependency order as long as the final graph is coherent.

### Severity: P2

More importantly, Blueprinter should provide a **dependency graph**, not pretend everything is a DAG.

---

# Finding 6: No semantic symbol contract

The Blueprint tells Coder:

```text id="z4j7p1"
ExpenseTable
Props:
- expenses
- onEdit
- onDelete
```

But it doesn't necessarily define:

```text id="x5q9w3"
expenses: Expense[]
onEdit: (expenseId: string) => void
onDelete: (expenseId: string) => Promise<void>
```

The prompt asks for exact props, but not a formal symbol signature contract.

That's dangerous.

The Coder can interpret:

```text onEdit

```

as:

```typescript
(id: string) => void
```

while another component expects:

```typescript
(expense: Expense) => void
```

The Blueprint needs exact signatures.

### Severity: P1

---

# Finding 7: API contracts are referenced, not embedded deterministically

For:

```text id="9q4m1z"
ExpenseTable
```

the Blueprint says it fetches expenses.

But does it define:

```text GET /api/expenses

```

and:

```text response schema

```

and:

```text filter query parameters

```

?

Not consistently.

The Designer had:

```text categoryFilter
dateFilter
```

The backend had its own API definition.

The Blueprint needs to connect them:

```text id="p6x2n9"
ExpenseTable
  ↓
API-EXPENSE-LIST
  ↓
GET /api/expenses
  ↓
query:
  categoryId?
  startDate?
  endDate?
  ↓
ExpenseListResponse
```

Otherwise the Coder reconstructs API behavior.

### Severity: P1

---

# Finding 8: DOM IDs are being treated as architecture

The Blueprinter prompt requires exact DOM IDs for interactive elements.

That's useful for testing.

But there's a potential inversion:

```text id="1g8v5j"
Blueprint
  ↓
DOM ID
  ↓
Tester
```

DOM IDs should be generated from the UI/test contract, not become arbitrary architecture-level requirements.

For example:

```html
id="expense-submit-button"
```

is fine.

But requiring every interactive element to have a manually specified ID can create:

- unnecessary IDs
- collisions
- brittle tests
- implementation noise

### Severity: P2

---

# Finding 9: Blueprint doesn't define generated-project acceptance tests

This is becoming a repeated pattern.

Blueprint knows:

```text what file
what symbols
what APIs
what props
```

But not:

```text id="e3m7z8"
how this file contributes to a requirement's acceptance test.
```

For example:

```text FR-003
Create expense
```

should connect to:

```text API-EXPENSE-CREATE
ExpenseForm
POST /api/expenses
AC-003
```

Then Coder knows why each piece exists.

### Severity: P1

---

# Finding 10: No explicit invariants

This is one of the biggest omissions.

Consider:

```text id="f5x7c3"
Invariant:
Every expense query MUST be scoped to authenticated user ID.
```

This isn't just a function requirement.

It's a **cross-file invariant**.

It should be attached to every affected file:

```text id="y1m8q4"
expense-service.ts
  invariant: OWNER_SCOPE_REQUIRED

/api/expenses/route.ts
  invariant: AUTH_REQUIRED

/api/expenses/[id]/route.ts
  invariant: OWNER_SCOPE_REQUIRED
```

Otherwise Coder sees individual file specifications without understanding the system-wide rule.

### Severity: P0/P1

For security invariants, I'd treat it as P0.

---

# Finding 11: Blueprint can over-specify implementation

The Blueprint is supposed to plan code.

But there's a fine line between:

```text id="b7w2m4"
what a file must provide
```

and:

```text id="q3m8v1"
exact implementation algorithm
```

If Blueprint becomes too detailed, Coder becomes a glorified code printer.

That may sound desirable.

It isn't.

You want:

```text stable interfaces
+
constraints
+
invariants
+
dependencies
```

while allowing Coder to choose local implementation details.

Otherwise Blueprint itself becomes the giant bottleneck we were trying to eliminate.

### Severity: P2

---

# Attack Test: Requirement that spans many files

Let's use:

> Users can edit their own expenses but must never modify another user's expense.

Correct implementation touches:

```text id="n7c2v1"
API route
authentication
authorization
service
database query
error handling
UI behavior
tests
```

A weak Blueprint might produce:

```text id="q9f2s7"
ExpenseService.updateExpense()
```

with:

> Verify ownership.

That's too little.

A strong Blueprint should establish an invariant:

```text id="c4w8m2"
AUTH-INV-001

For every expense mutation:
authenticatedUserId MUST be part of the resource authorization predicate.

Affected:
- PUT /api/expenses/:id
- DELETE /api/expenses/:id
- ExpenseService.updateExpense
- ExpenseService.deleteExpense
- integration tests
```

Now Coder can implement consistently.

---

# Attack Test: Cross-file type consistency

Suppose System says:

```text id="2x5m8q"
Expense.amount = Decimal
```

Designer says:

```text amount displayed as currency

```

Blueprint should resolve:

```text id="k7p3w4"
Database:
Decimal

API:
string or serialized decimal representation

Domain:
Decimal-compatible type

UI:
number formatted as currency
```

If Blueprint simply writes:

```text amount: number

```

it has created a cross-layer type bug before Coder writes a single line.

### Severity: P0/P1

This is exactly why a **canonical type/schema contract** matters.

---

# Blueprinter Scorecard

| Dimension                      | Result    |
| ------------------------------ | --------- |
| File decomposition             | 🟢 Strong |
| Basic implementation planning  | 🟢 Strong |
| Component planning             | 🟢        |
| Dependency awareness           | 🟠        |
| Interface precision            | 🟠        |
| Cross-layer consistency        | 🔴        |
| Requirement traceability       | 🔴        |
| Security invariants            | 🔴        |
| API binding                    | 🟠        |
| Semantic preservation          | 🔴        |
| Machine-readable contract      | 🔴        |
| Source-of-truth discipline     | 🔴        |
| File-generation classification | 🟠        |
| Test traceability              | 🔴        |
| Coder usability                | 🟢/🟠     |

---

# Case 6 Verdict

This is the first prompt where I would make a **major architectural recommendation rather than just patching wording**.

### P0

**1. "Coder reads only Blueprint" creates a catastrophic information bottleneck.**

**2. Blueprint can overwrite upstream authority.**

**3. Cross-file/system-wide invariants are not first-class.**

**4. Cross-layer type consistency is not mechanically protected.**

### P1

**5. No requirement → file → test traceability**

**6. API contracts aren't deterministically bound to files**

**7. Exact symbol signatures aren't consistently formalized**

**8. Architecture file tree becomes an unchecked generation contract**

**9. No classification of generated vs framework-generated/tool-generated files**

**10. Dependency ordering is oversimplified**

### P2

**11. DOM IDs over-specified**

**12. Blueprint risks over-specifying local implementation**

---

# The architectural correction

I would **not** replace Blueprinter with another giant prompt.

Instead, change what Blueprint _is_.

Current:

```text id="n8f4r2"
Blueprint = rewritten specification
```

Target:

```text id="y3k7p1"
Blueprint = implementation graph
```

Something like:

```text
Blueprint
│
├── Files
│   ├── path
│   ├── purpose
│   ├── symbols
│   ├── interfaces
│   └── generation_mode
│
├── Dependencies
│   ├── file → file
│   └── symbol → symbol
│
├── Requirement Coverage
│   └── requirement → files
│
├── API Bindings
│   └── endpoint → implementation
│
├── UI Bindings
│   └── component → API
│
├── Data Bindings
│   └── model → Prisma schema
│
├── Invariants
│   └── invariant → affected files
│
└── Acceptance Tests
    └── test → affected files
```

Then Coder gets:

```text
Canonical Contracts
        +
Relevant Blueprint Node
        +
Relevant Dependencies
        +
Relevant Invariants
        +
Relevant Acceptance Criteria
```

**Not the entire Blueprint and definitely not Blueprint alone.**

---

## One very important conclusion from Cases 1–6

We've now followed the same requirement through six agents.

The recurring failure isn't really:

> "The prompts are bad."

It's:

> **The prompts are being forced to perform state management that should belong to the runtime.**

Queen preserves intent.

Planner structures requirements.

Architect makes architecture decisions.

System defines backend contracts.

Designer defines UI contracts.

Blueprinter maps those contracts to files.

Those are **different semantic objects**.

They should not be repeatedly serialized into Markdown and reinterpreted.

The system needs canonical objects with IDs and provenance:

```text
USER INTENT
    ↓
REQUIREMENTS
    ↓
ARCHITECTURE
    ↓
BACKEND CONTRACT
    ↓
UI CONTRACT
    ↓
IMPLEMENTATION GRAPH
    ↓
CODE
```

Each stage can produce a Markdown projection for humans, but the **machine contract must remain structured**.

# Case 7: Coder

This is the point where all the beautiful specifications are supposed to become an actual application.

The current Coder prompt defines the Coder as a senior developer generating **complete source code for one file at a time**. It receives a file specification from Blueprinter plus compact dependency-interface summaries. It is told to output raw code only, match the Blueprint exactly, follow the authority hierarchy, and avoid unrequested dependencies/features. It also declares tools such as `read_file`, `write_file`, `apply_diff`, `list_files`, `check_syntax`, `typecheck`, and `build_project`.

This gives us two separate things to audit:

1. **What code does the prompt cause the Coder to produce?**
2. **Does the prompt actually describe an autonomous coding agent, or merely a one-shot code generator with a tool-shaped nametag?**

The second one is much more important.

---

# Case 7A: Generate the Expense Tracker

We'll give Coder this Blueprint node:

```text id="k2m8p4"
FILE:
app/api/expenses/route.ts

Purpose:
Handle expense collection operations.

Exports:
GET
POST

GET:
- Require authentication
- Return authenticated user's expenses
- Support category and date filtering

POST:
- Require authentication
- Validate amount, categoryId, description and date
- Create expense belonging to authenticated user

Dependencies:
- authentication
- expense service
- validation
```

And relevant interfaces:

```text id="p7c4x1"
getAuthenticatedUser()
createExpense()
getExpenses()
validateExpenseInput()
```

---

# Simulated Coder Output

Applying the current Coder prompt:

```typescript id="4zq8pn"
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { createExpense, getExpenses } from "@/lib/services/expense-service";
import { validateExpenseInput } from "@/lib/validation/expense";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const categoryId = searchParams.get("categoryId") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const expenses = await getExpenses(user.id, {
      categoryId,
      startDate,
      endDate,
    });

    return NextResponse.json({ expenses }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validation = validateExpenseInput(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const expense = await createExpense(user.id, body);

    return NextResponse.json({ expense }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

This is reasonable code.

It also demonstrates why the current Coder prompt is deceptively dangerous.

---

# Finding 1: Coder is fundamentally one-shot

The prompt says:

> generate complete source code for **ONE file at a time**

That creates a serious architectural limitation.

A real coding agent needs:

```text id="g7n4v2"
observe
 ↓
inspect
 ↓
reason
 ↓
modify
 ↓
run
 ↓
observe result
 ↓
repair
 ↓
verify
```

The current Coder is closer to:

```text id="w8p2j5"
Blueprint
 ↓
generate file
 ↓
done
```

Even though tools are declared.

### Severity: **P0**

This is the same issue we identified at the repo/runtime level: declaring tools in `AgentDef` does not prove the model is actually running an iterative tool loop.

The Coder prompt itself doesn't specify a ReAct/tool protocol such as:

```text
Before writing:
1. inspect relevant files
2. inspect dependency symbols
3. inspect package configuration
4. write/patch
5. typecheck
6. repair
7. return final file
```

Without that, tools can exist without the Coder meaningfully using them.

---

# Finding 2: The Coder is prohibited from recovering from a bad Blueprint

This is one of the worst consequences of Case 6.

The Coder is told to:

> match the Blueprint exactly.

That means:

```text id="4p8k2n"
Blueprint wrong
     ↓
Coder notices wrong
     ↓
Coder cannot safely correct it
     ↓
wrong code
```

Suppose Blueprint says:

```text amount: number

```

but PostgreSQL/Prisma contract requires:

```text Decimal

```

Coder is explicitly biased toward the Blueprint.

### Severity: **P0**

The Coder needs a hierarchy more like:

```text
USER MANDATORY REQUIREMENT
        ↓
CANONICAL CONTRACT
        ↓
VALIDATED ARCHITECTURE
        ↓
BLUEPRINT
        ↓
LOCAL IMPLEMENTATION CHOICE
```

Blueprint should **not** outrank canonical contracts.

---

# Finding 3: "No unrequested dependencies" can create false restrictions

Suppose the canonical project requires:

```text zod

```

but Blueprint forgot to mention it.

Coder says:

> Do not introduce unrequested dependencies.

Now Coder can't use it.

This creates another cascading failure:

```text id="x7p3k5"
System
 ↓
Blueprint misses dependency
 ↓
Coder obeys Blueprint
 ↓
Coder avoids dependency
 ↓
implementation quality degrades
```

The Coder needs access to the project's actual dependency manifest.

### Severity: P1

The Coder should determine:

```text Is dependency already installed?
Is it authorized by architecture?
Is adding it permitted?
Is it necessary?
```

---

# Finding 4: Coder receives "compact dependency interface summaries"

This is better than receiving nothing.

But it is still potentially lossy.

Imagine:

```typescript id="7v2n8a"
createExpense(userId, input);
```

The summary doesn't tell Coder:

```text amount type
category existence requirements
transaction behavior
authorization invariant
error behavior
```

The function signature alone isn't semantic knowledge.

### Severity: P1

The Coder needs:

```text id="w4k8q1"
symbol
signature
behavioral contract
invariants
error contract
dependency source
```

for relevant dependencies.

---

# Finding 5: No project-state inspection requirement

A coding agent should know the difference between:

```text id="2x8p4m"
"create this file"
```

and:

```text id="q6n1r7"
"modify existing implementation"
```

The prompt gives the Coder a file spec.

But it doesn't make inspection of the current repository state mandatory before editing.

That is dangerous.

Suppose:

```text id="5m8q2k"
app/api/expenses/route.ts
```

already exists and contains 90% of the required functionality.

Coder should:

```text inspect → patch

```

not:

```text overwrite → hope

```

### Severity: P1

---

# Finding 6: No existing-file preservation rule

Related but distinct.

The Coder needs explicit rules for:

```text id="z4q7n2"
existing code
existing imports
existing exports
existing behavior
existing tests
existing generated files
```

Especially because AutoCoder will eventually support iterative repair.

Without preservation semantics, the model can solve one problem by destroying another.

---

# Finding 7: No tool execution semantics

The prompt lists:

```text id="8x4m7p"
read_file
write_file
apply_diff
list_files
check_syntax
typecheck
build_project
```

But it doesn't define:

- when to use them
- what order to use them
- whether tools are mandatory
- what happens when a tool fails
- how tool results affect reasoning
- when the Coder is allowed to finish
- what constitutes successful verification

This is a **contractual hole**.

### Severity: P0

A proper tool loop needs something like:

```text id="b7q4n1"
CODER EXECUTION PROTOCOL

1. Inspect current file state.
2. Inspect all referenced symbols.
3. Check relevant project configuration.
4. Implement the requested change.
5. Run syntax/type validation.
6. If validation fails, inspect the failure.
7. Apply a minimal repair.
8. Re-run validation.
9. Repeat until:
   a. validation passes, or
   b. retry budget is exhausted.
10. Only then return completion.
```

Now the prompt actually describes an agent.

---

# Finding 8: No definition of "done"

The Coder can produce:

```text id="n8p2v5"
valid-looking code
```

and stop.

But "done" should mean something like:

```text id="z4w7k1"
file generated
+
exports valid
+
imports resolvable
+
typecheck passes
+
relevant tests pass
+
invariants preserved
```

The current prompt doesn't establish this.

### Severity: P0/P1

---

# Finding 9: No behavioral verification

This is perhaps the most important generated-code problem.

Our Coder produced:

```text id="c5v9m2"
getExpenses(user.id, ...)
```

That looks secure.

But what if `getExpenses()` internally ignores `user.id`?

Coder doesn't know unless it inspects and verifies the implementation.

The current dependency-summary approach makes it possible to generate:

```text correct-looking caller
+
incorrect dependency
=
broken application
```

### Severity: P1

---

# Finding 10: Error handling can become generic garbage

The simulated code has:

```typescript id="8w2q3n"
catch {
  return 500;
}
```

Looks respectable.

But this can hide important domain errors.

For example:

```text category not found
invalid date
duplicate category
authorization failure
database constraint failure
```

all become:

```text 500 Internal Server Error

```

The Coder prompt doesn't provide a standardized error taxonomy.

### Severity: P1

This should actually originate from the System contract, but Coder must consume it.

---

# Finding 11: Coder has no semantic awareness of adjacent files

The Coder generates one file.

Suppose:

```text id="4j8m3p"
ExpenseTable expects:
amount: number
```

while:

```text id="5f7q2k"
API returns:
amount: string
```

Each file can individually pass TypeScript if types are weak or manually cast.

The application still breaks.

This is why file-by-file generation without a semantic graph is dangerous.

### Severity: P0/P1

---

# Finding 12: No concurrency/ordering protection at Coder level

Imagine multiple Coder tasks generate:

```text id="9q3m7v"
types/expense.ts
ExpenseTable.tsx
ExpenseForm.tsx
```

in parallel.

All depend on the same type contract.

The Coder doesn't have a mechanism to detect that another file has changed the relevant contract.

This is a runtime/orchestration issue as much as a prompt issue.

### Severity: P1

---

# Attack Test: Blueprint is wrong

Let's deliberately corrupt the Blueprint:

```text id="4x9k7m"
Expense.amount: number
```

Canonical System contract:

```text id="q3v5n8"
Expense.amount: Decimal
```

Coder receives:

```text Blueprint > everything else

```

Expected current behavior:

```text number

```

Correct behavior:

```text detect conflict
 ↓
canonical contract wins
 ↓
flag Blueprint inconsistency
 ↓
implement correct representation
```

This is a **P0 contract problem**.

---

# Attack Test: Missing dependency

Blueprint says:

```text id="h7v3n2"
validateExpenseInput()
```

but no implementation exists.

A true coding agent should:

```text id="p4x9k1"
inspect repository
 ↓
symbol missing
 ↓
determine whether:
  - generate dependency
  - repair Blueprint
  - block
```

Current Coder doesn't have an explicit decision protocol.

It will likely write the import anyway.

Now generated project has:

```text id="m2q8v4"
Module not found
```

And we only discover it at Tester/Debugger.

---

# Attack Test: Existing implementation is superior

Suppose:

```text id="n7x4p2"
expense-service.ts
```

already contains robust authorization.

Blueprint asks Coder to generate a simplified version.

The Coder is told to follow Blueprint exactly.

It can overwrite a better implementation with an inferior one.

This is the exact opposite of what an iterative coding agent should do.

### Required principle

> **Existing validated behavior is authoritative unless the current task explicitly changes it.**

---

# Coder Scorecard

| Dimension                   | Result  |
| --------------------------- | ------- |
| Code generation             | 🟢 Good |
| Syntax-level implementation | 🟢      |
| Blueprint adherence         | 🟢      |
| Tool declaration            | 🟠      |
| Actual autonomous tool loop | 🔴      |
| Project-state awareness     | 🔴      |
| Dependency semantics        | 🔴      |
| Cross-file consistency      | 🔴      |
| Behavioral verification     | 🔴      |
| Error handling contract     | 🟠      |
| Requirement traceability    | 🔴      |
| Invariant preservation      | 🔴      |
| Recovery from bad Blueprint | 🔴      |
| Existing-code preservation  | 🔴      |
| Definition of Done          | 🔴      |
| Iterative repair            | 🔴      |

---

# Case 7 Verdict

This is a **P0 stage**.

The current Coder is much closer to:

> **structured one-shot code generation**

than:

> **autonomous software engineering agent**.

That's not necessarily useless. A one-shot generator can be quite effective when its inputs are perfect.

But AutoCoder's entire architecture assumes that the inputs **will not be perfect**.

So the Coder must be capable of observing reality and correcting itself.

### P0

**1. No mandatory ReAct/tool execution protocol**

**2. Blueprint has excessive authority**

**3. No project-state inspection requirement**

**4. No real definition of done**

**5. No behavioral verification**

**6. No protection against cross-file semantic inconsistency**

### P1

**7. Dependency summaries are semantically lossy**

**8. Existing code isn't sufficiently protected**

**9. No standardized error contract**

**10. Missing dependency handling undefined**

**11. No invariant enforcement**

**12. No concurrency/version awareness**

---

# The Coder should fundamentally change

Current:

```text id="9s4k2m"
Blueprint
   ↓
Coder
   ↓
source code
```

Target:

```text id="x8p3v7"
Canonical Contracts
       +
Implementation Graph
       +
Current Repository State
       ↓
      CODER
       ↓
    inspect
       ↓
     plan
       ↓
     modify
       ↓
    validate
       ↓
    execute
       ↓
     repair
       ↓
    validate
       ↓
      DONE
```

And crucially:

```text id="6m2q9v"
Coder authority

User mandatory requirements
        >
Canonical validated contracts
        >
Existing validated implementation
        >
Blueprint
        >
Local coding preference
```

That single change prevents the Coder from blindly implementing a corrupted Blueprint.

---

# The bigger discovery from Case 7

Cases 1–6 showed **semantic drift**.

Case 7 reveals the second half of the problem:

> **The system doesn't give the Coder a mechanism to compare its planned implementation against reality.**

So we now have two independent failure modes:

```text
1. Semantic drift
User
 ↓
Queen
 ↓
Planner
 ↓
Architect
 ↓
System
 ↓
Designer
 ↓
Blueprint
 ↓
Coder

2. Execution blindness
Blueprint
 ↓
Coder
 ↓
Code
```

# Case 8: Tester

This one is almost comically important because the current repository's **Tester agent is not actually functioning as an LLM testing agent**.

The current Tester prompt explicitly describes the agent as deterministic and says the prompt is unused, while the orchestrator runs `runLinter()` directly. Its schema is essentially a pass/fail/total result.

So for this case, we need to audit **both layers**:

1. What the Tester prompt claims.
2. What AutoCoder actually does when it reaches the Tester stage.

And the second one wins, because production behavior doesn't care what the prompt _aspired_ to be.

---

# Case 8A: What does the Tester actually receive?

After Coder:

```text id="5j8v2m"
Blueprint
   ↓
Coder
   ↓
Generated project
   ↓
Tester
```

The current implementation effectively does:

```text id="g4q1z7"
Generated VFS/project
       ↓
runLinter()
       ↓
TypeScript/compiler diagnostics
       ↓
Tester result
```

So let's test it with three generated projects.

---

# Test 1: Code has a syntax error

Generated file:

```typescript id="8v3k1p"
export function calculateTotal(
  expenses: Expense[]
): number {
  return expenses.reduce((total, expense) => {
    return total + expense.amount
}
```

Missing closing syntax.

### Expected Tester behavior

```text
FAILED
```

And the deterministic linter should identify the compiler/syntax issue.

### Result

**PASS**

This is a legitimate capability.

The current verification layer is useful for catching:

- syntax errors
- TypeScript errors
- some module-resolution problems
- some JavaScript diagnostics

The problem is that this represents only a very small subset of what "testing generated software" means.

---

# Test 2: Code compiles but is logically wrong

Consider:

```typescript id="6y2p4n"
export async function getExpenses(userId: string) {
  return prisma.expense.findMany();
}
```

The requirement is:

> Users must only retrieve their own expenses.

This code:

- compiles
- has valid TypeScript
- executes
- may even return real data

But it leaks every user's expenses.

### Current Tester

Likely:

```text id="r7k3m9"
PASS
```

because the compiler sees valid code.

### Actual result

```text id="j2x8q4"
CRITICAL SECURITY FAILURE
```

The testing stage missed it entirely.

### Severity

**P0**

This isn't a minor test coverage problem.

It means the pipeline can declare generated software healthy while it violates a core authorization invariant.

---

# Test 3: API returns wrong behavior

Suppose the API contract requires:

```text id="v3m7q1"
POST /api/expenses
201 Created
```

But Coder implements:

```typescript id="n8k4p2"
return NextResponse.json({ expense }, { status: 200 });
```

Valid TypeScript.

Valid Next.js.

Valid runtime behavior.

Wrong API contract.

### Tester result

```text id="z5c1r8"
PASS
```

### Correct result

```text id="s7q2w6"
FAIL
Reason:
API-EXPENSE-CREATE requires HTTP 201.
Implementation returns 200.
```

Current Tester cannot establish this.

### Severity

**P1**

---

# Test 4: UI is broken but TypeScript is valid

Imagine:

```tsx id="f8k3q1"
<button onClick={handleDelete}>Delete</button>
```

but `handleDelete` points to a function that deletes the wrong expense ID.

Everything compiles.

Nothing in the deterministic linter necessarily catches it.

The generated application can be completely wrong while the Tester reports success.

---

# Test 5: Missing requirement

Requirement:

> Dashboard must display monthly spending totals.

Coder simply forgets the dashboard calculation.

The project:

```text id="1v8q5m"
compiles
```

Tester:

```text id="6n2p4k"
PASS
```

Actual result:

```text id="3q7m8x"
FAIL
```

This is the fundamental distinction:

> **Compilation is not testing.**

---

# Finding 1: The Tester isn't actually a Tester

This is the first and most obvious conclusion.

Current architecture:

```text id="p6w4m8"
Tester
   ↓
runLinter()
```

Actual capability:

```text id="x9q2n7"
static validation
```

A linter/compiler can answer:

> "Is this code syntactically/type-wise acceptable under my configured rules?"

It cannot reliably answer:

> "Does this application satisfy the user's requirements?"

### Severity: **P0**

---

# Finding 2: No executable acceptance criteria

This is where Case 2 comes back to bite us.

Planner generated:

```text id="h5m8q2"
AC-003:
An authenticated user can create an expense.
```

But there is no mechanism to turn that into an executable test.

The correct pipeline should be:

```text id="w7k3m9"
AC-003
 ↓
test definition
 ↓
test fixture
 ↓
execute
 ↓
observe
 ↓
PASS/FAIL
```

Instead:

```text id="j4p8x2"
AC-003
 ↓
nothing
```

This is a direct architectural gap between Planner and Tester.

### Severity: **P0**

---

# Finding 3: No runtime testing

The Tester doesn't launch the generated application and exercise it.

Therefore it cannot detect:

- runtime exceptions
- broken API handlers
- incorrect routing
- database errors
- authentication failures
- serialization errors
- UI interaction failures
- environment/configuration problems

### Severity: **P0**

---

# Finding 4: No integration testing

Consider:

```text id="q3n8v5"
Frontend
 ↓
API
 ↓
Service
 ↓
Prisma
 ↓
PostgreSQL
```

Every individual layer could compile.

The integration could still fail.

Example:

```text id="j9w4c1"
Frontend sends:
{
  amount: 100
}

Backend expects:
{
  amount: "100.00"
}
```

Compilation might not catch it if the boundary uses loose types.

Tester won't either.

### Severity: **P1**

---

# Finding 5: No database verification

The System stage defines a database.

But Tester doesn't appear to:

```text id="q4m7p8"
create test database
run migrations
seed fixtures
execute queries
verify constraints
```

That means Prisma schema validity isn't equivalent to:

> Database actually works.

Example:

```text id="m2x8v6"
migration succeeds
+
runtime query fails
```

The pipeline can still call the project healthy if only static validation ran.

### Severity: **P1**

---

# Finding 6: No authentication test

We explicitly require JWT authentication.

Tester should test:

```text id="c8q2m5"
register
login
invalid credentials
missing token
expired token
protected endpoint
logout/session behavior
```

Most importantly:

```text authenticated user A
      ↓
attempts to access
      ↓
user B's expense
```

That test is absolutely central to this application's security model.

Current Tester doesn't perform it.

### Severity: **P0**

---

# Finding 7: No negative testing

A quality test suite needs to deliberately do the wrong thing.

Examples:

```text id="t4n7x2"
negative amount
invalid category
missing auth
malformed JWT
another user's resource
nonexistent expense
invalid date
duplicate request
```

Current Tester is essentially checking:

```text code compiles

```

There is no systematic adversarial behavior.

### Severity: **P1**

---

# Finding 8: No regression testing

This becomes catastrophic once Debugger starts modifying code.

Suppose:

```text id="h8m3q1"
Initial code:
10 tests pass
```

Debugger fixes:

```text expense update

```

but accidentally breaks:

```text expense creation

```

Tester needs to run:

```text id="n7p2k4"
previous passing tests
+
new relevant tests
```

Current architecture has no meaningful regression suite to protect against this.

### Severity: **P0/P1**

Given AutoCoder's intended repair loop, I'd classify it **P0**.

---

# Finding 9: No coverage model

Even if AutoCoder adds tests, it needs to know:

```text id="x2k8m4"
Which requirements have tests?
Which code paths are covered?
Which acceptance criteria are untested?
```

A generic:

```text coverage = 82%

```

isn't enough.

You could have 95% line coverage and never test authorization.

The important metric is:

```text id="j5q9v3"
Requirement coverage
+
branch/path coverage
+
security invariant coverage
```

### Severity: P1

---

# Finding 10: Linter configuration is too permissive for generated software

We already found this in the repo-level audit.

The generated-project linter uses a relatively permissive TypeScript configuration:

```text id="x3k7p9"
strict: false
allowJs: true
checkJs: true
skipLibCheck: true
```

and suppresses certain diagnostics.

This means even the **static verification layer itself** is weaker than what you'd want for generated production code.

### Severity: P1

And importantly, the proposed blanket suppression of module-resolution errors is unsafe.

A missing local import is not the same thing as an optional external type package.

---

# Finding 11: No build gate

A project can:

```text compile individual files

```

but fail:

```text npm run build

```

because of:

- route conflicts
- framework configuration
- missing environment variables
- production-only compilation behavior
- invalid imports
- bundler errors
- server/client boundary violations

The Tester needs a real generated-project build step.

### Severity: P1

---

# Finding 12: No browser/UI testing

For a web application, you eventually need something like:

```text id="p7m4x2"
launch app
 ↓
open browser
 ↓
register
 ↓
login
 ↓
create expense
 ↓
verify dashboard
 ↓
filter
 ↓
edit
 ↓
delete
```

Without that, "responsive dashboard" and "working login" are largely claims.

### Severity: P1

---

# Finding 13: No test isolation strategy

Once runtime testing exists, AutoCoder needs to answer:

```text id="m5q8x1"
Where does the database live?
What environment variables are used?
How are test records isolated?
Can tests run concurrently?
How is state reset?
```

Otherwise one test contaminates another.

This becomes especially important if AutoCoder generates multiple projects concurrently.

### Severity: P1/P2

---

# Finding 14: No machine-readable failure model

Current static validation gives diagnostics.

But a real Tester should produce something like:

```json id="q2v8m4"
{
  "testId": "AC-007",
  "requirementId": "FR-006",
  "status": "FAIL",
  "failureType": "AUTHORIZATION",
  "severity": "CRITICAL",
  "file": "lib/services/expense-service.ts",
  "evidence": "...",
  "repro": "...",
  "affectedSymbols": ["deleteExpense"]
}
```

Then Debugger has something actionable.

Instead, a compiler diagnostic might say:

```text
TS2339 Property 'x' does not exist...
```

The semantic connection is lost.

### Severity: P1

---

# The most important attack: security invariant

Let's run the exact requirement:

> User A must never be able to access User B's expenses.

Generated implementation:

```typescript id="j7p4x2"
const expense = await prisma.expense.findUnique({
  where: { id },
});
```

This compiles.

Tester:

```text id="f8q2m5"
PASS
```

Correct tester:

```text id="m3v9k1"
1. Create user A.
2. Create user B.
3. Create expense owned by B.
4. Authenticate as A.
5. Request B's expense.
6. Expect 404/403 according to API contract.
7. Verify response contains no B data.
```

If it returns B's expense:

```text
CRITICAL FAILURE
```

This one test demonstrates why **runtime acceptance testing must exist before AutoCoder can honestly claim autonomous software generation**.

---

# Tester Scorecard

| Capability              | Current Result |
| ----------------------- | -------------- |
| Syntax validation       | 🟢             |
| Type validation         | 🟢             |
| Static diagnostics      | 🟢             |
| Build validation        | 🟠/🔴          |
| Runtime testing         | 🔴             |
| API testing             | 🔴             |
| Database testing        | 🔴             |
| Auth testing            | 🔴             |
| UI testing              | 🔴             |
| Acceptance testing      | 🔴             |
| Negative testing        | 🔴             |
| Security testing        | 🔴             |
| Regression testing      | 🔴             |
| Requirement coverage    | 🔴             |
| Test traceability       | 🔴             |
| Failure localization    | 🔴             |
| Parallel test isolation | 🔴             |

---

# Case 8 Verdict

This is the clearest **P0 finding since the Coder**.

The current "Tester" isn't really a test agent.

It is:

> **a deterministic static-analysis gate.**

That is useful.

It should absolutely remain.

But it should be called something like:

```text
StaticValidator
```

and AutoCoder needs a separate:

```text
TestExecutor
```

---

# Correct target architecture

Instead of:

```text id="r8k3m2"
Coder
 ↓
Tester
 ↓
runLinter()
 ↓
Debugger
```

we need:

```text id="t4p7x9"
Coder
 ↓
Static Validation
 ├── syntax
 ├── types
 ├── imports
 └── lint
 ↓
Build
 ↓
Test Environment
 ↓
Acceptance Test Executor
 ├── unit tests
 ├── integration tests
 ├── API tests
 ├── DB tests
 ├── auth/security tests
 └── UI/E2E tests
 ↓
Requirement Verification
 ↓
PASS
   OR
FAIL
 ↓
Failure Localization
 ↓
Debugger
```

And the critical data structure is:

```text id="z7m4q2"
Requirement
   ↓
Acceptance Criterion
   ↓
Executable Test
   ↓
Observed Result
   ↓
Failure
   ↓
Affected Code
```

That finally gives us the closed loop we've been looking for.

---

## One more architectural distinction

There should **not** be one giant "Tester" that tries to do everything.

I'd split verification into layers:

```text id="n5q8w3"
1. Static Validator
   syntax / types / imports / lint

2. Build Validator
   production build

3. Unit Test Runner
   isolated functions

4. Integration Test Runner
   service + DB

5. API Test Runner
   HTTP contracts

6. E2E Runner
   browser/user journeys

7. Security Validator
   authorization / secrets / injection / etc.

8. Acceptance Evaluator
   maps all results back to requirements
```

Then the final quality gate aggregates them.

That gives Debugger structured evidence rather than dumping a pile of compiler errors on it and asking it to perform digital archaeology.

---

# Running Case 8 against the full pipeline

At this point, we have:

```text id="q9m3v7"
Queen       → extracts intent, but loses provenance
Planner     → structures requirements, but not executable enough
Architect   → creates architecture, but weak authority/validation
System      → creates backend, but weak contracts/invariants
Designer    → creates UI, but weak data/state bindings
Blueprinter → creates implementation graph, but becomes bottleneck
Coder       → generates files, but lacks autonomous verification
Tester      → statically validates, but doesn't actually test behavior
```

So the system currently has **no trustworthy mechanism that can answer the fundamental question**:

> **"Did the generated application actually satisfy what the user asked for?"**

# Case 9: Debugger

This is where the pipeline is supposed to **repair failed generated software**.

The current Debugger prompt is substantially better than some of the earlier agents. It has moved away from whole-file rewrites and toward **JSON line-range patches**, with a stated goal of making minimal repairs while preserving exports and signatures. It receives source files plus syntax/type errors and can declare errors unfixable.

So unlike Tester, this isn't a case where the prompt is fundamentally empty.

The problem is that the Debugger is currently designed around a **very narrow definition of failure**.

It is essentially:

> compiler-error repair

rather than:

> software-debugging agent.

Let's attack it.

---

# Case 9A: Simple compiler failure

Suppose Coder produces:

```typescript id="q3m8v1"
import { prisma } from "@/lib/db/prisma";

export async function getExpenses(userId: string) {
  return prisma.expense.findMany({
    where: {
      userId,
      categoryId: categoryId,
    },
  });
}
```

Tester reports:

```text id="x7p4k2"
TS2304:
Cannot find name 'categoryId'.
```

---

# Simulated Debugger Output

Applying the current Debugger prompt:

```json id="m8v2q5"
{
  "patches": [
    {
      "file": "lib/services/expense-service.ts",
      "startLine": 7,
      "endLine": 7,
      "replacement": "      categoryId: undefined,"
      "reason": "categoryId is referenced but is not defined in the current function scope."
    }
  ],
  "unfixable": []
}
```

This is an important failure.

The Debugger has technically responded to the compiler error.

But it has **not necessarily repaired the software**.

The correct repair might be:

```typescript
export async function getExpenses(
  userId: string,
  filters?: { categoryId?: string },
) {
  return prisma.expense.findMany({
    where: {
      userId,
      categoryId: filters?.categoryId,
    },
  });
}
```

The Debugger doesn't have enough semantic context to know.

---

# Finding 1: Debugger optimizes for error disappearance, not correctness

This is the central problem.

The current prompt says, in effect:

> fix only the reported errors.

That creates:

```text id="v6q1m3"
Error
 ↓
patch
 ↓
compiler passes
```

rather than:

```text id="j8p4w2"
Failure
 ↓
understand root cause
 ↓
repair behavior
 ↓
verify original requirement
```

A compiler error is an **observation**, not necessarily the actual defect.

### Severity: **P0**

---

# Finding 2: It cannot handle behavioral failures

This is where Case 8 immediately connects.

Suppose the real Tester reports:

```text id="f3m7q9"
AC-014 FAILED

User A can access User B's expense.

Observed:
GET /api/expenses/123

Authenticated user:
A

Expense owner:
B

Expected:
403/404

Actual:
200
```

Current Debugger prompt is built around:

```text syntax/type errors

```

It has no explicit behavioral failure contract.

Therefore the Debugger has no structured input telling it:

```text requirement
expected behavior
actual behavior
reproduction
affected symbols
```

### Severity: **P0**

This means even after we build the proper Tester from Case 8, the current Debugger would be unable to consume its most valuable failures.

---

# Finding 3: "Fix only reported errors" is too restrictive

This sounds safe.

It isn't.

Imagine:

```text id="g8q2v5"
Error:
Cannot find property `x`.
```

The root cause may be:

```text id="u3p7m9"
wrong type definition
```

The error occurs in:

```text id="k4q8n2"
file A
```

but the actual defect is in:

```text id="z7m3p1"
file B
```

If Debugger is forbidden from modifying anything except the directly reported location, it may patch around the real problem.

### Severity: P1

### Better rule

> Repair the smallest set of files necessary to restore the violated contract, while minimizing unrelated changes.

That's very different from:

> Modify only the line where the compiler complained.

---

# Finding 4: No root-cause analysis contract

Current Debugger output has:

```text id="b6x4m2"
file
startLine
endLine
replacement
reason
```

Good for applying patches.

But `reason` isn't enough.

We need:

```text id="n7q3p5"
failure_id
root_cause
violated_contract
affected_symbols
affected_files
patches
expected_postcondition
```

For example:

```json id="h4k8m2"
{
  "failure_id": "TEST-014",
  "root_cause": {
    "type": "AUTHORIZATION_BYPASS",
    "description": "Expense lookup does not constrain resource ownership."
  },
  "violated_invariant": "AUTH-INV-001",
  "affected_symbols": [
    "getExpense"
  ],
  "patches": [...]
}
```

Now the repair is explainable and machine-verifiable.

### Severity: P1

---

# Finding 5: Patch line ranges are brittle

The current patch format uses:

```text id="j4q8w1"
startLine
endLine
replacement
```

This is better than rewriting the entire file.

But line numbers are not stable.

Imagine two patches:

```text id="p7m3x9"
Patch A:
lines 10–15

Patch B:
lines 30–35
```

Apply A.

Now line numbers after A may change.

Patch B can target the wrong code.

### Severity: P1

---

# Fix

Use patches anchored to file content or version:

```json id="m9x3q7"
{
  "file": "src/example.ts",
  "expected_file_hash": "...",
  "anchor": {
    "before": "const result = ...",
    "after": "return result;"
  },
  "replacement": "..."
}
```

Or use AST/symbol-level patches.

The latter is much more appropriate for AutoCoder eventually.

---

# Finding 6: No post-patch verification

This is huge.

Current flow can effectively become:

```text id="y5q8m3"
Tester
 ↓
Debugger
 ↓
patch
 ↓
done
```

But the Debugger doesn't own the guarantee that:

```text patch applied
+
original error gone
+
new errors absent
+
behavior preserved
```

The system needs:

```text id="q3m7v1"
Debugger
 ↓
Patch
 ↓
Static validation
 ↓
Build
 ↓
Relevant tests
 ↓
Regression tests
```

### Severity: **P0**

Without this, Debugger is another probabilistic code generator.

---

# Finding 7: No regression awareness

Consider a repair:

```text id="f4k8n2"
Fix expense deletion.
```

Debugger modifies:

```text expense-service.ts

```

But that file also contains:

```text createExpense()
updateExpense()
getExpenses()
deleteExpense()
```

The repair can fix deletion and accidentally break creation.

Debugger has no concept of:

```text id="m8q3v5"
affected tests
affected requirements
affected symbols
```

### Severity: P0/P1

Given the intended closed loop, I'd classify it **P0**.

---

# Finding 8: No semantic localization

The prompt receives errors.

But it doesn't appear to receive a semantic graph saying:

```text id="r6q2m8"
failure
 ↓
symbol
 ↓
file
 ↓
dependencies
 ↓
requirements
 ↓
tests
```

That makes repair unnecessarily broad.

For example:

```text id="n4x7q2"
Type error in ExpenseTable
```

Could originate from:

```text API response
 ↓
shared type
 ↓
serializer
 ↓
component
```

Debugger should identify the narrowest root cause.

### Severity: P1

---

# Finding 9: Debugger is overly conservative about changing interfaces

The prompt tells it to preserve:

- exports
- function signatures
- contracts

That's generally good.

But sometimes the **interface itself is the defect**.

Example:

```typescript id="y7p2m4"
getExpenses(userId: string): Expense[]
```

Requirement now needs filtering:

```text categoryId
date range
pagination
```

The correct fix may require:

```typescript id="z8m4q1"
getExpenses(
  userId: string,
  filters: ExpenseFilters
)
```

The Debugger should not arbitrarily redesign APIs.

But it needs a mechanism to say:

```text id="k3q7m2"
current contract cannot satisfy requirement
→ escalate to architecture/blueprint repair
```

Otherwise it will either:

- make an ugly local patch, or
- declare unfixable.

### Severity: P1

---

# Finding 10: No escalation protocol

This is a serious missing contract.

Not every failure belongs to Debugger.

Examples:

```text id="v5n8q2"
Wrong database model
Wrong API contract
Missing requirement
Conflicting architecture
Missing file
Wrong framework structure
```

Debugger should not "fix" those locally.

It should emit:

```json id="q8m3v1"
{
  "status": "ESCALATE",
  "target": "BLUEPRINT",
  "reason": "Current implementation contract is inconsistent with backend schema."
}
```

Potential targets:

```text id="a6q9m2"
Coder
Blueprint
System
Architect
Planner
```

### Severity: P1

---

# Finding 11: No distinction between generated-code defect and contract defect

This is closely related.

Suppose Blueprint says:

```text id="r5m7x3"
POST /api/expenses returns 200
```

System says:

```text id="v2q8m4"
POST /api/expenses returns 201
```

Coder implements 200.

Tester fails.

What should Debugger do?

It should **not blindly change the code**.

It should detect:

```text CONTRACT CONFLICT

```

and escalate.

Otherwise the Debugger merely chooses one conflicting specification arbitrarily.

### Severity: P0

---

# Finding 12: No behavioral debugging evidence

For real failures, Debugger needs:

```text id="u7m2q9"
reproduction steps
input
expected output
actual output
logs
stack trace
HTTP response
database state
screenshots
```

The current prompt is designed around source files + compiler errors.

That won't scale to runtime debugging.

### Severity: P0/P1

---

# Attack Test: Authentication bypass

Let's give Debugger a proper behavioral failure:

```text id="3q8m2v"
TEST FAILURE: AUTH-INV-001

Requirement:
Users may access only their own expenses.

Reproduction:
1. Create User A.
2. Create User B.
3. Create expense E owned by B.
4. Authenticate as A.
5. GET /api/expenses/E.id

Expected:
404

Actual:
200 with expense E.
```

A proper Debugger should inspect:

```text id="k5m8q3"
API route
ExpenseService
database query
auth helper
```

and find:

```typescript id="w8p4m1"
prisma.expense.findUnique({
  where: { id },
});
```

Then repair to something like:

```typescript id="j7q2n4"
prisma.expense.findFirst({
  where: {
    id,
    userId: authenticatedUserId,
  },
});
```

Then run the test again.

Current Debugger prompt does not describe any of that.

### Verdict: **P0**

---

# Attack Test: Runtime crash

Tester reports:

```text id="m4q8x2"
POST /api/expenses

500 Internal Server Error

Stack:
PrismaClientValidationError
Invalid value for amount
```

Debugger needs to determine:

```text id="q7n3v5"
Is database schema wrong?
Is input validation wrong?
Is Decimal serialization wrong?
Is frontend sending number/string incorrectly?
```

That requires cross-file semantic investigation.

The current Debugger isn't designed for it.

---

# Attack Test: Regression

Initial tests:

```text id="x8m2q5"
AC-001 PASS
AC-002 PASS
AC-003 PASS
AC-004 PASS
```

Debugger fixes AC-004.

After patch:

```text id="f7q3m8"
AC-001 PASS
AC-002 FAIL
AC-003 PASS
AC-004 PASS
```

Debugger should reject its own repair.

Current prompt doesn't define this behavior.

---

# Debugger Scorecard

| Dimension                    | Result    |
| ---------------------------- | --------- |
| Syntax repair                | 🟢 Good   |
| Type-error repair            | 🟢 Good   |
| Minimal patches              | 🟢 Good   |
| Whole-file rewrite avoidance | 🟢 Strong |
| Behavioral debugging         | 🔴        |
| Runtime debugging            | 🔴        |
| Root-cause analysis          | 🔴        |
| Semantic localization        | 🔴        |
| Regression verification      | 🔴        |
| Post-patch validation        | 🔴        |
| Contract conflict detection  | 🔴        |
| Escalation                   | 🔴        |
| Patch stability              | 🟠        |
| Cross-file repair            | 🟠        |
| Requirement awareness        | 🔴        |
| Security-invariant repair    | 🔴        |

---

# Case 9 Verdict

The Debugger is actually **one of the better-written prompts at the local level**, but it is solving the wrong problem.

Current mental model:

```text id="p4m7x2"
Compiler error
      ↓
minimal patch
      ↓
fixed
```

Required mental model:

```text id="x8q3m1"
Failure Evidence
      ↓
Classify failure
      ↓
Locate root cause
      ↓
Check violated contract
      ↓
Determine repair scope
      ↓
Patch
      ↓
Static validation
      ↓
Build
      ↓
Relevant test
      ↓
Regression tests
      ↓
PASS
       OR
ESCALATE
```

### P0

**1. Behavioral failures aren't first-class inputs**

**2. No post-repair verification**

**3. No regression verification**

**4. Contract conflicts aren't detected**

**5. Debugger is constrained to reported compiler/type errors**

**6. No runtime debugging evidence model**

### P1

**7. No root-cause contract**

**8. No semantic failure localization**

**9. No escalation protocol**

**10. Patch anchoring is brittle**

**11. No requirement/invariant awareness**

**12. Interface-preservation rule can prevent legitimate contract repair**

---

# The corrected Debugger contract

I would make the Debugger consume a unified `FailureReport`:

```json id="k8m4q2"
{
  "failure_id": "FAIL-042",
  "type": "BEHAVIORAL",
  "severity": "CRITICAL",

  "requirement_ids": ["FR-006"],

  "acceptance_test_ids": ["AC-014"],

  "expected": "...",
  "actual": "...",

  "reproduction": ["..."],

  "evidence": {
    "logs": [],
    "stack_trace": "...",
    "http_response": {},
    "test_output": "..."
  },

  "affected_files": [],
  "affected_symbols": [],

  "violated_invariants": ["AUTH-INV-001"]
}
```

Then:

```text id="w7p3m9"
FailureReport
      ↓
Debugger
      ↓
Root Cause
      ↓
Repair Plan
      ↓
Patch
      ↓
Validation
      ↓
Regression
```

And the Debugger should have **three possible outcomes**:

```text id="e8q4m1"
REPAIRED
UNFIXABLE
ESCALATE
```

Not simply:

```text patches / unfixable

```

---

## What Case 9 tells us about the pipeline

Cases 7–9 now expose the entire execution loop:

```text id="u4m8q2"
Coder
 ↓
generates code
 ↓
Tester
 ↓
only static validation
 ↓
Debugger
 ↓
only understands compiler/type failures
 ↓
???
```

So even if we make Coder excellent, the pipeline still cannot autonomously recover from:

- behavioral failures
- API contract failures
- authentication failures
- database failures
- UI failures
- integration failures
- regression failures

The **Debugger isn't the root problem**.

The missing piece is the shared:

> **Failure → Evidence → Root Cause → Repair → Verification contract.**

That contract has to connect **Tester, Debugger, Coder, and the canonical requirements**.

# Case 10: Reviewer

We now take the **Reviewer prompt exactly as it exists in the current repo** and run it against the same Expense Tracker project we've been carrying through Cases 1–9.

Current `Reviewer.ts` confirms:

- It receives original specs + generated code.
- It must output `PASS` or `REPAIR_REQUIRED`.
- It only has `HIGH / MEDIUM / LOW` severity.
- It marks `REPAIR_REQUIRED` only for HIGH findings.
- It has **no tools**.
- It requires exact file paths for findings, but `file` is not actually required by the JSON schema.
- `getContext()` returns an empty string.

---

# 10A. Test Project

Same project:

**Expense Tracker**

Mandatory requirements:

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Tailwind
- JWT authentication
- Vercel deployment
- User registration/login
- Expense CRUD
- Categories
- Filtering
- Monthly totals
- Dashboard
- Responsive UI
- Users must only access their own expenses
- No payments
- No bank integrations
- No AI
- No social features

Assume the generated project contains these relevant files:

```text
src/app/api/auth/login/route.ts
src/app/api/expenses/route.ts
src/app/api/expenses/[id]/route.ts
src/lib/services/expense.service.ts
src/lib/auth.ts
src/lib/validation/expense.ts
src/app/dashboard/page.tsx
src/components/ExpenseTable.tsx
prisma/schema.prisma
```

And we deliberately introduce several defects.

### Defect 1: Authorization bug

```ts
export async function getExpenses() {
  return prisma.expense.findMany();
}
```

Instead of:

```ts
where: {
  userId;
}
```

This is a **critical security/tenant-isolation failure**.

### Defect 2: Wrong POST status

The requirement expects expense creation to return `201`.

The implementation returns:

```ts
return NextResponse.json(expense);
```

which defaults to `200`.

### Defect 3: Dashboard missing monthly totals

The dashboard displays expenses and categories but never implements the required monthly total.

### Defect 4: Type issue

The database uses a monetary `Decimal`, but the frontend interface represents it as:

```ts
amount: number;
```

Potential precision problem.

### Defect 5: UI works visually but delete has no error state.

Not necessarily a release blocker, but worth flagging.

---

# 10B. Now I Execute the Reviewer Prompt

The prompt says:

> “You are a senior code reviewer. You receive original specs and generated code files.”

Then:

> “You verify requirement fulfillment, architectural compliance, and code quality.”

Following the actual required output format, the simulated Reviewer produces:

```json
{
  "status": "REPAIR_REQUIRED",
  "findings": [
    {
      "id": "FINDING-001",
      "severity": "HIGH",
      "category": "Requirements",
      "file": "src/lib/services/expense.service.ts",
      "description": "Expense retrieval does not enforce user ownership filtering, allowing expenses belonging to other users to be returned."
    },
    {
      "id": "FINDING-002",
      "severity": "HIGH",
      "category": "Requirements",
      "file": "src/app/api/expenses/route.ts",
      "description": "Expense creation returns HTTP 200 instead of the required HTTP 201 response."
    },
    {
      "id": "FINDING-003",
      "severity": "HIGH",
      "category": "Requirements",
      "file": "src/app/dashboard/page.tsx",
      "description": "Dashboard does not implement the required monthly expense totals."
    },
    {
      "id": "FINDING-004",
      "severity": "MEDIUM",
      "category": "Code Quality",
      "file": "src/app/dashboard/page.tsx",
      "description": "Expense amount is represented as a JavaScript number despite the database using Decimal, which may introduce monetary precision issues."
    },
    {
      "id": "FINDING-005",
      "severity": "MEDIUM",
      "category": "UX",
      "file": "src/components/ExpenseTable.tsx",
      "description": "Expense deletion does not expose a clear failure state or retry path to the user."
    }
  ],
  "summary": "The generated application does not fully satisfy the specified requirements. Critical requirement and authorization issues require repair before release."
}
```

### Reviewer verdict

**REPAIR_REQUIRED**

And on this particular input, that verdict is reasonable.

So at first glance, Reviewer looks pretty good.

That is exactly where we need to become annoying.

Because the interesting question isn't:

> “Can it find obvious bugs?”

It is:

> **“Can this Reviewer serve as a reliable automated quality gate for AutoCoder?”**

The answer is **no, not yet.**

---

# 10C. Prompt-by-Prompt Audit

## 1. “You receive original specs and generated code files.”

### Problem: input contract is underspecified

What exactly are "original specs"?

Could be:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
design.md
blueprint.md
```

Or perhaps structured stage outputs.

The Reviewer prompt doesn't define:

- canonical source of requirements
- authoritative version
- requirement IDs
- architecture invariants
- acceptance criteria
- test results
- build results
- security results
- known deviations
- generated-project state

This matters because our earlier cases already demonstrated that the pipeline has multiple representations of the same information.

Reviewer is being asked to determine truth from a pile of documents.

Human engineers hate this.

Apparently we decided to automate the pile.

### Severity: **P1**

---

# 2. “You verify requirement fulfillment”

This sounds correct.

But the prompt gives the Reviewer **no requirement-to-code mapping**.

Suppose requirements are:

```text
FR-001 Authentication
FR-002 Expense creation
FR-003 Expense filtering
FR-004 Monthly totals
FR-005 Category management
```

The Reviewer has to infer:

```text
FR-004
  ↓
dashboard/page.tsx
  ↓
monthly aggregation
```

There is no machine-readable traceability.

That means it can easily miss a requirement buried in a large project.

### Severity: **P1**

---

# 3. “Architectural compliance”

This is actually worse.

The Reviewer is never given a formal definition of what constitutes architectural compliance.

For example:

Architecture says:

```text
UI
 ↓
API
 ↓
Service
 ↓
Repository
 ↓
Prisma
```

Generated code does:

```text
UI
 ↓
Server Action
 ↓
Prisma
```

Is that:

- valid?
- a violation?
- acceptable deviation?
- architectural improvement?

The Reviewer has no explicit invariant model.

It is forced to make a judgment.

### Severity: **P1**

---

# 4. The severity model

Current schema:

```text
HIGH
MEDIUM
LOW
```

This is a major weakness.

Because the prompt says:

> “Mark status as REPAIR_REQUIRED if there are any HIGH severity findings.”

But there is no:

```text
CRITICAL
```

severity.

And our authorization bug is clearly more serious than a missing empty-state message.

Yet both ultimately get shoved into:

```text
HIGH
```

That destroys severity granularity.

A better model:

```text
CRITICAL
HIGH
MEDIUM
LOW
INFO
```

With deterministic release rules:

```text
CRITICAL → fail
HIGH → fail
MEDIUM → depends on gate
LOW → pass
```

### Severity: **P1**

---

# 5. The biggest flaw: PASS criteria

The prompt says:

> “Mark status as PASS if all critical requirements are met and no HIGH severity findings exist.”

This is deceptively weak.

Imagine Reviewer produces:

```json
{
  "status": "PASS",
  "findings": [
    {
      "severity": "MEDIUM",
      "description": "Monthly totals are calculated incorrectly."
    },
    {
      "severity": "MEDIUM",
      "description": "Users can see another user's expenses under a specific filter."
    }
  ]
}
```

According to the prompt:

**PASS is valid.**

Because there are no HIGH findings.

That's unacceptable for an automated software-generation gate.

The gate should not be:

> “Did the LLM decide the problems aren't HIGH?”

It should be:

> “Did the deterministic quality system establish that all release-blocking conditions passed?”

Huge difference.

### Severity: **P0**

This connects directly to Case 8 and Case 9.

Tester needs objective failures.

Debugger needs objective failures.

Reviewer needs to **aggregate evidence**, not manufacture the release decision from its own subjective judgment.

---

# 6. Findings have no evidence

Current finding:

```json
{
  "severity": "HIGH",
  "category": "Requirements",
  "file": "...",
  "description": "..."
}
```

That's not enough.

A robust finding should contain something like:

```json
{
  "id": "FINDING-001",
  "severity": "CRITICAL",
  "category": "Security",
  "requirementIds": ["FR-007"],
  "acceptanceCriteriaIds": ["AC-007"],
  "file": "src/lib/services/expense.service.ts",
  "symbol": "getExpenses",
  "lineStart": 18,
  "lineEnd": 24,
  "expected": "Only return expenses owned by authenticated user",
  "actual": "Returns all expenses",
  "evidence": {
    "testId": "AT-007",
    "result": "FAILED"
  }
}
```

Now another agent can actually act on it.

Current Reviewer produces prose.

### Severity: **P1**

---

# 7. Reviewer doesn't consume test evidence

This is probably the biggest architectural problem.

Imagine Tester reports:

```text
AT-007 FAILED

Expected:
GET /api/expenses returns only current user's expenses

Actual:
User A receives User B's expense

Evidence:
HTTP 200
response contains expense owned by user B
```

Reviewer should consume this.

Instead, current prompt only says it receives:

> original specs and generated code files.

It doesn't explicitly consume:

- test results
- build results
- runtime logs
- security scan
- coverage
- browser tests
- API tests

So Reviewer is forced to rediscover evidence by reading source.

That's backwards.

### Severity: **P0**

---

# 8. Reviewer has no tools

Current:

```ts
export const allowedTools: string[] = [];
```

This means Reviewer cannot:

- inspect the repository dynamically
- run tests
- run build
- inspect generated files beyond provided context
- query database state
- reproduce an API failure
- inspect runtime logs
- verify a suspected issue

It is a **static textual reviewer**.

That's fine as one layer.

It is not sufficient as the final quality gate.

### Severity: **P1**

---

# 9. Reviewer cannot distinguish confirmed failure from suspicion

Consider:

```text
Potential SQL injection risk.
```

Is that:

- confirmed vulnerability?
- theoretical possibility?
- framework-safe parameterized query?
- false positive?

Current schema gives no place for confidence/evidence.

The Reviewer therefore mixes:

```text
observed defect
```

with:

```text
professional suspicion
```

Those should be separate.

---

# 10. No requirement coverage report

This is a big omission.

Suppose the project has:

```text
FR-001 → PASS
FR-002 → PASS
FR-003 → PASS
FR-004 → NOT VERIFIED
FR-005 → PASS
```

Reviewer currently can't express that.

It only has:

```text
findings[]
summary
```

So an entire requirement can silently disappear from the review.

The output should instead have something like:

```json
"requirementCoverage": [
  {
    "requirementId": "FR-001",
    "status": "VERIFIED",
    "evidence": ["AT-001"]
  },
  {
    "requirementId": "FR-004",
    "status": "FAILED",
    "evidence": ["AT-004"]
  }
]
```

### Severity: **P0/P1**

For AutoCoder, I'd treat it as **P0** because this is supposed to be the final quality gate.

---

# 11. No architectural invariant verification

Suppose the architecture requires:

```text
All expense queries must contain authenticated userId ownership filtering.
```

Reviewer needs to be able to verify:

```text
Invariant INV-003
  ↓
expense.service.ts
  ↓
getExpenses()
  ↓
userId predicate
```

Instead, it has to "review the code."

That's precisely the sort of thing deterministic validators should handle.

### Severity: **P1**

---

# 12. No regression awareness

This is particularly bad given Case 9.

Suppose:

```text
Initial build
    ↓
PASS

Debugger repairs bug A
    ↓
Bug A fixed
    ↓
Bug B introduced
```

Reviewer doesn't know:

- what changed
- which tests previously passed
- which tests must be rerun
- whether the repair caused regression

It sees the final code and starts over.

No concept of:

```text
before
after
changed symbols
affected requirements
previously passing tests
```

### Severity: **P0/P1**

For the closed repair loop, this should be **P0**.

---

# 13. No distinction between blocking and non-blocking findings

Current model:

```text
HIGH
MEDIUM
LOW
```

But what matters operationally is:

```text
BLOCKING
NON_BLOCKING
```

For example:

| Finding                      | Severity |     Release |
| ---------------------------- | -------: | ----------: |
| Cross-user data leak         | CRITICAL |       Block |
| Build failure                | CRITICAL |       Block |
| Missing monthly totals       |     HIGH |       Block |
| Missing loading skeleton     |      LOW | Don't block |
| Slight spacing inconsistency |      LOW | Don't block |

The LLM should not decide this solely through prose.

---

# 14. `file` isn't required by the schema

Prompt says:

> “Cite exact file paths for findings.”

But schema says:

```ts
file: {
  type: "string";
}
```

without putting `file` into:

```ts
required: [...]
```

So this is perfectly schema-valid:

```json
{
  "id": "FINDING-001",
  "severity": "HIGH",
  "category": "Security",
  "description": "Authorization is incorrect."
}
```

The prompt says one thing.

The validator allows another.

Classic contract drift.

### Severity: **P1**

---

# 15. No finding category enum

Current:

```ts
category: {
  type: "string";
}
```

So the model could produce:

```text
Security
security
SECURITY
Auth
Authorization
Access Control
User Isolation
```

No canonical taxonomy.

That makes analytics and downstream automation painful.

Use an enum such as:

```text
Requirements
Architecture
Security
Correctness
Performance
Reliability
Accessibility
UX
CodeQuality
Testing
Deployment
```

---

# 16. No repair instructions

The Reviewer identifies:

```text
Missing monthly totals.
```

But Debugger needs to know:

```text
what failed
why
what requirement
what acceptance test
what evidence
what scope of repair
```

Current output doesn't provide that.

Therefore the pipeline becomes:

```text
Reviewer
   ↓
"something is wrong"
   ↓
human-ish interpretation
   ↓
Debugger
```

Instead:

```text
Reviewer
   ↓
FailureReport
   ↓
Debugger
```

---

# 10D. Adversarial Tests

Now let's attack the Reviewer.

Because happy-path testing is how software teams convince themselves everything works right before production reminds them otherwise.

---

## Attack A: Critical security bug disguised as LOW

Generated code:

```ts
const expenses = await prisma.expense.findMany({
  where: {
    categoryId,
  },
});
```

Requirement:

```text
Users must only access their own expenses.
```

Reviewer might detect it.

But nothing in the prompt says:

> Security violations are automatically CRITICAL.

So the model has discretion over severity.

### Result

**Unsafe.**

A sufficiently optimistic model can produce:

```text
MEDIUM
```

and therefore:

```text
PASS
```

### Finding

**P0: Severity assignment is not deterministic for release-blocking classes.**

---

# Attack B: Missing requirement completely

Remove:

```text
monthly totals
```

from the dashboard.

If Reviewer notices:

```text
HIGH
```

good.

But imagine the requirement is buried inside a large requirements document.

No requirement IDs.

No coverage matrix.

No acceptance-test mapping.

Reviewer can simply overlook it.

### Result

**Potential false PASS.**

### Finding

**P0/P1: No requirement coverage accounting.**

---

# Attack C: Everything compiles, behavior is wrong

```ts
function calculateMonthlyTotal(expenses) {
  return expenses.reduce((sum, expense) => sum, 0);
}
```

Perfectly valid TypeScript.

Reviewer may notice it if it reads carefully.

But it shouldn't be responsible for discovering every behavioral defect by eyeballing source.

That is Tester territory.

### Finding

**P0: Reviewer is compensating for missing behavioral testing.**

---

# Attack D: Reviewer contradicts Tester

Tester:

```text
AT-007: FAILED
Severity: CRITICAL
```

Reviewer:

```text
PASS
```

Which wins?

Current contract doesn't say.

This is a serious pipeline-state problem.

### Finding

**P0: No precedence between deterministic validation and LLM review.**

The correct hierarchy should be:

```text
Deterministic blocking failure
        ↓
Cannot PASS

LLM Reviewer
        ↓
Can identify additional failures
        ↓
Cannot override deterministic failure
```

---

# Attack E: Reviewer says PASS despite MEDIUM findings

Current rules explicitly allow it.

Example:

```json
{
  "status": "PASS",
  "findings": [
    {
      "severity": "MEDIUM",
      "description": "Monthly totals are inaccurate."
    }
  ]
}
```

That is technically compliant with the prompt.

It is also absurd.

### Finding

**P0.**

---

# 10E. What the Reviewer Actually Is

After Cases 1–10, the pattern is becoming very clear.

The current Reviewer is:

> **A useful senior-style code review prompt.**

It is **not**:

> **A deterministic release-quality gate.**

Those are different things.

The Reviewer should be the **reasoning layer on top of deterministic evidence**, not the thing that invents the evidence and decides whether reality is acceptable.

---

# 10F. Correct Target Architecture

The proper pipeline should look more like:

```text
                 ┌─────────────────────┐
                 │ Canonical Requirements│
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │ Acceptance Criteria │
                 └──────────┬──────────┘
                            │
             ┌──────────────▼──────────────┐
             │ Generated Project           │
             └──────────────┬──────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
   Build Gate          Test Runner         Security Gate
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                   Structured Evidence
                            │
                            ▼
                    ┌───────────────┐
                    │    Reviewer   │
                    │  reasoning    │
                    └───────┬───────┘
                            │
                            ▼
                    Quality Decision
                            │
                 ┌──────────┴──────────┐
                 │                     │
              REPAIR               RELEASE
```

And crucially:

### Reviewer cannot override deterministic failures.

---

# 10G. Proposed Reviewer Contract

Something closer to:

```json
{
  "status": "REPAIR_REQUIRED",
  "requirementCoverage": [],
  "architectureCoverage": [],
  "findings": [],
  "blockingFindings": [],
  "verifiedEvidence": [],
  "unverifiedItems": [],
  "repairPlan": [],
  "summary": ""
}
```

A finding:

```json
{
  "id": "FINDING-001",
  "severity": "CRITICAL",
  "blocking": true,
  "category": "Security",
  "requirementIds": ["FR-007"],
  "acceptanceCriteriaIds": ["AC-007"],
  "file": "src/lib/services/expense.service.ts",
  "symbol": "getExpenses",
  "description": "Expense queries do not enforce authenticated-user ownership.",
  "expected": "Only expenses belonging to authenticated user are returned.",
  "actual": "Query can return expenses belonging to other users.",
  "evidenceIds": ["AT-007"],
  "repairScope": "expense.service.ts",
  "recommendedAction": "Add authenticated user ownership predicate and rerun affected acceptance and regression tests."
}
```

Now Case 9's Debugger can actually consume it.

---

# Case 10 Verdict

| Area                       | Verdict      |
| -------------------------- | ------------ |
| Basic code review          | **PASS**     |
| Requirement review         | **PASS-ish** |
| Architecture review        | **WEAK**     |
| Security review            | **WEAK**     |
| Behavioral verification    | **FAIL**     |
| Requirement traceability   | **FAIL**     |
| Evidence model             | **FAIL**     |
| Regression awareness       | **FAIL**     |
| Deterministic quality gate | **FAIL**     |
| Debugger handoff           | **WEAK**     |
| Schema consistency         | **FAIL**     |
| Production release gate    | **FAIL**     |

### Final classification: **P0**

Not because the Reviewer prompt itself is terrible. It isn't.

The problem is **where it sits in the architecture**.

It currently tries to act as:

```text
Reviewer
= code reviewer
+ requirements verifier
+ architecture verifier
+ test substitute
+ quality gate
```

It should instead be:

```text
Reviewer
= evidence-aware reasoning layer
+ semantic review
+ gap detection
+ repair recommendation
```

with the actual release decision determined by a **Quality Gate Engine** consuming deterministic evidence.

And there's an especially important dependency emerging across the cases:

> **Cases 8, 9, and 10 cannot be fixed independently.**

Tester needs structured `FailureReport`.

Debugger needs structured `FailureReport`.

Reviewer needs structured test/build/security evidence.

# Case 11: Security Auditor

This is the next one, and this prompt is interesting because it is **much more disciplined than Reviewer** in some ways. It has explicit anti-hallucination rules, concrete vulnerability formatting, severity levels, and check categories.

But once we actually execute it against a realistic generated application, some serious problems appear.

Current `Security.ts` confirms that the agent:

- receives all source files
- has **no tools**
- must output a Markdown security report
- has `CRITICAL / HIGH / MEDIUM / LOW`
- defines status thresholds
- explicitly forbids invented vulnerabilities
- explicitly forbids theoretical dependency vulnerabilities
- has a single `{ content: string }` schema
- has an empty `getContext()`.

---

# 11A. Test Project

Same Expense Tracker from Cases 1–10.

Relevant security requirements:

```text
SEC-001
Users must authenticate before accessing protected resources.

SEC-002
Users may only access their own expenses.

SEC-003
Passwords must never be stored in plaintext.

SEC-004
JWT authentication must be validated server-side.

SEC-005
User-controlled input must be validated.

SEC-006
Database queries must not permit injection.

SEC-007
Sensitive credentials must not be committed into source code.
```

Generated code contains these defects.

### Defect A: Cross-user data access

```ts
const expenses = await prisma.expense.findMany({
  where: {
    categoryId,
  },
});
```

No authenticated `userId` ownership constraint.

### Defect B: Weak JWT verification

```ts
const payload = jwt.decode(token);
return payload;
```

The token is decoded but not cryptographically verified.

### Defect C: Password handling

```ts
await prisma.user.create({
  data: {
    email,
    password,
  },
});
```

Password is stored directly.

### Defect D: SQL injection

Suppose a raw query exists:

```ts
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM expenses WHERE category = '${category}'`,
);
```

### Defect E: Secret

```ts
const JWT_SECRET = "expense-super-secret-123";
```

### Defect F: Dependency vulnerability

Assume `package.json` contains an old vulnerable package.

The Security prompt explicitly tells the agent **not** to report theoretical dependency vulnerabilities it hasn't seen in actual code.

---

# 11B. Simulated Security Agent Output

Following the current prompt literally, the Security agent should produce something like:

```text
### Overall Status

CRITICAL

### Security Score

15

### Vulnerabilities Found

**CRITICAL: Hardcoded JWT Secret**
- File: src/lib/auth.ts
- Line: Line 4
- Description: A JWT signing secret is hardcoded directly in source code.
- Attack Scenario: Anyone with access to the source can obtain the signing secret and potentially forge authentication tokens.
- Recommendation: Load the secret from a protected environment variable and rotate the exposed credential.

**CRITICAL: Plaintext Password Storage**
- File: src/app/api/auth/register/route.ts
- Line: Line 18
- Description: User passwords are stored directly without password hashing.
- Attack Scenario: A database compromise would expose users' plaintext passwords.
- Recommendation: Hash passwords using a strong password hashing algorithm such as Argon2id or bcrypt before persistence.

**CRITICAL: Unsafe Raw SQL Query**
- File: src/lib/services/expense.service.ts
- Line: Lines 42-44
- Description: User-controlled category input is interpolated into a raw SQL query.
- Attack Scenario: An attacker can manipulate the category parameter to alter the SQL query and access or modify unauthorized data.
- Recommendation: Use parameterized queries or Prisma's parameterized query APIs.

**HIGH: JWT Token Not Cryptographically Verified**
- File: src/lib/auth.ts
- Line: Line 21
- Description: JWT payload is decoded without verifying the token signature.
- Attack Scenario: An attacker can construct or modify a token and potentially impersonate another user.
- Recommendation: Verify the JWT signature and validate algorithm, expiration, issuer, and audience before trusting its claims.

**HIGH: Missing Expense Ownership Enforcement**
- File: src/lib/services/expense.service.ts
- Line: Lines 12-17
- Description: Expense queries do not constrain results to the authenticated user's expenses.
- Attack Scenario: An authenticated attacker can request another user's expenses by manipulating query parameters.
- Recommendation: Enforce authenticated user ownership at the service/repository layer for every expense read and mutation.

### Security Checks Performed

- **Authentication**: FAIL — JWT tokens are decoded without cryptographic signature verification.
- **Input Validation**: FAIL — User-controlled category input reaches an unsafe raw SQL query.
- **Data Protection**: FAIL — Passwords are stored without hashing.
- **Secret Management**: FAIL — JWT secret is hardcoded in source code.
- **API Security**: FAIL — Protected resource access does not consistently enforce user ownership.
- **Dependency Security**: NOT_APPLICABLE — Dependency vulnerabilities cannot be assessed from the provided source files.

### Recommendations

- Remove hardcoded secrets and rotate exposed credentials.
- Hash passwords before storage.
- Replace unsafe raw SQL construction with parameterized queries.
- Enforce authorization and ownership checks at the service layer.
- Implement complete JWT signature and claim validation.

```

For the obvious defects, that's a **good audit**.

Now we attack it.

---

# 11C. First Major Problem: “All Source Code” Is Not Enough

The prompt says:

> “You receive all source code files from a project.”

Security cannot be meaningfully audited from source code alone.

A real security review needs additional evidence such as:

```text
package.json
lockfile
environment configuration
deployment configuration
HTTP configuration
middleware
database schema
authentication configuration
CI/CD configuration
security headers
runtime configuration
infrastructure configuration
```

And sometimes:

```text
dependency scanner results
SAST results
DAST results
container scan
secret scan
runtime logs
```

The prompt explicitly says not to report dependency issues unless the vulnerability is actually seen in provided code.

That's anti-hallucination.

But it creates another problem:

### It makes the Security agent blind to entire vulnerability classes.

If:

```text
package.json
```

isn't included, the agent cannot assess dependency exposure.

If deployment config isn't included, it cannot assess:

```text
CORS
security headers
TLS configuration
cookie configuration
runtime secrets
```

If environment configuration isn't represented, secret management is only partially auditable.

### Severity: **P0**

The input contract needs to be expanded.

---

# 11D. Dependency Security Is Basically Disabled

This line is particularly revealing:

```text
Dependency Security: [PASS / FAIL / NOT_APPLICABLE]
```

The prompt says to use `NOT_APPLICABLE` if it doesn't apply.

And then explicitly says:

> “Do NOT report theoretical vulnerabilities in dependencies you haven't seen.”

That's sensible.

But there is no dependency scanner.

So the agent can easily output:

```text
Dependency Security: NOT_APPLICABLE
```

for a project containing:

```text
package.json
package-lock.json
```

with known vulnerable packages.

That isn't security auditing.

That's the LLM politely refusing to look.

### Correct architecture

```text
package.json
      ↓
lockfile
      ↓
Dependency Scanner
      ↓
Known vulnerability database
      ↓
Deterministic evidence
      ↓
Security Agent
```

The LLM should interpret scanner findings, not replace the scanner.

### Severity: **P0**

---

# 11E. Security Score Is Completely Subjective

The prompt simultaneously asks for:

```text
Overall Status
Security Score
```

and provides loose score bands:

```text
90-100
70-89
40-69
0-39
```

But there is no scoring algorithm.

Our example gave:

```text
15
```

Why 15?

Could another execution give:

```text
32
```

or:

```text
7
```

Both could still be consistent with the prompt.

Worse:

```text
CRITICAL
Security Score: 85
```

could theoretically happen because the model has two independent judgments.

The status and score need to be mathematically linked.

For example:

```text
CRITICAL finding → score <= 39
HIGH finding → score <= 69
MEDIUM finding → score <= 89
No findings → 100
```

Or better, don't use an arbitrary LLM-generated score at all.

Use deterministic scoring:

```text
Critical: -40
High: -20
Medium: -10
Low: -3
```

with defined caps and category rules.

### Severity: **P1**

---

# 11F. “No Vulnerabilities Found” Is Dangerous

The prompt says:

> “If NO vulnerabilities are found, write exactly: No vulnerabilities found. The code passed security review.”

This wording is too strong.

Not finding a vulnerability does **not** establish that the code "passed security review."

It establishes:

> No vulnerabilities were identified within the provided evidence and scope.

Those are very different claims.

Suppose the agent wasn't given:

```text
middleware.ts
```

and therefore doesn't see the auth bypass.

It could still say:

```text
No vulnerabilities found.
The code passed security review.
```

That's a false assurance.

### Better

```text
No vulnerabilities were identified within the reviewed evidence and declared scope.
```

And ideally:

```text
Coverage: 87%
Unverified security areas: deployment headers, dependency vulnerabilities
```

### Severity: **P0**

---

# 11G. Security Scope Is Not Defined

This is another subtle issue.

Suppose the project uses:

```text
Stripe
AWS S3
PostgreSQL
Redis
Clerk
Resend
```

What exactly is the Security agent responsible for?

Is it auditing:

```text
application code
```

only?

Or:

```text
integration configuration
```

Or:

```text
third-party trust boundaries
```

Or:

```text
authorization architecture
```

The prompt doesn't define a security threat model.

It only gives broad categories.

### Severity: **P1**

---

# 11H. No Threat Model

A security auditor should know what assets it is protecting.

For our Expense Tracker:

```text
Assets
 ├── user credentials
 ├── JWT secrets
 ├── expense records
 ├── personal information
 └── database credentials

Trust boundaries
 ├── browser → API
 ├── API → database
 └── application → external services
```

Threats:

```text
authentication bypass
authorization bypass
injection
credential theft
data leakage
session compromise
CSRF
XSS
SSRF
IDOR
rate abuse
```

Current prompt doesn't define this.

So the agent's security coverage depends heavily on what happens to occur to it while reading the source.

That's not a repeatable security system.

### Severity: **P1**

---

# 11I. Major Blind Spot: Business Logic Security

The cross-user expense bug is effectively an **IDOR / authorization failure**.

The prompt may catch it if it sees the code.

But nothing explicitly tells the agent:

> Trace authorization across every protected resource and mutation.

That matters enormously.

Consider:

```text
GET /expenses
GET /expenses/:id
PATCH /expenses/:id
DELETE /expenses/:id
GET /categories
GET /dashboard
```

Checking:

```text
POST /expenses
```

isn't enough.

Every resource boundary needs authorization.

### Better security invariant:

```text
For every user-owned resource:
  read(user, resource)
  requires ownership(resource, user)

  update(user, resource)
  requires ownership(resource, user)

  delete(user, resource)
  requires ownership(resource, user)
```

### Severity: **P0/P1**

For generated applications, I'd classify it as **P0**.

---

# 11J. No Negative Security Testing

This is the biggest connection to Case 8.

Security prompt can identify:

```text
Missing ownership check.
```

But it doesn't actually test:

```text
User A
  ↓
request User B's expense
  ↓
403 expected
```

Nor:

```text
tampered JWT
  ↓
request
  ↓
401 expected
```

Nor:

```text
malicious SQL input
  ↓
API
  ↓
query
```

So it is a **static security review**, not a security verification stage.

The architecture should be:

```text
Security Reasoning
+
Security Tests
+
SAST
+
Dependency Scan
+
Secret Scan
+
DAST
```

Not:

```text
LLM reads source
↓
Security Score: 73
```

Because computers deserve better than horoscopes with numbers.

### Severity: **P0**

---

# 11K. Attack: Secure Code, Insecure Configuration

Suppose application code is perfect:

```text
Authentication ✓
Authorization ✓
SQL ✓
Input validation ✓
Secrets ✓
```

But production config has:

```text
CORS: *
credentials: true
```

or:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

Security agent may never see this.

### Result

Potential false **SECURE**.

### Finding

**P0: Configuration and deployment security are outside the defined input model.**

---

# 11L. Attack: Cookie Security

Suppose JWT is stored in a cookie:

```ts
res.cookies.set("token", jwt);
```

with no:

```text
HttpOnly
Secure
SameSite
```

The prompt doesn't explicitly require session/cookie security.

A good LLM may flag it.

A less thorough execution may not.

Again, no deterministic security checklist exists for this.

### Severity: **P1**

---

# 11M. Attack: CSRF

Suppose authentication uses cookies.

An attacker can potentially induce state-changing requests cross-origin.

The prompt has:

```text
API Security
```

but no explicit CSRF analysis.

It could be missed.

### Severity: **P1**

---

# 11N. Attack: Rate Limiting

Login endpoint:

```text
POST /api/auth/login
```

No rate limiting.

An attacker can brute-force credentials.

Does current prompt require rate-limit analysis?

Not explicitly.

Could flag it.

Could miss it.

### Severity: **P1**

---

# 11O. Attack: SSRF

Suppose generated application has:

```ts
fetch(userProvidedUrl);
```

The prompt doesn't explicitly mention SSRF.

Again, detection relies on the model's general security knowledge rather than a defined threat taxonomy.

### Severity: **P1**

---

# 11P. Attack: Dangerous File Upload

Suppose project has:

```text
POST /api/upload
```

and accepts arbitrary files.

Potential issues:

```text
path traversal
content-type spoofing
stored XSS
malicious file execution
unbounded upload
```

Nothing in the prompt guarantees these are systematically checked.

### Severity: **P1**

---

# 11Q. Anti-Hallucination Rules Are Actually Good

This deserves credit.

The prompt repeatedly says:

> Don't invent vulnerabilities.

And requires:

```text
specific file
specific line
actual vulnerable pattern
```

That is genuinely good.

Compared with a generic:

> “Analyze this code for security vulnerabilities”

prompt, this is substantially safer.

The problem is that the anti-hallucination mechanism has been implemented mostly as:

```text
Don't say things you can't prove.
```

rather than:

```text
Here is the evidence model you must use to prove things.
```

That's the distinction.

---

# 11R. The Markdown Output Is Another Weak Contract

Schema:

```ts
export const schema = {
  type: "object",
  properties: {
    content: { type: "string" },
  },
  required: ["content"],
};
```

So from the runtime's perspective, all of this:

```text
### Overall Status
...
```

is just:

```text
content: string
```

There is no machine-readable:

```text
status
score
vulnerabilities[]
checks[]
recommendations[]
```

This means downstream agents must parse Markdown.

Which we've already established is one of AutoCoder's recurring architectural sins.

### Severity: **P0/P1**

---

# 11S. Security → Debugger Handoff Is Poor

Suppose Security finds:

```text
CRITICAL: Plaintext Password Storage
```

The current output provides a recommendation:

```text
Hash passwords.
```

But Debugger needs:

```text
requirement
failure
file
symbol
expected behavior
actual behavior
severity
affected tests
repair scope
```

Security's output isn't structured for that.

So again:

```text
Security
 ↓
Markdown
 ↓
parser / LLM interpretation
 ↓
Debugger
```

Instead:

```text
Security
 ↓
SecurityFinding
 ↓
FailureReport
 ↓
Repair Planner / Debugger
```

---

# 11T. Security Should NOT Repair Code

The prompt correctly says:

> “Do NOT modify any source code. This is a read-only audit.”

**Keep this.**

Security should identify and classify.

It should not become:

```text
Security Auditor + Developer
```

That's a good boundary.

---

# 11U. What the Security Agent Should Become

The ideal architecture is:

```text
                   Generated Project
                          │
       ┌──────────────────┼───────────────────┐
       │                  │                   │
       ▼                  ▼                   ▼
   SAST Scanner      Dependency Scan     Secret Scanner
       │                  │                   │
       ▼                  ▼                   ▼
   Static Evidence   CVE Evidence       Secret Evidence
       │                  │                   │
       └──────────────────┼───────────────────┘
                          ▼
                    Security Tests
                          │
                          ▼
                    DAST / API Tests
                          │
                          ▼
                ┌───────────────────┐
                │ Security Auditor  │
                │      LLM          │
                └─────────┬─────────┘
                          ▼
                Structured Findings
                          │
                          ▼
                   Quality Gate
```

The LLM's job:

- reason about complex vulnerabilities
- correlate evidence
- identify business-logic flaws
- detect architectural security violations
- explain attack paths
- prioritize findings
- recommend remediation

The LLM's job should **not** be:

- vulnerability scanner
- dependency database
- secret scanner
- runtime penetration tester
- sole release gate

---

# 11V. Better Security Finding Contract

Something like:

```json
{
  "id": "SEC-001",
  "severity": "CRITICAL",
  "category": "AUTHORIZATION",
  "confidence": "CONFIRMED",
  "blocking": true,

  "file": "src/lib/services/expense.service.ts",
  "symbol": "getExpenses",

  "requirementIds": ["SEC-002"],
  "acceptanceCriteriaIds": ["AC-007"],

  "description": "Expense queries do not enforce ownership.",
  "expected": "Authenticated users can access only their own expenses.",
  "actual": "Query can return expenses belonging to other users.",

  "evidence": [
    {
      "type": "STATIC_ANALYSIS",
      "id": "SAST-023"
    },
    {
      "type": "SECURITY_TEST",
      "id": "SEC-TEST-007",
      "result": "FAILED"
    }
  ],

  "attackScenario": "Authenticated user modifies the expense identifier or filter to access another user's record.",

  "recommendation": "Enforce userId ownership in the service/repository query.",

  "repairScope": ["src/lib/services/expense.service.ts"]
}
```

Now the finding is useful to:

```text
Debugger
Reviewer
Quality Gate
Telemetry
Benchmarking
```

---

# 11W. Final Case 11 Scorecard

| Dimension                | Verdict  |
| ------------------------ | -------- |
| Basic security review    | **PASS** |
| Anti-hallucination       | **GOOD** |
| Vulnerability formatting | **GOOD** |
| Source-level detection   | **GOOD** |
| Business-logic security  | **WEAK** |
| Dependency security      | **FAIL** |
| Runtime security         | **FAIL** |
| Configuration security   | **FAIL** |
| Security testing         | **FAIL** |
| Threat model             | **FAIL** |
| Evidence model           | **FAIL** |
| Machine-readable output  | **FAIL** |
| Debugger handoff         | **WEAK** |
| Objective scoring        | **FAIL** |
| Release gate             | **FAIL** |

## Final classification: **P0**

The irony is that **Security.ts is one of the better-written prompts in isolation**. Its anti-hallucination discipline is genuinely useful.

But architecturally, it's still trying to make one LLM do too much.

The target should be:

```text
Static scanners
+
Dependency intelligence
+
Secret scanning
+
Runtime security tests
+
Threat-model-aware LLM reasoning
+
Deterministic security gate
```

rather than:

```text
LLM reads source
        ↓
"Security Score: 73"
```
