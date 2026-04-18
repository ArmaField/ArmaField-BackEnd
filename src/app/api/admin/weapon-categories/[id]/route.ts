import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

/**
 * PUT /admin/api/weapon-categories/[id]
 * Update a weapon category.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateCategorySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const category = await prisma.weaponCategory.update({
      where: { id },
      data: result.data,
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}

/**
 * DELETE /admin/api/weapon-categories/[id]
 * Delete a weapon category (only if it has no weapons).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  const weaponCount = await prisma.weapon.count({ where: { categoryId: id } });
  if (weaponCount > 0) {
    return NextResponse.json(
      { error: "Category has weapons. Reassign them first." },
      { status: 409 }
    );
  }

  try {
    await prisma.weaponCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}
