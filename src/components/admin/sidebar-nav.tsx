"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  HiOutlineSquares2X2,
  HiOutlineServer,
  HiOutlinePuzzlePiece,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineArchiveBox,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import type { IconType } from "react-icons";

type NavKey = "dashboard" | "servers" | "loadouts" | "players" | "logs" | "backups" | "users" | "settings";

interface NavItem {
  key: NavKey;
  href: string;
  permission: string;
  icon: IconType;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", permission: "dashboard.view", icon: HiOutlineSquares2X2 },
  { key: "servers", href: "/servers", permission: "servers.view", icon: HiOutlineServer },
  { key: "loadouts", href: "/loadouts", permission: "loadouts.view", icon: HiOutlinePuzzlePiece },
  { key: "players", href: "/players", permission: "players.view", icon: HiOutlineUsers },
  { key: "logs", href: "/logs", permission: "logs.view", icon: HiOutlineDocumentText },
  { key: "backups", href: "/backups", permission: "backups.view", icon: HiOutlineArchiveBox },
  { key: "users", href: "/users", permission: "users.view", icon: HiOutlineUserGroup },
];

interface SidebarNavProps {
  permissions: string[];
  onNavigate?: () => void;
}

export function SidebarNav({ permissions, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const visibleItems = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <nav className="flex-1 space-y-0.5 px-2 py-2">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
