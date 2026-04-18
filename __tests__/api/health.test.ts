import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("GET /api/health", () => {
  it("returns status ok with db connected", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
    expect(body.version).toBeDefined();
  });
});
