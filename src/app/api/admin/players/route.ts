import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = ["nickname", "xpLifetime", "kills", "deaths", "updatedAt"] as const;
type SortField = (typeof SORTABLE_FIELDS)[number];

/**
 * GET /admin/api/players
 * List/search players with pagination and sorting.
 */
export async function GET(request: Request) {
  const { error } = await requirePermission("players.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const sortParam = searchParams.get("sort") || "updatedAt";
  const orderParam = searchParams.get("order") || "desc";

  const sort: SortField = SORTABLE_FIELDS.includes(sortParam as SortField)
    ? (sortParam as SortField)
    : "updatedAt";
  const order: "asc" | "desc" = orderParam === "asc" ? "asc" : "desc";

  const { prisma } = await import("@/lib/db");

  const where = search
    ? {
        OR: [
          { nickname: { contains: search, mode: "insensitive" as const } },
          { uid: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        uid: true,
        nickname: true,
        xpBalance: true,
        xpLifetime: true,
        kills: true,
        deaths: true,
        assists: true,
        wins: true,
        losses: true,
        updatedAt: true,
      },
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json({
    players,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
