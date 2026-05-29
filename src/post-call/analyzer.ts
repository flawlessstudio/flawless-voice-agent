/**
 * analyzer.ts — Post-call LLM analysis
 *
 * Uses OpenAI (non-realtime, standard chat completions) to analyze
 * the full transcript and extract structured data.
 *
 * Returns a validated PostCallAnalysis object.
 * Never runs during the call — only invoked from crm-enricher.ts after call end.
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PostCallAnalysis {
  intent:    'qualify' | 'schedule' | 'support' | 'objection' | 'handoff' | 'other';
  summary:   string;
  sentiment: 'positive' | 'neutral' | 'negative';
  outcome:   'success' | 'callback' | 'not_interested' | 'transferred' | 'voicemail' | 'no_answer';
  nextAction?: string;
  keyFacts?:   string[];
}

const SYSTEM_PROMPT = `You are a call analysis assistant. Given a conversation transcript between an AI voice agent and a user, extract the following fields as valid JSON:

- intent: the primary intent of the user (one of: qualify, schedule, support, objection, handoff, other)
- summary: a 2-3 sentence factual summary of what was discussed and agreed
- sentiment: overall user sentiment (positive, neutral, negative)
- outcome: final call outcome (success, callback, not_interested, transferred, voicemail, no_answer)
- nextAction: (optional) recommended next action for the sales/support team
- keyFacts: (optional) array of up to 5 key facts extracted (name, company, need, budget, deadline)

Return ONLY valid JSON, no prose, no markdown.`;

export async function analyzeTranscript(
  transcript: { speaker: string; text: string; ts: number }[]
): Promise<PostCallAnalysis> {
  const transcriptText = transcript
    .map(u => `${u.speaker.toUpperCase()}: ${u.text}`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model:       process.env.ANALYSIS_MODEL ?? 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system',  content: SYSTEM_PROMPT },
      { role: 'user',    content: `TRANSCRIPT:\n${transcriptText}` },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  let parsed: Partial<PostCallAnalysis>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`analyzer: invalid JSON from LLM: ${raw}`);
  }

  // Validate required fields with safe fallbacks
  const VALID_INTENTS    = ['qualify','schedule','support','objection','handoff','other'] as const;
  const VALID_SENTIMENTS = ['positive','neutral','negative'] as const;
  const VALID_OUTCOMES   = ['success','callback','not_interested','transferred','voicemail','no_answer'] as const;

  return {
    intent:    VALID_INTENTS.includes(parsed.intent as any)    ? parsed.intent!    : 'other',
    summary:   typeof parsed.summary === 'string'              ? parsed.summary    : 'No summary available.',
    sentiment: VALID_SENTIMENTS.includes(parsed.sentiment as any) ? parsed.sentiment! : 'neutral',
    outcome:   VALID_OUTCOMES.includes(parsed.outcome as any)  ? parsed.outcome!   : 'callback',
    nextAction: parsed.nextAction,
    keyFacts:   Array.isArray(parsed.keyFacts) ? parsed.keyFacts.slice(0, 5) : undefined,
  };
}
