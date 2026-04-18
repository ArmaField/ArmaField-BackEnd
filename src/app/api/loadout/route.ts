import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Class, WeaponType } from "@prisma/client";
import { withGameAuth } from "@/lib/game-auth";
import { TEST_MODE } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

const CLASS_MAP: Record<number, Class> = { 1: "ASSAULT", 2: "ENGINEER", 3: "SUPPORT", 4: "RECON" };
const WEAPON_TYPE_MAP: Record<number, WeaponType> = { 1: "PRIMARY", 2: "SECONDARY", 3: "SPECIAL" };
// type: 1=PRIMARY, 2=SECONDARY, 3=SPECIAL, 4=GADGET, 5=GRENADE
const VALID_TYPES = [1, 2, 3, 4, 5];

const UpdateLoadoutSchema = z.object({
  uid: z.string().min(1),
  classId: z.number().int(),
  type: z.number().int(),
  guid: z.string().min(1),
});

/**
 * POST /api/loadout
 * Update a single slot in the player's class loadout.
 * Validates that the item exists and is unlocked for the player.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const result = UpdateLoadoutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ ok: false, error: "validation_error" }, { status: 400 });
  }

  const { uid, classId, type, guid: rawGuid } = result.data;

  // Extract hex GUID from prefab path like "{3E413771E1834D2F}Prefabs/..." or accept bare GUID
  const guidMatch = rawGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
  const guid = guidMatch ? guidMatch[1] : rawGuid.trim();

  const cls = CLASS_MAP[classId];
  if (!cls) {
    return NextResponse.json({ ok: false, error: "invalid_class" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  }

  // Test mode: accept any loadout change, no persistence
  if (TEST_MODE) {
    return NextResponse.json({ ok: true });
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

  // Weapon (PRIMARY/SECONDARY/SPECIAL)
  const weaponType = WEAPON_TYPE_MAP[type];
  if (weaponType) {
    const weapon = await prisma.weapon.findFirst({
      where: { guid, class: cls, type: weaponType },
      select: { id: true, price: true },
    });
    if (!weapon) {
      return NextResponse.json({ ok: false, error: "item_not_found" }, { status: 404 });
    }

    // Check unlock: owned OR free
    if (weapon.price > 0) {
      const unlock = await prisma.playerUnlock.findUnique({
        where: {
          playerId_itemType_itemId: { playerId, itemType: "WEAPON", itemId: weapon.id },
        },
      });
      if (!unlock) {
        return NextResponse.json({ ok: false, error: "item_not_unlocked" }, { status: 403 });
      }
    }

    // Update PlayerLoadout slot
    const slotField =
      weaponType === "PRIMARY" ? "weaponId" :
      weaponType === "SECONDARY" ? "pistolId" :
      "specialId";

    await prisma.playerLoadout.upsert({
      where: { playerId_class: { playerId, class: cls } },
      update: { [slotField]: weapon.id },
      create: { playerId, class: cls, [slotField]: weapon.id },
    });

    // Ensure PlayerWeaponSetup exists with default attachments
    const existingSetup = await prisma.playerWeaponSetup.findUnique({
      where: { playerId_weaponId: { playerId, weaponId: weapon.id } },
      select: { id: true },
    });

    if (!existingSetup) {
      const defaultBindings = await prisma.weaponAttachment.findMany({
        where: { weaponId: weapon.id, isDefault: true },
        select: { attachmentId: true },
      });

      if (defaultBindings.length > 0) {
        const setup = await prisma.playerWeaponSetup.create({
          data: { playerId, weaponId: weapon.id },
        });
        await prisma.playerWeaponAttachment.createMany({
          data: defaultBindings.map((b) => ({
            setupId: setup.id,
            attachmentId: b.attachmentId,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  // GADGET
  if (type === 4) {
    const gadget = await prisma.gadget.findFirst({
      where: { guid, class: cls },
      select: { id: true, price: true },
    });
    if (!gadget) {
      return NextResponse.json({ ok: false, error: "item_not_found" }, { status: 404 });
    }

    if (gadget.price > 0) {
      const unlock = await prisma.playerUnlock.findUnique({
        where: {
          playerId_itemType_itemId: { playerId, itemType: "GADGET", itemId: gadget.id },
        },
      });
      if (!unlock) {
        return NextResponse.json({ ok: false, error: "item_not_unlocked" }, { status: 403 });
      }
    }

    await prisma.playerLoadout.upsert({
      where: { playerId_class: { playerId, class: cls } },
      update: { gadgetId: gadget.id },
      create: { playerId, class: cls, gadgetId: gadget.id },
    });

    return NextResponse.json({ ok: true });
  }

  // GRENADE (type === 5)
  const grenade = await prisma.grenade.findFirst({
    where: { guid, class: cls },
    select: { id: true, price: true },
  });
  if (!grenade) {
    return NextResponse.json({ ok: false, error: "item_not_found" }, { status: 404 });
  }

  if (grenade.price > 0) {
    const unlock = await prisma.playerUnlock.findUnique({
      where: {
        playerId_itemType_itemId: { playerId, itemType: "GRENADE", itemId: grenade.id },
      },
    });
    if (!unlock) {
      return NextResponse.json({ ok: false, error: "item_not_unlocked" }, { status: 403 });
    }
  }

  await prisma.playerLoadout.upsert({
    where: { playerId_class: { playerId, class: cls } },
    update: { grenadeId: grenade.id },
    create: { playerId, class: cls, grenadeId: grenade.id },
  });

  return NextResponse.json({ ok: true });
});
