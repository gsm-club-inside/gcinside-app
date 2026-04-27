-- CreateEnum
CREATE TYPE "ClubCreationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ClubCreationRequest" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "reviewerId" INTEGER,
    "clubId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grade1Capacity" INTEGER NOT NULL DEFAULT 0,
    "grade23Capacity" INTEGER NOT NULL DEFAULT 0,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "status" "ClubCreationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ClubCreationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubCreationRequest_clubId_key" ON "ClubCreationRequest"("clubId");

-- CreateIndex
CREATE INDEX "ClubCreationRequest_status_createdAt_idx" ON "ClubCreationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClubCreationRequest_requesterId_createdAt_idx" ON "ClubCreationRequest"("requesterId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClubCreationRequest" ADD CONSTRAINT "ClubCreationRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCreationRequest" ADD CONSTRAINT "ClubCreationRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCreationRequest" ADD CONSTRAINT "ClubCreationRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
