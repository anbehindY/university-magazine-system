-- AlterTable
ALTER TABLE "submission" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "submission_comment" ADD COLUMN     "parent_id" TEXT;

-- AddForeignKey
ALTER TABLE "submission_comment" ADD CONSTRAINT "submission_comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "submission_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
