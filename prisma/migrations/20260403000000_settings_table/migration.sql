CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- Seed default backup settings
INSERT INTO "settings" ("key", "value", "updatedAt") VALUES
('backup.schedule', '0 3 * * *', CURRENT_TIMESTAMP),
('backup.retention.daily', '7', CURRENT_TIMESTAMP),
('backup.retention.weekly', '4', CURRENT_TIMESTAMP);
