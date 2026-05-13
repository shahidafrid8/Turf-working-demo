ALTER TABLE "admin_updates" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_updates" ADD COLUMN IF NOT EXISTS "show_sponsored" boolean DEFAULT true NOT NULL;
