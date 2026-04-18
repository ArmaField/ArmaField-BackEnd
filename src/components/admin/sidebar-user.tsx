"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { HiOutlineArrowRightOnRectangle, HiOutlineInformationCircle } from "react-icons/hi2";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./language-switcher";

interface SidebarUserProps {
  name: string;
  role: string | null;
  roleColor: string;
  avatar?: string | null;
  showSignOut: boolean;
  signOutAction?: () => void;
}

export function SidebarUser({ name, role, roleColor, avatar, showSignOut, signOutAction }: SidebarUserProps) {
  const t = useTranslations("common");
  const roleLabel = role ?? t("roles.NO_ROLE");
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-t border-zinc-800 px-2 py-3">
      {/* Language + System Info */}
      <div className="mb-2 flex items-center justify-between">
        <LanguageSwitcher />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<Link href="/system" className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300" />}>
              <HiOutlineInformationCircle className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{t("systemInfo")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* User */}
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
        {avatar ? (
          <Image
            src={avatar}
            alt={name}
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-lg"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-medium text-zinc-300">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
          <Badge
            className="mt-0.5 px-1.5 py-0 text-[10px] uppercase leading-4 border"
            style={{
              backgroundColor: `${roleColor}26`,
              color: roleColor,
              borderColor: `${roleColor}40`,
            }}
          >
            {roleLabel}
          </Badge>
        </div>
        {showSignOut && signOutAction && (
          <form action={signOutAction}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={
                  <button
                    type="submit"
                    className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  />
                }>
                  <HiOutlineArrowRightOnRectangle className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="right">{t("signOut")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </form>
        )}
      </div>
    </div>
  );
}
