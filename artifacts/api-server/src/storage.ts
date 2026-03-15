import {
  type Conversation, type Message, type InsertConversation, type InsertMessage,
  type ProjectFile, type InsertProjectFile,
  type ProjectPlan, type InsertProjectPlan,
  type IntelRecord, type InsertIntelRecord,
  type TestResult, type InsertTestResult,
  type SecurityScan, type InsertSecurityScan,
  type GenerationLog, type InsertGenerationLog,
  type VaptAsset, type InsertVaptAsset,
  type VaptVulnerability, type InsertVaptVulnerability,
  type VaptScan, type InsertVaptScan,
  type VaptSchedule, type InsertVaptSchedule,
  type VaptAuditLog, type InsertVaptAuditLog,
  type VaptTeamMember, type InsertVaptTeamMember,
  conversations, messages, projectFiles, projectPlans, intelRecords, testResults, securityScans, generationLogs,
  vaptAssets, vaptVulnerabilities, vaptScans, vaptSchedules, vaptAuditLogs, vaptTeamMembers
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

export interface ProjectContext {
  projectName?: string | null;
  projectDescription?: string | null;
  techStack?: string[] | null;
  featuresBuilt?: string[] | null;
  projectSummary?: string | null;
  lastCodeGenerated?: string | null;
  projectType?: string | null;
  complexity?: string | null;
  designStyle?: string | null;
  colorPreferences?: string[] | null;
  planGenerated?: boolean | null;
  securityScore?: number | null;
  testsPassed?: number | null;
  testsFailed?: number | null;
  conversationPhase?: string | null;
  projectPlanData?: any;
  understandingData?: any;
}

export interface IStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  updateProjectContext(id: number, context: ProjectContext): Promise<Conversation | undefined>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string, thinkingSteps?: any[]): Promise<Message>;

  // Project files
  getProjectFiles(conversationId: number): Promise<ProjectFile[]>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, content: string): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<void>;
  deleteProjectFilesByConversation(conversationId: number): Promise<void>;
  upsertProjectFile(conversationId: number, path: string, content: string, language: string): Promise<ProjectFile>;

  // Project plans
  getProjectPlan(conversationId: number): Promise<ProjectPlan | undefined>;
  createProjectPlan(plan: InsertProjectPlan): Promise<ProjectPlan>;

  // Intel records
  getIntelRecords(conversationId: number): Promise<IntelRecord[]>;
  createIntelRecord(record: InsertIntelRecord): Promise<IntelRecord>;
  upsertIntelRecord(conversationId: number, key: string, category: string, value: string, type: string): Promise<IntelRecord>;

  // Test results
  getTestResults(conversationId: number): Promise<TestResult[]>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;

  // Security scans
  getSecurityScans(conversationId: number): Promise<SecurityScan[]>;
  createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan>;
  getLatestSecurityScan(conversationId: number): Promise<SecurityScan | undefined>;

  // Generation logs
  getGenerationLogs(conversationId: number): Promise<GenerationLog[]>;
  createGenerationLog(log: InsertGenerationLog): Promise<GenerationLog>;

  // VAPT Methods
  getVaptAssets(): Promise<VaptAsset[]>;
  createVaptAsset(asset: InsertVaptAsset): Promise<VaptAsset>;
  updateVaptAsset(id: number, asset: Partial<InsertVaptAsset>): Promise<VaptAsset>;
  deleteVaptAsset(id: number): Promise<void>;

  getVaptVulnerabilities(): Promise<VaptVulnerability[]>;
  createVaptVulnerability(vuln: InsertVaptVulnerability): Promise<VaptVulnerability>;
  updateVaptVulnerability(id: number, vuln: Partial<InsertVaptVulnerability>): Promise<VaptVulnerability>;
  deleteVaptVulnerability(id: number): Promise<void>;

  getVaptScans(): Promise<VaptScan[]>;
  createVaptScan(scan: InsertVaptScan): Promise<VaptScan>;
  runVaptScan(id: number): Promise<VaptScan>;

  getVaptSchedules(): Promise<VaptSchedule[]>;
  createVaptSchedule(schedule: InsertVaptSchedule): Promise<VaptSchedule>;

  getVaptTeamMembers(): Promise<VaptTeamMember[]>;
  createVaptTeamMember(member: InsertVaptTeamMember): Promise<VaptTeamMember>;

  getVaptAuditLogs(): Promise<VaptAuditLog[]>;
  createVaptAuditLog(log: InsertVaptAuditLog): Promise<VaptAuditLog>;

  getVaptDashboardStats(): Promise<any>;
  seedVaptDemoData(): Promise<void>;
}

// In-memory storage for running without a database
export class MemStorage implements IStorage {
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message[]> = new Map();
  private files: Map<number, ProjectFile[]> = new Map();
  private plans: Map<number, ProjectPlan> = new Map();
  private intel: Map<number, IntelRecord[]> = new Map();
  private tests: Map<number, TestResult[]> = new Map();
  private scans: Map<number, SecurityScan[]> = new Map();
  private logs: Map<number, GenerationLog[]> = new Map();
  private nextId = 1;

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) =>
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createConversation(title: string): Promise<Conversation> {
    const id = this.nextId++;
    const conversation: Conversation = {
      id, title, createdAt: new Date(),
      projectName: null, projectDescription: null, techStack: null, featuresBuilt: null,
      projectSummary: null, lastCodeGenerated: null, projectType: null, complexity: null,
      designStyle: null, colorPreferences: null, planGenerated: null, securityScore: null,
      testsPassed: null, testsFailed: null,
      conversationPhase: 'initial', projectPlanData: null, understandingData: null
    };
    this.conversations.set(id, conversation);
    this.messages.set(id, []);
    return conversation;
  }

  async updateProjectContext(id: number, context: ProjectContext): Promise<Conversation | undefined> {
    const conv = this.conversations.get(id);
    if (conv) {
      const updated = { ...conv, ...context };
      this.conversations.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteConversation(id: number): Promise<void> {
    this.conversations.delete(id);
    this.messages.delete(id);
    this.files.delete(id);
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return this.messages.get(conversationId) || [];
  }

  async createMessage(conversationId: number, role: string, content: string, thinkingSteps?: any[]): Promise<Message> {
    const id = this.nextId++;
    const message: Message = { id, conversationId, role, content, thinkingSteps: thinkingSteps || null, createdAt: new Date() };
    const msgs = this.messages.get(conversationId) || [];
    msgs.push(message);
    this.messages.set(conversationId, msgs);
    return message;
  }

  async getProjectFiles(conversationId: number): Promise<ProjectFile[]> {
    return this.files.get(conversationId) || [];
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    for (const files of Array.from(this.files.values())) {
      const file = files.find((f: ProjectFile) => f.id === id);
      if (file) return file;
    }
    return undefined;
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const id = this.nextId++;
    const projectFile: ProjectFile = {
      id,
      conversationId: file.conversationId,
      path: file.path,
      content: file.content,
      language: file.language,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const files = this.files.get(file.conversationId) || [];
    files.push(projectFile);
    this.files.set(file.conversationId, files);
    return projectFile;
  }

  async updateProjectFile(id: number, content: string): Promise<ProjectFile | undefined> {
    for (const [convId, files] of Array.from(this.files.entries())) {
      const idx = files.findIndex((f: ProjectFile) => f.id === id);
      if (idx >= 0) {
        files[idx] = { ...files[idx], content, updatedAt: new Date() };
        return files[idx];
      }
    }
    return undefined;
  }

  async deleteProjectFile(id: number): Promise<void> {
    for (const [convId, files] of Array.from(this.files.entries())) {
      const idx = files.findIndex((f: ProjectFile) => f.id === id);
      if (idx >= 0) {
        files.splice(idx, 1);
        return;
      }
    }
  }

  async deleteProjectFilesByConversation(conversationId: number): Promise<void> {
    this.files.set(conversationId, []);
  }

  async upsertProjectFile(conversationId: number, path: string, content: string, language: string): Promise<ProjectFile> {
    const files = this.files.get(conversationId) || [];
    const existing = files.find(f => f.path === path);
    if (existing) {
      existing.content = content;
      existing.updatedAt = new Date();
      return existing;
    }
    return this.createProjectFile({ conversationId, path, content, language });
  }

  async getProjectPlan(conversationId: number): Promise<ProjectPlan | undefined> {
    return this.plans.get(conversationId);
  }

  async createProjectPlan(plan: InsertProjectPlan): Promise<ProjectPlan> {
    const id = this.nextId++;
    const projectPlan: ProjectPlan = {
      id,
      conversationId: plan.conversationId,
      summary: plan.summary,
      techStack: (plan.techStack || null) as ProjectPlan['techStack'],
      architecture: plan.architecture || null,
      folderStructure: plan.folderStructure || null,
      designDecisions: (plan.designDecisions || null) as ProjectPlan['designDecisions'],
      securityConsiderations: plan.securityConsiderations || null,
      createdAt: new Date()
    };
    this.plans.set(plan.conversationId, projectPlan);
    return projectPlan;
  }

  async getIntelRecords(conversationId: number): Promise<IntelRecord[]> {
    return this.intel.get(conversationId) || [];
  }

  async createIntelRecord(record: InsertIntelRecord): Promise<IntelRecord> {
    const id = this.nextId++;
    const intelRecord: IntelRecord = {
      id,
      conversationId: record.conversationId,
      key: record.key,
      value: record.value,
      category: record.category,
      type: record.type,
      confidence: record.confidence ?? 100,
      source: record.source ?? 'inferred',
      usageCount: 1,
      createdAt: new Date()
    };
    const records = this.intel.get(record.conversationId) || [];
    records.push(intelRecord);
    this.intel.set(record.conversationId, records);
    return intelRecord;
  }

  async upsertIntelRecord(conversationId: number, key: string, category: string, value: string, type: string): Promise<IntelRecord> {
    const records = this.intel.get(conversationId) || [];
    const existing = records.find(r => r.key === key && r.category === category);
    if (existing) {
      existing.value = value;
      existing.usageCount = (existing.usageCount || 0) + 1;
      return existing;
    }
    return this.createIntelRecord({ conversationId, key, value, category, type });
  }

  async getTestResults(conversationId: number): Promise<TestResult[]> {
    return this.tests.get(conversationId) || [];
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const id = this.nextId++;
    const testResult: TestResult = {
      id,
      conversationId: result.conversationId,
      targetFile: result.targetFile,
      passed: result.passed ?? 0,
      failed: result.failed ?? 0,
      skipped: result.skipped ?? 0,
      coverage: result.coverage ?? null,
      details: (result.details || null) as TestResult['details'],
      createdAt: new Date()
    };
    const results = this.tests.get(result.conversationId) || [];
    results.push(testResult);
    this.tests.set(result.conversationId, results);
    return testResult;
  }

  async getSecurityScans(conversationId: number): Promise<SecurityScan[]> {
    return this.scans.get(conversationId) || [];
  }

  async createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan> {
    const id = this.nextId++;
    const securityScan: SecurityScan = {
      id,
      conversationId: scan.conversationId,
      score: scan.score,
      grade: scan.grade,
      issues: (scan.issues || null) as SecurityScan['issues'],
      passedChecks: scan.passedChecks || null,
      createdAt: new Date()
    };
    const scans = this.scans.get(scan.conversationId) || [];
    scans.push(securityScan);
    this.scans.set(scan.conversationId, scans);
    return securityScan;
  }

  async getLatestSecurityScan(conversationId: number): Promise<SecurityScan | undefined> {
    const scans = this.scans.get(conversationId) || [];
    return scans[scans.length - 1];
  }

  async getGenerationLogs(conversationId: number): Promise<GenerationLog[]> {
    return this.logs.get(conversationId) || [];
  }

  async createGenerationLog(log: InsertGenerationLog): Promise<GenerationLog> {
    const id = this.nextId++;
    const generationLog: GenerationLog = {
      id,
      conversationId: log.conversationId,
      action: log.action,
      targetFile: log.targetFile,
      description: log.description,
      linesChanged: log.linesChanged ?? 0,
      reasoning: log.reasoning || null,
      assumptions: log.assumptions || null,
      createdAt: new Date()
    };
    const logs = this.logs.get(log.conversationId) || [];
    logs.push(generationLog);
    this.logs.set(log.conversationId, logs);
    return generationLog;
  }

  // VAPT Methods - In-memory stubs
  private vaptAssets: VaptAsset[] = [];
  private vaptVulns: VaptVulnerability[] = [];
  private vaptScansData: VaptScan[] = [];
  private vaptSchedulesData: VaptSchedule[] = [];
  private vaptTeam: VaptTeamMember[] = [];
  private vaptAuditLogsData: VaptAuditLog[] = [];

  async getVaptAssets(): Promise<VaptAsset[]> { return this.vaptAssets; }
  async createVaptAsset(asset: InsertVaptAsset): Promise<VaptAsset> {
    const id = this.nextId++;
    const newAsset: VaptAsset = { id, ...asset, createdAt: new Date(), updatedAt: new Date(), status: asset.status || 'active', tags: asset.tags || null };
    this.vaptAssets.push(newAsset);
    return newAsset;
  }
  async updateVaptAsset(id: number, asset: Partial<InsertVaptAsset>): Promise<VaptAsset> {
    const idx = this.vaptAssets.findIndex(a => a.id === id);
    if (idx >= 0) Object.assign(this.vaptAssets[idx], asset, { updatedAt: new Date() });
    return this.vaptAssets[idx];
  }
  async deleteVaptAsset(id: number): Promise<void> {
    this.vaptAssets = this.vaptAssets.filter(a => a.id !== id);
  }
  async getVaptVulnerabilities(): Promise<VaptVulnerability[]> { return this.vaptVulns; }
  async createVaptVulnerability(vuln: InsertVaptVulnerability): Promise<VaptVulnerability> {
    const id = this.nextId++;
    const newVuln: VaptVulnerability = { id, ...vuln, createdAt: new Date(), status: vuln.status || 'open', assetId: vuln.assetId || null, cveId: vuln.cveId || null, cvssScore: vuln.cvssScore || null, component: vuln.component || null, owaspCategory: vuln.owaspCategory || null, assignedTo: vuln.assignedTo || null, deadline: vuln.deadline || null, remediation: vuln.remediation || null, evidence: vuln.evidence || null, scanId: vuln.scanId || null, resolvedAt: vuln.resolvedAt || null };
    this.vaptVulns.push(newVuln);
    return newVuln;
  }
  async updateVaptVulnerability(id: number, vuln: Partial<InsertVaptVulnerability>): Promise<VaptVulnerability> {
    const idx = this.vaptVulns.findIndex(v => v.id === id);
    if (idx >= 0) Object.assign(this.vaptVulns[idx], vuln);
    return this.vaptVulns[idx];
  }
  async deleteVaptVulnerability(id: number): Promise<void> {
    this.vaptVulns = this.vaptVulns.filter(v => v.id !== id);
  }
  async getVaptScans(): Promise<VaptScan[]> { return this.vaptScansData; }
  async createVaptScan(scan: InsertVaptScan): Promise<VaptScan> {
    const id = this.nextId++;
    const newScan: VaptScan = { id, ...scan, createdAt: new Date(), status: 'pending', progress: 0, assetId: scan.assetId || null, startedAt: null, completedAt: null, findingsCount: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 };
    this.vaptScansData.push(newScan);
    return newScan;
  }
  async runVaptScan(id: number): Promise<VaptScan> {
    const idx = this.vaptScansData.findIndex(s => s.id === id);
    if (idx >= 0) Object.assign(this.vaptScansData[idx], { status: 'completed', progress: 100, completedAt: new Date() });
    return this.vaptScansData[idx];
  }
  async getVaptSchedules(): Promise<VaptSchedule[]> { return this.vaptSchedulesData; }
  async createVaptSchedule(schedule: InsertVaptSchedule): Promise<VaptSchedule> {
    const id = this.nextId++;
    const newSchedule: VaptSchedule = { id, ...schedule, createdAt: new Date(), enabled: schedule.enabled ?? true, assetId: schedule.assetId || null, lastRun: null, nextRun: null };
    this.vaptSchedulesData.push(newSchedule);
    return newSchedule;
  }
  async getVaptTeamMembers(): Promise<VaptTeamMember[]> { return this.vaptTeam; }
  async createVaptTeamMember(member: InsertVaptTeamMember): Promise<VaptTeamMember> {
    const id = this.nextId++;
    const newMember: VaptTeamMember = { id, ...member, createdAt: new Date(), avatar: member.avatar || null };
    this.vaptTeam.push(newMember);
    return newMember;
  }
  async getVaptAuditLogs(): Promise<VaptAuditLog[]> { return this.vaptAuditLogsData; }
  async createVaptAuditLog(log: InsertVaptAuditLog): Promise<VaptAuditLog> {
    const id = this.nextId++;
    const newLog: VaptAuditLog = { id, ...log, createdAt: new Date(), userId: log.userId || null, entityId: log.entityId || null, details: log.details || null, ipAddress: log.ipAddress || null };
    this.vaptAuditLogsData.push(newLog);
    return newLog;
  }
  async getVaptDashboardStats(): Promise<any> {
    return { totalAssets: this.vaptAssets.length, totalVulnerabilities: this.vaptVulns.length, totalScans: this.vaptScansData.length, openVulnerabilities: this.vaptVulns.filter(v => v.status === 'open').length, resolvedVulnerabilities: this.vaptVulns.filter(v => v.status === 'resolved').length, severityCounts: { critical: 0, high: 0, medium: 0, low: 0 }, statusCounts: { open: 0, in_progress: 0, resolved: 0, verified: 0 }, owaspCounts: {}, riskScore: 85, recentScans: [], criticalAssets: 0 };
  }
  async seedVaptDemoData(): Promise<void> { /* No-op for memory storage */ }
}

export class DatabaseStorage implements IStorage {
  private db: any;

  constructor() {
    // Lazy load db to avoid errors when DATABASE_URL is not set
    import("@workspace/db").then(module => {
      this.db = module.db;
    });
  }

  private async getDb() {
    if (!this.db) {
      const module = await import("@workspace/db");
      this.db = module.db;
    }
    return this.db;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const db = await this.getDb();
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getAllConversations(): Promise<Conversation[]> {
    const db = await this.getDb();
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async createConversation(title: string): Promise<Conversation> {
    const db = await this.getDb();
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  }

  async updateProjectContext(id: number, context: ProjectContext): Promise<Conversation | undefined> {
    const db = await this.getDb();
    const [updated] = await db.update(conversations)
      .set(context)
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    const db = await this.getDb();
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const db = await this.getDb();
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(conversationId: number, role: string, content: string, thinkingSteps?: any[]): Promise<Message> {
    const db = await this.getDb();
    const [message] = await db.insert(messages)
      .values({ conversationId, role, content, thinkingSteps: thinkingSteps || null })
      .returning();
    return message;
  }

  async getProjectFiles(conversationId: number): Promise<ProjectFile[]> {
    const db = await this.getDb();
    return await db.select().from(projectFiles)
      .where(eq(projectFiles.conversationId, conversationId))
      .orderBy(projectFiles.path);
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const db = await this.getDb();
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file;
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const db = await this.getDb();
    const [projectFile] = await db.insert(projectFiles).values(file).returning();
    return projectFile;
  }

  async updateProjectFile(id: number, content: string): Promise<ProjectFile | undefined> {
    const db = await this.getDb();
    const [updated] = await db.update(projectFiles)
      .set({ content, updatedAt: new Date() })
      .where(eq(projectFiles.id, id))
      .returning();
    return updated;
  }

  async deleteProjectFile(id: number): Promise<void> {
    const db = await this.getDb();
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  async deleteProjectFilesByConversation(conversationId: number): Promise<void> {
    const db = await this.getDb();
    await db.delete(projectFiles).where(eq(projectFiles.conversationId, conversationId));
  }

  async upsertProjectFile(conversationId: number, path: string, content: string, language: string): Promise<ProjectFile> {
    const db = await this.getDb();
    const existing = await db.select().from(projectFiles)
      .where(and(eq(projectFiles.conversationId, conversationId), eq(projectFiles.path, path)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(projectFiles)
        .set({ content, updatedAt: new Date() })
        .where(eq(projectFiles.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(projectFiles)
        .values({ conversationId, path, content, language })
        .returning();
      return created;
    }
  }

  // Project plans
  async getProjectPlan(conversationId: number): Promise<ProjectPlan | undefined> {
    const db = await this.getDb();
    const [plan] = await db.select().from(projectPlans)
      .where(eq(projectPlans.conversationId, conversationId))
      .orderBy(desc(projectPlans.createdAt))
      .limit(1);
    return plan;
  }

  async createProjectPlan(plan: InsertProjectPlan): Promise<ProjectPlan> {
    const db = await this.getDb();
    const [created] = await db.insert(projectPlans).values(plan).returning();
    return created;
  }

  // Intel records
  async getIntelRecords(conversationId: number): Promise<IntelRecord[]> {
    const db = await this.getDb();
    return await db.select().from(intelRecords)
      .where(eq(intelRecords.conversationId, conversationId))
      .orderBy(desc(intelRecords.createdAt));
  }

  async createIntelRecord(record: InsertIntelRecord): Promise<IntelRecord> {
    const db = await this.getDb();
    const [created] = await db.insert(intelRecords).values(record).returning();
    return created;
  }

  async upsertIntelRecord(conversationId: number, key: string, category: string, value: string, type: string): Promise<IntelRecord> {
    const db = await this.getDb();
    const existing = await db.select().from(intelRecords)
      .where(and(
        eq(intelRecords.conversationId, conversationId),
        eq(intelRecords.key, key),
        eq(intelRecords.category, category)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(intelRecords)
        .set({ value, usageCount: (existing[0].usageCount || 0) + 1 })
        .where(eq(intelRecords.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(intelRecords)
        .values({ conversationId, key, category, value, type })
        .returning();
      return created;
    }
  }

  // Test results
  async getTestResults(conversationId: number): Promise<TestResult[]> {
    const db = await this.getDb();
    return await db.select().from(testResults)
      .where(eq(testResults.conversationId, conversationId))
      .orderBy(desc(testResults.createdAt));
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const db = await this.getDb();
    const [created] = await db.insert(testResults).values(result).returning();
    return created;
  }

  // Security scans
  async getSecurityScans(conversationId: number): Promise<SecurityScan[]> {
    const db = await this.getDb();
    return await db.select().from(securityScans)
      .where(eq(securityScans.conversationId, conversationId))
      .orderBy(desc(securityScans.createdAt));
  }

  async createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan> {
    const db = await this.getDb();
    const [created] = await db.insert(securityScans).values(scan).returning();
    return created;
  }

  async getLatestSecurityScan(conversationId: number): Promise<SecurityScan | undefined> {
    const db = await this.getDb();
    const [scan] = await db.select().from(securityScans)
      .where(eq(securityScans.conversationId, conversationId))
      .orderBy(desc(securityScans.createdAt))
      .limit(1);
    return scan;
  }

  // Generation logs
  async getGenerationLogs(conversationId: number): Promise<GenerationLog[]> {
    const db = await this.getDb();
    return await db.select().from(generationLogs)
      .where(eq(generationLogs.conversationId, conversationId))
      .orderBy(desc(generationLogs.createdAt));
  }

  async createGenerationLog(log: InsertGenerationLog): Promise<GenerationLog> {
    const db = await this.getDb();
    const [created] = await db.insert(generationLogs).values(log).returning();
    return created;
  }

  // VAPT Methods
  async getVaptAssets(): Promise<VaptAsset[]> {
    const db = await this.getDb();
    return await db.select().from(vaptAssets).orderBy(desc(vaptAssets.createdAt));
  }

  async createVaptAsset(asset: InsertVaptAsset): Promise<VaptAsset> {
    const db = await this.getDb();
    const [created] = await db.insert(vaptAssets).values(asset).returning();
    await this.createVaptAuditLog({ action: 'create', entityType: 'asset', entityId: created.id, details: `Created asset: ${asset.name}` });
    return created;
  }

  async updateVaptAsset(id: number, asset: Partial<InsertVaptAsset>): Promise<VaptAsset> {
    const db = await this.getDb();
    const [updated] = await db.update(vaptAssets).set({ ...asset, updatedAt: new Date() }).where(eq(vaptAssets.id, id)).returning();
    await this.createVaptAuditLog({ action: 'update', entityType: 'asset', entityId: id, details: `Updated asset` });
    return updated;
  }

  async deleteVaptAsset(id: number): Promise<void> {
    const db = await this.getDb();
    await db.delete(vaptAssets).where(eq(vaptAssets.id, id));
    await this.createVaptAuditLog({ action: 'delete', entityType: 'asset', entityId: id, details: `Deleted asset` });
  }

  async getVaptVulnerabilities(): Promise<VaptVulnerability[]> {
    const db = await this.getDb();
    return await db.select().from(vaptVulnerabilities).orderBy(desc(vaptVulnerabilities.createdAt));
  }

  async createVaptVulnerability(vuln: InsertVaptVulnerability): Promise<VaptVulnerability> {
    const db = await this.getDb();
    const [created] = await db.insert(vaptVulnerabilities).values(vuln).returning();
    await this.createVaptAuditLog({ action: 'create', entityType: 'vulnerability', entityId: created.id, details: `Created vulnerability: ${vuln.title}` });
    return created;
  }

  async updateVaptVulnerability(id: number, vuln: Partial<InsertVaptVulnerability>): Promise<VaptVulnerability> {
    const db = await this.getDb();
    const updateData: any = { ...vuln };
    if (vuln.status === 'resolved' || vuln.status === 'verified') {
      updateData.resolvedAt = new Date();
    }
    const [updated] = await db.update(vaptVulnerabilities).set(updateData).where(eq(vaptVulnerabilities.id, id)).returning();
    await this.createVaptAuditLog({ action: 'update', entityType: 'vulnerability', entityId: id, details: `Updated vulnerability status to ${vuln.status || 'modified'}` });
    return updated;
  }

  async deleteVaptVulnerability(id: number): Promise<void> {
    const db = await this.getDb();
    await db.delete(vaptVulnerabilities).where(eq(vaptVulnerabilities.id, id));
    await this.createVaptAuditLog({ action: 'delete', entityType: 'vulnerability', entityId: id, details: `Deleted vulnerability` });
  }

  async getVaptScans(): Promise<VaptScan[]> {
    const db = await this.getDb();
    return await db.select().from(vaptScans).orderBy(desc(vaptScans.createdAt));
  }

  async createVaptScan(scan: InsertVaptScan): Promise<VaptScan> {
    const db = await this.getDb();
    const [created] = await db.insert(vaptScans).values({ ...scan, status: 'pending' }).returning();
    await this.createVaptAuditLog({ action: 'create', entityType: 'scan', entityId: created.id, details: `Created scan` });
    return created;
  }

  async runVaptScan(id: number): Promise<VaptScan> {
    const db = await this.getDb();
    await db.update(vaptScans).set({ status: 'running', startedAt: new Date(), progress: 0 }).where(eq(vaptScans.id, id));

    const demoVulns = [
      { title: 'SQL Injection', severity: 'critical', cvssScore: '9.8', cveId: 'CVE-2024-1234', component: 'Database Layer', owaspCategory: 'A03:2021 Injection', description: 'Potential SQL injection vulnerability detected in query parameters.', remediation: 'Use parameterized queries and prepared statements.' },
      { title: 'Cross-Site Scripting (XSS)', severity: 'high', cvssScore: '7.5', cveId: 'CVE-2024-2345', component: 'Frontend', owaspCategory: 'A07:2021 XSS', description: 'Reflected XSS vulnerability in user input fields.', remediation: 'Implement input validation and output encoding.' },
      { title: 'Insecure Direct Object Reference', severity: 'high', cvssScore: '7.2', cveId: 'CVE-2024-3456', component: 'API Endpoints', owaspCategory: 'A01:2021 Broken Access Control', description: 'API endpoints expose internal object IDs without proper authorization.', remediation: 'Implement proper access controls and use indirect references.' },
      { title: 'Missing Security Headers', severity: 'medium', cvssScore: '5.3', component: 'Server Configuration', owaspCategory: 'A05:2021 Security Misconfiguration', description: 'X-Frame-Options and Content-Security-Policy headers are missing.', remediation: 'Add security headers to server responses.' },
      { title: 'Outdated Dependencies', severity: 'medium', cvssScore: '5.0', component: 'Package Dependencies', owaspCategory: 'A06:2021 Vulnerable Components', description: 'Several npm packages have known vulnerabilities.', remediation: 'Update dependencies to latest secure versions.' },
      { title: 'Information Disclosure', severity: 'low', cvssScore: '3.1', component: 'Error Handling', description: 'Detailed error messages expose internal system information.', remediation: 'Implement generic error messages for users.' },
    ];

    const [scan] = await db.select().from(vaptScans).where(eq(vaptScans.id, id));
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const vuln of demoVulns) {
      await this.createVaptVulnerability({ ...vuln, assetId: scan.assetId, scanId: id, status: 'open' });
      if (vuln.severity === 'critical') severityCounts.critical++;
      else if (vuln.severity === 'high') severityCounts.high++;
      else if (vuln.severity === 'medium') severityCounts.medium++;
      else severityCounts.low++;
    }

    const [updated] = await db.update(vaptScans).set({
      status: 'completed',
      completedAt: new Date(),
      progress: 100,
      findingsCount: demoVulns.length,
      criticalCount: severityCounts.critical,
      highCount: severityCounts.high,
      mediumCount: severityCounts.medium,
      lowCount: severityCounts.low
    }).where(eq(vaptScans.id, id)).returning();

    await this.createVaptAuditLog({ action: 'run', entityType: 'scan', entityId: id, details: `Completed scan with ${demoVulns.length} findings` });
    return updated;
  }

  async getVaptSchedules(): Promise<VaptSchedule[]> {
    const db = await this.getDb();
    return await db.select().from(vaptSchedules).orderBy(desc(vaptSchedules.createdAt));
  }

  async createVaptSchedule(schedule: InsertVaptSchedule): Promise<VaptSchedule> {
    const db = await this.getDb();
    const [created] = await db.insert(vaptSchedules).values(schedule).returning();
    return created;
  }

  async getVaptTeamMembers(): Promise<VaptTeamMember[]> {
    const db = await this.getDb();
    return await db.select().from(vaptTeamMembers);
  }

  async createVaptTeamMember(member: InsertVaptTeamMember): Promise<VaptTeamMember> {
    const db = await this.getDb();
    const [created] = await db.insert(vaptTeamMembers).values(member).returning();
    return created;
  }

  async getVaptAuditLogs(): Promise<VaptAuditLog[]> {
    const db = await this.getDb();
    return await db.select().from(vaptAuditLogs).orderBy(desc(vaptAuditLogs.createdAt)).limit(100);
  }

  async createVaptAuditLog(log: InsertVaptAuditLog): Promise<VaptAuditLog> {
    const db = await this.getDb();
    const [created] = await db.insert(vaptAuditLogs).values(log).returning();
    return created;
  }

  async getVaptDashboardStats(): Promise<any> {
    const db = await this.getDb();
    const assets = await db.select().from(vaptAssets);
    const vulns = await db.select().from(vaptVulnerabilities);
    const scans = await db.select().from(vaptScans);

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const statusCounts = { open: 0, in_progress: 0, resolved: 0, verified: 0, false_positive: 0 };
    const owaspCounts: Record<string, number> = {};

    vulns.forEach((v: VaptVulnerability) => {
      if (v.severity in severityCounts) severityCounts[v.severity as keyof typeof severityCounts]++;
      if (v.status && v.status in statusCounts) statusCounts[v.status as keyof typeof statusCounts]++;
      if (v.owaspCategory) owaspCounts[v.owaspCategory] = (owaspCounts[v.owaspCategory] || 0) + 1;
    });

    const criticalityScore = assets.reduce((acc: number, a: VaptAsset) => {
      const weights = { critical: 4, high: 3, medium: 2, low: 1 };
      return acc + (weights[a.criticality as keyof typeof weights] || 1);
    }, 0);

    const vulnScore = vulns.filter((v: VaptVulnerability) => v.status === 'open' || v.status === 'in_progress').reduce((acc: number, v: VaptVulnerability) => {
      const weights = { critical: 40, high: 20, medium: 10, low: 5, info: 1 };
      return acc + (weights[v.severity as keyof typeof weights] || 0);
    }, 0);

    const maxScore = assets.length * 4 * 100;
    const riskScore = maxScore > 0 ? Math.min(100, Math.round((vulnScore / Math.max(1, assets.length)) * 10)) : 0;

    return {
      totalAssets: assets.length,
      totalVulnerabilities: vulns.length,
      totalScans: scans.length,
      openVulnerabilities: statusCounts.open + statusCounts.in_progress,
      resolvedVulnerabilities: statusCounts.resolved + statusCounts.verified,
      severityCounts,
      statusCounts,
      owaspCounts,
      riskScore: Math.max(0, 100 - riskScore),
      recentScans: scans.slice(0, 5),
      criticalAssets: assets.filter((a: VaptAsset) => a.criticality === 'critical').length
    };
  }

  async seedVaptDemoData(): Promise<void> {
    const db = await this.getDb();

    const existingTeam = await db.select().from(vaptTeamMembers);
    if (existingTeam.length === 0) {
      await db.insert(vaptTeamMembers).values([
        { name: 'Alex Chen', email: 'alex@example.com', role: 'admin' },
        { name: 'Sarah Miller', email: 'sarah@example.com', role: 'analyst' },
        { name: 'John Doe', email: 'john@example.com', role: 'analyst' },
        { name: 'Emily Davis', email: 'emily@example.com', role: 'viewer' },
      ]);
    }

    const existingAssets = await db.select().from(vaptAssets);
    if (existingAssets.length === 0) {
      const [asset1] = await db.insert(vaptAssets).values({ name: 'Production Web Server', type: 'ip', value: '192.168.1.100', criticality: 'critical', tags: ['production', 'web', 'external'], status: 'active' }).returning();
      const [asset2] = await db.insert(vaptAssets).values({ name: 'API Gateway', type: 'domain', value: 'api.company.com', criticality: 'critical', tags: ['api', 'external', 'production'], status: 'active' }).returning();
      const [asset3] = await db.insert(vaptAssets).values({ name: 'Internal Database', type: 'ip', value: '10.0.0.50', criticality: 'high', tags: ['database', 'internal'], status: 'active' }).returning();
      const [asset4] = await db.insert(vaptAssets).values({ name: 'Corporate Website', type: 'url', value: 'https://www.company.com', criticality: 'medium', tags: ['web', 'public'], status: 'active' }).returning();
      const [asset5] = await db.insert(vaptAssets).values({ name: 'Development Environment', type: 'network_range', value: '192.168.2.0/24', criticality: 'low', tags: ['dev', 'internal'], status: 'active' }).returning();

      const [scan1] = await db.insert(vaptScans).values({ assetId: asset1.id, scanType: 'deep', status: 'completed', progress: 100, startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 82800000), findingsCount: 8, criticalCount: 2, highCount: 3, mediumCount: 2, lowCount: 1 }).returning();

      await db.insert(vaptVulnerabilities).values([
        { assetId: asset1.id, scanId: scan1.id, title: 'Remote Code Execution', severity: 'critical', cvssScore: '9.8', cveId: 'CVE-2024-0001', component: 'Web Framework', owaspCategory: 'A03:2021 Injection', description: 'Critical RCE vulnerability allows attackers to execute arbitrary code.', status: 'open', remediation: 'Update framework to latest version immediately.' },
        { assetId: asset1.id, scanId: scan1.id, title: 'Authentication Bypass', severity: 'critical', cvssScore: '9.1', cveId: 'CVE-2024-0002', component: 'Auth Module', owaspCategory: 'A07:2021 Auth Failures', description: 'Authentication can be bypassed using crafted tokens.', status: 'in_progress', assignedTo: 'Sarah Miller', deadline: new Date(Date.now() + 172800000), remediation: 'Implement proper token validation.' },
        { assetId: asset2.id, title: 'API Rate Limiting Missing', severity: 'high', cvssScore: '7.5', component: 'API Gateway', owaspCategory: 'A04:2021 Insecure Design', description: 'No rate limiting on API endpoints allows DoS attacks.', status: 'open', remediation: 'Implement rate limiting middleware.' },
        { assetId: asset2.id, title: 'Sensitive Data Exposure', severity: 'high', cvssScore: '7.2', cveId: 'CVE-2024-0003', component: 'API Response', owaspCategory: 'A02:2021 Crypto Failures', description: 'API responses include sensitive internal data.', status: 'resolved', resolvedAt: new Date(Date.now() - 43200000), remediation: 'Remove sensitive fields from API responses.' },
        { assetId: asset3.id, title: 'SQL Injection', severity: 'high', cvssScore: '8.6', cveId: 'CVE-2024-0004', component: 'Query Handler', owaspCategory: 'A03:2021 Injection', description: 'Database queries vulnerable to SQL injection.', status: 'open', remediation: 'Use parameterized queries.' },
        { assetId: asset4.id, title: 'Cross-Site Scripting', severity: 'medium', cvssScore: '6.1', component: 'Search Form', owaspCategory: 'A07:2021 XSS', description: 'Reflected XSS in search functionality.', status: 'verified', resolvedAt: new Date(Date.now() - 259200000), remediation: 'Implement input sanitization.' },
        { assetId: asset4.id, title: 'Clickjacking', severity: 'medium', cvssScore: '4.3', component: 'Main Page', owaspCategory: 'A05:2021 Security Misconfiguration', description: 'Missing X-Frame-Options header.', status: 'open', remediation: 'Add X-Frame-Options: DENY header.' },
        { assetId: asset5.id, title: 'Default Credentials', severity: 'low', cvssScore: '3.0', component: 'Dev Servers', description: 'Some development servers use default credentials.', status: 'false_positive', remediation: 'Change default passwords.' },
      ]);

      await db.insert(vaptSchedules).values([
        { assetId: asset1.id, name: 'Weekly Production Scan', cronExpression: '0 2 * * 0', scanType: 'deep', enabled: true, nextRun: new Date(Date.now() + 604800000) },
        { assetId: asset2.id, name: 'Daily API Check', cronExpression: '0 3 * * *', scanType: 'quick', enabled: true, nextRun: new Date(Date.now() + 86400000) },
      ]);
    }
  }
}

// Use in-memory storage if no DATABASE_URL, otherwise use database
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();

console.log(`Storage mode: ${process.env.DATABASE_URL ? 'PostgreSQL Database' : 'In-Memory (no database required)'}`);