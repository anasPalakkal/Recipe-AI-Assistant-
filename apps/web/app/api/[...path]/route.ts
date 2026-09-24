import { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

const PROXIED_MODULES = new Set(["auth", "chat"]);

function resolveBackendPath(segments: string[]): string | null {
  if (segments.length < 2) return null;
  if (segments.some((segment) => segment === "." || segment === "..")) return null;

  const [module, ...rest] = segments;
  if (!module || !PROXIED_MODULES.has(module)) return null;

  return `/internal/${module}/${rest.join("/")}`;
}

async function handle(request: NextRequest, segments: string[]): Promise<Response> {
  const backendPath = resolveBackendPath(segments);
  if (!backendPath) {
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const hasBody = request.method !== "GET" && request.method !== "DELETE";
  return proxyToApi(`${backendPath}${request.nextUrl.search}`, {
    method: request.method,
    body: hasBody ? await request.text() : undefined,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  return handle(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  return handle(request, (await params).path);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return handle(request, (await params).path);
}