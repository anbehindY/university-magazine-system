-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVIEWING', 'COMMENTED');

-- AlterTable
ALTER TABLE "submission" ADD COLUMN     "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
