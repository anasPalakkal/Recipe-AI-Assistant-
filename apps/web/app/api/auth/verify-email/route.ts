// app/api/auth/verify-email/route.ts
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyToApi("/internal/auth/verify-email", {
    method: "POST",
    body: await request.text(),
  });
}