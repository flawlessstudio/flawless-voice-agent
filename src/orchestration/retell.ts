import { logger } from '../analytics/logger';

const RETELL_BASE = 'https://api.retellai.com';

export async function createRetellCall(params: {
  from: string;
  to: string;
  agentId: string;
}): Promise<{ call_id: string }> {
  const res = await fetch(`${RETELL_BASE}/v2/create-phone-call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    },
    body: JSON.stringify({
      from_number: params.from,
      to_number: params.to,
      agent_id: params.agentId,
    }),
  });

  if (!res.ok) {
    logger.error({ status: res.status }, 'Retell call creation failed');
    throw new Error(`Retell error: ${res.status}`);
  }

  return res.json();
}
