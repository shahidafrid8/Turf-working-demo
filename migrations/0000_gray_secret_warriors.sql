CREATE TABLE "app_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "app_feedback_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
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
	"status" text DEFAULT 'confirmed' NOT NULL,
	"booking_code" text NOT NULL,
	"user_id" text,
	"user_name" text,
	"user_phone" text,
	"review_prompt_shown" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
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
CREATE TABLE "turf_reviews" (
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
CREATE TABLE "turfs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
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
	"featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"full_name" text,
	"email" text NOT NULL,
	"phone_number" text NOT NULL,
	"password" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"manager_id" text,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"owner_status" text,
	"turf_status" text,
	"turf_name" text,
	"turf_location" text,
	"turf_address" text,
	"turf_pincode" text,
	"turf_image_urls" text[],
	"turf_length" integer,
	"turf_width" integer,
	"profile_image_url" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
