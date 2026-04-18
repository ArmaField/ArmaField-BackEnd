import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/backups/settings
 * Get backup settings (schedule, retention).
 * Requires backups.manage permission.
 */
export async function GET() {
  const { error } = await requirePermission("backups.manage");
  if (error) return error;

  try {
    const { getBackupSettings } = await import("@/lib/backup");
    const settings = await getBackupSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Failed to get backup settings:", err);
    return NextResponse.json(
      { error: "Failed to load backup settings" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/backups/settings
 * Update backup settings (schedule, retention).
 * Requires backups.manage permission.
 * After updating, restarts the backup scheduler with new schedule.
 */
export async function PUT(request: Request) {
  const { error } = await requirePermission("backups.manage");
  if (error) return error;

  try {
    const body = await request.json();
    const { schedule, retentionDaily, retentionWeekly } = body;

    // Validate cron schedule if provided
    if (schedule !== undefined) {
      const cron = await import("node-cron");
      if (!cron.validate(schedule)) {
        return NextResponse.json(
          { error: "Invalid cron schedule" },
          { status: 400 },
        );
      }
    }

    // Validate retention values if provided
    if (retentionDaily !== undefined) {
      const val = Number(retentionDaily);
      if (!Number.isInteger(val) || val < 1 || val > 365) {
        return NextResponse.json(
          { error: "retentionDaily must be an integer between 1 and 365" },
          { status: 400 },
        );
      }
    }

    if (retentionWeekly !== undefined) {
      const val = Number(retentionWeekly);
      if (!Number.isInteger(val) || val < 1 || val > 52) {
        return NextResponse.json(
          { error: "retentionWeekly must be an integer between 1 and 52" },
          { status: 400 },
        );
      }
    }

    const { updateBackupSettings, getBackupSettings } = await import(
      "@/lib/backup"
    );
    const updated = await updateBackupSettings({
      schedule,
      retentionDaily:
        retentionDaily !== undefined ? Number(retentionDaily) : undefined,
      retentionWeekly:
        retentionWeekly !== undefined ? Number(retentionWeekly) : undefined,
    });

    // Restart scheduler with new schedule
    const settings = await getBackupSettings();
    const { startBackupScheduler } = await import("@/lib/backup-scheduler");
    startBackupScheduler(settings.schedule);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update backup settings:", err);
    return NextResponse.json(
      { error: "Failed to update backup settings" },
      { status: 500 },
    );
  }
}
