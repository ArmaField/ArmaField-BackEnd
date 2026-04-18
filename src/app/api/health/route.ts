import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "disconnected";

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      database: dbStatus,
      version: process.env.npm_package_version || "0.1.0",
      testMode: process.env.ARMAFIELD_TEST_MODE === "enabled-i-know-what-i-am-doing",
      timestamp: new Date().toISOString(),
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
