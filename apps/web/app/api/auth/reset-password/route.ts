// app/api/auth/reset-password/route.ts
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyToApi("/internal/auth/reset-password", {
    method: "POST",
    body: await request.text(),
  });
}