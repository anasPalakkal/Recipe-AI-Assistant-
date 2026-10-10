import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not set");
  }
  return url;
}

function getProxySecret(): string {
  const secret = process.env.INTERNAL_PROXY_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_PROXY_SECRET is not set");
  }
  return secret;
}

export async function proxyToApi(
  path: string,
  init: RequestInit,
): Promise<NextResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid");
  const clientIp = (await headers())
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  const apiResponse = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(sid && { cookie: `sid=${sid.value}` }),
      ...(clientIp && { "x-client-ip": clientIp }),
      "x-internal-proxy-secret": getProxySecret(),
      ...init.headers,
    },
  });

  const responseBody =
    apiResponse.status === 204 ? null : await apiResponse.arrayBuffer();

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