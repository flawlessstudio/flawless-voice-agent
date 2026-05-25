// HubSpot CRM integration
export async function upsertContact(data: Record<string, string>): Promise<void> {
  // TODO: implement HubSpot Contacts API
  console.info('HubSpot upsert', data);
}

export async function logCall(data: Record<string, unknown>): Promise<void> {
  // TODO: implement HubSpot Engagements API
  console.info('HubSpot log call', data);
}
