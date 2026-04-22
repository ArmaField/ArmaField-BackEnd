"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrashIcon, ShieldIcon, PencilIcon } from "lucide-react";
import { DeleteUserDialog } from "./delete-user-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { RolesManager } from "./roles-manager";

interface RoleInfo {
  id: string;
  name: string;
  color: string;
  permissions?: string[];
  isBuiltIn?: boolean;
}

interface AdminUser {
  id: string;
  steamId: string;
  nickname: string;
  avatar: string | null;
  role: RoleInfo | null;
  createdAt: Date | string;
}

interface RoleOption {
  id: string;
  name: string;
  color: string;
  isBuiltIn: boolean;
}

interface UsersPageClientProps {
  initialUsers: AdminUser[];
  currentUserId: string;
  roles: RoleOption[];
  canManageRoles: boolean;
}

export function UsersPageClient({ initialUsers, currentUserId, roles: initialRoles, canManageRoles }: UsersPageClientProps) {
  const t = useTranslations("users");
  const locale = useLocale();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [roles, setRoles] = useState<RoleOption[]>(initialRoles);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [editRoleUser, setEditRoleUser] = useState<AdminUser | null>(null);
  const [showRolesManager, setShowRolesManager] = useState(false);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);


  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-3">
          {canManageRoles && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowRolesManager(true)}
            >
              <ShieldIcon className="size-3.5" />
              {t("manageRoles")}
            </Button>
          )}
          <span className="text-sm text-zinc-400">
            {t("userCount", { count: users.length })}
          </span>
        </div>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          {t("noUsers")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800"><div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="hidden w-12 sm:table-cell"></TableHead>
                <TableHead>{t("nickname")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("steamId")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("registered")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const roleColor = user.role?.color ?? "#6b7280";
                const roleName = user.role?.name ?? t("roles.NO_ROLE");

                return (
                  <TableRow
                    key={user.id}
                    className={
                      isCurrentUser
                        ? "border-zinc-800 bg-zinc-800/30"
                        : "border-zinc-800"
                    }
                  >
                    {/* Avatar */}
                    <TableCell className="hidden sm:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={
                            <a
                              href={`https://steamcommunity.com/profiles/${user.steamId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }>
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.nickname}
                                className="size-8 rounded-lg transition-opacity hover:opacity-80"
                              />
                            ) : (
                              <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-700 text-xs font-medium text-zinc-300 transition-opacity hover:opacity-80">
                                {user.nickname.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>{t("openSteamProfile")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Nickname */}
                    <TableCell className="font-medium">
                      {user.nickname}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-zinc-500">({t("you")})</span>
                      )}
                    </TableCell>

                    {/* Steam ID */}
                    <TableCell className="hidden sm:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.steamId);
                                toast.success(t("steamIdCopied"));
                              }}
                              className="cursor-pointer font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                            />
                          }>
                            {user.steamId}
                          </TooltipTrigger>
                          <TooltipContent>{t("clickToCopy")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Role Badge - dot on mobile, full badge on desktop */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={
                            <span
                              className="inline-block size-3 rounded-full sm:hidden"
                              style={{ backgroundColor: roleColor }}
                            />
                          } />
                          <TooltipContent>{roleName}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge
                        className="hidden uppercase border sm:inline-flex"
                        style={{
                          backgroundColor: `${roleColor}26`,
                          color: roleColor,
                          borderColor: `${roleColor}40`,
                        }}
                      >
                        {roleName}
                      </Badge>
                    </TableCell>

                    {/* Registered */}
                    <TableCell className="hidden text-zinc-400 md:table-cell">
                      {formatDate(user.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {!isCurrentUser ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setEditRoleUser(user)}
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                              onClick={() => setDeleteUser(user)}
                            >
                              <TrashIcon className="size-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">&mdash;</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div></div>
      )}

      {/* Change Role Dialog */}
      {editRoleUser && (
        <ChangeRoleDialog
          userId={editRoleUser.id}
          userName={editRoleUser.nickname}
          currentRoleId={editRoleUser.role?.id ?? null}
          roles={roles}
          open={!!editRoleUser}
          onOpenChange={(open) => {
            if (!open) setEditRoleUser(null);
          }}
          onSuccess={refreshUsers}
        />
      )}

      {/* Delete Dialog */}
      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={(open) => {
            if (!open) setDeleteUser(null);
          }}
          onSuccess={refreshUsers}
        />
      )}

      {/* Roles Manager Dialog */}
      {showRolesManager && (
        <RolesManager
          open={showRolesManager}
          onOpenChange={setShowRolesManager}
          onRolesChanged={() => {
            refreshRoles();
            refreshUsers();
          }}
        />
      )}
    </div>
  );
}
