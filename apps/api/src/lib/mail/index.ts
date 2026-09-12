import { ResendEmailProvider } from "./resend.provider.js";
import type { EmailProvider } from "./types.js";

export const emailProvider: EmailProvider = new ResendEmailProvider();
export type { EmailProvider } from "./types.js";