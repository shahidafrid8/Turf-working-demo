CREATE UNIQUE INDEX IF NOT EXISTS "time_slots_turf_date_start_unique"
  ON "time_slots" ("turf_id", "date", "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_slots_availability_idx"
  ON "time_slots" ("turf_id", "date", "is_booked", "is_blocked");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_turf_date_idx"
  ON "bookings" ("turf_id", "date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
