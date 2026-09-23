-- CreateIndex
CREATE INDEX "Attachment_vehicleId_idx" ON "Attachment"("vehicleId");

-- CreateIndex
CREATE INDEX "Attachment_serviceEntryId_idx" ON "Attachment"("serviceEntryId");

-- CreateIndex
CREATE INDEX "MileageEntry_vehicleId_idx" ON "MileageEntry"("vehicleId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_vehicleId_idx" ON "Notification"("vehicleId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "ReminderRule_vehicleId_idx" ON "ReminderRule"("vehicleId");

-- CreateIndex
CREATE INDEX "ServiceEntry_vehicleId_idx" ON "ServiceEntry"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleAssignment_vehicleId_idx" ON "VehicleAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleImage_vehicleId_idx" ON "VehicleImage"("vehicleId");
