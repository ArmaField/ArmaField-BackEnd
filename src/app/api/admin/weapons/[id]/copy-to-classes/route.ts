import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const CopySchema = z.object({
  targetClasses: z.array(z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"])).min(1),
  skipConflicts: z.boolean().default(false),
});

/**
 * POST /api/admin/weapons/:id/copy-to-classes
 * Copies a single weapon (with its WeaponAttachment bindings - compatibility, isDefault, priceOverride)
 * to one or more target classes. Keeps same guid/type.
 *
 *  - skipConflicts=true  - keeps target weapon when GUID already exists in target class
 *  - skipConflicts=false - default: overwrites target weapon's fields and replaces its attachment bindings
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

  const result = CopySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { targetClasses, skipConflicts } = result.data;

  const { prisma } = await import("@/lib/db");

  const src = await prisma.weapon.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!src) {
    return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
  }

  // Filter out source class if included by caller
  const classes = targetClasses.filter((c) => c !== src.class);
  if (classes.length === 0) {
    return NextResponse.json({ error: "No valid target classes" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const targetClass of classes) {
      const existing = await tx.weapon.findFirst({
        where: { guid: src.guid, class: targetClass, type: src.type },
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
            type: src.type,
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
    total: classes.length,
  });
}
