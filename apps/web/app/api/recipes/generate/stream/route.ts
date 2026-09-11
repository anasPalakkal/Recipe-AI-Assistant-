import { cookies } from "next/headers";

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not set");
  }
  return url;
}

export async function POST(request: Request): Promise<Response> {
  const apiBaseUrl = getApiBaseUrl();
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid");

  const body = await request.text();

  const apiResponse = await fetch(`${apiBaseUrl}/internal/recipes/generate/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sid && { cookie: `sid=${sid.value}` }),
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