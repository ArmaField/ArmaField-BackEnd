import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/weapon-categories
 * List all weapon categories.
 */
export async function GET() {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { prisma } = await import("@/lib/db");
  const categories = await prisma.weaponCategory.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

/**
 * POST /admin/api/weapon-categories
 * Create a new weapon category.
 */
export async function POST(request: Request) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateCategorySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const category = await prisma.weaponCategory.create({
      data: {
        name: result.data.name,
        icon: result.data.icon || null,
        color: result.data.color || null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Category with this name already exists" },
      { status: 409 }
    );
  }
}
