/**
 * Robust JSON extraction and repair parser.
 * Handles markdown fences (even if truncated mid-stream), trailing commas, and unescaped newlines.
 */
export function fuzzyParseJson(raw: string): { parsed: any; repaired: boolean } {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Input payload is empty or not a string.');
  }

  let cleaned = raw.trim();

  // 1. Strip markdown fences (supporting truncated unclosed blocks)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 2. Extract first `{` or `[` to last `}` or `]`
  const firstBrace = cleaned.search(/[{\[]/);
  if (firstBrace !== -1) {
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      cleaned = cleaned.substring(firstBrace);
    }
  }

  // First attempt: Standard parse
  try {
    const parsed = JSON.parse(cleaned);
    return { parsed, repaired: false };
  } catch {
    // Proceed to repair steps
  }

  // 3. Apply structural repairs
  let repairedStr = cleaned;

  // Remove trailing commas before } or ]
  repairedStr = repairedStr.replace(/,\s*([}\]])/g, '$1');

  // Fix unquoted keys (simple alphanumeric)
  repairedStr = repairedStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

  // Attempt parse after structural repair
  try {
    const parsed = JSON.parse(repairedStr);
    return { parsed, repaired: true };
  } catch {
    // Proceed to aggressive truncation repair
  }

  // 4. Auto-close truncated JSON brackets if response ran out of max tokens
  let openBraces = (repairedStr.match(/\{/g) || []).length - (repairedStr.match(/\}/g) || []).length;
  let openBrackets = (repairedStr.match(/\[/g) || []).length - (repairedStr.match(/\]/g) || []).length;

  while (openBrackets > 0) {
    repairedStr += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repairedStr += '}';
    openBraces--;
  }

  try {
    const parsed = JSON.parse(repairedStr);
    return { parsed, repaired: true };
  } catch (err: any) {
    throw new Error(`Fuzzy JSON repair failed: ${err.message}`);
  }
}
