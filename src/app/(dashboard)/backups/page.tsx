import { getSessionOrTest, isTestMode } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackupsPageClient } from "@/components/admin/backups/backups-page-client";
import { isLocalDatabase } from "@/lib/database-type";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  const tc = await getTranslations("common");
  const t = await getTranslations("backups");

  if (isTestMode()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
          <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-400/80">
            {tc("testModeBackupsUnavailable")}
          </p>
        </div>
      </div>
    );
  }

  if (!isLocalDatabase()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
          <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="text-sm text-amber-400/80">
            <p className="font-medium">{t("externalDbTitle")}</p>
            <p className="mt-1 text-amber-400/60">{t("externalDbMessage")}</p>
          </div>
        </div>
      </div>
    );
  }

  return <BackupsPageClient />;
}
