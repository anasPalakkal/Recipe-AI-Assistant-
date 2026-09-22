import { env } from "../../config/env.js";
import { UpstreamServiceError } from "../errors.js";
import type { EmailProvider } from "./types.js";
import {
  verificationEmailHtml,
  passwordResetEmailHtml,
  googleAccountEmailHtml,
  passwordChangedEmailHtml,
} from "./templates.js";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10_000;

export class BrevoEmailProvider implements EmailProvider {
  async sendVerificationEmail(to: string, code: string): Promise<void> {
    await this.send(to, "Verify your RecipeAI email", verificationEmailHtml(code));
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    await this.send(to, "Reset your RecipeAI password", passwordResetEmailHtml(resetLink));
  }

  async sendAccountUsesGoogleEmail(to: string): Promise<void> {
    await this.send(to, "RecipeAI password reset requested", googleAccountEmailHtml());
  }

  async sendPasswordChangedEmail(to: string): Promise<void> {
    await this.send(to, "Your RecipeAI password was changed", passwordChangedEmailHtml());
  }

  private async send(to: string, subject: string, htmlContent: string): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(BREVO_SEND_URL, {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: "RecipeAI", email: env.EMAIL_FROM },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const reason = err instanceof Error && err.name === "AbortError" ? "timed out" : "network error";
      throw new UpstreamServiceError(`Brevo send failed: ${reason}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message
      : response.statusText;
  throw new UpstreamServiceError(`Brevo send failed (${response.status}): ${message}`);
}
  }
}