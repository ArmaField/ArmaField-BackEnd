import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const CopySchema = z.object({
  sourceWeaponId: z.string().min(1),
  slot: z.enum([
    "OPTIC",
    "UNDER_BARREL",
    "HAND_GUARD",
    "MUZZLE",
    "STOCK",
    "MAGAZINE",
    "TACTICAL_BLOCK",
    "FOREGRIP",
  ]),
  skipConflicts: z.boolean().default(false),
  replaceExisting: z.boolean().default(false),
});

/**
 * POST /api/admin/weapons/:id/copy-attachment-bindings
 * Copies a single slot's attachment bindings from sourceWeaponId to the target weapon (:id).
 * Preserves isDefault and priceOverride.
 *
 *  - replaceExisting=true - wipes the target's bindings for this slot before copying
 *  - skipConflicts=true   - for attachmentIds already bound on the target, keep existing values
 *  - skipConflicts=false  - default: overwrites priceOverride / isDefault on duplicates
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id: targetWeaponId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CopySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { sourceWeaponId, slot, skipConflicts, replaceExisting } = result.data;

  if (sourceWeaponId === targetWeaponId) {
    return NextResponse.json(
      { error: "Source and target weapon must differ" },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  const target = await prisma.weapon.findUnique({
    where: { id: targetWeaponId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Target weapon not found" }, { status: 404 });
  }

  const sourceBindings = await prisma.weaponAttachment.findMany({
    where: { weaponId: sourceWeaponId, attachment: { slot } },
    select: { attachmentId: true, priceOverride: true, isDefault: true },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      const res = await tx.weaponAttachment.deleteMany({
        where: { weaponId: targetWeaponId, attachment: { slot } },
      });
      deleted = res.count;
    }

    for (const src of sourceBindings) {
      const existing = replaceExisting
        ? null
        : await tx.weaponAttachment.findUnique({
            where: {
              weaponId_attachmentId: {
                weaponId: targetWeaponId,
                attachmentId: src.attachmentId,
              },
            },
          });

      if (existing) {
        if (skipConflicts) {
          skipped++;
          continue;
        }
        await tx.weaponAttachment.update({
          where: {
            weaponId_attachmentId: {
              weaponId: targetWeaponId,
              attachmentId: src.attachmentId,
            },
          },
          data: {
            priceOverride: src.priceOverride,
            isDefault: src.isDefault,
          },
        });
        updated++;
      } else {
        await tx.weaponAttachment.create({
          data: {
            weaponId: targetWeaponId,
            attachmentId: src.attachmentId,
            priceOverride: src.priceOverride,
            isDefault: src.isDefault,
          },
        });
        created++;
      }
    }
  });

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped,
    deleted,
    total: sourceBindings.length,
  });
}
