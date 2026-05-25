export async function checkConsent(phoneNumber: string): Promise<boolean> {
  // TODO: check consent database and DNC registry
  console.info(`Consent check for ${phoneNumber}`);
  return true;
}

export async function captureConsent(sessionId: string, phoneNumber: string): Promise<void> {
  // TODO: persist consent record with timestamp
  console.info(`Consent captured for session ${sessionId}, number ${phoneNumber}`);
}
