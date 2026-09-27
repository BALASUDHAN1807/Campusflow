-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('WAITING', 'HOLD', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SmartHoldStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QueueEventType" AS ENUM ('JOINED', 'HOLD_DECLARED', 'HOLD_EXPIRED', 'SKIPPED', 'MOVED_TO_TAIL', 'SERVING', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'QUEUE_PAUSED', 'QUEUE_RESUMED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TURN_APPROACHING', 'SMART_HOLD_ACTIVATED', 'SKIPPED', 'HOLD_EXPIRED', 'MOVED_TO_TAIL', 'QUEUE_UPDATE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'OPEN',
    "maxSkips" INTEGER NOT NULL DEFAULT 5,
    "minLeadTime" INTEGER NOT NULL DEFAULT 10,
    "maxHoldDuration" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueToken" (
    "id" UUID NOT NULL,
    "queueId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'WAITING',
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartHold" (
    "id" UUID NOT NULL,
    "tokenId" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SmartHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEvent" (
    "id" UUID NOT NULL,
    "queueId" UUID NOT NULL,
    "tokenId" UUID,
    "eventType" "QueueEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- CreateIndex
CREATE INDEX "Queue_serviceId_idx" ON "Queue"("serviceId");

-- CreateIndex
CREATE INDEX "Queue_status_idx" ON "Queue"("status");

-- CreateIndex
CREATE INDEX "QueueToken_queueId_idx" ON "QueueToken"("queueId");

-- CreateIndex
CREATE INDEX "QueueToken_status_idx" ON "QueueToken"("status");

-- CreateIndex
CREATE INDEX "QueueToken_userId_idx" ON "QueueToken"("userId");

-- CreateIndex
CREATE INDEX "QueueToken_joinedAt_idx" ON "QueueToken"("joinedAt");

-- CreateIndex
CREATE INDEX "QueueToken_queueId_status_idx" ON "QueueToken"("queueId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_queueId_tokenNumber_key" ON "QueueToken"("queueId", "tokenNumber");

-- CreateIndex
CREATE INDEX "SmartHold_tokenId_idx" ON "SmartHold"("tokenId");

-- CreateIndex
CREATE INDEX "SmartHold_status_idx" ON "SmartHold"("status");

-- CreateIndex
CREATE INDEX "SmartHold_startTime_idx" ON "SmartHold"("startTime");

-- CreateIndex
CREATE INDEX "SmartHold_endTime_idx" ON "SmartHold"("endTime");

-- CreateIndex
CREATE INDEX "QueueEvent_queueId_idx" ON "QueueEvent"("queueId");

-- CreateIndex
CREATE INDEX "QueueEvent_tokenId_idx" ON "QueueEvent"("tokenId");

-- CreateIndex
CREATE INDEX "QueueEvent_createdAt_idx" ON "QueueEvent"("createdAt");

-- CreateIndex
CREATE INDEX "QueueEvent_queueId_createdAt_idx" ON "QueueEvent"("queueId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartHold" ADD CONSTRAINT "SmartHold_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "QueueToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEvent" ADD CONSTRAINT "QueueEvent_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEvent" ADD CONSTRAINT "QueueEvent_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "QueueToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
