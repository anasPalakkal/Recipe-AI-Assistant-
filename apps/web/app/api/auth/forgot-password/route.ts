// app/api/auth/forgot-password/route.ts
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyToApi("/internal/auth/forgot-password", {
    method: "POST",
    body: await request.text(),
  });
}