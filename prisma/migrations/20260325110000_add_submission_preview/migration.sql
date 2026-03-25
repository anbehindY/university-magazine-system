-- CreateTable
CREATE TABLE "submission_preview" (
    "submission_id" TEXT NOT NULL,
    "overview" TEXT,
    "content_titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_preview_pkey" PRIMARY KEY ("submission_id")
);

-- AddForeignKey
ALTER TABLE "submission_preview" ADD CONSTRAINT "submission_preview_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
