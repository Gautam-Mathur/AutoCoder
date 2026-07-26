# Multi-Agent Compilation Pipeline Diagram

You can view the rendering of this diagram in any Markdown editor supporting Mermaid, or copy the content of [multi_agent_pipeline.mermaid](file:///home/lenovo/Downloads/autocoder-redone-/multi_agent_pipeline.mermaid) into a Mermaid Live Editor.

```mermaid
graph TB
    %% Nodes and Styles
    classDef llm fill:#E8EAF6,stroke:#3F51B5,stroke-width:2px;
    classDef deterministic fill:#FFFDE7,stroke:#FBC02D,stroke-width:2px;
    classDef event fill:#FFEBEE,stroke:#E53935,stroke-width:2px;
    classDef data fill:#E0F2F1,stroke:#00897B,stroke-width:2px;
    classDef default fill:#FFFFFF,stroke:#333,stroke-width:1px;

    User([USER PROMPT<br>Natural Language Request])
    
    subgraph "1. QUEEN ORCHESTRATOR"
        Queen["Queen Orchestrator<br>• Intent Understanding<br>• Scope & Goals<br>• Constraints<br>• Risks<br>• Assumptions"]
    end
    class Queen llm;

    Ledger[("EXECUTIVE MEMORY (LEDGER)<br>• Immutable Canonical Artifacts<br>• Versioned Stage Outputs<br>• Ownership Enforcement<br>• Audit Logs & Metadata")]
    class Ledger data;

    subgraph "2. PLANNER"
        Planner["Planner<br>• Requirements & Features<br>• Acceptance Criteria<br>• Tech Stack<br>• Engineering Constraints<br>• Non-Functional Requirements<br>• Project Characteristics"]
    end
    class Planner llm;

    Resolver["CONTEXT RESOLVER (Dependency Injection Layer)<br>Resolves & assembles minimal, relevant context.<br>• Query Resolution  • Reference Mapping  • Context Assembly  • Minimal Context Pack"]
    class Resolver deterministic;

    subgraph "Architects (Parallel Processing)"
        SysArch["3. SYSTEMS ARCHITECT<br>• Domains & Modules<br>• System Topology<br>• Layering<br>• Data Flow<br>• Architectural Constraints"]
        BackArch["4. BACKEND ARCHITECT<br>• APIs & Endpoints<br>• Services<br>• Database Schema<br>• Entities<br>• Auth Flow<br>• Backend Structure"]
        UIUXArch["5. UI/UX ARCHITECT<br>• Navigation & Pages<br>• Components<br>• State Architecture<br>• Design System<br>• Frontend Structure"]
    end
    class SysArch,BackArch,UIUXArch llm;

    subgraph "Deterministic Services"
        Blueprint["6. BLUEPRINT ENGINE<br>Converts contracts into blueprint:<br>• File/Import/Dependency Graphs<br>• Symbol Table<br>• Build Order & File Contracts<br>• Generation Plan"]
    end
    class Blueprint deterministic;

    subgraph "7. CODE SYNTHESIZER"
        Coder["Code Synthesizer<br>Generates source code file-by-file<br>from the blueprint."]
    end
    class Coder llm;

    subgraph "DETERMINISTIC VALIDATION PIPELINE (No LLM)"
        BuildRun["Build Runner<br>(Compiles Project)"]
        TypeCheck["Type Checker<br>(TS / Static Validation)"]
        DepCheck["Dependency Checker<br>(Imports/Circular dependencies)"]
        RuntimeExec["Runtime Executor<br>(Starts App / Runs Env)"]
        TestRunner["Test Runner<br>(Executes unit/integration tests)"]
    end
    class BuildRun,TypeCheck,DepCheck,RuntimeExec,TestRunner deterministic;

    EventDispatcher{"Event Dispatcher<br>Analyzes failure types"}
    class EventDispatcher event;

    subgraph "Event-Driven Specialists (On Demand)"
        Debugger["Debugger<br>• Root Cause Analysis<br>• Repair Strategy"]
        Conflict["Conflict Resolver<br>• Spec conflict resolution<br>• Cross-contract alignment"]
        Optimizer["Optimization Refiner<br>• Performance & Bundle<br>• Query & Memory Optimization"]
        Refactor["Refactoring Advisor<br>• Code Quality Improvements<br>• Refactoring Plan"]
        DocGen["Doc Generator<br>• Generate/Update Docs"]
        Migration["Migration Assistant<br>• Data/Schema/Version migration"]
    end
    class Debugger,Conflict,Optimizer,Refactor,DocGen,Migration event;

    subgraph "Post-Validation Review"
        QA["8. VERIFICATION AGENT (QA)<br>• Functional Validation<br>• Requirement Coverage<br>• Code Quality & Maintainability"]
        Security["9. SECURITY AUDITOR<br>• Vulnerability & Secrets Scan<br>• OWASP Top 10<br>• Dependency Risks"]
    end
    class QA,Security llm;

    Report(["FINAL PIPELINE REPORT<br>• Functional Confidence<br>• Security Confidence<br>• Quality Score<br>• All Artifacts & Files"])
    class Report data;

    %% Relationships
    User --> Queen
    Queen -->|Queen Output| Ledger
    Ledger <--> Planner
    Planner -->|Planner Output| Resolver
    Resolver --> SysArch & BackArch & UIUXArch
    Resolver --> Blueprint

    SysArch -->|Architecture Contract| Ledger
    BackArch -->|Backend Contract| Ledger
    UIUXArch -->|UI/UX Contract| Ledger
    Blueprint -->|Blueprint Manifest| Ledger

    Ledger --> Coder
    Coder -->|Generated Source Code| BuildRun
    
    BuildRun --> TypeCheck
    TypeCheck --> DepCheck
    DepCheck --> RuntimeExec
    RuntimeExec --> TestRunner

    TestRunner -->|Failures Detected| EventDispatcher
    EventDispatcher --> Debugger & Conflict & Optimizer & Refactor & DocGen & Migration
    Debugger & Conflict & Optimizer & Refactor & DocGen & Migration -.->|Surgical Repairs| Ledger

    TestRunner -->|All Checks Passed| QA & Security
    QA & Security --> Report
```
