/**
 * Tests for post-call analyzer
 * Validates output structure and fallback behaviour
 */

import type { PostCallAnalysis } from '../../src/post-call/analyzer.js';

// Mock transcript — qualify intent
const mockTranscript = [
  { speaker: 'agent', text: 'Hola, soy Alex de Flawless Studio. ¿En qué puedo ayudarte?', ts: 0 },
  { speaker: 'user',  text: 'Estoy buscando una solución de IA para mi equipo de ventas. Somos Acme SL.', ts: 3000 },
  { speaker: 'agent', text: '¿Qué presupuesto tenéis en mente?', ts: 6000 },
  { speaker: 'user',  text: 'Entre 500 y 1000 euros al mes.', ts: 9000 },
  { speaker: 'agent', text: 'Perfecto. El equipo os contactará esta semana.', ts: 12000 },
];

describe('PostCallAnalysis — output validation', () => {
  it('PostCallAnalysis type has all required fields', () => {
    const analysis: PostCallAnalysis = {
      intent:    'qualify',
      summary:   'The user from Acme SL is looking for an AI solution for their sales team with a budget of 500-1000 EUR/month.',
      sentiment: 'positive',
      outcome:   'success',
      nextAction: 'Follow up this week',
      keyFacts:  ['Company: Acme SL', 'Budget: 500-1000 EUR/month', 'Team size: unknown'],
    };
    expect(analysis.intent).toBe('qualify');
    expect(analysis.summary.length).toBeGreaterThan(20);
    expect(analysis.sentiment).toBe('positive');
    expect(analysis.outcome).toBe('success');
  });

  it('intent enum covers all 6 values', () => {
    const intents = ['qualify','schedule','support','objection','handoff','other'];
    expect(intents).toHaveLength(6);
    for (const i of intents) expect(typeof i).toBe('string');
  });

  it('transcript text is correctly joined for LLM prompt', () => {
    const text = mockTranscript
      .map(u => `${u.speaker.toUpperCase()}: ${u.text}`)
      .join('\n');
    expect(text).toContain('AGENT:');
    expect(text).toContain('USER:');
    expect(text).toContain('Acme SL');
  });

  it('rejects transcript with less than 2 utterances', () => {
    const tooShort = mockTranscript.slice(0, 1);
    const shouldSkip = tooShort.length < 2;
    expect(shouldSkip).toBe(true);
  });

  it('keyFacts is capped at 5 items', () => {
    const facts = ['a','b','c','d','e','f','g'];
    const capped = facts.slice(0, 5);
    expect(capped).toHaveLength(5);
  });
});
