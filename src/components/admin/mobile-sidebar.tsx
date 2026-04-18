"use client";

import { useState } from "react";
import Link from "next/link";
import { HiOutlineBars3 } from "react-icons/hi2";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUser } from "./sidebar-user";

interface MobileSidebarProps {
  role: string | null;
  roleColor: string;
  permissions: string[];
  userName: string;
  avatar?: string | null;
  showSignOut: boolean;
  signOutAction?: () => void;
}

export function MobileSidebar({ role, roleColor, permissions, userName, avatar, showSignOut, signOutAction }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden">
        <HiOutlineBars3 className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-56 border-zinc-800 bg-zinc-950 p-0">
        {/* Logo */}
        <div className="border-b border-zinc-800 px-4 py-4">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="text-xl tracking-wider text-zinc-100"
            style={{ fontFamily: '"SAIBA 45", sans-serif' }}
          >
            ARMAFIELD
          </Link>
        </div>

        <SidebarNav permissions={permissions} onNavigate={() => setOpen(false)} />
        <SidebarUser name={userName} role={role} roleColor={roleColor} avatar={avatar} showSignOut={showSignOut} signOutAction={signOutAction} />
      </SheetContent>
    </Sheet>
  );
}
