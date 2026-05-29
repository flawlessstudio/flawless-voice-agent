import type { FastifyInstance } from 'fastify';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok',
    agent: process.env.AGENT_NAME ?? 'Alex',
    ts: new Date().toISOString(),
  }));
}
