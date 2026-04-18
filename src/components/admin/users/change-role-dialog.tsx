"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RoleOption {
  id: string;
  name: string;
  color: string;
  isBuiltIn: boolean;
}

interface ChangeRoleDialogProps {
  userId: string;
  userName: string;
  currentRoleId: string | null;
  roles: RoleOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChangeRoleDialog({
  userId,
  userName,
  currentRoleId,
  roles,
  open,
  onOpenChange,
  onSuccess,
}: ChangeRoleDialogProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(currentRoleId);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });

      if (!res.ok) {
        toast.error(t("roleUpdateFailed"));
        return;
      }

      const updated = await res.json();
      const roleName = updated.role?.name ?? t("roles.NO_ROLE");
      toast.success(t("roleUpdated", { role: roleName }));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("roleUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("changeRole", { name: userName })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {/* No role option */}
          <button
            onClick={() => setSelectedRoleId(null)}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              selectedRoleId === null
                ? "border-zinc-600 bg-zinc-800"
                : "border-zinc-800 hover:bg-zinc-900"
            }`}
          >
            <span className="inline-block size-3 rounded-full bg-zinc-500" />
            <span className="text-zinc-300">{t("roles.NO_ROLE")}</span>
          </button>

          {/* Role options */}
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selectedRoleId === role.id
                  ? "border-zinc-600 bg-zinc-800"
                  : "border-zinc-800 hover:bg-zinc-900"
              }`}
            >
              <span
                className="inline-block size-3 shrink-0 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              <span className="text-zinc-200">{role.name}</span>
              {selectedRoleId === role.id && (
                <span className="ml-auto text-zinc-400">&#10003;</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedRoleId === currentRoleId}
          >
            {saving ? tCommon("loading") : tCommon("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
