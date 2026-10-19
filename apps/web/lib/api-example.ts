export const API_HOST = "https://elaai-api.onrender.com";

export const DEFAULT_LIMITS = { perMinute: 5, perDay: 3, perMonth: 30 } as const;

const KEY_PLACEHOLDER = "rk_live_YOUR_KEY";
const EXAMPLE_PROMPT = "a quick vegetarian pasta dish";

export function buildCurlExample(apiKey: string = KEY_PLACEHOLDER): string {
  return `curl -X POST ${API_HOST}/v1/recipes/generate \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "${EXAMPLE_PROMPT}"}'`;
}