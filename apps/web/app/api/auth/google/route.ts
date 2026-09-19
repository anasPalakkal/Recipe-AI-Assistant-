import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToApi("/internal/auth/google", { method: "POST", body });
}