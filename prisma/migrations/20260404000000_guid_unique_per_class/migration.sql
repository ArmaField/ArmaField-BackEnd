-- DropIndex
DROP INDEX IF EXISTS "weapons_guid_key";
DROP INDEX IF EXISTS "gadgets_guid_key";
DROP INDEX IF EXISTS "grenades_guid_key";

-- CreateIndex (composite unique: guid + class)
CREATE UNIQUE INDEX "weapons_guid_class_key" ON "weapons"("guid", "class");
CREATE UNIQUE INDEX "gadgets_guid_class_key" ON "gadgets"("guid", "class");
CREATE UNIQUE INDEX "grenades_guid_class_key" ON "grenades"("guid", "class");
