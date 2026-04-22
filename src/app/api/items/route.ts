import { NextRequest, NextResponse } from "next/server";
import { withGameAuth } from "@/lib/game-auth";
import { CLASS_MAP, buildItemsList } from "@/lib/loadout-helpers";
import { TEST_MODE } from "@/lib/test-mode";
import { buildTestItemsList } from "@/lib/test-loadout-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/items?uid=...&classId=1&type=1
 */
export const GET = withGameAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const classIdRaw = parseInt(searchParams.get("classId") ?? "", 10);
  const typeRaw = parseInt(searchParams.get("type") ?? "", 10);

  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  const cls = CLASS_MAP[classIdRaw];
  if (!cls) {
    return NextResponse.json({ error: "Invalid classId (1-4)" }, { status: 400 });
  }

  if (![1, 2, 3, 4, 5].includes(typeRaw)) {
    return NextResponse.json({ error: "Invalid type (1-5)" }, { status: 400 });
  }

  // Test mode: stateless - return items from static data, xp=0
  if (TEST_MODE) {
    return NextResponse.json({
      uid,
      xp: 0,
      items: buildTestItemsList(cls, typeRaw),
    });
  }

  const { prisma } = await import("@/lib/db");

  const player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true, xpBalance: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const items = await buildItemsList(prisma, player.id, cls, typeRaw);

  return NextResponse.json({ uid, xp: player.xpBalance, items });
});
