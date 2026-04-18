import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/users
 * List all admin users ordered by createdAt.
 * Requires users.view permission.
 */
export async function GET() {
  const { error } = await requirePermission("users.view");
  if (error) return error;

  const { prisma } = await import("@/lib/db");
  const users = await prisma.admin.findMany({
    select: {
      id: true,
      steamId: true,
      nickname: true,
      avatar: true,
      role: { select: { id: true, name: true, color: true, permissions: true, isBuiltIn: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}
