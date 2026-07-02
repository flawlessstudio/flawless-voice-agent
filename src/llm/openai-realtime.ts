import WebSocket from 'ws';
import { logger } from '../analytics/logger.js';

const REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

export interface RealtimeSession {
  ws: WebSocket;
  sessionId: string;
}

export function createRealtimeSession(
  systemPrompt: string,
  onResponse: (text: string) => void,
  onDone: () => void
): RealtimeSession {
  const ws = new WebSocket(REALTIME_URL, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  const sessionId = `rt_${Date.now()}`;

  ws.on('open', () => {
    logger.info({ sessionId }, 'OpenAI Realtime session open');
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: systemPrompt,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: { type: 'server_vad', silence_duration_ms: 500 },
      },
    }));
  });

  ws.on('message', (data: Buffer) => {
    try {
      const event = JSON.parse(data.toString());
      if (event.type === 'response.text.delta') onResponse(event.delta ?? '');
      if (event.type === 'response.done') onDone();
    } catch (e) {
      logger.warn({ err: e }, 'Realtime parse error');
    }
  });

  ws.on('error', (err) => logger.error({ err, sessionId }, 'Realtime error'));
  ws.on('close', () => logger.info({ sessionId }, 'Realtime session closed'));

  return { ws, sessionId };
}

export function sendUserMessage(session: RealtimeSession, text: string): void {
  session.ws.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
  }));
  session.ws.send(JSON.stringify({ type: 'response.create' }));
}

export function closeRealtimeSession(session: RealtimeSession): void {
  if (session.ws.readyState === WebSocket.OPEN) session.ws.close();
}
