-- AlterTable
ALTER TABLE "Club" DROP COLUMN "grade2Capacity";
ALTER TABLE "Club" DROP COLUMN "grade3Capacity";
ALTER TABLE "Club" ADD COLUMN "grade23Capacity" INTEGER NOT NULL DEFAULT 0;
