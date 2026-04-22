import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Class, WeaponType, AttachmentSlot } from "@prisma/client";
import { withGameAuth } from "@/lib/game-auth";

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

const EquipSchema = z.object({
  uid: z.string().min(1),
  classId: z.number().int(),
  weaponType: z.number().int(),
  weaponGuid: z.string().min(1),
  attachmentType: z.number().int(),
  attachmentGuid: z.string(),
});

/**
 * POST /api/attachments/equip
 * Equip or remove an attachment on a player's weapon setup.
 * attachmentGuid="" means remove from that slot.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const result = EquipSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ ok: false, error: "validation_error" }, { status: 400 });
  }

  const { uid, classId, weaponType: wTypeRaw, attachmentType: aTypeRaw } = result.data;
  const rawWeaponGuid = result.data.weaponGuid;
  const rawAttGuid = result.data.attachmentGuid;

  const cls = CLASS_MAP[classId];
  if (!cls) {
    return NextResponse.json({ ok: false, error: "invalid_class" }, { status: 400 });
  }

  const wType = WEAPON_TYPE_MAP[wTypeRaw];
  if (!wType) {
    return NextResponse.json({ ok: false, error: "invalid_weapon_type" }, { status: 400 });
  }

  const aSlot = SLOT_MAP[aTypeRaw];
  if (!aSlot) {
    return NextResponse.json({ ok: false, error: "invalid_attachment_type" }, { status: 400 });
  }

  // Extract hex GUIDs from prefab paths
  const wMatch = rawWeaponGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
  const weaponGuid = wMatch ? wMatch[1] : rawWeaponGuid.trim();

  const isRemove = rawAttGuid === "";
  let attachmentGuid = "";
  if (!isRemove) {
    const aMatch = rawAttGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
    attachmentGuid = aMatch ? aMatch[1] : rawAttGuid.trim();
  }

  const { prisma } = await import("@/lib/db");

  // Find player
  const player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ ok: false, error: "player_not_found" }, { status: 404 });
  }
  const playerId = player.id;

  // Find weapon
  const weapon = await prisma.weapon.findFirst({
    where: { guid: weaponGuid, class: cls, type: wType },
    select: { id: true, price: true },
  });
  if (!weapon) {
    return NextResponse.json({ ok: false, error: "weapon_not_found" }, { status: 404 });
  }

  // Check weapon is unlocked
  if (weapon.price > 0) {
    const unlock = await prisma.playerUnlock.findUnique({
      where: { playerId_itemType_itemId: { playerId, itemType: "WEAPON", itemId: weapon.id } },
    });
    if (!unlock) {
      return NextResponse.json({ ok: false, error: "weapon_not_unlocked" }, { status: 403 });
    }
  }

  // Ensure PlayerWeaponSetup exists
  let setup = await prisma.playerWeaponSetup.findUnique({
    where: { playerId_weaponId: { playerId, weaponId: weapon.id } },
    select: { id: true },
  });
  if (!setup) {
    // Create with default attachments
    const defaultBindings = await prisma.weaponAttachment.findMany({
      where: { weaponId: weapon.id, isDefault: true },
      select: { attachmentId: true },
    });
    setup = await prisma.playerWeaponSetup.create({
      data: { playerId, weaponId: weapon.id },
      select: { id: true },
    });
    if (defaultBindings.length > 0) {
      await prisma.playerWeaponAttachment.createMany({
        data: defaultBindings.map((b) => ({ setupId: setup!.id, attachmentId: b.attachmentId })),
      });
    }
  }

  // Remove: delete any attachment in this slot from the setup
  if (isRemove) {
    // Find all attachments in this slot that are in the setup
    const slotAttachments = await prisma.attachment.findMany({
      where: { slot: aSlot },
      select: { id: true },
    });
    const slotAttIds = slotAttachments.map((a) => a.id);

    if (slotAttIds.length > 0) {
      await prisma.playerWeaponAttachment.deleteMany({
        where: { setupId: setup.id, attachmentId: { in: slotAttIds } },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // Equip: find the attachment
  const attachment = await prisma.attachment.findFirst({
    where: { guid: attachmentGuid, slot: aSlot },
    select: { id: true, defaultPrice: true },
  });
  if (!attachment) {
    return NextResponse.json({ ok: false, error: "attachment_not_found" }, { status: 404 });
  }

  // Check it's bound to this weapon
  const binding = await prisma.weaponAttachment.findUnique({
    where: { weaponId_attachmentId: { weaponId: weapon.id, attachmentId: attachment.id } },
  });
  if (!binding) {
    return NextResponse.json({ ok: false, error: "attachment_not_compatible" }, { status: 400 });
  }

  // Check attachment is unlocked
  const attPrice = binding.priceOverride ?? attachment.defaultPrice;
  if (attPrice > 0) {
    const unlock = await prisma.playerWeaponAttachmentUnlock.findUnique({
      where: { playerId_weaponId_attachmentId: { playerId, weaponId: weapon.id, attachmentId: attachment.id } },
    });
    if (!unlock) {
      return NextResponse.json({ ok: false, error: "attachment_not_unlocked" }, { status: 403 });
    }
  }

  // Remove existing attachment in same slot, then add new one
  const slotAttachments = await prisma.attachment.findMany({
    where: { slot: aSlot },
    select: { id: true },
  });
  const slotAttIds = slotAttachments.map((a) => a.id);

  if (slotAttIds.length > 0) {
    await prisma.playerWeaponAttachment.deleteMany({
      where: { setupId: setup.id, attachmentId: { in: slotAttIds } },
    });
  }

  await prisma.playerWeaponAttachment.create({
    data: { setupId: setup.id, attachmentId: attachment.id },
  });

  return NextResponse.json({ ok: true });
});
