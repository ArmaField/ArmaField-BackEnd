import { NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/auth/steam
 * Redirects the user to Steam's OpenID login page.
 */
export async function GET(request: Request) {
  // Respect reverse proxy (Caddy) forwarded headers; fall back to AUTH_URL or request URL
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  let origin: string;
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    origin = `${proto}://${forwardedHost}`;
  } else if (process.env.AUTH_URL) {
    origin = process.env.AUTH_URL;
  } else {
    origin = new URL(request.url).origin;
  }

  const callbackUrl = `${origin}/api/admin/auth/steam/callback`;
  const steamUrl = buildSteamLoginUrl(callbackUrl);
  return NextResponse.redirect(steamUrl);
}
