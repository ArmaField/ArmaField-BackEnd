import * as cron from "node-cron";
import type { ScheduledTask } from "node-cron";

let currentTask: ScheduledTask | null = null;

export function startBackupScheduler(schedule: string) {
  if (currentTask) {
    currentTask.stop();
  }

  if (!cron.validate(schedule)) {
    console.error(`Invalid cron schedule: ${schedule}`);
    return;
  }

  currentTask = cron.schedule(schedule, async () => {
    try {
      const { runBackup, cleanupBackups, getBackupSettings } = await import(
        "./backup"
      );
      const settings = await getBackupSettings();
      const filename = await runBackup();
      console.log(`Backup created: ${filename}`);
      await cleanupBackups(settings.retentionDaily, settings.retentionWeekly);
      console.log("Backup cleanup completed");
    } catch (err) {
      console.error("Backup failed:", err);
    }
  });

  console.log(`Backup scheduler started with schedule: ${schedule}`);
}

export function stopBackupScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}
