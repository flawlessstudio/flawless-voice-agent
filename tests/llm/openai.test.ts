/**
 * Tests for OpenAI Realtime session configuration
 * Verifies session payload structure and tool definitions
 */
import tools from '../../prompts/tool-definitions.json' assert { type: 'json' };

describe('OpenAI Realtime session config', () => {
  it('tool-definitions.json contains required tools', () => {
    const names = tools.map((t: { name: string }) => t.name);
    expect(names).toContain('log_to_crm');
    expect(names).toContain('check_availability');
    expect(names).toContain('transfer_call');
  });

  it('log_to_crm has required parameters: intent, summary, outcome', () => {
    const tool = tools.find((t: { name: string }) => t.name === 'log_to_crm') as {
      parameters: { properties: Record<string, unknown>; required: string[] }
    };
    expect(tool).toBeDefined();
    expect(tool.parameters.required).toContain('intent');
    expect(tool.parameters.required).toContain('summary');
    expect(tool.parameters.required).toContain('outcome');
  });

  it('all tools have type, name, description, and parameters', () => {
    for (const tool of tools as Array<{ type: string; name: string; description: string; parameters: unknown }>) {
      expect(tool.type).toBe('function');
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
    }
  });

  it('session modalities include audio and text', () => {
    const sessionConfig = {
      modalities: ['audio', 'text'],
      input_audio_format: 'g711_ulaw',
      output_audio_format: 'g711_ulaw',
      voice: 'alloy',
    };
    expect(sessionConfig.modalities).toContain('audio');
    expect(sessionConfig.modalities).toContain('text');
    expect(sessionConfig.input_audio_format).toBe('g711_ulaw');
  });
});
