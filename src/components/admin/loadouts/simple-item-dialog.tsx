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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TrashIcon } from "lucide-react";

interface SimpleItem {
  id: string;
  guid: string;
  name: string;
  price: number;
  zorder?: number;
  isDefault?: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string; color: string | null } | null;
}

interface SimpleItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SimpleItem | null;
  defaultClass: string;
  /** Display label, e.g. "Gadget" or "Grenade" */
  itemLabel: string;
  /** API base path, e.g. "/api/admin/gadgets" or "/api/admin/grenades" */
  apiPath: string;
  /** itemType for PlayerUnlock, e.g. "GADGET" or "GRENADE" */
  itemType: string;
  onSuccess: () => void;
  categories?: { id: string; name: string; color: string | null }[];
}

export function SimpleItemDialog({
  open,
  onOpenChange,
  item,
  defaultClass,
  itemLabel,
  apiPath,
  itemType,
  onSuccess,
  categories,
}: SimpleItemDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");
  const isEditing = !!item;
  const [name, setName] = useState("");
  const [guid, setGuid] = useState("");
  const [price, setPrice] = useState("0");
  const [zorder, setZorder] = useState("");
  const [zorderTouched, setZorderTouched] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  // Delete sub-dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refund, setRefund] = useState(false);
  const [ownerCount, setOwnerCount] = useState<number | null>(null);

  // Fetch next zorder for this item type + class
  const fetchNextZorder = useCallback(async () => {
    try {
      const res = await fetch(apiPath);
      if (!res.ok) return;
      const all = await res.json();
      const forClass = all.filter((i: any) => i.class === defaultClass);
      const max = forClass.reduce((m: number, i: any) => Math.max(m, i.zorder ?? 0), -1);
      setZorder(String(max + 1));
    } catch {}
  }, [apiPath, defaultClass]);

  // Reset form when dialog opens or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name);
        setGuid(item.guid);
        setPrice(String(item.price));
        setZorder(String(item.zorder ?? 0));
        setZorderTouched(true);
        setCategoryId(item.categoryId ?? "");
        setIsDefault(item.isDefault ?? false);
      } else {
        setName("");
        setGuid("");
        setPrice("0");
        setZorderTouched(false);
        setCategoryId("");
        setIsDefault(false);
        fetchNextZorder();
      }
    }
  }, [open, item, fetchNextZorder]);

  // Fetch owner count when delete opens
  useEffect(() => {
    if (deleteOpen && item?.id) {
      setRefund(false);
      setOwnerCount(null);
      fetch(`${apiPath}/${item.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ownerCount !== undefined) {
            setOwnerCount(data.ownerCount);
          }
        })
        .catch(() => {
          // Ignore
        });
    }
  }, [deleteOpen, item?.id, apiPath]);

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

      setLoading(true);
      try {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          guid: guid.trim(),
          price: parseInt(price, 10) || 0,
          class: defaultClass,
          categoryId: categoryId || undefined,
          isDefault,
          ...(zorder !== "" ? { zorder: parseInt(zorder, 10) || 0 } : {}),
        };

        const url = isEditing ? `${apiPath}/${item.id}` : apiPath;
        const method = isEditing ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          const msg = data.code === "GUID_EXISTS" ? t("guidAlreadyExists") : (isEditing ? t("itemUpdateFailed", { label: itemLabel }) : t("itemCreateFailed", { label: itemLabel }));
          toast.error(msg);
          return;
        }

        toast.success(
          isEditing ? t("itemUpdated", { label: itemLabel }) : t("itemCreated", { label: itemLabel })
        );
        onOpenChange(false);
        onSuccess();
      } catch {
        toast.error(
          isEditing ? t("itemUpdateFailed", { label: itemLabel }) : t("itemCreateFailed", { label: itemLabel })
        );
      } finally {
        setLoading(false);
      }
    },
    [name, guid, price, zorder, defaultClass, isEditing, item, apiPath, itemLabel, onOpenChange, onSuccess, categoryId, isDefault]
  );

  const handleDelete = useCallback(async () => {
    if (!item) return;
    setDeleteLoading(true);
    try {
      const url = `${apiPath}/${item.id}${refund ? "?refund=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("itemDeleteFailed", { label: itemLabel }));
        return;
      }

      toast.success(
        refund
          ? t("itemDeletedRefund", { label: itemLabel, count: ownerCount ?? "all" })
          : t("itemDeleted", { label: itemLabel })
      );
      setDeleteOpen(false);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("itemDeleteFailed", { label: itemLabel }));
    } finally {
      setDeleteLoading(false);
    }
  }, [item, apiPath, refund, ownerCount, itemLabel, onOpenChange, onSuccess]);

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
            setCategoryId("");
            setIsDefault(false);
          }
          onOpenChange(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editItem", { label: itemLabel }) : t("addItem", { label: itemLabel })}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("editItemDescription", { label: itemLabel.toLowerCase() })
                : t("addItemDescription", { label: itemLabel.toLowerCase(), class: defaultClass })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Default + Sort Order */}
              <div className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2">
                <Label htmlFor="item-default" className="text-sm flex-1">{t("isDefault")}</Label>
                <Switch
                  id="item-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={loading}
                />
                <div className="w-px h-5 bg-zinc-700" />
                <Label htmlFor="item-zorder" className="text-sm text-zinc-400 shrink-0">{t("sortOrder")}</Label>
                <Input
                  id="item-zorder"
                  inputMode="numeric"
                  placeholder="0"
                  value={zorder}
                  onChange={(e) => { setZorder(e.target.value.replace(/\D/g, "")); setZorderTouched(true); }}
                  disabled={loading}
                  autoComplete="off"
                  className="h-7 w-16 text-center text-sm"
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="item-name">{t("weaponName")}</Label>
                <Input
                  id="item-name"
                  placeholder={itemType === "GADGET" ? t("itemNamePlaceholderGadget") : t("itemNamePlaceholderGrenade")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {/* GUID */}
              <div className="space-y-2">
                <Label htmlFor="item-guid">{t("guid")}</Label>
                <Input
                  id="item-guid"
                  placeholder={itemType === "GADGET" ? t("itemGuidPlaceholderGadget") : t("itemGuidPlaceholderGrenade")}
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
                <Label htmlFor="item-price">{t("priceXP")}</Label>
                <Input
                  id="item-price"
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
              {categories && categories.length > 0 && (
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
                              <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
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
                              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            )}
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>

            <DialogFooter className="mt-4">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  onClick={() => setDeleteOpen(true)}
                  disabled={loading}
                >
                  <TrashIcon data-icon="inline-start" />
                  {tc("delete")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim() || !guid.trim()}
              >
                {loading
                  ? isEditing
                    ? t("saving")
                    : t("creating")
                  : isEditing
                    ? t("saveChanges")
                    : t("createItem", { label: itemLabel })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation sub-dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteItem", { label: itemLabel })}</DialogTitle>
            <DialogDescription>
              {t("deleteItemConfirm", { name: item?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {ownerCount !== null && ownerCount > 0 && (
              <p className="text-sm text-zinc-400">
                {t("playersOwnItem", { count: ownerCount, label: itemLabel.toLowerCase() })}
              </p>
            )}

            {item && item.price > 0 && (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2">
                <Label htmlFor="refund-item-switch" className="text-sm">
                  {t("refundItemXP", { price: item.price.toLocaleString("de-DE"), label: itemLabel.toLowerCase() })}
                </Label>
                <Switch
                  id="refund-item-switch"
                  checked={refund}
                  onCheckedChange={setRefund}
                  disabled={deleteLoading}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? t("deleting") : t("deleteItem", { label: itemLabel })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
