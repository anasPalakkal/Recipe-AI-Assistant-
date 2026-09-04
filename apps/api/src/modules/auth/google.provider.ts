import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../lib/errors.js";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new UnauthorizedError("Invalid Google token");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
  };
}