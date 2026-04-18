"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  PlusIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import type { Attachment, AttachmentSlot, WeaponAttachmentBinding } from "./types";

interface AttachmentManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: AttachmentSlot;
  slotLabel: string;
  weaponId: string;
  bindings: WeaponAttachmentBinding[];
  allAttachments: Attachment[];
  onRefresh: () => void;
}

type Mode = { type: "empty" } | { type: "edit"; attachment: Attachment; isBound: boolean } | { type: "create" };

export function AttachmentManagerDialog({
  open,
  onOpenChange,
  slot,
  slotLabel,
  weaponId,
  bindings,
  allAttachments,
  onRefresh,
}: AttachmentManagerDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>({ type: "empty" });
  const [loading, setLoading] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formGuid, setFormGuid] = useState("");
  const [formPrice, setFormPrice] = useState("0");
  const [formOverride, setFormOverride] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState<Attachment | null>(null);
  const [confirmUnbind, setConfirmUnbind] = useState<Attachment | null>(null);
  const [refundOnAction, setRefundOnAction] = useState(false);

  const slotAttachments = useMemo(
    () => allAttachments.filter((a) => a.slot === slot),
    [allAttachments, slot]
  );

  const boundIds = useMemo(
    () => new Set(bindings.filter((b) => b.attachment.slot === slot).map((b) => b.attachmentId)),
    [bindings, slot]
  );

  const filteredAttachments = useMemo(() => {
    const q = search.toLowerCase();
    return slotAttachments.filter(
      (a) => !q || a.name.toLowerCase().includes(q) || a.guid.toLowerCase().includes(q)
    );
  }, [slotAttachments, search]);

  const getBinding = useCallback(
    (attachmentId: string) => bindings.find((b) => b.attachmentId === attachmentId),
    [bindings]
  );

  const selectAttachment = (att: Attachment) => {
    const binding = getBinding(att.id);
    setFormName(att.name);
    setFormGuid(att.guid);
    setFormPrice(String(att.defaultPrice));
    setFormOverride(binding?.priceOverride != null ? String(binding.priceOverride) : "");
    setFormIsDefault(binding?.isDefault ?? false);
    setMode({ type: "edit", attachment: att, isBound: boundIds.has(att.id) });
  };

  const startCreate = () => {
    setFormName("");
    setFormGuid("");
    setFormPrice("0");
    setFormOverride("");
    setFormIsDefault(false);
    setMode({ type: "create" });
  };

  const handleGuidInput = (value: string) => {
    const raw = value.trim();
    const match = raw.match(/^\{?([0-9a-fA-F]{16})\}?/);
    setFormGuid(match ? match[1] : raw);
  };

  // Bind attachment to weapon
  const handleBind = useCallback(
    async (attachmentId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/weapons/${weaponId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachmentId }),
        });
        if (!res.ok) {
          toast.error(t("attachmentBindFailed"));
          return;
        }
        toast.success(t("attachmentAdded"));
        onRefresh();
      } catch {
        toast.error(t("attachmentBindFailed"));
      } finally {
        setLoading(false);
      }
    },
    [weaponId, onRefresh, t]
  );

  // Unbind attachment from weapon
  const handleUnbind = useCallback(
    async () => {
      if (!confirmUnbind) return;
      setLoading(true);
      try {
        const url = `/api/admin/weapons/${weaponId}/attachments/${confirmUnbind.id}${refundOnAction ? "?refund=true" : ""}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          toast.error(t("attachmentUnbindFailed"));
          return;
        }
        toast.success(t("attachmentRemoved"));
        setConfirmUnbind(null);
        setRefundOnAction(false);
        setMode({ type: "empty" });
        onRefresh();
      } catch {
        toast.error(t("attachmentUnbindFailed"));
      } finally {
        setLoading(false);
      }
    },
    [confirmUnbind, refundOnAction, weaponId, onRefresh, t]
  );

  // Save attachment (update existing)
  const handleSave = useCallback(async () => {
    if (mode.type !== "edit") return;
    if (!formName.trim() || !formGuid.trim()) {
      toast.error(t("nameAndGuidRequired"));
      return;
    }

    setLoading(true);
    try {
      // Update attachment in library
      const res = await fetch(`/api/admin/attachments/${mode.attachment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          guid: formGuid.trim(),
          defaultPrice: parseInt(formPrice, 10) || 0,
        }),
      });
      if (!res.ok) {
        toast.error(t("attachmentSaveFailed"));
        return;
      }

      // Update price override if bound
      if (mode.isBound) {
        const overrideVal = formOverride.trim() === "" ? null : parseInt(formOverride, 10);
        await fetch(
          `/api/admin/weapons/${weaponId}/attachments/${mode.attachment.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceOverride: isNaN(overrideVal as number) ? null : overrideVal, isDefault: formIsDefault }),
          }
        );
      }

      toast.success(t("attachmentSaved"));
      onRefresh();
    } catch {
      toast.error(t("attachmentSaveFailed"));
    } finally {
      setLoading(false);
    }
  }, [mode, formName, formGuid, formPrice, formOverride, formIsDefault, weaponId, onRefresh, t]);

  // Create new attachment and bind
  const handleCreate = useCallback(async () => {
    if (!formName.trim() || !formGuid.trim()) {
      toast.error(t("nameAndGuidRequired"));
      return;
    }

    setLoading(true);
    try {
      const createRes = await fetch("/api/admin/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          guid: formGuid.trim(),
          defaultPrice: parseInt(formPrice, 10) || 0,
          slot,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json();
        toast.error(data.error || t("attachmentCreateFailed"));
        return;
      }
      const created = await createRes.json();

      const bindRes = await fetch(`/api/admin/weapons/${weaponId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId: created.id }),
      });
      if (!bindRes.ok) {
        toast.error(t("attachmentCreatedBindFailed"));
        onRefresh();
        return;
      }

      toast.success(t("attachmentCreated"));
      setMode({ type: "empty" });
      onRefresh();
    } catch {
      toast.error(t("attachmentCreateFailed"));
    } finally {
      setLoading(false);
    }
  }, [formName, formGuid, formPrice, slot, weaponId, onRefresh, t]);

  // Delete from library
  const handleDeleteFromLibrary = useCallback(async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const url = `/api/admin/attachments/${confirmDelete.id}${refundOnAction ? "?refund=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t("attachmentDeleteFailed"));
        return;
      }
      toast.success(t("attachmentDeletedFromLibrary"));
      setConfirmDelete(null);
      setRefundOnAction(false);
      setMode({ type: "empty" });
      onRefresh();
    } catch {
      toast.error(t("attachmentDeleteFailed"));
    } finally {
      setLoading(false);
    }
  }, [confirmDelete, refundOnAction, onRefresh, t]);

  const formatPrice = (val: string) => {
    const n = Number(val);
    return n ? n.toLocaleString("de-DE") : "";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setMode({ type: "empty" }); setSearch(""); } onOpenChange(o); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("attachmentManager", { slot: slotLabel })}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 gap-4 min-h-0">
            {/* Left panel - Library */}
            <div className="flex w-1/2 flex-col gap-2 min-h-0">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <Input
                  placeholder={t("searchAttachments")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  autoComplete="off"
                />
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[300px] pr-1">
                {filteredAttachments.length === 0 && (
                  <p className="py-4 text-center text-xs text-zinc-500">
                    {t("noAttachmentsInLibrary")}
                  </p>
                )}
                {filteredAttachments.map((att) => {
                  const isBound = boundIds.has(att.id);
                  const isSelected = mode.type === "edit" && mode.attachment.id === att.id;
                  return (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => selectAttachment(att)}
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-zinc-600 bg-zinc-800"
                          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                      }`}
                    >
                      {isBound && (() => {
                        const b = getBinding(att.id);
                        return b?.isDefault
                          ? <StarIcon className="size-3 text-amber-400 shrink-0" />
                          : <span className="size-2 rounded-full bg-emerald-500 shrink-0" />;
                      })()}
                      <span className="flex-1 truncate font-medium">{att.name}</span>
                      <span className="text-xs text-zinc-500 font-mono shrink-0">
                        {att.defaultPrice === 0 ? t("free") : `${att.defaultPrice} XP`}
                      </span>
                      {!isBound && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBind(att.id);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleBind(att.id); } }}
                          className="inline-flex size-6 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors shrink-0"
                        >
                          <PlusIcon className="size-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full shrink-0"
                onClick={startCreate}
                disabled={loading}
              >
                <PlusIcon data-icon="inline-start" />
                {t("createAttachment")}
              </Button>
            </div>

            {/* Right panel - Edit / Create */}
            <div className="w-1/2 flex flex-col">
              {mode.type === "empty" ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-zinc-500 text-center px-4">
                    {t("selectOrCreate")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">
                    {mode.type === "create" ? t("createAttachment") : t("editAttachment")}
                  </h3>

                  <div className="space-y-2">
                    <Label>{t("weaponName")}</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="ACOG"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("guid")}</Label>
                    <Input
                      value={formGuid}
                      onChange={(e) => handleGuidInput(e.target.value)}
                      placeholder={t("guidPlaceholder")}
                      disabled={loading}
                      autoComplete="off"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("defaultPriceLabel")}</Label>
                    <Input
                      inputMode="numeric"
                      value={formatPrice(formPrice)}
                      onChange={(e) => setFormPrice(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                      disabled={loading}
                    />
                  </div>

                  {mode.type === "edit" && mode.isBound && (
                    <div className="space-y-2">
                      <Label>{t("priceOverride")}</Label>
                      <Input
                        inputMode="numeric"
                        value={formOverride ? formatPrice(formOverride) : ""}
                        onChange={(e) => setFormOverride(e.target.value.replace(/\D/g, ""))}
                        placeholder={t("priceOverrideHint")}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {mode.type === "edit" && mode.isBound && (
                    <div className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2">
                      <Label htmlFor="att-default" className="text-sm">{t("isDefault")}</Label>
                      <Switch
                        id="att-default"
                        checked={formIsDefault}
                        onCheckedChange={setFormIsDefault}
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {mode.type === "create" ? (
                      <Button
                        onClick={handleCreate}
                        disabled={loading || !formName.trim() || !formGuid.trim()}
                        className="flex-1"
                      >
                        {loading ? (
                          <><Loader2Icon className="size-3.5 animate-spin" /> {t("creating")}</>
                        ) : (
                          t("createAndAdd")
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSave}
                        disabled={loading || !formName.trim() || !formGuid.trim()}
                        className="flex-1"
                      >
                        {loading ? (
                          <><Loader2Icon className="size-3.5 animate-spin" /> {t("saving")}</>
                        ) : (
                          t("saveChanges")
                        )}
                      </Button>
                    )}
                  </div>

                  {mode.type === "edit" && (
                    <div className="space-y-2 border-t border-zinc-800 pt-3">
                      {mode.isBound && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => { setConfirmUnbind(mode.attachment); setRefundOnAction(false); }}
                          disabled={loading}
                        >
                          <XIcon data-icon="inline-start" />
                          {t("unbindAttachment")}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => { setConfirmDelete(mode.attachment); setRefundOnAction(false); }}
                        disabled={loading}
                      >
                        <TrashIcon data-icon="inline-start" />
                        {t("deleteFromLibrary")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unbind confirmation */}
      <Dialog open={!!confirmUnbind} onOpenChange={(o) => { if (!o) { setConfirmUnbind(null); setRefundOnAction(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unbindAttachment")}</DialogTitle>
            <DialogDescription>
              {t("unbindConfirm", { name: confirmUnbind?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {confirmUnbind && confirmUnbind.defaultPrice > 0 && (
            <div className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2">
              <Label htmlFor="refund-unbind" className="text-sm">
                {t("refundAttachmentUnbind", { price: confirmUnbind.defaultPrice.toLocaleString("de-DE") })}
              </Label>
              <Switch
                id="refund-unbind"
                checked={refundOnAction}
                onCheckedChange={setRefundOnAction}
                disabled={loading}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmUnbind(null); setRefundOnAction(false); }} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleUnbind} disabled={loading}>
              {loading ? t("deleting") : t("unbindAttachment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete from library confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) { setConfirmDelete(null); setRefundOnAction(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteFromLibrary")}</DialogTitle>
            <DialogDescription>
              {t("deleteAttachmentConfirm", { name: confirmDelete?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && confirmDelete.defaultPrice > 0 && (
            <div className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2">
              <Label htmlFor="refund-delete" className="text-sm">
                {t("refundAttachmentDelete")}
              </Label>
              <Switch
                id="refund-delete"
                checked={refundOnAction}
                onCheckedChange={setRefundOnAction}
                disabled={loading}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDelete(null); setRefundOnAction(false); }} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteFromLibrary} disabled={loading}>
              {loading ? t("deleting") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
