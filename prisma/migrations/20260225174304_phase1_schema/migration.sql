/*
  Warnings:

  - You are about to drop the column `closure_date` on the `academic_year` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "academic_year" DROP COLUMN "closure_date",
ADD COLUMN     "final_closure_date" DATE,
ADD COLUMN     "first_closure_date" DATE,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "submission" ADD COLUMN     "academic_year_id" TEXT,
ADD COLUMN     "faculty_id" TEXT,
ADD COLUMN     "is_selected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selected_at" TIMESTAMP(3),
ADD COLUMN     "selected_by_id" TEXT;

-- CreateTable
CREATE TABLE "submission_comment" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_comment_submission_id_idx" ON "submission_comment"("submission_id");

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_selected_by_id_fkey" FOREIGN KEY ("selected_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_comment" ADD CONSTRAINT "submission_comment_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_comment" ADD CONSTRAINT "submission_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
