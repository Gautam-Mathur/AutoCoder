/**
 * OutputNormalizer - Pre-processes LLM JSON before validation:
 * - Converts empty strings "" for optional relational/foreign fields to null.
 * - Coerces scalar types ("true" -> true, "10" -> 10).
 * - Standardizes enum cases ('get' -> 'GET').
 */
export class OutputNormalizer {
  static normalize(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => OutputNormalizer.normalize(item));
    }

    const normalized: Record<string, any> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (val === '') {
        // Convert empty string to null for optional relational or structural fields
        normalized[key] = null;
      } else if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        if (lower === 'true') {
          normalized[key] = true;
        } else if (lower === 'false') {
          normalized[key] = false;
        } else if (/^\d+$/.test(val) && !key.toLowerCase().includes('id') && !key.toLowerCase().includes('version') && !key.toLowerCase().includes('code')) {
          normalized[key] = parseInt(val, 10);
        } else if (key === 'method' && ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(lower)) {
          normalized[key] = val.toUpperCase();
        } else if (key === 'overallStatus' && lower === 'success') {
          normalized[key] = 'PASSED';
        } else {
          normalized[key] = val;
        }
      } else if (typeof val === 'object' && val !== null) {
        normalized[key] = OutputNormalizer.normalize(val);
      } else {
        normalized[key] = val;
      }
    }

    return normalized;
  }
}
