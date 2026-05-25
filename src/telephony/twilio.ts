// Twilio adapter
// Handles outbound call initiation, status callbacks and TwiML generation
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function initiateCall(to: string, from: string, webhookUrl: string) {
  return client.calls.create({
    to,
    from,
    url: webhookUrl,
    statusCallback: `${webhookUrl}/status`,
    statusCallbackMethod: 'POST',
  });
}
