export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { isLocalDatabase } = await import("./lib/database-type");

    if (!isLocalDatabase()) {
      console.log("External database detected — backup scheduler disabled (managed by user).");
      return;
    }

    const { getBackupSettings } = await import("./lib/backup");
    const { startBackupScheduler } = await import("./lib/backup-scheduler");

    try {
      const settings = await getBackupSettings();
      startBackupScheduler(settings.schedule);
    } catch (err) {
      console.error("Failed to start backup scheduler:", err);
    }
  }
}
