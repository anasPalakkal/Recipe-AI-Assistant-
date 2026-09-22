import { BrevoEmailProvider } from "./brevo.provider.js";
import type { EmailProvider } from "./types.js";

export const emailProvider: EmailProvider = new BrevoEmailProvider();
export type { EmailProvider } from "./types.js";