/**
 * Eval: Call quality scoring
 * Scores a completed VoiceSession against quality criteria.
 * Run: npx tsx eval/call-quality.ts <session-json-file>
 *
 * Criteria:
 * - Transcript length (>= 2 utterances)
 * - Intent detected
 * - Summary present
 * - CRM sync completed
 * - Call duration within expected range
 */

import fs from 'fs';

interface EvalResult {
  sessionId:  string;
  score:      number;    // 0-100
  passed:     boolean;
  checks:     { name: string; passed: boolean; detail: string }[];
}

function evalSession(raw: string): EvalResult {
  const session = JSON.parse(raw);
  const checks: EvalResult['checks'] = [];

  // 1. Transcript has content
  const hasTranscript = Array.isArray(session.transcript) && session.transcript.length >= 2;
  checks.push({
    name:   'transcript_content',
    passed: hasTranscript,
    detail: `${session.transcript?.length ?? 0} utterances`,
  });

  // 2. Intent detected
  const hasIntent = !!session.intent && session.intent !== 'other';
  checks.push({
    name:   'intent_detected',
    passed: hasIntent,
    detail: session.intent ?? 'null',
  });

  // 3. Summary present
  const hasSummary = typeof session.summary === 'string' && session.summary.length > 20;
  checks.push({
    name:   'summary_present',
    passed: hasSummary,
    detail: hasSummary ? `${session.summary.length} chars` : 'missing or too short',
  });

  // 4. CRM sync completed
  const crmSynced = session.crm?.hubspot?.synced === true || session.crm?.salesforce?.synced === true;
  checks.push({
    name:   'crm_synced',
    passed: crmSynced,
    detail: JSON.stringify(session.crm),
  });

  // 5. Duration in range (10s – 30min)
  const dur = session.durationMs ?? 0;
  const durOk = dur >= 10_000 && dur <= 1_800_000;
  checks.push({
    name:   'duration_in_range',
    passed: durOk,
    detail: `${Math.round(dur / 1000)}s`,
  });

  const passed = checks.filter(c => c.passed).length;
  const score  = Math.round((passed / checks.length) * 100);

  return {
    sessionId: session.sessionId ?? 'unknown',
    score,
    passed: score >= 80,
    checks,
  };
}

// CLI runner
const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx eval/call-quality.ts <session.json>');
  process.exit(1);
}

const raw    = fs.readFileSync(file, 'utf-8');
const result = evalSession(raw);

console.log(`\nEval: ${result.sessionId}`);
console.log(`Score: ${result.score}/100 — ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`);
for (const c of result.checks) {
  console.log(`  ${c.passed ? '✅' : '❌'} ${c.name.padEnd(22)} ${c.detail}`);
}
