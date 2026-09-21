// app/api/auth/resend-verification/route.ts
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyToApi("/internal/auth/resend-verification", {
    method: "POST",
    body: await request.text(),
  });
}