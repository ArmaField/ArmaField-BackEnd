import path from "node:path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Load .env and .env.local
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.local"), override: true });

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/armafield",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
