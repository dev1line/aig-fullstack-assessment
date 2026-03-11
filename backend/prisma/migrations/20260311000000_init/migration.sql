-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "positive" DOUBLE PRECISION NOT NULL,
    "negative" DOUBLE PRECISION NOT NULL,
    "neutral" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
