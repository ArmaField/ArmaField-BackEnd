-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NONE', 'TECH_ADMIN', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Class" AS ENUM ('ASSAULT', 'ENGINEER', 'SUPPORT', 'RECON');

-- CreateEnum
CREATE TYPE "WeaponType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "AttachmentSlot" AS ENUM ('OPTIC', 'MUZZLE', 'UNDERBARREL', 'ACCESSORY', 'MAGAZINE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ATTACHMENT', 'GADGET', 'GRENADE');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT,
    "token" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,

    CONSTRAINT "weapon_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapons" (
    "id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "type" "WeaponType" NOT NULL,
    "class" "Class" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPrice" INTEGER NOT NULL DEFAULT 0,
    "slot" "AttachmentSlot" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_attachments" (
    "weaponId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "priceOverride" INTEGER,

    CONSTRAINT "weapon_attachments_pkey" PRIMARY KEY ("weaponId","attachmentId")
);

-- CreateTable
CREATE TABLE "gadgets" (
    "id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "class" "Class" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gadgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grenades" (
    "id" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "class" "Class" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grenades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "xpBalance" INTEGER NOT NULL DEFAULT 0,
    "xpLifetime" INTEGER NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "flagsCaptured" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_unlocks" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_loadouts" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "class" "Class" NOT NULL,
    "weaponId" TEXT,
    "pistolId" TEXT,
    "gadgetId" TEXT,
    "grenadeId" TEXT,

    CONSTRAINT "player_loadouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_weapon_setups" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "weaponId" TEXT NOT NULL,

    CONSTRAINT "player_weapon_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_weapon_attachments" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,

    CONSTRAINT "player_weapon_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_steamId_key" ON "admins"("steamId");

-- CreateIndex
CREATE UNIQUE INDEX "servers_token_key" ON "servers"("token");

-- CreateIndex
CREATE UNIQUE INDEX "weapon_categories_name_key" ON "weapon_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "weapons_guid_key" ON "weapons"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_guid_key" ON "attachments"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "gadgets_guid_key" ON "gadgets"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "grenades_guid_key" ON "grenades"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "players_uid_key" ON "players"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "player_unlocks_playerId_itemType_itemId_key" ON "player_unlocks"("playerId", "itemType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "player_loadouts_playerId_class_key" ON "player_loadouts"("playerId", "class");

-- CreateIndex
CREATE UNIQUE INDEX "player_weapon_setups_playerId_weaponId_key" ON "player_weapon_setups"("playerId", "weaponId");

-- CreateIndex
CREATE UNIQUE INDEX "player_weapon_attachments_setupId_attachmentId_key" ON "player_weapon_attachments"("setupId", "attachmentId");

-- AddForeignKey
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "weapon_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_attachments" ADD CONSTRAINT "weapon_attachments_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "weapons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_attachments" ADD CONSTRAINT "weapon_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_unlocks" ADD CONSTRAINT "player_unlocks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_loadouts" ADD CONSTRAINT "player_loadouts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_weapon_setups" ADD CONSTRAINT "player_weapon_setups_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_weapon_attachments" ADD CONSTRAINT "player_weapon_attachments_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "player_weapon_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
