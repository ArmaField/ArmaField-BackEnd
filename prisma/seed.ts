import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

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

  console.log("Seeded default roles");

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

  console.log("Seeded default backup settings");

  if (process.env.ARMAFIELD_TEST_MODE === "enabled-i-know-what-i-am-doing") {
    console.log("Test mode detected - loadout data is served from static test-loadout-data.ts, no DB seeding needed.");
  }

  console.log("Seed complete");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
