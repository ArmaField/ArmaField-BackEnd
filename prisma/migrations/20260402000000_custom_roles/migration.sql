-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- Seed the built-in Super Admin role
INSERT INTO "roles" ("id", "name", "color", "permissions", "isBuiltIn", "sortOrder", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'Super Admin',
    '#ef4444',
    ARRAY['dashboard.view','servers.view','servers.manage','loadouts.view','loadouts.manage','players.view','users.view','users.manage','roles.manage','logs.view','backups.view','backups.manage','system.view'],
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Add roleId column to admins
ALTER TABLE "admins" ADD COLUMN "roleId" TEXT;

-- Migrate existing role enum values to new roleId
UPDATE "admins"
SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'Super Admin')
WHERE "role" = 'SUPER_ADMIN';

-- Drop the old role column
ALTER TABLE "admins" DROP COLUMN "role";

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the old Role enum
DROP TYPE IF EXISTS "Role";
