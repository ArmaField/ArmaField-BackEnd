import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const UpdateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  ip: z.string().max(45).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /admin/api/servers/[id]
 * Update a server.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("servers.manage");
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateServerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const server = await prisma.server.update({
      where: { id },
      data: result.data,
    });
    return NextResponse.json(server);
  } catch {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
}

/**
 * DELETE /admin/api/servers/[id]
 * Delete a server.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("servers.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  try {
    await prisma.server.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
}
