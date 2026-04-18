import { getSessionOrTest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlayerDetailClient } from "@/components/admin/players/player-detail-client";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  return <PlayerDetailClient playerId={id} />;
}
