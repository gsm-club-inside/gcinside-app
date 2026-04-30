CREATE TABLE "AbuseAdminLog" (
    "id" BIGSERIAL NOT NULL,
    "requestId" TEXT NOT NULL,
    "adminUserId" INTEGER,
    "adminName" TEXT,
    "adminEmail" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbuseAdminLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AbuseAdminLog_requestId_createdAt_idx" ON "AbuseAdminLog"("requestId", "createdAt");
CREATE INDEX "AbuseAdminLog_adminUserId_createdAt_idx" ON "AbuseAdminLog"("adminUserId", "createdAt");
CREATE INDEX "AbuseAdminLog_action_createdAt_idx" ON "AbuseAdminLog"("action", "createdAt");
