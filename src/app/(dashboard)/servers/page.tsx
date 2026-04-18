import { getSessionOrTest, isTestMode } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ServersPageClient } from "@/components/admin/servers/servers-page-client";
import { TEST_SERVER } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

export default async function ServersPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  if (isTestMode()) {
    return <ServersPageClient initialServers={[TEST_SERVER]} testMode />;
  }

  const { prisma } = await import("@/lib/db");
  const servers = await prisma.server.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return <ServersPageClient initialServers={servers} />;
}
