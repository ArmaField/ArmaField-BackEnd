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

interface CopyToClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Item's current class (excluded from target list) */
  sourceClass: Class;
  /** Full API path including id: /api/admin/weapons/{id}/copy-to-classes */
  apiPath: string;
  onSuccess: () => void;
}

export function CopyToClassesDialog({
  open,
  onOpenChange,
  title,
  sourceClass,
  apiPath,
  onSuccess,
}: CopyToClassesDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  const candidateClasses = CLASSES.filter((c) => c !== sourceClass);
  const [selected, setSelected] = useState<Set<Class>>(new Set());
  const [skipConflicts, setSkipConflicts] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSkipConflicts(false);
    }
  }, [open, sourceClass]);

  const toggle = (cls: Class) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetClasses: Array.from(selected),
          skipConflicts,
        }),
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
            {t("copyToClassesDescription", { sourceClass })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("targetClasses")}</Label>
            <div className="space-y-2">
              {candidateClasses.map((cls) => (
                <label
                  key={cls}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border border-zinc-800 p-3 transition-colors ${
                    loading ? "cursor-not-allowed opacity-50" : "hover:border-zinc-700"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(cls)}
                    onCheckedChange={() => toggle(cls)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-zinc-200">{cls}</span>
                </label>
              ))}
            </div>
          </div>

          <label
            className={`flex items-start gap-3 rounded-md border border-zinc-800 p-3 transition-colors ${
              loading ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-zinc-700"
            }`}
          >
            <Checkbox
              checked={skipConflicts}
              onCheckedChange={(c) => setSkipConflicts(!!c)}
              disabled={loading}
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
          <Button onClick={handleSubmit} disabled={loading || selected.size === 0}>
            {loading ? tc("loading") : t("copyButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
