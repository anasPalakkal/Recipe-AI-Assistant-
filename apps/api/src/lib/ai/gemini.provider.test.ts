import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "./gemini.provider.js";
import { AiQuotaExhaustedError, UpstreamServiceError } from "../errors.js";

const dailyQuotaBody = JSON.stringify({
  error: {
    code: 429,
    status: "RESOURCE_EXHAUSTED",
    details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }],
  },
});

const refusedPayload = {
  candidates: [
    { content: { parts: [{ text: JSON.stringify({ type: "refused", reason: "out_of_scope" }) }] } },
  ],
};

function mockFetch(...responses: Array<() => Response>) {
  const fetchMock = vi.fn();
  responses.forEach((make) => fetchMock.mockImplementationOnce(async () => make()));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeminiProvider error handling", () => {
  it("fails immediately on a daily quota 429 without retrying", async () => {
    const fetchMock = mockFetch(() => new Response(dailyQuotaBody, { status: 429 }));

    await expect(new GeminiProvider().generateRecipe("pasta", "internal")).rejects.toBeInstanceOf(
      AiQuotaExhaustedError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a per-minute 429 and succeeds", async () => {
    const fetchMock = mockFetch(
      () => new Response("{}", { status: 429 }),
      () => new Response(JSON.stringify(refusedPayload), { status: 200 }),
    );

    const result = await new GeminiProvider().generateRecipe("pasta", "internal");

    expect(result.response.type).toBe("refused");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry limit on repeated 503s", async () => {
    const fetchMock = mockFetch(
      () => new Response("{}", { status: 503 }),
      () => new Response("{}", { status: 503 }),
      () => new Response("{}", { status: 503 }),
    );

    await expect(new GeminiProvider().generateRecipe("pasta", "internal")).rejects.toBeInstanceOf(
      UpstreamServiceError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses the public key for public consumers", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify(refusedPayload), { status: 200 }));

    await new GeminiProvider().generateRecipe("pasta", "public");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-public-key");
  });
});