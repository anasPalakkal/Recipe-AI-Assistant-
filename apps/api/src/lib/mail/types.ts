export interface EmailProvider {
  sendVerificationEmail(to: string, code: string): Promise<void>;
  sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
  sendAccountUsesGoogleEmail(to: string): Promise<void>;
}