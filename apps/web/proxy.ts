import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/recipes", "/verify-email"];

// Optimistic check only: cookie presence, not validity. Real session
// validation happens server-side in lib/session.ts.
export function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !request.cookies.has("sid")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/recipes/:path*", "/verify-email"],
};