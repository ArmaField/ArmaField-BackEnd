import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/roles/[id]
 * Get a single role.
 * Requires users.view permission.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("users.view");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  try {
    const role = await prisma.role.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { admins: true } },
      },
    });
    return NextResponse.json(role);
  } catch {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
}

const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional(),
  permissions: z.array(z.string()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * PUT /admin/api/roles/[id]
 * Update a role.
 * Cannot modify built-in roles.
 * Requires roles.manage permission.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("roles.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  // Check if role is built-in
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (existing.isBuiltIn) {
    return NextResponse.json({ error: "Cannot modify built-in roles" }, { status: 403 });
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

  try {
    const role = await prisma.role.update({
      where: { id },
      data: result.data,
    });
    return NextResponse.json(role);
  } catch {
    return NextResponse.json({ error: "Role with this name already exists" }, { status: 409 });
  }
}

/**
 * DELETE /admin/api/roles/[id]
 * Delete a role.
 * Cannot delete built-in roles. Cannot delete if users are assigned.
 * Requires roles.manage permission.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("roles.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  const existing = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { admins: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (existing.isBuiltIn) {
    return NextResponse.json({ error: "Cannot delete built-in roles" }, { status: 403 });
  }
  if (existing._count.admins > 0) {
    return NextResponse.json(
      { error: "Cannot delete role with assigned users. Remove users from this role first." },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
