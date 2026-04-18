"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatTime12(hour: string, min: string): string {
  const h = Number(hour);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${min.padStart(2, "0")} ${period}`;
}

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_RU = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

function cronToHuman(cron: string, t: (key: string, values?: Record<string, string>) => string, locale: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;

  const time = formatTime12(hour, min);
  const days = locale === "ru" ? DAYS_RU : DAYS_EN;

  if (dom === "*" && mon === "*" && dow === "*") return t("dailyAt", { time });
  if (dom === "*" && mon === "*" && dow !== "*") {
    const day = days[Number(dow)] ?? dow;
    return t("everyDayAt", { day, time });
  }
  if (dom !== "*" && mon === "*") return t("monthlyAt", { day: dom, time });

  return cron;
}

interface Settings {
  testMode: boolean;
  database: string;
  databaseType: "local" | "external" | "unknown";
  appVersion: string;
  backupSchedule: string;
  logLevel: string;
  domain: string;
}

interface SettingCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function SettingCard({ title, children, className }: SettingCardProps) {
  return (
    <Card className={`bg-zinc-900/50 border-zinc-800 ${className ?? ""}`}>
      <CardHeader>
        <CardTitle className="text-sm text-zinc-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function SettingsPageClient() {
  const t = useTranslations("system");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        toast.error(t("loadFailed"));
      }
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const runSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/settings/seed", { method: "POST" });
      if (res.ok) {
        toast.success(t("seedSuccess"));
      } else {
        toast.error(t("seedFailed"));
      }
    } catch {
      toast.error(t("seedFailed"));
    } finally {
      setSeeding(false);
    }
  };

  const runReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/settings/reset", { method: "POST" });
      if (res.ok) {
        toast.success(t("resetSuccess"));
        setConfirmReset(false);
      } else {
        toast.error(t("resetFailed"));
      }
    } catch {
      toast.error(t("resetFailed"));
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          {t("loading")}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          {t("loadFailed")}
        </div>
      </div>
    );
  }

  const dbTypeLabel =
    settings.databaseType === "local" ? t("dbLocal") :
    settings.databaseType === "external" ? t("dbExternal") :
    t("dbUnknown");

  return (
    <>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SettingCard title={t("testMode")}>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block size-2.5 rounded-full ${
                  settings.testMode ? "bg-yellow-400" : "bg-emerald-400"
                }`}
              />
              <span className="text-sm font-medium text-zinc-200">
                {settings.testMode ? t("active") : t("inactive")}
              </span>
            </div>
          </SettingCard>

          <SettingCard title={t("database")}>
            <Badge
              className={
                settings.database === "connected"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                  : "bg-red-500/15 text-red-400 border-red-500/25"
              }
            >
              {settings.database === "connected" ? t("connected") : t("disconnected")}
            </Badge>
          </SettingCard>

          <SettingCard title={t("databaseType")}>
            <Badge
              className={
                settings.databaseType === "local"
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                  : settings.databaseType === "external"
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/25"
                  : "bg-zinc-500/15 text-zinc-300 border-zinc-500/25"
              }
            >
              {dbTypeLabel}
            </Badge>
          </SettingCard>

          <SettingCard title={t("appVersion")}>
            <code className="font-mono text-sm text-zinc-200">
              v{settings.appVersion}
            </code>
          </SettingCard>

          <SettingCard title={t("backupSchedule")}>
            <p className="text-sm text-zinc-200">{cronToHuman(settings.backupSchedule, t, locale)}</p>
            <p className="mt-1 font-mono text-xs text-zinc-500">{settings.backupSchedule} (cron)</p>
          </SettingCard>

          <SettingCard title={t("logLevel")}>
            <Badge className="bg-zinc-500/15 text-zinc-300 border-zinc-500/25 uppercase">
              {settings.logLevel}
            </Badge>
          </SettingCard>

          <SettingCard title={t("domain")}>
            <code className="font-mono text-sm text-zinc-200">
              {settings.domain}
            </code>
          </SettingCard>

          <SettingCard title={t("apiDocs")}>
            <Link
              href="/api-docs.html"
              target="_blank"
              className="text-sm text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-300"
            >
              Swagger UI
            </Link>
            <p className="mt-1 text-xs text-zinc-500">/api-docs.html</p>
          </SettingCard>

          <SettingCard title={t("dbActions")} className="sm:col-span-2 lg:col-span-3">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">{t("runSeed")}</p>
                  <p className="text-xs text-zinc-500">{t("seedDescription")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runSeed}
                  disabled={seeding || settings.testMode}
                >
                  {seeding ? t("loading") : t("runSeed")}
                </Button>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <p className="text-sm text-red-400">{t("resetDatabase")}</p>
                  <p className="text-xs text-zinc-500">{t("resetDescription")}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmReset(true)}
                  disabled={resetting || settings.testMode}
                >
                  {t("resetDatabase")}
                </Button>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>

      <Dialog open={confirmReset} onOpenChange={(o) => { if (!o) setConfirmReset(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("resetConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)} disabled={resetting}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={runReset} disabled={resetting}>
              {resetting ? t("loading") : t("resetConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
