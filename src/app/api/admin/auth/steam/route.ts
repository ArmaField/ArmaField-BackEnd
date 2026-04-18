import { NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/auth/steam
 * Redirects the user to Steam's OpenID login page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = `${url.origin}/api/admin/auth/steam/callback`;

  const steamUrl = buildSteamLoginUrl(callbackUrl);
  return NextResponse.redirect(steamUrl);
}
