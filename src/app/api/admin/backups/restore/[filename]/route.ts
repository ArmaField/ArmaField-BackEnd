import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { execSync } from "child_process";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

function findPsql(): string {
  try {
    execSync("psql --version", { stdio: "pipe" });
    return "psql";
  } catch {
    // Not in PATH — check common Windows locations
  }

  const windowsPaths = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe",
  ];

  for (const p of windowsPaths) {
    if (fs.existsSync(p)) return `"${p}"`;
  }

  throw new Error("psql not found. Install PostgreSQL client tools or add psql to PATH.");
}

/**
 * POST /admin/api/backups/restore/[filename]
 * Restore database from a backup file.
 * Requires backups.manage permission.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { error } = await requirePermission("backups.manage");
  if (error) return error;

  const { filename } = await params;

  // Sanitize
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  try {
    const psql = findPsql();

    if (filename.endsWith(".sql.gz")) {
      // Decompress first, then restore
      const tempFile = filepath.replace(".sql.gz", ".restore.sql");
      try {
        const input = fs.createReadStream(filepath);
        const output = fs.createWriteStream(tempFile);
        const gunzip = createGunzip();
        await pipeline(input, gunzip, output);

        execSync(`${psql} "${dbUrl}" -f "${tempFile}"`, {
          timeout: 300000,
          stdio: "pipe",
        });
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } else {
      // Plain SQL
      execSync(`${psql} "${dbUrl}" -f "${filepath}"`, {
        timeout: 300000,
        stdio: "pipe",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restore failed:", err);
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
