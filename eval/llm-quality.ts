/**
 * eval/llm-quality.ts — LLM output quality evaluation
 *
 * Evaluates whether the post-call analyzer produced accurate results
 * by using a judge LLM (gpt-4o) to score intent accuracy and summary faithfulness.
 *
 * Pattern: LLM-as-judge (standard in LangSmith, Braintrust, Hamming)
 *
 * Usage:
 *   npx tsx eval/llm-quality.ts <session.json>
 *
 * Output: score 0-100 per dimension + pass/fail
 */

import fs from 'fs';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface LLMEvalResult {
  sessionId:         string;
  intentAccuracy:    number;   // 0-5
  summaryFaithful:   number;   // 0-5
  sentimentAccuracy: number;   // 0-5
  overallScore:      number;   // 0-100
  passed:            boolean;
  feedback:          string;
}

const JUDGE_PROMPT = `You are a call quality judge. Given a transcript and post-call analysis, score each dimension from 0 to 5:

- intentAccuracy: Does the detected intent match the actual user goal in the transcript? (0=wrong, 5=perfect)
- summaryFaithful: Is the summary accurate and complete based on the transcript? (0=fabricated, 5=perfect)
- sentimentAccuracy: Does the sentiment match the user's tone in the transcript? (0=wrong, 5=perfect)

Also provide one sentence of feedback.

Return ONLY valid JSON: { "intentAccuracy": N, "summaryFaithful": N, "sentimentAccuracy": N, "feedback": "..." }`;

async function evalLLMQuality(raw: string): Promise<LLMEvalResult> {
  const session = JSON.parse(raw);

  const transcriptText = (session.transcript ?? [])
    .map((u: any) => `${u.speaker.toUpperCase()}: ${u.text}`)
    .join('\n');

  const analysisText = JSON.stringify({
    intent:    session.intent,
    summary:   session.summary,
    sentiment: session.sentiment,
    outcome:   session.outcome,
  }, null, 2);

  const response = await openai.chat.completions.create({
    model:           'gpt-4o',
    temperature:     0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: JUDGE_PROMPT },
      { role: 'user', content: `TRANSCRIPT:\n${transcriptText}\n\nANALYSIS:\n${analysisText}` },
    ],
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}');

  const intentAccuracy    = Math.min(5, Math.max(0, Number(parsed.intentAccuracy    ?? 0)));
  const summaryFaithful   = Math.min(5, Math.max(0, Number(parsed.summaryFaithful   ?? 0)));
  const sentimentAccuracy = Math.min(5, Math.max(0, Number(parsed.sentimentAccuracy ?? 0)));
  const overallScore      = Math.round(((intentAccuracy + summaryFaithful + sentimentAccuracy) / 15) * 100);

  return {
    sessionId:         session.sessionId ?? 'unknown',
    intentAccuracy,
    summaryFaithful,
    sentimentAccuracy,
    overallScore,
    passed:            overallScore >= 70,
    feedback:          parsed.feedback ?? 'No feedback',
  };
}

// CLI
const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx eval/llm-quality.ts <session.json>');
  process.exit(1);
}

const raw    = fs.readFileSync(file, 'utf-8');
const result = await evalLLMQuality(raw);

console.log(`\nLLM Quality Eval: ${result.sessionId}`);
console.log(`Overall: ${result.overallScore}/100 — ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Intent accuracy:    ${result.intentAccuracy}/5`);
console.log(`  Summary faithful:   ${result.summaryFaithful}/5`);
console.log(`  Sentiment accuracy: ${result.sentimentAccuracy}/5`);
console.log(`  Feedback: ${result.feedback}`);
