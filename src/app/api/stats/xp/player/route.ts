import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withGameAuth } from "@/lib/game-auth";
import { TEST_MODE } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

const SinglePlayerXpSchema = z.object({
  uid: z.string().min(1),
  xp: z.number().int(),
});

/**
 * POST /api/stats/xp/player
 * Single player XP delta — { uid, xp }. Increments xpBalance AND xpLifetime.
 * Negative values subtract. Both values are clamped to 0.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = SinglePlayerXpSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  if (TEST_MODE) {
    return NextResponse.json({ ok: true });
  }

  const { uid, xp } = result.data;
  const { prisma } = await import("@/lib/db");

  await prisma.$executeRaw`
    UPDATE "players"
    SET
      "xpBalance" = GREATEST(0, "xpBalance" + ${xp}),
      "xpLifetime" = GREATEST(0, "xpLifetime" + ${xp})
    WHERE "uid" = ${uid}
  `;

  return NextResponse.json({ ok: true });
});
