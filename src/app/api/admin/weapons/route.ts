import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/weapons
 * List weapons. Optional query params: class, type.
 * Always includes the category relation.
 */
export async function GET(request: Request) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const classFilter = searchParams.get("class");
  const typeFilter = searchParams.get("type");

  const where: Record<string, string> = {};
  if (classFilter && ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"].includes(classFilter)) {
    where.class = classFilter;
  }
  if (typeFilter && ["PRIMARY", "SECONDARY", "SPECIAL"].includes(typeFilter)) {
    where.type = typeFilter;
  }

  const { prisma } = await import("@/lib/db");
  const weapons = await prisma.weapon.findMany({
    where,
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { price: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(weapons);
}

const CreateWeaponSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  guid: z.string().min(1, "GUID is required").max(200),
  price: z.number().int().min(0).default(0),
  type: z.enum(["PRIMARY", "SECONDARY", "SPECIAL"]),
  class: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]),
  categoryId: z.string().min(1, "Category is required"),
  isDefault: z.boolean().optional(),
  zorder: z.number().int().min(0).optional(),
});

/**
 * POST /admin/api/weapons
 * Create a new weapon.
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

  const result = CreateWeaponSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  const maxZorder = await prisma.weapon.aggregate({
    where: { type: result.data.type, class: result.data.class },
    _max: { zorder: true },
  });
  const zorder = result.data.zorder ?? (maxZorder._max.zorder ?? -1) + 1;

  try {
    const weapon = await prisma.weapon.create({
      data: { ...result.data, zorder },
      include: { category: true },
    });
    return NextResponse.json(weapon, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Weapon with this GUID already exists", code: "GUID_EXISTS" },
      { status: 409 }
    );
  }
}
