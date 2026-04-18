"use client";

import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUser } from "./sidebar-user";

interface SidebarProps {
  role: string | null;
  roleColor: string;
  permissions: string[];
  userName: string;
  avatar?: string | null;
  showSignOut: boolean;
  signOutAction?: () => void;
}

export function Sidebar({ role, roleColor, permissions, userName, avatar, showSignOut, signOutAction }: SidebarProps) {
  return (
    <aside className="hidden w-56 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      <div className="border-b border-zinc-800 px-4 py-4">
        <Link
          href="/"
          className="text-xl tracking-wider text-zinc-100"
          style={{ fontFamily: '"SAIBA 45", sans-serif' }}
        >
          ARMAFIELD
        </Link>
      </div>

      <SidebarNav permissions={permissions} />
      <SidebarUser name={userName} role={role} roleColor={roleColor} avatar={avatar} showSignOut={showSignOut} signOutAction={signOutAction} />
    </aside>
  );
}
