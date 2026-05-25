// OpenAI LLM adapter
// Handles Realtime API sessions and Agents API tool calls
import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chatCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
  return openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages,
  });
}
