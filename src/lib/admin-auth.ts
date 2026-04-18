import { auth, isTestMode } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function requirePermission(permission: string) {
  const session = isTestMode()
    ? {
        user: {
          id: "test-admin",
          name: "Test Admin",
          steamId: "TEST_MODE",
          role: "SUPER_ADMIN" as string,
          roleColor: "#ef4444",
          permissions: Object.values(PERMISSIONS) as string[],
          roleId: "test-role",
          image: null,
        },
      }
    : await auth();

  if (!session?.user) {
    logger.warn({ permission }, "Unauthorized API access attempt");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (!session.user.permissions?.includes(permission)) {
    logger.warn({ permission, user: session.user.name, role: session.user.role }, "Forbidden: insufficient permissions");
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
