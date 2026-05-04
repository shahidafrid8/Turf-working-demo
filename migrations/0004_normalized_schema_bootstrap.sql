-- Ensures the normalized schema required by the current app exists.
-- Safe to run on fresh DBs and on DBs created from older migrations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint

-- ── AUTH & IDENTITY (normalized) ────────────────────────────────────────────
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'turf_staff_owner_fk') THEN
    ALTER TABLE "turf_staff" ADD CONSTRAINT "turf_staff_owner_fk"
      FOREIGN KEY ("owner_id") REFERENCES "turf_owners"("id");
  END IF;
END $$;
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
--> statement-breakpoint

-- ── TURF MANAGEMENT ─────────────────────────────────────────────────────────
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'turf_applications_owner_fk') THEN
    ALTER TABLE "turf_applications" ADD CONSTRAINT "turf_applications_owner_fk"
      FOREIGN KEY ("owner_id") REFERENCES "turf_owners"("id");
  END IF;
END $$;
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
--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.turfs') IS NOT NULL THEN
    ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "application_id" varchar;
    ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "open_time" text;
    ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "close_time" text;
    ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
    ALTER TABLE "turfs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
  END IF;
END $$;
--> statement-breakpoint

-- ── BOOKINGS schema compatibility ───────────────────────────────────────────
DO $$ BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_name" text;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_phone" text;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_source" text NOT NULL DEFAULT 'online';
  END IF;
END $$;
--> statement-breakpoint

-- ── SYSTEM TABLES (optional, used by full schema) ───────────────────────────
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

INSERT INTO "locations" ("name") VALUES
  ('Bangalore'), ('Chennai'), ('Mumbai'), ('Delhi'),
  ('Hyderabad'), ('Pune'), ('Kolkata'), ('Ahmedabad'), ('Nandyal')
ON CONFLICT ("name") DO NOTHING;
