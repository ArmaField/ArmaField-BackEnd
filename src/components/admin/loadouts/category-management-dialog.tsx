"use client";

import { useState, useCallback } from "react";
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
import { PlusIcon, CheckIcon, XIcon, PencilIcon, TrashIcon } from "lucide-react";
import { ColorPickerPopover } from "@/components/admin/color-picker-popover";

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string; color: string | null }[];
  onSuccess: () => void;
  apiPath?: string;
  title?: string;
  description?: string;
}

interface EditingState {
  id: string | null; // null = new
  name: string;
  color: string;
}

export function CategoryManagementDialog({
  open,
  onOpenChange,
  categories,
  onSuccess,
  apiPath,
  title,
  description,
}: CategoryManagementDialogProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; name: string; color: string | null } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const basePath = apiPath ?? "/api/admin/weapon-categories";
  const dialogTitle = title ?? t("manageCategoriesTitle");
  const dialogDescription = description ?? t("manageCategoriesDescription");

  const startNew = () => {
    setEditing({ id: null, name: "", color: "#6b7280" });
  };

  const startEdit = (cat: { id: string; name: string; color: string | null }) => {
    setEditing({
      id: cat.id,
      name: cat.name,
      color: cat.color ?? "#6b7280",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveCategory = useCallback(async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error(t("categoryNameRequired"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: editing.name.trim(),
        color: editing.color.trim() || null,
      };

      const isNew = editing.id === null;
      const url = isNew
        ? basePath
        : `${basePath}/${editing.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || (isNew ? t("categoryCreateFailed") : t("categoryUpdateFailed")));
        return;
      }

      toast.success(isNew ? t("categoryCreated") : t("categoryUpdated"));
      setEditing(null);
      onSuccess();
    } catch {
      toast.error(t("categorySaveFailed"));
    } finally {
      setLoading(false);
    }
  }, [editing, onSuccess, t, basePath]);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${basePath}/${deleting.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("categoryDeleteFailed"));
        return;
      }

      toast.success(t("categoryDeleted"));
      setDeleting(null);
      onSuccess();
    } catch {
      toast.error(t("categoryDeleteFailed"));
    } finally {
      setDeleteLoading(false);
    }
  }, [deleting, onSuccess, t, basePath]);

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) setEditing(null); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar space-y-2 max-h-80 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div key={cat.id}>
              {editing?.id === cat.id ? (
                <CategoryEditRow
                  editing={editing}
                  setEditing={setEditing}
                  onSave={saveCategory}
                  onCancel={cancelEdit}
                  loading={loading}
                />
              ) : (
                <div className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2">
                  <span
                    className="size-4 rounded-full shrink-0"
                    style={{
                      backgroundColor: cat.color || "#6b7280",
                    }}
                  />
                  <span className="flex-1 text-sm text-zinc-200">{cat.name}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(cat)}
                    disabled={editing !== null}
                  >
                    <PencilIcon className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDeleting(cat)}
                    disabled={editing !== null}
                    className="text-zinc-500 hover:text-destructive"
                  >
                    <TrashIcon className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* New category row */}
          {editing?.id === null ? (
            <CategoryEditRow
              editing={editing}
              setEditing={setEditing}
              onSave={saveCategory}
              onCancel={cancelEdit}
              loading={loading}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={startNew}
              disabled={editing !== null}
            >
              <PlusIcon data-icon="inline-start" />
              {t("addCategory")}
            </Button>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>

    {/* Delete confirmation */}
    <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tc("delete")}</DialogTitle>
          <DialogDescription>
            {t("categoryDeleteConfirm", { name: deleting?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteLoading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? t("deleting") : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function CategoryEditRow({
  editing,
  setEditing,
  onSave,
  onCancel,
  loading,
}: {
  editing: EditingState;
  setEditing: (s: EditingState) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const t = useTranslations("loadouts");
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2">
      <ColorPickerPopover
        color={editing.color || "#6b7280"}
        onChange={(color) => setEditing({ ...editing, color })}
      />
      <Input
        placeholder={t("categoryName")}
        value={editing.name}
        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
        className="h-9 flex-1 text-sm"
        disabled={loading}
        autoFocus
      />
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onSave}
        disabled={loading || !editing.name.trim()}
      >
        <CheckIcon className="size-4 text-emerald-400" />
      </Button>
      <Button variant="outline" size="icon-sm" onClick={onCancel} disabled={loading}>
        <XIcon className="size-4 text-zinc-400" />
      </Button>
    </div>
  );
}
