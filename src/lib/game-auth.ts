import { NextRequest, NextResponse } from "next/server";

const TEST_MODE = process.env.ARMAFIELD_TEST_MODE === "enabled-i-know-what-i-am-doing";

interface ServerInfo {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
}

export async function validateBearerToken(token: string): Promise<ServerInfo | null> {
  if (!token) return null;

  if (TEST_MODE) {
    return {
      id: "test-server",
      name: "Test Mode Server",
      token,
      isActive: true,
    };
  }

  const { prisma } = await import("@/lib/db");
  const server = await prisma.server.findUnique({
    where: { token, isActive: true },
  });

  return server;
}

function extractBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return "";
  return authHeader.slice(7);
}

// Rate limiting for invalid tokens (simple in-memory)
const invalidAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = invalidAttempts.get(ip);
  if (!entry || now > entry.resetAt) return false;
  return entry.count >= RATE_LIMIT_MAX;
}

function recordInvalidAttempt(ip: string): void {
  const now = Date.now();
  const entry = invalidAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    invalidAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count++;
  }
}

export type GameApiHandler = (
  request: NextRequest,
  context: { server: ServerInfo; params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withGameAuth(handler: GameApiHandler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const token = extractBearerToken(request);
    const server = await validateBearerToken(token);

    if (!server) {
      recordInvalidAttempt(ip);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, { server, params: context.params });
  };
}
