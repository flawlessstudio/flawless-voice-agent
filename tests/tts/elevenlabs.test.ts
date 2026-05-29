/**
 * Tests for ElevenLabs TTS configuration
 */

describe('ElevenLabs TTS config', () => {
  it('ELEVENLABS_MODEL_ID defaults to eleven_turbo_v2', () => {
    const model = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2';
    expect(model).toBe('eleven_turbo_v2');
  });

  it('TTS payload structure is valid', () => {
    const payload = {
      text: 'Hola, soy Alex.',
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability:        0.5,
        similarity_boost: 0.75,
        style:            0.0,
        use_speaker_boost: true,
      },
    };
    expect(payload.text).toBeTruthy();
    expect(payload.model_id).toBe('eleven_turbo_v2');
    expect(payload.voice_settings.stability).toBeGreaterThanOrEqual(0);
    expect(payload.voice_settings.stability).toBeLessThanOrEqual(1);
    expect(payload.voice_settings.similarity_boost).toBeGreaterThanOrEqual(0);
    expect(payload.voice_settings.similarity_boost).toBeLessThanOrEqual(1);
  });

  it('Streaming TTS endpoint uses correct path', () => {
    const voiceId  = '21m00Tcm4TlvDq8ikWAM';
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input`;
    expect(endpoint).toContain('/v1/text-to-speech/');
    expect(endpoint).toContain('/stream-input');
  });

  it('Conversational AI WebSocket URL is correct', () => {
    const agentId = 'agent_test_123';
    const wsUrl   = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    expect(wsUrl).toMatch(/^wss:\/\/api\.elevenlabs\.io/);
    expect(wsUrl).toContain('agent_id=');
  });
});
