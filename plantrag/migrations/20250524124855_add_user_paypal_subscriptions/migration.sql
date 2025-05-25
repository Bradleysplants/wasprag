/*
  Warnings:

  - A unique constraint covering the columns `[paypalSubscriptionId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paypalPlanId" TEXT,
ADD COLUMN     "paypalSubscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "paypalSubscriptionId" TEXT,
ADD COLUMN     "paypalSubscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paypalSubscriptionId_key" ON "User"("paypalSubscriptionId");
