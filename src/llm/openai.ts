import type WebSocket from 'ws';

export function createOpenAISession(ws: WebSocket): void {
  const agentName = process.env.AGENT_NAME ?? 'Alex';
  const lang = process.env.AGENT_LANGUAGE === 'es' ? 'español' : 'English';

  const instructions = [
    `Eres ${agentName}, agente de voz de Flawless Studio.`,
    'Reglas:',
    '1. Identifícate como IA en el primer turno.',
    '2. Sé conciso y profesional.',
    '3. No finjas ser humano.',
    '4. Ofrece transferencia humana cuando sea necesario.',
    '5. Recoge solo la información necesaria.',
    `Habla en ${lang}.`,
  ].join('\n');

  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['audio', 'text'],
      instructions,
      voice: 'alloy',
      input_audio_format: 'g711_ulaw',
      output_audio_format: 'g711_ulaw',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 700,
      },
      tools: [
        {
          type: 'function',
          name: 'log_to_crm',
          description: 'Registra datos de la llamada en el CRM al finalizar',
          parameters: {
            type: 'object',
            properties: {
              contact_name: { type: 'string', description: 'Nombre del contacto' },
              intent: { type: 'string', enum: ['qualify', 'schedule', 'objection', 'handoff', 'other'] },
              summary: { type: 'string', description: 'Resumen breve de la llamada' },
              outcome: { type: 'string', enum: ['success', 'no_interest', 'callback', 'handoff'] },
            },
            required: ['intent', 'summary', 'outcome'],
          },
        },
      ],
      tool_choice: 'auto',
      temperature: 0.7,
      max_response_output_tokens: 200,
    },
  }));
}
