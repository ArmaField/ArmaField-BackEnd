import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";
import { TEST_MODE } from "@/lib/test-mode";
import { TEST_WEAPON_ATTACHMENTS } from "@/lib/test-loadout-data";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/weapons/[id]/attachments
 * Get all attachments bound to a weapon, including priceOverride.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;

  if (TEST_MODE) {
    const bindings = TEST_WEAPON_ATTACHMENTS[id] ?? [];
    return NextResponse.json(bindings);
  }

  const { prisma } = await import("@/lib/db");

  try {
    // Verify weapon exists
    await prisma.weapon.findUniqueOrThrow({ where: { id } });

    const bindings = await prisma.weaponAttachment.findMany({
      where: { weaponId: id },
      include: { attachment: true },
      orderBy: { attachment: { slot: "asc" } },
    });

    return NextResponse.json(bindings);
  } catch {
    return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
  }
}

const BindAttachmentSchema = z.object({
  attachmentId: z.string().min(1, "Attachment ID is required"),
  priceOverride: z.number().int().min(0).nullable().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * POST /admin/api/weapons/[id]/attachments
 * Bind an attachment to a weapon.
 */
export async function POST(
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

  const result = BindAttachmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const binding = await prisma.weaponAttachment.create({
      data: {
        weaponId: id,
        attachmentId: result.data.attachmentId,
        priceOverride: result.data.priceOverride ?? null,
      },
      include: { attachment: true },
    });
    return NextResponse.json(binding, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Binding already exists or weapon/attachment not found" },
      { status: 409 }
    );
  }
}
