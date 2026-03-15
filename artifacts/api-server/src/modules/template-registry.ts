import { appArchetypes, type AppArchetype } from '../templates/app-archetypes.js';
import { domainProfiles, type DomainProfile } from '../templates/domain-profiles.js';
import { architecturePatterns, type ArchitecturePattern } from '../templates/architecture-patterns.js';
import { schemaTemplates, type SchemaTemplate } from '../templates/schema-templates.js';
import { apiTemplates, type ApiTemplate } from '../templates/api-templates.js';
import { uiComponentTemplates, type UIComponentTemplate } from '../templates/ui-component-templates.js';
import { codeSnippets, type CodeSnippet } from '../templates/code-snippets.js';
import { testPatterns, type TestPattern } from '../templates/test-patterns.js';

type IndexEntry = { tokens: Set<string>; textBlob: string };

function tokenize(input: string): string[] {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(t => t.length > 1);
}

function buildIndex(keywords: string[], ...extraFields: string[]): IndexEntry {
  const allText = [...keywords, ...extraFields].join(' ').toLowerCase();
  const tokens = new Set(tokenize(allText));
  return { tokens, textBlob: allText };
}

function scoreMatch(index: IndexEntry, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  let score = 0;
  for (const qt of queryTokens) {
    if (index.tokens.has(qt)) {
      score += 2;
    } else if (index.textBlob.includes(qt)) {
      score += 1;
    }
  }
  return score / queryTokens.length;
}

interface IndexedItem<T> { item: T; index: IndexEntry }

export class TemplateRegistry {
  private archetypeItems: Array<IndexedItem<AppArchetype>>;
  private domainItems: Array<IndexedItem<DomainProfile>>;
  private architectureItems: Array<IndexedItem<ArchitecturePattern>>;
  private schemaItems: Array<IndexedItem<SchemaTemplate>>;
  private apiItems: Array<IndexedItem<ApiTemplate>>;
  private uiItems: Array<IndexedItem<UIComponentTemplate>>;
  private snippetItems: Array<IndexedItem<CodeSnippet>>;
  private testItems: Array<IndexedItem<TestPattern>>;

  constructor() {
    this.archetypeItems = appArchetypes.map(a => ({
      item: a,
      index: buildIndex(a.keywords, a.name, a.category, a.description, ...a.features),
    }));
    this.domainItems = domainProfiles.map(d => ({
      item: d,
      index: buildIndex(d.keywords, d.name, d.industry, d.description),
    }));
    this.architectureItems = architecturePatterns.map(a => ({
      item: a,
      index: buildIndex(a.keywords, a.name, a.description, a.complexity, ...a.suitableFor),
    }));
    this.schemaItems = schemaTemplates.map(s => ({
      item: s,
      index: buildIndex(s.keywords, s.name, s.category, s.description, ...s.useCases),
    }));
    this.apiItems = apiTemplates.map(a => ({
      item: a,
      index: buildIndex(a.keywords, a.name, a.category, a.description),
    }));
    this.uiItems = uiComponentTemplates.map(u => ({
      item: u,
      index: buildIndex(u.keywords, u.name, u.category, u.description),
    }));
    this.snippetItems = codeSnippets.map(c => ({
      item: c,
      index: buildIndex(c.keywords, c.name, c.category, c.description, c.framework),
    }));
    this.testItems = testPatterns.map(t => ({
      item: t,
      index: buildIndex(t.keywords, t.name, t.category, t.description, t.testType),
    }));
  }

  findArchetypes(userInput: string, limit: number = 5): Array<AppArchetype & { matchScore: number }> {
    const queryTokens = tokenize(userInput);
    const results: Array<AppArchetype & { matchScore: number }> = [];
    for (const entry of this.archetypeItems) {
      const matchScore = scoreMatch(entry.index, queryTokens);
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findDomainProfile(domain: string): DomainProfile | null {
    const lower = domain.toLowerCase();
    for (const entry of this.domainItems) {
      const p = entry.item;
      if (p.name.toLowerCase() === lower || p.industry.toLowerCase() === lower || p.id.toLowerCase() === lower) {
        return p;
      }
    }
    const queryTokens = tokenize(domain);
    let best: DomainProfile | null = null;
    let bestScore = 0;
    for (const entry of this.domainItems) {
      const score = scoreMatch(entry.index, queryTokens);
      if (score > bestScore) {
        bestScore = score;
        best = entry.item;
      }
    }
    return best;
  }

  findDomainProfiles(keywords: string[], limit: number = 5): Array<DomainProfile & { matchScore: number }> {
    const queryTokens = keywords.flatMap(k => tokenize(k));
    const results: Array<DomainProfile & { matchScore: number }> = [];
    for (const entry of this.domainItems) {
      const matchScore = scoreMatch(entry.index, queryTokens);
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findArchitecturePattern(name: string): ArchitecturePattern | null {
    const lower = name.toLowerCase();
    for (const entry of this.architectureItems) {
      const p = entry.item;
      if (p.name.toLowerCase() === lower || p.id.toLowerCase() === lower) {
        return p;
      }
    }
    return null;
  }

  findArchitecturePatterns(criteria: { complexity?: string; keywords?: string[] }, limit: number = 5): Array<ArchitecturePattern & { matchScore: number }> {
    const queryTokens = (criteria.keywords || []).flatMap(k => tokenize(k));
    const results: Array<ArchitecturePattern & { matchScore: number }> = [];
    for (const entry of this.architectureItems) {
      if (criteria.complexity && entry.item.complexity !== criteria.complexity) continue;
      let matchScore = criteria.complexity ? 0.5 : 0;
      if (queryTokens.length > 0) {
        matchScore += scoreMatch(entry.index, queryTokens);
      }
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findSchemaTemplates(entityNames: string[], features: string[], limit: number = 5): Array<SchemaTemplate & { matchScore: number }> {
    const queryTokens = [...entityNames, ...features].flatMap(k => tokenize(k));
    const results: Array<SchemaTemplate & { matchScore: number }> = [];
    for (const entry of this.schemaItems) {
      const matchScore = scoreMatch(entry.index, queryTokens);
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findApiTemplates(categories: string[], limit: number = 5): Array<ApiTemplate & { matchScore: number }> {
    const queryTokens = categories.flatMap(c => tokenize(c));
    const results: Array<ApiTemplate & { matchScore: number }> = [];
    for (const entry of this.apiItems) {
      let matchScore = 0;
      const catLower = entry.item.category.toLowerCase();
      for (const cat of categories) {
        if (catLower === cat.toLowerCase()) {
          matchScore += 2;
        }
      }
      if (queryTokens.length > 0) {
        matchScore += scoreMatch(entry.index, queryTokens);
      }
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findUIComponents(categories: string[], keywords: string[] = [], limit: number = 5): Array<UIComponentTemplate & { matchScore: number }> {
    const queryTokens = [...categories, ...keywords].flatMap(k => tokenize(k));
    const results: Array<UIComponentTemplate & { matchScore: number }> = [];
    for (const entry of this.uiItems) {
      let matchScore = 0;
      const catLower = entry.item.category.toLowerCase();
      for (const cat of categories) {
        if (catLower === cat.toLowerCase()) {
          matchScore += 2;
        }
      }
      if (queryTokens.length > 0) {
        matchScore += scoreMatch(entry.index, queryTokens);
      }
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findCodeSnippets(categories: string[], keywords: string[] = [], limit: number = 5): Array<CodeSnippet & { matchScore: number }> {
    const queryTokens = [...categories, ...keywords].flatMap(k => tokenize(k));
    const results: Array<CodeSnippet & { matchScore: number }> = [];
    for (const entry of this.snippetItems) {
      let matchScore = 0;
      const catLower = entry.item.category.toLowerCase();
      for (const cat of categories) {
        if (catLower === cat.toLowerCase()) {
          matchScore += 2;
        }
      }
      if (queryTokens.length > 0) {
        matchScore += scoreMatch(entry.index, queryTokens);
      }
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  findTestPatterns(testTypes: string[], limit: number = 5): Array<TestPattern & { matchScore: number }> {
    const results: Array<TestPattern & { matchScore: number }> = [];
    for (const entry of this.testItems) {
      let matchScore = 0;
      for (const tt of testTypes) {
        if (entry.item.testType === tt.toLowerCase()) {
          matchScore += 3;
        }
        if (entry.item.category.toLowerCase() === tt.toLowerCase()) {
          matchScore += 2;
        }
      }
      const queryTokens = testTypes.flatMap(t => tokenize(t));
      if (queryTokens.length > 0) {
        matchScore += scoreMatch(entry.index, queryTokens);
      }
      if (matchScore > 0) {
        results.push({ ...entry.item, matchScore });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  getStats(): { archetypes: number; domains: number; architectures: number; schemas: number; apis: number; uiComponents: number; codeSnippets: number; testPatterns: number; total: number } {
    const archetypes = appArchetypes.length;
    const domains = domainProfiles.length;
    const architectures = architecturePatterns.length;
    const schemas = schemaTemplates.length;
    const apis = apiTemplates.length;
    const uiComponents = uiComponentTemplates.length;
    const codeSnippetsCount = codeSnippets.length;
    const testPatternsCount = testPatterns.length;
    return {
      archetypes,
      domains,
      architectures,
      schemas,
      apis,
      uiComponents,
      codeSnippets: codeSnippetsCount,
      testPatterns: testPatternsCount,
      total: archetypes + domains + architectures + schemas + apis + uiComponents + codeSnippetsCount + testPatternsCount,
    };
  }
}

export const templateRegistry = new TemplateRegistry();