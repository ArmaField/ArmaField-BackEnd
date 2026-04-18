import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateBearerToken } from "@/lib/game-auth";

const mockFindUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    server: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

describe("validateBearerToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns server when token is valid", async () => {
    const server = { id: "srv1", name: "Test Server", token: "valid-token", isActive: true };
    mockFindUnique.mockResolvedValue(server);

    const result = await validateBearerToken("valid-token");

    expect(result).toEqual(server);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: "valid-token", isActive: true },
    });
  });

  it("returns null when token is invalid", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await validateBearerToken("bad-token");
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const result = await validateBearerToken("");
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
