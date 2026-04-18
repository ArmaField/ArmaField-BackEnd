import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { runAdminSeed } from "@/lib/admin-seed";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings/seed
 * Run idempotent seed — built-in roles and default backup settings.
 * Safe to run multiple times (uses upsert, no duplicates).
 */
export async function POST() {
  const { error } = await requirePermission("system.view");
  if (error) return error;

  try {
    await runAdminSeed();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Seed failed", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
