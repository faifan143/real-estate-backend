-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT', 'BOTH');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "listingType" "ListingType" NOT NULL DEFAULT 'SALE',
ADD COLUMN     "rentPrice" DOUBLE PRECISION,
ADD COLUMN     "salePrice" DOUBLE PRECISION,
ALTER COLUMN "price" DROP NOT NULL;
