-- AlterTable: Token-Version für serverseitiges Invalidieren von Logins
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- E-Mail-Adressen werden ab jetzt immer kleingeschrieben gespeichert/gesucht.
-- OR IGNORE: Falls (theoretisch) zwei Konten sich nur in der Schreibweise
-- unterscheiden, bleibt das zweite unverändert statt die Migration abzubrechen.
UPDATE OR IGNORE "User" SET "email" = lower("email");
