import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withGameAuth } from "@/lib/game-auth";
import { CLASS_MAP, buildLoadouts } from "@/lib/loadout-helpers";
import { TEST_MODE } from "@/lib/test-mode";
import { buildTestLoadouts } from "@/lib/test-loadout-helpers";

export const dynamic = "force-dynamic";

const RespawnSchema = z.object({
  uid: z.string().min(1),
  classId: z.number().int(),
});

/**
 * POST /api/respawn
 * Returns player's full loadout for a specific class with equipped attachments.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = RespawnSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const { uid, classId } = result.data;

  const cls = CLASS_MAP[classId];
  if (!cls) {
    return NextResponse.json({ error: "invalid_class" }, { status: 400 });
  }

  // Test mode: return default loadout for class, no DB access
  if (TEST_MODE) {
    const [entry] = buildTestLoadouts(cls);
    const { classId: cId, ...loadout } = entry;
    return NextResponse.json({ uid, classId: cId, loadout });
  }

  const { prisma } = await import("@/lib/db");

  const player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  }

  const loadouts = await buildLoadouts(prisma, player.id, cls);
  const entry = loadouts[0] ?? { classId, primary: null, secondary: null, special: null, gadget: null, grenade: null };
  const { classId: cId, ...loadout } = entry;

  return NextResponse.json({ uid, classId: cId, loadout });
});
