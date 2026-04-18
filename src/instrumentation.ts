export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
