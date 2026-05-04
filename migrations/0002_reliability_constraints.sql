CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_code_unique"
  ON "bookings" ("booking_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_user_date_idx"
  ON "bookings" ("user_id", "date");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_amounts_match_check') THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_amounts_match_check"
      CHECK ("total_amount" > 0 AND "paid_amount" >= 0 AND "balance_amount" >= 0 AND "paid_amount" + "balance_amount" = "total_amount");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_duration_check') THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_duration_check"
      CHECK ("duration" BETWEEN 60 AND 300 AND "duration" % 60 = 0);
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_method_check') THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_payment_method_check"
      CHECK ("payment_method" IN ('upi', 'card', 'wallet', 'cash', 'venue'));
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_status_check"
      CHECK ("status" IN ('pending_payment', 'confirmed', 'paid', 'cancelled'));
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'time_slots_price_check') THEN
    ALTER TABLE "time_slots"
      ADD CONSTRAINT "time_slots_price_check"
      CHECK ("price" BETWEEN 100 AND 100000);
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'turfs_price_check') THEN
    ALTER TABLE "turfs"
      ADD CONSTRAINT "turfs_price_check"
      CHECK ("price_per_hour" BETWEEN 100 AND 100000 AND "weekend_surcharge" BETWEEN 0 AND 50000);
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_role_check"
      CHECK ("role" IN ('player', 'turf_owner', 'turf_staff'));
  END IF;
END $$;
