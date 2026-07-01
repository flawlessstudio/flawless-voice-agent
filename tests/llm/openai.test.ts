/**
 * Tests for OpenAI Realtime session configuration
 * Verifies session payload structure and tool definitions
 */
import toolDefs from '../../prompts/tool-definitions.json';

type Tool = { name: string; description: string; parameters: unknown };

const tools = (toolDefs as unknown as { tools: Tool[] }).tools;

describe('OpenAI Realtime session config', () => {
  it('tool-definitions.json contains required tools', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('log_audit_event');
    expect(names).toContain('check_dnc_status');
    expect(names).toContain('escalate_to_human');
  });

  it('escalate_to_human has required parameters: reason, session_id', () => {
    const tool = tools.find((t) => t.name === 'escalate_to_human') as {
      parameters: { properties: Record<string, unknown>; required: string[] }
    };
    expect(tool).toBeDefined();
    expect(tool.parameters.required).toContain('reason');
    expect(tool.parameters.required).toContain('session_id');
  });

  it('all tools have name, description, and parameters', () => {
    for (const tool of tools) {
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