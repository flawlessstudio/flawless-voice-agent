export interface CallSession {
  sessionId: string;
  callSid: string;
  startedAt: Date;
  endedAt?: Date;
  path: 'fast' | 'deep' | 'fallback';
  status: 'active' | 'completed' | 'failed' | 'handed-off';
  turns: number;
  complexityScore: number;
  consentCaptured: boolean;
  crmSynced: boolean;
}

export const SessionStore = {
  create(callSid: string): CallSession {
    return {
      sessionId: `sess_${Date.now()}`,
      callSid,
      startedAt: new Date(),
      path: 'fast',
      status: 'active',
      turns: 0,
      complexityScore: 0,
      consentCaptured: false,
      crmSynced: false,
    };
  },

  async update(callSid: string, patch: Partial<CallSession>): Promise<void> {
    // TODO: persist to Redis or DB
    console.info(`Session update for ${callSid}`, patch);
  },
};
