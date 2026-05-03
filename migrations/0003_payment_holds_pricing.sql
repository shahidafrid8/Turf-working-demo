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
  "slot_ids" text[] NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "user_id" text,
  "user_name" text,
  "user_phone" text,
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slot_holds_status_check') THEN
    ALTER TABLE "slot_holds"
      ADD CONSTRAINT "slot_holds_status_check"
      CHECK ("status" IN ('active', 'confirmed', 'expired', 'cancelled'));
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_type_check') THEN
    ALTER TABLE "pricing_rules"
      ADD CONSTRAINT "pricing_rules_type_check"
      CHECK ("rule_type" IN ('weekend', 'peak_hour', 'holiday', 'offer'));
  END IF;
END $$;
