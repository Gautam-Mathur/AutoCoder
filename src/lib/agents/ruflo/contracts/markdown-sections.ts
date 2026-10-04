/**
 * Exact, line-based markdown heading utilities shared by every stage validator.
 *
 * Headings are matched as complete lines (never as substrings), so prose such as
 * `The section "### Components" should exist.` can never satisfy a heading check.
 */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseHeading(heading: string): { level: number; text: string } {
  const match = heading.trim().match(/^(#{1,6})\s+(.*?)\s*$/);
  if (!match) {
    return { level: 0, text: heading.trim() };
  }
  return { level: match[1].length, text: match[2] };
}

function buildHeadingRegex(heading: string): RegExp {
  const { level, text } = parseHeading(heading);
  const escapedText = escapeRegex(text).replace(/\s+/g, '\\s+');
  if (level === 0) {
    return new RegExp(`^(?:#{1,6}\\s+)?${escapedText}\\s*$`);
  }
  return new RegExp(`^#{${level}}\\s+${escapedText}\\s*$`);
}


function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').split('\n');
}

export function countHeading(content: string, heading: string): number {
  const regex = buildHeadingRegex(heading);
  return splitLines(content).filter((line) => regex.test(line.trim())).length;
}

export function hasHeading(content: string, heading: string): boolean {
  return countHeading(content, heading) > 0;
}

/**
 * Extracts the body of the first exact heading line until the next `#`, `##`, or `###` heading line.
 */
export function extractRequiredSection(content: string, heading: string): string {
  const regex = buildHeadingRegex(heading);
  const lines = splitLines(content);
  const startIdx = lines.findIndex((line) => regex.test(line.trim()));
  if (startIdx === -1) return '';

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,3}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n').trim();
}

/**
 * Returns validation errors for missing and duplicate required headings.
 */
export function validateRequiredHeadings(
  stageLabel: string,
  content: string,
  headings: readonly string[]
): string[] {
  const errors: string[] = [];
  for (const heading of headings) {
    const count = countHeading(content, heading);
    if (count === 0) {
      errors.push(`${stageLabel} candidate output must contain "${heading}".`);
    } else if (count > 1) {
      errors.push(`${stageLabel} candidate output contains duplicate "${heading}" sections.`);
    }
  }
  return errors;
}
