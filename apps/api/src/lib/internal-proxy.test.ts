import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import type { FastifyRequest } from "fastify";
import { AppError } from "./errors.js";
import { clientIp, requireInternalProxy } from "./internal-proxy.js";

const PROXY_SECRET = process.env.INTERNAL_PROXY_SECRET as string;
const DIRECT_IP = "10.0.0.1";

function buildRequest(headers: Record<string, string>): FastifyRequest {
  return { headers, ip: DIRECT_IP } as unknown as FastifyRequest;
}

describe("clientIp", () => {
  it("uses the forwarded IP when the proxy secret matches", () => {
    const request = buildRequest({
      "x-internal-proxy-secret": PROXY_SECRET,
      "x-client-ip": "203.0.113.7",
    });
    expect(clientIp(request)).toBe("203.0.113.7");
  });

  it("ignores the forwarded IP when the secret header is missing", () => {
    expect(clientIp(buildRequest({ "x-client-ip": "203.0.113.7" }))).toBe(DIRECT_IP);
  });

  it("ignores the forwarded IP when the secret is wrong", () => {
    const request = buildRequest({
      "x-internal-proxy-secret": "x".repeat(PROXY_SECRET.length),
      "x-client-ip": "203.0.113.7",
    });
    expect(clientIp(request)).toBe(DIRECT_IP);
  });

  it("ignores the forwarded IP when the secret has a different length", () => {
    const request = buildRequest({
      "x-internal-proxy-secret": "short",
      "x-client-ip": "203.0.113.7",
    });
    expect(clientIp(request)).toBe(DIRECT_IP);
  });

  it("falls back to the direct IP for an empty or oversized forwarded value", () => {
    const empty = buildRequest({ "x-internal-proxy-secret": PROXY_SECRET, "x-client-ip": "" });
    const oversized = buildRequest({
      "x-internal-proxy-secret": PROXY_SECRET,
      "x-client-ip": "9".repeat(46),
    });
    expect(clientIp(empty)).toBe(DIRECT_IP);
    expect(clientIp(oversized)).toBe(DIRECT_IP);
  });
});

describe("requireInternalProxy", () => {
  function buildApp() {
    const app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      const known = error instanceof AppError;
      return reply
        .status(known ? error.statusCode : 500)
        .send({ error: { code: known ? error.code : "INTERNAL_ERROR" } });
    });
    app.register(async (internal) => {
      internal.addHook("onRequest", requireInternalProxy);
      internal.get("/internal/ping", async () => ({ ok: true }));
    });
    app.get("/health", async () => ({ status: "ok" }));
    return app;
  }

  it("rejects internal requests without the proxy secret", async () => {
    const response = await buildApp().inject({ method: "GET", url: "/internal/ping" });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN");
  });

  it("rejects internal requests with a wrong secret", async () => {
    const response = await buildApp().inject({
      method: "GET",
      url: "/internal/ping",
      headers: { "x-internal-proxy-secret": "x".repeat(PROXY_SECRET.length) },
    });
    expect(response.statusCode).toBe(403);
  });

  it("allows internal requests with the correct secret", async () => {
    const response = await buildApp().inject({
      method: "GET",
      url: "/internal/ping",
      headers: { "x-internal-proxy-secret": PROXY_SECRET },
    });
    expect(response.statusCode).toBe(200);
  });

  it("does not guard routes outside the internal scope", async () => {
    const response = await buildApp().inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
  });
});