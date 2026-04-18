import { getSessionOrTest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "@/components/admin/settings/settings-page-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  return <SettingsPageClient />;
}
