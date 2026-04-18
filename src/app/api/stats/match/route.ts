import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withGameAuth } from "@/lib/game-auth";
import { TEST_MODE } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

const MatchResultSchema = z.object({
  winners: z.array(z.string().min(1)),
  losers: z.array(z.string().min(1)),
});

/**
 * POST /api/stats/match
 * End-of-round results. Increments `wins` for each uid in `winners`,
 * `losses` for each uid in `losers`. Players not found are silently skipped.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = MatchResultSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  if (TEST_MODE) {
    return NextResponse.json({ ok: true });
  }

  const { winners, losers } = result.data;
  if (winners.length === 0 && losers.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { prisma } = await import("@/lib/db");

  await Promise.allSettled([
    ...(winners.length > 0
      ? [prisma.player.updateMany({ where: { uid: { in: winners } }, data: { wins: { increment: 1 } } })]
      : []),
    ...(losers.length > 0
      ? [prisma.player.updateMany({ where: { uid: { in: losers } }, data: { losses: { increment: 1 } } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
});
