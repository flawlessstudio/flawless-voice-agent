export interface Utterance {
  speaker: 'agent' | 'user';
  text: string;
  ts: number;
}

export interface CRMState {
  hubspot: { callId: string; synced: boolean } | null;
  salesforce: { voiceCallId: string; synced: boolean } | null;
}

export class SessionStore {
  callSid: string | null = null;
  startedAt: string = new Date().toISOString();
  endedAt: string | null = null;
  transcript: Utterance[] = [];
  crm: CRMState = { hubspot: null, salesforce: null };

  setCallSid(sid: string): void {
    this.callSid = sid;
  }

  addUtterance(speaker: 'agent' | 'user', text: string): void {
    this.transcript.push({ speaker, text, ts: Date.now() });
  }

  end(): void {
    this.endedAt = new Date().toISOString();
    const dur = new Date(this.endedAt).getTime() - new Date(this.startedAt).getTime();
    console.log(`[session] ended. duration=${Math.round(dur / 1000)}s turns=${this.transcript.length}`);
  }

  toJSON() {
    return {
      callSid: this.callSid,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      transcript: this.transcript,
      crm: this.crm,
    };
  }
}
