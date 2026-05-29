import type { FastifyInstance } from 'fastify';

export async function incomingCallRoute(app: FastifyInstance) {
  app.post('/incoming-call', async (req, reply) => {
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
}
