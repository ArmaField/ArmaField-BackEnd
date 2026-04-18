"use client";

import { useLocale } from "next-intl";
import { useCallback, useState } from "react";
import { HiOutlineGlobeAlt, HiCheck } from "react-icons/hi2";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  // Future languages:
  // { code: "de", label: "Deutsch" },
  // { code: "es", label: "Español" },
  // { code: "fr", label: "Français" },
  // { code: "zh", label: "中文" },
] as const;

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const [switching, setSwitching] = useState(false);

  const currentLabel = LOCALES.find((l) => l.code === currentLocale)?.label ?? "English";

  const switchLocale = useCallback(
    async (locale: string) => {
      if (locale === currentLocale || switching) return;
      setSwitching(true);
      try {
        await fetch("/api/admin/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        window.location.reload();
      } catch {
        setSwitching(false);
      }
    },
    [currentLocale, switching]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200">
        <HiOutlineGlobeAlt className="size-4" />
        <span className="text-xs">{currentLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900">
        {LOCALES.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            disabled={switching}
            onClick={() => switchLocale(code)}
            className="flex items-center justify-between gap-4 text-sm text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
          >
            {label}
            {currentLocale === code && <HiCheck className="size-4 text-zinc-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
