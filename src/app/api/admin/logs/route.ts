import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const LOG_FILE = join(process.cwd(), "data", "logs", "app.log");

/** Pino numeric levels to string labels */
const LEVEL_MAP: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

/** Reverse: string label to numeric level */
const LEVEL_NUM: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

interface LogEntry {
  level: string;
  time: string;
  msg: string;
  [key: string]: unknown;
}

/**
 * GET /admin/api/logs
 * Read recent logs from app.log file (Pino JSON lines format).
 * Query params: level (info|warn|error), limit (default 100, max 500)
 * TECH_ADMIN+
 */
export async function GET(request: NextRequest) {
  const { error } = await requirePermission("logs.view");
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const levelFilter = searchParams.get("level");
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 500);

  try {
    const content = await readFile(LOG_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const entries: LogEntry[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const levelNum = typeof parsed.level === "number" ? parsed.level : null;
        const levelStr = levelNum !== null ? LEVEL_MAP[levelNum] || "unknown" : String(parsed.level);

        // Filter by level if specified
        if (levelFilter) {
          const filterNum = LEVEL_NUM[levelFilter];
          if (filterNum !== undefined && levelNum !== filterNum) continue;
        }

        entries.push({
          ...parsed,
          level: levelStr,
          time: parsed.time ? new Date(parsed.time).toISOString() : new Date().toISOString(),
          msg: parsed.msg || "",
        });
      } catch {
        // Skip malformed lines
      }
    }

    // Most recent first, limited
    entries.reverse();
    const result = entries.slice(0, limit);

    return NextResponse.json(result);
  } catch {
    // File doesn't exist or can't be read
    return NextResponse.json([]);
  }
}
