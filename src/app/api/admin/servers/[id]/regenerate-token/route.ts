import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /admin/api/servers/[id]/regenerate-token
 * Generate a new UUID token for a server.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("servers.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");
  const newToken = crypto.randomUUID();

  try {
    const server = await prisma.server.update({
      where: { id },
      data: { token: newToken },
    });
    return NextResponse.json(server);
  } catch {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
}
