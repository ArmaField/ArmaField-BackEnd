import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /admin/api/weapons/[id]/attachments/[attachmentId]
 * Unbind an attachment from a weapon. If ?refund=true, refund XP to players who bought it.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id, attachmentId } = await params;
  const { searchParams } = new URL(request.url);
  const refund = searchParams.get("refund") === "true";
  const { prisma } = await import("@/lib/db");

  try {
    const binding = await prisma.weaponAttachment.findUniqueOrThrow({
      where: { weaponId_attachmentId: { weaponId: id, attachmentId } },
      include: { attachment: true },
    });

    if (refund) {
      const price = binding.priceOverride ?? binding.attachment.defaultPrice;
      if (price > 0) {
        // Find players who unlocked this attachment for THIS weapon
        const unlocks = await prisma.playerWeaponAttachmentUnlock.findMany({
          where: { weaponId: id, attachmentId },
          select: { playerId: true },
        });
        if (unlocks.length > 0) {
          const playerIds = unlocks.map((u) => u.playerId);
          await prisma.player.updateMany({
            where: { id: { in: playerIds } },
            data: { xpBalance: { increment: price } },
          });
          // Remove unlock records for this weapon
          await prisma.playerWeaponAttachmentUnlock.deleteMany({
            where: { weaponId: id, attachmentId },
          });
        }
      }
    }

    await prisma.weaponAttachment.delete({
      where: { weaponId_attachmentId: { weaponId: id, attachmentId } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Binding not found" }, { status: 404 });
  }
}

const UpdateBindingSchema = z.object({
  priceOverride: z.number().int().min(0).nullable().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * PUT /admin/api/weapons/[id]/attachments/[attachmentId]
 * Update priceOverride for a weapon-attachment binding.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id, attachmentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateBindingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const binding = await prisma.weaponAttachment.update({
      where: {
        weaponId_attachmentId: {
          weaponId: id,
          attachmentId,
        },
      },
      data: result.data,
      include: { attachment: true },
    });
    return NextResponse.json(binding);
  } catch {
    return NextResponse.json({ error: "Binding not found" }, { status: 404 });
  }
}
