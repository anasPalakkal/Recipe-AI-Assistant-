import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not set");
  }
  return url;
}

export async function proxyToApi(path: string, init: RequestInit): Promise<NextResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid");

  const apiResponse = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(sid && { cookie: `sid=${sid.value}` }),
      ...init.headers,
    },
  });

  const responseBody = apiResponse.status === 204 ? null : await apiResponse.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: apiResponse.status,
    headers: apiResponse.headers.get("content-type")
      ? { "content-type": apiResponse.headers.get("content-type")! }
      : {},
  });

  for (const cookie of apiResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}