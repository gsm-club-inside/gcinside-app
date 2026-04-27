CREATE TABLE "AbuseModelArtifact" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "storageUri" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedAt" TIMESTAMP(3),

    CONSTRAINT "AbuseModelArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AbuseModelArtifact_version_key" ON "AbuseModelArtifact"("version");
CREATE INDEX "AbuseModelArtifact_status_createdAt_idx" ON "AbuseModelArtifact"("status", "createdAt");
