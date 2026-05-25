import { CallSession } from '../runtime/session';

export const DeepPath = {
  async handle(session: CallSession, _body: Record<string, string>): Promise<string> {
    // TODO: integrate OpenAI Agents API with tools + memory
    console.info(`Deep path for session ${session.sessionId}`);
    return `<Response><Say>Deep path active.</Say></Response>`;
  },
};
