import { execSync } from "child_process";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

export interface BackupSettings {
  schedule: string;
  retentionDaily: number;
  retentionWeekly: number;
}

/**
 * Find pg_dump executable. Checks PATH first, then common install locations.
 */
function findPgDump(): string {
  // Try PATH first
  try {
    execSync("pg_dump --version", { stdio: "pipe" });
    return "pg_dump";
  } catch {
    // Not in PATH
  }

  // Common Windows locations
  const windowsPaths = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
  ];

  for (const p of windowsPaths) {
    if (fs.existsSync(p)) return `"${p}"`;
  }

  throw new Error("pg_dump not found. Install PostgreSQL client tools or add pg_dump to PATH.");
}

export async function runBackup(): Promise<string> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const filename = `armafield_${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const pgDump = findPgDump();

  // Dump to temp .sql file first, then gzip with Node.js (cross-platform)
  const tempFile = filepath.replace(".sql.gz", ".sql");

  try {
    execSync(`${pgDump} "${dbUrl}" -f "${tempFile}"`, {
      timeout: 120000,
      stdio: "pipe",
    });

    // Gzip with Node.js streams (works on all platforms)
    const input = fs.createReadStream(tempFile);
    const output = fs.createWriteStream(filepath);
    const gzip = createGzip();
    await pipeline(input, gzip, output);

    logger.info({ filename }, "Backup created successfully");
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }

  return filename;
}

export async function cleanupBackups(
  keepDaily: number = 7,
  keepWeekly: number = 4,
) {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("armafield_") && f.endsWith(".sql.gz"))
    .sort()
    .reverse();

  const keep = new Set<string>();

  files.slice(0, keepDaily).forEach((f) => keep.add(f));

  const weeksKept = new Set<string>();
  for (const file of files) {
    const match = file.match(/armafield_(\d{8})_/);
    if (!match) continue;
    const dateStr = match[1];
    const date = new Date(
      `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
    );
    const week = getISOWeek(date);
    if (!weeksKept.has(week) && weeksKept.size < keepWeekly) {
      weeksKept.add(week);
      keep.add(file);
    }
  }

  for (const file of files) {
    if (!keep.has(file)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    }
  }
}

function getISOWeek(date: Date): string {
  const year = date.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
  );
  return `${year}-W${weekNum}`;
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const { prisma } = await import("@/lib/db");

  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "backup.schedule",
          "backup.retention.daily",
          "backup.retention.weekly",
        ],
      },
    },
  });

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    schedule: map.get("backup.schedule") ?? "0 3 * * *",
    retentionDaily: parseInt(map.get("backup.retention.daily") ?? "7", 10),
    retentionWeekly: parseInt(map.get("backup.retention.weekly") ?? "4", 10),
  };
}

export async function updateBackupSettings(
  settings: Partial<BackupSettings>,
): Promise<BackupSettings> {
  const { prisma } = await import("@/lib/db");

  if (settings.schedule !== undefined) {
    await prisma.setting.upsert({
      where: { key: "backup.schedule" },
      update: { value: settings.schedule },
      create: { key: "backup.schedule", value: settings.schedule },
    });
  }

  if (settings.retentionDaily !== undefined) {
    await prisma.setting.upsert({
      where: { key: "backup.retention.daily" },
      update: { value: String(settings.retentionDaily) },
      create: {
        key: "backup.retention.daily",
        value: String(settings.retentionDaily),
      },
    });
  }

  if (settings.retentionWeekly !== undefined) {
    await prisma.setting.upsert({
      where: { key: "backup.retention.weekly" },
      update: { value: String(settings.retentionWeekly) },
      create: {
        key: "backup.retention.weekly",
        value: String(settings.retentionWeekly),
      },
    });
  }

  return getBackupSettings();
}
