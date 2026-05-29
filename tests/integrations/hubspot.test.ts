import { createHubSpotCall, postTranscript, syncCallToHubSpot } from '../../src/integrations/hubspot.js';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('createHubSpotCall', () => {
  beforeEach(() => {
    process.env.HUBSPOT_ACCESS_TOKEN = 'pat-test-token';
    mockFetch.mockReset();
  });

  it('POSTs to /crm/v3/objects/calls and returns id', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ id: 'hs_call_42' }));
    const id = await createHubSpotCall({
      callSid: 'CA123', fromNumber: '+34600000000', toNumber: '+34611111111',
      durationMs: 60000, summary: 'Test call', intent: 'qualify', outcome: 'success',
    });
    expect(id).toBe('hs_call_42');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/crm/v3/objects/calls'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') }));
    await expect(
      createHubSpotCall({ callSid: 'x', fromNumber: '', toNumber: '', durationMs: 0, summary: '', intent: '', outcome: '' })
    ).rejects.toThrow('401');
  });
});

describe('postTranscript', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('skips if utterances is empty', async () => {
    await postTranscript('123', []);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('POSTs transcript utterances', async () => {
    mockFetch.mockReturnValueOnce(mockOk({}));
    const now = Date.now();
    await postTranscript('123', [
      { speaker: 'agent', text: 'Hola', ts: now },
      { speaker: 'user',  text: 'Buenos días', ts: now + 1000 },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.transcriptCreateUtterances).toHaveLength(2);
    expect(body.transcriptCreateUtterances[0].speaker).toBe('AGENT');
    expect(body.transcriptCreateUtterances[1].speaker).toBe('CONTACT');
  });
});

describe('syncCallToHubSpot', () => {
  beforeEach(() => {
    process.env.HUBSPOT_ACCESS_TOKEN = 'pat-test-token';
    mockFetch.mockReset();
  });

  it('orchestrates create + transcript + recording notify', async () => {
    mockFetch
      .mockReturnValueOnce(mockOk({ id: 'hs_42' }))   // createCall
      .mockReturnValueOnce(mockOk({}))                  // postTranscript
      .mockReturnValueOnce(mockOk({}));                 // notifyRecordingReady

    const result = await syncCallToHubSpot({
      payload: { callSid: 'CA1', fromNumber: '+1', toNumber: '+2', durationMs: 5000, summary: 'ok', intent: 'qualify', outcome: 'success' },
      utterances: [{ speaker: 'agent', text: 'Hi', ts: Date.now() }],
    });
    expect(result.callId).toBe('hs_42');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
