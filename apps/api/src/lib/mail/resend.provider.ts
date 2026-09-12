import { Resend } from "resend";
import { env } from "../../config/env.js";
import { UpstreamServiceError } from "../errors.js";
import type { EmailProvider } from "./types.js";

const resend = new Resend(env.RESEND_API_KEY);

export class ResendEmailProvider implements EmailProvider {
  async sendVerificationEmail(to: string, code: string): Promise<void> {
    await this.send(to, "Verify your RecipeAI email", verificationEmailHtml(code));
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    await this.send(to, "Reset your RecipeAI password", passwordResetEmailHtml(resetLink));
  }

  async sendAccountUsesGoogleEmail(to: string): Promise<void> {
    await this.send(to, "RecipeAI password reset requested", googleAccountEmailHtml());
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      throw new UpstreamServiceError(`Resend send failed: ${error.message}`);
    }
  }
}

function verificationEmailHtml(code: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;
}

function passwordResetEmailHtml(resetLink: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, ignore this email — your password will not change.</p>
    </div>
  `;
}

function googleAccountEmailHtml(): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Password reset requested</h2>
      <p>This account signs in with Google and doesn't have a password. Use "Sign in with Google" instead.</p>
    </div>
  `;
}