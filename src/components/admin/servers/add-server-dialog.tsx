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

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddServerDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddServerDialogProps) {
  const t = useTranslations("servers");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("serverNameRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), ip: ip.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("createServerFailed"));
        return;
      }

      toast.success(t("serverCreated"));
      setName("");
      setIp("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("createServerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setName("");
          setIp("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addServerTitle")}</DialogTitle>
          <DialogDescription>
            {t("addServerDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-server-name">{t("name")}</Label>
              <Input
                id="add-server-name"
                placeholder={t("serverNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-server-ip">
                {t("ipAddress")}{" "}
                <span className="text-zinc-500 font-normal">({t("optional")})</span>
              </Label>
              <Input
                id="add-server-ip"
                placeholder={t("ipPlaceholder")}
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                disabled={loading}
              />
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
              {loading ? t("creating") : t("createServer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
