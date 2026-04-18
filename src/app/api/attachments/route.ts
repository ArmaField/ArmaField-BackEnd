import { NextRequest, NextResponse } from "next/server";
import { withGameAuth } from "@/lib/game-auth";
import { CLASS_MAP, WEAPON_TYPE_MAP, buildAttachmentsList } from "@/lib/loadout-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/attachments?uid=...&classId=1&type=1&guid=FA5C25BF66A53DCF
 */
export const GET = withGameAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const classIdRaw = parseInt(searchParams.get("classId") ?? "", 10);
  const typeRaw = parseInt(searchParams.get("type") ?? "", 10);
  const rawGuid = searchParams.get("guid") ?? "";

  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  const cls = CLASS_MAP[classIdRaw];
  if (!cls) {
    return NextResponse.json({ error: "Invalid classId (1-4)" }, { status: 400 });
  }

  const weaponType = WEAPON_TYPE_MAP[typeRaw];
  if (!weaponType) {
    return NextResponse.json({ error: "Invalid type (1-3, weapons only)" }, { status: 400 });
  }

  const guidMatch = rawGuid.trim().match(/^\{?([0-9a-fA-F]{16})\}?/);
  const guid = guidMatch ? guidMatch[1] : rawGuid.trim();

  if (!guid) {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db");

  const player = await prisma.player.findUnique({
    where: { uid },
    select: { id: true, xpBalance: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const weapon = await prisma.weapon.findFirst({
    where: { guid, class: cls, type: weaponType },
    select: { id: true },
  });
  if (!weapon) {
    return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
  }

  const attachments = await buildAttachmentsList(prisma, player.id, weapon.id);

  return NextResponse.json({ uid, xp: player.xpBalance, attachments });
});
