import type { ProjectPlan, PlannedEntity } from './plan-generator';
import { db } from '@workspace/db';
import { generationPatterns, generationOutcomes, userPreferences } from '@workspace/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const LEARNING_DATA_FILE = path.join(process.cwd(), 'learning-data.json');

export interface LearningContext {
  patterns: LearnedPattern[];
  preferences: LearnedPreference[];
  outcomes: OutcomeSummary[];
}

export interface LearnedPattern {
  id?: number;
  patternType: 'entity-structure' | 'field-naming' | 'workflow-design' | 'ui-layout' | 'tech-choice' | 'domain-mapping' | 'validation-rule' | 'page-structure' | 'error-prevention';
  domainId?: string;
  entityType?: string;
  patternKey: string;
  patternValue: Record<string, any>;
  successCount: number;
  failureCount: number;
  reliability: number;
}

export interface LearnedPreference {
  key: string;
  value: string;
  category: 'styling' | 'naming' | 'architecture' | 'features' | 'workflow' | 'ui' | 'tech';
  frequency: number;
}

export interface OutcomeSummary {
  domainId?: string;
  avgEntityCount: number;
  avgFileCount: number;
  modificationRate: number;
  avgErrorCount: number;
  avgAutoFixCount: number;
  totalGenerations: number;
}

export interface GenerationFeedback {
  conversationId: number;
  projectDescription: string;
  domainId?: string;
  plan: ProjectPlan;
  generatedFiles: { path: string; content: string }[];
  errors: string[];
  autoFixes: string[];
  userModifications: { file: string; type: string; description: string }[];
  generationTimeMs: number;
}

export interface GenerationOutcomeRecord {
  plan: ProjectPlan;
  files: { path: string; content: string }[];
  success: boolean;
  qualityScore: number;
  domainId?: string;
  errors?: string[];
  autoFixes?: string[];
}

export class GenerationLearningEngine {
  private patterns: Map<string, LearnedPattern> = new Map();
  private preferences: Map<string, LearnedPreference> = new Map();
  private recentOutcomes: OutcomeSummary[] = [];
  private dbAvailable: boolean = false;
  private _ready: Promise<void>;
  private _isLoaded: boolean = false;

  constructor() {
    this.initializeDefaultPatterns();
    this._ready = this.tryLoadFromDatabase().then(() => { this._isLoaded = true; });
    this.tryLoadFromFile();
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  async ensureReady(): Promise<void> {
    await this._ready;
  }

  private async tryLoadFromDatabase(): Promise<void> {
    try {
      if (!db) return;
      this.dbAvailable = true;

      const dbPatterns = await db.select().from(generationPatterns).execute();
      for (const row of dbPatterns) {
        const successCount = row.successCount || 0;
        const failureCount = row.failureCount || 0;
        const total = successCount + failureCount;
        const pattern: LearnedPattern = {
          id: row.id,
          patternType: row.patternType as any,
          domainId: row.domainId || undefined,
          entityType: row.entityType || undefined,
          patternKey: row.patternKey,
          patternValue: (row.patternValue as Record<string, any>) || {},
          successCount,
          failureCount,
          reliability: total > 0 ? successCount / total : 0,
        };
        this.patterns.set(pattern.patternKey, pattern);
      }

      const dbPrefs = await db.select().from(userPreferences).execute();
      for (const row of dbPrefs) {
        this.preferences.set(row.preferenceKey, {
          key: row.preferenceKey,
          value: row.preferenceValue || '',
          category: (row.category as any) || 'features',
          frequency: row.frequency || 1,
        });
      }
    } catch (e) {
      this.dbAvailable = false;
    }
  }

  private initializeDefaultPatterns(): void {
    const defaults: LearnedPattern[] = [
      {
        patternType: 'entity-structure',
        patternKey: 'person-entity-fields',
        patternValue: {
          recommended: ['firstName', 'lastName', 'email', 'phone', 'status'],
          optional: ['avatar', 'address', 'city', 'state', 'zipCode', 'notes'],
        },
        successCount: 10,
        failureCount: 0,
        reliability: 1,
      },
      {
        patternType: 'entity-structure',
        patternKey: 'transaction-entity-fields',
        patternValue: {
          recommended: ['amount', 'date', 'status', 'reference', 'type'],
          optional: ['notes', 'dueDate', 'paidDate', 'category'],
        },
        successCount: 8,
        failureCount: 0,
        reliability: 1,
      },
      {
        patternType: 'workflow-design',
        patternKey: 'order-workflow',
        patternValue: {
          states: ['draft', 'pending', 'approved', 'in-progress', 'completed', 'cancelled'],
          commonTransitions: [
            { from: 'draft', to: 'pending', action: 'Submit' },
            { from: 'pending', to: 'approved', action: 'Approve' },
            { from: 'approved', to: 'in-progress', action: 'Start' },
            { from: 'in-progress', to: 'completed', action: 'Complete' },
          ],
        },
        successCount: 12,
        failureCount: 1,
        reliability: 0.92,
      },
      {
        patternType: 'ui-layout',
        patternKey: 'dashboard-kpi-count',
        patternValue: { optimalCount: 4, maxCount: 6 },
        successCount: 15,
        failureCount: 2,
        reliability: 0.88,
      },
      {
        patternType: 'ui-layout',
        patternKey: 'list-page-fields',
        patternValue: { optimalColumns: 5, maxColumns: 7 },
        successCount: 10,
        failureCount: 1,
        reliability: 0.91,
      },
      {
        patternType: 'tech-choice',
        patternKey: 'form-validation',
        patternValue: { preferred: 'zod', alternative: 'inline' },
        successCount: 20,
        failureCount: 0,
        reliability: 1,
      },
      {
        patternType: 'validation-rule',
        patternKey: 'email-validation',
        patternValue: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', errorMessage: 'Invalid email format' },
        successCount: 25,
        failureCount: 0,
        reliability: 1,
      },
      {
        patternType: 'page-structure',
        patternKey: 'list-page-features',
        patternValue: {
          recommended: ['search', 'create-dialog', 'delete-action', 'status-filter'],
          optional: ['export', 'bulk-actions', 'pagination', 'sort'],
        },
        successCount: 18,
        failureCount: 2,
        reliability: 0.9,
      },
      {
        patternType: 'field-naming',
        patternKey: 'date-field-naming',
        patternValue: {
          patterns: {
            creation: 'createdAt',
            update: 'updatedAt',
            due: 'dueDate',
            start: 'startDate',
            end: 'endDate',
            schedule: 'scheduledDate',
            birth: 'dateOfBirth',
          },
        },
        successCount: 30,
        failureCount: 1,
        reliability: 0.97,
      },
      {
        patternType: 'domain-mapping',
        patternKey: 'veterinary',
        patternValue: {
          entities: ['Pet', 'Owner', 'Appointment', 'Treatment', 'Prescription'],
          blendSources: ['healthcare', 'crm'],
          kpis: ['Total Patients', 'Appointments Today', 'Revenue', 'Pending Treatments'],
        },
        successCount: 3,
        failureCount: 0,
        reliability: 1,
      },
    ];

    for (const pattern of defaults) {
      this.patterns.set(pattern.patternKey, pattern);
    }
  }

  async setDatabaseAvailable(available: boolean): Promise<void> {
    this.dbAvailable = available;
  }

  private async persistPattern(pattern: LearnedPattern): Promise<void> {
    if (!this.dbAvailable || !db) return;
    try {
      const existing = await db.select().from(generationPatterns)
        .where(eq(generationPatterns.patternKey, pattern.patternKey))
        .execute();

      if (existing.length > 0) {
        await db.update(generationPatterns)
          .set({
            patternValue: pattern.patternValue,
            successCount: pattern.successCount,
            failureCount: pattern.failureCount,
            lastUsed: new Date(),
          })
          .where(eq(generationPatterns.patternKey, pattern.patternKey))
          .execute();
      } else {
        await db.insert(generationPatterns).values({
          patternType: pattern.patternType,
          patternKey: pattern.patternKey,
          domainId: pattern.domainId || null,
          entityType: pattern.entityType || null,
          patternValue: pattern.patternValue,
          successCount: pattern.successCount,
          failureCount: pattern.failureCount,
        }).execute();
      }
    } catch (e) {}
  }

  private async persistPreference(pref: LearnedPreference): Promise<void> {
    if (!this.dbAvailable || !db) return;
    try {
      const existing = await db.select().from(userPreferences)
        .where(eq(userPreferences.preferenceKey, pref.key))
        .execute();

      if (existing.length > 0) {
        await db.update(userPreferences)
          .set({
            preferenceValue: pref.value,
            frequency: pref.frequency,
            lastSeen: new Date(),
          })
          .where(eq(userPreferences.preferenceKey, pref.key))
          .execute();
      } else {
        await db.insert(userPreferences).values({
          preferenceKey: pref.key,
          preferenceValue: pref.value,
          category: pref.category,
          frequency: pref.frequency,
        }).execute();
      }
    } catch (e) {}
  }

  async recordOutcome(feedback: GenerationFeedback): Promise<void> {
    for (const entity of feedback.plan.dataModel) {
      this.learnEntityPattern(entity, feedback.domainId);
    }

    if (feedback.plan.workflows) {
      for (const workflow of feedback.plan.workflows) {
        const key = `workflow-${workflow.entity.toLowerCase()}`;
        const existing = this.patterns.get(key);
        if (existing) {
          existing.successCount += feedback.errors.length === 0 ? 1 : 0;
          existing.failureCount += feedback.errors.length > 0 ? 1 : 0;
          existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
          this.persistPattern(existing);
        } else {
          const newPattern: LearnedPattern = {
            patternType: 'workflow-design',
            patternKey: key,
            patternValue: {
              states: workflow.states,
              commonTransitions: workflow.transitions,
            },
            successCount: feedback.errors.length === 0 ? 1 : 0,
            failureCount: feedback.errors.length > 0 ? 1 : 0,
            reliability: feedback.errors.length === 0 ? 1 : 0,
          };
          this.patterns.set(key, newPattern);
          this.persistPattern(newPattern);
        }
      }
    }

    if (feedback.errors.length > 0) {
      this.learnFromErrors(feedback.errors, feedback.plan);
    }

    if (feedback.userModifications.length > 0) {
      for (const mod of feedback.userModifications) {
        this.learnFromModification(mod, feedback.domainId);
      }
    }

    if (feedback.domainId) {
      this.learnDomainMapping(feedback.domainId, feedback.plan);
    }

    if (this.dbAvailable && db) {
      try {
        await db.insert(generationOutcomes).values({
          conversationId: feedback.conversationId,
          domainId: feedback.domainId || null,
          projectDescription: feedback.projectDescription,
          entityCount: feedback.plan.dataModel.length,
          fileCount: feedback.generatedFiles.length,
          wasModified: feedback.userModifications.length > 0,
          modifications: feedback.userModifications.length > 0 ? feedback.userModifications : null,
          errorCount: feedback.errors.length,
          autoFixCount: feedback.autoFixes.length,
          generationTimeMs: feedback.generationTimeMs,
        }).execute();
      } catch (e) {}
    }
  }

  learnFromErrors(errors: string[], plan: ProjectPlan): void {
    for (const error of errors) {
      const errorLower = error.toLowerCase();

      if (/cannot find module|module not found|is not defined/i.test(errorLower)) {
        const moduleMatch = error.match(/['"]([^'"]+)['"]/);
        if (moduleMatch) {
          const key = `error-missing-import-${moduleMatch[1]}`;
          const existing = this.patterns.get(key);
          if (existing) {
            existing.failureCount += 1;
            existing.reliability = 0;
            existing.patternValue.occurrences = (existing.patternValue.occurrences || 0) + 1;
            existing.patternValue.lastSeen = new Date().toISOString();
            this.persistPattern(existing);
          } else {
            const newPattern: LearnedPattern = {
              patternType: 'error-prevention',
              patternKey: key,
              patternValue: {
                errorType: 'missing-import',
                module: moduleMatch[1],
                occurrences: 1,
                lastSeen: new Date().toISOString(),
                fix: `Ensure ${moduleMatch[1]} is included in package.json dependencies`,
              },
              successCount: 0,
              failureCount: 1,
              reliability: 0,
            };
            this.patterns.set(key, newPattern);
            this.persistPattern(newPattern);
          }
        }
      }

      if (/type.*not assignable|expected.*got/i.test(errorLower)) {
        const key = `error-type-mismatch-${Date.now()}`;
        const newPattern: LearnedPattern = {
          patternType: 'error-prevention',
          patternKey: key,
          patternValue: {
            errorType: 'type-mismatch',
            errorMessage: error,
            occurrences: 1,
            lastSeen: new Date().toISOString(),
          },
          successCount: 0,
          failureCount: 1,
          reliability: 0,
        };
        this.patterns.set(key, newPattern);
        this.persistPattern(newPattern);
      }

      if (/property.*does not exist|cannot read.*undefined/i.test(errorLower)) {
        const propMatch = error.match(/property\s+'(\w+)'/i);
        if (propMatch) {
          const key = `error-missing-field-${propMatch[1]}`;
          const existing = this.patterns.get(key);
          if (existing) {
            existing.failureCount += 1;
            existing.patternValue.occurrences = (existing.patternValue.occurrences || 0) + 1;
            this.persistPattern(existing);
          } else {
            const newPattern: LearnedPattern = {
              patternType: 'error-prevention',
              patternKey: key,
              patternValue: {
                errorType: 'missing-field',
                fieldName: propMatch[1],
                occurrences: 1,
                fix: `Ensure field '${propMatch[1]}' exists in entity schema`,
              },
              successCount: 0,
              failureCount: 1,
              reliability: 0,
            };
            this.patterns.set(key, newPattern);
            this.persistPattern(newPattern);
          }
        }
      }

      if (/jsx|component|is not a function|element type is invalid/i.test(errorLower)) {
        const compMatch = error.match(/<(\w+)/);
        if (compMatch) {
          const key = `error-component-${compMatch[1]}`;
          const existing = this.patterns.get(key);
          if (existing) {
            existing.failureCount += 1;
            existing.patternValue.occurrences = (existing.patternValue.occurrences || 0) + 1;
            this.persistPattern(existing);
          } else {
            const newPattern: LearnedPattern = {
              patternType: 'error-prevention',
              patternKey: key,
              patternValue: {
                errorType: 'component-error',
                componentName: compMatch[1],
                occurrences: 1,
                fix: `Ensure component '${compMatch[1]}' is properly defined and exported`,
              },
              successCount: 0,
              failureCount: 1,
              reliability: 0,
            };
            this.patterns.set(key, newPattern);
            this.persistPattern(newPattern);
          }
        }
      }
    }
  }

  getErrorPreventionRules(): {
    requiredDependencies: string[];
    requiredFields: { entityPattern: string; fieldName: string }[];
    avoidComponents: string[];
    safeImports: string[];
  } {
    const rules = {
      requiredDependencies: [] as string[],
      requiredFields: [] as { entityPattern: string; fieldName: string }[],
      avoidComponents: [] as string[],
      safeImports: [] as string[],
    };

    for (const [key, pattern] of Array.from(this.patterns.entries())) {
      if (pattern.patternType !== 'error-prevention') continue;
      if ((pattern.patternValue.occurrences || 0) < 2) continue;

      switch (pattern.patternValue.errorType) {
        case 'missing-import':
          rules.requiredDependencies.push(pattern.patternValue.module);
          break;
        case 'missing-field':
          rules.requiredFields.push({
            entityPattern: '*',
            fieldName: pattern.patternValue.fieldName,
          });
          break;
        case 'component-error':
          if (pattern.failureCount >= 3) {
            rules.avoidComponents.push(pattern.patternValue.componentName);
          }
          break;
      }
    }

    return rules;
  }

  private learnEntityPattern(entity: PlannedEntity, domainId?: string): void {
    const key = `entity-${entity.name.toLowerCase()}`;
    const fieldNames = entity.fields.map(f => f.name);
    const newFieldTypes = Object.fromEntries(entity.fields.map(f => [f.name, f.type]));

    const existing = this.patterns.get(key);
    if (existing) {
      const existingFields = existing.patternValue.recommended || [];
      const mergedFields = Array.from(new Set([...existingFields, ...fieldNames]));
      existing.patternValue.recommended = mergedFields;
      const existingFieldTypes = existing.patternValue.fieldTypes || {};
      existing.patternValue.fieldTypes = { ...existingFieldTypes, ...newFieldTypes };
      existing.successCount += 1;
      existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
      if (domainId) {
        existing.domainId = domainId;
      }
      if (entity.name) {
        existing.entityType = entity.name;
      }
      this.persistPattern(existing);
    } else {
      const newPattern: LearnedPattern = {
        patternType: 'entity-structure',
        entityType: entity.name,
        domainId,
        patternKey: key,
        patternValue: {
          recommended: fieldNames,
          fieldTypes: newFieldTypes,
        },
        successCount: 1,
        failureCount: 0,
        reliability: 1,
      };
      this.patterns.set(key, newPattern);
      this.persistPattern(newPattern);
    }
  }

  private learnFromModification(mod: { file: string; type: string; description: string }, domainId?: string): void {
    const key = `mod-${mod.type}-${mod.file.split('/').pop()?.replace(/\.\w+$/, '')}`;

    if (mod.type === 'field-added' || mod.type === 'field-removed' || mod.type === 'field-modified') {
      const preference: LearnedPreference = {
        key: `field-mod-${mod.description}`,
        value: mod.description,
        category: 'architecture',
        frequency: 1,
      };
      const existing = this.preferences.get(preference.key);
      if (existing) {
        existing.frequency += 1;
        this.persistPreference(existing);
      } else {
        this.preferences.set(preference.key, preference);
        this.persistPreference(preference);
      }
    }

    if (mod.type === 'style-change' || mod.type === 'ui-change') {
      const pref: LearnedPreference = {
        key: `ui-mod-${mod.description}`,
        value: mod.description,
        category: 'ui',
        frequency: 1,
      };
      this.preferences.set(pref.key, pref);
      this.persistPreference(pref);
    }
  }

  private learnDomainMapping(domainId: string, plan: ProjectPlan): void {
    const key = `domain-${domainId}`;
    const existing = this.patterns.get(key);

    const relationships: Record<string, string[]> = {};
    for (const entity of plan.dataModel) {
      const rels: string[] = [];
      for (const field of entity.fields) {
        if (field.name.endsWith('Id') && field.name !== 'id') {
          const refEntity = field.name.replace(/Id$/, '');
          const capitalized = refEntity.charAt(0).toUpperCase() + refEntity.slice(1);
          rels.push(`belongsTo ${capitalized}`);
        }
      }
      if (rels.length > 0) {
        relationships[entity.name] = rels;
      }
    }

    if (existing) {
      const existingEntities = existing.patternValue.entities || [];
      const newEntities = plan.dataModel.map(e => e.name);
      existing.patternValue.entities = Array.from(new Set([...existingEntities, ...newEntities]));
      const existingModules = existing.patternValue.modules || [];
      const newModules = plan.modules.map(m => m.name);
      existing.patternValue.modules = Array.from(new Set([...existingModules, ...newModules]));
      const existingKpis = existing.patternValue.kpis || [];
      existing.patternValue.kpis = Array.from(new Set([...existingKpis, ...plan.kpis]));
      existing.patternValue.pageCount = Math.max(existing.patternValue.pageCount || 0, plan.pages.length);
      existing.patternValue.relationships = { ...(existing.patternValue.relationships || {}), ...relationships };
      existing.successCount += 1;
      existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
      if (!existing.domainId) existing.domainId = domainId;
      this.persistPattern(existing);
    } else {
      const newPattern: LearnedPattern = {
        patternType: 'domain-mapping',
        domainId,
        patternKey: key,
        patternValue: {
          entities: plan.dataModel.map(e => e.name),
          modules: plan.modules.map(m => m.name),
          kpis: plan.kpis,
          pageCount: plan.pages.length,
          relationships,
        },
        successCount: 1,
        failureCount: 0,
        reliability: 1,
      };
      this.patterns.set(key, newPattern);
      this.persistPattern(newPattern);
    }
  }

  getEntityRecommendations(entityName: string, domainId?: string): { recommendedFields: string[]; fieldTypes: Record<string, string> } | null {
    const nameLower = entityName.toLowerCase();
    const exactKey = `entity-${nameLower}`;
    const pattern = this.patterns.get(exactKey);

    if (pattern && pattern.reliability >= 0.5) {
      return {
        recommendedFields: pattern.patternValue.recommended || [],
        fieldTypes: pattern.patternValue.fieldTypes || {},
      };
    }

    for (const [key, pat] of Array.from(this.patterns.entries())) {
      if (pat.patternType === 'entity-structure' && pat.reliability >= 0.5) {
        if (pat.entityType?.toLowerCase() === nameLower ||
            key.startsWith(`${nameLower}-entity`) ||
            key.includes(`-${nameLower}-`) ||
            key === `${nameLower}-entity-fields`) {
          return {
            recommendedFields: pat.patternValue.recommended || [],
            fieldTypes: pat.patternValue.fieldTypes || {},
          };
        }
      }
    }

    return null;
  }

  getWorkflowRecommendation(entityName: string): { states: string[]; transitions: any[] } | null {
    const key = `workflow-${entityName.toLowerCase()}`;
    const pattern = this.patterns.get(key);

    if (pattern && pattern.reliability >= 0.5) {
      return {
        states: pattern.patternValue.states || [],
        transitions: pattern.patternValue.commonTransitions || [],
      };
    }

    const orderPattern = this.patterns.get('order-workflow');
    if (orderPattern && entityName.toLowerCase().includes('order')) {
      return {
        states: orderPattern.patternValue.states || [],
        transitions: orderPattern.patternValue.commonTransitions || [],
      };
    }

    return null;
  }

  getUIRecommendations(): { dashboardKpiCount: number; listPageColumns: number; listPageFeatures: string[] } {
    const kpiPattern = this.patterns.get('dashboard-kpi-count');
    const listPattern = this.patterns.get('list-page-fields');
    const featurePattern = this.patterns.get('list-page-features');

    let optimalKpiCount = 4;
    let optimalColumns = 5;

    const successfulEntityPatterns = Array.from(this.patterns.values())
      .filter(p => p.patternType === 'entity-structure' && p.reliability > 0.7);

    if (successfulEntityPatterns.length > 0) {
      const avgFieldCount = successfulEntityPatterns.reduce((sum, p) =>
        sum + (p.patternValue.recommended?.length || 5), 0) / successfulEntityPatterns.length;
      optimalColumns = Math.min(Math.max(Math.round(avgFieldCount * 0.6), 3), 7);
    }

    return {
      dashboardKpiCount: kpiPattern?.patternValue.optimalCount || optimalKpiCount,
      listPageColumns: listPattern?.patternValue.optimalColumns || optimalColumns,
      listPageFeatures: featurePattern?.patternValue.recommended || ['search', 'create-dialog', 'delete-action'],
    };
  }

  getDomainMapping(domainId: string): { entities: string[]; modules: string[]; kpis: string[] } | null {
    const key = `domain-${domainId}`;
    const pattern = this.patterns.get(key);

    if (pattern) {
      return {
        entities: pattern.patternValue.entities || [],
        modules: pattern.patternValue.modules || [],
        kpis: pattern.patternValue.kpis || [],
      };
    }

    return null;
  }

  getPreferences(category?: string): LearnedPreference[] {
    const prefs = Array.from(this.preferences.values());
    if (category) {
      return prefs.filter(p => p.category === category);
    }
    return prefs;
  }

  getReliablePatterns(minReliability: number = 0.7): LearnedPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.reliability >= minReliability)
      .sort((a, b) => b.reliability - a.reliability);
  }

  getFieldNamingRecommendation(semanticType: string): string | null {
    const namingPattern = this.patterns.get('date-field-naming');
    if (namingPattern && namingPattern.patternValue.patterns[semanticType]) {
      return namingPattern.patternValue.patterns[semanticType];
    }
    return null;
  }

  applyLearnedPatterns(plan: ProjectPlan): ProjectPlan {
    const enhancedPlan = { ...plan };

    const domainId = (enhancedPlan as any).domainId;
    if (domainId) {
      const domainMapping = this.getDomainMapping(domainId);
      if (domainMapping) {
        const existingEntityNames = new Set(enhancedPlan.dataModel.map(e => e.name.toLowerCase()));
        for (const suggestedEntity of domainMapping.entities) {
          if (!existingEntityNames.has(suggestedEntity.toLowerCase())) {
            const entityRec = this.getEntityRecommendations(suggestedEntity);
            if (entityRec && entityRec.recommendedFields.length > 0) {
              const fields = entityRec.recommendedFields.slice(0, 8).map(f => ({
                name: f,
                type: entityRec.fieldTypes[f] || 'text',
                required: f === 'id' || f === 'name' || f === 'title',
              }));
              if (!fields.some(f => f.name === 'id')) {
                fields.unshift({ name: 'id', type: 'serial', required: true });
              }
              enhancedPlan.dataModel.push({ name: suggestedEntity, tableName: suggestedEntity.toLowerCase() + 's', fields, relationships: [] });
              existingEntityNames.add(suggestedEntity.toLowerCase());
            }
          }
        }

        const existingKpis = new Set(enhancedPlan.kpis.map(k => k.toLowerCase()));
        for (const kpi of domainMapping.kpis) {
          if (!existingKpis.has(kpi.toLowerCase())) {
            enhancedPlan.kpis.push(kpi);
            existingKpis.add(kpi.toLowerCase());
          }
        }
      }
    }

    for (const entity of enhancedPlan.dataModel) {
      const recommendations = this.getEntityRecommendations(entity.name);

      if (recommendations) {
        for (const fieldName of recommendations.recommendedFields) {
          const exists = entity.fields.some(f => f.name === fieldName);
          if (!exists && recommendations.fieldTypes[fieldName]) {
            entity.fields.push({
              name: fieldName,
              type: recommendations.fieldTypes[fieldName],
              required: false,
            });
          }
        }
      }

      const workflowRec = this.getWorkflowRecommendation(entity.name);
      if (workflowRec) {
        const hasWorkflow = enhancedPlan.workflows.some(w => w.entity === entity.name);
        if (!hasWorkflow && entity.fields.some(f => f.name === 'status')) {
          enhancedPlan.workflows.push({
            name: `${entity.name} Lifecycle`,
            entity: entity.name,
            states: workflowRec.states,
            transitions: workflowRec.transitions,
          });
        }
      }
    }

    const uiRec = this.getUIRecommendations();
    if (enhancedPlan.kpis.length < uiRec.dashboardKpiCount) {
      while (enhancedPlan.kpis.length < uiRec.dashboardKpiCount) {
        const entityName = enhancedPlan.dataModel[enhancedPlan.kpis.length % enhancedPlan.dataModel.length]?.name;
        if (entityName && !enhancedPlan.kpis.includes(`Total ${entityName}s`)) {
          enhancedPlan.kpis.push(`Total ${entityName}s`);
        } else {
          break;
        }
      }
    }

    const errorRules = this.getErrorPreventionRules();

    for (const rule of errorRules.requiredFields) {
      for (const entity of enhancedPlan.dataModel) {
        if (!entity.fields.some(f => f.name === rule.fieldName)) {
          if (['name', 'title', 'description', 'status', 'createdAt'].includes(rule.fieldName)) {
            entity.fields.push({
              name: rule.fieldName,
              type: rule.fieldName === 'createdAt' ? 'timestamp' : 'text',
              required: false,
            });
          }
        }
      }
    }

    if (errorRules.requiredDependencies.length > 0) {
      if (!enhancedPlan.techStack) {
        (enhancedPlan as any).techStack = {};
      }
      if (!(enhancedPlan as any).techStack.additionalDependencies) {
        (enhancedPlan as any).techStack.additionalDependencies = [];
      }
      for (const dep of errorRules.requiredDependencies) {
        if (!(enhancedPlan as any).techStack.additionalDependencies.includes(dep)) {
          (enhancedPlan as any).techStack.additionalDependencies.push(dep);
        }
      }
    }

    if (errorRules.avoidComponents.length > 0) {
      if (!(enhancedPlan as any).avoidComponents) {
        (enhancedPlan as any).avoidComponents = [];
      }
      for (const comp of errorRules.avoidComponents) {
        if (!(enhancedPlan as any).avoidComponents.includes(comp)) {
          (enhancedPlan as any).avoidComponents.push(comp);
        }
      }
    }

    return enhancedPlan;
  }

  async getLearningStats(): Promise<{
    totalPatterns: number;
    reliablePatterns: number;
    totalPreferences: number;
    totalOutcomes: number;
    patternsByType: Record<string, number>;
  }> {
    const patternsByType: Record<string, number> = {};
    for (const pattern of Array.from(this.patterns.values())) {
      patternsByType[pattern.patternType] = (patternsByType[pattern.patternType] || 0) + 1;
    }

    return {
      totalPatterns: this.patterns.size,
      reliablePatterns: Array.from(this.patterns.values()).filter(p => p.reliability >= 0.7).length,
      totalPreferences: this.preferences.size,
      totalOutcomes: this.recentOutcomes.length,
      patternsByType,
    };
  }

  async recordGenerationOutcome(outcome: GenerationOutcomeRecord): Promise<void> {
    const { plan, files, success, qualityScore, domainId, errors, autoFixes } = outcome;
    const effectiveDomain = domainId || (plan as any).domainId || undefined;

    for (const entity of plan.dataModel) {
      this.learnEntityPattern(entity, effectiveDomain);
    }

    if (plan.workflows) {
      for (const workflow of plan.workflows) {
        const key = `workflow-${workflow.entity.toLowerCase()}`;
        const existing = this.patterns.get(key);
        if (existing) {
          existing.successCount += success ? 1 : 0;
          existing.failureCount += success ? 0 : 1;
          existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
          this.persistPattern(existing);
        } else {
          const newPattern: LearnedPattern = {
            patternType: 'workflow-design',
            patternKey: key,
            patternValue: {
              states: workflow.states,
              commonTransitions: workflow.transitions,
            },
            successCount: success ? 1 : 0,
            failureCount: success ? 0 : 1,
            reliability: success ? 1 : 0,
          };
          this.patterns.set(key, newPattern);
          this.persistPattern(newPattern);
        }
      }
    }

    if (success && plan.pages) {
      for (const page of plan.pages) {
        const key = `page-layout-${page.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
        const existing = this.patterns.get(key);
        if (existing) {
          existing.successCount += 1;
          existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
          this.persistPattern(existing);
        } else {
          const newPattern: LearnedPattern = {
            patternType: 'page-structure',
            patternKey: key,
            domainId: effectiveDomain,
            patternValue: {
              layout: (page as any).layout || 'table',
              entity: (page as any).entity,
              features: (page as any).features || [],
            },
            successCount: 1,
            failureCount: 0,
            reliability: 1,
          };
          this.patterns.set(key, newPattern);
          this.persistPattern(newPattern);
        }
      }
    }

    if (success && files.length > 0) {
      const fileStructure = files.map(f => f.path);
      const key = `file-structure-${effectiveDomain || 'general'}`;
      const existing = this.patterns.get(key);
      if (existing) {
        existing.successCount += 1;
        existing.patternValue.fileCount = files.length;
        existing.patternValue.recentPaths = fileStructure.slice(0, 30);
        existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
        this.persistPattern(existing);
      } else {
        const newPattern: LearnedPattern = {
          patternType: 'tech-choice',
          patternKey: key,
          domainId: effectiveDomain,
          patternValue: {
            fileCount: files.length,
            recentPaths: fileStructure.slice(0, 30),
            qualityScore,
          },
          successCount: 1,
          failureCount: 0,
          reliability: 1,
        };
        this.patterns.set(key, newPattern);
        this.persistPattern(newPattern);
      }
    }

    if (errors && errors.length > 0) {
      this.learnFromErrors(errors, plan);
    }

    if (effectiveDomain) {
      this.learnDomainMapping(effectiveDomain, plan);
    }

    if (success) {
      const qualityPref: LearnedPreference = {
        key: `quality-score-${effectiveDomain || 'general'}`,
        value: `${qualityScore}`,
        category: 'architecture',
        frequency: 1,
      };
      const existingPref = this.preferences.get(qualityPref.key);
      if (existingPref) {
        existingPref.value = `${Math.max(parseInt(existingPref.value) || 0, qualityScore)}`;
        existingPref.frequency += 1;
        this.persistPreference(existingPref);
      } else {
        this.preferences.set(qualityPref.key, qualityPref);
        this.persistPreference(qualityPref);
      }
    }

    if (this.dbAvailable && db) {
      try {
        await db.insert(generationOutcomes).values({
          conversationId: 0,
          domainId: effectiveDomain || null,
          projectDescription: plan.projectName || 'Generated Project',
          entityCount: plan.dataModel.length,
          fileCount: files.length,
          wasModified: false,
          modifications: null,
          errorCount: errors?.length || 0,
          autoFixCount: autoFixes?.length || 0,
          generationTimeMs: 0,
        }).execute();
      } catch (e) {}
    }

    this.persistToFile();
  }

  private tryLoadFromFile(): void {
    try {
      if (!fs.existsSync(LEARNING_DATA_FILE)) return;
      const raw = fs.readFileSync(LEARNING_DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);

      if (data.patterns && Array.isArray(data.patterns)) {
        for (const p of data.patterns) {
          if (!this.patterns.has(p.patternKey)) {
            this.patterns.set(p.patternKey, p);
          }
        }
      }

      if (data.preferences && Array.isArray(data.preferences)) {
        for (const pref of data.preferences) {
          if (!this.preferences.has(pref.key)) {
            this.preferences.set(pref.key, pref);
          }
        }
      }

      console.log(`Learning engine: loaded ${data.patterns?.length || 0} patterns, ${data.preferences?.length || 0} preferences from file`);
    } catch (e) {}
  }

  persistToFile(): void {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        patterns: Array.from(this.patterns.values()),
        preferences: Array.from(this.preferences.values()),
        stats: {
          totalPatterns: this.patterns.size,
          reliablePatterns: Array.from(this.patterns.values()).filter(p => p.reliability >= 0.7).length,
          totalPreferences: this.preferences.size,
        },
      };
      fs.writeFileSync(LEARNING_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {}
  }

  getFullExport(): {
    version: number;
    exportedAt: string;
    patterns: LearnedPattern[];
    preferences: LearnedPreference[];
    stats: Record<string, any>;
  } {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      patterns: Array.from(this.patterns.values()),
      preferences: Array.from(this.preferences.values()),
      stats: {
        totalPatterns: this.patterns.size,
        reliablePatterns: Array.from(this.patterns.values()).filter(p => p.reliability >= 0.7).length,
        totalPreferences: this.preferences.size,
        patternsByType: this.getPatternsByType(),
      },
    };
  }

  private getPatternsByType(): Record<string, number> {
    const byType: Record<string, number> = {};
    for (const pattern of Array.from(this.patterns.values())) {
      byType[pattern.patternType] = (byType[pattern.patternType] || 0) + 1;
    }
    return byType;
  }

  importFullData(data: { patterns?: LearnedPattern[]; preferences?: LearnedPreference[] }): {
    patternsImported: number;
    preferencesImported: number;
    patternsUpdated: number;
  } {
    let patternsImported = 0;
    let preferencesImported = 0;
    let patternsUpdated = 0;

    if (data.patterns) {
      for (const pattern of data.patterns) {
        const existing = this.patterns.get(pattern.patternKey);
        if (existing) {
          existing.successCount = Math.max(existing.successCount, pattern.successCount);
          existing.failureCount = Math.min(existing.failureCount, pattern.failureCount);
          existing.reliability = existing.successCount / (existing.successCount + existing.failureCount || 1);
          if (pattern.patternValue) {
            existing.patternValue = { ...existing.patternValue, ...pattern.patternValue };
          }
          this.persistPattern(existing);
          patternsUpdated++;
        } else {
          this.patterns.set(pattern.patternKey, pattern);
          this.persistPattern(pattern);
          patternsImported++;
        }
      }
    }

    if (data.preferences) {
      for (const pref of data.preferences) {
        const existing = this.preferences.get(pref.key);
        if (existing) {
          existing.frequency = Math.max(existing.frequency, pref.frequency);
          this.persistPreference(existing);
        } else {
          this.preferences.set(pref.key, pref);
          this.persistPreference(pref);
          preferencesImported++;
        }
      }
    }

    this.persistToFile();

    return { patternsImported, preferencesImported, patternsUpdated };
  }

  exportPatterns(): LearnedPattern[] {
    return Array.from(this.patterns.values());
  }

  importPatterns(patterns: LearnedPattern[]): void {
    for (const pattern of patterns) {
      const existing = this.patterns.get(pattern.patternKey);
      if (existing) {
        existing.successCount += pattern.successCount;
        existing.failureCount += pattern.failureCount;
        existing.reliability = existing.successCount / (existing.successCount + existing.failureCount);
        if (pattern.patternValue) {
          existing.patternValue = { ...existing.patternValue, ...pattern.patternValue };
        }
      } else {
        this.patterns.set(pattern.patternKey, pattern);
      }
    }
    this.persistToFile();
  }
}

export const learningEngine = new GenerationLearningEngine();