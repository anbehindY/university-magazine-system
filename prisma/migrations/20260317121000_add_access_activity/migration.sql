-- CreateTable
CREATE TABLE "access_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_activity_created_at_idx" ON "access_activity"("created_at");

-- CreateIndex
CREATE INDEX "access_activity_user_id_idx" ON "access_activity"("user_id");

-- CreateIndex
CREATE INDEX "access_activity_activity_type_idx" ON "access_activity"("activity_type");

-- AddForeignKey
ALTER TABLE "access_activity" ADD CONSTRAINT "access_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
