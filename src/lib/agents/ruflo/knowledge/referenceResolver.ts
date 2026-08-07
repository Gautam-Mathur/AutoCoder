import { ReferenceStore, ReferenceDocument } from './referenceStore';

export function resolveReferences(requestedKeys: string[]): ReferenceDocument[] {
  if (!requestedKeys || requestedKeys.length === 0) return [];
  const store = ReferenceStore.getInstance();
  const results: ReferenceDocument[] = [];
  const seen = new Set<string>();

  for (const rawKey of requestedKeys) {
    if (!rawKey) continue;
    const key = rawKey.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const doc = store.getReference(key);
    if (doc) {
      results.push(doc);
    }
  }

  return results;
}
