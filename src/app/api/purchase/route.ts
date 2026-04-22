import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Class, WeaponType } from "@prisma/client";
import { withGameAuth } from "@/lib/game-auth";
import { buildItemsList } from "@/lib/loadout-helpers";
import { TEST_MODE } from "@/lib/test-mode";
import { buildTestItemsList } from "@/lib/test-loadout-helpers";

export const dynamic = "force-dynamic";

const CLASS_MAP: Record<number, Class> = { 1: "ASSAULT", 2: "ENGINEER", 3: "SUPPORT", 4: "RECON" };
const WEAPON_TYPE_MAP: Record<number, WeaponType> = { 1: "PRIMARY", 2: "SECONDARY", 3: "SPECIAL" };
const VALID_ITEM_TYPES = [1, 2, 3, 4, 5];

const PurchaseSchema = z.object({
  uid: z.string().min(1),
  classId: z.number().int(),
  itemType: z.number().int(),
  itemGuid: z.string().min(1),
});

/**
 * POST /api/purchase
 * Purchase a weapon (PRIMARY/SECONDARY/SPECIAL), gadget, or grenade.
 * Deducts XP and creates an unlock record.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = PurchaseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const { uid, classId, itemType, itemGuid: rawGuid } = result.data;

  const cls = CLASS_MAP[classId];
  if (!cls) {
    return NextResponse.json({ error: "invalid_class" }, { status: 400 });
  }

  if (!VALID_ITEM_TYPES.includes(itemType)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  // Extract hex GUID from prefab path
  const guidMatch = rawGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
  const guid = guidMatch ? guidMatch[1] : rawGuid.trim();

  // Test mode: fake purchase - no state change, return refreshed items list with xp=0
  if (TEST_MODE) {
    return NextResponse.json({
      ok: true,
      uid,
      xp: 0,
      items: buildTestItemsList(cls, itemType),
    });
  }

  const { prisma } = await import("@/lib/db");

  // Find player
  const player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true, xpBalance: true },
  });
  if (!player) {
    return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  }

  // Find item based on type
  let itemId: string | null = null;
  let price = 0;
  let unlockItemType: "WEAPON" | "GADGET" | "GRENADE" = "WEAPON";

  const weaponType = WEAPON_TYPE_MAP[itemType];
  if (weaponType) {
    const weapon = await prisma.weapon.findFirst({
      where: { guid, class: cls, type: weaponType },
      select: { id: true, price: true },
    });
    if (!weapon) {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }
    itemId = weapon.id;
    price = weapon.price;
    unlockItemType = "WEAPON";
  } else if (itemType === 4) {
    const gadget = await prisma.gadget.findFirst({
      where: { guid, class: cls },
      select: { id: true, price: true },
    });
    if (!gadget) {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }
    itemId = gadget.id;
    price = gadget.price;
    unlockItemType = "GADGET";
  } else {
    // type === 5 (GRENADE)
    const grenade = await prisma.grenade.findFirst({
      where: { guid, class: cls },
      select: { id: true, price: true },
    });
    if (!grenade) {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }
    itemId = grenade.id;
    price = grenade.price;
    unlockItemType = "GRENADE";
  }

  // Free items are implicitly owned - can't purchase
  if (price === 0) {
    return NextResponse.json({ error: "item_is_free" }, { status: 400 });
  }

  // Check if already owned
  const existing = await prisma.playerUnlock.findUnique({
    where: { playerId_itemType_itemId: { playerId: player.id, itemType: unlockItemType, itemId: itemId! } },
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
      where: { id: player.id },
      data: { xpBalance: { decrement: price } },
      select: { xpBalance: true },
    }),
    prisma.playerUnlock.create({
      data: { playerId: player.id, itemType: unlockItemType, itemId: itemId! },
    }),
  ]);

  // Return updated items list (same as GET /api/items)
  const items = await buildItemsList(prisma, player.id, cls, itemType);

  return NextResponse.json({ uid, xp: updatedPlayer.xpBalance, items });
});
