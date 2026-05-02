import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withGameAuth } from "@/lib/game-auth";
import { TEST_MODE } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

const StatsSchema = z.array(
  z.object({
    uid: z.string().min(1),
    kills: z.number().int().min(0),
    deaths: z.number().int().min(0),
    assists: z.number().int().min(0).default(0),
  })
);

/**
 * POST /api/stats
 * Accepts an array of player stats deltas (uid, kills, deaths, assists).
 * Increments existing values on each player. Players not found are skipped.
 * Called every ~60s by the game server and on round end / shutdown.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = StatsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  // In test mode - don't touch DB
  if (TEST_MODE) {
    return NextResponse.json({ ok: true });
  }

  const deltas = result.data;
  if (deltas.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { prisma } = await import("@/lib/db");

  // Process each delta independently - if one fails, others still succeed.
  // Always return 200 so the game server doesn't retry.
  await Promise.allSettled(
    deltas.map((d) =>
      prisma.player.updateMany({
        where: { uid: d.uid },
        data: {
          kills: { increment: d.kills },
          deaths: { increment: d.deaths },
          assists: { increment: d.assists },
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
});
