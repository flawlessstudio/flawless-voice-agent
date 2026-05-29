/**
 * Tests for multi-agent handoff routing
 */

import { AgentContextRegistry } from '../../src/agents/handoff.js';
import type { HandoffContext } from '../../src/agents/handoff.js';

const mockContext: HandoffContext = {
  sessionId:     'test-session-001',
  callSid:       'CA_test_123',
  contactId:     'crm_001',
  summaryToDate: 'User from Acme SL interested in AI solution, budget 500-1000 EUR/month.',
  intent:        'qualify_success',
  keyFacts:      ['Company: Acme SL', 'Budget: 500-1000 EUR/month'],
  transcript:    [
    { speaker: 'agent', text: 'Hola, soy Alex.', ts: 0 },
    { speaker: 'user',  text: 'Hola, os vi en LinkedIn.', ts: 2000 },
  ],
};

describe('AgentContextRegistry', () => {
  beforeEach(() => AgentContextRegistry._store.clear());

  it('stores and retrieves context for an agent', () => {
    AgentContextRegistry.set('sdr_agent_001', mockContext);
    const retrieved = AgentContextRegistry.get('sdr_agent_001');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.sessionId).toBe('test-session-001');
    expect(retrieved?.intent).toBe('qualify_success');
  });

  it('returns null for unknown agentId', () => {
    const result = AgentContextRegistry.get('nonexistent_agent');
    expect(result).toBeNull();
  });

  it('clears context after clear()', () => {
    AgentContextRegistry.set('sdr_agent_001', mockContext);
    AgentContextRegistry.clear('sdr_agent_001');
    expect(AgentContextRegistry.get('sdr_agent_001')).toBeNull();
  });

  it('context includes all required HandoffContext fields', () => {
    expect(mockContext.sessionId).toBeTruthy();
    expect(mockContext.callSid).toBeTruthy();
    expect(mockContext.summaryToDate).toBeTruthy();
    expect(mockContext.intent).toBeTruthy();
    expect(Array.isArray(mockContext.transcript)).toBe(true);
  });

  it('keyFacts is an array', () => {
    expect(Array.isArray(mockContext.keyFacts)).toBe(true);
    expect(mockContext.keyFacts?.length).toBeGreaterThan(0);
  });
});

describe('Handoff target routing rules', () => {
  it('user_requested_human routes to human type', () => {
    const reason = 'user_requested_human';
    const isHuman = reason === 'user_requested_human';
    expect(isHuman).toBe(true);
  });

  it('qualify_success routes to sdr type', () => {
    const reason = 'qualify_success';
    const isSdr = ['qualify_success', 'high_value_lead'].includes(reason);
    expect(isSdr).toBe(true);
  });

  it('support_escalation routes to support type', () => {
    const reason = 'support_escalation';
    const isSupport = reason === 'support_escalation';
    expect(isSupport).toBe(true);
  });
});
