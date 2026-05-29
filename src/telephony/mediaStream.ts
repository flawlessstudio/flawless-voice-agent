import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { createOpenAISession } from '../llm/openai.js';
import { SessionStore } from '../runtime/session.js';
import { handleToolCall } from '../agents/toolHandler.js';

export async function mediaStreamRoute(app: FastifyInstance) {
  app.get('/media-stream', { websocket: true }, async (connection: any) => {
    console.log('[ws] Twilio connected');

    const session = new SessionStore();
    let openAiWs: WebSocket | null = null;
    let streamSid: string | null = null;

    // 1. Open OpenAI Realtime WebSocket
    openAiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      }
    );

    openAiWs.on('open', () => {
      console.log('[openai] WebSocket open');
      createOpenAISession(openAiWs!);
    });

    // 2. OpenAI → Twilio (audio out)
    openAiWs.on('message', (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'response.audio.delta':
          if (msg.delta && streamSid) {
            connection.socket.send(JSON.stringify({
              event: 'media',
              streamSid,
              media: { payload: msg.delta },
            }));
          }
          break;

        case 'response.audio.done':
          if (streamSid) {
            connection.socket.send(JSON.stringify({
              event: 'mark',
              streamSid,
              mark: { name: 'turn_end' },
            }));
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          session.addUtterance('user', msg.transcript);
          console.log(`[transcript:user] ${msg.transcript}`);
          break;

        case 'response.audio_transcript.done':
          session.addUtterance('agent', msg.transcript);
          console.log(`[transcript:agent] ${msg.transcript}`);
          break;

        case 'response.function_call_arguments.done':
          handleToolCall(msg, openAiWs!, session);
          break;

        case 'error':
          console.error('[openai] Error:', msg.error);
          break;
      }
    });

    openAiWs.on('error', (err: Error) => console.error('[openai] WS error:', err.message));
    openAiWs.on('close', () => console.log('[openai] WebSocket closed'));

    // 3. Twilio → OpenAI (audio in)
    connection.socket.on('message', (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());

      switch (msg.event) {
        case 'connected':
          console.log('[twilio] Stream connected');
          break;

        case 'start':
          streamSid = msg.start.streamSid;
          session.setCallSid(msg.start.callSid);
          console.log(`[twilio] Stream started: ${streamSid}`);
          break;

        case 'media':
          if (openAiWs?.readyState === WebSocket.OPEN) {
            openAiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: msg.media.payload,
            }));
          }
          break;

        case 'stop':
          console.log('[twilio] Stream stopped');
          session.end();
          openAiWs?.close();
          break;
      }
    });

    connection.socket.on('close', () => {
      console.log('[ws] Twilio disconnected');
      session.end();
      openAiWs?.close();
    });
  });
}
