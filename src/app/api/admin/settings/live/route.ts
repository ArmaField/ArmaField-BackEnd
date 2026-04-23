import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/live
 * Lightweight endpoint for polling live runtime stats (uptime + process memory).
 * Meant to be polled every few seconds from the /system page.
 */
export async function GET() {
  const { error } = await requirePermission("system.view");
  if (error) return error;

  const mem = process.memoryUsage();

  return NextResponse.json({
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    timestamp: Date.now(),
  });
}
