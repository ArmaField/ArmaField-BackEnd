"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Weapon {
  id: string;
  name: string;
  price: number;
}

interface DeleteWeaponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weapon: Weapon;
  onSuccess: () => void;
}

export function DeleteWeaponDialog({
  open,
  onOpenChange,
  weapon,
  onSuccess,
}: DeleteWeaponDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [refund, setRefund] = useState(false);
  const [ownerCount, setOwnerCount] = useState<number | null>(null);
  const [hasAttachments, setHasAttachments] = useState(false);

  // Fetch owner count and attachments cost when dialog opens
  useEffect(() => {
    if (open && weapon.id) {
      setRefund(false);
      setOwnerCount(null);
      setHasAttachments(false);
      fetch(`/api/admin/weapons/${weapon.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ownerCount !== undefined) {
            setOwnerCount(data.ownerCount);
          }
          if (data?.attachmentsCost > 0) {
            setHasAttachments(true);
          }
        })
        .catch(() => {});
    }
  }, [open, weapon.id]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/weapons/${weapon.id}${refund ? "?refund=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("weaponDeleteFailed"));
        return;
      }

      toast.success(
        refund
          ? t("weaponDeletedRefund", { count: ownerCount ?? "all" })
          : t("weaponDeleted")
      );
      onSuccess();
    } catch {
      toast.error(t("weaponDeleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteWeapon")}</DialogTitle>
          <DialogDescription>
            {t("deleteWeaponConfirm", { name: weapon.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {ownerCount !== null && ownerCount > 0 && (
            <p className="text-sm text-zinc-400">
              {t("playersOwn", { count: ownerCount })}
            </p>
          )}

          {(weapon.price > 0 || hasAttachments) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2">
                <Label htmlFor="refund-switch" className="text-sm">{t("refundXP")}</Label>
                <Switch
                  id="refund-switch"
                  checked={refund}
                  onCheckedChange={setRefund}
                  disabled={loading}
                />
              </div>

              {refund && (
                <div className="rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm space-y-1.5">
                  {weapon.price > 0 && (
                    <p className="text-zinc-400">
                      {t("refundWeaponPrice", { price: weapon.price.toLocaleString("de-DE") })}
                    </p>
                  )}
                  {hasAttachments && (
                    <p className="text-zinc-500 text-xs">
                      {t("refundAttachmentsNote")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? t("deleting") : t("deleteWeapon")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
