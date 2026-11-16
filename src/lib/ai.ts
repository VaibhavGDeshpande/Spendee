// UPB gateway (OpenAI-compatible) when UPB_AI_GATEWAY_KEY is set, else plain OpenAI.
// GEMINI_API_KEY is accepted as the OpenAI key: that is the name this project's .env.local already uses.
export function aiConfig() {
  const gatewayKey = process.env.UPB_AI_GATEWAY_KEY?.trim();
  const apiKey = gatewayKey || (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL || (gatewayKey ? 'https://ai-gateway.uni-paderborn.de/v1' : 'https://api.openai.com/v1'),
    model: process.env.AI_MODEL || (gatewayKey ? 'openai.gpt-6-luna' : 'gpt-4o-mini'),
  };
}
