import { GeminiProvider } from "./gemini.provider.js";
import type { AiProvider } from "./types.js";

export const aiProvider: AiProvider = new GeminiProvider();
export type { AiProvider, AiGenerationResult } from "./types.js";