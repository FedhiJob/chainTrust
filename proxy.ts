import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getTokenExpiry(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { exp?: unknown };

    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

function clearTokenAndRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set({
    name: "token",
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return clearTokenAndRedirect(request);
  }

  const exp = getTokenExpiry(token);
  if (!exp || exp <= Math.floor(Date.now() / 1000)) {
    return clearTokenAndRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/batches/:path*", "/transfers/:path*", "/history/:path*"],
};
