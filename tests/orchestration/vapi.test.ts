import { routeVapiEvent } from '../../src/orchestration/vapi.js';
import type { VapiWebhookEvent } from '../../src/orchestration/vapi.js';

describe('routeVapiEvent', () => {
  const call = { id: 'vapi_call_123', status: 'active', phoneNumberId: 'ph_1' };

  it('calls onCallStarted for call-started event', () => {
    const onCallStarted = jest.fn();
    const event: VapiWebhookEvent = { type: 'call-started', call };
    routeVapiEvent(event, { onCallStarted });
    expect(onCallStarted).toHaveBeenCalledWith('vapi_call_123');
  });

  it('calls onCallEnded with reason for call-ended event', () => {
    const onCallEnded = jest.fn();
    const event: VapiWebhookEvent = { type: 'call-ended', call, endedReason: 'customer-ended-call' };
    routeVapiEvent(event, { onCallEnded });
    expect(onCallEnded).toHaveBeenCalledWith('vapi_call_123', 'customer-ended-call');
  });

  it('calls onTranscript for transcript event', () => {
    const onTranscript = jest.fn();
    const event: VapiWebhookEvent = { type: 'transcript', call, transcript: 'Hola soy Alex' };
    routeVapiEvent(event, { onTranscript });
    expect(onTranscript).toHaveBeenCalledWith('vapi_call_123', 'Hola soy Alex');
  });

  it('calls onEndOfCallReport for end-of-call-report event', () => {
    const onEndOfCallReport = jest.fn();
    const artifact = { transcript: 'Full transcript', summary: 'Good call', recordingUrl: undefined };
    const event: VapiWebhookEvent = { type: 'end-of-call-report', call, artifact };
    routeVapiEvent(event, { onEndOfCallReport });
    expect(onEndOfCallReport).toHaveBeenCalledWith('vapi_call_123', artifact);
  });

  it('returns function call result for function-call event', async () => {
    const onFunctionCall = jest.fn().mockResolvedValue({ booked: true });
    const event: VapiWebhookEvent = {
      type: 'function-call',
      call,
      functionCall: { name: 'log_to_crm', parameters: { intent: 'qualify' } },
    };
    const result = routeVapiEvent(event, { onFunctionCall });
    await expect(result).resolves.toEqual({ booked: true });
  });
});
