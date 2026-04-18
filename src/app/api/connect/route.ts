import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withGameAuth } from "@/lib/game-auth";
import { buildLoadouts } from "@/lib/loadout-helpers";

export const dynamic = "force-dynamic";

const CLASSES = ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"] as const;

const ConnectSchema = z.object({
  uid: z.string().min(1, "uid is required"),
  nickname: z.string().min(1, "nickname is required").max(200),
});

/**
 * POST /api/game/connect
 * Player connects to game server.
 * Creates profile if new, returns all 4 class loadouts with GUIDs.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = ConnectSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { uid, nickname } = result.data;
  const { prisma } = await import("@/lib/db");

  // Find or create player
  let player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true, xpBalance: true },
  });

  const isNew = !player;

  if (isNew) {
    player = await prisma.player.create({
      data: { uid, nickname },
      select: { id: true, xpBalance: true },
    });
  } else {
    player = await prisma.player.update({
      where: { uid },
      data: { nickname },
      select: { id: true, xpBalance: true },
    });
  }

  const playerId = player!.id;
  const xp = player!.xpBalance;

  // If new player, create default loadouts
  if (isNew) {
    await createDefaultLoadouts(prisma, playerId);
  }

  // Fetch all 4 loadouts
  const loadouts = await buildLoadouts(prisma, playerId);

  return NextResponse.json({ uid, xp, loadouts });
});

// ─── Create default loadouts for a new player ─────

async function createDefaultLoadouts(prisma: any, playerId: string) {
  for (const cls of CLASSES) {
    // Find default items for this class
    const [defaultWeapon, defaultPistol, defaultSpecial, defaultGadget, defaultGrenade] = await Promise.all([
      prisma.weapon.findFirst({ where: { class: cls, type: "PRIMARY", isDefault: true } }),
      prisma.weapon.findFirst({ where: { class: cls, type: "SECONDARY", isDefault: true } }),
      prisma.weapon.findFirst({ where: { class: cls, type: "SPECIAL", isDefault: true } }),
      prisma.gadget.findFirst({ where: { class: cls, isDefault: true } }),
      prisma.grenade.findFirst({ where: { class: cls, isDefault: true } }),
    ]);

    // Create loadout
    await prisma.playerLoadout.create({
      data: {
        playerId,
        class: cls,
        weaponId: defaultWeapon?.id ?? null,
        pistolId: defaultPistol?.id ?? null,
        specialId: defaultSpecial?.id ?? null,
        gadgetId: defaultGadget?.id ?? null,
        grenadeId: defaultGrenade?.id ?? null,
      },
    });

    // Create weapon setups with default attachments
    const weaponIds = [defaultWeapon?.id, defaultPistol?.id, defaultSpecial?.id].filter(Boolean) as string[];

    for (const weaponId of weaponIds) {
      // Get default attachments for this weapon
      const defaultBindings = await prisma.weaponAttachment.findMany({
        where: { weaponId, isDefault: true },
        select: { attachmentId: true },
      });

      if (defaultBindings.length > 0) {
        const setup = await prisma.playerWeaponSetup.create({
          data: { playerId, weaponId },
        });

        await prisma.playerWeaponAttachment.createMany({
          data: defaultBindings.map((b: { attachmentId: string }) => ({
            setupId: setup.id,
            attachmentId: b.attachmentId,
          })),
        });
      }
    }

    // Create unlock records for default items
    const unlockData: { playerId: string; itemType: string; itemId: string }[] = [];

    if (defaultWeapon) unlockData.push({ playerId, itemType: "WEAPON", itemId: defaultWeapon.id });
    if (defaultPistol) unlockData.push({ playerId, itemType: "WEAPON", itemId: defaultPistol.id });
    if (defaultSpecial) unlockData.push({ playerId, itemType: "WEAPON", itemId: defaultSpecial.id });
    if (defaultGadget) unlockData.push({ playerId, itemType: "GADGET", itemId: defaultGadget.id });
    if (defaultGrenade) unlockData.push({ playerId, itemType: "GRENADE", itemId: defaultGrenade.id });

    if (unlockData.length > 0) {
      await prisma.playerUnlock.createMany({
        data: unlockData,
        skipDuplicates: true,
      });
    }
  }
}
