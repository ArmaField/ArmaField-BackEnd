import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withGameAuth } from "@/lib/game-auth";
import { TEST_MODE } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

const BatchXpSchema = z.array(
  z.object({
    uid: z.string().min(1),
    xp: z.number().int(),
  })
);

/**
 * POST /api/stats/xp
 * Batch XP delta — array of { uid, xp }. Increments xpBalance AND xpLifetime.
 * Negative values subtract. Both values are clamped to 0 (can't go negative).
 * Players not found are silently skipped. Individual failures don't affect others.
 */
export const POST = withGameAuth(async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = BatchXpSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  if (TEST_MODE) {
    return NextResponse.json({ ok: true });
  }

  const deltas = result.data;
  if (deltas.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { prisma } = await import("@/lib/db");

  await Promise.allSettled(
    deltas.map((d) =>
      prisma.$executeRaw`
        UPDATE "players"
        SET
          "xpBalance" = GREATEST(0, "xpBalance" + ${d.xp}),
          "xpLifetime" = GREATEST(0, "xpLifetime" + ${d.xp})
        WHERE "uid" = ${d.uid}
      `
    )
  );

  return NextResponse.json({ ok: true });
});
