import { isTestMode } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export async function TestModeBanner() {
  if (!isTestMode()) {
    return null;
  }

  const tc = await getTranslations("common");

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
      <HiOutlineExclamationTriangle className="size-5 shrink-0 self-center text-amber-500" />
      <div>
        <p className="text-sm font-medium text-amber-400">{tc("testModeBannerTitle")}</p>
        <p className="mt-0.5 text-xs text-amber-500/70">{tc("testModeBannerDescription")}</p>
      </div>
    </div>
  );
}
