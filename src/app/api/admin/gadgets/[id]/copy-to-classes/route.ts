import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const CopySchema = z.object({
  targetClasses: z.array(z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"])).min(1),
  skipConflicts: z.boolean().default(false),
});

/**
 * POST /api/admin/gadgets/:id/copy-to-classes
 * Copies a single gadget to one or more target classes. Mirrors /api/admin/weapons/:id/copy-to-classes semantics.
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

  const src = await prisma.gadget.findUnique({ where: { id } });
  if (!src) {
    return NextResponse.json({ error: "Gadget not found" }, { status: 404 });
  }

  const classes = targetClasses.filter((c) => c !== src.class);
  if (classes.length === 0) {
    return NextResponse.json({ error: "No valid target classes" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const targetClass of classes) {
      const existing = await tx.gadget.findFirst({
        where: { guid: src.guid, class: targetClass },
      });

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
    total: classes.length,
  });
}
