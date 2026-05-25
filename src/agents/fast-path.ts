import { CallSession } from '../runtime/session';

export const FastPath = {
  async handle(session: CallSession, _body: Record<string, string>): Promise<string> {
    // TODO: integrate Deepgram STT + OpenAI Realtime + ElevenLabs TTS
    console.info(`Fast path for session ${session.sessionId}`);
    return `<Response><Say>Fast path active.</Say></Response>`;
  },
};
