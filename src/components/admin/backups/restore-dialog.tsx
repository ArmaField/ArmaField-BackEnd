"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HiOutlineExclamationTriangle, HiOutlineClipboardDocument } from "react-icons/hi2";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BackupFile {
  filename: string;
  size: number;
  date: string;
}

interface RestoreDialogProps {
  backup: BackupFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreDialog({ backup, open, onOpenChange }: RestoreDialogProps) {
  const t = useTranslations("backups");
  const tc = useTranslations("common");
  const [restoring, setRestoring] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const command = `gunzip < ${backup.filename} | psql -U armafield armafield`;

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/backups/restore/${encodeURIComponent(backup.filename)}`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(t("restoreSuccess"));
        onOpenChange(false);
        setConfirmed(false);
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? t("restoreFailed"));
      }
    } catch {
      toast.error(t("restoreFailed"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setConfirmed(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("restoreBackup")}</DialogTitle>
          <DialogDescription>
            {t("restoreDescription", { filename: backup.filename })}
          </DialogDescription>
        </DialogHeader>

        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3">
          <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-400/80">{t("restoreWarning")}</p>
        </div>

        {/* CLI alternative */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">{t("restoreCli")}</p>
          <div className="flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
            <code className="flex-1 font-mono text-xs leading-relaxed text-zinc-300 select-all">
              {command}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(command);
                toast.success(tc("copied") || "Copied");
              }}
              className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
            >
              <HiOutlineClipboardDocument className="size-4" />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={restoring}>
            {tc("cancel")}
          </Button>
          {!confirmed ? (
            <Button variant="destructive" onClick={() => setConfirmed(true)}>
              {t("restoreConfirmStep1")}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleRestore} disabled={restoring}>
              {restoring ? tc("loading") : t("restoreConfirmStep2")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
