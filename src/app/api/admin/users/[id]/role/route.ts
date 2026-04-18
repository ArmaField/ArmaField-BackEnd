import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const UpdateRoleSchema = z.object({
  roleId: z.string().nullable(),
});

/**
 * PUT /admin/api/users/[id]/role
 * Change a user's role. Cannot change your own role.
 * Requires users.manage permission.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("users.manage");
  if (error) return error;

  const { id } = await params;

  if (session!.user.id === id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateRoleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  // Validate that the role exists if roleId is provided
  if (result.data.roleId) {
    const role = await prisma.role.findUnique({ where: { id: result.data.roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
  }

  try {
    const user = await prisma.admin.update({
      where: { id },
      data: { roleId: result.data.roleId },
      select: {
        id: true,
        steamId: true,
        nickname: true,
        avatar: true,
        role: { select: { id: true, name: true, color: true, permissions: true, isBuiltIn: true } },
        createdAt: true,
      },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
