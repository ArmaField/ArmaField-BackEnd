import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      image?: string | null;
      role: string | null;
      roleColor: string;
      permissions: string[];
      roleId: string | null;
      steamId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string | null;
    steamId: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string | null;
    steamId: string;
  }
}
