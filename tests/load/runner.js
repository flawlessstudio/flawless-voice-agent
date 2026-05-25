/**
 * Load test runner
 * Simulates concurrent outbound calls against the voice agent API
 *
 * Usage:
 *   CONCURRENCY=100 TARGET_URL=http://localhost:3000 node tests/load/runner.js
 */

const http = require('http');
const { URL } = require('url');

const CONCURRENCY = parseInt(process.env.CONCURRENCY || '100', 10);
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const DURATION_S = parseInt(process.env.DURATION_S || '30', 10);

const results = { success: 0, failure: 0, latencies: [] };

function simulateCall(id) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/twilio/incoming', TARGET_URL);
    const body = `CallSid=CA${id.toString().padStart(32, '0')}&CallStatus=ringing`;

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const latency = Date.now() - start;
        results.latencies.push(latency);
        if (res.statusCode === 200) results.success++;
        else results.failure++;
        resolve();
      });
    });

    req.on('error', () => { results.failure++; resolve(); });
    req.write(body);
    req.end();
  });
}

async function runBatch(batchSize, offset) {
  const promises = Array.from({ length: batchSize }, (_, i) => simulateCall(offset + i));
  await Promise.all(promises);
}

(async () => {
  console.log(`Load test: ${CONCURRENCY} concurrent calls for ${DURATION_S}s against ${TARGET_URL}`);
  const startTime = Date.now();
  let callId = 0;

  while (Date.now() - startTime < DURATION_S * 1000) {
    await runBatch(CONCURRENCY, callId);
    callId += CONCURRENCY;
  }

  const sorted = results.latencies.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

  console.log('\n--- Results ---');
  console.log(`Total calls: ${results.success + results.failure}`);
  console.log(`Success: ${results.success} | Failure: ${results.failure}`);
  console.log(`Latency p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms`);

  if (p95 > 1200) {
    console.error('FAIL: p95 latency exceeds 1200ms threshold');
    process.exit(1);
  }
  if (results.failure / (results.success + results.failure) > 0.02) {
    console.error('FAIL: error rate exceeds 2%');
    process.exit(1);
  }
  console.log('PASS: load test completed within thresholds');
})();
