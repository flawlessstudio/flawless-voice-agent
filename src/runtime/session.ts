/**
 * session.ts — in-memory call session store
 *
 * Holds all state for a single active call:
 *  - transcript utterances
 *  - CRM sync state
 *  - post-call enrichment fields (populated after call ends)
 *
 * toJSON() is the canonical serialization used by:
 *  - crm-enricher.ts (post-call CRM sync)
 *  - handoff.ts (agent context passing)
 *  - eval/llm-quality.ts (evaluation)
 */

import { randomUUID } from 'crypto';

export interface Utterance {
  speaker: 'agent' | 'user';
  text: string;
  ts: number;
}

export interface CRMState {
  hubspot:    { callId: string;     synced: boolean } | null;
  salesforce: { voiceCallId: string; synced: boolean } | null;
}

// Canonical JSON shape — matches VoiceSessionJSON used across the codebase
export interface VoiceSessionJSON {
  sessionId:   string;
  callSid:     string | null;
  contactId?:  string;
  startedAt:   string;
  endedAt:     string | null;
  durationMs?: number;
  transcript:  Utterance[];
  crm:         CRMState;
  // post-call enrichment (populated by crm-enricher / handoff)
  intent?:     string;
  summary?:    string;
  sentiment?:  string;
  outcome?:    string;
  keyFacts?:   string[];
  nextAction?: string;
}

export class SessionStore {
  readonly sessionId: string    = randomUUID();
  callSid:    string | null     = null;
  contactId?: string;
  startedAt:  string            = new Date().toISOString();
  endedAt:    string | null     = null;
  transcript: Utterance[]       = [];
  crm: CRMState                 = { hubspot: null, salesforce: null };

  // Post-call fields — written by crm-enricher after call ends
  intent?:     string;
  summary?:    string;
  sentiment?:  string;
  outcome?:    string;
  keyFacts?:   string[];
  nextAction?: string;

  setCallSid(sid: string): void {
    this.callSid = sid;
  }

  setContactId(id: string): void {
    this.contactId = id;
  }

  addUtterance(speaker: 'agent' | 'user', text: string): void {
    this.transcript.push({ speaker, text, ts: Date.now() });
  }

  end(): void {
    this.endedAt = new Date().toISOString();
    const dur = new Date(this.endedAt).getTime() - new Date(this.startedAt).getTime();
    console.log(`[session:${this.sessionId}] ended. duration=${Math.round(dur / 1000)}s turns=${this.transcript.length}`);
  }

  get durationMs(): number {
    const end = this.endedAt ? new Date(this.endedAt).getTime() : Date.now();
    return end - new Date(this.startedAt).getTime();
  }

  toJSON(): VoiceSessionJSON {
    return {
      sessionId:   this.sessionId,
      callSid:     this.callSid,
      contactId:   this.contactId,
      startedAt:   this.startedAt,
      endedAt:     this.endedAt,
      durationMs:  this.durationMs,
      transcript:  this.transcript,
      crm:         this.crm,
      intent:      this.intent,
      summary:     this.summary,
      sentiment:   this.sentiment,
      outcome:     this.outcome,
      keyFacts:    this.keyFacts,
      nextAction:  this.nextAction,
    };
  }
}
