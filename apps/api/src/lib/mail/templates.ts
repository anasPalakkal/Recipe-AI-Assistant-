export function verificationEmailHtml(code: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;
}

export function passwordResetEmailHtml(resetLink: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, ignore this email — your password will not change.</p>
    </div>
  `;
}

export function googleAccountEmailHtml(): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Password reset requested</h2>
      <p>This account signs in with Google and doesn't have a password. Use "Sign in with Google" instead.</p>
    </div>
  `;
}

export function passwordChangedEmailHtml(): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Your password was changed</h2>
      <p>This is a confirmation that your RecipeAI password was just changed. All other active sessions have been logged out.</p>
      <p>If you didn't do this, your account may be compromised — reset your password again immediately.</p>
    </div>
  `;
}