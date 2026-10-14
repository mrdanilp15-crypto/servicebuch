-- Kilometerstände, die aus einem Service-Eintrag stammen, werden mit diesem verknüpft.
ALTER TABLE "MileageEntry" ADD COLUMN "serviceEntryId" TEXT REFERENCES "ServiceEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "MileageEntry_serviceEntryId_idx" ON "MileageEntry"("serviceEntryId");

-- Bestehende Daten korrigieren: Der aktuelle Kilometerstand eines Fahrzeugs ist der
-- Stand des ZULETZT datierten Eintrags (bisher blieb er auf dem Höchstwert stehen,
-- auch wenn man danach einen niedrigeren, korrekten Stand eingetragen hat).
UPDATE "Vehicle"
SET "currentMileage" = (
  SELECT m."mileage" FROM "MileageEntry" m
  WHERE m."vehicleId" = "Vehicle"."id"
  ORDER BY m."date" DESC, m."createdAt" DESC
  LIMIT 1
)
WHERE EXISTS (SELECT 1 FROM "MileageEntry" m WHERE m."vehicleId" = "Vehicle"."id");
