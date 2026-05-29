/**
 * Deepgram STT Integration
 * Docs: https://developers.deepgram.com/reference/voice-agent/voice-agent
 * Auth: Authorization: Token DEEPGRAM_API_KEY
 *
 * Two modes:
 *  1. streamingTranscription — raw STT WebSocket (audio in, transcript events out)
 *  2. voiceAgent           — full agent mode (STT + LLM + TTS in one WebSocket)
 */

import WebSocket from 'ws';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word: string;
}

export interface DeepgramTranscript {
  text: string;
  confidence: number;
  words: DeepgramWord[];
  is_final: boolean;
  speech_final: boolean;
}

export interface DeepgramCallbacks {
  onTranscript: (t: DeepgramTranscript) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

// ── 1. Streaming STT WebSocket ─────────────────────────────────────────────────

export function createDeepgramStream(callbacks: DeepgramCallbacks): WebSocket {
  const apiKey = process.env.DEEPGRAM_API_KEY ?? '';
  const params = new URLSearchParams({
    model:        'nova-3',
    language:     process.env.AGENT_LANGUAGE === 'es' ? 'es' : 'en-US',
    encoding:     'mulaw',
    sample_rate:  '8000',
    channels:     '1',
    punctuate:    'true',
    interim_results: 'true',
    endpointing:  '300',
    smart_format: 'true',
    diarize:      'false',
  });

  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params.toString()}`,
    { headers: { Authorization: `Token ${apiKey}` } }
  );

  ws.on('open', () => {
    console.log('[deepgram:stt] WebSocket open');
  });

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type !== 'Results') return;

      const alt = msg.channel?.alternatives?.[0];
      if (!alt?.transcript) return;

      const transcript: DeepgramTranscript = {
        text:         alt.transcript,
        confidence:   alt.confidence ?? 1,
        words:        alt.words ?? [],
        is_final:     msg.is_final ?? false,
        speech_final: msg.speech_final ?? false,
      };

      callbacks.onTranscript(transcript);
    } catch (err) {
      callbacks.onError?.(err as Error);
    }
  });

  ws.on('error', (err: Error) => {
    console.error('[deepgram:stt] Error:', err.message);
    callbacks.onError?.(err);
  });

  ws.on('close', () => {
    console.log('[deepgram:stt] WebSocket closed');
    callbacks.onClose?.();
  });

  return ws;
}

// ── 2. Voice Agent WebSocket (STT + LLM + TTS) ───────────────────────────────

export interface VoiceAgentCallbacks {
  onAudioChunk:  (chunk: Buffer) => void;   // raw audio to send back to Twilio
  onTranscript?: (speaker: 'user' | 'agent', text: string) => void;
  onFunctionCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  onError?:      (err: Error) => void;
  onClose?:      () => void;
}

export function createDeepgramVoiceAgent(
  callbacks: VoiceAgentCallbacks
): WebSocket {
  const apiKey = process.env.DEEPGRAM_API_KEY ?? '';
  const agentName = process.env.AGENT_NAME ?? 'Alex';
  const lang = process.env.AGENT_LANGUAGE === 'es' ? 'es' : 'en';

  const ws = new WebSocket(
    'wss://agent.deepgram.com/v1/agent/converse',
    { headers: { Authorization: `Token ${apiKey}` } }
  );

  ws.on('open', () => {
    console.log('[deepgram:agent] WebSocket open — sending Settings');

    // Send Settings message immediately on open
    ws.send(JSON.stringify({
      type: 'Settings',
      audio: {
        input:  { encoding: 'mulaw', sample_rate: 8000 },
        output: { encoding: 'mulaw', sample_rate: 8000, container: 'none' },
      },
      agent: {
        language: lang,
        instructions: [
          `Eres ${agentName}, agente de voz de Flawless Studio.`,
          '1. Identifícate como IA en el primer turno.',
          '2. Sé conciso y profesional.',
          '3. No finjas ser humano.',
          '4. Ofrece transferencia humana cuando sea necesario.',
        ].join(' '),
        think: {
          provider: { type: 'open_ai' },
          model:    'gpt-4o',
          instructions: `Responde siempre en ${lang === 'es' ? 'español' : 'English'}.`,
        },
        speak: {
          provider: { type: 'eleven_labs' },
          model:    'eleven_turbo_v2',
        },
        functions: [
          {
            name: 'log_to_crm',
            description: 'Registra los datos de la llamada en el CRM',
            parameters: {
              type: 'object',
              properties: {
                intent:  { type: 'string', enum: ['qualify', 'schedule', 'objection', 'handoff', 'other'] },
                summary: { type: 'string' },
                outcome: { type: 'string', enum: ['success', 'no_interest', 'callback', 'handoff'] },
              },
              required: ['intent', 'summary', 'outcome'],
            },
          },
        ],
      },
    }));
  });

  ws.on('message', (raw: Buffer) => {
    try {
      // Binary = audio chunk
      if (!(raw instanceof Buffer && raw[0] === 0x7b)) {
        callbacks.onAudioChunk(raw);
        return;
      }

      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'Welcome':
          console.log('[deepgram:agent] Connected, session:', msg.session_id);
          break;

        case 'SettingsApplied':
          console.log('[deepgram:agent] Settings applied');
          break;

        case 'UserStartedSpeaking':
          console.log('[deepgram:agent] User speaking...');
          break;

        case 'ConversationText':
          if (msg.role === 'user') {
            callbacks.onTranscript?.('user', msg.content);
          } else {
            callbacks.onTranscript?.('agent', msg.content);
          }
          break;

        case 'FunctionCallRequest':
          if (callbacks.onFunctionCall) {
            callbacks.onFunctionCall(msg.function_name, msg.input ?? {})
              .then((output) => {
                ws.send(JSON.stringify({
                  type: 'FunctionCallResponse',
                  function_call_id: msg.function_call_id,
                  output: JSON.stringify(output),
                }));
              })
              .catch((err: Error) => {
                console.error('[deepgram:agent] FunctionCall error:', err.message);
              });
          }
          break;

        case 'AgentStartedSpeaking':
          console.log('[deepgram:agent] Agent speaking...');
          break;

        case 'AgentAudioDone':
          console.log('[deepgram:agent] Agent turn done');
          break;

        case 'Error':
          console.error('[deepgram:agent] Error:', msg.message);
          callbacks.onError?.(new Error(msg.message));
          break;
      }
    } catch (err) {
      callbacks.onError?.(err as Error);
    }
  });

  ws.on('error', (err: Error) => {
    console.error('[deepgram:agent] WS error:', err.message);
    callbacks.onError?.(err);
  });

  ws.on('close', () => {
    console.log('[deepgram:agent] WebSocket closed');
    callbacks.onClose?.();
  });

  return ws;
}

// ── Helper: send audio chunk to Deepgram ─────────────────────────────────────────

export function sendAudioToDeepgram(ws: WebSocket, base64Payload: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(Buffer.from(base64Payload, 'base64'));
}
