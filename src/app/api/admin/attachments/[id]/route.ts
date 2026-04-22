import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const UpdateAttachmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  guid: z.string().min(1).max(200).optional(),
  defaultPrice: z.number().int().min(0).optional(),
  slot: z.enum(["OPTIC", "UNDER_BARREL", "HAND_GUARD", "MUZZLE", "STOCK", "MAGAZINE", "TACTICAL_BLOCK", "FOREGRIP"]).optional(),
});

/**
 * PUT /admin/api/attachments/[id]
 * Update an attachment.
 */
export async function PUT(
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

  const result = UpdateAttachmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const attachment = await prisma.attachment.update({
      where: { id },
      data: result.data,
    });
    return NextResponse.json(attachment);
  } catch {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
}

/**
 * DELETE /admin/api/attachments/[id]
 * Delete an attachment. If ?refund=true, refund XP to all players who bought it.
 * Cascades to WeaponAttachment bindings via schema.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const refund = searchParams.get("refund") === "true";
  const { prisma } = await import("@/lib/db");

  try {
    if (refund) {
      const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id } });
      if (attachment.defaultPrice > 0) {
        const unlocks = await prisma.playerWeaponAttachmentUnlock.findMany({
          where: { attachmentId: id },
          select: { playerId: true },
        });
        if (unlocks.length > 0) {
          // Sum per-player refund - each player may have unlocked the attachment for multiple weapons
          const refundByPlayer = new Map<string, number>();
          for (const u of unlocks) {
            refundByPlayer.set(u.playerId, (refundByPlayer.get(u.playerId) ?? 0) + attachment.defaultPrice);
          }
          for (const [playerId, amount] of refundByPlayer) {
            await prisma.player.update({
              where: { id: playerId },
              data: { xpBalance: { increment: amount } },
            });
          }
          await prisma.playerWeaponAttachmentUnlock.deleteMany({
            where: { attachmentId: id },
          });
        }
      }
    }

    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
}
