import type { FastifyInstance } from 'fastify';
import { logger } from '../analytics/logger.js';

export async function statusRoute(app: FastifyInstance) {
  app.post('/status', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const { CallSid, CallStatus, CallDuration } = body;
    logger.info({ callSid: CallSid, status: CallStatus, durationSec: CallDuration }, '[status] Call status update');
    // TODO: flush session to CRM here
    return reply.send({ received: true });
  });
}
