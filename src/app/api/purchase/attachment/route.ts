import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Class, WeaponType, AttachmentSlot } from "@prisma/client";
import { withGameAuth } from "@/lib/game-auth";
import { buildAttachmentsList } from "@/lib/loadout-helpers";

export const dynamic = "force-dynamic";

const CLASS_MAP: Record<number, Class> = { 1: "ASSAULT", 2: "ENGINEER", 3: "SUPPORT", 4: "RECON" };
const WEAPON_TYPE_MAP: Record<number, WeaponType> = { 1: "PRIMARY", 2: "SECONDARY", 3: "SPECIAL" };
const SLOT_MAP: Record<number, AttachmentSlot> = {
  1: "OPTIC",
  2: "UNDER_BARREL",
  3: "HAND_GUARD",
  4: "MUZZLE",
  5: "STOCK",
  6: "MAGAZINE",
  7: "TACTICAL_BLOCK",
  8: "FOREGRIP",
};

const PurchaseAttachmentSchema = z.object({
  uid: z.string().min(1),
  classId: z.number().int(),
  weaponType: z.number().int(),
  weaponGuid: z.string().min(1),
  attachmentType: z.number().int(),
  attachmentGuid: z.string().min(1),
});

/**
 * POST /api/purchase/attachment
 * Purchase an attachment for a specific weapon.
 * Requires weapon to be owned (or free). Deducts XP and creates unlock.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = PurchaseAttachmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const { uid, classId, weaponType: wTypeRaw, attachmentType: aTypeRaw } = result.data;

  const cls = CLASS_MAP[classId];
  if (!cls) {
    return NextResponse.json({ error: "invalid_class" }, { status: 400 });
  }

  const wType = WEAPON_TYPE_MAP[wTypeRaw];
  if (!wType) {
    return NextResponse.json({ error: "invalid_weapon_type" }, { status: 400 });
  }

  const aSlot = SLOT_MAP[aTypeRaw];
  if (!aSlot) {
    return NextResponse.json({ error: "invalid_attachment_type" }, { status: 400 });
  }

  // Extract hex GUIDs
  const wMatch = result.data.weaponGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
  const weaponGuid = wMatch ? wMatch[1] : result.data.weaponGuid.trim();
  const aMatch = result.data.attachmentGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
  const attachmentGuid = aMatch ? aMatch[1] : result.data.attachmentGuid.trim();

  const { prisma } = await import("@/lib/db");

  // Find player
  const player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true, xpBalance: true },
  });
  if (!player) {
    return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  }
  const playerId = player.id;

  // Find weapon
  const weapon = await prisma.weapon.findFirst({
    where: { guid: weaponGuid, class: cls, type: wType },
    select: { id: true, price: true },
  });
  if (!weapon) {
    return NextResponse.json({ error: "weapon_not_found" }, { status: 404 });
  }

  // Check weapon is unlocked (free or owned)
  if (weapon.price > 0) {
    const weaponUnlock = await prisma.playerUnlock.findUnique({
      where: { playerId_itemType_itemId: { playerId, itemType: "WEAPON", itemId: weapon.id } },
    });
    if (!weaponUnlock) {
      return NextResponse.json({ error: "weapon_not_unlocked" }, { status: 403 });
    }
  }

  // Find attachment
  const attachment = await prisma.attachment.findFirst({
    where: { guid: attachmentGuid, slot: aSlot },
    select: { id: true, defaultPrice: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: "attachment_not_found" }, { status: 404 });
  }

  // Check attachment is compatible with weapon
  const binding = await prisma.weaponAttachment.findUnique({
    where: { weaponId_attachmentId: { weaponId: weapon.id, attachmentId: attachment.id } },
  });
  if (!binding) {
    return NextResponse.json({ error: "attachment_not_compatible" }, { status: 400 });
  }

  const price = binding.priceOverride ?? attachment.defaultPrice;

  // Free attachments are implicitly owned
  if (price === 0) {
    return NextResponse.json({ error: "item_is_free" }, { status: 400 });
  }

  // Check if already owned
  const existing = await prisma.playerWeaponAttachmentUnlock.findUnique({
    where: { playerId_weaponId_attachmentId: { playerId, weaponId: weapon.id, attachmentId: attachment.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }

  // Check balance
  if (player.xpBalance < price) {
    return NextResponse.json({ error: "insufficient_balance" }, { status: 402 });
  }

  // Deduct XP + create unlock atomically
  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { xpBalance: { decrement: price } },
      select: { xpBalance: true },
    }),
    prisma.playerWeaponAttachmentUnlock.create({
      data: { playerId, weaponId: weapon.id, attachmentId: attachment.id },
    }),
  ]);

  // Return updated attachments list for this weapon (same as GET /api/attachments)
  const attachments = await buildAttachmentsList(prisma, playerId, weapon.id);

  return NextResponse.json({ uid, xp: updatedPlayer.xpBalance, attachments });
});
