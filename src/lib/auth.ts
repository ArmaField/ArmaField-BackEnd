import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Verify a Steam OpenID 2.0 callback by replaying the assertion to Steam.
 * Returns the Steam ID (64-bit) on success, or null on failure.
 */
export async function verifySteamLogin(
  searchParams: URLSearchParams
): Promise<string | null> {
  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) return null;

  // Extract Steam ID from claimed_id: https://steamcommunity.com/openid/id/<steamid>
  const match = claimedId.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
  );
  if (!match) return null;

  // Replay the assertion to Steam for verification
  const verifyParams = new URLSearchParams(searchParams);
  verifyParams.set("openid.mode", "check_authentication");

  const verifyResponse = await fetch(
    "https://steamcommunity.com/openid/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    }
  );

  const responseText = await verifyResponse.text();
  if (!responseText.includes("is_valid:true")) return null;

  return match[1];
}

/**
 * Fetch a Steam user's profile info via the Steam Web API.
 * Returns nickname and avatar URL, or defaults if the API key is not set.
 */
export async function fetchSteamProfile(steamId: string): Promise<{
  nickname: string;
  avatar: string | null;
}> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return { nickname: `Steam User ${steamId}`, avatar: null };
  }

  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
    );
    const data = await res.json();
    const player = data?.response?.players?.[0];
    if (player) {
      return {
        nickname: player.personaname || `Steam User ${steamId}`,
        avatar: player.avatarfull || player.avatar || null,
      };
    }
  } catch {
    // Fall through to default
  }

  return { nickname: `Steam User ${steamId}`, avatar: null };
}

/**
 * Build the Steam OpenID 2.0 login URL.
 */
export function buildSteamLoginUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl,
    "openid.realm": new URL(callbackUrl).origin,
    "openid.identity":
      "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id":
      "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

/**
 * Check if test mode is enabled.
 */
export function isTestMode(): boolean {
  return (
    process.env.ARMAFIELD_TEST_MODE === "enabled-i-know-what-i-am-doing"
  );
}

/**
 * Return the real session, or a fake SUPER_ADMIN session in test mode.
 * Use this in page/layout server components instead of calling `auth()` directly.
 */
export async function getSessionOrTest() {
  if (isTestMode()) {
    return {
      user: {
        id: "test-admin",
        name: "Test Admin",
        steamId: "TEST_MODE",
        role: "Super Admin" as string,
        roleColor: "#ef4444",
        permissions: Object.values(PERMISSIONS) as string[],
        roleId: "test-role",
        image: null,
      },
    };
  }
  return await auth();
}

const basePath = "/api/admin/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "steam",
      name: "Steam",
      credentials: {
        steamId: { label: "Steam ID", type: "text" },
        nickname: { label: "Nickname", type: "text" },
        avatar: { label: "Avatar", type: "text" },
        role: { label: "Role", type: "text" },
        dbId: { label: "DB ID", type: "text" },
      },
      async authorize(credentials) {
        const steamId = credentials?.steamId as string | undefined;
        const nickname = credentials?.nickname as string | undefined;
        const avatar = credentials?.avatar as string | undefined;
        const role = credentials?.role as string | undefined;
        const dbId = credentials?.dbId as string | undefined;

        if (!steamId || !nickname || !dbId) {
          return null;
        }

        return {
          id: dbId,
          name: nickname,
          image: avatar || null,
          role: role || null,
          steamId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.steamId = user.steamId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.steamId = token.steamId as string;

      // Always fetch current role from DB to reflect changes immediately
      try {
        const { prisma } = await import("@/lib/db");
        const admin = await prisma.admin.findUnique({
          where: { id: token.id as string },
          select: { role: { select: { id: true, name: true, color: true, permissions: true, isBuiltIn: true } } },
        });
        if (admin?.role) {
          session.user.role = admin.role.name;
          session.user.roleColor = admin.role.color;
          session.user.permissions = admin.role.permissions;
          session.user.roleId = admin.role.id;
        } else {
          // User has no role or was deleted
          session.user.role = null;
          session.user.roleColor = "#6b7280";
          session.user.permissions = [];
          session.user.roleId = null;
        }
      } catch {
        // DB unavailable — fall back to empty permissions
        session.user.role = token.role as string | null;
        session.user.roleColor = "#6b7280";
        session.user.permissions = [];
        session.user.roleId = null;
      }

      return session;
    },
  },
});
