-- Create Settings early for fresh deploys where this migration runs before
-- 20260311170000_global_open_at.
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enrollmentEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "enrollmentEnabled" BOOLEAN NOT NULL DEFAULT false;
