import type { FastifyServerOptions } from "fastify";
import { env } from "../config/env.js";

// Passed into Fastify's constructor so Fastify builds its own internal
// logger instance. Do NOT construct a separate `pino()` instance here and
// hand it to Fastify directly - the two don't type-check against each
// other cleanly, and Fastify already wraps Pino for you.
export const loggerOptions: FastifyServerOptions["logger"] = {
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
};