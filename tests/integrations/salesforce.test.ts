import { createVoiceCallRecord, postTranscriptNote, syncCallToSalesforce } from '../../src/integrations/salesforce.js';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockOk(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const sfEnv = {
  SALESFORCE_INSTANCE_URL:  'https://test.my.salesforce.com',
  SALESFORCE_ACCESS_TOKEN:  'sf_token_123',
  SALESFORCE_REFRESH_TOKEN: 'sf_refresh_123',
  SALESFORCE_CLIENT_ID:     'sf_client_id',
  SALESFORCE_CLIENT_SECRET: 'sf_client_secret',
};

describe('createVoiceCallRecord', () => {
  beforeEach(() => { Object.assign(process.env, sfEnv); mockFetch.mockReset(); });

  it('POSTs to /sobjects/VoiceCall and returns id', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ id: 'sf_vc_99' }));
    const id = await createVoiceCallRecord({
      callSid: 'CA123', fromNumber: '+34600000000', toNumber: '+34611111111',
      startTime: '2026-05-29T10:00:00Z', endTime: '2026-05-29T10:02:00Z',
      durationSeconds: 120, summary: 'Test', intent: 'qualify', outcome: 'success',
    });
    expect(id).toBe('sf_vc_99');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sobjects/VoiceCall'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('retries once after 401 with refreshed token', async () => {
    mockFetch
      .mockReturnValueOnce(mockOk({}, 401))              // first call → 401
      .mockReturnValueOnce(mockOk({ access_token: 'new_token' })) // token refresh
      .mockReturnValueOnce(mockOk({ id: 'sf_vc_refreshed' }));    // retry

    const id = await createVoiceCallRecord({
      callSid: 'CA1', fromNumber: '+1', toNumber: '+2',
      startTime: '', endTime: '', durationSeconds: 0,
      summary: '', intent: '', outcome: '',
    });
    expect(id).toBe('sf_vc_refreshed');
    expect(process.env.SALESFORCE_ACCESS_TOKEN).toBe('new_token');
  });
});

describe('postTranscriptNote', () => {
  beforeEach(() => { Object.assign(process.env, sfEnv); mockFetch.mockReset(); });

  it('skips if utterances is empty', async () => {
    await postTranscriptNote('sf_vc_1', []);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates ContentNote and links via ContentDocumentLink', async () => {
    mockFetch
      .mockReturnValueOnce(mockOk({ id: 'note_1' }))  // ContentNote
      .mockReturnValueOnce(mockOk({}));                // ContentDocumentLink
    await postTranscriptNote('sf_vc_1', [
      { speaker: 'agent', text: 'Hola', ts: Date.now() },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const noteBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(noteBody.Title).toBe('Transcripción de llamada IA');
    expect(noteBody.Content).toBeTruthy(); // base64
  });
});

describe('syncCallToSalesforce', () => {
  beforeEach(() => { Object.assign(process.env, sfEnv); mockFetch.mockReset(); });

  it('orchestrates VoiceCall + transcript note', async () => {
    mockFetch
      .mockReturnValueOnce(mockOk({ id: 'sf_vc_42' }))
      .mockReturnValueOnce(mockOk({ id: 'note_1' }))
      .mockReturnValueOnce(mockOk({}));

    const result = await syncCallToSalesforce({
      payload: {
        callSid: 'CA1', fromNumber: '+1', toNumber: '+2',
        startTime: '2026-05-29T10:00:00Z', endTime: '2026-05-29T10:02:00Z',
        durationSeconds: 120, summary: 'ok', intent: 'qualify', outcome: 'success',
      },
      utterances: [{ speaker: 'user', text: 'Hola', ts: Date.now() }],
    });
    expect(result.voiceCallId).toBe('sf_vc_42');
  });
});
