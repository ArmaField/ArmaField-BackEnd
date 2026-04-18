"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrashIcon } from "lucide-react";
import { RestoreDialog } from "./restore-dialog";

interface BackupFile {
  filename: string;
  size: number;
  date: string;
}

interface BackupSettings {
  schedule: string;
  retentionDaily: number;
  retentionWeekly: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCron(cron: string) {
  const parts = cron.split(" ");
  if (parts.length !== 5) return { minute: 0, hour: 3, frequency: "daily" as const, dow: 0 };
  const [min, hour, , , dow] = parts;
  return {
    minute: parseInt(min) || 0,
    hour: parseInt(hour) || 0,
    frequency: (dow === "*" ? "daily" : "weekly") as "daily" | "weekly",
    dow: dow === "*" ? 0 : parseInt(dow) || 0,
  };
}

function buildCron(hour: number, minute: number, frequency: "daily" | "weekly", dow: number) {
  if (frequency === "daily") return `${minute} ${hour} * * *`;
  return `${minute} ${hour} * * ${dow}`;
}

function NumberStepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label?: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-input bg-transparent dark:bg-input/30">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
      >
        -
      </button>
      <span className="min-w-[2rem] text-center text-sm text-zinc-300">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
      >
        +
      </button>
      {label && <span className="pr-2.5 text-xs text-zinc-500">{label}</span>}
    </div>
  );
}

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_RU = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

export function BackupsPageClient() {
  const t = useTranslations("backups");
  const tc = useTranslations("common");
  const locale = useLocale();
  const days = locale === "ru" ? DAYS_RU : DAYS_EN;

  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreBackup, setRestoreBackup] = useState<BackupFile | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [deleteBackup, setDeleteBackup] = useState<BackupFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editHour, setEditHour] = useState(3);
  const [editMinute, setEditMinute] = useState(0);
  const [editFrequency, setEditFrequency] = useState<"daily" | "weekly">("daily");
  const [editDow, setEditDow] = useState(0);
  const [editRetentionDaily, setEditRetentionDaily] = useState(7);
  const [editRetentionWeekly, setEditRetentionWeekly] = useState(4);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backups");
      if (res.ok) setBackups(await res.json());
      else toast.error(t("loadFailed"));
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backups/settings");
      if (res.ok) setSettings(await res.json());
    } catch { /* silent */ } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
    fetchSettings();
  }, [fetchBackups, fetchSettings]);

  const handleCreateBackup = async () => {
    setShowCreateConfirm(false);
    setCreatingBackup(true);
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(t("backupCreated", { filename: data.filename }));
        await fetchBackups();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? t("backupFailed"));
      }
    } catch {
      toast.error(t("backupFailed"));
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteBackup) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: deleteBackup.filename }),
      });
      if (res.ok) {
        toast.success(t("backupDeleted"));
        setDeleteBackup(null);
        await fetchBackups();
      } else toast.error(t("backupDeleteFailed"));
    } catch {
      toast.error(t("backupDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const startEditing = () => {
    if (!settings) return;
    const parsed = parseCron(settings.schedule);
    setEditHour(parsed.hour);
    setEditMinute(parsed.minute);
    setEditFrequency(parsed.frequency);
    setEditDow(parsed.dow);
    setEditRetentionDaily(settings.retentionDaily);
    setEditRetentionWeekly(settings.retentionWeekly);
    setEditing(true);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const schedule = buildCron(editHour, editMinute, editFrequency, editDow);
      const res = await fetch("/api/admin/backups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, retentionDaily: editRetentionDaily, retentionWeekly: editRetentionWeekly }),
      });
      if (res.ok) {
        setSettings(await res.json());
        setEditing(false);
        toast.success(t("settingsSaved"));
      } else toast.error(t("settingsSaveFailed"));
    } catch {
      toast.error(t("settingsSaveFailed"));
    } finally {
      setSavingSettings(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const cronToReadable = (cron: string) => {
    const p = parseCron(cron);
    const time = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
    if (p.frequency === "daily") return `${locale === "ru" ? "Ежедневно" : "Daily"}, ${time}`;
    return `${days[p.dow]}, ${time}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{t("backupCount", { count: backups.length })}</span>
          <Button onClick={() => setShowCreateConfirm(true)} disabled={creatingBackup} size="sm">
            {creatingBackup ? t("creating") : t("createBackup")}
          </Button>
        </div>
      </div>

      {/* Settings */}
      {settingsLoading ? (
        <div className="mb-6 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-500">{tc("loading")}</div>
      ) : settings ? (
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">{t("settingsTitle")}</h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEditing}>{tc("edit")}</Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              {/* Schedule */}
              <div>
                <Label className="text-xs text-zinc-400">{t("schedule")}</Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {/* Frequency toggle */}
                  <div className="flex rounded-lg border border-input bg-transparent dark:bg-input/30">
                    <button
                      type="button"
                      onClick={() => setEditFrequency("daily")}
                      className={`rounded-l-lg px-3 py-1.5 text-sm transition-colors ${editFrequency === "daily" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      {locale === "ru" ? "Ежедневно" : "Daily"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFrequency("weekly")}
                      className={`rounded-r-lg px-3 py-1.5 text-sm transition-colors ${editFrequency === "weekly" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      {locale === "ru" ? "Еженедельно" : "Weekly"}
                    </button>
                  </div>

                  {/* Day of week */}
                  {editFrequency === "weekly" && (
                    <Select value={String(editDow)} onValueChange={(v) => v != null && setEditDow(parseInt(v))}>
                      <SelectTrigger size="sm" className="w-auto border-zinc-700 bg-zinc-900 text-zinc-300">
                        {days[editDow]}
                      </SelectTrigger>
                      <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {days.map((day, i) => (
                          <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <span>{locale === "ru" ? "в" : "at"}</span>
                    <Select value={String(editHour)} onValueChange={(v) => v != null && setEditHour(parseInt(v))}>
                      <SelectTrigger size="sm" className="w-auto border-zinc-700 bg-zinc-900 text-zinc-300">
                        {String(editHour).padStart(2, "0")}
                      </SelectTrigger>
                      <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>:</span>
                    <Select value={String(editMinute)} onValueChange={(v) => v != null && setEditMinute(parseInt(v))}>
                      <SelectTrigger size="sm" className="w-auto border-zinc-700 bg-zinc-900 text-zinc-300">
                        {String(editMinute).padStart(2, "0")}
                      </SelectTrigger>
                      <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {[0, 15, 30, 45].map((m) => (
                          <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Retention */}
              <div className="flex flex-wrap gap-6">
                <div>
                  <Label className="text-xs text-zinc-400">{t("retentionDaily")}</Label>
                  <div className="mt-1.5">
                    <NumberStepper value={editRetentionDaily} onChange={setEditRetentionDaily} min={1} max={365} label={locale === "ru" ? "дн." : "days"} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">{t("retentionWeekly")}</Label>
                  <div className="mt-1.5">
                    <NumberStepper value={editRetentionWeekly} onChange={setEditRetentionWeekly} min={1} max={52} label={locale === "ru" ? "нед." : "weeks"} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings ? tc("loading") : tc("save")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={savingSettings}>
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-xs text-zinc-500">{t("schedule")}</p>
                <p className="text-sm text-zinc-200">{cronToReadable(settings.schedule)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-500">{t("retentionDaily")}</p>
                <p className="text-sm text-zinc-200">{t("keptForDays", { count: settings.retentionDaily })}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-500">{t("retentionWeekly")}</p>
                <p className="text-sm text-zinc-200">{t("keptForWeeks", { count: settings.retentionWeekly })}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Backup list */}
      {loading ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">{t("loadingBackups")}</div>
      ) : backups.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">{t("noBackups")}</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead>{t("filename")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("size")}</TableHead>
                  <TableHead className="text-right"><span className="hidden sm:inline">{tc("actions")}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename} className="border-zinc-800">
                    <TableCell>
                      <code className="font-mono text-xs text-zinc-300 sm:text-sm">{backup.filename}</code>
                      <div className="mt-1 text-xs text-zinc-500 sm:hidden">
                        {formatDate(backup.date)} · {formatSize(backup.size)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-zinc-400 sm:table-cell">{formatDate(backup.date)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/25">{formatSize(backup.size)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setRestoreBackup(backup)}>
                          <span className="hidden sm:inline">{t("restore")}</span>
                          <span className="sm:hidden text-xs">↺</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={() => setDeleteBackup(backup)}>
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Backup Confirmation */}
      <Dialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createBackup")}</DialogTitle>
            <DialogDescription>
              {t("createBackupTooltip")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateConfirm(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleCreateBackup}>
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Backup Confirmation */}
      <Dialog open={!!deleteBackup} onOpenChange={(open) => { if (!open) setDeleteBackup(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteBackup")}</DialogTitle>
            <DialogDescription>
              {t("deleteBackupConfirm", { filename: deleteBackup?.filename ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBackup(null)} disabled={deleting}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteBackup} disabled={deleting}>
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {restoreBackup && (
        <RestoreDialog
          backup={restoreBackup}
          open={!!restoreBackup}
          onOpenChange={(open) => { if (!open) setRestoreBackup(null); }}
        />
      )}
    </div>
  );
}
