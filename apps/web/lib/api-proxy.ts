import { NextResponse } from "next/server";
import { getApiBaseUrl, upstreamHeaders } from "./api-upstream";

export async function proxyToApi(path: string, init: RequestInit): Promise<NextResponse> {
  const apiResponse = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await upstreamHeaders()),
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