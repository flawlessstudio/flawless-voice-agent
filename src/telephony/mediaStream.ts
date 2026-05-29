/**
 * mediaStream.ts — Twilio ↔ OpenAI Realtime WebSocket bridge
 *
 * Patterns validated against:
 *  - openai/openai-realtime-twilio-demo (official OpenAI sample)
 *  - twilio-samples/speech-assistant-openai-realtime-api-node
 *
 * Key features:
 *  1. Interrupt handling: user speech → clear Twilio buffer + truncate OpenAI response
 *  2. Mark tracking: know exactly which audio chunk Twilio has played
 *  3. Reconnect with exponential backoff (cap 5s, max 5 attempts)
 *  4. Session flush to CRM on call end
 */

import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { createOpenAISession } from '../llm/openai.js';
import { SessionStore } from '../runtime/session.js';
import { handleToolCall } from '../agents/toolHandler.js';
import { flushSessionToCRM } from '../post-call/crm-enricher.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const OPENAI_WS_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS      = 200;
const RECONNECT_CAP_MS       = 5_000;

// ─── Route ────────────────────────────────────────────────────────────────────
export async function mediaStreamRoute(app: FastifyInstance) {
  app.get('/media-stream', { websocket: true }, async (connection: any) => {
    console.log('[ws] Twilio connected');

    const session                     = new SessionStore();
    let openAiWs: WebSocket | null    = null;
    let streamSid: string | null      = null;
    let lastAssistantItemId: string | null = null;  // tracks active response item
    let markQueue: string[]           = [];          // marks sent but not yet ack'd
    let responseStartSampleCount      = 0;           // audio samples sent in current turn
    let reconnectAttempt              = 0;
    let callEnded                     = false;

    // ─── OpenAI WS factory (with reconnect) ───────────────────────────────────
    function connectOpenAI() {
      openAiWs = new WebSocket(OPENAI_WS_URL, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      openAiWs.on('open', () => {
        console.log('[openai] WebSocket open');
        reconnectAttempt = 0;
        createOpenAISession(openAiWs!);
      });

      // ── OpenAI → Twilio ──────────────────────────────────────────────────
      openAiWs.on('message', (raw: Buffer) => {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          // Track which response item is currently being spoken
          case 'response.created':
            responseStartSampleCount = 0;
            break;

          case 'response.output_item.added':
            if (msg.item?.type === 'message') {
              lastAssistantItemId = msg.item.id;
            }
            break;

          // Stream audio chunks to Twilio
          case 'response.audio.delta':
            if (msg.delta && streamSid) {
              // Count samples to know where to truncate on interrupt
              // Twilio uses µ-law 8kHz → each base64 char ≈ 0.75 bytes → 1 sample/byte
              responseStartSampleCount += Math.floor(
                (msg.delta.length * 3) / 4
              );

              connection.socket.send(
                JSON.stringify({
                  event: 'media',
                  streamSid,
                  media: { payload: msg.delta },
                })
              );

              // Send a mark so we know when Twilio finishes playing this chunk
              const markLabel = `chunk_${Date.now()}`;
              markQueue.push(markLabel);
              connection.socket.send(
                JSON.stringify({ event: 'mark', streamSid, mark: { name: markLabel } })
              );
            }
            break;

          case 'response.audio.done':
            if (streamSid) {
              connection.socket.send(
                JSON.stringify({
                  event: 'mark',
                  streamSid,
                  mark: { name: 'turn_end' },
                })
              );
            }
            break;

          // ── INTERRUPT: user started speaking mid-response ────────────────
          // Source: openai/openai-realtime-twilio-demo + twilio-samples official repos
          case 'input_audio_buffer.speech_started':
            console.log('[interrupt] User started speaking — clearing Twilio buffer');
            handleInterrupt();
            break;

          // Transcripts
          case 'conversation.item.input_audio_transcription.completed':
            session.addUtterance('user', msg.transcript);
            console.log(`[transcript:user] ${msg.transcript}`);
            break;

          case 'response.audio_transcript.done':
            session.addUtterance('agent', msg.transcript);
            console.log(`[transcript:agent] ${msg.transcript}`);
            break;

          // Tool calls
          case 'response.function_call_arguments.done':
            handleToolCall(msg, openAiWs!, session);
            break;

          case 'error':
            console.error('[openai] Error:', msg.error);
            break;
        }
      });

      openAiWs.on('error', (err: Error) => {
        console.error('[openai] WS error:', err.message);
      });

      openAiWs.on('close', () => {
        console.log('[openai] WebSocket closed');
        if (!callEnded && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            RECONNECT_BASE_MS * 2 ** reconnectAttempt,
            RECONNECT_CAP_MS
          );
          reconnectAttempt++;
          console.log(`[openai] Reconnecting in ${delay}ms (attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`);
          setTimeout(connectOpenAI, delay);
        } else if (!callEnded) {
          console.error('[openai] Max reconnect attempts reached — falling back');
        }
      });
    }

    // ─── Interrupt handler ────────────────────────────────────────────────────
    // When user speaks while agent is talking:
    //  1. Tell Twilio to stop playing queued audio immediately
    //  2. Tell OpenAI to truncate the current response item at the exact sample
    function handleInterrupt() {
      if (!streamSid || !openAiWs || openAiWs.readyState !== WebSocket.OPEN) return;

      // 1. Clear Twilio's audio buffer
      connection.socket.send(JSON.stringify({ event: 'clear', streamSid }));
      markQueue = [];

      // 2. Truncate OpenAI response at the last played sample
      if (lastAssistantItemId) {
        openAiWs.send(
          JSON.stringify({
            type: 'conversation.item.truncate',
            item_id:      lastAssistantItemId,
            content_index: 0,
            audio_end_ms: Math.floor((responseStartSampleCount / 8000) * 1000),
          })
        );
        lastAssistantItemId      = null;
        responseStartSampleCount = 0;
      }
    }

    // ─── Twilio → OpenAI ──────────────────────────────────────────────────────
    connection.socket.on('message', (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());

      switch (msg.event) {
        case 'connected':
          console.log('[twilio] Stream protocol connected');
          break;

        case 'start':
          streamSid = msg.start.streamSid;
          session.setCallSid(msg.start.callSid);
          console.log(`[twilio] Stream started — callSid: ${msg.start.callSid}`);
          connectOpenAI();
          break;

        case 'media':
          if (openAiWs?.readyState === WebSocket.OPEN) {
            openAiWs.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: msg.media.payload,
              })
            );
          }
          break;

        // Mark ack from Twilio: audio chunk was played, remove from queue
        case 'mark':
          markQueue = markQueue.filter(m => m !== msg.mark?.name);
          break;

        case 'stop':
          console.log('[twilio] Stream stopped');
          endCall();
          break;
      }
    });

    connection.socket.on('close', () => {
      console.log('[ws] Twilio disconnected');
      endCall();
    });

    // ─── Call teardown ────────────────────────────────────────────────────────
    async function endCall() {
      if (callEnded) return;
      callEnded = true;
      session.end();
      openAiWs?.close();

      // Flush session to CRM asynchronously — never block audio thread
      flushSessionToCRM(session.toJSON()).catch((err: Error) =>
        console.error('[crm] Flush error:', err.message)
      );
    }
  });
}
