import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/roles
 * List all roles ordered by sortOrder.
 * Requires users.view permission.
 */
export async function GET() {
  const { error } = await requirePermission("users.view");
  if (error) return error;

  const { prisma } = await import("@/lib/db");
  const roles = await prisma.role.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { admins: true } },
    },
  });

  return NextResponse.json(roles);
}

const CreateRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: z.string().max(20).default("#6b7280"),
  permissions: z.array(z.string()).default([]),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * POST /admin/api/roles
 * Create a new role.
 * Requires roles.manage permission.
 */
export async function POST(request: Request) {
  const { error } = await requirePermission("roles.manage");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateRoleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    // Auto-assign sortOrder if not provided (append to end)
    let sortOrder = result.data.sortOrder;
    if (sortOrder === 0) {
      const lastRole = await prisma.role.findFirst({ orderBy: { sortOrder: "desc" } });
      sortOrder = (lastRole?.sortOrder ?? 0) + 1;
    }

    const role = await prisma.role.create({
      data: {
        name: result.data.name,
        color: result.data.color,
        permissions: result.data.permissions,
        sortOrder,
      },
    });
    return NextResponse.json(role, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Role with this name already exists" },
      { status: 409 }
    );
  }
}
