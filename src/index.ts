import Fastify from 'fastify';
import fastifyWs from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import { config } from 'dotenv';
import { incomingCallRoute } from './telephony/incoming.js';
import { mediaStreamRoute } from './telephony/mediaStream.js';
import { statusRoute } from './telephony/status.js';
import { healthRoute } from './api/health.js';
import { webhookRoutes } from './api/webhooks.js';

config();

const PORT = Number(process.env.PORT ?? 5050);

const app = Fastify({ logger: false });
await app.register(fastifyFormBody);
await app.register(fastifyWs);

app.register(incomingCallRoute);
app.register(mediaStreamRoute);
app.register(statusRoute);
app.register(healthRoute);
app.register(webhookRoutes);

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`[flawless-voice-agent] Listening on :${PORT}`);
  console.log('  POST /incoming-call      → TwiML webhook');
  console.log('  WS   /media-stream       → Twilio ↔ OpenAI bridge');
  console.log('  POST /status             → Twilio status callback');
  console.log('  POST /webhooks/vapi      → Vapi events');
  console.log('  POST /webhooks/retell    → Retell events');
  console.log('  GET  /health             → health check');
});
