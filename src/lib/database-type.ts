export type DatabaseType = "local" | "external" | "unknown";

/**
 * Detect whether DATABASE_URL points to the local docker-compose service
 * (`db` hostname) or an external database.
 */
export function detectDatabaseType(): DatabaseType {
  const dbUrl = process.env.DATABASE_URL ?? "";
  try {
    const u = new URL(dbUrl);
    if (u.hostname === "db" || u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return "local";
    }
    return "external";
  } catch {
    return "unknown";
  }
}

export function isLocalDatabase(): boolean {
  return detectDatabaseType() === "local";
}
