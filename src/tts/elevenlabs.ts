// ElevenLabs TTS adapter
export async function synthesize(text: string): Promise<Buffer> {
  // TODO: implement ElevenLabs streaming synthesis
  console.info(`TTS synthesize: ${text.substring(0, 50)}...`);
  return Buffer.from('');
}
