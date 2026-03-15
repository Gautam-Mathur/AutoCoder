/**
 * SLM Feedback Loop — Tracks SLM vs rules performance and enables mutual improvement
 *
 * After quality scoring, records which path (rule vs SLM) won per stage.
 * Tracks win rates over time. Auto-promotes high-performing SLM patterns
 * back into rule engines as new heuristics.
 */

import { recordTrainingData, getStageStats, getAllStageStats } from './slm-training-collector.js';
import type { StageStats } from './slm-training-collector.js';

export interface FeedbackEntry {
  stage: string;
  baselineScore: number;
  slmScore: number;
  winner: 'rules' | 'slm' | 'merged' | 'rules-only';
  delta: number;
  executionTimeMs: number;
  timestamp: number;
  generationId: string;
}

export interface StageFeedbackSummary {
  stage: string;
  totalRuns: number;
  slmWinRate: number;
  avgImprovement: number;
  avgLatencyMs: number;
  recommendation: 'promote' | 'keep-hybrid' | 'demote' | 'insufficient-data';
  reason: string;
}

export interface FeedbackLoopConfig {
  promoteThreshold: number;
  demoteThreshold: number;
  minRunsForDecision: number;
  improvementThreshold: number;
}

const DEFAULT_FEEDBACK_CONFIG: FeedbackLoopConfig = {
  promoteThreshold: 0.7,
  demoteThreshold: 0.2,
  minRunsForDecision: 50,
  improvementThreshold: 0.05,
};

let config = { ...DEFAULT_FEEDBACK_CONFIG };

const feedbackHistory: FeedbackEntry[] = [];
const promotedPatterns: Map<string, Array<{ pattern: string; source: string; promotedAt: number }>> = new Map();

let generationCounter = 0;

export function configureFeedbackLoop(newConfig: Partial<FeedbackLoopConfig>): void {
  config = { ...config, ...newConfig };
}

function generateGenerationId(): string {
  generationCounter++;
  return `gen_${Date.now()}_${generationCounter}`;
}

export function recordFeedback(
  stage: string,
  input: Record<string, any>,
  ruleOutput: any,
  slmOutput: any | null,
  ruleScore: number,
  slmScore: number,
  winner: 'rules' | 'slm' | 'merged' | 'rules-only',
  executionTimeMs: number,
  modelId?: string
): FeedbackEntry {
  const generationId = generateGenerationId();
  const delta = slmScore - ruleScore;

  const entry: FeedbackEntry = {
    stage,
    baselineScore: ruleScore,
    slmScore,
    winner,
    delta,
    executionTimeMs,
    timestamp: Date.now(),
    generationId,
  };

  feedbackHistory.push(entry);

  if (feedbackHistory.length > 10000) {
    feedbackHistory.splice(0, feedbackHistory.length - 10000);
  }

  recordTrainingData(
    stage, input, ruleOutput, slmOutput,
    ruleScore, slmScore, winner, executionTimeMs,
    modelId, { generationId }
  );

  return entry;
}

export function getStageFeedbackSummary(stage: string): StageFeedbackSummary {
  const stats = getStageStats(stage);

  if (!stats || stats.totalRuns < 5) {
    return {
      stage,
      totalRuns: stats?.totalRuns || 0,
      slmWinRate: 0,
      avgImprovement: 0,
      avgLatencyMs: 0,
      recommendation: 'insufficient-data',
      reason: `Need at least ${config.minRunsForDecision} runs for a recommendation (have ${stats?.totalRuns || 0})`,
    };
  }

  const recommendation = determineRecommendation(stats);

  return {
    stage,
    totalRuns: stats.totalRuns,
    slmWinRate: stats.slmWinRate,
    avgImprovement: stats.avgDelta,
    avgLatencyMs: stats.avgLatencyMs,
    recommendation: recommendation.action,
    reason: recommendation.reason,
  };
}

function determineRecommendation(stats: StageStats): { action: 'promote' | 'keep-hybrid' | 'demote' | 'insufficient-data'; reason: string } {
  if (stats.totalRuns < config.minRunsForDecision) {
    return {
      action: 'insufficient-data',
      reason: `Need ${config.minRunsForDecision} runs (have ${stats.totalRuns})`,
    };
  }

  if (stats.slmWinRate >= config.promoteThreshold && stats.avgDelta >= config.improvementThreshold) {
    return {
      action: 'promote',
      reason: `SLM wins ${(stats.slmWinRate * 100).toFixed(1)}% of the time with avg +${(stats.avgDelta * 100).toFixed(1)}% improvement — consider promoting SLM patterns to rules`,
    };
  }

  if (stats.slmWinRate <= config.demoteThreshold) {
    return {
      action: 'demote',
      reason: `SLM only wins ${(stats.slmWinRate * 100).toFixed(1)}% — rules consistently better. Consider disabling SLM for this stage.`,
    };
  }

  return {
    action: 'keep-hybrid',
    reason: `SLM wins ${(stats.slmWinRate * 100).toFixed(1)}% with avg delta ${(stats.avgDelta * 100).toFixed(1)}% — hybrid mode is optimal`,
  };
}

export function getAllFeedbackSummaries(): StageFeedbackSummary[] {
  const allStats = getAllStageStats();
  return allStats.map(stats => getStageFeedbackSummary(stats.stage));
}

export function promotePattern(stage: string, pattern: string, source: string): void {
  if (!promotedPatterns.has(stage)) {
    promotedPatterns.set(stage, []);
  }
  promotedPatterns.get(stage)!.push({
    pattern,
    source,
    promotedAt: Date.now(),
  });
}

export function getPromotedPatterns(stage: string): Array<{ pattern: string; source: string; promotedAt: number }> {
  return promotedPatterns.get(stage) || [];
}

export function getFeedbackDashboardData(): {
  stages: StageFeedbackSummary[];
  totalGenerations: number;
  overallSlmWinRate: number;
  averageImprovement: number;
  topPerformingStage: string | null;
  worstPerformingStage: string | null;
  promotedPatternsCount: number;
} {
  const summaries = getAllFeedbackSummaries();
  const allStats = getAllStageStats();

  const totalRuns = allStats.reduce((sum, s) => sum + s.totalRuns, 0);
  const totalSlmWins = allStats.reduce((sum, s) => sum + s.slmWins, 0);
  const slmAttempts = allStats.reduce((sum, s) => sum + s.totalRuns - s.rulesOnlyRuns, 0);

  const sorted = summaries
    .filter(s => s.totalRuns >= config.minRunsForDecision)
    .sort((a, b) => b.slmWinRate - a.slmWinRate);

  let totalPromoted = 0;
  promotedPatterns.forEach(patterns => { totalPromoted += patterns.length; });

  return {
    stages: summaries,
    totalGenerations: totalRuns,
    overallSlmWinRate: slmAttempts > 0 ? totalSlmWins / slmAttempts : 0,
    averageImprovement: allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.avgDelta, 0) / allStats.length
      : 0,
    topPerformingStage: sorted.length > 0 ? sorted[0].stage : null,
    worstPerformingStage: sorted.length > 0 ? sorted[sorted.length - 1].stage : null,
    promotedPatternsCount: totalPromoted,
  };
}

export function getRecentFeedback(limit: number = 20): FeedbackEntry[] {
  return feedbackHistory.slice(-limit);
}

export function clearFeedbackHistory(): void {
  feedbackHistory.length = 0;
  promotedPatterns.clear();
  generationCounter = 0;
}