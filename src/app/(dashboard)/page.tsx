import { getSessionOrTest } from "@/lib/auth";
import { isTestMode } from "@/lib/auth";
import { redirect } from "next/navigation";
import { timeAgo, fmt } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const testMode = isTestMode();

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

  // In test mode, show random demo numbers instead of zeros
  const statCards = testMode
    ? [
        { title: t("players"), value: fmt(1247) },
        { title: t("activeServers"), value: "3 / 5" },
        { title: t("totalKills"), value: fmt(84329) },
        { title: t("totalGames"), value: fmt(2156) },
      ]
    : [
        { title: t("players"), value: fmt(playerCount) },
        { title: t("activeServers"), value: `${fmt(activeServerCount)} / ${fmt(totalServerCount)}` },
        { title: t("totalKills"), value: fmt(sum.kills ?? 0) },
        { title: t("totalGames"), value: fmt((sum.wins ?? 0) + (sum.losses ?? 0)) },
      ];

  const contentItems = [
    { label: t("weapons"), count: weaponCount },
    { label: t("attachments"), count: attachmentCount },
    { label: t("gadgets"), count: gadgetCount },
    { label: t("grenades"), count: grenadeCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {session?.user?.name && (
          <p className="mt-1 text-sm text-zinc-400">
            {t("welcomeBack", { name: session.user.name })}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
          >
            <p className="text-xs font-medium text-zinc-400">{card.title}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Content overview */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          {t("contentOverview")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {contentItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2"
            >
              <span className="text-lg font-bold text-zinc-100">
                {fmt(item.count)}
              </span>{" "}
              <span className="text-sm text-zinc-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent players */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          {t("recentPlayers")}
        </h2>

        {testMode ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
            <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-400/80">
              {tc("testModeDashboardPlayersUnavailable")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="px-4 py-2.5 text-xs font-medium">{t("nickname")}</th>
                  <th className="px-4 py-2.5 text-xs font-medium">{t("uid")}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium">{t("lastSeen")}</th>
                </tr>
              </thead>
              <tbody>
                {recentPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                      {t("noPlayersYet")}
                    </td>
                  </tr>
                ) : (
                  recentPlayers.map((player) => (
                    <tr key={player.id} className="border-b border-zinc-800 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-zinc-100">{player.nickname}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{player.uid}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-400">
                        {timeAgo(new Date(player.updatedAt))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
