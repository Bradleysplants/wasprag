/*
  Warnings:

  - You are about to drop the `PlantInfo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PlantInfo";

-- CreateTable
CREATE TABLE "plant_info" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "description" TEXT,
    "careInfo" TEXT,
    "soilNeeds" TEXT,
    "source" TEXT NOT NULL,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plant_info_name_idx" ON "plant_info"("name");

-- CreateIndex
CREATE INDEX "plant_info_scientificName_idx" ON "plant_info"("scientificName");

-- CreateIndex
CREATE INDEX "plant_info_source_idx" ON "plant_info"("source");

-- CreateIndex
CREATE INDEX "plant_info_createdAt_idx" ON "plant_info"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "plant_info_id_key" ON "plant_info"("id");
