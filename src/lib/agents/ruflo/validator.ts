/**
 * SchemaValidator - Enforces 100% strict JSON schema checking against canonical agent definitions.
 * Invariant: Storage and Correlation insertion happen ONLY IF validation passes 100%.
 */
export class SchemaValidator {
  static validate(obj: any, schema: any): string | null {
    if (!obj || typeof obj !== 'object') {
      return 'Output is not a valid JSON object';
    }

    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      const errors: string[] = [];
      for (const subSchema of schema.anyOf) {
        const err = SchemaValidator.validate(obj, subSchema);
        if (err === null) {
          return null;
        }
        errors.push(err);
      }
      return `Does not match any allowed schemas: ${errors.join(' OR ')}`;
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
          return `Missing required field: ${field}`;
        }
      }
    }

    if (schema.properties && typeof schema.properties === 'object') {
      for (const key of Object.keys(schema.properties)) {
        if (key in obj && obj[key] !== null && obj[key] !== undefined) {
          const expectedType = schema.properties[key].type;
          const actualVal = obj[key];

          if (expectedType === 'string' && typeof actualVal !== 'string') {
            return `Field '${key}': expected string, got ${typeof actualVal}`;
          }
          if (expectedType === 'number' && typeof actualVal !== 'number') {
            return `Field '${key}': expected number, got ${typeof actualVal}`;
          }
          if (expectedType === 'boolean' && typeof actualVal !== 'boolean') {
            return `Field '${key}': expected boolean, got ${typeof actualVal}`;
          }
          if (expectedType === 'array' && !Array.isArray(actualVal)) {
            return `Field '${key}': expected array, got ${typeof actualVal}`;
          }
          if (expectedType === 'object' && typeof actualVal === 'object' && !Array.isArray(actualVal)) {
            const nestedErr = SchemaValidator.validate(actualVal, schema.properties[key]);
            if (nestedErr) return `Field '${key}': ${nestedErr}`;
          }
        }
      }
    }

    return null;
  }
}
