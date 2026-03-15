import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  // Project context for persistent memory
  projectName: text("project_name"),
  projectDescription: text("project_description"),
  techStack: text("tech_stack").array(),
  featuresBuilt: text("features_built").array(),
  projectSummary: text("project_summary"),
  lastCodeGenerated: text("last_code_generated"),
  // New fields for enhanced features
  projectType: text("project_type"), // landing, dashboard, webapp, etc.
  complexity: text("complexity"), // simple, moderate, complex
  designStyle: text("design_style"), // minimal, modern, corporate, etc.
  colorPreferences: text("color_preferences").array(),
  planGenerated: boolean("plan_generated").default(false),
  securityScore: integer("security_score"),
  testsPassed: integer("tests_passed"),
  testsFailed: integer("tests_failed"),
  conversationPhase: text("conversation_phase").default("initial"),
  projectPlanData: jsonb("project_plan_data"),
  understandingData: jsonb("understanding_data"),
  editHistory: jsonb("edit_history"),
  diagnostics: jsonb("diagnostics"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  thinkingSteps: jsonb("thinking_steps"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project Plans table for architecture documentation
export const projectPlans = pgTable("project_plans", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  techStack: jsonb("tech_stack").$type<{ category: string; technology: string; justification: string }[]>(),
  architecture: text("architecture"),
  folderStructure: text("folder_structure"),
  designDecisions: jsonb("design_decisions").$type<{ decision: string; rationale: string }[]>(),
  securityConsiderations: text("security_considerations").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Intel Records table for user preferences and learnings
export const intelRecords = pgTable("intel_records", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // preference, decision, pattern, mistake, context
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  confidence: integer("confidence").default(100), // 0-100
  source: text("source").default("inferred"), // explicit, inferred, learned
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Test Results table for tracking test outcomes
export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  targetFile: text("target_file").notNull(),
  passed: integer("passed").default(0),
  failed: integer("failed").default(0),
  skipped: integer("skipped").default(0),
  coverage: integer("coverage"),
  details: jsonb("details").$type<{ testId: string; testName: string; status: string; error?: string }[]>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Security Scans table for tracking vulnerability assessments
export const securityScans = pgTable("security_scans", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  grade: text("grade").notNull(), // A, B, C, D, F
  issues: jsonb("issues").$type<{ severity: string; category: string; title: string; recommendation: string }[]>(),
  passedChecks: text("passed_checks").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Generation Logs table for transparency
export const generationLogs = pgTable("generation_logs", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // create, update, delete
  targetFile: text("target_file").notNull(),
  description: text("description").notNull(),
  linesChanged: integer("lines_changed").default(0),
  reasoning: text("reasoning"),
  assumptions: text("assumptions").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertProjectPlanSchema = createInsertSchema(projectPlans).omit({ id: true, createdAt: true });
export const insertIntelRecordSchema = createInsertSchema(intelRecords).omit({ id: true, createdAt: true });
export const insertTestResultSchema = createInsertSchema(testResults).omit({ id: true, createdAt: true });
export const insertSecurityScanSchema = createInsertSchema(securityScans).omit({ id: true, createdAt: true });
export const insertGenerationLogSchema = createInsertSchema(generationLogs).omit({ id: true, createdAt: true });

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectPlan = typeof projectPlans.$inferSelect;
export type InsertProjectPlan = z.infer<typeof insertProjectPlanSchema>;
export type IntelRecord = typeof intelRecords.$inferSelect;
export type InsertIntelRecord = z.infer<typeof insertIntelRecordSchema>;
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type SecurityScan = typeof securityScans.$inferSelect;
export type InsertSecurityScan = z.infer<typeof insertSecurityScanSchema>;
export type GenerationLog = typeof generationLogs.$inferSelect;
export type InsertGenerationLog = z.infer<typeof insertGenerationLogSchema>;

// VAPT Dashboard Tables
export const vaptAssets = pgTable("vapt_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // ip, domain, url, network_range
  value: text("value").notNull(),
  criticality: text("criticality").notNull(), // low, medium, high, critical
  tags: text("tags").array(),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const vaptVulnerabilities = pgTable("vapt_vulnerabilities", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => vaptAssets.id, { onDelete: "cascade" }),
  cveId: text("cve_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // critical, high, medium, low, info
  cvssScore: text("cvss_score"),
  component: text("component"),
  owaspCategory: text("owasp_category"),
  status: text("status").default("open"), // open, in_progress, resolved, verified, false_positive
  assignedTo: text("assigned_to"),
  deadline: timestamp("deadline"),
  remediation: text("remediation"),
  evidence: text("evidence"),
  scanId: integer("scan_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const vaptScans = pgTable("vapt_scans", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => vaptAssets.id, { onDelete: "cascade" }),
  scanType: text("scan_type").notNull(), // quick, standard, deep, custom
  status: text("status").default("pending"), // pending, running, completed, failed
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  findingsCount: integer("findings_count").default(0),
  criticalCount: integer("critical_count").default(0),
  highCount: integer("high_count").default(0),
  mediumCount: integer("medium_count").default(0),
  lowCount: integer("low_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const vaptSchedules = pgTable("vapt_schedules", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => vaptAssets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  cronExpression: text("cron_expression").notNull(),
  scanType: text("scan_type").notNull(),
  enabled: boolean("enabled").default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const vaptAuditLogs = pgTable("vapt_audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const vaptTeamMembers = pgTable("vapt_team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // admin, analyst, viewer
  avatar: text("avatar"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVaptAssetSchema = createInsertSchema(vaptAssets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVaptVulnerabilitySchema = createInsertSchema(vaptVulnerabilities).omit({ id: true, createdAt: true });
export const insertVaptScanSchema = createInsertSchema(vaptScans).omit({ id: true, createdAt: true });
export const insertVaptScheduleSchema = createInsertSchema(vaptSchedules).omit({ id: true, createdAt: true });
export const insertVaptAuditLogSchema = createInsertSchema(vaptAuditLogs).omit({ id: true, createdAt: true });
export const insertVaptTeamMemberSchema = createInsertSchema(vaptTeamMembers).omit({ id: true, createdAt: true });

export type VaptAsset = typeof vaptAssets.$inferSelect;
export type InsertVaptAsset = z.infer<typeof insertVaptAssetSchema>;
export type VaptVulnerability = typeof vaptVulnerabilities.$inferSelect;
export type InsertVaptVulnerability = z.infer<typeof insertVaptVulnerabilitySchema>;
export type VaptScan = typeof vaptScans.$inferSelect;
export type InsertVaptScan = z.infer<typeof insertVaptScanSchema>;
export type VaptSchedule = typeof vaptSchedules.$inferSelect;
export type InsertVaptSchedule = z.infer<typeof insertVaptScheduleSchema>;
export type VaptAuditLog = typeof vaptAuditLogs.$inferSelect;
export type InsertVaptAuditLog = z.infer<typeof insertVaptAuditLogSchema>;
export type VaptTeamMember = typeof vaptTeamMembers.$inferSelect;
export type InsertVaptTeamMember = z.infer<typeof insertVaptTeamMemberSchema>;

export const generationPatterns = pgTable("generation_patterns", {
  id: serial("id").primaryKey(),
  patternType: text("pattern_type").notNull(),
  domainId: text("domain_id"),
  entityType: text("entity_type"),
  patternKey: text("pattern_key").notNull(),
  patternValue: jsonb("pattern_value").$type<Record<string, any>>().notNull(),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastUsed: timestamp("last_used").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const generationOutcomes = pgTable("generation_outcomes", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  projectDescription: text("project_description").notNull(),
  domainId: text("domain_id"),
  entityCount: integer("entity_count").default(0),
  fileCount: integer("file_count").default(0),
  wasModified: boolean("was_modified").default(false),
  modifications: jsonb("modifications").$type<{ file: string; type: string; description: string }[]>(),
  userSatisfaction: integer("user_satisfaction"),
  errorCount: integer("error_count").default(0),
  autoFixCount: integer("auto_fix_count").default(0),
  generationTimeMs: integer("generation_time_ms"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  preferenceKey: text("preference_key").notNull(),
  preferenceValue: text("preference_value").notNull(),
  category: text("category").notNull(),
  frequency: integer("frequency").default(1),
  lastSeen: timestamp("last_seen").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertGenerationPatternSchema = createInsertSchema(generationPatterns).omit({ id: true, createdAt: true });
export const insertGenerationOutcomeSchema = createInsertSchema(generationOutcomes).omit({ id: true, createdAt: true });
export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true });

export type GenerationPattern = typeof generationPatterns.$inferSelect;
export type InsertGenerationPattern = z.infer<typeof insertGenerationPatternSchema>;
export type GenerationOutcome = typeof generationOutcomes.$inferSelect;
export type InsertGenerationOutcome = z.infer<typeof insertGenerationOutcomeSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;

// ============================================================
// LOCAL AI ENGINE - 16-STAGE PIPELINE TABLES
// ============================================================

export const pipelineExecutions = pgTable("pipeline_executions", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  currentStage: integer("current_stage").default(0),
  totalStages: integer("total_stages").default(16),
  inputDescription: text("input_description").notNull(),
  outputPlan: jsonb("output_plan"),
  qualityScore: real("quality_score"),
  totalTimeMs: integer("total_time_ms"),
  memoryUsageMb: real("memory_usage_mb"),
  errorLog: jsonb("error_log").$type<{ stage: number; error: string; recoverable: boolean }[]>(),
  engineMode: text("engine_mode").default("local"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const stageResults = pgTable("stage_results", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").notNull().references(() => pipelineExecutions.id, { onDelete: "cascade" }),
  stageNumber: integer("stage_number").notNull(),
  stageName: text("stage_name").notNull(),
  stageType: text("stage_type").notNull(),
  status: text("status").notNull().default("pending"),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  qualityScore: real("quality_score"),
  confidenceScore: real("confidence_score"),
  processingTimeMs: integer("processing_time_ms"),
  warnings: text("warnings").array(),
  errors: text("errors").array(),
  patternsUsed: integer("patterns_used").default(0),
  rulesApplied: integer("rules_applied").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const architecturePatterns = pgTable("architecture_patterns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  constraints: jsonb("constraints").$type<{ key: string; operator: string; value: any }[]>(),
  score: real("score").default(0),
  techStack: jsonb("tech_stack").$type<{ frontend: string; backend: string; database: string; styling: string }>(),
  folderStructure: jsonb("folder_structure"),
  tradeoffs: jsonb("tradeoffs").$type<{ pros: string[]; cons: string[] }>(),
  bestFor: text("best_for").array(),
  usageCount: integer("usage_count").default(0),
  successRate: real("success_rate").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ruleDefinitions = pgTable("rule_definitions", {
  id: serial("id").primaryKey(),
  stageNumber: integer("stage_number").notNull(),
  ruleType: text("rule_type").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  condition: jsonb("condition").$type<{ field: string; operator: string; value: any }[]>().notNull(),
  action: jsonb("action").$type<{ type: string; params: Record<string, any> }>().notNull(),
  priority: integer("priority").default(50),
  enabled: boolean("enabled").default(true),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const uxBlueprints = pgTable("ux_blueprints", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userType: text("user_type").notNull(),
  projectType: text("project_type").notNull(),
  layout: jsonb("layout").$type<{ type: string; regions: string[]; navigation: string; responsive: boolean }>().notNull(),
  colorScheme: jsonb("color_scheme").$type<{ primary: string; secondary: string; accent: string; background: string; text: string }>(),
  typography: jsonb("typography").$type<{ headingFont: string; bodyFont: string; scale: string }>(),
  componentMap: jsonb("component_map").$type<{ region: string; components: string[] }[]>(),
  interactionPatterns: text("interaction_patterns").array(),
  accessibilityLevel: text("accessibility_level").default("AA"),
  usageCount: integer("usage_count").default(0),
  rating: real("rating").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const componentTemplates = pgTable("component_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  framework: text("framework").default("react"),
  templateCode: text("template_code").notNull(),
  propsSchema: jsonb("props_schema"),
  dependencies: text("dependencies").array(),
  renderCost: real("render_cost").default(1),
  memoizable: boolean("memoizable").default(false),
  accessibilityScore: real("accessibility_score").default(0),
  responsiveBreakpoints: jsonb("responsive_breakpoints"),
  variants: jsonb("variants").$type<{ name: string; overrides: Record<string, any> }[]>(),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const featureGraphs = pgTable("feature_graphs", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").references(() => pipelineExecutions.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").$type<{ id: string; type: string; label: string; properties: Record<string, any> }[]>().notNull(),
  edges: jsonb("edges").$type<{ source: string; target: string; type: string; weight: number }[]>().notNull(),
  cycles: jsonb("cycles").$type<string[][]>(),
  conflicts: jsonb("conflicts").$type<{ nodeA: string; nodeB: string; reason: string }[]>(),
  resolutions: jsonb("resolutions").$type<{ conflict: string; strategy: string; applied: boolean }[]>(),
  totalNodes: integer("total_nodes").default(0),
  totalEdges: integer("total_edges").default(0),
  maxDepth: integer("max_depth").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const vectorEmbeddings = pgTable("vector_embeddings", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  content: text("content").notNull(),
  embedding: real("embedding").array().notNull(),
  dimensions: integer("dimensions").default(384),
  metadata: jsonb("metadata"),
  category: text("category"),
  similarity_threshold: real("similarity_threshold").default(0.7),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_vector_source").on(table.sourceType, table.sourceId),
  index("idx_vector_category").on(table.category),
]);

export const learningFeedback = pgTable("learning_feedback", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").references(() => pipelineExecutions.id, { onDelete: "cascade" }),
  stageNumber: integer("stage_number"),
  feedbackType: text("feedback_type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  impact: text("impact").default("medium"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  improvement: real("improvement"),
  applied: boolean("applied").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const modelWeights = pgTable("model_weights", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull(),
  version: integer("version").default(1),
  stageNumber: integer("stage_number"),
  weightType: text("weight_type").notNull(),
  weights: jsonb("weights").$type<Record<string, number>>().notNull(),
  biases: jsonb("biases").$type<Record<string, number>>(),
  accuracy: real("accuracy").default(0),
  trainingSamples: integer("training_samples").default(0),
  lastTrainedAt: timestamp("last_trained_at"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const domainKnowledgeBase = pgTable("domain_knowledge_base", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  entityType: text("entity_type").notNull(),
  knowledgeType: text("knowledge_type").notNull(),
  content: jsonb("content").notNull(),
  tags: text("tags").array(),
  confidence: real("confidence").default(1),
  source: text("source").default("built-in"),
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Insert schemas for new tables
export const insertPipelineExecutionSchema = createInsertSchema(pipelineExecutions).omit({ id: true, createdAt: true });
export const insertStageResultSchema = createInsertSchema(stageResults).omit({ id: true, createdAt: true });
export const insertArchitecturePatternSchema = createInsertSchema(architecturePatterns).omit({ id: true, createdAt: true });
export const insertRuleDefinitionSchema = createInsertSchema(ruleDefinitions).omit({ id: true, createdAt: true });
export const insertUxBlueprintSchema = createInsertSchema(uxBlueprints).omit({ id: true, createdAt: true });
export const insertComponentTemplateSchema = createInsertSchema(componentTemplates).omit({ id: true, createdAt: true });
export const insertFeatureGraphSchema = createInsertSchema(featureGraphs).omit({ id: true, createdAt: true });
export const insertVectorEmbeddingSchema = createInsertSchema(vectorEmbeddings).omit({ id: true, createdAt: true });
export const insertLearningFeedbackSchema = createInsertSchema(learningFeedback).omit({ id: true, createdAt: true });
export const insertModelWeightSchema = createInsertSchema(modelWeights).omit({ id: true, createdAt: true });
export const insertDomainKnowledgeBaseSchema = createInsertSchema(domainKnowledgeBase).omit({ id: true, createdAt: true });

// Types for new tables
export type PipelineExecution = typeof pipelineExecutions.$inferSelect;
export type InsertPipelineExecution = z.infer<typeof insertPipelineExecutionSchema>;
export type StageResult = typeof stageResults.$inferSelect;
export type InsertStageResult = z.infer<typeof insertStageResultSchema>;
export type ArchitecturePattern = typeof architecturePatterns.$inferSelect;
export type InsertArchitecturePattern = z.infer<typeof insertArchitecturePatternSchema>;
export type RuleDefinition = typeof ruleDefinitions.$inferSelect;
export type InsertRuleDefinition = z.infer<typeof insertRuleDefinitionSchema>;
export type UxBlueprint = typeof uxBlueprints.$inferSelect;
export type InsertUxBlueprint = z.infer<typeof insertUxBlueprintSchema>;
export type ComponentTemplate = typeof componentTemplates.$inferSelect;
export type InsertComponentTemplate = z.infer<typeof insertComponentTemplateSchema>;
export type FeatureGraph = typeof featureGraphs.$inferSelect;
export type InsertFeatureGraph = z.infer<typeof insertFeatureGraphSchema>;
export type VectorEmbedding = typeof vectorEmbeddings.$inferSelect;
export type InsertVectorEmbedding = z.infer<typeof insertVectorEmbeddingSchema>;
export type LearningFeedback = typeof learningFeedback.$inferSelect;
export type InsertLearningFeedback = z.infer<typeof insertLearningFeedbackSchema>;
export type ModelWeight = typeof modelWeights.$inferSelect;
export type InsertModelWeight = z.infer<typeof insertModelWeightSchema>;
export type DomainKnowledgeBase = typeof domainKnowledgeBase.$inferSelect;
export type InsertDomainKnowledgeBase = z.infer<typeof insertDomainKnowledgeBaseSchema>;