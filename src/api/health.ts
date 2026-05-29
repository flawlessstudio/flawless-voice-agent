/**
 * health.ts — Fastify health check route
 *
 * GET /health → 200 { status: 'ok', uptime, version }
 *
 * Used by:
 *  - Dockerfile HEALTHCHECK
 *  - Docker / k8s liveness probe
 *  - Load balancer health checks
 */

import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let _version: string | undefined;
function getVersion(): string {
  if (_version) return _version;
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
    _version = pkg.version ?? 'unknown';
  } catch {
    _version = 'unknown';
  }
  return _version!;
}

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    return reply.send({
      status:  'ok',
      uptime:  Math.round(process.uptime()),
      version: getVersion(),
      ts:      new Date().toISOString(),
    });
  });
}
