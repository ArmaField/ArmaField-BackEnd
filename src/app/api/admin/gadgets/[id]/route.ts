import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const UpdateGadgetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  guid: z.string().min(1).max(200).optional(),
  price: z.number().int().min(0).optional(),
  class: z.enum(["ASSAULT", "ENGINEER", "SUPPORT", "RECON"]).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  isDefault: z.boolean().optional(),
  zorder: z.number().int().min(0).optional(),
});

/**
 * GET /admin/api/gadgets/[id]
 * Get gadget details including owner count.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;
  const { prisma } = await import("@/lib/db");

  try {
    const gadget = await prisma.gadget.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });

    const ownerCount = await prisma.playerUnlock.count({
      where: { itemType: "GADGET", itemId: id },
    });

    return NextResponse.json({ ...gadget, ownerCount });
  } catch {
    return NextResponse.json({ error: "Gadget not found" }, { status: 404 });
  }
}

/**
 * PUT /admin/api/gadgets/[id]
 * Update a gadget.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateGadgetSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const gadget = await prisma.gadget.update({
      where: { id },
      data: result.data,
      include: { category: true },
    });
    return NextResponse.json(gadget);
  } catch {
    return NextResponse.json({ error: "Gadget not found" }, { status: 404 });
  }
}

/**
 * DELETE /admin/api/gadgets/[id]
 * Delete a gadget. If ?refund=true, refund XP to all players who own it.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const refund = searchParams.get("refund") === "true";

  const { prisma } = await import("@/lib/db");

  try {
    const gadget = await prisma.gadget.findUniqueOrThrow({ where: { id } });

    if (refund && gadget.price > 0) {
      const unlocks = await prisma.playerUnlock.findMany({
        where: { itemType: "GADGET", itemId: id },
        select: { playerId: true },
      });

      if (unlocks.length > 0) {
        const playerIds = unlocks.map((u) => u.playerId);

        await prisma.player.updateMany({
          where: { id: { in: playerIds } },
          data: { xpBalance: { increment: gadget.price } },
        });
      }
    }

    // Delete unlocks for this gadget
    await prisma.playerUnlock.deleteMany({
      where: { itemType: "GADGET", itemId: id },
    });

    // Delete the gadget
    await prisma.gadget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gadget not found" }, { status: 404 });
  }
}
