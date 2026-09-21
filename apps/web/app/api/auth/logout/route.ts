// app/api/auth/logout/route.ts
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyToApi("/internal/auth/logout", {
    method: "POST",
    body: await request.text(),
  });
}