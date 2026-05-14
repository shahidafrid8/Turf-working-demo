ALTER TABLE "admin_updates" ADD COLUMN IF NOT EXISTS "target_locations" text[];
--> statement-breakpoint
ALTER TABLE "admin_updates" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
