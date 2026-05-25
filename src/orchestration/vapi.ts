import { logger } from '../analytics/logger';

const VAPI_BASE = 'https://api.vapi.ai';

export async function createVapiCall(params: {
  phoneNumberId: string;
  to: string;
  assistantId: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${VAPI_BASE}/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
    },
    body: JSON.stringify({
      phoneNumberId: params.phoneNumberId,
      customer: { number: params.to },
      assistantId: params.assistantId,
    }),
  });

  if (!res.ok) {
    logger.error({ status: res.status }, 'Vapi call creation failed');
    throw new Error(`Vapi error: ${res.status}`);
  }

  return res.json();
}
