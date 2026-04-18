import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const UpdateWeaponSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  guid: z.string().min(1).max(200).optional(),
  price: z.number().int().min(0).optional(),
  type: z.enum(["PRIMARY", "SECONDARY", "SPECIAL"]).optional(),
  class: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]).optional(),
  categoryId: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  zorder: z.number().int().min(0).optional(),
});

/**
 * PUT /admin/api/weapons/[id]
 * Update a weapon.
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

  const result = UpdateWeaponSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const weapon = await prisma.weapon.update({
      where: { id },
      data: result.data,
      include: { category: true },
    });
    return NextResponse.json(weapon);
  } catch {
    return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
  }
}

/**
 * GET /admin/api/weapons/[id]
 * Get weapon details including owner count.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  try {
    const weapon = await prisma.weapon.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });

    const ownerCount = await prisma.playerUnlock.count({
      where: { itemType: "WEAPON", itemId: id },
    });

    // Calculate total attachment cost for this weapon
    const attachmentBindings = await prisma.weaponAttachment.findMany({
      where: { weaponId: id },
      include: { attachment: true },
    });
    const attachmentsCost = attachmentBindings.reduce((sum, b) => {
      const price = b.priceOverride ?? b.attachment.defaultPrice;
      return sum + price;
    }, 0);

    return NextResponse.json({ ...weapon, ownerCount, attachmentsCost });
  } catch {
    return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
  }
}

/**
 * DELETE /admin/api/weapons/[id]
 * Delete a weapon. If ?refund=true, refund XP to all players who own it.
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
    const weapon = await prisma.weapon.findUniqueOrThrow({ where: { id } });

    if (refund) {
      // Get all attachment bindings for this weapon with prices
      const attachmentBindings = await prisma.weaponAttachment.findMany({
        where: { weaponId: id },
        include: { attachment: true },
      });
      const attachmentPriceMap = new Map<string, number>();
      for (const b of attachmentBindings) {
        attachmentPriceMap.set(b.attachmentId, b.priceOverride ?? b.attachment.defaultPrice);
      }

      // Find all players who own this weapon
      const weaponUnlocks = await prisma.playerUnlock.findMany({
        where: { itemType: "WEAPON", itemId: id },
        select: { playerId: true },
      });

      if (weaponUnlocks.length > 0) {
        const playerIds = weaponUnlocks.map((u) => u.playerId);

        // Find attachment purchases for these players (only attachments on this weapon)
        const attachmentIds = Array.from(attachmentPriceMap.keys());
        const attachmentUnlocks = attachmentIds.length > 0
          ? await prisma.playerWeaponAttachmentUnlock.findMany({
              where: {
                playerId: { in: playerIds },
                weaponId: id,
                attachmentId: { in: attachmentIds },
              },
              select: { playerId: true, attachmentId: true },
            })
          : [];

        // Calculate per-player refund
        const playerRefunds = new Map<string, number>();
        for (const pid of playerIds) {
          playerRefunds.set(pid, weapon.price);
        }
        for (const unlock of attachmentUnlocks) {
          const attPrice = attachmentPriceMap.get(unlock.attachmentId) ?? 0;
          const current = playerRefunds.get(unlock.playerId) ?? 0;
          playerRefunds.set(unlock.playerId, current + attPrice);
        }

        // Refund each player their individual total
        for (const [playerId, amount] of playerRefunds) {
          if (amount > 0) {
            await prisma.player.update({
              where: { id: playerId },
              data: { xpBalance: { increment: amount } },
            });
          }
        }
      }
    }

    // Delete unlocks for this weapon
    await prisma.playerUnlock.deleteMany({
      where: { itemType: "WEAPON", itemId: id },
    });

    // Delete per-weapon attachment unlocks for this weapon
    await prisma.playerWeaponAttachmentUnlock.deleteMany({
      where: { weaponId: id },
    });

    // Delete the weapon (cascades weapon_attachments, weapon_setups)
    await prisma.weapon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
  }
}
