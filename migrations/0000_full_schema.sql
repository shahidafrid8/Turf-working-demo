-- ═══════════════════════════════════════════════════════════════════════════════
-- QuickTurf — Full Schema (Single Migration)
-- Creates all 19 tables from scratch with the normalized structure
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── AUTH & IDENTITY ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "auth_lookup" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "phone_number" text NOT NULL,
  "role" text NOT NULL,
  "role_table_id" varchar NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "auth_lookup_email_unique" UNIQUE("email"),
  CONSTRAINT "auth_lookup_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "full_name" text,
  "email" text NOT NULL,
  "phone_number" text NOT NULL,
  "password" text NOT NULL,
  "date_of_birth" text NOT NULL,
  "profile_image_url" text,
  "is_banned" boolean DEFAULT false NOT NULL,
  "ban_reason" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "players_username_unique" UNIQUE("username"),
  CONSTRAINT "players_email_unique" UNIQUE("email"),
  CONSTRAINT "players_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_owners" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "full_name" text,
  "email" text NOT NULL,
  "phone_number" text NOT NULL,
  "password" text NOT NULL,
  "date_of_birth" text NOT NULL,
  "profile_image_url" text,
  "is_banned" boolean DEFAULT false NOT NULL,
  "ban_reason" text,
  "owner_status" text DEFAULT 'pending_account' NOT NULL,
  "business_name" text,
  "business_phone" text,
  "gst_number" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "turf_owners_username_unique" UNIQUE("username"),
  CONSTRAINT "turf_owners_email_unique" UNIQUE("email"),
  CONSTRAINT "turf_owners_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_staff" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "full_name" text,
  "email" text NOT NULL,
  "phone_number" text NOT NULL,
  "password" text NOT NULL,
  "date_of_birth" text NOT NULL,
  "profile_image_url" text,
  "owner_id" varchar NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "permissions" text[],
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "turf_staff_username_unique" UNIQUE("username"),
  CONSTRAINT "turf_staff_email_unique" UNIQUE("email"),
  CONSTRAINT "turf_staff_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "role" text DEFAULT 'super_admin' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "admins_username_unique" UNIQUE("username"),
  CONSTRAINT "admins_email_unique" UNIQUE("email")
);

-- ── SESSION ──────────────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ── TURF MANAGEMENT ─────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turfs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text,
  "application_id" varchar,
  "name" text NOT NULL,
  "location" text NOT NULL,
  "address" text NOT NULL,
  "image_url" text NOT NULL,
  "rating" integer DEFAULT 5 NOT NULL,
  "amenities" text[] NOT NULL,
  "sport_types" text[] NOT NULL,
  "price_per_hour" integer NOT NULL,
  "weekend_surcharge" integer DEFAULT 0 NOT NULL,
  "is_available" boolean DEFAULT true NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "open_time" text,
  "close_time" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_applications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar NOT NULL,
  "turf_name" text NOT NULL,
  "turf_location" text NOT NULL,
  "turf_address" text NOT NULL,
  "turf_pincode" text NOT NULL,
  "turf_image_urls" text[],
  "turf_length" integer,
  "turf_width" integer,
  "status" text DEFAULT 'pending' NOT NULL,
  "rejection_reason" text,
  "reviewed_by" varchar,
  "submitted_at" timestamp DEFAULT now(),
  "reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_images" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "image_url" text NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_amenities" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_sport_types" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "sport" text NOT NULL
);

-- ── TIME SLOTS ───────────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_slots" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "date" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "price" integer NOT NULL,
  "period" text NOT NULL,
  "is_booked" boolean DEFAULT false NOT NULL,
  "is_blocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "time_slots_turf_date_start_unique"
  ON "time_slots" ("turf_id", "date", "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_slots_availability_idx"
  ON "time_slots" ("turf_id", "date", "is_booked", "is_blocked");

-- ── BOOKINGS & PAYMENTS ─────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "turf_name" text NOT NULL,
  "turf_address" text NOT NULL,
  "date" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "duration" integer NOT NULL,
  "total_amount" integer NOT NULL,
  "paid_amount" integer NOT NULL,
  "balance_amount" integer NOT NULL,
  "payment_method" text NOT NULL,
  "status" text DEFAULT 'pending_payment' NOT NULL,
  "booking_code" text NOT NULL,
  "promo_code" text,
  "discount_amount" integer DEFAULT 0 NOT NULL,
  "verification_code" text DEFAULT '0000' NOT NULL,
  "verification_status" text DEFAULT 'pending' NOT NULL,
  "checked_in_at" timestamp,
  "user_id" text,
  "user_name" text,
  "user_phone" text,
  "guest_name" text,
  "guest_phone" text,
  "booking_source" text DEFAULT 'online' NOT NULL,
  "travel_distance_km" integer,
  "travel_eta_minutes" integer,
  "recommended_leave_at" text,
  "review_prompt_shown" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_code_unique"
  ON "bookings" ("booking_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_turf_date_idx"
  ON "bookings" ("turf_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_user_date_idx"
  ON "bookings" ("user_id", "date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_slots" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" varchar NOT NULL,
  "slot_id" varchar NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_slots_booking_slot_unique"
  ON "booking_slots" ("booking_id", "slot_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_payments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" varchar NOT NULL,
  "amount" integer NOT NULL,
  "payment_method" text NOT NULL,
  "payment_type" text NOT NULL,
  "provider_reference" text,
  "status" text DEFAULT 'success' NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slot_holds" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "turf_name" text NOT NULL,
  "turf_address" text NOT NULL,
  "date" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "duration" integer NOT NULL,
  "total_amount" integer NOT NULL,
  "paid_amount" integer NOT NULL,
  "balance_amount" integer NOT NULL,
  "payment_method" text NOT NULL,
  "booking_code" text NOT NULL,
  "promo_code" text,
  "discount_amount" integer DEFAULT 0 NOT NULL,
  "slot_ids" text[] NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "user_id" text,
  "user_name" text,
  "user_phone" text,
  "travel_distance_km" integer,
  "travel_eta_minutes" integer,
  "recommended_leave_at" text,
  "provider_reference" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "slot_holds_idempotency_unique"
  ON "slot_holds" ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slot_holds_active_lookup_idx"
  ON "slot_holds" ("turf_id", "date", "status", "expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_rules" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "turf_id" varchar NOT NULL,
  "name" text NOT NULL,
  "rule_type" text NOT NULL,
  "adjustment_type" text DEFAULT 'fixed' NOT NULL,
  "adjustment_value" integer NOT NULL,
  "start_date" text,
  "end_date" text,
  "start_time" text,
  "end_time" text,
  "days_of_week" integer[],
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_turf_active_idx"
  ON "pricing_rules" ("turf_id", "is_active");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "description" text,
  "discount_type" text DEFAULT 'fixed' NOT NULL,
  "discount_value" integer NOT NULL,
  "max_discount_amount" integer,
  "min_booking_amount" integer DEFAULT 0 NOT NULL,
  "usage_limit" integer,
  "used_count" integer DEFAULT 0 NOT NULL,
  "per_user_limit" integer DEFAULT 1 NOT NULL,
  "start_date" text,
  "expires_at" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);

-- ── SYSTEM ───────────────────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turf_reviews" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" varchar NOT NULL,
  "turf_id" varchar NOT NULL,
  "user_id" text NOT NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "turf_reviews_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_feedback" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "rating" integer NOT NULL,
  "feedback" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "app_feedback_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" varchar,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" varchar NOT NULL,
  "details" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_updates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "audience" text DEFAULT 'internal' NOT NULL,
  "created_by" varchar,
  "created_at" timestamp DEFAULT now()
);

-- ── CONSTRAINTS ──────────────────────────────────────────────────────────────
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_amounts_match_check"
  CHECK ("total_amount" > 0 AND "paid_amount" >= 0 AND "balance_amount" >= 0 AND "paid_amount" + "balance_amount" = "total_amount");
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_duration_check"
  CHECK ("duration" BETWEEN 60 AND 300 AND "duration" % 60 = 0);
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_payment_method_check"
  CHECK ("payment_method" IN ('upi', 'card', 'wallet', 'cash', 'venue'));
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_status_check"
  CHECK ("status" IN ('pending_payment', 'confirmed', 'paid', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "time_slots"
  ADD CONSTRAINT "time_slots_price_check"
  CHECK ("price" BETWEEN 100 AND 100000);
--> statement-breakpoint
ALTER TABLE "turfs"
  ADD CONSTRAINT "turfs_price_check"
  CHECK ("price_per_hour" BETWEEN 100 AND 100000 AND "weekend_surcharge" BETWEEN 0 AND 50000);
--> statement-breakpoint
ALTER TABLE "slot_holds"
  ADD CONSTRAINT "slot_holds_status_check"
  CHECK ("status" IN ('active', 'confirmed', 'expired', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_type_check"
  CHECK ("rule_type" IN ('weekend', 'peak_hour', 'holiday', 'offer'));

-- ── FOREIGN KEYS ─────────────────────────────────────────────────────────────
--> statement-breakpoint
ALTER TABLE "turf_staff" ADD CONSTRAINT "turf_staff_owner_fk"
  FOREIGN KEY ("owner_id") REFERENCES "turf_owners"("id");
--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_booking_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_slot_fk"
  FOREIGN KEY ("slot_id") REFERENCES "time_slots"("id");
--> statement-breakpoint
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_fk"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id");
--> statement-breakpoint
ALTER TABLE "turf_images" ADD CONSTRAINT "turf_images_turf_fk"
  FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "turf_amenities" ADD CONSTRAINT "turf_amenities_turf_fk"
  FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "turf_sport_types" ADD CONSTRAINT "turf_sport_types_turf_fk"
  FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "turf_applications" ADD CONSTRAINT "turf_applications_owner_fk"
  FOREIGN KEY ("owner_id") REFERENCES "turf_owners"("id");

-- ── SEED LOCATIONS ───────────────────────────────────────────────────────────
--> statement-breakpoint
INSERT INTO "locations" ("name") VALUES
  ('Bangalore'), ('Chennai'), ('Mumbai'), ('Delhi'),
  ('Hyderabad'), ('Pune'), ('Kolkata'), ('Ahmedabad'), ('Nandyal')
ON CONFLICT ("name") DO NOTHING;
