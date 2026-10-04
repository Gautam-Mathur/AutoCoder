import type { StageName } from './versions';

/**
 * Single canonical stage dependency graph.
 *
 * Every other representation of stage ordering/dependencies is derived from this graph:
 *   - orchestrator stage order (getCanonicalStageOrder)
 *   - invalidation rules (getDescendantStages)
 *   - final gate lineage (getStageAncestors)
 *   - registry / test expectations (assertRegistryMatchesStageGraph in the invariant script and tests)
 */
export const CANONICAL_STAGE_GRAPH: Record<StageName, readonly StageName[]> = {
  Queen: [],
  Planner: ['Queen'],
  Architect: ['Planner', 'Queen'],
  System: ['Architect', 'Planner'],
  Designer: ['Architect', 'Planner'],
  Blueprinter: ['Architect', 'System', 'Designer'],
  Coder: ['Blueprinter', 'Architect', 'System', 'Designer'],
  Tester: ['Coder'],
  Debugger: ['Tester', 'Coder'],
  Security: ['Coder', 'Architect'],
  Reviewer: ['Tester', 'Coder', 'Architect'],
};

const STAGE_DECLARATION_ORDER = Object.keys(CANONICAL_STAGE_GRAPH) as StageName[];

/**
 * Deterministic topological order of the canonical graph (Kahn's algorithm,
 * ties broken by declaration order).
 */
export function getCanonicalStageOrder(): StageName[] {
  const remaining = new Set<StageName>(STAGE_DECLARATION_ORDER);
  const placed = new Set<StageName>();
  const order: StageName[] = [];

  while (remaining.size > 0) {
    const next = STAGE_DECLARATION_ORDER.find(
      (stage) =>
        remaining.has(stage) &&
        CANONICAL_STAGE_GRAPH[stage].every((dep) => placed.has(dep))
    );
    if (!next) {
      throw new Error('Canonical stage graph contains a dependency cycle.');
    }
    remaining.delete(next);
    placed.add(next);
    order.push(next);
  }

  return order;
}

/**
 * Transitive upstream stages of a stage.
 */
export function getStageAncestors(stageName: StageName): StageName[] {
  const result = new Set<StageName>();
  const stack: StageName[] = [...CANONICAL_STAGE_GRAPH[stageName]];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    stack.push(...CANONICAL_STAGE_GRAPH[current]);
  }
  return getCanonicalStageOrder().filter((s) => result.has(s));
}

/**
 * Transitive downstream stages of a stage (every stage that directly or
 * indirectly consumes its output).
 */
export function getDescendantStages(stageName: StageName): StageName[] {
  const result = new Set<StageName>();
  const stack: StageName[] = [stageName];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const candidate of STAGE_DECLARATION_ORDER) {
      if (CANONICAL_STAGE_GRAPH[candidate].includes(current) && !result.has(candidate)) {
        result.add(candidate);
        stack.push(candidate);
      }
    }
  }
  return getCanonicalStageOrder().filter((s) => result.has(s));
}

/**
 * Returns graph validation errors: self-consumption, unknown stages, cycles.
 */
export function validateStageGraph(): string[] {
  const errors: string[] = [];
  for (const stage of STAGE_DECLARATION_ORDER) {
    for (const dep of CANONICAL_STAGE_GRAPH[stage]) {
      if (dep === stage) {
        errors.push(`Stage ${stage} consumes its own output.`);
      }
      if (!STAGE_DECLARATION_ORDER.includes(dep)) {
        errors.push(`Stage ${stage} depends on unknown stage ${dep}.`);
      }
    }
  }
  try {
    getCanonicalStageOrder();
  } catch (e: any) {
    errors.push(e.message);
  }
  return errors;
}
