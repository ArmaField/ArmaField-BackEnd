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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Server {
  id: string;
  name: string;
  ip: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface EditServerDialogProps {
  server: Server;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditServerDialog({
  server,
  open,
  onOpenChange,
  onSuccess,
}: EditServerDialogProps) {
  const t = useTranslations("servers");
  const tc = useTranslations("common");
  const [name, setName] = useState(server.name);
  const [ip, setIp] = useState(server.ip || "");
  const [sortOrder, setSortOrder] = useState(String(server.sortOrder));
  const [isActive, setIsActive] = useState(server.isActive);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("serverNameRequired"));
      return;
    }

    const parsedOrder = parseInt(sortOrder, 10);
    if (isNaN(parsedOrder) || parsedOrder < 0) {
      toast.error(t("sortOrderError"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ip: ip.trim() || null,
          sortOrder: parsedOrder,
          isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("updateServerFailed"));
        return;
      }

      toast.success(t("serverUpdated"));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("updateServerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editServerTitle")}</DialogTitle>
          <DialogDescription className="truncate">
            {t("editServerDescription", { name: server.name.length > 30 ? server.name.slice(0, 30) + "..." : server.name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-w-0">
          <div className="space-y-4 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="edit-server-name">{t("name")}</Label>
              <Input
                id="edit-server-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                disabled={loading}
                className="w-full overflow-hidden text-ellipsis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-server-ip">
                {t("ipAddress")}{" "}
                <span className="text-zinc-500 font-normal">({t("optional")})</span>
              </Label>
              <Input
                id="edit-server-ip"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-server-sort">{t("sortOrder")}</Label>
              <Input
                id="edit-server-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="edit-server-active">{tc("active")}</Label>
              <button
                id="edit-server-active"
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                disabled={loading}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    isActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? t("saving") : t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
