/*
  Warnings:

  - The `role` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MARKETING_MANAGER', 'MARKETING_COORDINATOR', 'STUDENT', 'ADMINISTRATOR', 'GUEST');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "facultyId" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role";

-- CreateTable
CREATE TABLE "faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faculty_name_key" ON "faculty"("name");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
