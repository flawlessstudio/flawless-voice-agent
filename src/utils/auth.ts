import crypto from 'crypto';

export function validateTwilioSignature(
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, string>,
  url: string,
  authToken: string
): boolean {
  const signature = (headers['x-twilio-signature'] as string) ?? '';
  const sortedKeys = Object.keys(body).sort();
  let str = url;
  for (const key of sortedKeys) str += key + body[key];
  const hmac = crypto.createHmac('sha1', authToken).update(Buffer.from(str)).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}
