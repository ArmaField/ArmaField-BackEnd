"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  TrashIcon,
  Loader2Icon,
  SettingsIcon,
  CopyIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteWeaponDialog } from "./delete-weapon-dialog";
import { AttachmentManagerDialog } from "./attachment-manager-dialog";
import { CopyToClassesDialog } from "./copy-to-classes-dialog";
import type {
  Weapon,
  WeaponCategory,
  Attachment,
  AttachmentSlot,
  WeaponAttachmentBinding,
} from "./types";
import { ATTACHMENT_SLOTS } from "./types";

// ─── Main weapon dialog ─────────────────────────────

interface WeaponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weapon: Weapon | null;
  defaultType: "PRIMARY" | "SECONDARY" | "SPECIAL";
  defaultClass: string;
  categories: WeaponCategory[];
  onSuccess: () => void;
}

export function WeaponDialog({
  open,
  onOpenChange,
  weapon,
  defaultType,
  defaultClass,
  categories,
  onSuccess,
}: WeaponDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");
  const isEditing = !!weapon;
  const [name, setName] = useState("");
  const [guid, setGuid] = useState("");
  const [price, setPrice] = useState("0");
  const [type, setType] = useState<"PRIMARY" | "SECONDARY" | "SPECIAL">(defaultType);
  const [categoryId, setCategoryId] = useState("");
  const [zorder, setZorder] = useState("");
  const [zorderTouched, setZorderTouched] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  // Attachment state (only when editing)
  const [bindings, setBindings] = useState<WeaponAttachmentBinding[]>([]);
  const [allAttachments, setAllAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentSlotOpen, setAttachmentSlotOpen] = useState<AttachmentSlot | null>(null);

  // Slot label helper
  const getSlotLabel = useCallback(
    (slot: AttachmentSlot) => {
      const map: Record<AttachmentSlot, string> = {
        OPTIC: "slotOptic",
        UNDER_BARREL: "slotUnderBarrel",
        HAND_GUARD: "slotHandGuard",
        MUZZLE: "slotMuzzle",
        STOCK: "slotStock",
        MAGAZINE: "slotMagazine",
        TACTICAL_BLOCK: "slotTacticalBlock",
        FOREGRIP: "slotForegrip",
      };
      return t(map[slot]);
    },
    [t]
  );

  // Fetch next zorder for a given weapon type + class
  const fetchNextZorder = useCallback(async (wType: string, wClass: string) => {
    try {
      const res = await fetch("/api/admin/weapons");
      if (!res.ok) return;
      const all = await res.json();
      const max = all
        .filter((w: any) => w.type === wType && w.class === wClass)
        .reduce((m: number, w: any) => Math.max(m, w.zorder ?? 0), -1);
      setZorder(String(max + 1));
    } catch {}
  }, []);

  // Reset form when dialog opens or weapon changes
  useEffect(() => {
    if (open) {
      if (weapon) {
        setName(weapon.name);
        setGuid(weapon.guid);
        setPrice(String(weapon.price));
        setZorder(String(weapon.zorder ?? 0));
        setZorderTouched(true);
        setType(weapon.type);
        setCategoryId(weapon.categoryId);
        setIsDefault(weapon.isDefault);
      } else {
        setName("");
        setGuid("");
        setPrice("0");
        setZorderTouched(false);
        setType(defaultType);
        setCategoryId(categories[0]?.id ?? "");
        setIsDefault(false);
        fetchNextZorder(defaultType, defaultClass);
      }
    }
  }, [open, weapon, defaultType, defaultClass, categories, fetchNextZorder]);

  // Fetch attachments when editing
  const fetchAttachments = useCallback(async () => {
    if (!weapon) return;
    setAttachmentsLoading(true);
    try {
      const [bindingsRes, libraryRes] = await Promise.all([
        fetch(`/api/admin/weapons/${weapon.id}/attachments`),
        fetch("/api/admin/attachments"),
      ]);
      if (bindingsRes.ok) {
        setBindings(await bindingsRes.json());
      }
      if (libraryRes.ok) {
        setAllAttachments(await libraryRes.json());
      }
    } catch {
      // silently fail
    } finally {
      setAttachmentsLoading(false);
    }
  }, [weapon]);

  useEffect(() => {
    if (open && isEditing) {
      fetchAttachments();
    } else {
      setBindings([]);
      setAllAttachments([]);
    }
  }, [open, isEditing, fetchAttachments]);

  // Count bound attachments per slot
  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const slot of ATTACHMENT_SLOTS) {
      counts[slot] = bindings.filter((b) => b.attachment.slot === slot).length;
    }
    return counts;
  }, [bindings]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        toast.error(t("nameRequired"));
        return;
      }
      if (!guid.trim()) {
        toast.error(t("guidRequired"));
        return;
      }
      if (!categoryId) {
        toast.error(t("categoryRequired"));
        return;
      }

      setLoading(true);
      try {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          guid: guid.trim(),
          price: parseInt(price, 10) || 0,
          type,
          class: defaultClass,
          categoryId,
          isDefault,
          ...(zorder !== "" ? { zorder: parseInt(zorder, 10) || 0 } : {}),
        };

        const url = isEditing
          ? `/api/admin/weapons/${weapon.id}`
          : "/api/admin/weapons";
        const method = isEditing ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          const msg = data.code === "GUID_EXISTS" ? t("guidAlreadyExists") : (isEditing ? t("weaponUpdateFailed") : t("weaponCreateFailed"));
          toast.error(msg);
          return;
        }

        toast.success(isEditing ? t("weaponUpdated") : t("weaponCreated"));
        onOpenChange(false);
        onSuccess();
      } catch {
        toast.error(isEditing ? t("weaponUpdateFailed") : t("weaponCreateFailed"));
      } finally {
        setLoading(false);
      }
    },
    [name, guid, price, zorder, type, categoryId, defaultClass, isDefault, isEditing, weapon, onOpenChange, onSuccess, t]
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setName("");
            setGuid("");
            setPrice("0");
            setZorder("");
            setZorderTouched(false);
            setIsDefault(false);
          }
          onOpenChange(o);
        }}
      >
        <DialogContent className={isEditing ? "sm:max-w-lg max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>{isEditing ? t("editWeapon") : t("addWeapon")}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("editWeaponDescription")
                : t("addWeaponDescription", { type: type === "PRIMARY" ? t("primary") : type === "SECONDARY" ? t("secondary") : t("special"), class: defaultClass })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Default + Sort Order */}
              <div className="flex flex-col gap-3 rounded-md border border-zinc-800 px-3 py-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <Label htmlFor="weapon-default" className="text-sm flex-1">{t("isDefault")}</Label>
                  <Switch
                    id="weapon-default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                    disabled={loading}
                  />
                </div>
                <div className="hidden w-px h-5 bg-zinc-700 sm:block" />
                <div className="flex items-center justify-between gap-3 sm:justify-start">
                  <Label htmlFor="weapon-zorder" className="text-sm text-zinc-400 shrink-0">{t("sortOrder")}</Label>
                  <Input
                    id="weapon-zorder"
                    inputMode="numeric"
                    placeholder="0"
                    value={zorder}
                    onChange={(e) => { setZorder(e.target.value.replace(/\D/g, "")); setZorderTouched(true); }}
                    disabled={loading}
                    autoComplete="off"
                    className="h-7 w-16 text-center text-sm"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="weapon-name">{t("weaponName")}</Label>
                <Input
                  id="weapon-name"
                  placeholder={t("weaponNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {/* GUID */}
              <div className="space-y-2">
                <Label htmlFor="weapon-guid">{t("guid")}</Label>
                <Input
                  id="weapon-guid"
                  placeholder={t("guidPlaceholder")}
                  value={guid}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const match = raw.match(/^\{?([0-9a-fA-F]{16})\}?/);
                    setGuid(match ? match[1] : raw);
                  }}
                  disabled={loading}
                  autoComplete="off"
                  className="font-mono text-xs"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="weapon-price">{t("priceXP")}</Label>
                <Input
                  id="weapon-price"
                  inputMode="numeric"
                  placeholder="0"
                  value={price ? Number(price).toLocaleString("de-DE") : ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPrice(digits);
                  }}
                  disabled={loading}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{t("category")}</Label>
                <Select
                  value={categoryId}
                  onValueChange={(val) => setCategoryId(val as string)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    {(() => {
                      const selected = categories.find((c) => c.id === categoryId);
                      return selected ? (
                        <span className="flex items-center gap-2">
                          {selected.color && (
                            <span
                              className="inline-block size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: selected.color }}
                            />
                          )}
                          {selected.name}
                        </span>
                      ) : (
                        <SelectValue placeholder={t("selectCategory")} />
                      );
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          {cat.color && (
                            <span
                              className="inline-block size-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>{t("type")}</Label>
                <Select
                  value={type}
                  onValueChange={(val) => {
                    const newType = val as "PRIMARY" | "SECONDARY" | "SPECIAL";
                    setType(newType);
                    if (!zorderTouched) fetchNextZorder(newType, defaultClass);
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    {type === "PRIMARY" ? t("primary") : type === "SECONDARY" ? t("secondary") : t("special")}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY">{t("primary")}</SelectItem>
                    <SelectItem value="SECONDARY">{t("secondary")}</SelectItem>
                    <SelectItem value="SPECIAL">{t("special")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Attachments section (only in edit mode) */}
              {isEditing && weapon && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold">{t("attachments")}</Label>
                      {attachmentsLoading && (
                        <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ATTACHMENT_SLOTS.map((slot) => {
                        const count = slotCounts[slot] || 0;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setAttachmentSlotOpen(slot)}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 px-3 py-2 text-left text-sm transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
                          >
                            <span className="text-zinc-300">{getSlotLabel(slot)}</span>
                            {count > 0 ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                                {count}
                              </Badge>
                            ) : (
                              <span className="text-xs text-zinc-600">-</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="mt-4 flex-row flex-wrap justify-end">
              {isEditing && (
                <div className="mr-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    disabled={loading}
                  >
                    <TrashIcon data-icon="inline-start" />
                    {tc("delete")}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t("copyToClasses")}
                            onClick={() => setCopyOpen(true)}
                            disabled={loading}
                          />
                        }
                      >
                        <CopyIcon />
                      </TooltipTrigger>
                      <TooltipContent>{t("copyToClasses")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={loading || !name.trim() || !guid.trim() || !categoryId}>
                {loading
                  ? isEditing
                    ? t("saving")
                    : t("creating")
                  : isEditing
                    ? t("saveChanges")
                    : t("createWeapon")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attachment manager dialog */}
      {isEditing && weapon && attachmentSlotOpen && (
        <AttachmentManagerDialog
          open={!!attachmentSlotOpen}
          onOpenChange={(o) => { if (!o) setAttachmentSlotOpen(null); }}
          slot={attachmentSlotOpen}
          slotLabel={getSlotLabel(attachmentSlotOpen)}
          weaponId={weapon.id}
          weaponClass={weapon.class}
          bindings={bindings}
          allAttachments={allAttachments}
          onRefresh={fetchAttachments}
        />
      )}

      {/* Delete weapon sub-dialog */}
      {isEditing && weapon && (
        <DeleteWeaponDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          weapon={weapon}
          onSuccess={() => {
            setDeleteOpen(false);
            onOpenChange(false);
            onSuccess();
          }}
        />
      )}

      {/* Copy to classes sub-dialog */}
      {isEditing && weapon && (
        <CopyToClassesDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          title={t("copyWeaponToClassesTitle", { name: weapon.name })}
          sourceClass={weapon.class}
          apiPath={`/api/admin/weapons/${weapon.id}/copy-to-classes`}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
