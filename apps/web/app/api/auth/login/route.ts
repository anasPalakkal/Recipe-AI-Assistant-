import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

export async function POST(request: Request) {
  const body = await request.text();

  const apiResponse = await fetch(`${API_BASE_URL}/internal/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

  const responseBody = await apiResponse.text();
  const response = new NextResponse(responseBody, {
    status: apiResponse.status,
    headers: { "content-type": "application/json" },
  });

  for (const cookie of apiResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}