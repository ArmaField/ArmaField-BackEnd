import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/dashboard
 * Returns aggregate dashboard statistics.
 */
export async function GET() {
  const { error } = await requirePermission("dashboard.view");
  if (error) return error;

  const { prisma } = await import("@/lib/db");

  const [
    playerCount,
    playerStats,
    activeServerCount,
    totalServerCount,
    recentPlayers,
    weaponCount,
    attachmentCount,
    gadgetCount,
    grenadeCount,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.player.aggregate({
      _sum: {
        kills: true,
        deaths: true,
        assists: true,
        wins: true,
        losses: true,
        flagsCaptured: true,
      },
    }),
    prisma.server.count({ where: { isActive: true } }),
    prisma.server.count(),
    prisma.player.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: { id: true, uid: true, nickname: true, updatedAt: true },
    }),
    prisma.weapon.count(),
    prisma.attachment.count(),
    prisma.gadget.count(),
    prisma.grenade.count(),
  ]);

  const sum = playerStats._sum;

  return NextResponse.json({
    players: { total: playerCount },
    servers: { active: activeServerCount, total: totalServerCount },
    stats: {
      totalKills: sum.kills ?? 0,
      totalDeaths: sum.deaths ?? 0,
      totalAssists: sum.assists ?? 0,
      totalWins: sum.wins ?? 0,
      totalLosses: sum.losses ?? 0,
      totalFlagsCaptured: sum.flagsCaptured ?? 0,
    },
    recentPlayers,
    content: {
      weapons: weaponCount,
      attachments: attachmentCount,
      gadgets: gadgetCount,
      grenades: grenadeCount,
    },
  });
}
