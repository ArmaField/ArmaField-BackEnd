import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const CopySchema = z.object({
  sourceClass: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]),
  targetClass: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]),
  type: z.enum(["PRIMARY", "SECONDARY", "SPECIAL"]),
  deleteExisting: z.boolean().default(false),
  skipConflicts: z.boolean().default(false),
});

/**
 * POST /api/admin/weapons/copy-from-class
 * Copies all weapons (of a given type) from sourceClass into targetClass,
 * including WeaponAttachment bindings (compatibility, isDefault, priceOverride).
 *
 *  - deleteExisting=true  - wipes all target-class weapons of this type first (cascades to setups/unlocks)
 *  - skipConflicts=true   - keeps target weapon when GUID already exists in target class
 *  - skipConflicts=false  - default: overwrites target weapon's fields and replaces its attachment bindings
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

  const result = CopySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { sourceClass, targetClass, type, deleteExisting, skipConflicts } = result.data;
  if (sourceClass === targetClass) {
    return NextResponse.json({ error: "Source and target class must differ" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db");

  const sourceWeapons = await prisma.weapon.findMany({
    where: { class: sourceClass, type },
    include: { attachments: true },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    if (deleteExisting) {
      const res = await tx.weapon.deleteMany({ where: { class: targetClass, type } });
      deleted = res.count;
    }

    for (const src of sourceWeapons) {
      const existing = deleteExisting
        ? null
        : await tx.weapon.findFirst({
            where: { guid: src.guid, class: targetClass, type },
          });

      if (existing) {
        if (skipConflicts) {
          skipped++;
          continue;
        }
        await tx.weapon.update({
          where: { id: existing.id },
          data: {
            name: src.name,
            price: src.price,
            zorder: src.zorder,
            isDefault: src.isDefault,
            categoryId: src.categoryId,
          },
        });
        await tx.weaponAttachment.deleteMany({ where: { weaponId: existing.id } });
        if (src.attachments.length > 0) {
          await tx.weaponAttachment.createMany({
            data: src.attachments.map((a) => ({
              weaponId: existing.id,
              attachmentId: a.attachmentId,
              priceOverride: a.priceOverride,
              isDefault: a.isDefault,
            })),
          });
        }
        updated++;
      } else {
        const createdWeapon = await tx.weapon.create({
          data: {
            guid: src.guid,
            name: src.name,
            price: src.price,
            zorder: src.zorder,
            isDefault: src.isDefault,
            class: targetClass,
            type,
            categoryId: src.categoryId,
          },
        });
        if (src.attachments.length > 0) {
          await tx.weaponAttachment.createMany({
            data: src.attachments.map((a) => ({
              weaponId: createdWeapon.id,
              attachmentId: a.attachmentId,
              priceOverride: a.priceOverride,
              isDefault: a.isDefault,
            })),
          });
        }
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
    total: sourceWeapons.length,
  });
}
