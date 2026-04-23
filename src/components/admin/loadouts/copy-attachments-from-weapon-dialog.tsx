"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchIcon, StarIcon, Loader2Icon } from "lucide-react";
import { CLASSES, type AttachmentSlot, type Class, type WeaponCategory } from "./types";

interface PickerAttachment {
  id: string;
  guid: string;
  name: string;
  defaultPrice: number;
  slot: AttachmentSlot;
}

interface PickerBinding {
  attachmentId: string;
  priceOverride: number | null;
  isDefault: boolean;
  attachment: PickerAttachment;
}

interface PickerWeapon {
  id: string;
  guid: string;
  name: string;
  price: number;
  zorder: number;
  type: "PRIMARY" | "SECONDARY" | "SPECIAL";
  class: Class;
  categoryId: string;
  category: WeaponCategory;
  attachments: PickerBinding[];
}

interface CopyAttachmentsFromWeaponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: AttachmentSlot;
  slotLabel: string;
  targetWeaponId: string;
  /** Target weapon's class, used as default tab */
  targetWeaponClass: Class;
  onSuccess: () => void;
}

const WEAPON_TYPES: Array<{ type: "PRIMARY" | "SECONDARY" | "SPECIAL"; key: string }> = [
  { type: "PRIMARY", key: "primaryWeapons" },
  { type: "SECONDARY", key: "secondaryWeapons" },
  { type: "SPECIAL", key: "specialWeapons" },
];

export function CopyAttachmentsFromWeaponDialog({
  open,
  onOpenChange,
  slot,
  slotLabel,
  targetWeaponId,
  targetWeaponClass,
  onSuccess,
}: CopyAttachmentsFromWeaponDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  const [weapons, setWeapons] = useState<PickerWeapon[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [activeClass, setActiveClass] = useState<Class>(targetWeaponClass);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [skipConflicts, setSkipConflicts] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset + fetch on open
  useEffect(() => {
    if (!open) return;
    setActiveClass(targetWeaponClass);
    setSearch("");
    setSelectedId(null);
    setSkipConflicts(false);
    setReplaceExisting(false);

    setFetchLoading(true);
    fetch(`/api/admin/weapons/bindings-by-slot?slot=${slot}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PickerWeapon[]) => setWeapons(Array.isArray(data) ? data : []))
      .catch(() => setWeapons([]))
      .finally(() => setFetchLoading(false));
  }, [open, slot, targetWeaponClass]);

  const selectedWeapon = useMemo(
    () => weapons.find((w) => w.id === selectedId) ?? null,
    [weapons, selectedId]
  );

  // Visible weapons for active class, filtered by search, grouped by type
  const weaponsByType = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = weapons.filter((w) => {
      if (w.class !== activeClass) return false;
      if (w.id === targetWeaponId) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.guid.toLowerCase().includes(q) ||
        w.category.name.toLowerCase().includes(q)
      );
    });
    const groups: Record<"PRIMARY" | "SECONDARY" | "SPECIAL", PickerWeapon[]> = {
      PRIMARY: [],
      SECONDARY: [],
      SPECIAL: [],
    };
    for (const w of filtered) groups[w.type].push(w);
    return groups;
  }, [weapons, activeClass, targetWeaponId, search]);

  const handleSubmit = async () => {
    if (!selectedWeapon) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/weapons/${targetWeaponId}/copy-attachment-bindings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceWeaponId: selectedWeapon.id,
            slot,
            skipConflicts,
            replaceExisting,
          }),
        }
      );
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
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("copyAttachmentsFromWeaponTitle", { slot: slotLabel })}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative shrink-0">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder={t("searchWeapons")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Class tabs */}
        <Tabs value={activeClass} onValueChange={(v) => setActiveClass(v as Class)}>
          <TabsList variant="line">
            {CLASSES.map((cls) => (
              <TabsTrigger key={cls} value={cls}>
                {cls}
              </TabsTrigger>
            ))}
          </TabsList>

          {CLASSES.map((cls) => (
            <TabsContent key={cls} value={cls} className="mt-3 space-y-4">
              {/* Weapons grouped by type */}
              <div className="custom-scrollbar max-h-[35vh] space-y-4 overflow-y-auto pr-1">
                {fetchLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    {tc("loading")}
                  </div>
                ) : (
                  <TooltipProvider>
                    {WEAPON_TYPES.map(({ type, key }) => {
                      const list = weaponsByType[type];
                      if (list.length === 0) return null;
                      return (
                        <div key={type}>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {t(key)}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {list.map((w) => {
                              const count = w.attachments.length;
                              const disabled = count === 0;
                              const isSelected = selectedId === w.id;
                              const color = w.category.color || "#6b7280";

                              const chip = (
                                <button
                                  type="button"
                                  onClick={() => !disabled && setSelectedId(w.id)}
                                  disabled={disabled}
                                  aria-pressed={isSelected}
                                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary/10"
                                      : disabled
                                      ? "cursor-not-allowed border-zinc-800 bg-zinc-900/30 opacity-40"
                                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                                  }`}
                                  style={
                                    disabled
                                      ? undefined
                                      : {
                                          borderLeftWidth: "3px",
                                          borderLeftColor: color,
                                          backgroundColor: isSelected ? undefined : `${color}10`,
                                        }
                                  }
                                >
                                  <span
                                    className={`font-medium ${
                                      disabled ? "text-zinc-500" : "text-zinc-200"
                                    }`}
                                  >
                                    {w.name}
                                  </span>
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-xs font-mono ${
                                      count > 0
                                        ? "bg-zinc-700 text-zinc-200"
                                        : "bg-zinc-800 text-zinc-600"
                                    }`}
                                  >
                                    {count}
                                  </span>
                                </button>
                              );

                              return disabled ? (
                                <Tooltip key={w.id}>
                                  <TooltipTrigger render={<span />}>{chip}</TooltipTrigger>
                                  <TooltipContent>
                                    {t("noAttachmentsInSlot", { slot: slotLabel })}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span key={w.id}>{chip}</span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {!fetchLoading &&
                      WEAPON_TYPES.every(({ type }) => weaponsByType[type].length === 0) && (
                        <p className="py-6 text-center text-sm text-zinc-500">
                          {t("noWeaponsFound")}
                        </p>
                      )}
                  </TooltipProvider>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Preview + options */}
        {selectedWeapon && (
          <div className="shrink-0 space-y-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">
                {t("copyPreviewLabel", {
                  source: selectedWeapon.name,
                  count: selectedWeapon.attachments.length,
                })}
              </div>
            </div>

            <div className="custom-scrollbar max-h-[22vh] overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {selectedWeapon.attachments.map((b) => {
                  const price = b.priceOverride ?? b.attachment.defaultPrice;
                  return (
                    <div
                      key={b.attachmentId}
                      className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                    >
                      <span className="text-zinc-200">{b.attachment.name}</span>
                      <span
                        className="font-mono"
                        style={{ color: price === 0 ? "#22c55e" : "#a1a1aa" }}
                      >
                        {price === 0 ? t("free") : `${price.toLocaleString("de-DE")} XP`}
                      </span>
                      {b.isDefault && (
                        <StarIcon className="size-3 shrink-0 text-amber-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-md border border-zinc-800 p-2 transition-colors hover:border-zinc-700 ${
                  submitting ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Checkbox
                  checked={replaceExisting}
                  onCheckedChange={(c) => setReplaceExisting(!!c)}
                  disabled={submitting}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-zinc-200">
                    {t("copyAttReplaceExisting")}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {t("copyAttReplaceExistingHint")}
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 rounded-md border border-zinc-800 p-2 transition-colors ${
                  replaceExisting || submitting
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-zinc-700"
                }`}
              >
                <Checkbox
                  checked={skipConflicts}
                  onCheckedChange={(c) => setSkipConflicts(!!c)}
                  disabled={replaceExisting || submitting}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-zinc-200">
                    {t("copySkipConflicts")}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {t("copyAttSkipConflictsHint")}
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedWeapon}>
            {submitting ? tc("loading") : t("copyButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
