import { getApiBaseUrl, upstreamHeaders } from "@/lib/api-upstream";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();

  const apiResponse = await fetch(`${getApiBaseUrl()}/internal/recipes/generate/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(await upstreamHeaders()),
    },
    body,
  });

  if (!apiResponse.body) {
    return new Response(null, { status: apiResponse.status });
  }

  return new Response(apiResponse.body, {
    status: apiResponse.status,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}