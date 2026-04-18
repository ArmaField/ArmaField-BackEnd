import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /admin/api/users/[id]
 * Remove an admin user. Cannot delete yourself.
 * SUPER_ADMIN only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("users.manage");
  if (error) return error;

  const { id } = await params;

  if (session!.user.id === id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    await prisma.admin.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
