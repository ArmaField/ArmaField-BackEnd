import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySteamLogin, fetchSteamProfile } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/auth/steam/callback
 * Handles the Steam OpenID callback.
 * Verifies the assertion, upserts the admin in the DB, then POSTs to the
 * Auth.js credentials callback endpoint to create a session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Verify the Steam OpenID response
  const steamId = await verifySteamLogin(url.searchParams);
  if (!steamId) {
    return NextResponse.redirect(
      `${url.origin}/login?error=SteamVerificationFailed`
    );
  }

  // Fetch Steam profile
  const profile = await fetchSteamProfile(steamId);

  // Upsert admin in DB (dynamic import for Prisma 7 build compatibility)
  const { prisma } = await import("@/lib/db");

  // Check if this is the first user (first user becomes SUPER_ADMIN)
  const adminCount = await prisma.admin.count();
  const isFirstUser = adminCount === 0;

  // Find the Super Admin built-in role for first user assignment
  let superAdminRoleId: string | null = null;
  if (isFirstUser) {
    const superAdminRole = await prisma.role.findUnique({
      where: { name: "Super Admin" },
      select: { id: true },
    });
    superAdminRoleId = superAdminRole?.id ?? null;
  }

  const admin = await prisma.admin.upsert({
    where: { steamId },
    update: {
      nickname: profile.nickname,
      avatar: profile.avatar,
    },
    create: {
      steamId,
      nickname: profile.nickname,
      avatar: profile.avatar,
      roleId: isFirstUser ? superAdminRoleId : null,
    },
    include: {
      role: { select: { name: true } },
    },
  });

  const hasRole = !!admin.role;
  const callbackUrl = hasRole ? "/" : "/no-access";

  logger.info(
    { steamId, nickname: profile.nickname, role: admin.role?.name ?? "none", isFirstUser },
    "Steam login"
  );

  // POST to the Auth.js credentials callback to create a session.
  // We forward the original cookies (including CSRF token) so Auth.js can
  // validate the request.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // First, get a CSRF token from the Auth.js csrf endpoint
  const csrfRes = await fetch(`${url.origin}/api/admin/auth/csrf`, {
    headers: { cookie: cookieHeader },
  });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  // Collect cookies from CSRF response
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];

  // Build updated cookie header including CSRF cookies
  let updatedCookieHeader = cookieHeader;
  for (const setCookie of csrfCookies) {
    const [nameValue] = setCookie.split(";");
    if (nameValue) {
      updatedCookieHeader += `; ${nameValue}`;
    }
  }

  // POST to the credentials callback
  const body = new URLSearchParams({
    csrfToken: csrfToken ?? "",
    steamId: admin.steamId,
    nickname: admin.nickname,
    avatar: admin.avatar ?? "",
    role: admin.role?.name ?? "",
    dbId: admin.id,
    callbackUrl,
  });

  const authRes = await fetch(
    `${url.origin}/api/admin/auth/callback/steam`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: updatedCookieHeader,
      },
      body: body.toString(),
      redirect: "manual",
    }
  );

  // Build the response: redirect with all Set-Cookie headers from Auth.js
  const redirectLocation =
    authRes.headers.get("Location") ?? `${url.origin}${callbackUrl}`;

  const finalUrl = redirectLocation.startsWith("http")
    ? redirectLocation
    : `${url.origin}${redirectLocation}`;

  const response = NextResponse.redirect(finalUrl, 302);

  // Forward all Set-Cookie headers from the CSRF and auth responses
  for (const setCookie of csrfCookies) {
    response.headers.append("Set-Cookie", setCookie);
  }
  const authCookies = authRes.headers.getSetCookie?.() ?? [];
  for (const setCookie of authCookies) {
    response.headers.append("Set-Cookie", setCookie);
  }

  return response;
}
