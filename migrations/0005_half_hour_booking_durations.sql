-- Reference-only migration kept for future debugging. Active schema lives in migrations/0000_full_schema.sql.
-- This file is intentionally commented out and should not execute.

-- ALTER TABLE "bookings"
--   DROP CONSTRAINT IF EXISTS "bookings_duration_check";
-- --> statement-breakpoint
-- ALTER TABLE "bookings"
--   ADD CONSTRAINT "bookings_duration_check"
--   CHECK ("duration" BETWEEN 60 AND 300 AND "duration" % 30 = 0);
--