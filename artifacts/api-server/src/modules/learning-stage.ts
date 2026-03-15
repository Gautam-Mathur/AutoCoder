import { localAI } from './local-ai-engine.js';
import { templateRegistry } from './template-registry.js';
import { db } from '@workspace/db';
import { eq, desc, sql } from 'drizzle-orm';
import {
  vectorEmbeddings,
  learningFeedback,
  pipelineExecutions,
  stageResults as stageResultsTable,
  domainKnowledgeBase,
  generationPatterns,
} from '@workspace/db';

export interface LearningOutcome {
  pipelineId: string;
  projectType: string;
  domain: string;
  entities: string[];
  qualityScore: number;
  stageScores: Record<string, number>;
  patterns: LearnedPattern[];
  errorPatterns: ErrorPattern[];
  userFeedback?: string;
  timestamp: number;
}

export interface LearnedPattern {
  category: string;
  key: string;
  value: any;
  confidence: number;
  sourceProject: string;
}

export interface ErrorPattern {
  stage: string;
  errorType: string;
  message: string;
  fix: string;
  frequency: number;
}

export interface RAGContext {
  query: string;
  results: RAGResult[];
  confidence: number;
  synthesizedAnswer: string;
}

export interface RAGResult {
  content: string;
  similarity: number;
  source: string;
  category: string;
  metadata: Record<string, any>;
}

export interface LearningStats {
  totalOutcomes: number;
  averageQuality: number;
  topPatterns: Array<{ key: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  errorFrequency: Array<{ type: string; count: number }>;
  improvementTrend: number;
}

export class ContinuousLearningBrain {
  private outcomeCache = new Map<string, LearningOutcome>();
  private patternFrequency = new Map<string, number>();
  private errorFrequency = new Map<string, number>();
  private qualityHistory: number[] = [];

  async recordOutcome(outcome: LearningOutcome): Promise<void> {
    this.outcomeCache.set(outcome.pipelineId, outcome);
    this.qualityHistory.push(outcome.qualityScore);
    if (this.qualityHistory.length > 1000) this.qualityHistory.shift();

    for (const pattern of outcome.patterns) {
      const key = `${pattern.category}:${pattern.key}`;
      this.patternFrequency.set(key, (this.patternFrequency.get(key) || 0) + 1);
    }

    for (const error of outcome.errorPatterns) {
      const key = `${error.stage}:${error.errorType}`;
      this.errorFrequency.set(key, (this.errorFrequency.get(key) || 0) + 1);
    }

    try {
      await db.insert(pipelineExecutions).values({
        projectName: outcome.projectType,
        userRequest: outcome.domain,
        status: outcome.qualityScore >= 60 ? 'completed' : 'failed',
        totalDurationMs: 0,
        overallScore: outcome.qualityScore,
        stageCount: Object.keys(outcome.stageScores).length,
        completedStages: Object.values(outcome.stageScores).filter(s => s >= 60).length,
        failedStages: Object.entries(outcome.stageScores).filter(([_, s]) => s < 60).map(([k]) => k),
        fileCount: 0,
        lineCount: 0,
      });
    } catch {
    }

    try {
      const content = JSON.stringify({
        projectType: outcome.projectType,
        domain: outcome.domain,
        entities: outcome.entities,
        patterns: outcome.patterns.map(p => p.key),
      });

      await localAI.storeEmbedding(
        'generation_outcome',
        outcome.pipelineId,
        content,
        'generation',
        {
          qualityScore: outcome.qualityScore,
          domain: outcome.domain,
          entityCount: outcome.entities.length,
        }
      );
    } catch {
    }

    try {
      for (const pattern of outcome.patterns) {
        if (pattern.confidence >= 0.7) {
          await db.insert(generationPatterns).values({
            patternType: pattern.category,
            patternKey: pattern.key,
            patternValue: pattern.value,
            frequency: 1,
            successRate: outcome.qualityScore >= 60 ? '1.0' : '0.0',
            lastUsed: new Date(),
          }).onConflictDoNothing();
        }
      }
    } catch {
    }
  }

  async queryRAG(query: string, category: string = 'all'): Promise<RAGContext> {
    const vectorResults = await localAI.searchSimilar(query, category, 10);

    const ragResults: RAGResult[] = vectorResults.map(r => ({
      content: r.content,
      similarity: r.similarity,
      source: r.sourceType,
      category: r.category,
      metadata: r.metadata || {},
    }));

    let dbResults: RAGResult[] = [];
    try {
      const knowledgeRows = await db.select()
        .from(domainKnowledgeBase)
        .limit(20);

      for (const row of knowledgeRows) {
        const sim = localAI.computeTextSimilarity(query, (row.knowledge as any)?.description || '');
        if (sim > 0.2) {
          dbResults.push({
            content: JSON.stringify(row.knowledge),
            similarity: sim,
            source: 'domain_knowledge',
            category: row.domainName || 'general',
            metadata: { domain: row.domainName },
          });
        }
      }
    } catch {
    }

    const allResults = [...ragResults, ...dbResults]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    const topContent = allResults.slice(0, 3).map(r => r.content).join('\n');
    const confidence = allResults.length > 0 ? allResults[0].similarity : 0;

    return {
      query,
      results: allResults,
      confidence,
      synthesizedAnswer: topContent || 'No relevant knowledge found',
    };
  }

  async enhancePlanWithKnowledge(
    projectType: string,
    domain: string,
    entities: string[]
  ): Promise<{
    suggestedEntities: string[];
    suggestedFeatures: string[];
    suggestedPatterns: string[];
    warnings: string[];
  }> {
    const rag = await this.queryRAG(`${projectType} ${domain} ${entities.join(' ')}`, 'generation');

    const suggestedEntities: string[] = [];
    const suggestedFeatures: string[] = [];
    const suggestedPatterns: string[] = [];
    const warnings: string[] = [];

    for (const result of rag.results) {
      try {
        const data = JSON.parse(result.content);
        if (data.entities) {
          for (const e of data.entities) {
            if (!entities.includes(e) && !suggestedEntities.includes(e)) {
              suggestedEntities.push(e);
            }
          }
        }
        if (data.patterns) {
          for (const p of data.patterns) {
            if (!suggestedPatterns.includes(p)) suggestedPatterns.push(p);
          }
        }
      } catch {
      }
    }

    const templateArchetypes = templateRegistry.findArchetypes(`${projectType} ${domain}`, 2);
    for (const archetype of templateArchetypes) {
      if (archetype.matchScore > 0.3) {
        for (const entity of archetype.entities) {
          if (!entities.includes(entity.name) && !suggestedEntities.includes(entity.name)) {
            suggestedEntities.push(entity.name);
          }
        }
        for (const feature of archetype.features) {
          if (!suggestedFeatures.includes(feature)) {
            suggestedFeatures.push(feature);
          }
        }
      }
    }

    const domainProfile = templateRegistry.findDomainProfile(domain);
    if (domainProfile) {
      for (const rule of domainProfile.businessRules) {
        if (!suggestedPatterns.includes(rule)) {
          suggestedPatterns.push(rule);
        }
      }
    }

    const topErrors = Array.from(this.errorFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [errorKey, count] of topErrors) {
      if (count >= 3) {
        warnings.push(`Recurring issue: ${errorKey} (occurred ${count} times)`);
      }
    }

    return { suggestedEntities, suggestedFeatures, suggestedPatterns, warnings };
  }

  async getStats(): Promise<LearningStats> {
    const topPatterns = Array.from(this.patternFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    const domainCounts = new Map<string, number>();
    for (const outcome of this.outcomeCache.values()) {
      domainCounts.set(outcome.domain, (domainCounts.get(outcome.domain) || 0) + 1);
    }
    const topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    const errorFreq = Array.from(this.errorFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const avgQuality = this.qualityHistory.length > 0
      ? this.qualityHistory.reduce((s, q) => s + q, 0) / this.qualityHistory.length
      : 0;

    let trend = 0;
    if (this.qualityHistory.length >= 10) {
      const recent = this.qualityHistory.slice(-5);
      const older = this.qualityHistory.slice(-10, -5);
      const recentAvg = recent.reduce((s, q) => s + q, 0) / recent.length;
      const olderAvg = older.reduce((s, q) => s + q, 0) / older.length;
      trend = recentAvg - olderAvg;
    }

    return {
      totalOutcomes: this.outcomeCache.size,
      averageQuality: Math.round(avgQuality * 100) / 100,
      topPatterns,
      topDomains,
      errorFrequency: errorFreq,
      improvementTrend: Math.round(trend * 100) / 100,
    };
  }

  async recordFeedback(
    pipelineId: string,
    rating: number,
    comment: string
  ): Promise<void> {
    try {
      await db.insert(learningFeedback).values({
        sourceType: 'generation',
        sourceId: pipelineId,
        feedbackType: 'rating',
        rating,
        comment,
        applied: false,
      });
    } catch {
    }

    const outcome = this.outcomeCache.get(pipelineId);
    if (outcome) {
      outcome.userFeedback = comment;

      if (rating >= 4) {
        for (const pattern of outcome.patterns) {
          pattern.confidence = Math.min(1, pattern.confidence + 0.1);
        }
      } else if (rating <= 2) {
        for (const pattern of outcome.patterns) {
          pattern.confidence = Math.max(0, pattern.confidence - 0.1);
        }
      }
    }
  }

  getRecommendations(projectType: string): string[] {
    const recommendations: string[] = [];

    const topPatterns = Array.from(this.patternFrequency.entries())
      .filter(([key]) => key.includes(projectType))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [key, count] of topPatterns) {
      recommendations.push(`Pattern "${key}" has been successful ${count} time(s)`);
    }

    const avgQuality = this.qualityHistory.length > 0
      ? this.qualityHistory.reduce((s, q) => s + q, 0) / this.qualityHistory.length
      : 75;

    if (avgQuality < 70) {
      recommendations.push('Quality scores trending low - review constraint analysis');
    }

    if (this.errorFrequency.size > 0) {
      const topError = Array.from(this.errorFrequency.entries())
        .sort((a, b) => b[1] - a[1])[0];
      if (topError && topError[1] >= 3) {
        recommendations.push(`Address recurring error: ${topError[0]}`);
      }
    }

    return recommendations;
  }
}

export const learningBrain = new ContinuousLearningBrain();