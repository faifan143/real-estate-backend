/*
  Warnings:

  - Added the required column `propertyId` to the `meetings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `properties` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "propertyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "address" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transaction_requests" ADD COLUMN     "decisionAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
