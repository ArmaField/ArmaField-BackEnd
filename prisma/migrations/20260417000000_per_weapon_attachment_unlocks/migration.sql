-- Create new per-weapon attachment unlock table
CREATE TABLE "player_weapon_attachment_unlocks" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "weaponId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_weapon_attachment_unlocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_weapon_attachment_unlocks_playerId_weaponId_attachm_key"
  ON "player_weapon_attachment_unlocks"("playerId", "weaponId", "attachmentId");

ALTER TABLE "player_weapon_attachment_unlocks"
  ADD CONSTRAINT "player_weapon_attachment_unlocks_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old ATTACHMENT unlocks (they had no weapon context — can't be migrated)
DELETE FROM "player_unlocks" WHERE "itemType" = 'ATTACHMENT';
