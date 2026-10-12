import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import { clientIp } from "./rate-limit.js";

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
    const wrongSameLength = "x".repeat(PROXY_SECRET.length);
    const request = buildRequest({
      "x-internal-proxy-secret": wrongSameLength,
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