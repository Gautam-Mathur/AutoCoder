/**
 * SLM Training Data Collector — Captures generation data for future SLM fine-tuning
 *
 * Records (stage, input, rule_output, slm_output, rule_score, slm_score, winner, delta, exec_time)
 * per generation as JSONL per stage.
 *
 * Tracks high-scoring outputs for curating fine-tuning datasets.
 * All data stored locally — no external calls.
 */

export interface TrainingRecord {
  id: string;
  timestamp: number;
  stage: string;
  input: Record<string, any>;
  ruleOutput: any;
  slmOutput: any | null;
  ruleScore: number;
  slmScore: number;
  winner: 'rules' | 'slm' | 'merged' | 'rules-only';
  scoreDelta: number;
  executionTimeMs: number;
  modelId: string | null;
  metadata: Record<string, any>;
}

export interface StageStats {
  stage: string;
  totalRuns: number;
  slmWins: number;
  ruleWins: number;
  mergedWins: number;
  rulesOnlyRuns: number;
  avgRuleScore: number;
  avgSlmScore: number;
  avgDelta: number;
  avgLatencyMs: number;
  bestSlmScore: number;
  worstSlmScore: number;
  slmWinRate: number;
}

export interface CollectorConfig {
  maxRecordsPerStage: number;
  highScoreThreshold: number;
  autoExportThreshold: number;
}

const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
  maxRecordsPerStage: 10000,
  highScoreThreshold: 0.85,
  autoExportThreshold: 1000,
};

let config = { ...DEFAULT_COLLECTOR_CONFIG };

const stageRecords: Map<string, TrainingRecord[]> = new Map();
const stageStats: Map<string, StageStats> = new Map();

let recordCounter = 0;

function generateId(): string {
  recordCounter++;
  return `tr_${Date.now()}_${recordCounter}`;
}

function ensureStage(stage: string): void {
  if (!stageRecords.has(stage)) {
    stageRecords.set(stage, []);
    stageStats.set(stage, {
      stage,
      totalRuns: 0,
      slmWins: 0,
      ruleWins: 0,
      mergedWins: 0,
      rulesOnlyRuns: 0,
      avgRuleScore: 0,
      avgSlmScore: 0,
      avgDelta: 0,
      avgLatencyMs: 0,
      bestSlmScore: 0,
      worstSlmScore: 1,
      slmWinRate: 0,
    });
  }
}

function updateRunningAverage(current: number, newValue: number, count: number): number {
  return (current * (count - 1) + newValue) / count;
}

export function configureCollector(newConfig: Partial<CollectorConfig>): void {
  config = { ...config, ...newConfig };
}

export function recordTrainingData(
  stage: string,
  input: Record<string, any>,
  ruleOutput: any,
  slmOutput: any | null,
  ruleScore: number,
  slmScore: number,
  winner: 'rules' | 'slm' | 'merged' | 'rules-only',
  executionTimeMs: number,
  modelId?: string,
  metadata?: Record<string, any>
): TrainingRecord {
  ensureStage(stage);

  const record: TrainingRecord = {
    id: generateId(),
    timestamp: Date.now(),
    stage,
    input: sanitizeForStorage(input),
    ruleOutput: sanitizeForStorage(ruleOutput),
    slmOutput: slmOutput ? sanitizeForStorage(slmOutput) : null,
    ruleScore,
    slmScore,
    winner,
    scoreDelta: slmScore - ruleScore,
    executionTimeMs,
    modelId: modelId || null,
    metadata: metadata || {},
  };

  const records = stageRecords.get(stage)!;
  records.push(record);

  if (records.length > config.maxRecordsPerStage) {
    records.shift();
  }

  const stats = stageStats.get(stage)!;
  stats.totalRuns++;

  if (winner === 'slm') stats.slmWins++;
  else if (winner === 'rules') stats.ruleWins++;
  else if (winner === 'merged') stats.mergedWins++;
  else stats.rulesOnlyRuns++;

  stats.avgRuleScore = updateRunningAverage(stats.avgRuleScore, ruleScore, stats.totalRuns);
  stats.avgSlmScore = updateRunningAverage(stats.avgSlmScore, slmScore, stats.totalRuns);
  stats.avgDelta = updateRunningAverage(stats.avgDelta, record.scoreDelta, stats.totalRuns);
  stats.avgLatencyMs = updateRunningAverage(stats.avgLatencyMs, executionTimeMs, stats.totalRuns);

  if (slmScore > stats.bestSlmScore) stats.bestSlmScore = slmScore;
  if (slmOutput !== null && slmScore < stats.worstSlmScore) stats.worstSlmScore = slmScore;

  const slmAttempts = stats.totalRuns - stats.rulesOnlyRuns;
  stats.slmWinRate = slmAttempts > 0 ? stats.slmWins / slmAttempts : 0;

  return record;
}

function sanitizeForStorage(obj: any): any {
  try {
    const str = JSON.stringify(obj);
    if (str.length > 50000) {
      return { _truncated: true, _size: str.length, _preview: str.substring(0, 1000) };
    }
    return obj;
  } catch {
    return { _error: 'Could not serialize' };
  }
}

export function getStageStats(stage: string): StageStats | null {
  return stageStats.get(stage) || null;
}

export function getAllStageStats(): StageStats[] {
  return Array.from(stageStats.values());
}

export function getHighScoringRecords(stage: string, minScore?: number): TrainingRecord[] {
  const threshold = minScore ?? config.highScoreThreshold;
  const records = stageRecords.get(stage) || [];
  return records.filter(r => r.slmScore >= threshold && r.winner === 'slm');
}

export function getTrainingPairs(stage: string, options?: {
  minScore?: number;
  winnerOnly?: boolean;
  limit?: number;
}): Array<{ input: any; output: any; score: number }> {
  const records = stageRecords.get(stage) || [];
  const minScore = options?.minScore ?? 0;
  const winnerOnly = options?.winnerOnly ?? true;
  const limit = options?.limit ?? 1000;

  return records
    .filter(r => {
      if (winnerOnly && r.winner !== 'slm') return false;
      if (r.slmScore < minScore) return false;
      return r.slmOutput !== null;
    })
    .sort((a, b) => b.slmScore - a.slmScore)
    .slice(0, limit)
    .map(r => ({
      input: r.input,
      output: r.slmOutput,
      score: r.slmScore,
    }));
}

export function exportStageDataAsJSONL(stage: string): string {
  const records = stageRecords.get(stage) || [];
  return records.map(r => JSON.stringify(r)).join('\n');
}

export function exportAllDataAsJSONL(): Map<string, string> {
  const result = new Map<string, string>();
  stageRecords.forEach((_records, stage) => {
    result.set(stage, exportStageDataAsJSONL(stage));
  });
  return result;
}

export function getCollectorSummary(): {
  stages: string[];
  totalRecords: number;
  stageBreakdown: Array<{ stage: string; records: number; slmWinRate: number }>;
} {
  const stages = Array.from(stageRecords.keys());
  let totalRecords = 0;

  const stageBreakdown = stages.map(stage => {
    const records = stageRecords.get(stage)!;
    const stats = stageStats.get(stage)!;
    totalRecords += records.length;
    return {
      stage,
      records: records.length,
      slmWinRate: stats.slmWinRate,
    };
  });

  return { stages, totalRecords, stageBreakdown };
}

export function clearStageData(stage: string): void {
  stageRecords.delete(stage);
  stageStats.delete(stage);
}

export function clearAllData(): void {
  stageRecords.clear();
  stageStats.clear();
  recordCounter = 0;
}