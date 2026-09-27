-- AlterEnum
ALTER TYPE "QueueEventType" ADD VALUE 'HOLD_CANCELLED';

-- AlterTable
ALTER TABLE "QueueToken" ADD COLUMN     "queueOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "QueueToken_queueOrder_idx" ON "QueueToken"("queueOrder");

-- CreateIndex
CREATE INDEX "QueueToken_queueId_queueOrder_idx" ON "QueueToken"("queueId", "queueOrder");
