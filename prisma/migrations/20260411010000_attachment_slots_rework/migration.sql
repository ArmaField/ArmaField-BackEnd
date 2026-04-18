-- Delete attachments with removed slot
DELETE FROM "attachments" WHERE "slot" = 'ACCESSORY';

-- Create new enum type
CREATE TYPE "AttachmentSlot_new" AS ENUM ('OPTIC', 'UNDER_BARREL', 'HAND_GUARD', 'MUZZLE', 'STOCK', 'MAGAZINE');

-- Migrate column to new type, renaming UNDERBARREL → UNDER_BARREL
ALTER TABLE "attachments"
  ALTER COLUMN "slot" TYPE "AttachmentSlot_new"
  USING (
    CASE "slot"::text
      WHEN 'UNDERBARREL' THEN 'UNDER_BARREL'::"AttachmentSlot_new"
      ELSE "slot"::text::"AttachmentSlot_new"
    END
  );

-- Drop old type and rename new
DROP TYPE "AttachmentSlot";
ALTER TYPE "AttachmentSlot_new" RENAME TO "AttachmentSlot";
