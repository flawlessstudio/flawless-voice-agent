import WebSocket from 'ws';
import { logger } from '../analytics/logger';

const DEEPGRAM_URL = 'wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&model=nova-2-phonecall&smart_format=true&interim_results=true';

export function createDeepgramStream(onTranscript: (text: string, isFinal: boolean) => void): WebSocket {
  const ws = new WebSocket(DEEPGRAM_URL, {
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
  });

  ws.on('open', () => logger.info('Deepgram stream open'));

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      const transcript = msg?.channel?.alternatives?.[0]?.transcript ?? '';
      const isFinal = msg?.is_final ?? false;
      if (transcript) onTranscript(transcript, isFinal);
    } catch (e) {
      logger.warn({ err: e }, 'Deepgram parse error');
    }
  });

  ws.on('error', (err) => logger.error({ err }, 'Deepgram error'));
  ws.on('close', () => logger.info('Deepgram stream closed'));

  return ws;
}

export function sendAudioChunk(ws: WebSocket, chunk: Buffer): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
}

export function closeDeepgramStream(ws: WebSocket): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'CloseStream' }));
  }
}
