import { getSessionOrTest, isTestMode } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlayersPageClient } from "@/components/admin/players/players-page-client";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  const tc = await getTranslations("common");

  if (isTestMode()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Players</h1>
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
          <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-400/80">
            {tc("testModePlayersUnavailable")}
          </p>
        </div>
      </div>
    );
  }

  const canManage = session.user.permissions?.includes("players.manage") ?? false;
  return <PlayersPageClient canManage={canManage} />;
}
