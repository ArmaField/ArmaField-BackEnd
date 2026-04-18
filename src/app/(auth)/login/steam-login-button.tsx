"use client";

import { useTranslations } from "next-intl";
import { FaSteam } from "react-icons/fa";

export function SteamLoginButton() {
  const t = useTranslations("auth");

  return (
    <button
      onClick={() => {
        window.location.href = "/api/admin/auth/steam";
      }}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
    >
      <FaSteam className="text-lg" />
      {t("signInWithSteam")}
    </button>
  );
}
