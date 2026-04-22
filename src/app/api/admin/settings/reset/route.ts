import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { runAdminSeed } from "@/lib/admin-seed";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings/reset
 * WIPE the database (all user data) and re-run initial seed.
 * Preserves the schema (migrations) - only truncates data.
 * DESTRUCTIVE - SUPER_ADMIN only, requires confirmation on the client.
 */
export async function POST() {
  const { error } = await requirePermission("system.view");
  if (error) return error;

  const { prisma } = await import("@/lib/db");

  try {
    // Truncate all tables except _prisma_migrations. CASCADE handles FK.
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename NOT LIKE '\\_prisma_%'
        ) LOOP
          EXECUTE 'TRUNCATE TABLE "public"."' || r.tablename || '" RESTART IDENTITY CASCADE';
        END LOOP;
      END $$;
    `);

    await runAdminSeed();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Reset failed", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
