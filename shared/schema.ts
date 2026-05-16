import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1: AUTH & IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Thin lookup table ensuring email/phone uniqueness across all role tables */
export const authLookup = pgTable("auth_lookup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  role: text("role").notNull(), // 'player' | 'turf_owner' | 'turf_staff' | 'admin'
  roleTableId: varchar("role_table_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuthLookup = typeof authLookup.$inferSelect;
export type InsertAuthLookup = typeof authLookup.$inferInsert;

/** Player accounts */
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  fullName: text("full_name"),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  profileImageUrl: text("profile_image_url"),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

/** Turf owner accounts */
export const turfOwners = pgTable("turf_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  fullName: text("full_name"),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  profileImageUrl: text("profile_image_url"),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  ownerStatus: text("owner_status").notNull().default("pending_account"),
  businessName: text("business_name"),
  businessPhone: text("business_phone"),
  gstNumber: text("gst_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TurfOwner = typeof turfOwners.$inferSelect;
export type InsertTurfOwner = typeof turfOwners.$inferInsert;

/** Staff members linked to an owner */
export const turfStaff = pgTable("turf_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  fullName: text("full_name"),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  profileImageUrl: text("profile_image_url"),
  ownerId: varchar("owner_id").notNull(), // → turf_owners.id
  isActive: boolean("is_active").notNull().default(true),
  permissions: text("permissions").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TurfStaffMember = typeof turfStaff.$inferSelect;
export type InsertTurfStaffMember = typeof turfStaff.$inferInsert;

/** Admin accounts */
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("super_admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminUser = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

// ── Backwards-compatible User type (virtual — not a real table) ──────────────
// Used by routes and frontend for API compatibility during migration.
// Storage layer constructs this from the underlying role-specific tables.

export type User = {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string;
  role: string;
  managerId: string | null;
  isBanned: boolean;
  banReason: string | null;
  ownerStatus: string | null;
  turfStatus: string | null;
  turfName: string | null;
  turfLocation: string | null;
  turfAddress: string | null;
  turfPincode: string | null;
  turfImageUrls: string[] | null;
  turfLength: number | null;
  turfWidth: number | null;
  profileImageUrl: string | null;
};

export type InsertUser = {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string;
  role: string;
  id?: string;
  fullName?: string | null;
  managerId?: string | null;
  isBanned?: boolean;
  banReason?: string | null;
  ownerStatus?: string | null;
  turfStatus?: string | null;
  turfName?: string | null;
  turfLocation?: string | null;
  turfAddress?: string | null;
  turfPincode?: string | null;
  turfImageUrls?: string[] | null;
  turfLength?: number | null;
  turfWidth?: number | null;
  profileImageUrl?: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2: TURF MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/** Turf listings */
export const turfs = pgTable("turfs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"), // → turf_owners.id (null = system/demo turf)
  applicationId: varchar("application_id"), // → turf_applications.id
  name: text("name").notNull(),
  location: text("location").notNull(),
  address: text("address").notNull(),
  imageUrl: text("image_url").notNull(),
  rating: integer("rating").notNull().default(5),
  amenities: text("amenities").array().notNull(),
  sportTypes: text("sport_types").array().notNull(),
  pricePerHour: integer("price_per_hour").notNull(),
  weekendSurcharge: integer("weekend_surcharge").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTurfSchema = createInsertSchema(turfs).omit({ id: true });
export type InsertTurf = z.infer<typeof insertTurfSchema>;
export type Turf = typeof turfs.$inferSelect;

/** Turf submission & admin review workflow */
export const turfApplications = pgTable("turf_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(), // → turf_owners.id
  turfName: text("turf_name").notNull(),
  turfLocation: text("turf_location").notNull(),
  turfAddress: text("turf_address").notNull(),
  turfPincode: text("turf_pincode").notNull(),
  turfImageUrls: text("turf_image_urls").array(),
  turfLength: integer("turf_length"),
  turfWidth: integer("turf_width"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  rejectionReason: text("rejection_reason"),
  reviewedBy: varchar("reviewed_by"), // admin id
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export type TurfApplication = typeof turfApplications.$inferSelect;
export type InsertTurfApplication = typeof turfApplications.$inferInsert;

/** Turf photos — supports unlimited images with ordering */
export const turfImages = pgTable("turf_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  imageUrl: text("image_url").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TurfImage = typeof turfImages.$inferSelect;

/** Turf amenities — enables filtering */
export const turfAmenities = pgTable("turf_amenities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  name: text("name").notNull(),
});

export type TurfAmenity = typeof turfAmenities.$inferSelect;

/** Turf sport types — enables filtering */
export const turfSportTypes = pgTable("turf_sport_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  sport: text("sport").notNull(),
});

export type TurfSportType = typeof turfSportTypes.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3: BOOKINGS & PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Time slot model */
export const timeSlots = pgTable("time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  price: integer("price").notNull(),
  period: text("period").notNull(), // morning, afternoon, evening
  isBooked: boolean("is_booked").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
}, (table) => ({
  turfDateStartUnique: uniqueIndex("time_slots_turf_date_start_unique").on(table.turfId, table.date, table.startTime),
  availabilityIdx: index("time_slots_availability_idx").on(table.turfId, table.date, table.isBooked, table.isBlocked),
}));

export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({ id: true });
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type TimeSlot = typeof timeSlots.$inferSelect;

/** Booking model */
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  turfName: text("turf_name").notNull(),
  turfAddress: text("turf_address").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: integer("duration").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull(),
  balanceAmount: integer("balance_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending_payment"),
  bookingCode: text("booking_code").notNull(),
  promoCode: text("promo_code"),
  discountAmount: integer("discount_amount").notNull().default(0),
  verificationCode: text("verification_code").notNull().default("0000"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  checkedInAt: timestamp("checked_in_at"),
  userId: text("user_id"), // → players.id (nullable for walk-in bookings)
  userName: text("user_name"),
  userPhone: text("user_phone"),
  guestName: text("guest_name"), // for walk-in bookings without account
  guestPhone: text("guest_phone"), // for walk-in bookings without account
  bookingSource: text("booking_source").notNull().default("online"), // 'online' | 'offline' | 'walk_in'
  travelDistanceKm: integer("travel_distance_km"),
  travelEtaMinutes: integer("travel_eta_minutes"),
  recommendedLeaveAt: text("recommended_leave_at"),
  reviewPromptShown: boolean("review_prompt_shown").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  turfDateIdx: index("bookings_turf_date_idx").on(table.turfId, table.date),
  userDateIdx: index("bookings_user_date_idx").on(table.userId, table.date),
  bookingCodeUnique: uniqueIndex("bookings_booking_code_unique").on(table.bookingCode),
}));

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

/** Junction table linking bookings to time slots */
export const bookingSlots = pgTable("booking_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  slotId: varchar("slot_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingSlotUnique: uniqueIndex("booking_slots_booking_slot_unique").on(table.bookingId, table.slotId),
}));

export type BookingSlot = typeof bookingSlots.$inferSelect;

/** Payment tracking — supports partial payments, refunds */
export const bookingPayments = pgTable("booking_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentType: text("payment_type").notNull(), // 'advance' | 'full' | 'balance' | 'refund'
  providerReference: text("provider_reference"),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BookingPayment = typeof bookingPayments.$inferSelect;
export type InsertBookingPayment = typeof bookingPayments.$inferInsert;

/** Slot holds for payment flow */
export const slotHolds = pgTable("slot_holds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  turfName: text("turf_name").notNull(),
  turfAddress: text("turf_address").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: integer("duration").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull(),
  balanceAmount: integer("balance_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  bookingCode: text("booking_code").notNull(),
  promoCode: text("promo_code"),
  discountAmount: integer("discount_amount").notNull().default(0),
  slotIds: text("slot_ids").array().notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("active"),
  userId: text("user_id"),
  userName: text("user_name"),
  userPhone: text("user_phone"),
  travelDistanceKm: integer("travel_distance_km"),
  travelEtaMinutes: integer("travel_eta_minutes"),
  recommendedLeaveAt: text("recommended_leave_at"),
  providerReference: text("provider_reference"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  idempotencyUnique: uniqueIndex("slot_holds_idempotency_unique").on(table.idempotencyKey),
  activeLookupIdx: index("slot_holds_active_lookup_idx").on(table.turfId, table.date, table.status, table.expiresAt),
}));

export const insertSlotHoldSchema = createInsertSchema(slotHolds).omit({ id: true, createdAt: true });
export type InsertSlotHold = z.infer<typeof insertSlotHoldSchema>;
export type SlotHold = typeof slotHolds.$inferSelect;

/** Pricing rules */
export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(),
  adjustmentType: text("adjustment_type").notNull().default("fixed"),
  adjustmentValue: integer("adjustment_value").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  daysOfWeek: integer("days_of_week").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({ id: true, createdAt: true });
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;
export type PricingRule = typeof pricingRules.$inferSelect;

/** Promo codes configured by admin */
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("fixed"),
  discountValue: integer("discount_value").notNull(),
  maxDiscountAmount: integer("max_discount_amount"),
  minBookingAmount: integer("min_booking_amount").notNull().default(0),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  perUserLimit: integer("per_user_limit").notNull().default(1),
  startDate: text("start_date"),
  expiresAt: text("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usedCount: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4: SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Persistent locations list */
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Location = typeof locations.$inferSelect;

/** App-level feedback (one per player) */
export const appFeedback = pgTable("app_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique(),
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppFeedbackSchema = createInsertSchema(appFeedback).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppFeedback = z.infer<typeof insertAppFeedbackSchema>;
export type AppFeedback = typeof appFeedback.$inferSelect;

/** Browser push subscriptions for outside-app notifications */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  subscription: jsonb("subscription").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("push_subscriptions_user_idx").on(table.userId),
}));

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;

/** Turf reviews (one per booking) */
export const turfReviews = pgTable("turf_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().unique(),
  turfId: varchar("turf_id").notNull(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTurfReviewSchema = createInsertSchema(turfReviews).omit({ id: true, createdAt: true });
export type InsertTurfReview = z.infer<typeof insertTurfReviewSchema>;
export type TurfReview = typeof turfReviews.$inferSelect;

/** Admin audit log */
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;

/** Admin-visible product updates and changelog entries */
export const adminUpdates = pgTable("admin_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("internal"),
  postType: text("post_type").notNull().default("announcement"),
  imageUrl: text("image_url"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  isActive: boolean("is_active").notNull().default(true),
  showSponsored: boolean("show_sponsored").notNull().default(true),
  targetLocations: text("target_locations").array(),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminUpdateSchema = createInsertSchema(adminUpdates).omit({ id: true, createdAt: true });
export type InsertAdminUpdate = z.infer<typeof insertAdminUpdateSchema>;
export type AdminUpdate = typeof adminUpdates.$inferSelect;
