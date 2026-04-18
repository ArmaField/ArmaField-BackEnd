import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/gadgets
 * List gadgets. Optional query param: class.
 */
export async function GET(request: Request) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const classFilter = searchParams.get("class");

  const where: Record<string, string> = {};
  if (classFilter && ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"].includes(classFilter)) {
    where.class = classFilter;
  }

  const { prisma } = await import("@/lib/db");
  const gadgets = await prisma.gadget.findMany({
    where,
    include: { category: true },
    orderBy: [{ price: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(gadgets);
}

const CreateGadgetSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  guid: z.string().min(1, "GUID is required").max(200),
  price: z.number().int().min(0).default(0),
  class: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]),
  categoryId: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  zorder: z.number().int().min(0).optional(),
});

/**
 * POST /admin/api/gadgets
 * Create a new gadget.
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

  const result = CreateGadgetSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  const maxZorder = await prisma.gadget.aggregate({
    where: { class: result.data.class },
    _max: { zorder: true },
  });
  const zorder = result.data.zorder ?? (maxZorder._max.zorder ?? -1) + 1;

  try {
    const gadget = await prisma.gadget.create({
      data: { ...result.data, zorder },
      include: { category: true },
    });
    return NextResponse.json(gadget, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gadget with this GUID already exists", code: "GUID_EXISTS" },
      { status: 409 }
    );
  }
}
