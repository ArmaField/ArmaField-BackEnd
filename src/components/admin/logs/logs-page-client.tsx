"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: string;
  time: string;
  msg: string;
  [key: string]: unknown;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  warn: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  error: "bg-red-500/15 text-red-400 border-red-500/25",
  fatal: "bg-red-500/15 text-red-400 border-red-500/25",
  debug: "bg-zinc-500/15 text-zinc-500 border-zinc-500/25",
  trace: "bg-zinc-500/15 text-zinc-600 border-zinc-500/25",
};

export function LogsPageClient() {
  const t = useTranslations("logs");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filterOptions: { label: string; value: LogLevel | null }[] = [
    { label: t("all"), value: null },
    { label: "Info", value: "info" },
    { label: "Warn", value: "warn" },
    { label: "Error", value: "error" },
  ];

  const formatTimestamp = (time: string) => {
    return new Date(time).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set("level", levelFilter);
      params.set("limit", "200");

      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        setLogs(await res.json());
      } else {
        toast.error(t("loadFailed"));
      }
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [levelFilter, t]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchLogs]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRefresh((prev) => !prev)}
        >
          {autoRefresh ? t("autoRefreshOn") : t("autoRefreshOff")}
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.label}
            variant={levelFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setLevelFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Log Container */}
      {loading ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          {tc("loading")}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          {t("noLogs")}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-280px)] overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-xs">
          <div className="space-y-1">
            {logs.map((entry, index) => (
              <div key={index} className="flex items-start gap-3 py-0.5">
                <span className="shrink-0 text-zinc-600">
                  {formatTimestamp(entry.time)}
                </span>
                <Badge
                  className={`shrink-0 uppercase ${LEVEL_COLORS[entry.level] || LEVEL_COLORS.info}`}
                >
                  {entry.level}
                </Badge>
                <span className="text-zinc-300">{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
