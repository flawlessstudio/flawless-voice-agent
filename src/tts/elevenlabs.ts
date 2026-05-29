/**
 * ElevenLabs TTS Integration
 * Docs: https://elevenlabs.io/docs/developer-guides/websockets
 * Auth: xi-api-key header
 *
 * Two modes:
 *  1. streamingTTS   — text in, audio chunks out (low latency)
 *  2. conversational — full duplex agent (audio in, audio out)
 */

import WebSocket from 'ws';

const BASE_HTTP = 'https://api.elevenlabs.io/v1';

function authHeader() {
  return { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '' };
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TTSCallbacks {
  onAudioChunk: (chunk: Buffer) => void;
  onDone?:      () => void;
  onError?:     (err: Error) => void;
}

export interface ConvAICallbacks {
  onAudioChunk:   (chunk: Buffer) => void;
  onTranscript?:  (speaker: 'user' | 'agent', text: string) => void;
  onFunctionCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  onError?:       (err: Error) => void;
  onClose?:       () => void;
}

// ── 1. Streaming TTS WebSocket ─────────────────────────────────────────────────

export function createElevenLabsStream(
  callbacks: TTSCallbacks
): { ws: WebSocket; sendText: (text: string, flush?: boolean) => void } {
  const voiceId  = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
  const modelId  = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2';
  const apiKey   = process.env.ELEVENLABS_API_KEY ?? '';

  const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input` +
    `?model_id=${modelId}&output_format=ulaw_8000&optimize_streaming_latency=3`;

  const ws = new WebSocket(url, { headers: { 'xi-api-key': apiKey } });

  ws.on('open', () => {
    console.log('[elevenlabs:tts] WebSocket open');
    // Send BOS (begin of stream)
    ws.send(JSON.stringify({
      text: ' ',
      voice_settings: {
        stability:        0.5,
        similarity_boost: 0.8,
        use_speaker_boost: true,
      },
      generation_config: { chunk_length_schedule: [120, 160, 250, 290] },
      xi_api_key: apiKey,
    }));
  });

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.audio) {
        callbacks.onAudioChunk(Buffer.from(msg.audio, 'base64'));
      }
      if (msg.isFinal) {
        callbacks.onDone?.();
      }
    } catch {
      // Binary fallback
      callbacks.onAudioChunk(raw);
    }
  });

  ws.on('error', (err: Error) => {
    console.error('[elevenlabs:tts] Error:', err.message);
    callbacks.onError?.(err);
  });

  ws.on('close', () => console.log('[elevenlabs:tts] WebSocket closed'));

  function sendText(text: string, flush = false): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ text, flush }));
  }

  return { ws, sendText };
}

// ── 2. Conversational AI WebSocket (full duplex) ───────────────────────────────

export function createElevenLabsAgent(
  callbacks: ConvAICallbacks
): { ws: WebSocket; sendAudio: (base64: string) => void } {
  const agentId = process.env.ELEVENLABS_AGENT_ID ?? '';
  const apiKey  = process.env.ELEVENLABS_API_KEY ?? '';

  const url = agentId
    ? `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
    : 'wss://api.elevenlabs.io/v1/convai/conversation';

  const ws = new WebSocket(url, { headers: { 'xi-api-key': apiKey } });

  ws.on('open', () => {
    console.log('[elevenlabs:agent] WebSocket open');

    // Send init only if no agent_id (inline config)
    if (!agentId) {
      const agentName = process.env.AGENT_NAME ?? 'Alex';
      const lang      = process.env.AGENT_LANGUAGE === 'es' ? 'es' : 'en';

      ws.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: [
                `Eres ${agentName}, agente de voz de Flawless Studio.`,
                'Identifícate como IA en el primer turno.',
                'Sé conciso y profesional.',
              ].join(' '),
              llm:      'gpt-4o',
              language: lang,
              tools: [
                {
                  type: 'function',
                  name: 'log_to_crm',
                  description: 'Registra datos de la llamada en el CRM',
                  parameters: {
                    type: 'object',
                    properties: {
                      intent:  { type: 'string' },
                      summary: { type: 'string' },
                      outcome: { type: 'string' },
                    },
                    required: ['intent', 'summary', 'outcome'],
                  },
                },
              ],
            },
            first_message: `Hola, soy ${agentName} de Flawless Studio. ¿En qué puedo ayudarte?`,
          },
          tts: {
            voice_id: process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM',
            model_id: process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2',
          },
          audio: {
            input_encoding:  'ulaw',
            input_sample_rate: 8000,
            output_encoding: 'ulaw',
            output_sample_rate: 8000,
          },
        },
      }));
    }
  });

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'conversation_initiation_metadata':
          console.log('[elevenlabs:agent] Session:', msg.conversation_initiation_metadata_event?.conversation_id);
          break;

        case 'audio':
          if (msg.audio_event?.audio_base_64) {
            callbacks.onAudioChunk(Buffer.from(msg.audio_event.audio_base_64, 'base64'));
          }
          break;

        case 'transcript':
          {
            const ev = msg.transcript_event;
            if (ev?.speaker === 'user') callbacks.onTranscript?.('user', ev.text);
            if (ev?.speaker === 'agent') callbacks.onTranscript?.('agent', ev.text);
          }
          break;

        case 'agent_response':
          console.log('[elevenlabs:agent] Response:', msg.agent_response_event?.agent_response?.slice(0, 60));
          break;

        case 'tool_call':
          if (callbacks.onFunctionCall) {
            const tc = msg.tool_call_event;
            callbacks.onFunctionCall(tc.tool_name, tc.parameters ?? {})
              .then((output) => {
                ws.send(JSON.stringify({
                  type: 'tool_result',
                  tool_call_id: tc.tool_call_id,
                  result: JSON.stringify(output),
                }));
              })
              .catch((err: Error) => console.error('[elevenlabs:agent] Tool error:', err.message));
          }
          break;

        case 'interruption':
          console.log('[elevenlabs:agent] Interruption detected');
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', event_id: msg.ping_event?.event_id }));
          break;

        case 'internal_tentative_agent_response':
          // partial agent response, ignore
          break;

        default:
          break;
      }
    } catch {
      callbacks.onAudioChunk(raw);
    }
  });

  ws.on('error', (err: Error) => {
    console.error('[elevenlabs:agent] WS error:', err.message);
    callbacks.onError?.(err);
  });

  ws.on('close', () => {
    console.log('[elevenlabs:agent] WebSocket closed');
    callbacks.onClose?.();
  });

  function sendAudio(base64: string): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      user_audio_chunk: base64,
    }));
  }

  return { ws, sendAudio };
}

// ── 3. REST: list available voices ────────────────────────────────────────────

export async function listVoices(): Promise<{ voice_id: string; name: string }[]> {
  const res = await fetch(`${BASE_HTTP}/voices`, {
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`ElevenLabs voices: ${res.status}`);
  const data = await res.json() as { voices: { voice_id: string; name: string }[] };
  return data.voices;
}

// ── 4. REST: create/get Conversational AI agent ───────────────────────────────

export async function createConvAIAgent(config: {
  name: string;
  prompt: string;
  firstMessage: string;
  voiceId: string;
}): Promise<string> {
  const res = await fetch(`${BASE_HTTP}/convai/agents/create`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: config.name,
      conversation_config: {
        agent: {
          prompt: { prompt: config.prompt, llm: 'gpt-4o' },
          first_message: config.firstMessage,
          language: process.env.AGENT_LANGUAGE === 'es' ? 'es' : 'en',
        },
        tts: { voice_id: config.voiceId },
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs createAgent: ${res.status}`);
  const data = await res.json() as { agent_id: string };
  console.log(`[elevenlabs] Agent created: ${data.agent_id}`);
  return data.agent_id;
}
