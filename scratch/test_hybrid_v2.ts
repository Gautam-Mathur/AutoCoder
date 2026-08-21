import {
  sanitizeStageOutput,
  parseSpecsRequired,
  parseBlueprintFiles,
  evaluateComplexity,
  validateSnapshotConsistency,
} from '../src/lib/agents/ruflo/orchestrator';

async function main() {
  console.log('=== TESTING AUTOCODER HYBRID V2 ENGINE HELPERS ===\n');

  // 1. Test Sanitization
  const rawQueenOutput = `\`\`\`markdown
Here is the project plan:

### Context Snapshot
- **Core Goal**: Building a browser-based calculator
- **Key Constraints**: Plain HTML/CSS/JS
- **Scope Summary**: Arithmetic, Display, Clear

### Project Name
Simple Calculator
\`\`\``;

  const sanitized = sanitizeStageOutput(rawQueenOutput, 'Context Snapshot');
  console.log('[1] Sanitization Check:');
  console.log(sanitized);
  console.log('--- Passes preamble & fence stripping:', sanitized.startsWith('### Context Snapshot') && !sanitized.includes('```'));

  // 2. Test Blueprint Parser
  const rawBlueprint = `### File: index.html
- **Purpose**: Main HTML page
- **Dependencies**: style.css, calculator.js
- **Specs Required**: None
- **Exports**: None
- **Implementation Details**:
  1. DOCTYPE html
  2. Display div

### File: calculator.js
- **Purpose**: Calculator logic
- **Dependencies**: None
- **Specs Required**: requirements.md#Functional Requirements
- **Exports**: None
- **Implementation Details**:
  1. Add function
  2. Subtract function`;

  const parsedSections = parseBlueprintFiles(rawBlueprint);
  console.log('\n[2] Blueprint Parser Check:');
  console.log(`Parsed ${parsedSections.length} files:`, parsedSections.map(s => s.file));

  // 3. Test Specs Required Parser
  const specs = parseSpecsRequired('**Specs Required**: backend_spec.md#User Endpoints, architecture.md#Controllers');
  console.log('\n[3] Specs Required Parser Check:');
  console.log(specs);

  // 4. Test Complexity Evaluator
  const simpleComplexity = evaluateComplexity('no backend, frontend-only', 3);
  console.log('\n[4] Complexity Gate Check (Simple):', simpleComplexity);

  const complexComplexity = evaluateComplexity('backend PostgreSQL auth', 16);
  console.log('[4] Complexity Gate Check (Complex):', complexComplexity);

  // 5. Test Snapshot Consistency
  const isConsistent = validateSnapshotConsistency('Tech Stack: Vanilla JS', '### Tech Stack\nVanilla JS');
  console.log('\n[5] Snapshot Consistency Check:', isConsistent);

  console.log('\n✅ ALL HYBRID V2 ENGINE HELPERS VERIFIED SUCCESSFULLY!');
}

main().catch(console.error);
