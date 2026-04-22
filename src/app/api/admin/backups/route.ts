import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { isLocalDatabase } from "@/lib/database-type";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BACKUPS_DIR = join(process.cwd(), "data", "backups");

interface BackupFile {
  filename: string;
  size: number;
  date: string;
}

function parseDateFromFilename(filename: string): string | null {
  const match = filename.match(/armafield_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * GET /admin/api/backups
 * List backup files from ./data/backups/ directory.
 * SUPER_ADMIN only.
 */
export async function GET() {
  const { error } = await requirePermission("backups.manage");
  if (error) return error;

  try {
    const files = await readdir(BACKUPS_DIR);
    const backups: BackupFile[] = [];

    for (const filename of files) {
      if (!filename.endsWith(".sql.gz") && !filename.endsWith(".sql")) continue;

      const date = parseDateFromFilename(filename);
      if (!date) continue;

      try {
        const fileStat = await stat(join(BACKUPS_DIR, filename));
        backups.push({
          filename,
          size: fileStat.size,
          date,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    backups.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json(backups);
  } catch {
    // Directory doesn't exist or can't be read
    return NextResponse.json([]);
  }
}

/**
 * POST /admin/api/backups
 * Trigger a manual backup.
 * Requires backups.manage permission.
 */
export async function POST() {
  const { error } = await requirePermission("backups.manage");
  if (error) return error;

  if (!isLocalDatabase()) {
    return NextResponse.json(
      { error: "Backups are disabled when using an external database. Manage backups via your database provider." },
      { status: 400 },
    );
  }

  try {
    const { runBackup } = await import("@/lib/backup");
    const filename = await runBackup();
    return NextResponse.json({ success: true, filename });
  } catch (err) {
    console.error("Manual backup failed:", err);
    return NextResponse.json(
      { error: "Backup failed" },
      { status: 500 },
    );
  }
}

const DeleteSchema = z.object({
  filename: z.string().min(1),
});

/**
 * DELETE /admin/api/backups
 * Delete a backup file.
 * Requires backups.manage permission.
 */
export async function DELETE(request: Request) {
  const { error } = await requirePermission("backups.manage");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = DeleteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  const { filename } = result.data;

  // Sanitize - prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = join(BACKUPS_DIR, filename);

  try {
    await unlink(filepath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }
}
