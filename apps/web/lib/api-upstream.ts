import { cookies, headers } from "next/headers";

export function getApiBaseUrl(): string {
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

// Headers every web-to-API call carries: proof the call comes from this app,
// the real client IP, and the session cookie.
export async function upstreamHeaders(): Promise<Record<string, string>> {
  const sid = (await cookies()).get("sid");
  const clientIp = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();

  return {
    "x-internal-proxy-secret": getProxySecret(),
    ...(sid && { cookie: `sid=${sid.value}` }),
    ...(clientIp && { "x-client-ip": clientIp }),
  };
}