-- Add isDefault to weapons
ALTER TABLE "weapons" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Create gadget_categories
CREATE TABLE "gadget_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    CONSTRAINT "gadget_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gadget_categories_name_key" ON "gadget_categories"("name");

-- Add isDefault and categoryId to gadgets
ALTER TABLE "gadgets" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gadgets" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "gadgets" ADD CONSTRAINT "gadgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "gadget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create grenade_categories
CREATE TABLE "grenade_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    CONSTRAINT "grenade_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grenade_categories_name_key" ON "grenade_categories"("name");

-- Add isDefault and categoryId to grenades
ALTER TABLE "grenades" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "grenades" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "grenades" ADD CONSTRAINT "grenades_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "grenade_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
