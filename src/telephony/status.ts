import type { FastifyInstance } from 'fastify';

export async function statusRoute(app: FastifyInstance) {
  app.post('/status', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const { CallSid, CallStatus, CallDuration } = body;
    console.log(`[status] CallSid=${CallSid} status=${CallStatus} duration=${CallDuration}s`);
    // TODO: flush session to CRM here
    return reply.send({ received: true });
  });
}
