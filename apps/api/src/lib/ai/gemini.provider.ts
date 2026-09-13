import { createRecipeSchema, type RecipeDraft } from "@recipeai/shared";
import { UpstreamServiceError } from "../errors.js";
import { env } from "../../config/env.js";
import type { AiProvider, ConsumerType, RecipeGenerationResult } from "./types.js";

const MODEL = "gemini-3.6-flash";

// Non-streaming requests should resolve well within this window; if Gemini
// hasn't responded by then, something's wrong upstream and we fail fast
// rather than let the caller hang indefinitely.
const REQUEST_TIMEOUT_MS = 30_000;
// Streaming covers the full generation, not just the first byte, so it gets
// a longer ceiling. This is a total-duration cap, not an idle timeout — a
// slow-but-steady stream is fine; a stalled one is not.
const STREAM_TIMEOUT_MS = 60_000;

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const MAX_OUTPUT_TOKENS = 4096;

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

function resolveApiKey(consumerType: ConsumerType): string {
    return consumerType === "public" ? env.GEMINI_API_KEY_PUBLIC : env.GEMINI_API_KEY;
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
            maxOutputTokens: MAX_OUTPUT_TOKENS,
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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Combines an optional caller-provided AbortSignal (e.g. client disconnect)
// with an internal timeout, while letting call sites tell the two apart —
// a timeout should produce a clear error, a caller-initiated abort should
// fail silently (the caller already knows and doesn't need to be told).
function createTimeoutController(timeoutMs: number, externalSignal?: AbortSignal) {
    const controller = new AbortController();
    let timedOut = false;

    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener("abort", onExternalAbort);
    }

    return {
        signal: controller.signal,
        didTimeout: () => timedOut,
        cleanup: () => {
            clearTimeout(timeoutId);
            externalSignal?.removeEventListener("abort", onExternalAbort);
        },
    };
}

// Retries transient upstream failures (network errors, 429/5xx) before any
// response body has been read. Never retries after streaming has started,
// and never retries an aborted request — an abort is intentional, retrying
// it would ignore the caller's cancellation.
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if ((options.signal as AbortSignal | undefined)?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }

        try {
            const response = await fetch(url, options);
            if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
                return response;
            }
            lastError = new UpstreamServiceError(`AI provider returned status ${response.status}`);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") throw err;
            lastError = err;
        }

        if (attempt < MAX_RETRIES) {
            await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        }
    }

    if (lastError instanceof UpstreamServiceError) throw lastError;
    throw new UpstreamServiceError("Failed to reach AI provider after retries");
}

export class GeminiProvider implements AiProvider {
    async generateRecipe(prompt: string, consumerType: ConsumerType): Promise<RecipeGenerationResult> {
        const url = `${env.AI_GATEWAY_BASE_URL}/google-ai-studio/v1/models/${MODEL}:generateContent`;
        const timeout = createTimeoutController(REQUEST_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetchWithRetry(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-goog-api-key": resolveApiKey(consumerType),
                },
                body: buildRequestBody(prompt),
                signal: timeout.signal,
            });
        } catch {
            if (timeout.didTimeout()) throw new UpstreamServiceError("AI provider request timed out");
            throw new UpstreamServiceError("Failed to reach AI provider");
        } finally {
            timeout.cleanup();
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

    async *generateRecipeStream(
        prompt: string,
        consumerType: ConsumerType,
        signal?: AbortSignal,
    ): AsyncGenerator<string> {
        const url = `${env.AI_GATEWAY_BASE_URL}/google-ai-studio/v1/models/${MODEL}:streamGenerateContent?alt=sse`;
        const timeout = createTimeoutController(STREAM_TIMEOUT_MS, signal);

        let response: Response;
        try {
            response = await fetchWithRetry(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-goog-api-key": resolveApiKey(consumerType),
                },
                body: buildRequestBody(prompt),
                signal: timeout.signal,
            });
        } catch {
            if (timeout.didTimeout()) throw new UpstreamServiceError("AI provider request timed out");
            if (signal?.aborted) {
                timeout.cleanup();
                return;
            }
            timeout.cleanup();
            throw new UpstreamServiceError("Failed to reach AI provider");
        }

        if (!response.ok || !response.body) {
            timeout.cleanup();
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
            if (timeout.didTimeout()) throw new UpstreamServiceError("AI provider request timed out");
            if (signal?.aborted) return;
            if (err instanceof UpstreamServiceError) throw err;
            throw new UpstreamServiceError("AI provider stream failed mid-response");
        } finally {
            reader.releaseLock();
            timeout.cleanup();
        }
    }
}