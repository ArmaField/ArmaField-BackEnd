-- Drop old FKs to separate category tables
ALTER TABLE "gadgets" DROP CONSTRAINT IF EXISTS "gadgets_categoryId_fkey";
ALTER TABLE "grenades" DROP CONSTRAINT IF EXISTS "grenades_categoryId_fkey";

-- Drop separate category tables
DROP TABLE IF EXISTS "gadget_categories";
DROP TABLE IF EXISTS "grenade_categories";

-- Add FKs to weapon_categories (shared)
ALTER TABLE "gadgets" ADD CONSTRAINT "gadgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "weapon_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grenades" ADD CONSTRAINT "grenades_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "weapon_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
