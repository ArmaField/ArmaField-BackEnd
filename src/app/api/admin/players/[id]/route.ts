import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/players/[id]
 * Full player profile with stats, loadouts (resolved names), weapon setups, and unlocks.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("players.view");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  try {
    const player = await prisma.player.findUniqueOrThrow({
      where: { id },
      include: {
        loadouts: true,
        weaponSetups: {
          include: {
            attachments: true,
          },
        },
        unlocks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Collect all item IDs we need to resolve names for
    const weaponIds = new Set<string>();
    const gadgetIds = new Set<string>();
    const grenadeIds = new Set<string>();
    const attachmentIds = new Set<string>();

    for (const loadout of player.loadouts) {
      if (loadout.weaponId) weaponIds.add(loadout.weaponId);
      if (loadout.pistolId) weaponIds.add(loadout.pistolId);
      if (loadout.gadgetId) gadgetIds.add(loadout.gadgetId);
      if (loadout.grenadeId) grenadeIds.add(loadout.grenadeId);
    }

    for (const setup of player.weaponSetups) {
      weaponIds.add(setup.weaponId);
      for (const att of setup.attachments) {
        attachmentIds.add(att.attachmentId);
      }
    }

    for (const unlock of player.unlocks) {
      switch (unlock.itemType) {
        case "WEAPON":
          weaponIds.add(unlock.itemId);
          break;
        case "ATTACHMENT":
          attachmentIds.add(unlock.itemId);
          break;
        case "GADGET":
          gadgetIds.add(unlock.itemId);
          break;
        case "GRENADE":
          grenadeIds.add(unlock.itemId);
          break;
      }
    }

    // Resolve names in parallel
    const [weapons, gadgets, grenades, attachments] = await Promise.all([
      weaponIds.size > 0
        ? prisma.weapon.findMany({
            where: { id: { in: [...weaponIds] } },
            select: { id: true, name: true, type: true },
          })
        : [],
      gadgetIds.size > 0
        ? prisma.gadget.findMany({
            where: { id: { in: [...gadgetIds] } },
            select: { id: true, name: true },
          })
        : [],
      grenadeIds.size > 0
        ? prisma.grenade.findMany({
            where: { id: { in: [...grenadeIds] } },
            select: { id: true, name: true },
          })
        : [],
      attachmentIds.size > 0
        ? prisma.attachment.findMany({
            where: { id: { in: [...attachmentIds] } },
            select: { id: true, name: true, slot: true },
          })
        : [],
    ]);

    const weaponMap = Object.fromEntries(weapons.map((w) => [w.id, w]));
    const gadgetMap = Object.fromEntries(gadgets.map((g) => [g.id, g]));
    const grenadeMap = Object.fromEntries(grenades.map((g) => [g.id, g]));
    const attachmentMap = Object.fromEntries(attachments.map((a) => [a.id, a]));

    // Build resolved loadouts
    const loadouts = player.loadouts.map((l) => ({
      id: l.id,
      class: l.class,
      weapon: l.weaponId ? weaponMap[l.weaponId] ?? null : null,
      pistol: l.pistolId ? weaponMap[l.pistolId] ?? null : null,
      gadget: l.gadgetId ? gadgetMap[l.gadgetId] ?? null : null,
      grenade: l.grenadeId ? grenadeMap[l.grenadeId] ?? null : null,
    }));

    // Build resolved weapon setups
    const weaponSetups = player.weaponSetups.map((s) => ({
      id: s.id,
      weapon: weaponMap[s.weaponId] ?? { id: s.weaponId, name: "Unknown", type: "PRIMARY" },
      attachments: s.attachments.map((a) => ({
        id: a.id,
        attachment: attachmentMap[a.attachmentId] ?? {
          id: a.attachmentId,
          name: "Unknown",
          slot: "OPTIC",
        },
      })),
    }));

    // Build resolved unlocks
    const unlocks = player.unlocks.map((u) => {
      let itemName = "Unknown";
      switch (u.itemType) {
        case "WEAPON":
          itemName = weaponMap[u.itemId]?.name ?? "Unknown";
          break;
        case "ATTACHMENT":
          itemName = attachmentMap[u.itemId]?.name ?? "Unknown";
          break;
        case "GADGET":
          itemName = gadgetMap[u.itemId]?.name ?? "Unknown";
          break;
        case "GRENADE":
          itemName = grenadeMap[u.itemId]?.name ?? "Unknown";
          break;
      }
      return {
        id: u.id,
        itemType: u.itemType,
        itemId: u.itemId,
        itemName,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({
      id: player.id,
      uid: player.uid,
      nickname: player.nickname,
      xpBalance: player.xpBalance,
      xpLifetime: player.xpLifetime,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      wins: player.wins,
      losses: player.losses,
      flagsCaptured: player.flagsCaptured,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
      loadouts,
      weaponSetups,
      unlocks,
    });
  } catch {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
}

/**
 * PUT /admin/api/players/[id]
 * Update player fields (nickname, stats).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("players.manage");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { prisma } = await import("@/lib/db");

  // Only allow specific fields to be updated
  const allowed: Record<string, "string" | "number"> = {
    nickname: "string",
    xpBalance: "number",
    xpLifetime: "number",
    kills: "number",
    deaths: "number",
    assists: "number",
    wins: "number",
    losses: "number",
    flagsCaptured: "number",
  };

  const data: Record<string, string | number> = {};
  for (const [key, type] of Object.entries(allowed)) {
    if (key in body) {
      if (type === "number") {
        const val = Number(body[key]);
        if (isNaN(val) || val < 0) {
          return NextResponse.json(
            { error: `Invalid value for ${key}` },
            { status: 400 }
          );
        }
        data[key] = val;
      } else {
        const val = String(body[key]).trim();
        if (!val) {
          return NextResponse.json(
            { error: `${key} cannot be empty` },
            { status: 400 }
          );
        }
        data[key] = val;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.player.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
}

/**
 * DELETE /admin/api/players/[id]
 * Remove a player and all related data.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("players.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  try {
    await prisma.player.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
}
