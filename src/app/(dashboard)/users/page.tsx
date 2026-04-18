import { getSessionOrTest, isTestMode } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UsersPageClient } from "@/components/admin/users/users-page-client";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  const tc = await getTranslations("common");

  if (isTestMode()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">User Management</h1>
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
          <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-400/80">
            {tc("testModeUsersUnavailable")}
          </p>
        </div>
      </div>
    );
  }

  const { prisma } = await import("@/lib/db");
  const users = await prisma.admin.findMany({
    select: {
      id: true,
      steamId: true,
      nickname: true,
      avatar: true,
      role: { select: { id: true, name: true, color: true, permissions: true, isBuiltIn: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const roles = await prisma.role.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, color: true, isBuiltIn: true },
  });

  const canManageRoles = session.user.permissions?.includes("roles.manage") ?? false;

  return (
    <UsersPageClient
      initialUsers={users}
      currentUserId={session.user.id}
      roles={roles}
      canManageRoles={canManageRoles}
    />
  );
}
