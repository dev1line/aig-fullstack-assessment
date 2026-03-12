-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- AlterTable: convert existing "sentiment" TEXT to Sentiment enum (preserves valid values)
ALTER TABLE "Review" ALTER COLUMN "sentiment" TYPE "Sentiment" USING (
  CASE "sentiment"
    WHEN 'POSITIVE' THEN 'POSITIVE'::"Sentiment"
    WHEN 'NEGATIVE' THEN 'NEGATIVE'::"Sentiment"
    WHEN 'NEUTRAL' THEN 'NEUTRAL'::"Sentiment"
    ELSE 'NEUTRAL'::"Sentiment"
  END
);

-- CreateIndex: support cursor-based pagination ordering (createdAt DESC, id DESC)
CREATE INDEX "Review_createdAt_id_idx" ON "Review"("createdAt", "id");
