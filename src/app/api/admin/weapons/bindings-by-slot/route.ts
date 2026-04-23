import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import type { AttachmentSlot } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_SLOTS: AttachmentSlot[] = [
  "OPTIC",
  "UNDER_BARREL",
  "HAND_GUARD",
  "MUZZLE",
  "STOCK",
  "MAGAZINE",
  "TACTICAL_BLOCK",
  "FOREGRIP",
];

/**
 * GET /api/admin/weapons/bindings-by-slot?slot=OPTIC
 * Returns every weapon with its WeaponAttachment bindings restricted to `slot`.
 * Powers the "Copy attachment bindings from another weapon" picker.
 */
export async function GET(request: Request) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const slotParam = searchParams.get("slot") as AttachmentSlot | null;

  if (!slotParam || !VALID_SLOTS.includes(slotParam)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }
  const slot: AttachmentSlot = slotParam;

  const { prisma } = await import("@/lib/db");

  const weapons = await prisma.weapon.findMany({
    include: {
      category: true,
      attachments: {
        where: { attachment: { slot } },
        include: {
          attachment: {
            select: { id: true, guid: true, name: true, defaultPrice: true, slot: true },
          },
        },
      },
    },
    orderBy: [{ class: "asc" }, { type: "asc" }, { zorder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(weapons);
}
