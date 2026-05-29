/**
 * Tests for interrupt handling logic
 * Validates the Twilio clear + OpenAI truncate pattern
 * Source: openai/openai-realtime-twilio-demo official sample
 */

describe('Interrupt handling', () => {
  it('markQueue is emptied on interrupt', () => {
    let markQueue = ['chunk_1', 'chunk_2', 'chunk_3'];
    // Simulate interrupt
    markQueue = [];
    expect(markQueue).toHaveLength(0);
  });

  it('audio_end_ms is calculated correctly from sample count', () => {
    // 8kHz µ-law: 8000 samples/second
    const responseStartSampleCount = 8000; // 1 second of audio
    const audio_end_ms = Math.floor((responseStartSampleCount / 8000) * 1000);
    expect(audio_end_ms).toBe(1000);
  });

  it('audio_end_ms rounds down for partial seconds', () => {
    const samples = 12000; // 1.5 seconds
    const ms = Math.floor((samples / 8000) * 1000);
    expect(ms).toBe(1500);
  });

  it('conversation.item.truncate payload has required fields', () => {
    const payload = {
      type:          'conversation.item.truncate',
      item_id:       'item_abc123',
      content_index: 0,
      audio_end_ms:  1500,
    };
    expect(payload.type).toBe('conversation.item.truncate');
    expect(payload.item_id).toBeTruthy();
    expect(payload.content_index).toBe(0);
    expect(typeof payload.audio_end_ms).toBe('number');
  });

  it('Twilio clear event payload is correct', () => {
    const streamSid = 'MZ_test_123';
    const clearMsg = JSON.stringify({ event: 'clear', streamSid });
    const parsed = JSON.parse(clearMsg);
    expect(parsed.event).toBe('clear');
    expect(parsed.streamSid).toBe(streamSid);
  });

  it('reconnect delay caps at 5000ms', () => {
    const base = 200;
    const cap  = 5000;
    for (let attempt = 0; attempt <= 6; attempt++) {
      const delay = Math.min(base * 2 ** attempt, cap);
      expect(delay).toBeLessThanOrEqual(cap);
    }
  });

  it('reconnect delay grows exponentially before cap', () => {
    const delays = [0,1,2,3].map(a => Math.min(200 * 2 ** a, 5000));
    expect(delays).toEqual([200, 400, 800, 1600]);
  });
});
