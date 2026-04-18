/**
 * Idempotent seed: built-in roles and default backup settings.
 * Safe to run multiple times — uses upsert.
 */
export async function runAdminSeed() {
  const { prisma } = await import("@/lib/db");

  const allPermissions = [
    "dashboard.view",
    "servers.view", "servers.manage",
    "loadouts.view", "loadouts.manage",
    "players.view", "players.manage",
    "users.view", "users.manage",
    "roles.manage",
    "logs.view",
    "backups.view", "backups.manage",
    "system.view",
  ];

  await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: { permissions: allPermissions },
    create: {
      name: "Super Admin",
      color: "#ef4444",
      isBuiltIn: true,
      sortOrder: 0,
      permissions: allPermissions,
    },
  });

  await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      color: "#f97316",
      isBuiltIn: false,
      sortOrder: 1,
      permissions: [
        "dashboard.view",
        "servers.view", "servers.manage",
        "loadouts.view", "loadouts.manage",
        "players.view", "players.manage",
        "users.view",
        "logs.view",
      ],
    },
  });

  await prisma.role.upsert({
    where: { name: "Tech Admin" },
    update: {},
    create: {
      name: "Tech Admin",
      color: "#3b82f6",
      isBuiltIn: false,
      sortOrder: 2,
      permissions: ["dashboard.view", "players.view", "logs.view"],
    },
  });

  await prisma.setting.upsert({
    where: { key: "backup.schedule" },
    update: {},
    create: { key: "backup.schedule", value: "0 3 * * *" },
  });
  await prisma.setting.upsert({
    where: { key: "backup.retention.daily" },
    update: {},
    create: { key: "backup.retention.daily", value: "7" },
  });
  await prisma.setting.upsert({
    where: { key: "backup.retention.weekly" },
    update: {},
    create: { key: "backup.retention.weekly", value: "4" },
  });
}
