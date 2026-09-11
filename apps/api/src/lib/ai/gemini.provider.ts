import { createRecipeSchema, type RecipeDraft } from "@recipeai/shared";
import { UpstreamServiceError } from "../errors.js";
import { env } from "../../config/env.js";
import type { AiProvider, RecipeGenerationResult } from "./types.js";

const MODEL = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION = `You are a recipe generation assistant. Given a user's request, produce a single recipe as a JSON object with this exact shape:
{
  "title": string,
  "description": string | null,
  "servings": number | null,
  "prepTimeMinutes": number | null,
  "cookTimeMinutes": number | null,
  "ingredients": [{ "name": string, "quantity": number | null, "unit": string | null }],
  "steps": [{ "content": string }]
}
Return only the JSON object, with no markdown formatting or commentary.`;

interface GeminiApiResponse {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
    }>;
}

function buildRequestBody(prompt: string) {
    return JSON.stringify({
        contents: [
            {
                role: "user",
                parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nUser request: ${prompt}` }],
            },
        ],
        generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "low" },
        },
    });
}

function tryParseUpstreamError(text: string): string | null {
    try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        return parsed.error?.message ?? null;
    } catch {
        return null;
    }
}

export class GeminiProvider implements AiProvider {
    async generateRecipe(prompt: string): Promise<RecipeGenerationResult> {
        const url = `${env.AI_GATEWAY_BASE_URL}/google-ai-studio/v1/models/${MODEL}:generateContent`;

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-goog-api-key": env.GEMINI_API_KEY,
                },
                body: buildRequestBody(prompt),
            });
        } catch {
            throw new UpstreamServiceError("Failed to reach AI provider");
        }

        if (!response.ok) {
            throw new UpstreamServiceError(`AI provider returned status ${response.status}`);
        }

        let payload: unknown;
        try {
            payload = await response.json();
        } catch {
            throw new UpstreamServiceError("AI provider returned an invalid response envelope");
        }

        const text = (payload as GeminiApiResponse)?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new UpstreamServiceError("AI provider returned no content");
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            throw new UpstreamServiceError("AI provider returned malformed JSON");
        }

        const result = createRecipeSchema.safeParse(parsed);
        if (!result.success) {
            throw new UpstreamServiceError("AI provider returned a recipe that failed validation");
        }

        return { draft: result.data as RecipeDraft, raw: parsed };
    }

    async *generateRecipeStream(prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
        const url = `${env.AI_GATEWAY_BASE_URL}/google-ai-studio/v1/models/${MODEL}:streamGenerateContent?alt=sse`;

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-goog-api-key": env.GEMINI_API_KEY,
                },
                body: buildRequestBody(prompt),
                signal,
            });
        } catch {
            if (signal?.aborted) return;
            throw new UpstreamServiceError("Failed to reach AI provider");
        }

        if (!response.ok || !response.body) {
            throw new UpstreamServiceError(`AI provider returned status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

                let boundary = buffer.indexOf("\n\n");
                while (boundary !== -1) {
                    const rawEvent = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);

                    const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
                    if (dataLine) {
                        const jsonStr = dataLine.slice(5).trim();
                        try {
                            const payload: GeminiApiResponse = JSON.parse(jsonStr);
                            const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) yield text;
                        } catch {
                            // partial/malformed SSE frame, skip rather than abort the whole stream
                        }
                    }

                    boundary = buffer.indexOf("\n\n");
                }
            }

            const remainder = buffer.trim();
            if (remainder) {
                const upstreamError = tryParseUpstreamError(remainder);
                if (upstreamError) {
                    throw new UpstreamServiceError(`AI provider error: ${upstreamError}`);
                }
            }
        } catch (err) {
            if (signal?.aborted) return;
            if (err instanceof UpstreamServiceError) throw err;
            throw new UpstreamServiceError("AI provider stream failed mid-response");
        } finally {
            reader.releaseLock();
        }
    }
}