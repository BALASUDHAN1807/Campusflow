-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QueueEvent_eventType_idx" ON "QueueEvent"("eventType");

-- CreateIndex
CREATE INDEX "QueueEvent_queueId_eventType_idx" ON "QueueEvent"("queueId", "eventType");
