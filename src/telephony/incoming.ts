import type { FastifyInstance } from 'fastify';
import { sessionRouter } from '../runtime/router.js';

export async function incomingCallRoute(app: FastifyInstance) {
  app.post('/incoming-call', async (_req, reply) => {
    const publicUrl = process.env.PUBLIC_URL ?? '';
    const wsUrl = publicUrl.replace('https://', 'wss://');
    const agentName = process.env.AGENT_NAME ?? 'Alex';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.es-ES-Standard-A" language="es-ES">
    Hola, soy ${agentName}, asistente de Flawless Studio. ¿En qué puedo ayudarte hoy?
  </Say>
  <Connect>
    <Stream url="${wsUrl}/media-stream"/>
  </Connect>
</Response>`;

    reply.header('Content-Type', 'text/xml');
    return reply.send(twiml);
  });

  app.post('/twilio/gather', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const twilioPayload: Record<string, string> = {};

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') twilioPayload[key] = value;
    }

    const twiml = await sessionRouter.handleIncoming(twilioPayload);
    reply.header('Content-Type', 'text/xml');
    return reply.send(twiml);
  });
}
