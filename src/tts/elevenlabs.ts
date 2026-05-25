import https from 'https';
import { logger } from '../analytics/logger';

const BASE_URL = 'api.elevenlabs.io';
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

export function synthesizeStream(
  text: string,
  onChunk: (chunk: Buffer) => void,
  onDone: () => void
): void {
  const body = JSON.stringify({
    text,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    output_format: 'ulaw_8000',
  });

  const options = {
    hostname: BASE_URL,
    path: `/v1/text-to-speech/${VOICE_ID}/stream`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      Accept: 'audio/mpeg',
    },
  };

  const req = https.request(options, (res) => {
    res.on('data', (chunk: Buffer) => onChunk(chunk));
    res.on('end', () => { logger.debug('ElevenLabs stream done'); onDone(); });
  });

  req.on('error', (err) => logger.error({ err }, 'ElevenLabs error'));
  req.write(body);
  req.end();
}

export async function synthesize(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    synthesizeStream(text, (c) => chunks.push(c), () => resolve(Buffer.concat(chunks)));
  });
}
