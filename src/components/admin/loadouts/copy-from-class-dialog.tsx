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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CLASSES, type Class } from "./types";

interface CopyFromClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  targetClass: Class;
  /** API path that accepts POST with { sourceClass, targetClass, type?, deleteExisting, skipConflicts } */
  apiPath: string;
  /** Optional weapon type (PRIMARY/SECONDARY/SPECIAL). Omit for gadgets/grenades. */
  type?: "PRIMARY" | "SECONDARY" | "SPECIAL";
  onSuccess: () => void;
}

export function CopyFromClassDialog({
  open,
  onOpenChange,
  title,
  targetClass,
  apiPath,
  type,
  onSuccess,
}: CopyFromClassDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  const otherClasses = CLASSES.filter((c) => c !== targetClass);
  const [sourceClass, setSourceClass] = useState<Class>(otherClasses[0]);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [skipConflicts, setSkipConflicts] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSourceClass(otherClasses[0]);
      setDeleteExisting(false);
      setSkipConflicts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetClass]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        sourceClass,
        targetClass,
        deleteExisting,
        skipConflicts,
      };
      if (type) body.type = type;

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("copyFailed"));
        return;
      }
      const parts: string[] = [];
      if (data.created) parts.push(t("copyCreated", { n: data.created }));
      if (data.updated) parts.push(t("copyUpdated", { n: data.updated }));
      if (data.skipped) parts.push(t("copySkipped", { n: data.skipped }));
      if (data.deleted) parts.push(t("copyDeleted", { n: data.deleted }));
      toast.success(parts.length ? parts.join(", ") : t("copyNothing"));
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error(t("copyFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("copyFromClassDescription", { targetClass })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("sourceClass")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {otherClasses.map((cls) => (
                <button
                  type="button"
                  key={cls}
                  onClick={() => setSourceClass(cls)}
                  disabled={loading}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    sourceClass === cls
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 p-3 transition-colors hover:border-zinc-700">
            <Checkbox
              checked={deleteExisting}
              onCheckedChange={(c) => setDeleteExisting(!!c)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-zinc-200">
                {t("copyDeleteExisting")}
              </div>
              <div className="text-xs text-zinc-500">
                {t("copyDeleteExistingHint")}
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-md border border-zinc-800 p-3 transition-colors ${
              deleteExisting
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:border-zinc-700"
            }`}
          >
            <Checkbox
              checked={skipConflicts}
              onCheckedChange={(c) => setSkipConflicts(!!c)}
              disabled={deleteExisting}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-zinc-200">
                {t("copySkipConflicts")}
              </div>
              <div className="text-xs text-zinc-500">
                {t("copySkipConflictsHint")}
              </div>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("loading") : t("copyButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
