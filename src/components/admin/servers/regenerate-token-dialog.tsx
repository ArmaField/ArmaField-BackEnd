"use client";

import { useState } from "react";
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
import { CopyIcon } from "lucide-react";

interface Server {
  id: string;
  name: string;
  token: string;
}

interface RegenerateTokenDialogProps {
  server: Server;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RegenerateTokenDialog({
  server,
  open,
  onOpenChange,
  onSuccess,
}: RegenerateTokenDialogProps) {
  const t = useTranslations("servers");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/servers/${server.id}/regenerate-token`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("regenerateTokenFailed"));
        return;
      }

      const data = await res.json();
      setNewToken(data.token);
      toast.success(t("tokenRegenerated"));
      onSuccess();
    } catch {
      toast.error(t("regenerateTokenFailed"));
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      toast.success(t("newTokenCopied"));
    } catch {
      toast.error(t("copyTokenFailed"));
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setNewToken(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("regenerateTokenTitle")}</DialogTitle>
          <DialogDescription>
            {newToken
              ? t("regenerateTokenSuccess")
              : t("regenerateTokenConfirm", { name: server.name })}
          </DialogDescription>
        </DialogHeader>

        {newToken && (
          <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <code className="flex-1 break-all text-xs text-emerald-400">
              {newToken}
            </code>
            <Button variant="ghost" size="icon-xs" onClick={copyToken}>
              <CopyIcon className="size-3" />
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {newToken ? t("close") : tc("cancel")}
          </Button>
          {!newToken && (
            <Button onClick={handleRegenerate} disabled={loading}>
              {loading ? t("regenerating") : t("regenerate")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
