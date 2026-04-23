import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const CopySchema = z.object({
  sourceClass: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]),
  targetClass: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]),
  deleteExisting: z.boolean().default(false),
  skipConflicts: z.boolean().default(false),
});

/**
 * POST /api/admin/gadgets/copy-from-class
 * Copies all gadgets from sourceClass into targetClass. Mirrors /api/admin/weapons/copy-from-class semantics.
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

  const { sourceClass, targetClass, deleteExisting, skipConflicts } = result.data;
  if (sourceClass === targetClass) {
    return NextResponse.json({ error: "Source and target class must differ" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db");

  const source = await prisma.gadget.findMany({ where: { class: sourceClass } });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    if (deleteExisting) {
      const res = await tx.gadget.deleteMany({ where: { class: targetClass } });
      deleted = res.count;
    }

    for (const src of source) {
      const existing = deleteExisting
        ? null
        : await tx.gadget.findFirst({ where: { guid: src.guid, class: targetClass } });

      if (existing) {
        if (skipConflicts) {
          skipped++;
          continue;
        }
        await tx.gadget.update({
          where: { id: existing.id },
          data: {
            name: src.name,
            price: src.price,
            zorder: src.zorder,
            isDefault: src.isDefault,
            categoryId: src.categoryId,
          },
        });
        updated++;
      } else {
        await tx.gadget.create({
          data: {
            guid: src.guid,
            name: src.name,
            price: src.price,
            zorder: src.zorder,
            isDefault: src.isDefault,
            class: targetClass,
            categoryId: src.categoryId,
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
    total: source.length,
  });
}
