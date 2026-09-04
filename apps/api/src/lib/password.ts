import { hash, verify } from "@node-rs/argon2";

// OWASP-minimum argon2id params for interactive login.
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(hashValue: string, plain: string): Promise<boolean> {
  return verify(hashValue, plain);
}