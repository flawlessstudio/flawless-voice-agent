// Salesforce CRM integration
export async function upsertLead(data: Record<string, string>): Promise<void> {
  // TODO: implement Salesforce REST API
  console.info('Salesforce upsert lead', data);
}

export async function logActivity(data: Record<string, unknown>): Promise<void> {
  // TODO: implement Salesforce Activity API
  console.info('Salesforce log activity', data);
}
