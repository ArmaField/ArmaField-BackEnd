import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";
import { TEST_MODE, TEST_SERVER } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/servers
 * List all servers ordered by sortOrder.
 * In test mode, returns a single hardcoded server.
 */
export async function GET() {
  const { error } = await requirePermission("servers.view");
  if (error) return error;

  if (TEST_MODE) {
    return NextResponse.json([TEST_SERVER]);
  }

  const { prisma } = await import("@/lib/db");
  const servers = await prisma.server.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(servers);
}

const CreateServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  ip: z.string().max(45).optional(),
});

/**
 * POST /admin/api/servers
 * Create a new server. Auto-generates UUID token.
 */
export async function POST(request: Request) {
  const { error } = await requirePermission("servers.manage");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateServerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");
  const token = crypto.randomUUID();

  const server = await prisma.server.create({
    data: {
      name: result.data.name,
      ip: result.data.ip || null,
      token,
    },
  });

  return NextResponse.json(server, { status: 201 });
}
