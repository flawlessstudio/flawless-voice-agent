import Fastify from 'fastify';
import fastifyWs from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import { config } from 'dotenv';
import { incomingCallRoute } from './telephony/incoming.js';
import { mediaStreamRoute } from './telephony/mediaStream.js';
import { statusRoute } from './telephony/status.js';
import { healthRoute } from './api/health.js';
import { webhookRoutes } from './api/webhooks.js';
import { logger } from './analytics/logger.js';

config();

const PORT = Number(process.env.PORT ?? 5050);

async function main(): Promise<void> {
  const app = Fastify({ logger: false });
  await app.register(fastifyFormBody);
  await app.register(fastifyWs);

  app.register(incomingCallRoute);
  app.register(mediaStreamRoute);
  app.register(statusRoute);
  app.register(healthRoute);
  app.register(webhookRoutes);

  app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) { logger.error({ err }, '[flawless-voice-agent] Failed to bind port'); process.exit(1); }
    logger.info({ port: PORT }, '[flawless-voice-agent] Listening');
    logger.info('  POST /incoming-call      → TwiML webhook');
    logger.info('  WS   /media-stream       → Twilio ↔ OpenAI bridge');
    logger.info('  POST /status             → Twilio status callback');
    logger.info('  POST /webhooks/vapi      → Vapi events');
    logger.info('  POST /webhooks/retell    → Retell events');
    logger.info('  GET  /health             → health check');
  });
}

main().catch((err) => {
  logger.error({ err }, '[flawless-voice-agent] Fatal startup error');
  process.exit(1);
});
