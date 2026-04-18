import { NextResponse } from "next/server";
import { auth, isTestMode } from "@/lib/auth";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

/**
 * Permission required to access each page.
 */
const PAGE_PERMISSIONS: Record<string, string> = {
  "/": "dashboard.view",
  "/servers": "servers.view",
  "/loadouts": "loadouts.view",
  "/players": "players.view",
  "/users": "users.view",
  "/logs": "logs.view",
  "/backups": "backups.view",
  "/system": "system.view",
};

/**
 * Next.js 16 proxy (renamed from middleware).
 *
 * Uses next-auth's `auth()` wrapper to get the session on the request,
 * then applies permission-based routing logic for protected routes.
 *
 * In test mode, all auth checks are bypassed — every page is accessible
 * as if the user were a SUPER_ADMIN.
 */
export const proxy = auth((req: NextRequest & { auth: Session | null }) => {
  const { pathname } = req.nextUrl;

  // Skip API routes and no-access page always
  if (pathname.startsWith("/api/") || pathname === "/no-access") {
    return NextResponse.next();
  }

  // In test mode: redirect /login -> / and allow everything else through
  if (isTestMode()) {
    if (pathname === "/login") {
      const homeUrl = req.nextUrl.clone();
      homeUrl.pathname = "/";
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  // Skip login page in normal mode
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const session = req.auth;

  // Redirect unauthenticated users to login
  if (!session?.user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const permissions = session.user.permissions ?? [];

  // Redirect users with no role (no permissions) to no-access
  if (!session.user.role) {
    const noAccessUrl = req.nextUrl.clone();
    noAccessUrl.pathname = "/no-access";
    return NextResponse.redirect(noAccessUrl);
  }

  // Check page-level permissions
  // Find the matching page permission (match the most specific path first)
  let requiredPermission: string | undefined;

  // Exact match
  if (PAGE_PERMISSIONS[pathname] !== undefined) {
    requiredPermission = PAGE_PERMISSIONS[pathname];
  } else {
    // Try parent paths (e.g., /players/123 -> /players)
    const segments = pathname.split("/");
    for (let i = segments.length - 1; i >= 1; i--) {
      const parentPath = segments.slice(0, i + 1).join("/") || "/";
      if (PAGE_PERMISSIONS[parentPath] !== undefined) {
        requiredPermission = PAGE_PERMISSIONS[parentPath];
        break;
      }
    }
  }

  // If we found a required permission and the user doesn't have it, redirect to /
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - Static files (favicon, images, etc.)
     */
    "/((?!_next|favicon\\.ico|.*\\..*).*)",
  ],
};
