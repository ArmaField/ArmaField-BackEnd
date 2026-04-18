"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlusIcon, PencilIcon, TrashIcon, ShieldIcon, LockIcon } from "lucide-react";
import { ColorPickerPopover } from "@/components/admin/color-picker-popover";

const ALL_PERMISSIONS = [
  { key: "dashboard.view", label: "permissions.dashboardView" },
  { key: "servers.view", label: "permissions.serversView" },
  { key: "servers.manage", label: "permissions.serversManage" },
  { key: "loadouts.view", label: "permissions.loadoutsView" },
  { key: "loadouts.manage", label: "permissions.loadoutsManage" },
  { key: "players.view", label: "permissions.playersView" },
  { key: "players.manage", label: "permissions.playersManage" },
  { key: "users.view", label: "permissions.usersView" },
  { key: "users.manage", label: "permissions.usersManage" },
  { key: "roles.manage", label: "permissions.rolesManage" },
  { key: "logs.view", label: "permissions.logsView" },
  { key: "backups.view", label: "permissions.backupsView" },
  { key: "backups.manage", label: "permissions.backupsManage" },
  { key: "system.view", label: "permissions.systemView" },
] as const;

interface RoleData {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  isBuiltIn: boolean;
  sortOrder: number;
  _count?: { admins: number };
}

interface RolesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRolesChanged: () => void;
}

function SkeletonRole() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="size-3 animate-pulse rounded-full bg-zinc-700" />
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-700" />
        <div className="h-5 w-20 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="flex gap-1">
        <div className="size-7 animate-pulse rounded bg-zinc-800" />
        <div className="size-7 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function RolesManager({ open, onOpenChange, onRolesChanged }: RolesManagerProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6b7280");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<RoleData | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        setRoles(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchRoles();
  }, [open, fetchRoles]);

  const startCreate = () => {
    setIsCreating(true);
    setEditingRole(null);
    setFormName("");
    setFormColor("#6b7280");
    setFormPermissions([]);
    const maxSort = roles.reduce((max, r) => Math.max(max, r.sortOrder), 0);
    setFormSortOrder(maxSort + 1);
  };

  const startEdit = (role: RoleData) => {
    setIsCreating(false);
    setEditingRole(role);
    setFormName(role.name);
    setFormColor(role.color);
    setFormPermissions([...role.permissions]);
    setFormSortOrder(role.sortOrder);
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setIsCreating(false);
  };

  const togglePermission = (key: string) => {
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      const payload = {
        name: formName.trim(),
        color: formColor,
        permissions: formPermissions,
        sortOrder: formSortOrder,
      };

      const url = isCreating
        ? "/api/admin/roles"
        : `/api/admin/roles/${editingRole!.id}`;
      const method = isCreating ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("roleSaveFailed"));
        return;
      }

      toast.success(isCreating ? t("roleCreated") : t("roleSaved"));
      cancelEdit();
      await fetchRoles();
      onRolesChanged();
    } catch {
      toast.error(t("roleSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleConfirm) return;
    try {
      const res = await fetch(`/api/admin/roles/${deleteRoleConfirm.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("roleDeleteFailed"));
        return;
      }

      toast.success(t("roleDeleted"));
      setDeleteRoleConfirm(null);
      await fetchRoles();
      onRolesChanged();
    } catch {
      toast.error(t("roleDeleteFailed"));
    }
  };

  const isEditing = isCreating || editingRole !== null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="size-5" />
            {t("rolesTitle")}
          </DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          <>
            <div className="space-y-2">
              {loading ? (
                <>
                  <SkeletonRole />
                  <SkeletonRole />
                  <SkeletonRole />
                </>
              ) : (
                roles.map((role) => {
                  const userCount = role._count?.admins ?? 0;
                  return (
                    <div
                      key={role.id}
                      className="rounded-lg border border-zinc-800 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Name */}
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="inline-block size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: role.color }}
                          />
                          <span className="font-medium uppercase text-zinc-200">
                            {role.name}
                          </span>
                          {role.isBuiltIn && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger render={<span className="shrink-0 text-zinc-500" />}>
                                  <LockIcon className="size-3" />
                                </TooltipTrigger>
                                <TooltipContent>{t("builtInRole")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline" className="hidden text-xs text-zinc-500 sm:inline-flex">
                            {t("permissionCount", { count: role.permissions.length })}
                          </Badge>
                          <Badge variant="outline" className="hidden text-xs text-zinc-500 sm:inline-flex">
                            {t("userCount", { count: userCount })}
                          </Badge>
                          <div className="flex w-[68px] items-center justify-end gap-1">
                          {!role.isBuiltIn && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => startEdit(role)}
                                      />
                                    }
                                  >
                                    <PencilIcon className="size-3.5" />
                                  </TooltipTrigger>
                                  <TooltipContent>{tCommon("edit")}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                        onClick={() => setDeleteRoleConfirm(role)}
                                        disabled={userCount > 0}
                                      />
                                    }
                                  >
                                    <TrashIcon className="size-3.5" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {userCount > 0
                                      ? "Cannot delete: role has assigned users"
                                      : tCommon("delete")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                          </div>
                        </div>
                      </div>
                      {/* Mobile badges row */}
                      <div className="mt-2 flex gap-2 sm:hidden">
                        <Badge variant="outline" className="text-xs text-zinc-500">
                          {t("permissionCount", { count: role.permissions.length })}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-zinc-500">
                          {t("userCount", { count: userCount })}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Button
              onClick={startCreate}
              className="mt-2 w-full gap-1.5"
              variant="outline"
            >
              <PlusIcon className="size-4" />
              {t("createRole")}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">{t("roleName")}</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  id="role-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("roleNamePlaceholder")}
                  className="flex-1"
                />
                <div className="flex items-center rounded-lg border border-input bg-transparent dark:bg-input/30">
                  <button
                    type="button"
                    onClick={() => setFormSortOrder(Math.max(0, formSortOrder - 1))}
                    className="flex size-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs text-zinc-300">{formSortOrder}</span>
                  <button
                    type="button"
                    onClick={() => setFormSortOrder(formSortOrder + 1)}
                    className="flex size-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
                  >
                    +
                  </button>
                </div>
                <ColorPickerPopover color={formColor} onChange={setFormColor} />
              </div>
            </div>

            <div>
              <Label>{t("rolePermissions")}</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm transition-colors hover:bg-zinc-900"
                  >
                    <Checkbox
                      checked={formPermissions.includes(perm.key)}
                      onCheckedChange={() => togglePermission(perm.key)}
                    />
                    <span className="text-zinc-300">{t(perm.label)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Delete Role Confirmation */}
    <Dialog open={!!deleteRoleConfirm} onOpenChange={(o) => { if (!o) setDeleteRoleConfirm(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteRole")}</DialogTitle>
          <DialogDescription>
            {t("deleteRoleConfirm", { name: deleteRoleConfirm?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteRoleConfirm(null)}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            {tCommon("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
