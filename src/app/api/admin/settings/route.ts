import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/settings
 * Return system configuration info.
 * SUPER_ADMIN only.
 */
export async function GET() {
  const { error } = await requirePermission("system.view");
  if (error) return error;

  // Check database connection
  let dbStatus = "disconnected";
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  // Read version from package.json or env
  let appVersion = process.env.APP_VERSION || "unknown";
  if (appVersion === "unknown") {
    try {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      const pkgContent = await readFile(join(process.cwd(), "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);
      appVersion = pkg.version || "unknown";
    } catch {
      // Ignore
    }
  }

  // Read backup schedule from DB
  let backupSchedule = "0 3 * * *";
  try {
    const { prisma } = await import("@/lib/db");
    const setting = await prisma.setting.findUnique({
      where: { key: "backup.schedule" },
    });
    if (setting) backupSchedule = setting.value;
  } catch {
    // Fallback to default if DB read fails
  }

  const settings = {
    testMode: process.env.ARMAFIELD_TEST_MODE === "enabled-i-know-what-i-am-doing",
    database: dbStatus,
    appVersion,
    backupSchedule,
    logLevel: process.env.LOG_LEVEL || "info",
    domain: process.env.DOMAIN || "localhost",
  };

  return NextResponse.json(settings);
}
