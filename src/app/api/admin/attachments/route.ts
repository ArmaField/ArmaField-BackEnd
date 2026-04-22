import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin-auth";
import { TEST_MODE } from "@/lib/test-mode";
import { TEST_ATTACHMENTS } from "@/lib/test-loadout-data";

export const dynamic = "force-dynamic";

/**
 * GET /admin/api/attachments
 * List all attachments. Optional query param `slot` to filter.
 */
export async function GET(request: Request) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const slotFilter = searchParams.get("slot");

  if (TEST_MODE) {
    const filtered = slotFilter
      ? TEST_ATTACHMENTS.filter((a) => a.slot === slotFilter)
      : TEST_ATTACHMENTS;
    return NextResponse.json(filtered);
  }

  const where: Record<string, string> = {};
  if (
    slotFilter &&
    ["OPTIC", "UNDER_BARREL", "HAND_GUARD", "MUZZLE", "STOCK", "MAGAZINE", "TACTICAL_BLOCK", "FOREGRIP"].includes(slotFilter)
  ) {
    where.slot = slotFilter;
  }

  const { prisma } = await import("@/lib/db");
  const attachments = await prisma.attachment.findMany({
    where,
    orderBy: [{ slot: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(attachments);
}

const CreateAttachmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  guid: z.string().min(1, "GUID is required").max(200),
  defaultPrice: z.number().int().min(0).default(0),
  slot: z.enum(["OPTIC", "UNDER_BARREL", "HAND_GUARD", "MUZZLE", "STOCK", "MAGAZINE", "TACTICAL_BLOCK", "FOREGRIP"]),
});

/**
 * POST /admin/api/attachments
 * Create a new attachment.
 */
export async function POST(request: Request) {
  const { error } = await requirePermission("loadouts.manage");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateAttachmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/db");

  try {
    const attachment = await prisma.attachment.create({
      data: result.data,
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Attachment with this GUID already exists" },
      { status: 409 }
    );
  }
}
