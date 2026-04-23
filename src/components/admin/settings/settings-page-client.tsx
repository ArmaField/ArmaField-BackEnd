"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
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

function cronToHuman(
  cron: string,
  t: (key: string, values?: Record<string, string>) => string,
  locale: string
): string {
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

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
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

interface LiveSnapshot {
  /** Server uptime in seconds at the moment of fetch */
  uptimeSeconds: number;
  /** Client-side timestamp (ms) of when this snapshot was received */
  fetchedAt: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

const MEMORY_POLL_INTERVAL_MS = 60_000;
const UPTIME_TICK_INTERVAL_MS = 1_000;

// ─── Presentational bits ───────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h2>
  );
}

interface StatCardProps {
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}

function StatCard({ label, children, sub }: StatCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="flex min-w-0 flex-1 items-center">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100">{children}</div>
          {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function SettingsPageClient() {
  const t = useTranslations("system");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  // Local tick - bumped every second, drives the uptime counter re-render without extra fetches
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        setSettings(await res.json());
      } else {
        toast.error(t("loadFailed"));
      }
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/live");
      if (!res.ok) return;
      const data = await res.json();
      setLive({
        uptimeSeconds: data.uptimeSeconds,
        memory: data.memory,
        fetchedAt: Date.now(),
      });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Live stats strategy:
  //   - Initial fetch on mount (gives us uptime baseline + current memory)
  //   - Local 1s tick re-renders the uptime counter without any network traffic
  //   - Memory refreshes once a minute
  //   - Visibility return → single fetch to correct any drift after tab sleep
  const memoryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchLive();

    tickTimerRef.current = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, UPTIME_TICK_INTERVAL_MS);

    const startMemoryPoll = () => {
      if (memoryTimerRef.current) return;
      memoryTimerRef.current = setInterval(fetchLive, MEMORY_POLL_INTERVAL_MS);
    };
    const stopMemoryPoll = () => {
      if (memoryTimerRef.current) {
        clearInterval(memoryTimerRef.current);
        memoryTimerRef.current = null;
      }
    };
    startMemoryPoll();

    const onVis = () => {
      if (document.hidden) {
        stopMemoryPoll();
      } else {
        fetchLive();
        startMemoryPoll();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      stopMemoryPoll();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchLive]);

  const runSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/settings/seed", { method: "POST" });
      if (res.ok) {
        toast.success(t("seedSuccess"));
        setConfirmSeed(false);
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

  const dbConnected = settings.database === "connected";
  const dbTypeLabel =
    settings.databaseType === "local"
      ? t("dbLocal")
      : settings.databaseType === "external"
      ? t("dbExternal")
      : t("dbUnknown");

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>

        {/* ─── Section: Status ─── */}
        <section>
          <SectionHeading>{t("statusSection")}</SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label={t("testMode")}>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block size-2.5 rounded-full ${
                    settings.testMode ? "bg-yellow-400" : "bg-emerald-400"
                  }`}
                />
                <span>{settings.testMode ? t("active") : t("inactive")}</span>
              </div>
            </StatCard>

            <StatCard label={t("database")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block size-2.5 rounded-full ${
                      dbConnected ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span>{dbConnected ? t("connected") : t("disconnected")}</span>
                </span>
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
              </div>
            </StatCard>

            <StatCard label={t("logLevel")}>
              <Badge className="bg-zinc-500/15 text-zinc-200 border-zinc-500/25 uppercase">
                {settings.logLevel}
              </Badge>
            </StatCard>

            <StatCard label={t("appVersion")}>
              <code className="font-mono text-sm">v{settings.appVersion}</code>
            </StatCard>

            <StatCard
              label={t("uptime")}
              sub={
                live
                  ? new Date(live.fetchedAt - live.uptimeSeconds * 1000).toLocaleString(locale)
                  : undefined
              }
            >
              {live ? (
                <span className="font-mono">
                  {formatUptime(
                    live.uptimeSeconds + Math.floor((Date.now() - live.fetchedAt) / 1000)
                  )}
                </span>
              ) : (
                <span className="text-zinc-500">-</span>
              )}
            </StatCard>

            <StatCard
              label={t("memoryUsage")}
              sub={
                live
                  ? t("memoryHeap", {
                      used: formatBytes(live.memory.heapUsed),
                      total: formatBytes(live.memory.heapTotal),
                    })
                  : undefined
              }
            >
              {live ? (
                <span className="font-mono">{formatBytes(live.memory.rss)}</span>
              ) : (
                <span className="text-zinc-500">-</span>
              )}
            </StatCard>
          </div>
        </section>

        {/* ─── Section: Configuration ─── */}
        <section>
          <SectionHeading>{t("configSection")}</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={t("domain")}>
              <code className="font-mono text-sm">{settings.domain}</code>
            </StatCard>

            <StatCard
              label={t("backupSchedule")}
              sub={
                settings.databaseType === "external" ? (
                  t("backupDisabledHint")
                ) : (
                  <code className="font-mono">{settings.backupSchedule} (cron)</code>
                )
              }
            >
              {settings.databaseType === "external" ? (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25">
                  {t("backupDisabled")}
                </Badge>
              ) : (
                <span>{cronToHuman(settings.backupSchedule, t, locale)}</span>
              )}
            </StatCard>

            <StatCard label={t("apiDocs")} sub={<code className="font-mono">/api-docs.html</code>}>
              <Link
                href="/api-docs.html"
                target="_blank"
                className="text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-300"
              >
                Swagger UI
              </Link>
            </StatCard>
          </div>
        </section>

        {/* ─── Section: Danger zone ─── */}
        <section>
          <SectionHeading>{t("actionsSection")}</SectionHeading>
          <div className="overflow-hidden rounded-lg border border-red-900/40 bg-red-950/10">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-200">{t("runSeed")}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{t("seedDescription")}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmSeed(true)}
                disabled={seeding || settings.testMode}
                className="shrink-0 sm:self-center"
              >
                {t("runSeed")}
              </Button>
            </div>
            <div className="border-t border-red-900/40" />
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">{t("resetDatabase")}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{t("resetDescription")}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmReset(true)}
                disabled={resetting || settings.testMode}
                className="shrink-0 sm:self-center"
              >
                {t("resetDatabase")}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirm dialogs */}
      <Dialog open={confirmSeed} onOpenChange={(o) => { if (!o) setConfirmSeed(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("seedConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("seedConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSeed(false)} disabled={seeding}>
              {tc("cancel")}
            </Button>
            <Button onClick={runSeed} disabled={seeding}>
              {seeding ? t("loading") : t("seedConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
